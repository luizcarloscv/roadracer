import React from 'react';
import { Users, Shield, UserPlus, Search, MoreVertical, Mail, Phone, Bike, Trash2, Ban, CheckCircle, UserCheck, Plus, Briefcase, Siren, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { auth, db, collection, onSnapshot, query, setDoc, doc, orderBy, updateDoc, getDoc, firebaseConfig, initializeApp, deleteApp, getAuth, createUserWithEmailAndPassword, signOut } from '@/lib/firebase';
import { UserProfile, UserRole } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const MemberManagement: React.FC = () => {
  const { profile, isAdmin, isMocked } = useAuth();
  const [members, setMembers] = React.useState<UserProfile[]>([]);
  const [search, setSearch] = React.useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = React.useState('members');
  const [customRoles, setCustomRoles] = React.useState<string[]>([]);
  const [newRoleName, setNewRoleName] = React.useState('');
  const [isAddingRole, setIsAddingRole] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  const [newMember, setNewMember] = React.useState({
    displayName: '',
    nick: '',
    email: '',
    role: 'Membro',
    phone: '',
    landlinePhone: '',
    address: '',
    bloodType: '',
    emergencyContacts: [{ name: '', phone: '' }, { name: '', phone: '' }],
    motorcycle: { make: '', model: '', year: '', color: '', plate: '' }
  });
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [errors, setErrors] = React.useState<string[]>([]);

  const backendUrl = (import.meta.env.VITE_BACKEND_URL && String(import.meta.env.VITE_BACKEND_URL).trim()) || '';

  React.useEffect(() => {
    if (!isAdmin || isMocked) return;
    const q = query(collection(db, 'users'), orderBy('displayName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });
    return () => unsubscribe();
  }, [isAdmin]);

  React.useEffect(() => {
    const fetchRoles = async () => {
      const docRef = doc(db, 'config', 'roles');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setCustomRoles(docSnap.data().list || []);
      }
    };
    fetchRoles();
  }, []);

  const handleAddMember = async () => {
    if (!newMember.email || !password) {
      toast.error("E-mail e senha são obrigatórios.");
      return;
    }

    try {
      const normalizedEmail = newMember.email.trim().toLowerCase();
      const secondaryApp = initializeApp(firebaseConfig, `Secondary_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
      const uid = userCredential.user.uid;
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);

      await setDoc(doc(db, 'users', uid), {
        ...newMember,
        email: normalizedEmail,
        uid: uid,
        password: password,
        isBlocked: false,
        createdAt: new Date().toISOString(),
      });
      
      setIsAddDialogOpen(false);
      toast.success("Membro cadastrado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar.");
    }
  };

  const deleteUser = async (uid: string) => {
    if (!window.confirm("Deseja excluir permanentemente? Isso liberará o e-mail para novo uso.")) return;
    
    setIsDeleting(uid);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      
      if (!backendUrl) {
        // Fallback se não houver backend: deleta apenas do Firestore
        await updateDoc(doc(db, 'users', uid), { isBlocked: true });
        toast.warning("Backend não configurado. O usuário foi apenas bloqueado no banco.");
        return;
      }

      const resp = await fetch(`${backendUrl}/delete-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ uid }),
      });

      if (!resp.ok) throw new Error("Erro no servidor de exclusão.");

      toast.success("Membro removido do Auth e do Banco!");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleBlockUser = async (user: UserProfile) => {
    await updateDoc(doc(db, 'users', user.uid), { isBlocked: !user.isBlocked });
    toast.success(user.isBlocked ? "Desbloqueado" : "Bloqueado");
  };

  const filteredMembers = members.filter(m => 
    m.displayName.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Shield className="text-red-500" />
            Gestão de Membros
          </h2>
        </div>
        <div className="flex gap-2">
          <Input 
            placeholder="Buscar..." 
            className="bg-neutral-900 border-neutral-800 w-64"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Button className="bg-red-600" onClick={() => setIsAddDialogOpen(true)}>Novo</Button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredMembers.map((member) => (
          <Card key={member.uid} className={cn("bg-neutral-900 border-neutral-800", member.isBlocked && "opacity-50")}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar><AvatarImage src={member.photoURL} /><AvatarFallback>{member.displayName[0]}</AvatarFallback></Avatar>
                <div>
                  <p className="font-bold text-white">{member.displayName} <span className="text-red-500">({member.nick})</span></p>
                  <p className="text-xs text-neutral-500">{member.email} • {member.role}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => toggleBlockUser(member)}>
                  {member.isBlocked ? <UserCheck className="text-green-500" /> : <Ban className="text-yellow-500" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500" 
                  onClick={() => deleteUser(member.uid)}
                  disabled={isDeleting === member.uid}
                >
                  {isDeleting === member.uid ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Adição Simplificado para o exemplo */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
          <DialogHeader><DialogTitle>Novo Membro</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Input placeholder="Nome" value={newMember.displayName} onChange={e => setNewMember({...newMember, displayName: e.target.value})} className="bg-neutral-800 border-neutral-700" />
            <Input placeholder="E-mail" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} className="bg-neutral-800 border-neutral-700" />
            <Input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} className="bg-neutral-800 border-neutral-700" />
          </div>
          <DialogFooter>
            <Button onClick={handleAddMember} className="bg-red-600">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};