import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Bell, Check, Clock, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPanel({ onClose }) {
     const { user } = useAuth();
     const [notifications, setNotifications] = useState([]);
     const [loading, setLoading] = useState(true);
     const navigate = useNavigate();

     useEffect(() => {
          if (!user?.uid) return;

          const q = query(
               collection(db, 'notifications'),
               where('userId', '==', user.uid),
               // index check: strictly speaking we should have an index for userId + createdAt desc.
               // For now, let's sort in memory if index is missing, or try orderBy if index exists.
               // orderBy('createdAt', 'desc') 
          );

          // NOTE: If you receive a "requires an index" error, remove orderBy and sort in JS.
          // For MVP without deploying indexes manually, let's sort client-side.

          const unsubscribe = onSnapshot(q, (snapshot) => {
               const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
               // Client-side sort
               list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
               setNotifications(list);
               setLoading(false);
          });

          return () => unsubscribe();
     }, [user?.uid]);

     const handleMarkAsRead = async (id) => {
          try {
               const ref = doc(db, 'notifications', id);
               await updateDoc(ref, { read: true });
          } catch (err) {
               console.error("Error marking read:", err);
          }
     };

     const handleMarkAllRead = async () => {
          try {
               const batch = writeBatch(db);
               notifications.filter(n => !n.read).forEach((n) => {
                    const ref = doc(db, 'notifications', n.id);
                    batch.update(ref, { read: true });
               });
               await batch.commit();
          } catch (err) {
               console.error("Error mark all read:", err);
          }
     };

     const handleNotificationClick = (n) => {
          handleMarkAsRead(n.id);
          // Navigate if applicable
          if (n.type === 'assignment' || n.caseId) {
               // For assignment, we usually want to go to Worklist or specific case
               // If we had caseId on notification, we could go to /cases/:id
               if (n.caseId) navigate(`/cases/${n.caseId}`);
               else navigate('/worklist'); // Fallback
          }
     };

     const unreadCount = notifications.filter(n => !n.read).length;

     return (
          <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
               <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center">
                         <Bell size={16} className="mr-2 text-blue-600" />
                         Notifications
                         {unreadCount > 0 && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{unreadCount}</span>}
                    </h3>
                    <div className="flex items-center space-x-2">
                         {unreadCount > 0 && (
                              <button onClick={handleMarkAllRead} className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors">
                                   Mark all read
                              </button>
                         )}
                         <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                              <X size={16} />
                         </button>
                    </div>
               </div>

               <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                         <div className="p-8 text-center text-slate-400">Loading...</div>
                    ) : notifications.length === 0 ? (
                         <div className="p-8 text-center flex flex-col items-center">
                              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-2">
                                   <Bell size={20} />
                              </div>
                              <p className="text-slate-500 text-sm">No notifications yet.</p>
                         </div>
                    ) : (
                         <div className="divide-y divide-slate-100">
                              {notifications.map((n) => (
                                   <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className={clsx(
                                             "p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3",
                                             !n.read ? "bg-blue-50/50" : ""
                                        )}
                                   >
                                        <div className={clsx(
                                             "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                                             !n.read ? "bg-blue-500" : "bg-slate-200"
                                        )}></div>
                                        <div className="flex-1">
                                             <p className={clsx("text-sm", !n.read ? "font-semibold text-slate-900" : "text-slate-600")}>
                                                  {n.title}
                                             </p>
                                             <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                  {n.message}
                                             </p>
                                             <p className="text-[10px] text-slate-400 mt-2 flex items-center">
                                                  <Clock size={10} className="mr-1" />
                                                  {new Date(n.createdAt).toLocaleString()}
                                             </p>
                                        </div>
                                   </div>
                              ))}
                         </div>
                    )}
               </div>
          </div>
     );
}
