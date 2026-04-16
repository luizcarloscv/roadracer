import React from 'react';
import { motion } from 'motion/react';
import { Shield, Bike, Map, Users, Store, Heart, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ProfileSettings } from './ProfileSettings';
import { NotificationSystem } from './NotificationSystem';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, db, doc, onSnapshot, updateDoc, setDoc, storage, ref, uploadBytes, getDownloadURL } from '@/lib/firebase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Upload, ImageIcon, Loader2, ZoomIn } from 'lucide-react';
import { ImageEditor } from './ImageEditor';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const { profile, isAdmin, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isLogoDialogOpen, setIsLogoDialogOpen] = React.useState(false);
  const [logoUrl, setLogoUrl] = React.useState('/attachment/39ba9f98-0228-483e-9e90-efedb5f73770?v=6');
  const [isUploading, setIsUploading] = React.useState(false);
  const [imageToCrop, setImageToCrop] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'app'), (doc) => {
      if (doc.exists() && doc.data().logoUrl) {
        setLogoUrl(doc.data().logoUrl);
      }
    }, (error) => {
      console.error("Error listening to app config:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  const navItems = [
    { id: 'rides', label: 'Passeios', icon: Bike },
    { id: 'map', label: 'Mapa', icon: Map },
    { id: 'stores', label: 'Lojas Parceiras', icon: Store },
    { id: 'history', label: 'Nossa História', icon: Heart },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Gestão', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Memorial Header */}
      <div className="bg-checkerboard border-b border-red-600 py-2 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-red-900/80 backdrop-blur-[2px]" />
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 text-xs md:text-sm font-black uppercase italic text-white relative z-10 tracking-tighter"
        >
          <Heart className="w-3 h-3 fill-current text-white" />
          <span>Em memória do nosso eterno presidente Miguel Moreira — Fundador em 2016</span>
          <Heart className="w-3 h-3 fill-current text-white" />
        </motion.div>
      </div>

      {/* Main Navigation */}
      <header className="sticky top-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-4 md:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div 
              className={cn(
                "w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg shadow-red-600/20 border-tire overflow-hidden",
                isAdmin && "cursor-pointer hover:scale-110 transition-all active:scale-95"
              )}
              onClick={() => {
                if (isAdmin) {
                  setIsLogoDialogOpen(true);
                }
              }}
            >
              <img 
                src={logoUrl} 
                alt="Road Racer Logo" 
                className="w-full h-full object-contain p-0.5"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-xl font-bold tracking-tighter uppercase italic">Road Racer</h1>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "gap-2 h-10 px-4 rounded-full transition-all relative group",
                activeTab === item.id 
                  ? "bg-red-600 text-white shadow-lg shadow-red-600/20" 
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              )}
              onClick={() => setActiveTab(item.id)}
            >
              <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-white" : "group-hover:text-red-500")} />
              {item.label}
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"
                />
              )}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {profile && (
            <div 
              className="hidden md:flex items-center gap-3 pr-2 border-r border-neutral-800 mr-2 cursor-pointer hover:bg-neutral-900 p-1 rounded-xl transition-colors"
              onClick={() => setIsProfileOpen(true)}
            >
              <div className="text-right">
                <p className="text-xs font-medium">{profile.displayName}</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest">{profile.role}</p>
              </div>
              <Avatar className="w-8 h-8 border border-neutral-700">
                <AvatarImage src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`} />
                <AvatarFallback>{profile.displayName[0]}</AvatarFallback>
              </Avatar>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            className="text-neutral-500 hover:text-red-500"
            onClick={() => auth.signOut()}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="md:hidden bg-neutral-900 border-b border-neutral-800 overflow-hidden"
        >
          <div className="p-4 flex flex-col gap-2">
            {profile && (
              <Button
                variant="ghost"
                className="justify-start gap-3 h-12 w-full border border-neutral-800 mb-2"
                onClick={() => {
                  setIsProfileOpen(true);
                  setIsMobileMenuOpen(false);
                }}
              >
                <Avatar className="w-6 h-6 border border-neutral-700">
                  <AvatarImage src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.uid}`} />
                  <AvatarFallback>{profile.displayName[0]}</AvatarFallback>
                </Avatar>
                Meu Perfil
              </Button>
            )}
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'secondary' : 'ghost'}
                className="justify-start gap-3 h-12 w-full"
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </ScrollArea>
      </main>

      <NotificationSystem />

      {/* Footer / Status Bar */}
      <footer className="bg-neutral-950 border-t border-red-600/50 py-3 px-6 text-[10px] text-neutral-500 flex justify-between items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-checkerboard opacity-5 pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <span className="flex items-center gap-1 font-bold">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            SISTEMA ONLINE
          </span>
          <Separator orientation="vertical" className="h-3 bg-neutral-800" />
          <span className="font-bold tracking-tight">ROAD RACER MOTO CLUBE — DESDE 2016</span>
        </div>
        <div className="hidden md:block relative z-10 font-mono">
          COORDENADAS: 23.5505° S, 46.6333° W
        </div>
      </footer>
      {/* Dialogs */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent showCloseButton={false} className="bg-neutral-900 border-neutral-800 p-0 max-h-[90vh] overflow-y-auto sm:max-w-[800px]">
          <ProfileSettings onClose={() => setIsProfileOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isLogoDialogOpen} onOpenChange={setIsLogoDialogOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-md">
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Gerenciar Logo</h2>
              <p className="text-sm text-neutral-400">Selecione uma imagem do seu dispositivo para ser a nova logo do Moto Clube.</p>
            </div>
            
            <div className="space-y-4">
              {!imageToCrop ? (
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-950 hover:border-red-600/50 transition-colors group relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                  />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                      <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Enviando...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center group-hover:bg-red-600/20 transition-colors">
                        <Upload className="w-6 h-6 text-neutral-500 group-hover:text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Clique para selecionar</p>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">PNG, JPG ou SVG</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <ImageEditor 
                  image={imageToCrop} 
                  onClose={() => {
                    setIsLogoDialogOpen(false);
                    setImageToCrop(null);
                  }}
                  onSuccess={(url) => setLogoUrl(url)}
                  userEmail={user?.email || undefined}
                  targetDocPath="config/app"
                  targetField="logoUrl"
                  buttonText="Confirmar Logo"
                />
              )}
              
              {!imageToCrop && (
                <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                  <p className="text-[10px] text-neutral-500 uppercase font-bold mb-2">Logo Atual</p>
                  <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center border-2 border-red-600 overflow-hidden">
                    <img src={logoUrl} alt="Current Logo" className="w-full h-full object-contain p-1" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsLogoDialogOpen(false)} disabled={isUploading}>Fechar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Layout component ends
