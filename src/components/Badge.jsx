import { clsx } from "clsx";

const VARIANTS = {
    // Statuses
    'New': 'bg-slate-100 text-slate-600',
    'Contacted': 'bg-blue-100 text-blue-700',
    'PTP': 'bg-yellow-100 text-yellow-700',
    'Paid': 'bg-emerald-100 text-emerald-700',
    'Dispute': 'bg-red-100 text-red-700',

    // Risk
    'High': 'bg-red-50 text-red-600 border border-red-200',
    'Medium': 'bg-orange-50 text-orange-600 border border-orange-200',
    'Low': 'bg-green-50 text-green-600 border border-green-200',

    // Generic
    'default': 'bg-slate-100 text-slate-700'
};

export default function Badge({ children, variant = 'default', className }) {
    // If exact variant not found, use default, but check if children matches a variant key
    const style = VARIANTS[variant] || VARIANTS[children] || VARIANTS['default'];

    return (
        <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap", style, className)}>
            {children}
        </span>
    );
}
