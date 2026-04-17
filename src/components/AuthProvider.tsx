import React from 'react';
import { auth, db, onAuthStateChanged, doc, getDoc, User } from '@/lib/firebase';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isMocked: boolean;
  loginMock: () => void;
  loginWithFirestore: (email: string, password: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isMocked: false,
  loginMock: () => {},
  loginWithFirestore: async () => false,
  refreshProfile: async () => {},
});

const ADMIN_EMAILS = ['luizcarloscv@gmail.com', 'luizcarloscv@msn.com', 'admin@roadracer.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isMocked, setIsMocked] = React.useState(false);

  const loginMock = () => {
    setIsMocked(true);
    setUser({ uid: 'admin-mock-id', email: 'admin@roadracer.com' } as User);
    setProfile({
      uid: 'admin-mock-id',
      displayName: 'Presidente Admin',
      nick: 'Admin',
      email: 'admin@roadracer.com',
      role: 'Presidente',
      phone: '(11) 99999-9999',
      address: 'Rua do Clube, 123',
      bloodType: 'O+',
      emergencyContacts: [{ name: 'Emergência', phone: '190' }, { name: 'Resgate', phone: '193' }],
      motorcycle: { make: 'BMW', model: 'GS 1250', year: '2023', color: 'Preta', plate: 'ROAD-2023' },
      createdAt: new Date().toISOString()
    });
    setLoading(false);
  };

  const loginWithFirestore = async (email: string, password: string): Promise<boolean> => {
    try {
      const { collection, query, where, getDocs, db, limit, createUserWithEmailAndPassword, signInWithEmailAndPassword, auth, doc, setDoc, deleteDoc } = await import('@/lib/firebase');
      const normalizedEmail = email.trim().toLowerCase();
      const q = query(
        collection(db, 'users'), 
        where('email', '==', normalizedEmail),
        limit(1)
      );
      const querySnap = await getDocs(q);
      
      if (!querySnap.empty) {
        const userData = querySnap.docs[0].data() as UserProfile;
        const oldDocId = querySnap.docs[0].id;
        const firestorePassword = (querySnap.docs[0].data() as any).password;
        if (userData.isBlocked) return false;
        if (!firestorePassword || firestorePassword !== password) return false;
        
        try {
          await signInWithEmailAndPassword(auth, normalizedEmail, password);
          return true;
        } catch (signInError: any) {
          if (['auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(signInError.code)) {
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
              const newUid = userCredential.user.uid;
              
              if (newUid !== oldDocId) {
                await setDoc(doc(db, 'users', newUid), {
                  ...userData,
                  uid: newUid,
                  email: normalizedEmail,
                });
                await deleteDoc(doc(db, 'users', oldDocId));
              } else {
                await setDoc(doc(db, 'users', newUid), {
                  ...userData,
                  uid: newUid,
                  email: normalizedEmail,
                }, { merge: true });
              }
              return true;
            } catch (createError: any) {
              if (createError.code === 'auth/email-already-in-use') {
                await signInWithEmailAndPassword(auth, normalizedEmail, password);
                return true;
              }
              console.error("Failed to create Auth user during upgrade:", createError);
            }
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Firestore login error:", error);
      return false;
    }
  };

  React.useEffect(() => {
    if (isMocked) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else if (ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
            // Fallback apenas se o documento não existir no Firestore para o admin
            setProfile({
              uid: user.uid,
              displayName: user.displayName || 'Presidente',
              nick: 'Presidente',
              email: user.email || '',
              role: 'Presidente',
              phone: '(11) 99999-9999',
              address: 'Sede do Clube',
              bloodType: 'O+',
              emergencyContacts: [{ name: 'Emergência', phone: '190' }, { name: 'Resgate', phone: '193' }],
              motorcycle: { make: 'BMW', model: 'GS 1250', year: '2023', color: 'Preta', plate: 'ROAD-2023' },
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isMocked]);

  const refreshProfile = async () => {
    if (!user || isMocked) return;
    try {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  };

  const isAdmin = React.useMemo(() => {
    if (ADMIN_EMAILS.includes((user?.email || '').toLowerCase())) return true;
    const role = profile?.role?.toLowerCase() || '';
    return ['presidente', 'diretoria', 'president', 'director', 'admin'].includes(role);
  }, [profile?.role, user?.email]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isMocked, loginMock, loginWithFirestore, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);