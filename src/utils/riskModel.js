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

     const interactionCount = interactionLogs ? interactionLogs.length : 0; // Or caseData.interactionCount if available directly
     // Using caseData.interactionCount as fallback or primary if logs strictly not passed everytime
     const count = caseData.interactionCount !== undefined ? caseData.interactionCount : interactionCount;

     const isStagnant = count > 5;
     const isOld = caseData.daysOverdue > 90;
     const isUnpaid = caseData.status !== 'Paid';

     return isStagnant && isOld && isUnpaid;
};
