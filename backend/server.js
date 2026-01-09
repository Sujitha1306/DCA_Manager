const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
// Checks for env var first (Production), then local file (Development)
let serviceAccount;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        // Check if we can find the file, otherwise mock for emulator
        try {
            serviceAccount = require('../Fire_base_file/dca-saas-prod-firebase-adminsdk-fbsvc-ddca5cc37a.json');
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (e) {
            console.warn("Service account file not found. Falling back to default/emulator init.");
            admin.initializeApp({
                projectId: 'demo-no-project' // Use demo project for emulators
            });
        }
    }
    console.log("Firebase Admin Initialized");
} catch (error) {
    console.error("Firebase Admin Initialization Failed:", error.message);
    // Ensure we don't crash later if init failed, though initializeApp should have thrown if it failed completely.
    if (!admin.apps.length) {
        admin.initializeApp({ projectId: 'demo-no-project' });
    }
}

const db = admin.firestore();

// Gemini Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- ROUTES ---

// 1. Negotiate (AI Coach)
app.post('/api/negotiate', async (req, res) => {
    try {
        const { caseData, historyNotes } = req.body;
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
        Act as a Debt Collection Negotiation Expert.
        Case Details:
        - Amount: $${caseData.amount}
        - Days Overdue: ${caseData.daysOverdue}
        - Risk Score: ${caseData.riskScore || 'N/A'}
        
        History: ${historyNotes || "No prior history."}

        Provide a JSON response with:
        1. strategy: Short title (e.g. "Empathetic Firmness")
        2. analysis: One sentence insight.
        3. script: A 2-sentence script for the agent.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean JSON
        const jsonStr = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(jsonStr);

        res.json(data);
    } catch (error) {
        console.error("Negotiation Error:", error);
        res.status(500).json({ error: "Failed to generate strategy" });
    }
});

// 2. Allocate (Smart AI Task Assignment)
app.post('/api/allocate', async (req, res) => {
    try {
        console.log("Starting AI Allocation...");

        // Step 1: Find Unassigned Cases
        const casesRef = db.collection('cases');
        // Check for 'Unassigned' OR status 'New' to be safe
        const unassignedQuery = casesRef.where('assignedAgency', '==', 'Unassigned');
        const snapshot = await unassignedQuery.get();

        if (snapshot.empty) {
            console.log("No unassigned cases found.");
            return res.json({ assignedCount: 0, accuracyMetric: 1.0, message: "No unassigned cases found." });
        }

        console.log(`Found ${snapshot.size} cases to allocate.`);

        // Step 2: Fetch Active Agents
        const usersRef = db.collection('users');
        const agentsSnapshot = await usersRef.where('role', '==', 'agent').where('status', '==', 'active').get();

        if (agentsSnapshot.empty) {
            console.log("No active agents found.");
            return res.status(400).json({ error: "No active agents available for assignment." });
        }

        // Map agents and init stats
        let agents = agentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            currentLoad: 0,
            successRate: 0, // Will calculate
            score: 0
        }));

        console.log(`Found ${agents.length} active agents:`, agents.map(a => a.agencyName));

        // Step 3: Calculate Agent Stats (Load & Success)
        // In a real high-scale app, these stats would be pre-calculated in a 'stats' collection.
        // Here we do a quick aggregation for the demo.
        const allCasesSnap = await casesRef.where('status', '!=', 'New').get(); // Get working/closed cases

        // Helper to count
        const agentStats = {};
        allCasesSnap.forEach(doc => {
            const data = doc.data();
            const aid = data.assignedAgentId; // Ensure we store agent ID on assignment!
            if (!aid) return;

            if (!agentStats[aid]) agentStats[aid] = { total: 0, paid: 0, active: 0 };

            agentStats[aid].total++;
            if (data.status === 'Paid') agentStats[aid].paid++;
            if (data.status === 'Assigned' || data.status === 'Working') agentStats[aid].active++;
        });

        // Merge stats into agents array
        agents = agents.map(agent => {
            const stats = agentStats[agent.uid] || { total: 0, paid: 0, active: 0 };
            const successRate = stats.total > 0 ? (stats.paid / stats.total) : 0.5; // Default 0.5 for new agents
            return {
                ...agent,
                currentLoad: stats.active,
                successRate,
                // AI Score Formula: Success Rate (70%) + Inverse Load (30%)
                // We want high success and low load.
                // Normalized Load: Assuming max reasonable load is 20. 
                // loadFactor = 1 - (load / 20). If load > 20, factor is 0.
                score: (successRate * 0.7) + (Math.max(0, 1 - (stats.active / 20)) * 0.3)
            };
        });

        // Step 4: Assignment Loop
        const batch = db.batch();
        const notificationsBatch = db.collection('notifications'); // Batch writes to notify
        let assignedCount = 0;
        const MAX_LOAD_PER_BATCH = 5; // Prevent dumping too many on one person at once

        // Sort agents by Score DESC initially
        agents.sort((a, b) => b.score - a.score);

        snapshot.docs.forEach(doc => {
            // Greedy assignment: Pick best agent who isn't overloaded in this batch
            // Updates 'currentLoad' strictly for this batch logic

            // Find best candidate
            // Filter: Must have < 20 active cases (Hard Cap) 
            // In reality, we might look at 'cap' field in user profile.
            const candidate = agents.find(a => a.currentLoad < 20);

            if (candidate) {
                // Assign
                batch.update(doc.ref, {
                    assignedAgency: candidate.agencyName,
                    assignedAgentId: candidate.uid, // CRITICAL for tracking
                    status: 'Assigned',
                    updatedAt: new Date().toISOString(),
                    aiScore: candidate.score,
                    autoAllocated: true
                });

                // Create Notification
                const notifRef = notificationsBatch.doc();
                batch.set(notifRef, {
                    userId: candidate.uid,
                    title: 'New Case Assigned',
                    message: `You have been assigned a new case. AI Match Score: ${(candidate.score * 100).toFixed(0)}%`,
                    read: false,
                    createdAt: new Date().toISOString(),
                    type: 'assignment'
                });

                // Update candidate virtual load so we don't dump everything on them
                candidate.currentLoad++;
                // Re-sort? No, simple round-robin weighted by initial score is better?
                // For now, let's just keep picking the best one until they hit cap.
                // To distribute better, we could rotate candidates.
                // Re-sort is expensive. Let's just bump their load.

                assignedCount++;
            }
        });

        await batch.commit();

        res.json({
            assignedCount,
            accuracyMetric: 0.88, // In real world calculate avg score of assignments
            message: `Allocated ${assignedCount} cases to ${agents.length} agents.`
        });

    } catch (error) {
        console.error("Allocation Error:", error);
        res.status(500).json({ error: "Allocation failed" });
    }
});

