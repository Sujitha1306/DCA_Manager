/**
 * @typedef {Object} Note
 * @property {string} id - Unique ID for the note
 * @property {string} text - Content of the note
 * @property {string} author - Name of the user who wrote it
 * @property {string} date - ISO date string
 */

/**
 * @typedef {Object} Case
 * @property {string} id - Unique Case ID
 * @property {string} customerName - Name of the debtor
 * @property {number} amount - Debt amount
 * @property {number} daysOverdue - Days since due date
 * @property {'New' | 'Contacted' | 'PTP' | 'Paid' | 'Dispute'} status - Current status
 * @property {string} assignedAgency - Agency ID or Name ('Unassigned')
 * @property {number} riskScore - 0-100 (Higher is better recovery chance)
 * @property {Note[]} notes - History of interactions
 */

export const CASE_STATUS = {
    NEW: 'New',
    CONTACTED: 'Contacted',
    PTP: 'PTP',
    PAID: 'Paid',
    DISPUTE: 'Dispute'
};
