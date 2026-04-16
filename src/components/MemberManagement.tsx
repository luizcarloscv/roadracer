import React from 'react';
import { Users, Shield, UserPlus, Search, MoreVertical, Mail, Phone, Bike, Trash2, Ban, CheckCircle, UserCheck, Plus, Briefcase, Siren, AlertCircle } from 'lucide-react';
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

  const [newMember, setNewMember] = React.useState({
    displayName: '',
    nick: '',
    email: '',
    role: 'member' as UserRole | string,
    phone: '',
    landlinePhone: '',
    address: '',
    bloodType: '',
    emergencyContacts: [
      { name: '', phone: '' },
      { name: '', phone: '' }
    ],
    motorcycle: {
      make: '',
      model: '',
      year: '',
      color: '',
      plate: '',
    }
  });
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const backendUrl = (import.meta.env.VITE_BACKEND_URL && String(import.meta.env.VITE_BACKEND_URL).trim()) || '';

  React.useEffect(() => {
    if (!isAdmin || isMocked) return;
    
    const q = query(collection(db, 'users'), orderBy('displayName', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for members listener.");
      } else {
        console.error("Error listening to members:", error);
      }
    });
    return () => unsubscribe();
  }, [isAdmin]);

  // Fetch custom roles
  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const docRef = doc(db, 'config', 'roles');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const list = docSnap.data().list || [];
          // Ensure base roles exist
          const baseRoles = ['Presidente', 'Diretoria', 'Membro'];
          const merged = Array.from(new Set([...baseRoles, ...list]));
          if (merged.length !== list.length) {
            await setDoc(docRef, { list: merged });
          }
          setCustomRoles(merged);
        } else {
          // Default roles if none exist
          const initialRoles = ['Presidente', 'Diretoria', 'Membro', 'Batedor', 'Socorrista', 'Guincho', 'Lojista', 'Acessorios', 'PM', 'Civil', 'Federal', 'Rocam', 'Bombeiro', 'Bombeiro Civil', 'Médico', 'Personal Trainer'];
          await setDoc(docRef, { list: initialRoles });
          setCustomRoles(initialRoles);
        }
      } catch (error) {
        console.error("Error fetching roles:", error);
      }
    };
    fetchRoles();
  }, []);

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const updatedRoles = [...customRoles, newRoleName.trim()];
      await setDoc(doc(db, 'config', 'roles'), { list: updatedRoles });
      setCustomRoles(updatedRoles);
      setNewRoleName('');
      setIsAddingRole(false);
      toast.success("Nova patente adicionada!");
    } catch (error) {
      toast.error("Erro ao adicionar patente.");
    }
  };

  const removeRole = async (roleToRemove: string) => {
    try {
      const updatedRoles = customRoles.filter(r => r !== roleToRemove);
      await setDoc(doc(db, 'config', 'roles'), { list: updatedRoles });
      setCustomRoles(updatedRoles);
      toast.success("Patente removida.");
    } catch (error) {
      toast.error("Erro ao remover patente.");
    }
  };

  const [errors, setErrors] = React.useState<string[]>([]);

  const handleAddMember = async () => {
    const newErrors: string[] = [];
    
    // Personal Data Validation
    if (!newMember.displayName) newErrors.push('displayName');
    if (!newMember.nick) newErrors.push('nick');
    if (!newMember.email) newErrors.push('email');
    if (!newMember.phone) newErrors.push('phone');
    if (!newMember.address) newErrors.push('address');
    if (!newMember.bloodType) newErrors.push('bloodType');
    
    // Motorcycle Validation
    if (!newMember.motorcycle.make) newErrors.push('moto_make');
    if (!newMember.motorcycle.model) newErrors.push('moto_model');
    if (!newMember.motorcycle.year) newErrors.push('moto_year');
    if (!newMember.motorcycle.color) newErrors.push('moto_color');
    if (!newMember.motorcycle.plate) newErrors.push('moto_plate');
    
    // Emergency Contacts Validation
    newMember.emergencyContacts.forEach((c, i) => {
      if (!c.name) newErrors.push(`emergency_name_${i}`);
      if (!c.phone) newErrors.push(`emergency_phone_${i}`);
    });

    // Password Validation
    if (!password || password.length < 6) newErrors.push('password');
    if (password !== confirmPassword) newErrors.push('confirmPassword');

    setErrors(newErrors);

    if (newErrors.length > 0) {
      if (newErrors.includes('confirmPassword')) {
        toast.error("As senhas não coincidem.");
      } else if (newErrors.includes('password')) {
        toast.error("A senha deve ter pelo menos 6 caracteres.");
      } else {
        toast.error("Preencha todos os campos obrigatórios marcados em vermelho.");
      }
      return;
    }

    try {
      const normalizedEmail = newMember.email.trim().toLowerCase();
      // Create real Firebase Auth user using a secondary app instance
      // This prevents the current admin from being logged out
      const secondaryApp = initializeApp(firebaseConfig, `Secondary_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      
      let uid = "";
      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, password);
        uid = userCredential.user.uid;
        await signOut(secondaryAuth);
      } catch (authError: any) {
        // If user already exists in Auth, we'll try to use their existing UID if we can find it
        // or just show an error. For now, let's show an error if they exist.
        if (authError.code === 'auth/email-already-in-use') {
          toast.error("Este e-mail já está em uso no sistema de autenticação.");
          await deleteApp(secondaryApp);
          return;
        }
        throw authError;
      }
      
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
      setNewMember({
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
      setPassword('');
      setConfirmPassword('');
      toast.success("Membro cadastrado com sucesso!");
    } catch (error) {
      console.error("Error adding member:", error);
      toast.error("Erro ao cadastrar membro. Verifique as permissões.");
    }
  };

  const toggleBlockUser = async (user: UserProfile) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isBlocked: !user.isBlocked
      });
      toast.success(user.isBlocked ? "Usuário desbloqueado!" : "Usuário bloqueado!");
    } catch (error) {
      console.error("Error toggling block status:", error);
      toast.error("Erro ao alterar status do usuário.");
    }
  };

  const deleteUser = async (uid: string) => {
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este membro?")) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        toast.error("Você precisa estar logado como admin para excluir.");
        return;
      }

      if (!backendUrl) {
        toast.error("VITE_BACKEND_URL não configurado para exclusão completa.");
        return;
      }

      const resp = await fetch(`${backendUrl}/delete-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ uid }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || `Falha ao excluir (HTTP ${resp.status})`);
      }

      toast.success("Membro excluído com sucesso.");
    } catch (error) {
      console.error("Error deleting member:", error);
      toast.error("Erro ao excluir membro (Auth/Firestore).");
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;
    try {
      const userRef = doc(db, 'users', editingMember.uid);
      await updateDoc(userRef, {
        displayName: editingMember.displayName,
        nick: editingMember.nick,
        role: editingMember.role,
        phone: editingMember.phone,
        landlinePhone: editingMember.landlinePhone || '',
        address: editingMember.address,
        bloodType: editingMember.bloodType,
        motorcycle: editingMember.motorcycle,
        emergencyContacts: editingMember.emergencyContacts
      });
      setIsEditDialogOpen(false);
      setEditingMember(null);
      toast.success("Dados do membro atualizados!");
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Erro ao atualizar membro.");
    }
  };

  const filteredMembers = members.filter(m => 
    m.displayName.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="text-red-500" />
            Gestão do Clube
          </h2>
          <p className="text-neutral-500 text-sm">Administre membros e patentes do grupo.</p>
        </div>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="bg-neutral-900 border border-neutral-800 p-1 rounded-xl mb-6">
          <TabsTrigger value="members" className="rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            Membros
          </TabsTrigger>
          <TabsTrigger value="roles" className="rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white">
            <Briefcase className="w-4 h-4 mr-2" />
            Patentes / Profissões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <Input 
                placeholder="Buscar membro..." 
                className="pl-10 bg-neutral-900 border-neutral-800"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            {isAdmin && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-red-600 hover:bg-red-700">
                    <UserPlus className="w-4 h-4" />
                    Novo Membro
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-neutral-900 border-neutral-800 text-white !max-w-[1350px] w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden">
                  <DialogHeader className="p-6 border-b border-neutral-800">
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Cadastrar Novo Membro</DialogTitle>
                    <DialogDescription className="text-neutral-400">
                      Preencha todos os dados obrigatórios para registrar o novo integrante do motoclube.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                          <Users className="w-4 h-4 text-red-500" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Dados Pessoais</h3>
                        </div>
                        
                        <div className="grid gap-2">
                          <Label className={cn("text-xs font-bold uppercase tracking-wider", errors.includes('displayName') ? "text-red-500" : "text-neutral-400")}>Nome Completo *</Label>
                          <Input 
                            placeholder="Ex: João Silva"
                            value={newMember.displayName} 
                            onChange={e => setNewMember({...newMember, displayName: e.target.value})} 
                            className={cn("bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all", errors.includes('displayName') && "border-red-500")} 
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label className={cn("text-xs font-bold uppercase tracking-wider", errors.includes('nick') ? "text-red-500" : "text-neutral-400")}>Nick / Apelido *</Label>
                          <Input 
                            placeholder="Como será chamado no grupo"
                            value={newMember.nick} 
                            onChange={e => setNewMember({...newMember, nick: e.target.value})} 
                            className={cn("bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all", errors.includes('nick') && "border-red-500")} 
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className={cn("text-xs font-bold uppercase tracking-wider", errors.includes('email') ? "text-red-500" : "text-neutral-400")}>E-mail (Login) *</Label>
                          <Input 
                            type="email" 
                            placeholder="exemplo@email.com"
                            value={newMember.email} 
                            onChange={e => setNewMember({...newMember, email: e.target.value})} 
                            className={cn("bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all", errors.includes('email') && "border-red-500")} 
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label className={cn("text-xs font-bold uppercase tracking-wider", errors.includes('password') ? "text-red-500" : "text-neutral-400")}>Senha *</Label>
                            <Input 
                              type="password" 
                              placeholder="******"
                              value={password} 
                              onChange={e => setPassword(e.target.value)} 
                              className={cn("bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all", errors.includes('password') && "border-red-500")} 
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className={cn("text-xs font-bold uppercase tracking-wider", errors.includes('confirmPassword') ? "text-red-500" : "text-neutral-400")}>Confirmar *</Label>
                            <Input 
                              type="password" 
                              placeholder="******"
                              value={confirmPassword} 
                              onChange={e => setConfirmPassword(e.target.value)} 
                              className={cn("bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all", errors.includes('confirmPassword') && "border-red-500")} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label className={cn("text-xs font-bold uppercase tracking-wider", errors.includes('phone') ? "text-red-500" : "text-neutral-400")}>Celular *</Label>
                            <Input 
                              placeholder="(00) 00000-0000"
                              value={newMember.phone} 
                              onChange={e => setNewMember({...newMember, phone: e.target.value})} 
                              className={cn("bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all", errors.includes('phone') && "border-red-500")} 
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Fixo (opcional)</Label>
                            <Input 
                              placeholder="(00) 0000-0000"
                              value={newMember.landlinePhone} 
                              onChange={e => setNewMember({...newMember, landlinePhone: e.target.value})} 
                              className="bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all"
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label className={cn("text-xs font-bold uppercase tracking-wider", errors.includes('address') ? "text-red-500" : "text-neutral-400")}>Endereço *</Label>
                          <Input 
                            placeholder="Rua, Número, Bairro, Cidade"
                            value={newMember.address} 
                            onChange={e => setNewMember({...newMember, address: e.target.value})} 
                            className={cn("bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all", errors.includes('address') && "border-red-500")} 
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label className={cn("text-xs font-bold uppercase tracking-wider", errors.includes('bloodType') ? "text-red-500" : "text-neutral-400")}>Sangue *</Label>
                            <Select value={newMember.bloodType} onValueChange={(v) => setNewMember({...newMember, bloodType: v})}>
                              <SelectTrigger className={cn("bg-neutral-950 border-neutral-800 text-white", errors.includes('bloodType') && "border-red-500")}>
                                <SelectValue placeholder="Tipo" />
                              </SelectTrigger>
                              <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Cargo *</Label>
                            <Select value={newMember.role} onValueChange={(v) => setNewMember({...newMember, role: v})}>
                              <SelectTrigger className="bg-neutral-950 border-neutral-800 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                                {customRoles.map(role => (
                                  <SelectItem key={role} value={role}>{role}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                          <Bike className="w-4 h-4 text-red-500" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Dados da Moto</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label className={cn("text-xs font-bold uppercase tracking-wider", errors.includes('moto_make') ? "text-red-500" : "text-neutral-400")}>Marca</Label>
                            <Input 
                              placeholder="Ex: Honda"
                              value={newMember.motorcycle.make} 
                              onChange={e => setNewMember({...newMember, motorcycle: {...newMember.motorcycle, make: e.target.value}})} 
                              className={cn("bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all", errors.includes('moto_make') && "border-red-500")} 
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className={cn("text-xs font-bold uppercase tracking-wider", errors.includes('moto_model') ? "text-red-500" : "text-neutral-400")}>Modelo</Label>
                            <Input 
                              placeholder="Ex: CB 500X"
                              value={newMember.motorcycle.model} 
                              onChange={e => setNewMember({...newMember, motorcycle: {...newMember.motorcycle, model: e.target.value}})} 
                              className={cn("bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all", errors.includes('moto_model') && "border-red-500")} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label className={cn("text-xs font-bold uppercase tracking-wider", errors.includes('moto_year') ? "text-red-500" : "text-neutral-400")}>Ano</Label>
                            <Input 
                              placeholder="Ex: 2023"
                              value={newMember.motorcycle.year} 
                              onChange={e => setNewMember({...newMember, motorcycle: {...newMember.motorcycle, year: e.target.value}})} 
                              className={cn("bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all", errors.includes('moto_year') && "border-red-500")} 
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className={cn("text-xs font-bold uppercase tracking-wider", errors.includes('moto_color') ? "text-red-500" : "text-neutral-400")}>Cor</Label>
                            <Input 
                              placeholder="Ex: Vermelha"
                              value={newMember.motorcycle.color} 
                              onChange={e => setNewMember({...newMember, motorcycle: {...newMember.motorcycle, color: e.target.value}})} 
                              className={cn("bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all", errors.includes('moto_color') && "border-red-500")} 
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label className={cn("text-xs font-bold uppercase tracking-wider", errors.includes('moto_plate') ? "text-red-500" : "text-neutral-400")}>Placa</Label>
                          <Input 
                            placeholder="ABC-1234"
                            value={newMember.motorcycle.plate} 
                            onChange={e => setNewMember({...newMember, motorcycle: {...newMember.motorcycle, plate: e.target.value}})} 
                            className={cn("bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all", errors.includes('moto_plate') && "border-red-500")} 
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                          <Siren className="w-4 h-4 text-red-500" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Contatos de Emergência</h3>
                        </div>

                        {newMember.emergencyContacts.map((contact, i) => (
                          <div key={i} className={cn("space-y-4 p-4 bg-neutral-950 rounded-2xl border border-neutral-800 transition-all", (errors.includes(`emergency_name_${i}`) || errors.includes(`emergency_phone_${i}`)) && "border-red-500/50 bg-red-500/5")}>
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Contato {i + 1}</p>
                              {(errors.includes(`emergency_name_${i}`) || errors.includes(`emergency_phone_${i}`)) && <AlertCircle className="w-3 h-3 text-red-500" />}
                            </div>
                            <div className="grid gap-2">
                              <Label className={cn("text-[10px] font-bold uppercase tracking-wider", errors.includes(`emergency_name_${i}`) ? "text-red-500" : "text-neutral-500")}>Nome do Contato</Label>
                              <Input 
                                placeholder="Nome de quem avisar"
                                value={contact.name} 
                                onChange={e => {
                                  const updated = [...newMember.emergencyContacts];
                                  updated[i].name = e.target.value;
                                  setNewMember({...newMember, emergencyContacts: updated});
                                }} 
                                className={cn("h-9 bg-neutral-900 border-neutral-800 text-sm focus:border-red-500 transition-all", errors.includes(`emergency_name_${i}`) && "border-red-500")} 
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label className={cn("text-[10px] font-bold uppercase tracking-wider", errors.includes(`emergency_phone_${i}`) ? "text-red-500" : "text-neutral-500")}>Telefone do Contato</Label>
                              <Input 
                                placeholder="(00) 00000-0000"
                                value={contact.phone} 
                                onChange={e => {
                                  const updated = [...newMember.emergencyContacts];
                                  updated[i].phone = e.target.value;
                                  setNewMember({...newMember, emergencyContacts: updated});
                                }} 
                                className={cn("h-9 bg-neutral-900 border-neutral-800 text-sm focus:border-red-500 transition-all", errors.includes(`emergency_phone_${i}`) && "border-red-500")} 
                              />
                            </div>
                          </div>
                        ))}
                        
                        <div className="p-4 bg-red-600/5 border border-red-600/20 rounded-2xl">
                          <p className="text-[10px] text-red-400 font-medium leading-relaxed">
                            * Todos os campos marcados com asterisco são obrigatórios para a segurança do membro durante os passeios.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="p-6 border-t border-neutral-800 bg-neutral-950/50">
                    <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                    <Button className="bg-red-600 hover:bg-red-700" onClick={handleAddMember}>Salvar Membro</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid gap-4">
            {filteredMembers.map((member) => (
              <Card key={member.uid} className={cn("bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all relative overflow-hidden", member.isBlocked && "opacity-50 grayscale")}>
                <div className="absolute top-0 left-0 w-full h-1 bg-checkerboard opacity-20" />
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 border-2 border-neutral-800">
                      <AvatarImage src={member.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.uid}`} />
                      <AvatarFallback>{member.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white">{member.displayName}</h3>
                        {member.nick && <span className="text-xs text-red-500 font-bold">({member.nick})</span>}
                        <Badge variant={['presidente', 'president'].includes(member.role?.toLowerCase()) ? 'destructive' : ['diretoria', 'director', 'admin'].includes(member.role?.toLowerCase()) ? 'secondary' : 'outline'} className="text-[10px] uppercase h-5">
                          {['presidente', 'president', 'diretoria', 'director', 'admin'].includes(member.role?.toLowerCase()) ? <Shield className="w-3 h-3 mr-1" /> : null}
                          {member.role}
                        </Badge>
                        {member.isBlocked && <Badge variant="outline" className="text-[10px] uppercase h-5 border-red-500 text-red-500">Bloqueado</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {member.email}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> Cel: {member.phone || 'N/A'}</span>
                        {member.landlinePhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> Fixo: {member.landlinePhone}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {member.motorcycle && (
                      <div className="text-right hidden lg:block">
                        <p className="text-xs text-neutral-500 uppercase font-bold flex items-center justify-end gap-1">
                          <Bike className="w-3 h-3" /> Moto
                        </p>
                        <p className="text-sm font-medium text-neutral-200">{member.motorcycle.make} {member.motorcycle.model}</p>
                        <p className="text-[10px] text-neutral-500">{member.motorcycle.plate} • {member.motorcycle.color}</p>
                      </div>
                    )}
                    
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-neutral-500 hover:text-white">
                            <MoreVertical className="w-5 h-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-neutral-900 border-neutral-800 text-white">
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer focus:bg-neutral-800"
                            onClick={() => {
                              setEditingMember(member);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <UserPlus className="w-4 h-4 text-blue-500" />
                            Alterar Dados / Cargo
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer focus:bg-neutral-800"
                            onClick={() => toggleBlockUser(member)}
                          >
                            {member.isBlocked ? <UserCheck className="w-4 h-4 text-green-500" /> : <Ban className="w-4 h-4 text-yellow-500" />}
                            {member.isBlocked ? "Desbloquear" : "Bloquear"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="gap-2 cursor-pointer focus:bg-red-900/20 text-red-500"
                            onClick={() => deleteUser(member.uid)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir Membro
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <Card className="bg-neutral-900 border-neutral-800">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Patentes e Profissões</CardTitle>
                <CardDescription>Defina as especialidades disponíveis para os membros.</CardDescription>
              </div>
              <Button 
                onClick={() => setIsAddingRole(true)}
                className="bg-red-600 hover:bg-red-700 gap-2"
              >
                <Plus className="w-4 h-4" />
                Nova Patente
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {customRoles.map((role, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800 group">
                    <span className="text-sm font-medium text-neutral-200">{role}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-400 hover:text-red-300 bg-neutral-800 hover:bg-neutral-700 opacity-100 transition-colors"
                      onClick={() => removeRole(role)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {isAddingRole && (
                <div className="mt-6 p-4 bg-neutral-950 rounded-2xl border border-red-900/30 flex gap-3">
                  <Input 
                    placeholder="Nome da patente (ex: Batedor)" 
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    className="bg-neutral-900 border-neutral-800"
                    autoFocus
                  />
                  <Button onClick={handleAddRole} className="bg-red-600 hover:bg-red-700">Adicionar</Button>
                  <Button variant="ghost" onClick={() => setIsAddingRole(false)}>Cancelar</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white !max-w-[1350px] w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-neutral-800">
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Alterar Dados do Membro</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Atualize as informações e o cargo do integrante do motoclube.
            </DialogDescription>
          </DialogHeader>
          {editingMember && (
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                    <Users className="w-4 h-4 text-red-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Dados Pessoais</h3>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Nome Completo</Label>
                    <Input value={editingMember.displayName} onChange={e => setEditingMember({...editingMember, displayName: e.target.value})} className="bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Nick / Apelido</Label>
                    <Input value={editingMember.nick} onChange={e => setEditingMember({...editingMember, nick: e.target.value})} className="bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Cargo / Patente</Label>
                    <Select value={editingMember.role} onValueChange={(v) => setEditingMember({...editingMember, role: v})}>
                      <SelectTrigger className="bg-neutral-950 border-neutral-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                        {customRoles.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Celular</Label>
                    <Input value={editingMember.phone} onChange={e => setEditingMember({...editingMember, phone: e.target.value})} className="bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Fixo (opcional)</Label>
                    <Input value={editingMember.landlinePhone || ''} onChange={e => setEditingMember({...editingMember, landlinePhone: e.target.value})} className="bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Endereço</Label>
                    <Input value={editingMember.address} onChange={e => setEditingMember({...editingMember, address: e.target.value})} className="bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all" />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Tipo Sanguíneo</Label>
                    <Select value={editingMember.bloodType} onValueChange={(v) => setEditingMember({...editingMember, bloodType: v})}>
                      <SelectTrigger className="bg-neutral-950 border-neutral-800 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                    <Bike className="w-4 h-4 text-red-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Moto</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Marca</Label>
                      <Input value={editingMember.motorcycle.make} onChange={e => setEditingMember({...editingMember, motorcycle: {...editingMember.motorcycle, make: e.target.value}})} className="bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Modelo</Label>
                      <Input value={editingMember.motorcycle.model} onChange={e => setEditingMember({...editingMember, motorcycle: {...editingMember.motorcycle, model: e.target.value}})} className="bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Ano</Label>
                      <Input value={editingMember.motorcycle.year} onChange={e => setEditingMember({...editingMember, motorcycle: {...editingMember.motorcycle, year: e.target.value}})} className="bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Cor</Label>
                      <Input value={editingMember.motorcycle.color} onChange={e => setEditingMember({...editingMember, motorcycle: {...editingMember.motorcycle, color: e.target.value}})} className="bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Placa</Label>
                    <Input value={editingMember.motorcycle.plate} onChange={e => setEditingMember({...editingMember, motorcycle: {...editingMember.motorcycle, plate: e.target.value}})} className="bg-neutral-950 border-neutral-800 text-white focus:border-red-500 transition-all" />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                    <Siren className="w-4 h-4 text-red-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Contatos de Emergência</h3>
                  </div>
                  {editingMember.emergencyContacts.map((contact, i) => (
                    <div key={i} className="space-y-4 p-4 bg-neutral-950 rounded-2xl border border-neutral-800">
                      <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">Contato {i + 1}</p>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Nome</Label>
                        <Input 
                          value={contact.name} 
                          onChange={e => {
                            const updated = [...editingMember.emergencyContacts];
                            updated[i].name = e.target.value;
                            setEditingMember({...editingMember, emergencyContacts: updated});
                          }} 
                          className="h-9 bg-neutral-900 border-neutral-800 text-sm focus:border-red-500 transition-all" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Telefone</Label>
                        <Input 
                          value={contact.phone} 
                          onChange={e => {
                            const updated = [...editingMember.emergencyContacts];
                            updated[i].phone = e.target.value;
                            setEditingMember({...editingMember, emergencyContacts: updated});
                          }} 
                          className="h-9 bg-neutral-900 border-neutral-800 text-sm focus:border-red-500 transition-all" 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="p-6 border-t border-neutral-800 bg-neutral-950/50">
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleUpdateMember}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
