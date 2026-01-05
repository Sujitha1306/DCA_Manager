import { CASE_STATUS } from '../types/schema';

export const generateSeedData = () => {
    const agencies = ['Agency A', 'Agency B', 'Unassigned'];

    return Array.from({ length: 15 }).map((_, i) => ({
        id: `C-${1000 + i}`,
        customerName: [
            'Acme Corp', 'Globex', 'Soylent Corp', 'Initech', 'Umbrella Corp',
            'Cyberdyne', 'Massive Dynamic', 'Stark Ind', 'Wayne Ent', 'Hooli'
        ][i % 10] + ` Branch ${Math.floor(i / 10) + 1}`,
        amount: Math.floor(Math.random() * 50000) + 1000,
        daysOverdue: Math.floor(Math.random() * 120) + 30,
        status: Object.values(CASE_STATUS)[Math.floor(Math.random() * 5)],
        assignedAgency: agencies[Math.floor(Math.random() * agencies.length)],
        customerHistory: ['Good', 'Fair', 'Poor'][Math.floor(Math.random() * 3)],
        riskScore: Math.floor(Math.random() * 100),
        notes: [
            {
                id: `n-${i}`,
                text: 'Initial automated invoice reminder sent.',
                author: 'System',
                date: new Date(Date.now() - 86400000 * 10).toISOString()
            }
        ]
    }));
};
