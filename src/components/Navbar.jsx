import { Bell, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useRef, useEffect } from 'react';
import NotificationsPanel from './NotificationsPanel';

export default function Navbar() {
    const { user } = useAuth();
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
                {/* Notification Bell Wrapper */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <Bell size={20} />
                        {/* Red Dot if unread - for now just hardcoded or fetched inside panel? 
                            Ideally count should live here. For now let's just show dot if panel closed? 
                            Or strict separation. Let's keep the dot static or remove valid count fetching here would duplicate logic.
                            Let's keep it static for visual cue or simple logic later.
                        */}
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </button>

                    {showNotifications && (
                        <NotificationsPanel onClose={() => setShowNotifications(false)} />
                    )}
                </div>
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
