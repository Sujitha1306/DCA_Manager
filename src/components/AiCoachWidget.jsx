import React, { useState } from 'react';
import { Sparkles, MessageSquare, Copy, CheckCheck, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../api/config';

const AiCoachWidget = ({ caseData, historyNotes }) => {
     const [isOpen, setIsOpen] = useState(false);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState(null);
     const [aiData, setAiData] = useState(null);
     const [copied, setCopied] = useState(false);

     const generateStrategy = async () => {
          setLoading(true);
          setError(null);
          setIsOpen(true);

          try {
               const response = await fetch(`${API_BASE_URL}/api/negotiate`, {
                    method: 'POST',
                    headers: {
                         'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ caseData, historyNotes })
               });

               if (!response.ok) {
                    throw new Error('Failed to generate strategy');
               }

               const data = await response.json();
               setAiData(data);
          } catch (err) {
               console.error("AI Error:", err);
               // Disable fallback to debug the underlying connection issue
               /*
               if (process.env.NODE_ENV === 'development') {
                    setTimeout(() => {
                         setAiData({
                              strategy: "Empathetic Firmness",
                              analysis: "Customer shows willingness but lacks immediate funds.",
                              script: "I understand this is a difficult time. However, to avoid further escalation, strictly paying $200 today would secure your account status."
                         });
                         setLoading(false);
                    }, 2000);
                    return;
               }
               */

               setError(`Failed: ${err.message}`);
          } finally {
               if (process.env.NODE_ENV !== 'development') {
                    setLoading(false);
               }
          }
     };

     const copyToClipboard = () => {
          if (aiData?.script) {
               navigator.clipboard.writeText(aiData.script);
               setCopied(true);
               setTimeout(() => setCopied(false), 2000);
          }
     };

     if (!isOpen && !loading) {
          return (
               <button
                    onClick={generateStrategy}
                    className="fixed bottom-6 right-6 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50 font-medium"
               >
                    <Sparkles className="w-5 h-5" />
                    Ask AI Coach
               </button>
          );
     }

     return (
          <div className="fixed bottom-6 right-6 w-96 bg-white/95 backdrop-blur-md border border-indigo-100 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
               {/* Header */}
               <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2 font-semibold">
                         <Sparkles className="w-5 h-5 text-yellow-300" />
                         Smart Negotiation Coach
                    </div>
                    <button
                         onClick={() => setIsOpen(false)}
                         className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-full transition-colors"
                    >
                         ×
                    </button>
               </div>

               {/* Content */}
               <div className="p-5">
                    {loading ? (
                         <div className="flex flex-col items-center justify-center py-8 space-y-3 text-gray-500">
                              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                              <p className="text-sm font-medium animate-pulse">Analyzing Case History...</p>
                         </div>
                    ) : error ? (
                         <div className="flex flex-col items-center justify-center py-6 text-red-500 space-y-2">
                              <AlertCircle className="w-8 h-8" />
                              <p className="text-sm text-center px-4">{error}</p>
                              <button
                                   onClick={generateStrategy}
                                   className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-md hover:bg-red-100 mt-2"
                              >
                                   Retry
                              </button>
                         </div>
                    ) : aiData ? (
                         <div className="space-y-4">
                              {/* Strategy Badge */}
                              <div className="flex items-center justify-between">
                                   <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Strategy</span>
                                   <span className={`px-3 py-1 rounded-full text-xs font-bold ${aiData.strategy.includes('Legal') || aiData.strategy.includes('Urgent')
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {aiData.strategy}
                                   </span>
                              </div>

                              {/* Analysis */}
                              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                   <p className="text-xs text-gray-400 font-bold mb-1">INSIGHT</p>
                                   <p className="text-sm text-gray-600 italic leading-relaxed">
                                        "{aiData.analysis}"
                                   </p>
                              </div>

                              {/* Script Box */}
                              <div className="relative group">
                                   <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg opacity-30 blur group-hover:opacity-50 transition duration-200"></div>
                                   <div className="relative bg-white p-4 rounded-lg border border-indigo-100">
                                        <div className="flex justify-between items-start mb-2">
                                             <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                                                  <MessageSquare className="w-3 h-3" />
                                                  RECOMMENDED SCRIPT
                                             </span>
                                             <button
                                                  onClick={copyToClipboard}
                                                  className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                  title="Copy to clipboard"
                                             >
                                                  {copied ? <CheckCheck className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                             </button>
                                        </div>
                                        <p className="text-sm text-gray-800 font-medium leading-relaxed">
                                             {aiData.script}
                                        </p>
                                   </div>
                              </div>
                         </div>
                    ) : null}
               </div>
          </div>
     );
};

export default AiCoachWidget;
