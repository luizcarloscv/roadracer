import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Bike, UserPlus } from 'lucide-react';
import { db, collection, onSnapshot, query, orderBy, limit, doc, updateDoc, arrayUnion } from '@/lib/firebase';
import { useAuth } from './AuthProvider';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'ride_created' | 'ride_join';
  title: string;
  message: string;
  rideDate?: string;
  rideStatus?: string;
  createdAt: string;
  readBy: string[];
}

export const NotificationSystem: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [visibleNotifications, setVisibleNotifications] = React.useState<Notification[]>([]);
  const initialLoadedRef = React.useRef(false);

  React.useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));

      // Nunca “spammar” tudo ao logar: ignorar a primeira carga
      if (!initialLoadedRef.current) {
        initialLoadedRef.current = true;
        setNotifications(newNotifications);
        setVisibleNotifications([]);
        return;
      }

      // Apenas novas notificações adicionadas depois do login
      const added = snapshot
        .docChanges()
        .filter((c) => c.type === 'added')
        .map((c) => ({ id: c.doc.id, ...(c.doc.data() as any) } as Notification))
        .filter((n) => !n.readBy?.includes(user.uid));

      // Filtra passeios passados (só notificar se ainda vai acontecer)
      const now = new Date();
      const eligible = added.filter((n) => {
        if (n.type !== 'ride_created') return true;
        if (!n.rideDate) return false;
        const rideDate = new Date(n.rideDate);
        return rideDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
      });

      if (eligible.length > 0) {
        setVisibleNotifications((prev) => {
          const toAdd = eligible.filter((un) => !prev.some((p) => p.id === un.id));
          if (toAdd.length === 0) return prev;
          return [...toAdd, ...prev].slice(0, 3);
        });
      }
      
      setNotifications(newNotifications);
    }, (error) => {
      console.error("Error listening to notifications:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    // Optimistic UI update to close the notification immediately
    setVisibleNotifications(prev => prev.filter(n => n.id !== notificationId));

    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, {
        readBy: arrayUnion(user.uid)
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // If it fails, the onSnapshot will eventually bring it back if needed
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className="pointer-events-auto w-80 bg-neutral-900 border border-red-600/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-checkerboard opacity-20" />
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center">
                  {notification.type === 'ride_created' ? (
                    <Bike className="w-4 h-4 text-red-500" />
                  ) : (
                    <UserPlus className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <span className="text-xs font-black uppercase italic text-white tracking-tighter">
                  {notification.title}
                </span>
              </div>
              <button 
                onClick={() => markAsRead(notification.id)}
                className="text-neutral-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-neutral-300 leading-tight">
              {notification.message}
            </p>
            <div className="mt-3 flex justify-end">
              <button 
                onClick={() => markAsRead(notification.id)}
                className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
