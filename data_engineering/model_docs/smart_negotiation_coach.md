# Smart Negotiation Coach Model Documentation

**Model Name**: Generative AI Negotiation Coach (Gemini 1.5 Flash)
**Date**: 2026-01-08
**Backend Path**: `functions/index.js`
**Frontend Widget**: `src/components/AiCoachWidget.jsx`

## 1. Overview & Use Case
The **Smart Negotiation Coach** is a GenAI-powered module that acts as a real-time copilot for debt collection agents. Unlike the deterministic XGBoost models used for batch allocation, this model uses a Large Language Model (LLM) to understand the *nuance* of a specific case and generate human-like conversation scripts.

**Goal**: To empower agents with "Senior Collector" level expertise on-demand, increasing the conversion rate of difficult calls.

## 2. Technical Architecture

### Model Engine
*   **Provider**: Google Vertex AI / Gemini API
*   **Model**: `gemini-1.5-flash`
*   **Reasoning**: Selected for its low latency (<1s response time) and cost-effectiveness for real-time applications.

### Data Flow
1.  **Frontend**: User clicks "Ask AI Coach" on `CaseDetail.jsx`.
2.  **Payload**: The app sends a JSON payload to the Firebase Cloud Function.
3.  **Inference**: The function constructs a prompt and calls the Gemini API.
4.  **Response**: The model returns a structured JSON object to the UI.

## 3. Input & Output Specification

### Input Parameters (passed to function)
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `caseData.amount` | Number | The outstanding debt amount (e.g., 5000). |
| `caseData.riskScore` | Number | The proprietary Recovery Score (0-100). |
| `historyNotes` | Array | List of previous interaction notes (e.g., "Customer hung up", "Promised to pay next week"). |

### Output JSON (returned to UI)
```json
{
  "strategy": "String (2 words)",    // e.g., "Empathetic Firmness"
  "analysis": "String (1 sentence)", // Psychological analysis of the debtor's behavior.
  "script": "String (2 sentences)"   // Verbatim script for the agent to read.
}
```

## 4. Prompt Engineering
The core logic resides in the prompt design within `functions/index.js`.

**Persona**: "Senior Debt Collector at FedEx"
**Context Injection**:
> "Customer owes ${amount}. Risk Score: ${riskScore}. History: ${notesSummary}."

**Instructions**:
> "Task:
> 1. Strategy: 2-word approach.
> 2. Analysis: 1-sentence summary of their behavior.
> 3. Script: A polite but effective 2-sentence opening script for the agent."

## 5. Example Inference

**Input**:
```json
{
  "caseData": { "amount": 1200, "riskScore": 45 },
  "historyNotes": [
    { "note": "Customer said he lost his job." },
    { "note": "Missed PTP date yesterday." }
  ]
}
```

**Model Output**:
```json
{
  "strategy": "Compassionate Urgency",
  "analysis": "Customer is financially distressed but has broken a previous promise, indicating a need for a smaller, secured commitment.",
  "script": "I'm very sorry to hear about your job loss, John. Since the previous arrangement was missed, can we set up a smaller 'good faith' payment of $50 today to keep your account active?"
}
```

## 6. Integration
The feature is implemented as a **Firebase Cloud Function** (`generateNegotiationStrategy`) to keep the API Key secure on the server side. The Frontend uses `httpsCallable` to invoke it securely.
