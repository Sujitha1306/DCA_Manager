import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Clock, User, Users, Shield } from 'lucide-react';

export default function ManageAgents() {
    const [pendingAgents, setPendingAgents] = useState([]);
    const [activeAgents, setActiveAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // pending | active
    const { user } = useAuth();

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
            const activeData = activeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filter out self/admin from active list if needed or keep them
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
            // Refresh lists
            fetchAgents();
        } catch (error) {
            console.error("Error approving agent:", error);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                        Agent Management
                    </h1>
                    <p className="text-slate-400">Approve and monitor agency staff</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${activeTab === 'pending' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Clock className="w-4 h-4" />
                        Pending ({pendingAgents.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${activeTab === 'active' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        <Users className="w-4 h-4" />
                        Active ({activeAgents.length})
                    </button>
                </div>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div className="text-slate-400">Loading agents...</div>
                ) : (
                    <>
                        {activeTab === 'pending' && (
                            <div className="space-y-4">
                                {pendingAgents.length === 0 && (
                                    <div className="p-8 bg-slate-800/50 rounded-xl text-center text-slate-400">
                                        No pending approvals.
                                    </div>
                                )}
                                {pendingAgents.map(agent => (
                                    <div key={agent.id} className="p-4 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-slate-700 rounded-full">
                                                <User className="w-6 h-6 text-slate-300" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{agent.email}</div>
                                                <div className="text-sm text-slate-400">Agency: {agent.agencyName || 'N/A'}</div>
                                                <div className="text-xs text-slate-500">UID: {agent.uid}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => approveAgent(agent.id)}
                                            className="px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/50 rounded-lg hover:bg-green-500/20 transition-colors flex items-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Approve Access
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'active' && (
                            <div className="space-y-4">
                                {activeAgents.map(agent => (
                                    <div key={agent.id} className="p-4 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-between opacity-75 hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-green-900/30 rounded-full">
                                                <User className="w-6 h-6 text-green-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{agent.email}</div>
                                                <div className="text-sm text-slate-400">
                                                    {agent.role === 'admin' ? <span className="text-purple-400 font-bold flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span> : agent.agencyName}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm text-slate-400">
                                            Status: Active
                                        </div>
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
