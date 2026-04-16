import React from 'react';
import { useAuth } from './AuthProvider';
import { db, doc, updateDoc, storage, ref, uploadBytes, getDownloadURL, updatePassword } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { User, Phone, Smile, Upload, Loader2, Camera, Lock, Bike, Droplets, Trash2, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageEditor } from './ImageEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ProfileSettingsProps {
  onClose: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ onClose }) => {
  const { profile, user, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = React.useState(profile?.displayName || '');
  const [phone, setPhone] = React.useState(profile?.phone || '');
  const [bloodType, setBloodType] = React.useState(profile?.bloodType || '');
  const [motorcycle, setMotorcycle] = React.useState(profile?.motorcycle || {
    make: '',
    model: '',
    year: '',
    color: '',
    plate: '',
  });
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [imageToCrop, setImageToCrop] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName || '');
    setPhone(profile.phone || '');
    setBloodType(profile.bloodType || '');
    setMotorcycle(
      profile.motorcycle || {
        make: '',
        model: '',
        year: '',
        color: '',
        plate: '',
      },
    );
  }, [profile?.uid]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validation
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
    };
    reader.onerror = () => {
      console.error("FileReader error");
      toast.error("Erro ao carregar imagem.");
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = async () => {
    if (!user) return;
    
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setIsLoading(true);
    try {
      // Update Firestore profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName,
        phone,
        bloodType,
        motorcycle,
      });

      // Update password if provided
      if (newPassword) {
        await updatePassword(user, newPassword);
        toast.success("Senha atualizada com sucesso!");
      }

      await refreshProfile();
      toast.success("Perfil atualizado com sucesso!");
      onClose();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error("Para trocar a senha, você precisa ter feito login recentemente. Por favor, saia e entre novamente.");
      } else {
        toast.error("Erro ao atualizar perfil.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMotorcycle = () => {
    if (!window.confirm("Tem certeza que deseja remover os dados da moto?")) return;
    
    setMotorcycle({
      make: '',
      model: '',
      year: '',
      color: '',
      plate: '',
    });
    toast.info("Dados da moto limpos. Salve para confirmar.");
  };

  return (
    <div className="space-y-6 py-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-checkerboard opacity-20" />
      <DialogHeader className="relative z-10 px-6">
        <DialogTitle className="text-white text-2xl font-black italic uppercase tracking-tighter">Configurações de Perfil</DialogTitle>
        <DialogDescription className="text-neutral-400">
          Mantenha seus dados atualizados para sua segurança e do grupo.
        </DialogDescription>
      </DialogHeader>

      <div className="px-6 relative z-10">
        {imageToCrop ? (
          <div className="py-4">
            <ImageEditor 
              image={imageToCrop}
              onClose={() => setImageToCrop(null)}
              onSuccess={() => {
                refreshProfile();
                setImageToCrop(null);
              }}
              userEmail={user?.email || undefined}
              targetDocPath={`users/${user?.uid}`}
              targetField="photoURL"
              buttonText="Confirmar Foto"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Personal Data */}
            <div className="space-y-6">
              <div className="flex items-center gap-4 py-2">
                <div className="relative group">
                  <Avatar className="w-20 h-20 border-2 border-red-600 shadow-xl">
                    <AvatarImage src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} />
                    <AvatarFallback className="bg-neutral-800 text-white text-xl">
                      {profile?.displayName[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} />
                    {isUploading ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </label>
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-widest">{profile?.nick || 'Membro'}</p>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{profile?.role}</p>
                  <p className="text-[10px] text-neutral-600 mt-1">Clique na foto para alterar</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-neutral-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                    <User className="w-3 h-3 text-red-500" /> Nome Completo
                  </Label>
                  <Input 
                    id="name" 
                    value={displayName} 
                    onChange={e => setDisplayName(e.target.value)}
                    className="bg-neutral-950 border-neutral-800 text-white h-10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone" className="text-neutral-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                      <Phone className="w-3 h-3 text-red-500" /> Telefone
                    </Label>
                    <Input 
                      id="phone" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)}
                      className="bg-neutral-950 border-neutral-800 text-white h-10"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-neutral-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                      <Droplets className="w-3 h-3 text-red-500" /> Sangue
                    </Label>
                    <Select value={bloodType} onValueChange={setBloodType}>
                      <SelectTrigger className="bg-neutral-950 border-neutral-800 text-white h-10">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-800 space-y-4">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Segurança de Conta
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="newPassword" title="Nova Senha" />
                      <Input 
                        id="newPassword" 
                        type="password"
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)}
                        className="bg-neutral-950 border-neutral-800 text-white h-9 text-xs"
                        placeholder="Nova Senha"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword" title="Confirmar" />
                      <Input 
                        id="confirmPassword" 
                        type="password"
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="bg-neutral-950 border-neutral-800 text-white h-9 text-xs"
                        placeholder="Confirmar"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Motorcycle Data */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Bike className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">Minha Máquina</h3>
                </div>
                {motorcycle.make && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] text-red-500 hover:bg-red-500/10 gap-1"
                    onClick={deleteMotorcycle}
                  >
                    <Trash2 className="w-3 h-3" /> REMOVER MOTO
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">Marca</Label>
                    <Input 
                      value={motorcycle.make} 
                      onChange={e => setMotorcycle({...motorcycle, make: e.target.value})}
                      className="bg-neutral-950 border-neutral-800 text-white h-10"
                      placeholder="Ex: Honda"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">Modelo</Label>
                    <Input 
                      value={motorcycle.model} 
                      onChange={e => setMotorcycle({...motorcycle, model: e.target.value})}
                      className="bg-neutral-950 border-neutral-800 text-white h-10"
                      placeholder="Ex: CB 500X"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">Ano</Label>
                    <Input 
                      value={motorcycle.year} 
                      onChange={e => setMotorcycle({...motorcycle, year: e.target.value})}
                      className="bg-neutral-950 border-neutral-800 text-white h-10"
                      placeholder="Ex: 2023"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">Cor</Label>
                    <Input 
                      value={motorcycle.color} 
                      onChange={e => setMotorcycle({...motorcycle, color: e.target.value})}
                      className="bg-neutral-950 border-neutral-800 text-white h-10"
                      placeholder="Ex: Vermelha"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">Placa</Label>
                  <Input 
                    value={motorcycle.plate} 
                    onChange={e => setMotorcycle({...motorcycle, plate: e.target.value})}
                    className="bg-neutral-950 border-neutral-800 text-white h-10"
                    placeholder="ABC-1234"
                  />
                </div>

                {!motorcycle.make && (
                  <div className="p-4 bg-neutral-950 rounded-xl border border-dashed border-neutral-800 flex flex-col items-center justify-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-neutral-600" />
                    </div>
                    <p className="text-[10px] text-neutral-500 uppercase font-bold">Nenhuma moto cadastrada</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <DialogFooter className="gap-2 px-6 pb-6 relative z-10">
        <Button variant="outline" onClick={onClose} className="border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800">
          FECHAR
        </Button>
        <Button 
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-8" 
          onClick={handleUpdate}
          disabled={isLoading}
        >
          {isLoading ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
        </Button>
      </DialogFooter>
    </div>
  );
};
