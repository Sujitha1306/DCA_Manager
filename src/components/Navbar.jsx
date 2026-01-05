import { Bell, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user } = useAuth();

    return (
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-10 px-6 flex items-center justify-between">
            <div className="flex items-center text-slate-400 bg-slate-100 px-4 py-2 rounded-lg w-96">
                <Search size={18} />
                <input
                    type="text"
                    placeholder="Search cases, invoices or agencies..."
                    className="bg-transparent border-none outline-none text-sm ml-3 w-full text-slate-700 placeholder:text-slate-400"
                />
            </div>

            <div className="flex items-center space-x-4">
                <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
                <div className="h-8 w-px bg-slate-200 mx-2"></div>
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-slate-700">{user?.role === 'admin' ? 'FedEx Corp' : 'External Agency'}</p>
                    <p className="text-xs text-slate-500">
                        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                </div>
            </div>
        </header>
    );
}
