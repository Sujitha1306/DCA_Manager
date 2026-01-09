import { useState, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function AllocationModal({ isOpen, onClose, selectedCount, onConfirm }) {
    const [agents, setAgents] = useState([]);
    const [selectedAgency, setSelectedAgency] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingAgents, setFetchingAgents] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchActiveAgents();
        }
    }, [isOpen]);

    const fetchActiveAgents = async () => {
        setFetchingAgents(true);
        try {
            const q = query(collection(db, 'users'), where('role', '==', 'agent'), where('status', '==', 'active'));
            const querySnapshot = await getDocs(q);
            const activeAgents = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAgents(activeAgents);
            // Default select first one
            if (activeAgents.length > 0) {
                setSelectedAgency(activeAgents[0].agencyName);
            }
        } catch (error) {
            console.error("Error fetching agents:", error);
        } finally {
            setFetchingAgents(false);
        }
    };

    if (!isOpen) return null;

    const handleConfirm = async () => {
        if (!selectedAgency) return;
        setLoading(true);
        await onConfirm(selectedAgency);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Assign Cases</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <p className="text-slate-600 mb-6">
                    You are about to assign <span className="font-bold text-slate-900">{selectedCount} case(s)</span> to an external agency.
                </p>

                <div className="space-y-2 mb-6">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Select Agency</label>
                    {fetchingAgents ? (
                        <div className="flex items-center space-x-2 text-slate-400 p-3 bg-slate-50 rounded-lg">
                            <Loader2 className="animate-spin" size={16} />
                            <span>Loading active agents...</span>
                        </div>
                    ) : agents.length === 0 ? (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                            No active agents found. Please approve agents in "Manage Agents".
                        </div>
                    ) : (
                        <select
                            value={selectedAgency}
                            onChange={(e) => setSelectedAgency(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {agents.map(agent => (
                                <option key={agent.id} value={agent.agencyName}>
                                    {agent.agencyName} ({agent.email})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading || agents.length === 0}
                        className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                        {loading ? <span>Processing...</span> : <><span>Confirm Assignment</span><Check size={18} /></>}
                    </button>
                </div>
            </div>
        </div>
    );
}
