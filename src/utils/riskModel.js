/**
 * Detects High Risk cases based on SLA criteria:
 * - Stagnant: > 5 interactions
 * - Old: > 90 days overdue
 * - Unpaid status
 * 
 * @param {Object} caseData - The case object containing details like daysOverdue, status.
 * @param {Array} interactionLogs - Optional array of interaction history.
 * @returns {boolean} - True if the case is considered High SLA Risk.
 */
export const calculateSlaRisk = (caseData, interactionLogs = []) => {
     if (!caseData) return false;

     const count = Number(caseData.interactionCount || interactionLogs?.length || 0);
     const daysOverdue = Number(caseData.daysOverdue || 0);
     const amount = Number(caseData.amount || 0);

     if (caseData.status === 'Paid') return false;

     // Risk Criteria (Any one triggers Alert)
     const isStagnant = count > 5; // Too many attempts without success
     const isOld = daysOverdue > 60; // Approaching write-off age
     const isHighValueAtRisk = amount > 3000 && daysOverdue > 30; // High value sitting for a month

     return isStagnant || isOld || isHighValueAtRisk;
};
