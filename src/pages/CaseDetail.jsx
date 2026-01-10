import { useNavigate, useParams } from 'react-router-dom';
import { useCases } from '../context/CaseContext';
import { useAuth } from '../context/AuthContext';
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle, Clock, Download, Lightbulb, Mail, MessageSquare, Phone, Sparkles } from 'lucide-react';
import Badge from '../components/Badge';
import { clsx } from 'clsx';
import { CASE_STATUS } from '../types/schema';
import { calculateRecoveryScore, getAiRecommendation } from '../utils/aiLogic';
import AiCoachWidget from '../components/AiCoachWidget';

export default function CaseDetail() {
    const { id } = useParams();
    const { cases, addCaseNote, updateCases } = useCases();
    const { user } = useAuth();
    const navigate = useNavigate();

    const currentCase = cases.find(c => c.id === id);

    const [activityType, setActivityType] = useState('Call'); // Call, Email, WhatsApp
    const [outcome, setOutcome] = useState('No Answer');
    const [noteText, setNoteText] = useState('');
    const [disputeReason, setDisputeReason] = useState('');
    const [ptpDate, setPtpDate] = useState('');
    const [partialAmount, setPartialAmount] = useState('');
    const [loading, setLoading] = useState(false);

    // AI Insights
    const aiInsight = useMemo(() => {
        if (!currentCase) return null;
        const score = calculateRecoveryScore(currentCase);
        const rec = getAiRecommendation(score);
        return { score, ...rec };
    }, [currentCase]);

    // SOP Logic
    const canCloseCase = (currentCase?.notes?.length || 0) >= 3 || currentCase?.status === 'Paid';
    const isDispute = outcome === 'Dispute';
    const isPTP = outcome === 'PTP';

    if (!currentCase) {
        return <div className="p-8 text-center text-slate-500">Case not found.</div>;
    }

    const handleLogActivity = async (e) => {
        e.preventDefault();
        if (isDispute && !disputeReason) return; // Validation
        if (isPTP && !ptpDate) return;
        if (outcome === 'Partial' && (!partialAmount || partialAmount <= 0)) return;

        setLoading(true);

        const isPartial = outcome === 'Partial';
        let noteContent = `Logged ${activityType} - ${outcome}. ${noteText}`;

        if (isPartial) noteContent += ` [Paid: $${partialAmount.toLocaleString()}, Remaining: $${(currentCase.amount - partialAmount).toLocaleString()}]`;
        if (disputeReason) noteContent += ` [Reason: ${disputeReason}]`;
        if (ptpDate) noteContent += ` [PTP: ${ptpDate}]`;

        // 1. Add Note
        const note = {
            id: `n-${Date.now()}`,
            text: noteContent,
            type: activityType,
            outcome: outcome,
            author: user.name || user.email || 'Agent',
            date: new Date().toISOString()
        };
        await addCaseNote(currentCase.id, note);

        // 2. Update Status/Amount
        const updates = {};
        let newStatus = currentCase.status;

        if (outcome === 'Paid') newStatus = CASE_STATUS.PAID;
        else if (isPartial) {
            updates.amount = currentCase.amount - partialAmount;
            // Status remains Active/Contacted unless 0
            if (updates.amount <= 0) newStatus = CASE_STATUS.PAID;
        }
        else if (outcome === 'PTP') newStatus = CASE_STATUS.PTP;
        else if (outcome === 'Dispute') newStatus = CASE_STATUS.DISPUTE;
        else if (newStatus === CASE_STATUS.NEW && (outcome === 'Contacted' || outcome === 'No Answer')) newStatus = CASE_STATUS.CONTACTED;

        if (newStatus !== currentCase.status) updates.status = newStatus;

        if (Object.keys(updates).length > 0) {
            await updateCases([currentCase.id], updates);
        }

        setLoading(false);
        setNoteText('');
        setDisputeReason('');
        setPtpDate('');
        setPartialAmount('');
    };

    const handleCloseCase = async () => {
        // Logic to actually close/archive the case (Just setting to Paid for MVP demo if not already)
        alert("Case Closed successfully! (Demo)");
        navigate('/worklist');
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 transition-colors"
            >
                <ArrowLeft size={18} />
                <span>Back to Worklist</span>
            </button>

            {/* Header Stats */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-3 mb-1">
                        <h1 className="text-2xl font-bold text-slate-900">{currentCase.customerName}</h1>
                        <Badge variant={currentCase.status}>{currentCase.status}</Badge>
                    </div>
                    <p className="text-slate-500 text-sm">Case ID: <span className="font-mono text-slate-700">{currentCase.id}</span></p>
                </div>
                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Outstanding</p>
                        <p className="text-2xl font-bold text-slate-900">${currentCase.amount.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-slate-500 uppercase font-semibold">Win Probability</p>
                        <div className={clsx("text-2xl font-bold flex items-center justify-end", aiInsight.score > 70 ? "text-emerald-500" : aiInsight.score < 40 ? "text-red-500" : "text-yellow-500")}>
                            {aiInsight.score > 80 && <Sparkles size={20} className="mr-2" />}
                            {aiInsight.score}%
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Suggestion Banner */}
            <div className={clsx(
                "rounded-xl p-4 border flex items-start gap-4",
                aiInsight.type === 'positive' ? "bg-indigo-50 border-indigo-200" : aiInsight.type === 'negative' ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
            )}>
                <div className={clsx(
                    "p-2 rounded-lg text-white mt-1",
                    aiInsight.type === 'positive' ? "bg-indigo-500" : aiInsight.type === 'negative' ? "bg-red-500" : "bg-blue-500"
                )}>
                    <Lightbulb size={20} />
                </div>
                <div>
                    <h3 className={clsx("font-bold",
                        aiInsight.type === 'positive' ? "text-indigo-900" : aiInsight.type === 'negative' ? "text-red-900" : "text-blue-900"
                    )}>
                        AI Recommendation
                    </h3>
                    <p className={clsx("text-sm mt-1",
                        aiInsight.type === 'positive' ? "text-indigo-700" : aiInsight.type === 'negative' ? "text-red-700" : "text-blue-700"
                    )}>
                        {aiInsight.text}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN: Info & History */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer Info */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900">Customer Details</h3>
                            <button
                                onClick={() => {
                                    const content = `INVOICE #${currentCase.id}\nDate: ${new Date().toISOString().split('T')[0]}\n\nBILL TO:\n${currentCase.customerName}\n\nITEMS:\n1. Outstanding Services - $${currentCase.amount.toLocaleString()}\n2. Late Fees - $0.00\n\nTOTAL DUE: $${currentCase.amount.toLocaleString()}\n\nPlease remit payment immediately.`;
                                    const blob = new Blob([content], { type: 'text/plain' });
                                    const link = document.createElement('a');
                                    link.href = URL.createObjectURL(blob);
                                    link.download = `Invoice_${currentCase.id}.txt`;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }}
                                className="flex items-center space-x-2 text-blue-600 text-sm hover:underline"
                            >
                                <Download size={16} />
                                <span>Orig. Invoice (TXT)</span>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-slate-500">Primary Contact</p>
                                <p className="font-medium text-slate-900">John Doe (Finance)</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Phone</p>
                                <p className="font-medium text-slate-900">+1 (555) 123-4567</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Email</p>
                                <p className="font-medium text-slate-900">finance@{currentCase.customerName.split(' ')[0].toLowerCase()}.com</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Address</p>
                                <p className="font-medium text-slate-900">123 Business Park, NY</p>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-4">Activity History</h3>
                        <div className="space-y-6">
                            {currentCase.notes.map((note) => (
                                <div key={note.id} className="flex space-x-4">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                            {note.type === 'Call' ? <Phone size={14} /> : note.type === 'Email' ? <Mail size={14} /> : <MessageSquare size={14} />}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className="text-sm font-semibold text-slate-900">{note.author}</p>
                                                <span className="text-xs text-slate-400 flex items-center">
                                                    <Clock size={10} className="mr-1" />
                                                    {new Date(note.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600">{note.text}</p>
                                            {note.outcome && (
                                                <Badge className="mt-2" variant="default">{note.outcome}</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Action Console */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm sticky top-24">
                        <h3 className="font-bold text-slate-900 mb-4 flex items-center justify-between">
                            <div className="flex items-center">
                                <CheckCircle size={20} className="mr-2 text-blue-600" />
                                Action Console
                            </div>
                        </h3>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                onClick={() => window.open(`tel:${currentCase.phone || '+15550001111'}`)}
                                className="flex items-center justify-center space-x-2 py-3 bg-emerald-50 text-emerald-700 font-medium rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-100"
                            >
                                <Phone size={18} />
                                <span>Call Now</span>
                            </button>
                            <button
                                onClick={() => window.open(`mailto:${currentCase.email || 'finance@client.com'}?subject=Invoice #${currentCase.id}`)}
                                className="flex items-center justify-center space-x-2 py-3 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition-colors border border-blue-100"
                            >
                                <Mail size={18} />
                                <span>Send Email</span>
                            </button>
                        </div>

                        <form onSubmit={handleLogActivity} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase">Interaction Type</label>
                                <div className="flex items-center space-x-2 mt-2">
                                    {['Call', 'Email', 'WhatsApp'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setActivityType(t)}
                                            className={clsx(
                                                "flex-1 py-2 text-sm font-medium rounded-lg border transition-colors",
                                                activityType === t ? "bg-blue-50 border-blue-200 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase">Outcome</label>
                                <select
                                    value={outcome}
                                    onChange={(e) => setOutcome(e.target.value)}
                                    className="w-full mt-2 p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="No Answer">No Answer / VM</option>
                                    <option value="Contacted">Contacted - Discussing</option>
                                    <option value="PTP">Promise to Pay (PTP)</option>
                                    <option value="Partial">Partial Payment Received</option>
                                    <option value="Paid">Full Payment Received</option>
                                    <option value="Dispute">Dispute / Issue</option>
                                </select>
                            </div>

                            {outcome === 'Partial' && (
                                <div className="animate-fade-in-down">
                                    <label className="text-xs font-semibold text-emerald-600 uppercase">Amount Received ($)</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max={currentCase.amount}
                                        value={partialAmount}
                                        onChange={(e) => setPartialAmount(Number(e.target.value))}
                                        className="w-full mt-1 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm outline-none font-bold text-emerald-700"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Remaining Balance: <span className="font-bold">${(currentCase.amount - (partialAmount || 0)).toLocaleString()}</span></p>
                                </div>
                            )}

                            {isPTP && (
                                <div className="animate-fade-in-down">
                                    <label className="text-xs font-semibold text-emerald-600 uppercase">Promised Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={ptpDate}
                                        onChange={(e) => setPtpDate(e.target.value)}
                                        className="w-full mt-1 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm outline-none"
                                    />
                                </div>
                            )}

                            {isDispute && (
                                <div className="animate-fade-in-down">
                                    <label className="text-xs font-semibold text-red-600 uppercase">Dispute Reason (Mandatory)</label>
                                    <textarea
                                        required
                                        value={disputeReason}
                                        onChange={(e) => setDisputeReason(e.target.value)}
                                        placeholder="Client claims invoice was paid in Q3..."
                                        className="w-full mt-1 p-2.5 bg-red-50 border border-red-200 rounded-lg text-sm outline-none placeholder:text-red-300"
                                        rows={2}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase">Notes</label>
                                <textarea
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    className="w-full mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    rows={3}
                                    placeholder={activityType === 'Email' ? "Email content..." : "Add additional context..."}
                                />
                            </div>

                            <div className="flex gap-2">
                                {activityType === 'Email' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            window.open(`mailto:finance@${currentCase.customerName.toLowerCase().replace(/\s/g, '')}.com?subject=Overdue Invoice #${currentCase.id}&body=${noteText}`);
                                            // Auto-log after send? Or let user click Log.
                                            // Let's just open mail client and user manually logs.
                                        }}
                                        className="flex-1 py-2.5 bg-blue-100 text-blue-700 font-medium rounded-lg hover:bg-blue-200 transition-colors"
                                    >
                                        Send Email
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-70"
                                >
                                    {loading ? 'Logging...' : 'Log Activity'}
                                </button>
                            </div>
                        </form>

                        <div className="mt-8 pt-6 border-t border-slate-200">
                            <button
                                onClick={handleCloseCase}
                                disabled={!canCloseCase}
                                className={clsx(
                                    "w-full py-3 rounded-lg font-bold border-2 transition-all flex items-center justify-center space-x-2",
                                    canCloseCase
                                        ? "border-emerald-500 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                        : "border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50"
                                )}
                            >
                                <span>Close Case</span>
                                {!canCloseCase && <AlertTriangle size={16} />}
                            </button>
                            {!canCloseCase && (
                                <p className="text-xs text-center text-slate-400 mt-2">
                                    SOP Violation: Case cannot be closed until 3 interactions are logged or full payment is received.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                {/* AI Coach Widget - Floating */}
                <AiCoachWidget
                    caseData={{
                        amount: currentCase.amount,
                        daysOverdue: currentCase.daysOverdue,
                        riskScore: aiInsight?.score || 50
                    }}
                    historyNotes={currentCase.notes || []}
                />
            </div>
        </div>
    );
}
