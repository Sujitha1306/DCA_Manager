import { useAuth } from '../context/AuthContext';
import { useCases } from '../context/CaseContext';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle, Download, FileText, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

export default function Dashboard() {
    const { user } = useAuth();
    const { cases: data } = useCases();

    // --- DATA PROCESSING FOR CHARTS ---

    // 1. Bar Chart: Recovery by Agency
    const agencyPerformance = data.reduce((acc, curr) => {
        const agency = curr.assignedAgency;
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
        acc[curr.status] = (acc[curr.status] || 0) + 1;
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
        .flatMap(c => c.notes.map(n => ({ ...n, caseId: c.id, customer: c.customerName })))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10); // Show last 10

    // --- EXPORT TO CSV ---
    const handleExport = () => {
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
                        {user?.role === 'admin' ? 'Executive Dashboard' : 'Agency Dashboard'}
                    </h1>
                    <p className="text-slate-500">Real-time performance metrics and financial recovery insights.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                    <Download size={16} />
                    <span>Export Report</span>
                </button>
            </div>

            {/* KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Overdue Debt"
                    value={`$${(data.reduce((acc, c) => acc + c.amount, 0) / 1000).toFixed(1)}k`}
                    subtext="Across all agencies"
                    color="text-red-500"
                    icon={AlertCircle}
                />
                <StatCard
                    title="Recovered (Month)"
                    value={`$${(data.filter(c => c.status === 'Paid').reduce((acc, c) => acc + c.amount, 0) / 1000).toFixed(1)}k`}
                    subtext="+12% from last month"
                    color="text-emerald-600"
                    icon={TrendingUp}
                />
                <StatCard
                    title="Active Cases"
                    value={data.length}
                    subtext="15 Unassigned"
                    color="text-blue-600"
                    icon={FileText}
                />
                <StatCard
                    title="Avg Risk Score"
                    value={Math.round(data.reduce((acc, c) => acc + c.riskScore, 0) / data.length || 0)}
                    subtext="Portfolio Health"
                    color="text-orange-500"
                    icon={Activity}
                />
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="font-bold text-slate-900 mb-4">Recovery by Agency</h3>
                    <div className="h-64">
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

                <div className="glass-card p-6 rounded-xl">
                    <h3 className="font-bold text-slate-900 mb-4">Case Status Distribution</h3>
                    <div className="h-64">
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
                    <div className="h-64">
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

                {/* Global Audit Trail */}
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center">
                        <Activity size={18} className="mr-2 text-slate-400" />
                        Global Live Feed
                    </h3>
                    <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {auditTrail.map((log, i) => (
                            <div key={i} className="flex gap-3 text-sm">
                                <div className="mt-1 min-w-[6px] h-[6px] rounded-full bg-blue-500"></div>
                                <div>
                                    <p className="text-slate-900">
                                        <span className="font-semibold">{log.author}</span> logged <span className="font-medium text-blue-600">{log.type}</span>
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
        </div>
    );
}
