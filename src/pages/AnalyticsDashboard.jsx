import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine } from 'recharts';
import { useForecastingData } from '../hooks/useForecastingData';
import { Info, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

export default function AnalyticsDashboard() {
     const { volumeForecast, agentRisk, loading } = useForecastingData();

     if (loading) {
          return (
               <div className="flex items-center justify-center h-96">
                    <Loader2 className="animate-spin text-slate-400" size={32} />
               </div>
          );
     }

     // Custom Tooltip for Area Chart
     const CustomTooltip = ({ active, payload, label }) => {
          if (active && payload && payload.length) {
               return (
                    <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
                         <p className="font-semibold text-slate-700 mb-1">{label}</p>
                         {payload.map((entry, index) => (
                              <div key={index} className="flex items-center space-x-2 text-sm">
                                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                   <span className="text-slate-600 capitalize">{entry.name === 'predictedVolume' ? 'Forecast' : 'Actual'}:</span>
                                   <span className="font-mono font-medium">{entry.value}</span>
                              </div>
                         ))}
                         {payload.some(p => p.name === 'predictedVolume') && (
                              <div className="mt-2 text-xs text-orange-600 flex items-center">
                                   <Info size={10} className="mr-1" />
                                   AI Confidence: 95%
                              </div>
                         )}
                    </div>
               );
          }
          return null;
     };

     return (
          <div className="space-y-6">
               <header className="flex justify-between items-start">
                    <div>
                         <h1 className="text-2xl font-bold text-slate-900">Executive Analytics</h1>
                         <p className="text-slate-500 mt-1">AI-driven insights and forecasting model outputs.</p>
                    </div>
                    <div className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-sm font-medium border border-indigo-100 group cursor-help relative hover:bg-indigo-100 transition-colors">
                         <TrendingUp size={16} />
                         <span>Model v1.0 Active</span>

                         {/* Tooltip */}
                         <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-slate-800 text-slate-100 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                              Powered by Random Forest Regressor.
                              <br />Updated: Today 08:00 AM
                         </div>
                    </div>
               </header>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chart 1: Workload Forecast */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                         <div className="flex items-center justify-between mb-6">
                              <h2 className="font-semibold text-slate-800">30-Day Workload Forecast</h2>
                              <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded">Area Chart</span>
                         </div>

                         <div className="h-[300px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                   <AreaChart data={volumeForecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                             <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1} />
                                                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                             </linearGradient>
                                             <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                                                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.1} />
                                                  <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                                             </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis
                                             dataKey="date"
                                             tick={{ fontSize: 12, fill: '#64748B' }}
                                             tickLine={false}
                                             axisLine={false}
                                             interval={6}
                                        />
                                        <YAxis
                                             tick={{ fontSize: 12, fill: '#64748B' }}
                                             tickLine={false}
                                             axisLine={false}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />

                                        <Area
                                             type="monotone"
                                             dataKey="actualVolume"
                                             name="Actual Volume"
                                             stroke="#4F46E5"
                                             fillOpacity={1}
                                             fill="url(#colorActual)"
                                             strokeWidth={2}
                                        />
                                        <Area
                                             type="monotone"
                                             dataKey="predictedVolume"
                                             name="Predicted Volume (AI)"
                                             stroke="#F97316"
                                             strokeDasharray="5 5"
                                             fillOpacity={1}
                                             fill="url(#colorPredicted)"
                                             strokeWidth={2}
                                        />
                                        <ReferenceLine x={volumeForecast.find(d => d.isFuture)?.date} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: 'Today', position: 'insideTopLeft', fill: '#94A3B8', fontSize: 10 }} />
                                   </AreaChart>
                              </ResponsiveContainer>
                         </div>
                    </div>

                    {/* Chart 2: Agent Performance Risk */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                         <div className="flex items-center justify-between mb-6">
                              <h2 className="font-semibold text-slate-800">Agent Performance Risk</h2>
                              <div className="flex items-center space-x-1 text-xs text-slate-500">
                                   <AlertTriangle size={12} className="text-red-500" />
                                   <span>Predicted Drop</span>
                              </div>
                         </div>

                         <div className="h-[300px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                   <BarChart data={agentRisk} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis
                                             dataKey="agentName"
                                             type="category"
                                             tick={{ fontSize: 12, fill: '#1E293B', fontWeight: 500 }}
                                             tickLine={false}
                                             axisLine={false}
                                             width={80}
                                        />
                                        <Tooltip
                                             cursor={{ fill: '#F1F5F9' }}
                                             contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />

                                        <Bar dataKey="currentRate" name="Current Recovery Rate %" fill="#CBD5E1" radius={[0, 4, 4, 0]} barSize={20} />
                                        <Bar
                                             dataKey="predictedNextWeekRate"
                                             name="Predicted Next Week %"
                                             radius={[0, 4, 4, 0]}
                                             barSize={20}
                                             shape={(props) => {
                                                  const { fill, x, y, width, height, payload } = props;
                                                  // If predicted < current, make it red (alert)
                                                  const isRisk = payload.predictedNextWeekRate < payload.currentRate;
                                                  const color = isRisk ? '#EF4444' : '#10B981';

                                                  return <rect x={x} y={y} width={width} height={height} fill={color} rx={4} ry={4} />;
                                             }}
                                        />
                                   </BarChart>
                              </ResponsiveContainer>
                         </div>
                    </div>
               </div>

               {/* KPI Summary Row */}
               <div className="grid grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
                         <span className="text-sm text-slate-500 mb-1">Projected 30-Day Volume</span>
                         <span className="text-3xl font-bold text-slate-900">4,285</span>
                         <span className="text-xs font-medium text-emerald-600 flex items-center mt-1">
                              <TrendingUp size={12} className="mr-1" /> +12% vs last month
                         </span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
                         <span className="text-sm text-slate-500 mb-1">At-Risk Agents</span>
                         <span className="text-3xl font-bold text-slate-900">{agentRisk.filter(a => a.predictedNextWeekRate < a.currentRate).length}</span>
                         <span className="text-xs font-medium text-red-600 flex items-center mt-1">
                              <AlertTriangle size={12} className="mr-1" /> Needs Attention
                         </span>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
                         <span className="text-sm text-slate-500 mb-1">Model Confidence</span>
                         <span className="text-3xl font-bold text-indigo-600">94.8%</span>
                         <span className="text-xs font-medium text-slate-400 mt-1">
                              Based on validation set
                         </span>
                    </div>
               </div>
          </div>
     );
}
