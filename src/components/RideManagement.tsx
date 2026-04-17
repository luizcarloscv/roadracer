import React from 'react';
import { motion } from 'motion/react';
import { Bike, Calendar, MapPin, Clock, Plus, UserPlus, UserMinus, Trash2, CheckCircle, Pencil, Phone, AtSign, Coffee, Flag, Zap, Users } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { db, collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc } from '@/lib/firebase';
import { Ride } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { sendPushNotification } from '@/services/notificationService';

export const RideManagement: React.FC = () => {
  const { profile, user, isAdmin, isMocked } = useAuth();
  const [rides, setRides] = React.useState<Ride[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [rideToDelete, setRideToDelete] = React.useState<string | null>(null);
  const [editingRide, setEditingRide] = React.useState<Ride | null>(null);
  const [logoUrl, setLogoUrl] = React.useState('/attachment/39ba9f98-0228-483e-9e90-efedb5f73770?v=6');
  const [newRide, setNewRide] = React.useState({
    title: '',
    destination: '',
    date: '',
    meetingPoint: '',
    locationPhone: '',
    instagram: '',
    departureTime: '',
    arrivalTime: '',
    breakfast: '',
  });

  React.useEffect(() => {
    if (!user || !profile || isMocked) return;
    
    const q = query(collection(db, 'rides'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride)));
    }, (error) => {
      console.error("Error listening to rides:", error);
    });
    return () => unsubscribe();
  }, [user, profile]);

  React.useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'app'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().logoUrl) {
        setLogoUrl(docSnap.data().logoUrl);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCreateRide = async () => {
    if (!user || !profile) return;
    try {
      const displayName = profile.nick || profile.displayName;
      const rideData = {
        ...newRide,
        createdBy: user.uid,
        createdByName: displayName,
        participants: [{ 
          uid: user.uid, 
          name: displayName,
          motorcycle: profile.motorcycle ? `${profile.motorcycle.make} ${profile.motorcycle.model}` : 'Sem Moto'
        }],
        status: 'planned',
        createdAt: new Date().toISOString(),
      };
      
      const rideRef = await addDoc(collection(db, 'rides'), rideData);

      await sendPushNotification(
        '🏍️ NOVO PASSEIO!',
        `Destino: ${newRide.destination}. Criado por ${displayName}.`,
        window.location.origin
      );

      await addDoc(collection(db, 'notifications'), {
        type: 'ride_created',
        title: 'Novo Passeio!',
        message: `Um novo passeio para ${newRide.destination} foi criado por ${displayName}.`,
        rideId: rideRef.id,
        rideDate: newRide.date,
        rideStatus: 'planned',
        createdAt: new Date().toISOString(),
        readBy: []
      });

      setIsDialogOpen(false);
      setNewRide({
        title: '',
        destination: '',
        date: '',
        meetingPoint: '',
        locationPhone: '',
        instagram: '',
        departureTime: '',
        arrivalTime: '',
        breakfast: '',
      });
      toast.success("Passeio criado e membros notificados!");
    } catch (error) {
      console.error("Error creating ride:", error);
      toast.error("Erro ao criar passeio.");
    }
  };

  const handleUpdateRide = async () => {
    if (!editingRide || !isAdmin) return;
    try {
      await updateDoc(doc(db, 'rides', editingRide.id), { ...editingRide });
      setIsEditDialogOpen(false);
      setEditingRide(null);
      toast.success('Passeio atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar passeio.');
    }
  };

  const openRoute = (target: string) => {
    if (!target?.trim()) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}&travelmode=driving`, '_blank');
  };

  const toggleParticipation = async (ride: Ride) => {
    if (!user || !profile) return;
    const isParticipating = ride.participants.some((p: any) => (typeof p === 'string' ? p === user.uid : p.uid === user.uid));
    try {
      const rideRef = doc(db, 'rides', ride.id);
      const displayName = profile.nick || profile.displayName;
      const motorcycleInfo = profile.motorcycle ? `${profile.motorcycle.make} ${profile.motorcycle.model}` : 'Sem Moto';
      const participant = { uid: user.uid, name: displayName, motorcycle: motorcycleInfo };
      
      if (isParticipating) {
        const pToRemove = ride.participants.find((p: any) => (typeof p === 'string' ? p === user.uid : p.uid === user.uid));
        await updateDoc(rideRef, { participants: arrayRemove(pToRemove) });
        toast.success("Você saiu do passeio.");
      } else {
        await updateDoc(rideRef, { participants: arrayUnion(participant) });
        toast.success("Presença confirmada!");
      }
    } catch (error) {
      toast.error("Erro ao atualizar participação.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
          <Bike className="text-red-600 w-8 h-8" />
          Próximos Rolês
        </h2>
        
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-red-600 hover:bg-red-700 font-black italic uppercase tracking-tighter h-12 px-6 shadow-lg shadow-red-600/20">
                <Plus className="w-5 h-5" />
                Novo Passeio
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Criar Novo Passeio</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Título do Rolê (Ex: Rolê de Domingo)</Label>
                  <Input value={newRide.title} onChange={e => setNewRide({...newRide, title: e.target.value})} className="bg-neutral-800 border-neutral-700" />
                </div>
                <div className="grid gap-2">
                  <Label>Destino Final</Label>
                  <Input value={newRide.destination} onChange={e => setNewRide({...newRide, destination: e.target.value})} className="bg-neutral-800 border-neutral-700" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Data</Label>
                    <Input type="date" value={newRide.date} onChange={e => setNewRide({...newRide, date: e.target.value})} className="bg-neutral-800 border-neutral-700" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Ponto de Encontro</Label>
                    <Input value={newRide.meetingPoint} onChange={e => setNewRide({...newRide, meetingPoint: e.target.value})} className="bg-neutral-800 border-neutral-700" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Concentração</Label>
                    <Input type="time" value={newRide.departureTime} onChange={e => setNewRide({...newRide, departureTime: e.target.value})} className="bg-neutral-800 border-neutral-700" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Saída Pontual</Label>
                    <Input type="time" value={newRide.arrivalTime} onChange={e => setNewRide({...newRide, arrivalTime: e.target.value})} className="bg-neutral-800 border-neutral-700" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Café da Manhã (Opcional)</Label>
                  <Input value={newRide.breakfast} onChange={e => setNewRide({...newRide, breakfast: e.target.value})} className="bg-neutral-800 border-neutral-700" placeholder="Ex: Restaurante Biu Rico" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Telefone Local</Label>
                    <Input value={newRide.locationPhone} onChange={e => setNewRide({...newRide, locationPhone: e.target.value})} className="bg-neutral-800 border-neutral-700" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Instagram</Label>
                    <Input value={newRide.instagram} onChange={e => setNewRide({...newRide, instagram: e.target.value})} className="bg-neutral-800 border-neutral-700" placeholder="@local" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button className="bg-red-600 hover:bg-red-700 font-bold" onClick={handleCreateRide}>CRIAR E NOTIFICAR</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {rides.map((ride) => (
          <Card key={ride.id} className="bg-gradient-to-b from-orange-600 to-orange-900 border-none overflow-hidden shadow-2xl relative group">
            <div className="absolute inset-0 bg-checkerboard opacity-10 pointer-events-none" />
            
            <CardHeader className="pb-2 relative z-10">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8 border border-white/20">
                    <AvatarImage src={logoUrl} />
                    <AvatarFallback>RR</AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] font-black uppercase text-white/80 tracking-widest">Road Racer MC</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" onClick={() => { setEditingRide(ride); setIsEditDialogOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-red-500" onClick={() => setRideToDelete(ride.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="text-center mt-4 space-y-1">
                <h3 className="text-4xl font-black italic uppercase tracking-tighter text-white drop-shadow-lg">{ride.title}</h3>
                <p className="text-red-200 font-bold uppercase tracking-[0.3em] text-[10px]">Bate e Volta Confirmado</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 relative z-10 px-8 py-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-white">
                  <Calendar className="w-6 h-6 shrink-0" />
                  <span className="text-lg font-bold">{ride.date ? format(new Date(ride.date), "dd/MM/yyyy", { locale: ptBR }) : '--/--/----'}</span>
                </div>

                <div className="flex items-start gap-4 text-white cursor-pointer hover:text-orange-200 transition-colors" onClick={() => openRoute(ride.meetingPoint)}>
                  <MapPin className="w-6 h-6 shrink-0 mt-1" />
                  <span className="text-sm font-medium leading-tight uppercase tracking-tight">{ride.meetingPoint}</span>
                </div>

                <div className="flex items-center gap-4 text-white">
                  <Zap className="w-6 h-6 shrink-0" />
                  <span className="text-sm font-bold uppercase tracking-tighter">CONCENTRAÇÃO: <span className="text-xl ml-2">{ride.departureTime || '--:--'}h</span></span>
                </div>

                <div className="flex items-center gap-4 text-white">
                  <Clock className="w-6 h-6 shrink-0" />
                  <span className="text-sm font-bold uppercase tracking-tighter">SAÍDA: <span className="text-xl ml-2">{ride.arrivalTime || '--:--'}h</span> <span className="text-[10px] ml-2 opacity-70">(PONTUALMENTE)</span></span>
                </div>

                {ride.breakfast && (
                  <div className="flex items-center gap-4 text-white">
                    <Coffee className="w-6 h-6 shrink-0" />
                    <span className="text-sm font-bold uppercase tracking-tighter">CAFÉ DA MANHÃ: <span className="ml-2">{ride.breakfast}</span></span>
                  </div>
                )}

                <div className="flex items-center gap-4 text-white">
                  <Flag className="w-6 h-6 shrink-0" />
                  <span className="text-sm font-bold uppercase tracking-tighter">DESTINO: <span className="text-xl ml-2">{ride.destination}</span></span>
                </div>
              </div>

              <div className="pt-6 border-t border-white/20">
                <div className="flex items-center gap-2 text-white/90 text-xs font-black uppercase tracking-widest mb-4">
                  <Users className="w-4 h-4" />
                  Pilotos Confirmados ({ride.participants.length})
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {ride.participants.slice(0, 5).map((p: any, i) => (
                    <div key={i} className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/5">
                      <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-[10px] font-black text-white">{(i+1).toString().padStart(2, '0')}</div>
                      <span className="text-xs font-bold text-white uppercase">{typeof p === 'string' ? 'Membro' : p.name}</span>
                      {p.motorcycle && <span className="text-[9px] text-white/50 italic ml-auto">{p.motorcycle}</span>}
                    </div>
                  ))}
                  {ride.participants.length > 5 && <p className="text-[10px] text-white/60 text-center font-bold">+ {ride.participants.length - 5} OUTROS PILOTOS</p>}
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-6 pt-0 relative z-10">
              <Button 
                className={cn(
                  "w-full h-14 font-black italic uppercase tracking-tighter text-lg rounded-2xl transition-all active:scale-95 shadow-2xl",
                  ride.participants.some((p: any) => (typeof p === 'string' ? p === user?.uid : p.uid === user?.uid))
                    ? "bg-white text-orange-700 hover:bg-white/90" 
                    : "bg-black text-white hover:bg-black/80 animate-pulse"
                )}
                onClick={() => toggleParticipation(ride)}
              >
                {ride.participants.some((p: any) => (typeof p === 'string' ? p === user?.uid : p.uid === user?.uid)) ? (
                  <><UserMinus className="w-6 h-6 mr-2" /> SAIR DO ROLÊ</>
                ) : (
                  <><UserPlus className="w-6 h-6 mr-2" /> CONFIRMAR PRESENÇA</>
                )}
              </Button>
            </CardFooter>

            <div className="absolute bottom-4 right-4 opacity-20 pointer-events-none">
              <img src={logoUrl} alt="Logo" className="w-24 h-24 grayscale brightness-200" />
            </div>
          </Card>
        ))}
      </div>

      {/* Dialogs de Edição e Exclusão mantidos com as correções de campos */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Passeio</DialogTitle></DialogHeader>
          {editingRide && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Título</Label>
                <Input value={editingRide.title} onChange={e => setEditingRide({ ...editingRide, title: e.target.value })} className="bg-neutral-800 border-neutral-700" />
              </div>
              <div className="grid gap-2">
                <Label>Destino</Label>
                <Input value={editingRide.destination} onChange={e => setEditingRide({ ...editingRide, destination: e.target.value })} className="bg-neutral-800 border-neutral-700" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Data</Label>
                  <Input type="date" value={editingRide.date} onChange={e => setEditingRide({ ...editingRide, date: e.target.value })} className="bg-neutral-800 border-neutral-700" />
                </div>
                <div className="grid gap-2">
                  <Label>Ponto de Encontro</Label>
                  <Input value={editingRide.meetingPoint} onChange={e => setEditingRide({ ...editingRide, meetingPoint: e.target.value })} className="bg-neutral-800 border-neutral-700" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Café da Manhã</Label>
                <Input value={(editingRide as any).breakfast || ''} onChange={e => setEditingRide({ ...editingRide, breakfast: e.target.value } as any)} className="bg-neutral-800 border-neutral-700" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleUpdateRide}>SALVAR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rideToDelete} onOpenChange={(open) => !open && setRideToDelete(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-sm">
          <DialogHeader><DialogTitle>Excluir Passeio?</DialogTitle></DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="ghost" onClick={() => setRideToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => rideToDelete && deleteRide(rideToDelete)}>EXCLUIR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};