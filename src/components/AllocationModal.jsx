import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useCases } from '../context/CaseContext';

export default function AllocationModal({ isOpen, onClose, selectedCount, onConfirm }) {
    const [selectedAgency, setSelectedAgency] = useState('Agency A');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
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
                    <select
                        value={selectedAgency}
                        onChange={(e) => setSelectedAgency(e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="Agency A">Agency A (Premium Collectors)</option>
                        <option value="Agency B">Agency B (Rapid Recovery)</option>
                    </select>
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
                        disabled={loading}
                        className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 flex items-center justify-center space-x-2"
                    >
                        {loading ? <span>Processing...</span> : <><span>Confirm Assignment</span><Check size={18} /></>}
                    </button>
                </div>
            </div>
        </div>
    );
}
