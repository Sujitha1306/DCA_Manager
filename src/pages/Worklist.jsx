import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCases } from '../context/CaseContext';
import DataTable from '../components/DataTable';
import { RotateCcw, Sparkles } from 'lucide-react';
import { calculateRecoveryScore } from '../utils/aiLogic';

export default function Worklist() {
    const { user } = useAuth();
    const { cases } = useCases();
    const navigate = useNavigate();
    const [filterStatus, setFilterStatus] = useState('active'); // active, risk, paid

    const processedCases = useMemo(() => {
        // 1. Filter by Agent (Match Dashboard logic)
        let data = cases.filter(c => c.assignedAgentId === user?.uid);

        // 2. Filter by Status/Tab
        if (filterStatus === 'paid') {
            data = data.filter(c => c.status === 'Paid');
        } else if (filterStatus === 'risk') {
            // High Risk = Low Recovery Score (e.g. < 50) AND Not Paid
            data = data.filter(c => c.status !== 'Paid' && calculateRecoveryScore(c) < 50);
        } else {
            // Active (Default): Everything NOT Paid
            data = data.filter(c => c.status !== 'Paid');
        }

        // 3. Calculate Scores & Transform
        data = data.map(c => ({
            ...c,
            recoveryScore: calculateRecoveryScore(c)
        }));

        // 4. Sort
        if (isAiSorted) {
            data.sort((a, b) => {
                if (b.recoveryScore !== a.recoveryScore) return b.recoveryScore - a.recoveryScore;
                return b.amount - a.amount;
            });
        } else {
            // Default Sort
            data.sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0));
        }

        // 5. Transform for Display (Add Badges)
        return data.map(c => ({
            ...c,
            customerName: (
                <div className="flex items-center group relative">
                    {c.recoveryScore >= 80 && (
                        <span className="mr-2 text-lg cursor-help transition-transform hover:scale-125" title="Hot Lead: High Probability">🔥</span>
                    )}
                    {c.recoveryScore < 40 && (
                        <span className="mr-2 text-lg cursor-help transition-transform hover:scale-125" title="Cold Lead: Low Probability">❄️</span>
                    )}
                    <span className={c.recoveryScore >= 80 ? "font-semibold text-slate-900" : ""}>
                        {c.customerName}
                    </span>
                </div>
            )
        }));
    }, [cases, user, isAiSorted, filterStatus]);

    const handleRowClick = (id) => {
        navigate(`/cases/${id}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Worklist</h1>
                    <p className="text-slate-500">
                        {filterStatus === 'active' ? 'Active cases needing attention' :
                            filterStatus === 'risk' ? 'High Risk cases requiring immediate action' :
                                'Completed and Paid cases'}
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setIsAiSorted(!isAiSorted)}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${isAiSorted
                            ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-200'
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                            }`}
                    >
                        <Sparkles size={16} className={`mr-2 ${isAiSorted ? 'animate-pulse' : 'text-indigo-500'}`} />
                        {isAiSorted ? 'AI Prioritized' : 'AI Sort'}
                    </button>
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                        <RotateCcw size={20} />
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200">
                <button
                    onClick={() => setFilterStatus('active')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${filterStatus === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Active Cases
                </button>
                <button
                    onClick={() => setFilterStatus('risk')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${filterStatus === 'risk' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    High Risk
                </button>
                <button
                    onClick={() => setFilterStatus('paid')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${filterStatus === 'paid' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Paid History
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <DataTable
                    data={processedCases}
                    onSelectionChange={() => { }}
                    onRowClick={handleRowClick}
                    showProbability={true}
                />
            </div>
        </div>
    );
}