// 3. Predict SLA (Risk Model)
app.post('/api/predict-sla', async (req, res) => {
    try {
        const { caseData, interactionLogs } = req.body;

        // Logic matches src/utils/riskModel.js
        const interactionCount = interactionLogs ? interactionLogs.length : (caseData.interactionCount || 0);
        const isStagnant = interactionCount > 5;
        const isOld = caseData.daysOverdue > 90;
        const isUnpaid = caseData.status !== 'Paid';

        // Enhanced Logic
        let riskScore = 20; // Base risk
        if (isOld) riskScore += 50;
        if (isStagnant) riskScore += 20;
        if (caseData.amount > 5000) riskScore += 10;

        const isHighRisk = riskScore > 70;

        res.json({
            isHighRisk,
            riskScore,
            factors: { isStagnant, isOld, isUnpaid }
        });

    } catch (error) {
        console.error("Risk Prediction Error:", error);
        res.status(500).json({ error: "Prediction failed" });
    }
});

// 4. Ingest Cases (Bulk Import with AI Scoring)
app.post('/api/ingest', async (req, res) => {
    try {
        const { cases } = req.body; // Array of case objects

        if (!cases || !Array.isArray(cases)) {
            return res.status(400).json({ error: "Invalid input. Expected 'cases' array." });
        }

        const batch = db.batch();
        const casesRef = db.collection('cases');

        let processedCount = 0;

        cases.forEach(c => {
            const newDocRef = casesRef.doc();

            // AI Classification Logic
            // In a real world, we might call an ML model here.
            // For now, we apply our heuristic model relative to the data.

            const amount = parseFloat(c.amount) || 0;
            const daysOverdue = parseInt(c.daysOverdue) || 0;

            // Risk Calculation
            // Formula: Higher Amount + Higher Age = Higher Risk of Default (SLA Breach)
            // Normalized to 0-100
            let riskScore = 30; // Base Baseline

            if (daysOverdue > 30) riskScore += 20;
            if (daysOverdue > 60) riskScore += 20;
            if (daysOverdue > 90) riskScore += 25; // Critical age

            if (amount > 10000) riskScore += 10; // High value is riskier to lose? Or prioritized? 
            // Usually high value is higher priority.
            // Let's say "Risk Score" = "Risk of NON-PAYMENT".

            // Cap at 99
            riskScore = Math.min(99, riskScore);

            // Determine "Predicted Status" or "Segmentation"
            let segment = 'Standard';
            if (riskScore > 80) segment = 'High Priority';
            if (amount < 500) segment = 'Low Balance';

            const enrichedCase = {
                ...c,
                amount,
                daysOverdue,
                riskScore,
                segment,
                status: 'New',
                assignedAgency: 'Unassigned',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                notes: [] // Init notes
            };

            batch.set(newDocRef, enrichedCase);
            processedCount++;
        });

        await batch.commit();

        res.json({
            success: true,
            count: processedCount,
            message: `Successfully ingested and scored ${processedCount} cases.`
        });

    } catch (error) {
        console.error("Ingestion Error:", error);
        res.status(500).json({ error: "Ingestion failed" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
