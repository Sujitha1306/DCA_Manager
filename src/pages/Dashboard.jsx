import { useAuth } from '../context/AuthContext';
import { useCases } from '../context/CaseContext';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle, Download, FileText, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

import { useState } from 'react';
export default function Dashboard() {
    const { user } = useAuth();
    const { cases: allCases } = useCases();

    // --- ROLE-BASED DATA FILTERING ---
    // Agents see ONLY their assigned cases. Admins see ALL cases.
    const data = user?.role === 'agent'
        ? allCases.filter(c => c.assignedAgentId === user?.uid)
        : allCases;

    // --- DATA PROCESSING FOR CHARTS ---

    // 1. Bar Chart: Recovery by Agency (Admin Only usually, or just relevant data)
    const agencyPerformance = data.reduce((acc, curr) => {
        const agency = curr.assignedAgency || 'Unassigned';
        if (!acc[agency]) acc[agency] = { name: agency, assigned: 0, recovered: 0 };
        acc[agency].assigned += curr.amount;
        if (curr.status === 'Paid' || curr.status === 'PTP') {
            acc[agency].recovered += curr.amount;
        }
        return acc;
    }, {});
    const barData = Object.values(agencyPerformance).filter(a => a.name !== 'Unassigned');

    // 2. Pie Chart: Status Distribution
    const statusData = data.reduce((acc, curr) => {
        const status = curr.status || 'System'; // Default to something if missing
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    const pieData = Object.keys(statusData).map(key => ({ name: key, value: statusData[key] }));
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // 3. Line Chart: Mock 30-Day Trend (Simulated)
    const trendData = Array.from({ length: 15 }).map((_, i) => ({
        day: `Day ${i + 1}`,
        recovery: Math.floor(Math.random() * 5000) + 1000
    }));

    // 4. Global Audit Trail (Flattened Notes)
    const auditTrail = data
        .flatMap(c => (c.notes || []).map(n => ({ ...n, caseId: c.id, customer: c.customerName })))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10); // Show last 10

    const [selectedLog, setSelectedLog] = useState(null);

    // --- EXPORT TO CSV ---
    const handleExport = () => {
        if (user?.role === 'admin') {
            // Admin: Full Agent Statistics Report
            // We need to aggregate stats per agent first from 'allCases'
            const agentStats = {};
            allCases.forEach(c => {
                const agentId = c.assignedAgentId || 'Unassigned';
                const agentEmail = c.assignedAgentEmail || 'Unknown'; // Assuming we have this, or just ID
                // Note: We might be missing email if not stored in Case. 
                // Let's rely on what we have. If we don't have agent name in case, grouping by ID is best effort.

                if (!agentStats[agentId]) {
                    agentStats[agentId] = {
                        id: agentId,
                        email: c.assignedAgentEmail || agentId, // Fallback
                        totalCases: 0,
                        recoveredAmount: 0,
                        calls: 0,
                        emails: 0
                    };
                }
                agentStats[agentId].totalCases += 1;
                if (c.status === 'Paid') agentStats[agentId].recoveredAmount += Number(c.amount || 0);

                // Count interactions if notes exist
                if (c.notes) {
                    agentStats[agentId].calls += c.notes.filter(n => n.type === 'Call').length;
                    agentStats[agentId].emails += c.notes.filter(n => n.type === 'Email').length;
                }
            });

            const headers = ["Agent ID", "Agent Email", "Total Cases", "Recovered Amount", "Calls Made", "Emails Sent"];
            const rows = Object.values(agentStats).map(a => [
                a.id,
                a.email,
                a.totalCases,
                a.recoveredAmount,
                a.calls,
                a.emails
            ]);

            const csvContent = "data:text/csv;charset=utf-8,"
                + headers.join(",") + "\n"
                + rows.map(e => e.join(",")).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Full_Agent_Report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } else {
            // Agent: Case Export
            const headers = ["Case ID", "Customer", "Amount", "Status", "Agency", "Risk Score"];
            const rows = data.map(c => [c.id, c.customerName, c.amount, c.status, c.assignedAgency, c.riskScore]);

            const csvContent = "data:text/csv;charset=utf-8,"
                + headers.join(",") + "\n"
                + rows.map(e => e.join(",")).join("\n");

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "dca_report_export.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const StatCard = ({ title, value, subtext, color, icon: Icon }) => (
        <div className="glass-card p-6 rounded-xl relative overflow-hidden">
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2">{value}</h3>
                    <p className={`text-xs mt-1 ${color}`}>{subtext}</p>
                </div>
                <div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('-600', '-100')} bg-opacity-20`}>
                    <Icon size={20} className={color} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {user?.role === 'admin' ? 'Executive Dashboard' : 'Agent Dashboard'}
                    </h1>
                    <p className="text-slate-500">
                        {user?.role === 'admin'
                            ? 'Real-time performance metrics and financial recovery insights.'
                            : 'Track your assigned cases and performance.'}
                    </p>
                </div>
                {user?.role === 'admin' && (
                    <button
                        onClick={handleExport}
                        className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <Download size={16} />
                        <span>Export Report</span>
                    </button>
                )}
            </div>

            {/* KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Overdue"
                    value={`$${(data.reduce((acc, c) => acc + (c.amount || 0), 0) / 1000).toFixed(1)}k`}
                    subtext={user?.role === 'admin' ? "Across all agencies" : "Your Portfolio"}
                    color="text-red-500"
                    icon={AlertCircle}
                />
                <StatCard
                    title="Recovered (Month)"
                    value={`$${(data.filter(c => c.status === 'Paid').reduce((acc, c) => acc + (c.amount || 0), 0) / 1000).toFixed(1)}k`}
                    subtext="+12% from last month"
                    color="text-emerald-600"
                    icon={TrendingUp}
                />
                <StatCard
                    title="Active Cases"
                    value={data.length}
                    subtext={user?.role === 'admin' ? "15 Unassigned" : "Assigned to you"}
                    color="text-blue-600"
                    icon={FileText}
                />

                {/* Agent: Performance Score. Admin: Nothing (as requested) */}
                {user?.role === 'agent' && (
                    <StatCard
                        title="My Performance"
                        value={`${((data.filter(c => c.status === 'Paid').reduce((acc, c) => acc + c.amount, 0) / (data.reduce((acc, c) => acc + c.amount, 0) || 1)) * 100).toFixed(0)}%`}
                        subtext="Recovery Rate"
                        color="text-purple-600"
                        icon={TrendingUp}
                    />
                )}
                {/* Admin: Show average risk score if needed, but user said REMOVE it. 
                    However, grid-cols-4 might look empty. 
                    Let's leave it empty or add a filler? 
                    User said "admin will not have the Avg Risk Score".
                    I will just render nothing for Admin in the 4th slot if that's what matches 'will not have'.
                */}
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recovery by Agency - ADMIN ONLY */}
                {user?.role === 'admin' && (
                    <div className="glass-card p-6 rounded-xl">
                        <h3 className="font-bold text-slate-900 mb-4">Recovery by Agency</h3>
                        <div className="h-64 w-full min-h-[256px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} cursor={{ fill: '#F1F5F9' }} />
                                    <Bar dataKey="assigned" name="Assigned" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="recovered" name="Recovered" fill="#10B981" radius={[4, 4, 0, 0]} />
                                    <Legend />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Case Status Distribution - Both can see (Filtered for Agent) */}
                <div className={user?.role === 'admin' ? "glass-card p-6 rounded-xl" : "glass-card p-6 rounded-xl lg:col-span-2"}>
                    <h3 className="font-bold text-slate-900 mb-4">Case Status Distribution</h3>
                    <div className="h-64 w-full min-h-[256px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* TREND + AUDIT TRAIL ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="lg:col-span-2 glass-card p-6 rounded-xl">
                    <h3 className="font-bold text-slate-900 mb-4">30-Day Recovery Trend</h3>
                    <div className="h-64 w-full min-h-[256px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="day" hide />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                                <Line type="monotone" dataKey="recovery" stroke="#3B82F6" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Global Live Feed (Filtered for Agent) */}
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                        <Activity size={18} className="mr-2 text-slate-400" />
                        {user?.role === 'admin' ? "Global Live Feed" : "Your Activity Feed"}
                    </h3>
                    <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {auditTrail.map((log, i) => (
                            <div key={i} onClick={() => setSelectedLog(log)} className="flex gap-3 text-sm cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                                <div className="mt-1 min-w-[6px] h-[6px] rounded-full bg-blue-500"></div>
                                <div>
                                    <p className="text-slate-900">
                                        <span className="font-semibold">{log.author}</span> logged <span className="font-medium text-blue-600">{log.type || 'Action'}</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {log.customer} • {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {auditTrail.length === 0 && (
                            <p className="text-slate-400 text-center py-4">No recent activity.</p>
                        )}
                    </div>
                </div>
            </div>
            {/* Log Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Activities Log Detail</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold">Log Title / Content</label>
                                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg mt-1">{selectedLog.content || selectedLog.note}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 uppercase font-bold">Agent</label>
                                    <p className="text-slate-900 font-medium">{selectedLog.author}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 uppercase font-bold">Type</label>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 mt-1">
                                        {selectedLog.type || 'Action'}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 uppercase font-bold">Related Case</label>
                                    <p className="text-slate-900">{selectedLog.customer} (#{selectedLog.caseId?.slice(0, 6)})</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 uppercase font-bold">Time</label>
                                    <p className="text-slate-900">{new Date(selectedLog.date).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
