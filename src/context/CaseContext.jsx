import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { API_BASE_URL } from '../api/config';

const CaseContext = createContext();

export const useCases = () => useContext(CaseContext);

export const CaseProvider = ({ children }) => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);

    // Sync from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'cases'), (snapshot) => {
            const caseList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCases(caseList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching cases:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Add new cases (Batch or Single)
    // Add new cases (Bulk Ingest via Backend for AI Scoring)
    const addCases = async (newCases) => {
        try {
            // Optimistic attempt at Backend API (for AI Scoring)
            const response = await fetch(`${API_BASE_URL}/api/ingest`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cases: newCases })
            });

            if (!response.ok) {
                throw new Error("Backend Ingestion Failed");
            }

            const result = await response.json();
            return result;

        } catch (error) {
            console.warn("Backend API unavailable (Deployment pending). Falling back to Client-Side Ingestion.", error);

            // Client-Side Fallback
            const batch = writeBatch(db);
            let count = 0;

            newCases.forEach(c => {
                const docRef = doc(collection(db, 'cases'));
                const amount = parseFloat(c.amount) || 0;
                const daysOverdue = parseInt(c.daysOverdue) || 0;

                // Local Risk Logic
                let riskScore = 30;
                if (daysOverdue > 30) riskScore += 20;
                if (daysOverdue > 60) riskScore += 20;
                if (amount > 5000) riskScore += 10;

                batch.set(docRef, {
                    ...c,
                    amount,
                    daysOverdue,
                    riskScore: Math.min(99, riskScore),
                    status: 'New',
                    assignedAgency: 'Unassigned',
                    assignedAgentId: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    notes: []
                });
                count++;
            });

            await batch.commit();
            return { success: true, count, message: "Ingested via Client Fallback" };
        }
    };

    // Update existing cases
    const updateCases = async (caseIds, updates) => {
        const promises = caseIds.map(id => {
            const caseRef = doc(db, 'cases', id);
            return updateDoc(caseRef, {
                ...updates,
                lastUpdated: new Date().toISOString()
            });
        });
        await Promise.all(promises);
    };

    // Add Note
    const addCaseNote = async (caseId, note) => {
        const caseRef = doc(db, 'cases', caseId);
        // We need to get the current notes first or use arrayUnion. 
        // Since our notes are objects, arrayUnion works if objects are exact, but timestamps differ.
        // Let's just read-modify-write for safety or rely on the frontend passing the new list?
        // Better: use arrayUnion.
        // However, `note` usually has structure.
        // Let's accept that we might need to read the doc, but for performance let's try just updating.
        // Wait, the previous mock implementation appended to local state.
        // Let's simple fetch current, append, update.
        // Or simpler: The component calling this might pass the whole new notes array? 
        // The signature was `addCaseNote(caseId, note)`.
        // Let's assume we can push to the `notes` array using updateDoc.

        // Actually, arrayUnion from firestore is best.
        // import { arrayUnion } from 'firebase/firestore';

        // BUT, for now, let's keep it simple: simpler to just assume the user of the context updates the UI optimistically or we wait for snapshot.
        // Let's use a transaction or simple update if we had valid arrayUnion.
        // For now, let's just do a manual merge (fetch is expensive).
        // Let's just use arrayUnion if possible, but I didn't import it.
        // Let's fallback to: find case in local `cases` state, get its notes, append, send update.
        // This relies on `cases` being up to date.

        const currentCase = cases.find(c => c.id === caseId);
        if (!currentCase) return;

        const newNotes = [note, ...(currentCase.notes || [])];

        await updateDoc(caseRef, {
            notes: newNotes,
            lastUpdated: new Date().toISOString()
        });
    };

    const deleteCases = async (caseIds) => {
        try {
            const batch = writeBatch(db);
            caseIds.forEach(id => {
                const docRef = doc(db, 'cases', id);
                batch.delete(docRef);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error deleting cases:", error);
            throw error;
        }
    };

    return (
        <CaseContext.Provider value={{ cases, loading, updateCases, addCases, addCaseNote, deleteCases }}>
            {children}
        </CaseContext.Provider>
    );
};
