import { useState } from 'react';
import { ChevronDown, ArrowUpDown, Filter, Search } from 'lucide-react';
import Badge from './Badge';
import { clsx } from "clsx";

export default function DataTable({ data, onSelectionChange, onRowClick }) {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [sortConfig, setSortConfig] = useState(null);

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = new Set(data.map(d => d.id));
            setSelectedIds(allIds);
            onSelectionChange(Array.from(allIds));
        } else {
            setSelectedIds(new Set());
            onSelectionChange([]);
        }
    };

    const toggleSelectRow = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
        onSelectionChange(Array.from(newSet));
    };

    const handleSort = (key) => {
        // Basic sort implementation or callback
        // For now we just visual feedback
        setSortConfig({ key, direction: sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc' });
    };

    // Sort data if config exists
    const sortedData = [...data].sort((a, b) => {
        if (!sortConfig) return 0;
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 w-4">
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    onChange={toggleSelectAll}
                                    checked={data.length > 0 && selectedIds.size === data.length}
                                />
                            </th>
                            {[
                                { label: 'Customer', key: 'customerName' },
                                { label: 'Amount', key: 'amount' },
                                { label: 'Days Overdue', key: 'daysOverdue' },
                                { label: 'Risk Score', key: 'riskScore' },
                                { label: 'Status', key: 'status' },
                                { label: 'Assigned To', key: 'assignedAgency' },
                            ].map((col) => (
                                <th
                                    key={col.key}
                                    className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                                    onClick={() => handleSort(col.key)}
                                >
                                    <div className="flex items-center space-x-1">
                                        <span>{col.label}</span>
                                        <ArrowUpDown size={14} className="text-slate-400 group-hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedData.map((row) => (
                            <tr
                                key={row.id}
                                onClick={() => onRowClick && onRowClick(row.id)}
                                className={clsx(
                                    "hover:bg-slate-50 transition-colors cursor-pointer",
                                    selectedIds.has(row.id) ? "bg-blue-50/50" : ""
                                )}
                            >
                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        checked={selectedIds.has(row.id)}
                                        onChange={() => toggleSelectRow(row.id)}
                                    />
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900">{row.customerName}</td>
                                <td className="px-4 py-3 text-slate-700 font-mono">${row.amount.toLocaleString()}</td>
                                <td className="px-4 py-3 text-slate-700">{row.daysOverdue}d</td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={clsx("h-full rounded-full", row.riskScore > 70 ? 'bg-emerald-500' : row.riskScore > 40 ? 'bg-yellow-500' : 'bg-red-500')}
                                                style={{ width: `${row.riskScore}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-slate-500">{row.riskScore}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <Badge variant={row.status}>{row.status}</Badge>
                                </td>
                                <td className="px-4 py-3">
                                    {row.assignedAgency !== 'Unassigned' ? (
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span className="text-slate-700">{row.assignedAgency}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic">Unassigned</span>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {data.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                                    No cases match your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
