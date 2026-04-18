"use client";

import React from 'react';
import { Users, Shield, UserPlus, Search, Bike, Trash2, Ban, UserCheck, Plus, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { auth, db, collection, onSnapshot, query, setDoc, doc, orderBy, updateDoc, firebaseConfig, initializeApp, deleteApp, getAuth, createUserWithEmailAndPassword, signOut } from '@/lib/firebase';
import { UserProfile } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const MemberManagement: React.FC = () => {
  const { isAdmin, isMocked } = useAuth();
  const [members, setMembers] = React.useState<UserProfile[]>([]);
  const [search, setSearch] = React.useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [newMember, setNewMember] = React.useState({
    displayName: '',
    nick: '',
    email: '',
    role: 'Membro',
    phone: '',
    address: '',
    complement: '',
    neighborhood: '',
    city: '',
    bloodType: '',
    motorcycle: { make: '', model: '', year: '', color: '', plate: '' }
  });
  
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const backendUrl = (import.meta.env.VITE_BACKEND_URL && String(import.meta.env.VITE_BACKEND_URL).trim()) || 'https://roadracer-backend.onrender.com';

  React.useEffect(() => {
    if (!isAdmin || isMocked) return;
    
    const q = query(collection(db, 'users'), orderBy('displayName', 'asc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setMembers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      },
      (error) => {
        console.error("Firestore Snapshot Error:", error);
        toast.error("Erro ao carregar membros. Verifique sua conexão.");
      }
    );
    return () => unsubscribe();
  }, [isAdmin, isMocked]);

  const handleAddMember = async () => {
    if (!newMember.email || !password || !newMember.displayName) {
      toast.error("Nome, E-mail e Senha são obrigatórios.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);
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
      resetForm();
      toast.success("Membro cadastrado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar membro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewMember({
      displayName: '',
      nick: '',
      email: '',
      role: 'Membro',
      phone: '',
      address: '',
      complement: '',
      neighborhood: '',
      city: '',
      bloodType: '',
      motorcycle: { make: '', model: '', year: '', color: '', plate: '' }
    });
    setPassword('');
    setConfirmPassword('');
  };

  const deleteUser = async (uid: string) => {
    if (!window.confirm("Deseja excluir permanentemente? Isso removerá o acesso e liberará o e-mail.")) return;
    
    setIsDeleting(uid);
    const toastId = toast.loading("Processando exclusão no servidor...");
    
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const url = `${backendUrl}/delete-member`;
      
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${idToken}` 
        },
        body: JSON.stringify({ uid }),
      });

      const result = await resp.json();

      if (!resp.ok) {
        throw new Error(result.error || "Erro no servidor.");
      }
      
      toast.success(result.message || "Membro removido com sucesso!", { id: toastId });
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Falha ao excluir: " + error.message, { id: toastId });
    } finally {
      setIsDeleting(null);
    }
  };

  const toggleBlockUser = async (user: UserProfile) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { isBlocked: !user.isBlocked });
      toast.success(user.isBlocked ? "Membro Desbloqueado" : "Membro Bloqueado");
    } catch (error: any) {
      toast.error("Erro ao alterar status: " + error.message);
    }
  };

  const filteredMembers = members.filter(m => 
    m.displayName.toLowerCase().includes(search.toLowerCase()) ||
    m.nick.toLowerCase().includes(search.toLowerCase()) ||
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
          <p className="text-neutral-500 text-sm">Controle de acesso e patentes do clube.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input 
              placeholder="Buscar membro..." 
              className="bg-neutral-900 border border-neutral-800 rounded-lg h-10 pl-10 w-64 text-sm text-white outline-none focus:border-red-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button className="bg-red-600 hover:bg-red-700 font-bold" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> NOVO MEMBRO
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredMembers.map((member) => (
          <Card key={member.uid} className={cn("bg-neutral-900 border-neutral-800 transition-all", member.isBlocked && "opacity-40 grayscale")}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12 border border-neutral-700">
                  <AvatarImage src={member.photoURL} />
                  <AvatarFallback className="bg-neutral-800 text-white">{member.displayName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white">{member.displayName}</p>
                    <Badge variant="outline" className="text-[10px] border-red-900/50 text-red-500 uppercase">{member.nick}</Badge>
                  </div>
                  <p className="text-xs text-neutral-500">{member.email} • <span className="text-neutral-300 font-medium">{member.role}</span></p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn("h-9 w-9", member.isBlocked ? "text-green-500" : "text-yellow-500")}
                  onClick={() => toggleBlockUser(member)}
                >
                  {member.isBlocked ? <UserCheck className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-red-500 hover:bg-red-500/10" 
                  onClick={() => deleteUser(member.uid)}
                  disabled={isDeleting === member.uid}
                >
                  {isDeleting === member.uid ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Cadastrar Novo Membro</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid grid-cols-4 bg-neutral-950 border border-neutral-800">
              <TabsTrigger value="personal">Pessoal</TabsTrigger>
              <TabsTrigger value="address">Endereço</TabsTrigger>
              <TabsTrigger value="bike">Moto</TabsTrigger>
              <TabsTrigger value="auth">Acesso</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input value={newMember.displayName} onChange={e => setNewMember({...newMember, displayName: e.target.value})} className="bg-neutral-800 border-neutral-700" />
                </div>
                <div className="space-y-2">
                  <Label>Nick / Apelido</Label>
                  <Input value={newMember.nick} onChange={e => setNewMember({...newMember, nick: e.target.value})} className="bg-neutral-800 border-neutral-700" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} className="bg-neutral-800 border-neutral-700" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo Sanguíneo</Label>
                  <Input value={newMember.bloodType} onChange={e => setNewMember({...newMember, bloodType: e.target.value})} className="bg-neutral-800 border-neutral-700" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="address" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={newMember.address} onChange={e => setNewMember({...newMember, address: e.target.value})} className="bg-neutral-800 border-neutral-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={newMember.neighborhood} onChange={e => setNewMember({...newMember, neighborhood: e.target.value})} className="bg-neutral-800 border-neutral-700" />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={newMember.city} onChange={e => setNewMember({...newMember, city: e.target.value})} className="bg-neutral-800 border-neutral-700" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bike" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input value={newMember.motorcycle.make} onChange={e => setNewMember({...newMember, motorcycle: {...newMember.motorcycle, make: e.target.value}})} className="bg-neutral-800 border-neutral-700" />
                </div>
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Input value={newMember.motorcycle.model} onChange={e => setNewMember({...newMember, motorcycle: {...newMember.motorcycle, model: e.target.value}})} className="bg-neutral-800 border-neutral-700" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ano</Label>
                  <Input value={newMember.motorcycle.year} onChange={e => setNewMember({...newMember, motorcycle: {...newMember.motorcycle, year: e.target.value}})} className="bg-neutral-800 border-neutral-700" />
                </div>
                <div className="space-y-2">
                  <Label>Placa</Label>
                  <Input value={newMember.motorcycle.plate} onChange={e => setNewMember({...newMember, motorcycle: {...newMember.motorcycle, plate: e.target.value}})} className="bg-neutral-800 border-neutral-700" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="auth" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>E-mail de Acesso</Label>
                <Input type="email" value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})} className="bg-neutral-800 border-neutral-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-neutral-800 border-neutral-700" />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Senha</Label>
                  <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="bg-neutral-800 border-neutral-700" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Select value={newMember.role} onValueChange={v => setNewMember({...newMember, role: v})}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                    <SelectItem value="Presidente">Presidente</SelectItem>
                    <SelectItem value="Diretoria">Diretoria</SelectItem>
                    <SelectItem value="Membro">Membro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 font-bold" onClick={handleAddMember} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              CADASTRAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};