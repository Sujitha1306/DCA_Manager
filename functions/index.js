const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");

dotenv.config();

initializeApp();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

exports.generateNegotiationStrategy = onCall({ cors: true }, async (request) => {
  try {
    const { caseData, historyNotes } = request.data;

    // Validation
    if (!caseData || !caseData.amount) {
      throw new HttpsError('invalid-argument', 'Missing case data.');
    }

    if (!GEMINI_API_KEY) {
      console.error("Gemini API Key is missing");
      // Fail gracefully for the user - or throw an error if you prefer strict failure
      // For this implementation, we will try to proceed but it will likely fail if no key.
      // Actually per requirements: "assume the API Key is stored".
      // But if it's missing, let's log it.
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const { amount, riskScore, daysOverdue } = caseData;
    const notesSummary = historyNotes && historyNotes.length > 0
      ? historyNotes.map(n => n.note || n.text).join("; ") // Support both 'note' and 'text' fields
      : "No previous interaction history.";

    const prompt = `You are a Senior Debt Collector.
Context: Debt $${amount}, Risk ${riskScore}/100, Overdue ${daysOverdue} days. History: ${notesSummary}.
Output JSON only:
{
  "strategy": "2-word strategy name (e.g. Empathetic Firmness)",
  "analysis": "1 sentence psychological analysis of debtor",
  "script": "2 sentence polite but firm opening script for the agent"
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up potential markdown code blocks in response
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(jsonString);

  } catch (error) {
    console.error("Error calling Gemini:", error);
    // Return default fallback as requested
    return {
      strategy: "Standard Protocol",
      analysis: "AI service unavailable, defaulting to standard procedure.",
      script: "Hello, I am calling regarding your outstanding balance. How can we help you resolve this today?"
    };
  }
});

exports.autoAllocateTasks = onCall({ cors: true }, async (request) => {
  const db = getFirestore();

  try {
    // 1. Fetch unassigned cases
    // Querying cases where assignedAgency is 'Unassigned' OR status is 'New'
    // For simplicity in this demo, we'll fetch 'New' cases
    const casesSnapshot = await db.collection('cases')
      .where('status', '==', 'New')
      .limit(100) // Limit for demo performance
      .get();

    const unassignedCases = [];
    casesSnapshot.forEach(doc => {
      const data = doc.data();
      // Double check if it's truly unassigned if needed, but status New implies it usually
      unassignedCases.push({ id: doc.id, ...data });
    });

    if (unassignedCases.length === 0) {
      return { assignedCount: 0, accuracyMetric: 0.0, message: "No new cases to assign." };
    }

    // 2. Mock Agents (Simulating a fetch from 'agents' collection)
    const agents = [
      { id: 'AG-001', name: 'Sarah Jenkins', skill: 'Senior', tenureMonths: 36, currentLoad: 12, cap: 50 },
      { id: 'AG-002', name: 'Mike Ross', skill: 'Junior', tenureMonths: 8, currentLoad: 5, cap: 40 },
      { id: 'AG-003', name: 'Harvey S.', skill: 'Senior', tenureMonths: 60, currentLoad: 45, cap: 50 }, // Almost full
      { id: 'AG-004', name: 'Rachel Z.', skill: 'Mid-Level', tenureMonths: 18, currentLoad: 20, cap: 45 },
      { id: 'AG-005', name: 'Louis L.', skill: 'Senior', tenureMonths: 48, currentLoad: 10, cap: 50 },
      { id: 'AG-006', name: 'Donna P.', skill: 'Senior', tenureMonths: 72, currentLoad: 0, cap: 50 },
      { id: 'AG-007', name: 'Jessica P.', skill: 'Senior', tenureMonths: 80, currentLoad: 30, cap: 50 },
      { id: 'AG-008', name: 'Katrina B.', skill: 'Mid-Level', tenureMonths: 20, currentLoad: 15, cap: 45 },
      { id: 'AG-009', name: 'Alex W.', skill: 'Junior', tenureMonths: 3, currentLoad: 0, cap: 30 },
      { id: 'AG-010', name: 'Samantha W.', skill: 'Senior', tenureMonths: 90, currentLoad: 25, cap: 50 }
    ];

    // 3. Scoring Algorithm
    const assignments = [];

    // Create a working copy of agents to track load during this batch
    const agentLoadTracker = agents.map(a => ({ ...a }));

    for (const caseItem of unassignedCases) {
      let bestAgent = null;
      let highestScore = -1;

      // Iterate through candidates
      for (const agent of agentLoadTracker) {
        if (agent.currentLoad >= agent.cap) continue; // Skip full agents

        // -- SCORING LOGIC START --
        // Base Score
        let score = 50;

        // Risk Factor Interaction
        // Assuming Risk is 0-100. If missing, default to 50.
        const risk = caseItem.riskScore || 50;

        // "Senior agents handle high risk"
        if (agent.skill === 'Senior' && risk > 70) {
          score += 30;
        }

        // "Avoid risky tasks for juniors"
        if (agent.skill === 'Junior' && risk > 70) {
          score -= 20;
        }

        // "Tenure Bonus"
        if (agent.tenureMonths > 24) {
          score += 10;
        }
        // -- SCORING LOGIC END --

        if (score > highestScore) {
          highestScore = score;
          bestAgent = agent;
        }
      }

      if (bestAgent) {
        assignments.push({
          caseId: caseItem.id,
          assignedAgentId: bestAgent.id,
          assignedAgentName: bestAgent.name,
          matchScore: highestScore
        });

        // Update local tracker
        bestAgent.currentLoad += 1;
      }
    }

    // 4. Batch Commit to Firestore
    const batch = db.batch();

    assignments.forEach(assign => {
      const caseRef = db.collection('cases').doc(assign.caseId);
      batch.update(caseRef, {
        assignedAgentId: assign.assignedAgentId,
        assignedAgentName: assign.assignedAgentName, // Helpful for display
        status: 'Assigned', // Changing status from New to Assigned
        autoAllocatedAt: new Date().toISOString(),
        matchScore: assign.matchScore
      });
    });

    await batch.commit();

    return {
      assignedCount: assignments.length,
      accuracyMetric: 0.85, // Mocked metric
      details: `Assigned ${assignments.length} tasks across ${agents.length} agents.`
    };

  } catch (error) {
    console.error("Auto-Allocate Error:", error);
    throw new HttpsError('internal', 'Auto-allocation failed', error.message);
  }
});
