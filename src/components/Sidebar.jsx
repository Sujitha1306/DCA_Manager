import { LayoutDashboard, Briefcase, Users, BarChart3, LogOut, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const links = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'agency'] },
        { name: 'Case Pool', path: '/cases', icon: Briefcase, roles: ['admin'] },
        { name: 'My Worklist', path: '/worklist', icon: FileText, roles: ['agency'] },
        { name: 'Agencies', path: '/admin', icon: Users, roles: ['admin'] },
        { name: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['admin'] },
    ];

    const filteredLinks = links.filter(link => link.roles.includes(user?.role));

    return (
        <div className="h-screen w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800">
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                    DebtBuster AI
                </h1>
                <p className="text-xs text-slate-400 mt-1">Enterprise Recovery</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {filteredLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.path;

                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={clsx(
                                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                                isActive
                                    ? "bg-blue-600 shadow-lg shadow-blue-500/20 text-white"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <Icon size={20} />
                            <span className="font-medium">{link.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center space-x-3 px-4 py-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                        {user?.name?.[0]}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center space-x-2 p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors text-slate-400 text-sm"
                >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
}
