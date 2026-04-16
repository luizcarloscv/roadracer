import React from 'react';
import { motion } from 'motion/react';
import { Bike, Calendar, MapPin, Clock, Plus, UserPlus, UserMinus, Trash2, CheckCircle, Pencil, Phone, AtSign } from 'lucide-react';
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
  });

  React.useEffect(() => {
    if (!user || !profile || isMocked) return;
    
    const q = query(collection(db, 'rides'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ride)));
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for rides listener.");
      } else {
        console.error("Error listening to rides:", error);
      }
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

      // Send Push Notification
      try {
        await sendPushNotification(
          '🏍️ NOVO PASSEIO!',
          `Um novo passeio para ${newRide.destination} foi criado por ${displayName}.`,
          window.location.origin
        );
      } catch (pushErr) {
        console.error("Push notification failed:", pushErr);
      }

      // Create notification for all members
      try {
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
      } catch (notifErr) {
        console.error("Internal notification failed:", notifErr);
      }

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
      });
      toast.success("Passeio criado com sucesso!");
    } catch (error) {
      console.error("Error creating ride:", error);
      toast.error("Erro ao criar passeio.");
    }
  };

  const handleUpdateRide = async () => {
    if (!editingRide || !isAdmin) return;

    try {
      await updateDoc(doc(db, 'rides', editingRide.id), {
        title: editingRide.title,
        destination: editingRide.destination,
        date: editingRide.date,
        meetingPoint: editingRide.meetingPoint,
        locationPhone: editingRide.locationPhone || '',
        instagram: editingRide.instagram || '',
        departureTime: editingRide.departureTime,
        arrivalTime: editingRide.arrivalTime,
      });
      setIsEditDialogOpen(false);
      setEditingRide(null);
      toast.success('Passeio atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating ride:', error);
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
      const participant = { 
        uid: user.uid, 
        name: displayName,
        motorcycle: motorcycleInfo
      };
      
      if (isParticipating) {
        const pToRemove = ride.participants.find((p: any) => (typeof p === 'string' ? p === user.uid : p.uid === user.uid));
        await updateDoc(rideRef, {
          participants: arrayRemove(pToRemove)
        });
        toast.success("Você saiu do passeio.");
      } else {
        await updateDoc(rideRef, {
          participants: arrayUnion(participant)
        });

        // Create notification for everyone
        try {
          await addDoc(collection(db, 'notifications'), {
            type: 'ride_join',
            title: 'Novo Integrante no Passeio!',
            message: `${displayName} entrou no passeio: ${ride.title}`,
            rideId: ride.id,
            createdAt: new Date().toISOString(),
            readBy: []
          });
        } catch (notifErr) {
          console.error("Internal notification failed:", notifErr);
        }

        toast.success("Você entrou no passeio!");
      }
    } catch (error) {
      console.error("Error toggling participation:", error);
      toast.error("Erro ao atualizar participação.");
    }
  };

  const updateStatus = async (rideId: string, status: Ride['status']) => {
    try {
      await updateDoc(doc(db, 'rides', rideId), { status });
      toast.success(`Status atualizado para ${status}`);
    } catch (error) {
      console.error("Error updating ride status:", error);
      toast.error("Erro ao atualizar status.");
    }
  };

  const deleteRide = async (rideId: string) => {
    if (!isAdmin) {
      toast.error("Apenas o Presidente ou a Diretoria podem excluir passeios.");
      return;
    }
    try {
      await deleteDoc(doc(db, 'rides', rideId));
      toast.success("Passeio excluído.");
      setRideToDelete(null);
    } catch (error) {
      console.error("Error deleting ride:", error);
      toast.error("Erro ao excluir passeio.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Bike className="text-red-500" />
          Próximos Passeios
        </h2>
        
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-red-600 hover:bg-red-700">
                <Plus className="w-4 h-4" />
                Novo Passeio
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Novo Passeio</DialogTitle>
                <DialogDescription className="text-neutral-400">
                  Preencha os detalhes do próximo destino do grupo.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title" className="text-white">Título</Label>
                  <Input id="title" value={newRide.title} onChange={e => setNewRide({...newRide, title: e.target.value})} className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="destination" className="text-white">Destino</Label>
                  <Input id="destination" value={newRide.destination} onChange={e => setNewRide({...newRide, destination: e.target.value})} className="bg-neutral-800 border-neutral-700 text-white" />
                  {newRide.destination.trim() && (
                    <div className="rounded-lg overflow-hidden border border-neutral-700">
                      <iframe
                        title="Mapa destino"
                        className="w-full h-40"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(newRide.destination)}&t=&z=14&ie=UTF8&iwloc=B&output=embed`}
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date" className="text-white">Data</Label>
                    <Input id="date" type="date" value={newRide.date} onChange={e => setNewRide({...newRide, date: e.target.value})} className="bg-neutral-800 border-neutral-700 text-white" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="meetingPoint" className="text-white">Ponto de Encontro</Label>
                    <Input id="meetingPoint" value={newRide.meetingPoint} onChange={e => setNewRide({...newRide, meetingPoint: e.target.value})} className="bg-neutral-800 border-neutral-700 text-white" />
                    {newRide.meetingPoint.trim() && (
                      <div className="rounded-lg overflow-hidden border border-neutral-700">
                        <iframe
                          title="Mapa ponto de encontro"
                          className="w-full h-40"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(newRide.meetingPoint)}&t=&z=14&ie=UTF8&iwloc=B&output=embed`}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="locationPhone" className="text-white">Telefone do Local (opcional)</Label>
                    <Input id="locationPhone" value={newRide.locationPhone} onChange={e => setNewRide({...newRide, locationPhone: e.target.value})} className="bg-neutral-800 border-neutral-700 text-white" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="instagram" className="text-white">Instagram (opcional)</Label>
                    <Input id="instagram" placeholder="@local" value={newRide.instagram} onChange={e => setNewRide({...newRide, instagram: e.target.value})} className="bg-neutral-800 border-neutral-700 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="departure" className="text-white">Concentração</Label>
                    <Input id="departure" type="time" value={newRide.departureTime} onChange={e => setNewRide({...newRide, departureTime: e.target.value})} className="bg-neutral-800 border-neutral-700 text-white" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="arrival" className="text-white">Saída</Label>
                    <Input id="arrival" type="time" value={newRide.arrivalTime} onChange={e => setNewRide({...newRide, arrivalTime: e.target.value})} className="bg-neutral-800 border-neutral-700 text-white" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white font-bold" onClick={handleCreateRide}>CRIAR PASSEIO</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {rides.map((ride) => (
          <Card key={ride.id} className="bg-neutral-900 border-neutral-800 overflow-hidden group hover:border-red-900/50 transition-all relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-checkerboard opacity-20" />
            <CardHeader className="pb-3 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant={ride.status === 'ongoing' ? 'destructive' : 'secondary'} className="mb-2 flex items-center gap-2 w-fit">
                    <img src={logoUrl} alt="Road Racer" className="w-4 h-4 rounded-full object-cover bg-white" />
                    <span>{ride.status === 'planned' ? 'Planejado' : ride.status === 'ongoing' ? 'Em andamento' : 'Concluído'}</span>
                  </Badge>
                  <CardTitle className="text-xl text-white font-black italic uppercase tracking-tight">{ride.title}</CardTitle>
                  <CardDescription
                    className="flex items-center gap-2 mt-1 text-red-500 font-bold text-xs uppercase tracking-widest cursor-pointer hover:text-red-400"
                    onClick={() => openRoute(ride.destination)}
                  >
                    <MapPin className="w-3 h-3" />
                    <span className="underline underline-offset-2">Rota para o Local: {ride.destination}</span>
                  </CardDescription>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    {ride.status === 'planned' && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:bg-green-500/10" onClick={() => updateStatus(ride.id, 'ongoing')}>
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      onClick={() => {
                        setEditingRide(ride);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-neutral-500 hover:text-red-500 hover:bg-red-500/10" 
                      onClick={() => setRideToDelete(ride.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-neutral-800 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Data</p>
                    <p className="text-white font-medium">
                      {ride.date ? format(new Date(ride.date), "dd/MM/yyyy", { locale: ptBR }) : 'Data não definida'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-neutral-800 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Horário</p>
                    <p className="text-white font-medium">Saída: {ride.arrivalTime || '--:--'} (Pontualmente)</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 bg-neutral-800 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-widest">Ponto de Encontro</p>
                    <button
                      type="button"
                      className="text-white font-medium leading-tight text-left underline underline-offset-2 hover:text-red-400"
                      onClick={() => openRoute(ride.meetingPoint)}
                    >
                      Rota para o Local: {ride.meetingPoint}
                    </button>
                  </div>
                </div>
                {(ride.locationPhone || ride.instagram) && (
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-8 h-8 bg-neutral-800 rounded-lg flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="space-y-1">
                      {ride.locationPhone && <p className="text-white font-medium leading-tight">Telefone do local: {ride.locationPhone}</p>}
                      {ride.instagram && (
                        <p className="text-white font-medium leading-tight flex items-center gap-1">
                          <AtSign className="w-3 h-3 text-red-400" />
                          {ride.instagram}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-green-500 uppercase tracking-widest">
                  <CheckCircle className="w-4 h-4" />
                  Pilotos Confirmados:
                </div>
                
                <div className="grid gap-1.5">
                  {ride.participants.map((participant: any, i) => {
                    const name = typeof participant === 'string' ? 'Membro' : participant.name;
                    const numStr = (i + 1).toString().padStart(2, '0');
                    return (
                      <div key={i} className="flex items-center gap-3 group">
                        <div className="flex gap-0.5">
                          {numStr.split('').map((digit, idx) => (
                            <div key={idx} className="w-5 h-6 bg-neutral-800 rounded flex items-center justify-center text-[11px] font-black text-blue-400 border border-neutral-700 shadow-inner">
                              {digit}
                            </div>
                          ))}
                        </div>
                        <span className="text-sm text-neutral-300 font-medium group-hover:text-white transition-colors">
                          {name}
                          {participant.motorcycle && (
                            <span className="ml-2 text-[10px] text-neutral-500 font-bold uppercase italic">
                              - {participant.motorcycle}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  
                  {/* Empty slots to match the "list" feel if few participants */}
                  {ride.participants.length < 5 && Array.from({ length: 5 - ride.participants.length }).map((_, i) => {
                    const numStr = (ride.participants.length + i + 1).toString().padStart(2, '0');
                    return (
                      <div key={`empty-${i}`} className="flex items-center gap-3 opacity-30">
                        <div className="flex gap-0.5">
                          {numStr.split('').map((digit, idx) => (
                            <div key={idx} className="w-5 h-6 bg-neutral-900 rounded flex items-center justify-center text-[11px] font-black text-neutral-600 border border-neutral-800">
                              {digit}
                            </div>
                          ))}
                        </div>
                        <div className="h-4 w-24 bg-neutral-900 rounded-full animate-pulse" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-neutral-950/50 border-t border-neutral-800 p-4">
              <Button 
                className={cn(
                  "w-full gap-2 h-12 font-bold uppercase tracking-widest text-xs rounded-xl transition-all active:scale-95",
                  ride.participants.some((p: any) => (typeof p === 'string' ? p === user?.uid : p.uid === user?.uid))
                    ? "bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700" 
                    : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20"
                )}
                onClick={() => toggleParticipation(ride)}
              >
                {ride.participants.some((p: any) => (typeof p === 'string' ? p === user?.uid : p.uid === user?.uid)) ? (
                  <><UserMinus className="w-4 h-4" /> Sair do Passeio</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Confirmar Presença</>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}

        {rides.length === 0 && (
          <div className="col-span-full py-20 text-center border border-dashed border-neutral-800 rounded-3xl text-neutral-500">
            Nenhum passeio agendado.
          </div>
        )}
      </div>

      {/* Deletion Confirmation Dialog */}
      <Dialog open={!!rideToDelete} onOpenChange={(open) => !open && setRideToDelete(null)}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Passeio?</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Esta ação não pode ser desfeita. O passeio será removido permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="ghost" onClick={() => setRideToDelete(null)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={() => rideToDelete && deleteRide(rideToDelete)}
            >
              CONFIRMAR EXCLUSÃO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Alterar Passeio</DialogTitle>
            <DialogDescription className="text-neutral-400">
              Atualize as informacoes do passeio selecionado.
            </DialogDescription>
          </DialogHeader>
          {editingRide && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-white">Título</Label>
                <Input value={editingRide.title} onChange={e => setEditingRide({ ...editingRide, title: e.target.value })} className="bg-neutral-800 border-neutral-700 text-white" />
              </div>
              <div className="grid gap-2">
                <Label className="text-white">Destino</Label>
                <Input value={editingRide.destination} onChange={e => setEditingRide({ ...editingRide, destination: e.target.value })} className="bg-neutral-800 border-neutral-700 text-white" />
                {editingRide.destination.trim() && (
                  <div className="rounded-lg overflow-hidden border border-neutral-700">
                    <iframe
                      title="Mapa destino edição"
                      className="w-full h-40"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(editingRide.destination)}&t=&z=14&ie=UTF8&iwloc=B&output=embed`}
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-white">Data</Label>
                  <Input type="date" value={editingRide.date} onChange={e => setEditingRide({ ...editingRide, date: e.target.value })} className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-white">Ponto de Encontro</Label>
                  <Input value={editingRide.meetingPoint} onChange={e => setEditingRide({ ...editingRide, meetingPoint: e.target.value })} className="bg-neutral-800 border-neutral-700 text-white" />
                  {editingRide.meetingPoint.trim() && (
                    <div className="rounded-lg overflow-hidden border border-neutral-700">
                      <iframe
                        title="Mapa encontro edição"
                        className="w-full h-40"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(editingRide.meetingPoint)}&t=&z=14&ie=UTF8&iwloc=B&output=embed`}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-white">Telefone do Local (opcional)</Label>
                  <Input value={editingRide.locationPhone || ''} onChange={e => setEditingRide({ ...editingRide, locationPhone: e.target.value })} className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-white">Instagram (opcional)</Label>
                  <Input placeholder="@local" value={editingRide.instagram || ''} onChange={e => setEditingRide({ ...editingRide, instagram: e.target.value })} className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-white">Concentração</Label>
                  <Input type="time" value={editingRide.departureTime} onChange={e => setEditingRide({ ...editingRide, departureTime: e.target.value })} className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-white">Saída</Label>
                  <Input type="time" value={editingRide.arrivalTime} onChange={e => setEditingRide({ ...editingRide, arrivalTime: e.target.value })} className="bg-neutral-800 border-neutral-700 text-white" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold" onClick={handleUpdateRide}>
              SALVAR ALTERAÇÕES
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
