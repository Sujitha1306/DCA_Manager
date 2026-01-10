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
    const [isAiSorted, setIsAiSorted] = useState(false);

    const processedCases = useMemo(() => {
        // 1. Filter by Agent (Match Dashboard logic)
        let data = cases.filter(c => c.assignedAgentId === user?.uid);

        // 2. Calculate Scores
        data = data.map(c => ({
            ...c,
            recoveryScore: calculateRecoveryScore(c)
        }));

        // 3. Sort
        if (isAiSorted) {
            // Primary: Recovery Score (Desc)
            // Secondary: Amount (Desc)
            data.sort((a, b) => {
                if (b.recoveryScore !== a.recoveryScore) return b.recoveryScore - a.recoveryScore;
                return b.amount - a.amount;
            });
        } else {
            // Default: Risk Score (Asc - assuming lower risk score is better? Or just existing logic)
            // Existing logic was a.riskScore - b.riskScore
            data.sort((a, b) => a.riskScore - b.riskScore);
        }

        // 4. Transform for Display (Add Badges)
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
                        {/* Strip existing branch info if it makes it too long, or just keep it */}
                        {c.customerName}
                    </span>
                </div>
            )
        }));
    }, [cases, user, isAiSorted]);

    const handleRowClick = (id) => {
        navigate(`/cases/${id}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Worklist</h1>
                    <p className="text-slate-500">
                        {processedCases.length} active cases assigned to <span className="font-semibold text-slate-700">{user?.agencyId}</span>
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

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <DataTable
                    data={processedCases}
                    onSelectionChange={() => { }}
                    onRowClick={handleRowClick}
                />
            </div>
        </div>
    );
}
