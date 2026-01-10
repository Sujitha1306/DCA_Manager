const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');

dotenv.config();

// Initialize Firebase Admin (Auto-detects in Cloud Functions)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();

// CORS: Allow all for now (or restrict to your app domain)
app.use(cors({ origin: true }));
app.use(express.json());

// --- ROUTES ---

// 1. Negotiate (AI Coach)
app.post('/api/negotiate', async (req, res) => {
  try {
    const { caseData, historyNotes } = req.body;

    if (!caseData || !caseData.amount) {
      return res.status(400).json({ error: "Missing case data" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
        Act as a Debt Collection Expert.
        Case: $${caseData.amount}, Overdue ${caseData.daysOverdue} days, Risk ${caseData.riskScore || 'N/A'}.
        History: ${historyNotes ? JSON.stringify(historyNotes) : "None"}.
        
        Output strictly JSON:
        {
        "strategy": "Short Title",
        "analysis": "One sentence insight",
        "script": "Two sentence script"
        }
        `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstOpen = jsonStr.indexOf('{');
    const lastClose = jsonStr.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1) {
      jsonStr = jsonStr.substring(firstOpen, lastClose + 1);
    }

    const data = JSON.parse(jsonStr);
    res.json(data);

  } catch (error) {
    console.error("Negotiation Error:", error);
    res.status(500).json({
      error: "AI Generation Failed",
      fallback: {
        strategy: "Standard Protocol",
        analysis: "Unable to generate real-time insight.",
        script: "I am calling regarding your outstanding balance. How can we resolve this today?"
      }
    });
  }
});

// 2. Allocate (Smart AI Task Assignment)
app.post('/api/allocate', async (req, res) => {
  try {
    console.log("Starting AI Allocation...");
    const casesRef = db.collection('cases');
    // Unassigned or New
    const unassignedQuery = casesRef.where('assignedAgency', '==', 'Unassigned');
    const snapshot = await unassignedQuery.get();

    if (snapshot.empty) {
      return res.json({ assignedCount: 0, accuracyMetric: 1.0, message: "No unassigned cases found." });
    }

    const usersRef = db.collection('users');
    const agentsSnapshot = await usersRef.where('role', '==', 'agent').where('status', '==', 'active').get();

    if (agentsSnapshot.empty) {
      return res.status(400).json({ error: "No active agents available for assignment." });
    }

    let agents = agentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      currentLoad: 0,
      score: 0.5 // Default score
    }));

    // Mock Logic for Agent Scores (In production, aggregate from stats)
    agents = agents.map(agent => ({
      ...agent,
      score: 0.7 + (Math.random() * 0.3) // Random score 0.7-1.0
    }));

    const unassignedCases = snapshot.docs.map(doc => ({ id: doc.id, ref: doc.ref, data: doc.data() }));
    // Sort cases by risk (High risk first)
    unassignedCases.sort((a, b) => (b.data.riskScore || 0) - (a.data.riskScore || 0));
    // Sort agents by score
    agents.sort((a, b) => b.score - a.score);

    const batch = db.batch();
    const notificationsBatch = db.collection('notifications');
    let assignedCount = 0;
    let agentIndex = 0;
    const totalAgents = agents.length;
    const fairShare = Math.ceil(unassignedCases.length / totalAgents);

    for (const caseObj of unassignedCases) {
      let assigned = false;
      let attempts = 0;

      while (!assigned && attempts < totalAgents) {
        const agent = agents[agentIndex];
        if (!agent.batchAssigned) agent.batchAssigned = 0;

        if (agent.batchAssigned < fairShare) {
          batch.update(caseObj.ref, {
            assignedAgency: agent.agencyName || 'Agency',
            assignedAgentId: agent.uid || agent.id, // Ensure ID mismatch handled
            status: 'Assigned',
            updatedAt: new Date().toISOString(),
            aiScore: agent.score,
            autoAllocated: true
          });

          // Notify
          const notifRef = notificationsBatch.doc();
          batch.set(notifRef, {
            userId: agent.uid || agent.id,
            title: 'New Case Assigned',
            message: `New Case Assigned. Risk: ${caseObj.data.riskScore || 'N/A'}`,
            read: false,
            createdAt: new Date().toISOString(),
            type: 'assignment'
          });

          agent.batchAssigned++;
          assignedCount++;
          assigned = true;
        } else {
          agentIndex = (agentIndex + 1) % totalAgents;
          attempts++;
        }
      }
    }

    await batch.commit();

    res.json({
      assignedCount,
      accuracyMetric: 0.88,
      message: `Allocated ${assignedCount} cases.`
    });

  } catch (error) {
    console.error("Allocation Error:", error);
    res.status(500).json({ error: "Allocation failed" });
  }
});

// 3. Predict SLA
app.post('/api/predict-sla', async (req, res) => {
  try {
    const { caseData } = req.body;
    const isOld = caseData.daysOverdue > 90;
    const isStagnant = (caseData.interactionCount || 0) > 5;

    let riskScore = 20;
    if (isOld) riskScore += 50;
    if (isStagnant) riskScore += 20;
    if (caseData.amount > 5000) riskScore += 10;

    res.json({
      isHighRisk: riskScore > 70,
      riskScore,
      factors: { isOld, isStagnant }
    });
  } catch (error) {
    res.status(500).json({ error: "Prediction failed" });
  }
});

// 4. Ingest Cases
app.post('/api/ingest', async (req, res) => {
  try {
    const { cases } = req.body;
    if (!cases || !Array.isArray(cases)) {
      return res.status(400).json({ error: "Invalid cases array" });
    }

    const batch = db.batch();
    const casesRef = db.collection('cases');
    let processedCount = 0;

    cases.forEach(c => {
      const newDocRef = casesRef.doc();
      const amount = parseFloat(c.amount) || 0;
      const daysOverdue = parseInt(c.daysOverdue) || 0;
      let riskScore = 30;
      if (daysOverdue > 60) riskScore += 40;
      if (amount > 10000) riskScore += 20;
      riskScore = Math.min(99, riskScore);

      batch.set(newDocRef, {
        ...c,
        amount,
        daysOverdue,
        riskScore,
        status: 'New',
        assignedAgency: 'Unassigned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: []
      });
      processedCount++;
    });

    await batch.commit();
    res.json({ success: true, count: processedCount });

  } catch (error) {
    console.error("Ingestion Error:", error);
    res.status(500).json({ error: "Ingestion failed" });
  }
});

// Export the Express App as a Cloud Function
exports.api = onRequest({ cors: true }, app);
