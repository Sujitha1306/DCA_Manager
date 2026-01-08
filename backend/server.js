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
    } else {
        // Fallback for local dev if file exists in a known location or you can point to it
        // Note: For now we'll assume the user will set the env var or this might fail.
        // We can try to load from the file path the user gave us earlier for local convenience if needed.
        serviceAccount = require('../Fire_base_file/dca-saas-prod-firebase-adminsdk-fbsvc-ddca5cc37a.json');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized");
} catch (error) {
    console.error("Firebase Admin Initialization Failed:", error.message);
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

// 2. Allocate (Auto-Assign Tasks)
app.post('/api/allocate', async (req, res) => {
    try {
        // Logic: Find unassigned cases -> Assign to active agents
        const casesRef = db.collection('cases');
        const snapshot = await casesRef.where('assignedAgency', '==', 'Unassigned').get(); // or check 'status' == 'New'

        if (snapshot.empty) {
            return res.json({ assignedCount: 0, accuracyMetric: 1.0, message: "No unassigned cases found." });
        }

        const batch = db.batch();
        let count = 0;

        // Mock Agent List (In real app, fetch from 'users' where role=agent and status=active)
        const agents = ['Alpha Agency', 'Beta Collections', 'Gamma Recovery'];

        snapshot.docs.forEach((doc, index) => {
            const agent = agents[index % agents.length];
            batch.update(doc.ref, {
                assignedAgency: agent,
                status: 'Assigned',
                updatedAt: new Date().toISOString()
            });
            count++;
        });

        await batch.commit();

        res.json({
            assignedCount: count,
            accuracyMetric: 0.95, // Mock metric
            message: `Allocated ${count} cases.`
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

        const isHighRisk = isStagnant && isOld && isUnpaid;

        res.json({
            isHighRisk,
            riskScore: isHighRisk ? 90 : 20,
            factors: { isStagnant, isOld, isUnpaid }
        });

    } catch (error) {
        console.error("Risk Prediction Error:", error);
        res.status(500).json({ error: "Prediction failed" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
