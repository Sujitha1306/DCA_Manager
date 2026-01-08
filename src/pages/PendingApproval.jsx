import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';

export default function PendingApproval() {
    const { logout } = useAuth();

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-100">
            <div className="w-full max-w-md p-8 text-center space-y-6 bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
                <div className="inline-flex p-4 rounded-full bg-yellow-500/10 text-yellow-500 ring-1 ring-yellow-500/50 animate-pulse">
                    <ShieldAlert className="w-12 h-12" />
                </div>

                <h1 className="text-2xl font-bold text-white">
                    Account Pending Approval
                </h1>

                <div className="text-slate-400 space-y-2">
                    <p>Thank you for registering.</p>
                    <p>
                        Your account is currently under review by the administrators.
                        You will not be able to access the dashboard until your status is activated.
                    </p>
                </div>

                <div className="pt-4">
                    <button
                        onClick={logout}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}
