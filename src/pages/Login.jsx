import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Loader2, Users } from 'lucide-react';
import { clsx } from 'clsx';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loadingRole, setLoadingRole] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleLogin = async () => {
        setLoadingRole('processing');
        setError(null);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            console.error(err);
            setError("Invalid email or password.");
            setLoadingRole(null);
        }
    };

    return (
        <div className="flex h-screen w-full bg-slate-50">
            {/* Left Panel - Visuals */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-900 relative overflow-hidden p-12 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600 via-slate-900 to-slate-900 opacity-60"></div>
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <svg width="400" height="400" viewBox="0 0 100 100" className="animate-spin-slow">
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="10 5" />
                        <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center space-x-2 text-blue-400 font-bold tracking-widest uppercase mb-6">
                        <ShieldCheck size={24} />
                        <span>Project Debt-Buster</span>
                    </div>
                    <h1 className="text-5xl font-bold leading-tight mb-6">
                        Intelligent Debt Recovery <br /> for the Modern Enterprise.
                    </h1>
                    <p className="text-slate-400 text-lg max-w-md">
                        Consolidate your collections, empower your agencies, and recover revenue faster with our AI-driven platform.
                    </p>
                </div>

                <div className="relative z-10 space-y-4">
                    <div className="flex items-center space-x-4 text-sm text-slate-500">
                        <span>Trusted by High-Volume Enterprises</span>
                        <div className="h-px bg-slate-700 flex-1"></div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
                        <p className="mt-2 text-slate-500">Please select your portal to continue.</p>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4 mt-8">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loadingRole !== null}
                            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loadingRole ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
                            <span>Sign In to Portal</span>
                        </button>
                    </form>

                    <div className="text-center pt-8">
                        <p className="text-xs text-slate-400">
                            By accessing this system, you agree to our compliance & security policies.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
