import { useState } from 'react';
import { useCases } from '../context/CaseContext';
import DataTable from '../components/DataTable';
import AllocationModal from '../components/AllocationModal';
import { Filter, Users, Download, SlidersHorizontal } from 'lucide-react';
import { clsx } from "clsx";

export default function CasePool() {
    const { cases, updateCases } = useCases();
    const [selectedIds, setSelectedIds] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterMode, setFilterMode] = useState('all'); // 'all', 'unassigned', 'high_risk'

    // Filter Logic
    const filteredCases = cases.filter(c => {
        if (filterMode === 'unassigned') return c.assignedAgency === 'Unassigned';
        if (filterMode === 'high_risk') return c.riskScore < 40;
        return true;
    });

    const handleAllocation = async (agencyName) => {
        await updateCases(selectedIds, { assignedAgency: agencyName });
        setSelectedIds([]); // Clear selection after assignment
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Case Allocation Pool</h1>
                    <p className="text-slate-500">Manage, prioritize, and assign debts to external agencies.</p>
                </div>
                <div className="flex items-center space-x-3">
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

            {/* Filters */}
            <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-slate-200 w-fit">
                {[
                    { id: 'all', label: 'All Cases' },
                    { id: 'unassigned', label: 'Unassigned Only' },
                    { id: 'high_risk', label: 'High Risk (<40)' }
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

            {/* Modal */}
            <AllocationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedCount={selectedIds.length}
                onConfirm={handleAllocation}
            />
        </div>
    );
}
