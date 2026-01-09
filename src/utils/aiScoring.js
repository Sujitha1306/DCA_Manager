/**
 * Calculates a dynamic risk score (0-100) for a debt case.
 * 
 * Logic:
 * - Base Score: 10 (Low risk start)
 * - Age Factor: +0.5 points for every day overdue. (e.g., 90 days = +45 points)
 * - Amount Factor: +10 points if Amount > $5000 (High value = higher attention/risk).
 * - Cap: Score cannot exceed 100.
 * 
 * @param {number} amount - The debt amount.
 * @param {number} daysOverdue - Number of days the debt is overdue.
 * @returns {number} - Risk Score (0-100)
 */
export const calculateRiskScore = (amount, daysOverdue) => {
     let score = 10; // Base baseline

     // Age Penalty: The older the debt, the harder to collect (Higher Risk)
     // 0-30 days: +0
     // 30+ days: +0.5 per day
     if (daysOverdue > 30) {
          score += (daysOverdue - 30) * 0.5;
     }

     // Amount Priority: High value debts are "riskier" to lose
     if (amount > 5000) {
          score += 10;
     }
     if (amount > 20000) {
          score += 15; // Extra urgency
     }

     // Cap at 100
     return Math.min(Math.floor(score), 100);
};
