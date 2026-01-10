import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCases } from '../context/CaseContext'; // Import Case Context
import { CheckCircle, Clock, User, Users, Shield, TrendingUp, AlertCircle } from 'lucide-react';

export default function ManageAgents() {
    const [pendingAgents, setPendingAgents] = useState([]);
    const [activeAgents, setActiveAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('active'); // Default to Active
    const { user } = useAuth();
    const { cases } = useCases(); // Get real-time cases

    // Compute Agent Stats Dynamically
    const agentStats = useMemo(() => {
        const stats = {};
        activeAgents.forEach(agent => {
            const agentCases = cases.filter(c => c.assignedAgentId === agent.uid);
            const total = agentCases.length;
            const active = agentCases.filter(c => c.status !== 'Paid' && c.status !== 'Closed').length;
            const paid = agentCases.filter(c => c.status === 'Paid').length;
            const recoveredAmount = agentCases.filter(c => c.status === 'Paid').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

            // Simple Score: Recovery Rate (Weighted) + Activity?
            // For now: Recovery Rate * 100. If 0 cases, defaults.
            // Let's use a smarter formula: (Paid / Total) * 0.7 + (Active / 20) * 0.3 (Activity bonus)
            // Or just straight recovery rate for simplicity/clarity.
            const recoveryRate = total > 0 ? paid / total : 0;
            const score = Math.min(0.99, recoveryRate + (active > 0 ? 0.1 : 0)); // Small bonus for being active

            stats[agent.id] = {
                currentLoad: active,
                totalCases: total,
                recoveredAmount,
                score
            };
        });
        return stats;
    }, [activeAgents, cases]);

    useEffect(() => {
        fetchAgents();
    }, []);

    const fetchAgents = async () => {
        setLoading(true);
        try {
            // Fetch Pending
            const pendingQuery = query(collection(db, 'users'), where('status', '==', 'pending'));
            const pendingSnap = await getDocs(pendingQuery);
            const pendingData = pendingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingAgents(pendingData);

            // Fetch Active
            const activeQuery = query(collection(db, 'users'), where('status', '==', 'active'));
            const activeSnap = await getDocs(activeQuery);
            // Filter out self/admin from active list
            const activeData = activeSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(a => a.role !== 'admin');

            setActiveAgents(activeData);

        } catch (error) {
            console.error("Error fetching agents:", error);
        } finally {
            setLoading(false);
        }
    };

    const approveAgent = async (agentId) => {
        try {
            const agentRef = doc(db, 'users', agentId);
            await updateDoc(agentRef, {
                status: 'active',
                approvedBy: user.uid,
                approvedAt: new Date().toISOString()
            });
            fetchAgents();
        } catch (error) {
            console.error("Error approving agent:", error);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Agent Management
                    </h1>
                    <p className="text-slate-500">Approve and monitor agency staff performance.</p>
                </div>
                <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users className="w-4 h-4" />
                        Active Agents ({activeAgents.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-all ${activeTab === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Clock className="w-4 h-4" />
                        Pending Approval ({pendingAgents.length})
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-slate-400">Loading agents...</div>
                ) : (
                    <>
                        {activeTab === 'active' && (
                            <div className="space-y-4">
                                {activeAgents.map(agent => {
                                    const stats = agentStats[agent.id] || { score: 0, currentLoad: 0, recoveredAmount: 0 };
                                    return (
                                        <div key={agent.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                                                    {agent.email ? agent.email[0].toUpperCase() : 'U'}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{agent.email}</div>
                                                    <div className="text-sm text-slate-500 flex items-center space-x-2">
                                                        <span>{agent.agencyName || 'No Agency'}</span>
                                                        {agent.role === 'admin' && (
                                                            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center">
                                                                <Shield size={10} className="mr-1" /> Admin
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-8">
                                                {/* Score Badge */}
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Performance</p>
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <span className={`text-2xl font-bold ${stats.score > 0.7 ? 'text-emerald-600' :
                                                            stats.score > 0.4 ? 'text-amber-500' : 'text-red-500'
                                                            }`}>
                                                            {(stats.score * 100).toFixed(0)}%
                                                        </span>
                                                        {stats.score > 0.7 ? <TrendingUp size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-slate-300" />}
                                                    </div>
                                                </div>

                                                <div className="text-right border-l border-slate-100 pl-8">
                                                    <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Current Load</p>
                                                    <p className="text-xl font-bold text-slate-700">{stats.currentLoad} <span className="text-sm font-normal text-slate-400">cases</span></p>
                                                </div>

                                                <div className="text-right border-l border-slate-100 pl-8 hidden sm:block">
                                                    <p className="text-xs text-slate-400 uppercase font-semibold mb-1">Recovered</p>
                                                    <p className="text-xl font-bold text-slate-900">${(stats.recoveredAmount / 1000).toFixed(1)}k</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {activeAgents.length === 0 && (
                                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                        <p className="text-slate-500">No active agents found.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'pending' && (
                            <div className="space-y-4">
                                {pendingAgents.length === 0 && (
                                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                        <CheckCircle className="mx-auto text-slate-300 mb-2" size={32} />
                                        <p className="text-slate-500">All caught up! No pending approvals.</p>
                                    </div>
                                )}
                                {pendingAgents.map(agent => (
                                    <div key={agent.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{agent.email}</div>
                                                <div className="text-sm text-slate-500">Requesting access for: <span className="font-medium text-slate-700">{agent.agencyName}</span></div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => approveAgent(agent.id)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Approve Access
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
