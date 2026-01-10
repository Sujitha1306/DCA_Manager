import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Loader2, AlertCircle } from 'lucide-react';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agencyName, setAgencyName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signup(email, password, agencyName);
            // Redirect to home (which will redirect to Pending or Dashboard)
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to create an account.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-slate-50">
            {/* Left Panel - Visuals */}
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-900 relative overflow-hidden p-12 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-600 via-slate-900 to-slate-900 opacity-60"></div>
                <div className="absolute top-0 right-0 p-12 opacity-10">
                    <svg width="400" height="400" viewBox="0 0 100 100" className="animate-spin-slow">
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="10 5" />
                        <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="1" fill="none" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center space-x-2 text-orange-500 font-bold tracking-widest uppercase mb-6">
                        <UserPlus size={24} />
                        <span>Join the Network</span>
                    </div>
                    <h1 className="text-5xl font-bold leading-tight mb-6">
                        Expand Your Agency's <br /> Capability & Reach.
                    </h1>
                    <p className="text-slate-400 text-lg max-w-md">
                        Sign up to access the AI-powered Case Management portal and start recovering debt smarter.
                    </p>
                </div>

                <div className="relative z-10 space-y-4">
                    <div className="flex items-center space-x-4 text-sm text-slate-500">
                        <span>Intelligent Assignment & Analytics</span>
                        <div className="h-px bg-slate-700 flex-1"></div>
                    </div>
                </div>
            </div>

            {/* Right Panel - Signup Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-24 bg-white">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900">Create Account</h2>
                        <p className="mt-2 text-slate-500">Register your agency to get started.</p>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm flex items-center gap-2 border border-red-100">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 mt-8">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                placeholder="agent@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Password</label>
                            <input
                                type="password"
                                required
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Agency Name</label>
                            <input
                                type="text"
                                required
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                placeholder="e.g. Alpha Collections"
                                value={agencyName}
                                onChange={(e) => setAgencyName(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
                            <span>Create Account</span>
                        </button>
                    </form>

                    <div className="text-center mt-6">
                        <p className="text-sm text-slate-500">
                            Already have an account?{' '}
                            <Link to="/login" className="text-blue-600 font-bold hover:underline">
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
