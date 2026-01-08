import { useState } from 'react';
import { useCases } from '../context/CaseContext';
import DataTable from '../components/DataTable';
import AllocationModal from '../components/AllocationModal';
import { Filter, Users, Download, SlidersHorizontal, Bot, CheckCircle, Loader2 } from 'lucide-react';
import { clsx } from "clsx";
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../context/AuthContext'; // Assuming AuthContext exists
import { calculateSlaRisk } from '../utils/riskModel';

export default function CasePool() {
    const { cases, updateCases } = useCases();
    const [selectedIds, setSelectedIds] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'unassigned', 'high_risk'

    // Auto-Allocate State
    const [isAllocating, setIsAllocating] = useState(false);
    const [allocationProgress, setAllocationProgress] = useState(0);
    const [allocationResult, setAllocationResult] = useState(null);

    // Filter Logic
    const filteredCases = cases.filter(c => {
        if (filterMode === 'unassigned') return c.assignedAgency === 'Unassigned' || c.status === 'New';
        if (filterMode === 'high_risk') return calculateSlaRisk(c);
        return true;
    });

    const handleAllocation = async (agencyName) => {
        await updateCases(selectedIds, { assignedAgency: agencyName });
        setSelectedIds([]); // Clear selection after assignment
    };

    const handleAutoAllocate = async () => {
        setIsAllocating(true);
        setAllocationProgress(0);
        setAllocationResult(null);

        // Simulate progress
        const interval = setInterval(() => {
            setAllocationProgress(prev => {
                if (prev >= 90) return prev;
                return prev + 10;
            });
        }, 200);

        try {
            const autoAllocate = httpsCallable(functions, 'autoAllocateTasks');

            const result = await autoAllocate();
            const data = result.data;

            clearInterval(interval);
            setAllocationProgress(100);

            // Show success result
            setTimeout(() => {
                setIsAllocating(false);
                setAllocationResult(data);
                // Trigger refresh if needed, usually realtime listener in context updates it
                // But we can show a toast or alert here
                alert(`✅ Success! Assigned ${data.assignedCount} tasks. Accuracy: ${data.accuracyMetric * 100}%`);
                window.location.reload(); // Simple reload to fetch new data
            }, 500);

        } catch (error) {
            console.error("Auto-Allocate Failed:", error);
            clearInterval(interval);
            setIsAllocating(false);
            alert("Failed to auto-allocate tasks. See console.");
        }
    };

    return (
        <div className="space-y-6 relative">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Case Allocation Pool</h1>
                    <p className="text-slate-500">Manage, prioritize, and assign debts.</p>
                </div>
                <div className="flex items-center space-x-3">
                    {/* Auto Allocate Button */}
                    <button
                        onClick={handleAutoAllocate}
                        disabled={isAllocating}
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        {isAllocating ? <Loader2 className="animate-spin" size={18} /> : <Bot size={18} />}
                        <span>AI Auto-Allocate</span>
                    </button>

                    <button className="flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                        <Download size={18} />
                        <span>Export CSV</span>
                    </button>

                    {selectedIds.length > 0 && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors animate-fade-in"
                        >
                            <Users size={18} />
                            <span>Assign ({selectedIds.length})</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Allocation Progress Modal Overlay */}
            {isAllocating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm text-center animate-fade-in-up">
                        <Bot size={48} className="mx-auto text-indigo-600 mb-4 animate-bounce" />
                        <h3 className="text-lg font-bold text-slate-900 mb-2">AI Scoring in Progress</h3>
                        <p className="text-slate-500 mb-4">Analyzing agents & calculating risk scores...</p>

                        <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2 overflow-hidden">
                            <div
                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${allocationProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-slate-400">{allocationProgress}% Complete</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-slate-200 w-fit">
                {[
                    { id: 'all', label: 'All Cases' },
                    { id: 'unassigned', label: 'Unassigned Only' },
                    { id: 'high_risk', label: 'High Risk' }
                ].map(f => (
                    <button
                        key={f.id}
                        onClick={() => setFilterMode(f.id)}
                        className={clsx(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            filterMode === f.id ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Table */}
            <DataTable
                data={filteredCases}
                onSelectionChange={setSelectedIds}
            />

            {/* Manual Assignment Modal */}
            <AllocationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedCount={selectedIds.length}
                onConfirm={handleAllocation}
            />
        </div>
    );
}
