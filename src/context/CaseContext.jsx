import { createContext, useContext, useState, useEffect } from 'react';
import { generateSeedData } from '../utils/seedData';

const CaseContext = createContext();

export const useCases = () => useContext(CaseContext);

export const CaseProvider = ({ children }) => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initialize with seed data
    useEffect(() => {
        // In a real app, this would be onSnapshot(collection(db, 'cases'))
        const initialData = generateSeedData();
        setCases(initialData);
        setLoading(false);
    }, []);

    // Mock function to update cases (e.g., assign agency)
    const updateCases = async (caseIds, updates) => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        setCases(prev => prev.map(c => {
            if (caseIds.includes(c.id)) {
                return { ...c, ...updates };
            }
            return c;
        }));
    };

    const addCaseNote = async (caseId, note) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        setCases(prev => prev.map(c => {
            if (c.id === caseId) {
                return { ...c, notes: [note, ...c.notes] };
            }
            return c;
        }));
    };

    return (
        <CaseContext.Provider value={{ cases, loading, updateCases, addCaseNote }}>
            {children}
        </CaseContext.Provider>
    );
};
