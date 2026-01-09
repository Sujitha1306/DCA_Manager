import { useState } from 'react';
import { X, Plus, Trash2, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from "clsx";
import { useCases } from '../context/CaseContext';
import * as Papa from 'papaparse'; // We need to install papaparse for CSV

export default function AddCaseModal({ isOpen, onClose }) {
    const { addCases } = useCases();
    const [mode, setMode] = useState('manual'); // 'manual' | 'upload'
    const [loading, setLoading] = useState(false);

    // Manual Entry State
    const [rows, setRows] = useState([
        { customerName: '', amount: '', phone: '', email: '' }
    ]);

    // Upload State
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [uploadError, setUploadError] = useState(null);

    if (!isOpen) return null;

    // --- MANUAL HANDLERS ---
    const addRow = () => {
        setRows([...rows, { customerName: '', amount: '', phone: '', email: '' }]);
    };

    const removeRow = (index) => {
        setRows(rows.filter((_, i) => i !== index));
    };

    const handleRowChange = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    // --- UPLOAD HANDLERS ---
    const handleFileUpload = (e) => {
        const uploadedFile = e.target.files[0];
        setFile(uploadedFile);
        setUploadError(null);

        if (uploadedFile) {
            Papa.parse(uploadedFile, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length) {
                        setUploadError("Error parsing file. Check format.");
                    } else {
                        // Validate basic structure
                        const validData = results.data.map(d => ({
                            customerName: d.customerName || d['Customer Name'] || 'Unknown',
                            amount: d.amount || d['Amount'] || 0,
                            phone: d.phone || d['Phone'] || '',
                            email: d.email || d['Email'] || ''
                        }));
                        setParsedData(validData);
                    }
                },
                error: (err) => {
                    setUploadError("Failed to read file.");
                }
            });
        }
    };

    // --- SUBMIT ---
    const handleSubmit = async () => {
        setLoading(true);
        try {
            let casestoAdd = [];

            if (mode === 'manual') {
                casestoAdd = rows.filter(r => r.customerName && r.amount).map(r => ({
                    ...r,
                    amount: parseFloat(r.amount),
                    status: 'New',
                    assignedAgency: 'Unassigned',
                    riskScore: Math.floor(Math.random() * 100), // Placeholder risk
                    notes: []
                }));
            } else {
                casestoAdd = parsedData.map(r => ({
                    ...r,
                    amount: parseFloat(r.amount),
                    status: 'New',
                    assignedAgency: 'Unassigned',
                    riskScore: Math.floor(Math.random() * 100),
                    notes: []
                }));
            }

            if (casestoAdd.length === 0) {
                alert("No valid cases to add.");
                setLoading(false);
                return;
            }

            await addCases(casestoAdd);
            onClose();
            // Reset state
            setRows([{ customerName: '', amount: '', phone: '', email: '' }]);
            setFile(null);
            setParsedData([]);
        } catch (err) {
            console.error(err);
            alert("Failed to add cases.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Add New Cases</h2>
                        <p className="text-sm text-slate-500">Import debt cases into the allocation pool.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Mode Selection */}
                <div className="p-4 flex gap-4 border-b border-slate-100">
                    <button
                        onClick={() => setMode('manual')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                            mode === 'manual' ? "bg-blue-100 text-blue-700 ring-2 ring-blue-500/20" : "text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        <Plus size={18} />
                        Manual Entry
                    </button>
                    <button
                        onClick={() => setMode('upload')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                            mode === 'upload' ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/20" : "text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        <FileSpreadsheet size={18} />
                        Upload CSV
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-white">
                    {mode === 'manual' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                                <div className="col-span-3">Customer Name</div>
                                <div className="col-span-3">Amount ($)</div>
                                <div className="col-span-3">Phone</div>
                                <div className="col-span-2">Email</div>
                                <div className="col-span-1"></div>
                            </div>

                            {rows.map((row, index) => (
                                <div key={index} className="grid grid-cols-12 gap-4 items-center animate-fade-in-up">
                                    <div className="col-span-3">
                                        <input
                                            type="text"
                                            placeholder="John Doe"
                                            value={row.customerName}
                                            onChange={(e) => handleRowChange(index, 'customerName', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={row.amount}
                                            onChange={(e) => handleRowChange(index, 'amount', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <input
                                            type="tel"
                                            placeholder="+1..."
                                            value={row.phone}
                                            onChange={(e) => handleRowChange(index, 'phone', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="email"
                                            placeholder="email@..."
                                            value={row.email}
                                            onChange={(e) => handleRowChange(index, 'email', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        {rows.length > 1 && (
                                            <button onClick={() => removeRow(index)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <button
                                onClick={addRow}
                                className="mt-4 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                <Plus size={16} />
                                Add Another Row
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            {file ? (
                                <div className="text-center">
                                    <FileSpreadsheet size={48} className="mx-auto text-emerald-500 mb-4" />
                                    <p className="font-medium text-slate-900">{file.name}</p>
                                    <p className="text-sm text-slate-500 mt-1">{parsedData.length} records found</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Upload size={48} className="mx-auto text-slate-400 mb-4" />
                                    <p className="font-medium text-slate-900">Click or Drag to Upload CSV</p>
                                    <p className="text-sm text-slate-400 mt-1">Headers: customerName, amount, phone, email</p>
                                </div>
                            )}
                            {uploadError && (
                                <div className="mt-4 text-red-500 text-sm flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    {uploadError}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-lg font-medium text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || (mode === 'upload' && !parsedData.length) || (mode === 'manual' && !rows[0].customerName)}
                        className="px-6 py-2.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                        {loading ? 'Processing...' : 'Post Cases'}
                    </button>
                </div>
            </div>
        </div>
    );
}
