import { useState, useMemo } from 'react';
import { X, Download, Calendar, Mail, Phone, MessageCircle, Ban, TrendingUp, AlertCircle } from 'lucide-react';

export default function AgentDetailsModal({ agent, cases = [], onClose }) {
     const [startDate, setStartDate] = useState('');
     const [endDate, setEndDate] = useState('');

     // Filter Logs based on Date Range
     const logs = useMemo(() => {
          if (!agent || !cases.length) return [];
          let allLogs = [];

          cases.forEach(c => {
               if (c.notes) {
                    c.notes.forEach(n => {
                         allLogs.push({
                              caseId: c.id,
                              customer: c.customerName,
                              status: c.status,
                              recovered: c.status === 'Paid' ? c.amount : 0,
                              type: n.type || 'Note', // Call, Email, WhatsApp
                              content: n.content,
                              date: n.date, // ISO string expected
                              // Add 'rejected' logic if we had metadata, for now infer from type or content
                              result: n.result // If available
                         });
                    });
               }
          });

          // Filter by Date
          if (startDate || endDate) {
               const start = startDate ? new Date(startDate) : new Date(0);
               const end = endDate ? new Date(endDate) : new Date(8640000000000000);
               // Adjust end to end of day
               end.setHours(23, 59, 59, 999);

               allLogs = allLogs.filter(l => {
                    const d = new Date(l.date);
                    return d >= start && d <= end;
               });
          }

          return allLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
     }, [agent, cases, startDate, endDate]);

     // Stats
     const stats = useMemo(() => {
          return {
               calls: logs.filter(l => l.type === 'Call').length,
               emails: logs.filter(l => l.type === 'Email').length,
               whatsapp: logs.filter(l => l.type === 'WhatsApp').length,
               rejected: logs.filter(l => l.result === 'Rejected' || l.content?.toLowerCase().includes('reject')).length,
               recovered: logs.reduce((acc, l) => acc + (l.recovered || 0), 0)
          };
     }, [logs]);

     const handleDownload = () => {
          const headers = ["Case ID", "Customer", "Status", "Recovered", "Type", "Result", "Date", "Details"];
          const rows = logs.map(l => [
               l.caseId,
               l.customer,
               l.status,
               l.recovered,
               l.type,
               l.result || '-',
               new Date(l.date).toLocaleString(),
               `"${(l.content || '').replace(/"/g, '""')}"`
          ]);

          const csvContent = "data:text/csv;charset=utf-8,"
               + headers.join(",") + "\n"
               + rows.map(e => e.join(",")).join("\n");

          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `Agent_Report_${agent.email}_${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
     };

     if (!agent) return null;

     return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
               <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                         <div className="flex gap-4">
                              <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
                                   {agent.email[0].toUpperCase()}
                              </div>
                              <div>
                                   <h2 className="text-xl font-bold text-slate-900">{agent.email}</h2>
                                   <p className="text-slate-500">{agent.agencyName || 'Agency'} • {agent.role}</p>
                                   <div className="flex items-center gap-3 mt-2 text-sm">
                                        <span className="flex items-center text-emerald-600 font-medium">
                                             <TrendingUp size={14} className="mr-1" /> Score: {((agent.score || 0) * 100).toFixed(0)}%
                                        </span>
                                        <span className="text-slate-400">|</span>
                                        <span className="text-slate-600">Last Active: {new Date().toLocaleDateString()}</span>
                                   </div>
                              </div>
                         </div>
                         <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors">
                              <X size={20} />
                         </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 overflow-y-auto custom-scrollbar">
                         {/* Controls */}
                         <div className="flex flex-wrap gap-4 items-end mb-8">
                              <div>
                                   <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Start Date</label>
                                   <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                              </div>
                              <div>
                                   <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">End Date</label>
                                   <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                              </div>
                              <div className="flex-1"></div>
                              <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                                   <Download size={16} />
                                   Download CSV
                              </button>
                         </div>

                         {/* Metrics Grid */}
                         <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                   <Phone className="text-blue-500 mb-2" size={20} />
                                   <div className="text-2xl font-bold text-slate-900">{stats.calls}</div>
                                   <div className="text-xs text-slate-500">Calls Made</div>
                              </div>
                              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                   <Mail className="text-indigo-500 mb-2" size={20} />
                                   <div className="text-2xl font-bold text-slate-900">{stats.emails}</div>
                                   <div className="text-xs text-slate-500">Emails Sent</div>
                              </div>
                              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                   <MessageCircle className="text-green-500 mb-2" size={20} />
                                   <div className="text-2xl font-bold text-slate-900">{stats.whatsapp}</div>
                                   <div className="text-xs text-slate-500">WhatsApp</div>
                              </div>
                              <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                   <Ban className="text-red-500 mb-2" size={20} />
                                   <div className="text-2xl font-bold text-slate-900">{stats.rejected}</div>
                                   <div className="text-xs text-slate-500">Calls Rejected</div>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                   <TrendingUp className="text-slate-500 mb-2" size={20} />
                                   <div className="text-2xl font-bold text-slate-900">${(stats.recovered / 1000).toFixed(1)}k</div>
                                   <div className="text-xs text-slate-500">Recovered</div>
                              </div>
                         </div>

                         {/* Logs Table */}
                         <h3 className="font-bold text-slate-900 mb-4">Interaction History</h3>
                         <div className="border border-slate-200 rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                   <thead className="bg-slate-50 text-slate-500 text-left">
                                        <tr>
                                             <th className="px-4 py-3 font-medium">Date</th>
                                             <th className="px-4 py-3 font-medium">Case / Customer</th>
                                             <th className="px-4 py-3 font-medium">Type</th>
                                             <th className="px-4 py-3 font-medium">Result</th>
                                             <th className="px-4 py-3 font-medium">Details</th>
                                        </tr>
                                   </thead>
                                   <tbody className="divide-y divide-slate-100">
                                        {logs.length === 0 ? (
                                             <tr>
                                                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                                       No logs found for this period.
                                                  </td>
                                             </tr>
                                        ) : logs.map((log, i) => (
                                             <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                                       {new Date(log.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                  </td>
                                                  <td className="px-4 py-3">
                                                       <div className="font-medium text-slate-900">{log.customer}</div>
                                                       <div className="text-xs text-slate-400">#{log.caseId?.slice(0, 6)}</div>
                                                  </td>
                                                  <td className="px-4 py-3">
                                                       <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                                                          ${log.type === 'Call' ? 'bg-blue-100 text-blue-700' :
                                                                 log.type === 'Email' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}
                                                     `}>
                                                            {log.type}
                                                       </span>
                                                  </td>
                                                  <td className="px-4 py-3 text-slate-600">
                                                       {log.result || '-'}
                                                  </td>
                                                  <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={log.content}>
                                                       {log.content}
                                                  </td>
                                             </tr>
                                        ))}
                                   </tbody>
                              </table>
                         </div>
                    </div>
               </div>
          </div>
     );
}
