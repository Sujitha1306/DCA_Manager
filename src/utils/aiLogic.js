export const calculateRecoveryScore = (caseData) => {
    let score = 50; // Base score

    // Rule 1: Amount (Smaller amounts are easier to collect)
    if (caseData.amount < 1000) {
        score += 10;
    } else if (caseData.amount > 10000) {
        score -= 10;
    }

    // Rule 2: Age (Newer debt is better)
    if (caseData.daysOverdue > 90) {
        score -= 20;
    } else if (caseData.daysOverdue < 30) {
        score += 10;
    }

    // Rule 3: History (Past behavior predicts future)
    if (caseData.customerHistory === 'Good') {
        score += 30;
    } else if (caseData.customerHistory === 'Poor') {
        score -= 20;
    }

    // Clamp score between 0 and 100
    return Math.max(0, Math.min(100, score));
};

export const getAiRecommendation = (score) => {
    if (score >= 80) {
        return {
            text: "High Probability: Call immediately. Customer is likely to pay.",
            type: "positive"
        };
    } else if (score >= 50) {
        return {
            text: "Medium Probability: Send email reminder and follow up in 2 days.",
            type: "neutral"
        };
    } else {
        return {
            text: "Low Probability: Suggest automated legal notice or settlement offer.",
            type: "negative"
        };
    }
};
