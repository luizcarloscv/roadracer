import React from 'react';
import { Shield, Users, Heart, Camera, Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { db, doc, onSnapshot } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ImageEditor } from './ImageEditor';

export const HistorySection: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [imageToCrop, setImageToCrop] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'app'), (doc) => {
      if (doc.exists()) {
        setLogoUrl(doc.data().logoUrl || null);
      }
    }, (error) => {
      console.error("Error listening to app config:", error);
    });
    return () => unsubscribe();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8 relative">
      <div className="absolute inset-0 bg-checkerboard opacity-5 pointer-events-none" />
      
      <div className="text-center space-y-4 relative z-10">
        <div className="relative group mx-auto w-32 h-32">
          <Avatar className="w-32 h-32 bg-red-600 mx-auto flex items-center justify-center shadow-2xl shadow-red-600/20 border-4 border-white transition-all group-hover:border-red-500">
            <AvatarImage src={logoUrl || ''} className="object-cover" />
            <AvatarFallback className="bg-red-600 text-white">
              <Heart className="w-16 h-16 fill-current" />
            </AvatarFallback>
          </Avatar>

          {isAdmin && (
            <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-2 border-dashed border-red-500/50">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleLogoUpload} 
              />
              <Camera className="w-8 h-8 text-white" />
            </label>
          )}
        </div>

        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Nossa História</h2>
        <p className="text-red-500 font-bold uppercase tracking-[0.2em] text-xs bg-black px-4 py-1 inline-block border border-red-600">Desde 06/11/2016</p>
      </div>

      {imageToCrop && (
        <Dialog open={!!imageToCrop} onOpenChange={() => setImageToCrop(null)}>
          <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
            <DialogHeader>
              <DialogTitle>Ajustar Logo Road Racer</DialogTitle>
            </DialogHeader>
            <ImageEditor 
              image={imageToCrop}
              onClose={() => setImageToCrop(null)}
              onSuccess={() => setImageToCrop(null)}
              userEmail={user?.email || undefined}
              targetDocPath="config/app"
              targetField="logoUrl"
              buttonText="Salvar Logo do Clube"
            />
          </DialogContent>
        </Dialog>
      )}

      <div className="prose prose-invert max-w-none space-y-6 text-neutral-400 leading-relaxed">
        <p className="text-lg text-neutral-200 italic border-l-4 border-red-600 pl-6 py-2">
          "O Road Racer não é apenas um moto clube, é uma irmandade forjada no asfalto e no respeito mútuo."
        </p>
        
        <p>
          Fundado em 6 de novembro de 2016 por <strong>Miguel Moreira</strong>, o Road Racer Moto Clube nasceu com o propósito de unir apaixonados por duas rodas que buscam mais do que apenas velocidade, mas sim a liberdade e a segurança de rodar em grupo.
        </p>

        <div className="grid md:grid-cols-2 gap-8 py-8">
          <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800">
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-red-500" /> Missão
            </h3>
            <p className="text-sm">Promover o motociclismo seguro, a união entre os membros e o apoio mútuo em todas as estradas da vida.</p>
          </div>
          <div className="bg-neutral-900 p-6 rounded-3xl border border-neutral-800">
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-red-500" /> Valores
            </h3>
            <p className="text-sm">Respeito, Lealdade, Família e a Paixão inabalável pelo ronco dos motores.</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-white uppercase italic tracking-tight">O Legado de Miguel</h3>
          <p>
            Nosso eterno presidente Miguel Moreira foi mais do que um líder; foi o coração pulsante deste clube. Sua visão de um ambiente onde cada membro cuida do outro é o que nos guia até hoje. O sistema de emergência deste aplicativo é uma homenagem direta ao seu cuidado constante com a segurança de todos.
          </p>
          <p>
            Hoje, seguimos seu rastro, mantendo viva a chama que ele acendeu. Cada quilômetro rodado é um tributo à sua memória.
          </p>
        </div>
      </div>

      <div className="pt-12 border-t border-neutral-800 text-center">
        <p className="text-xs text-neutral-600 uppercase tracking-widest">Road Racer Moto Clube — Honra e Liberdade</p>
      </div>
    </div>
  );
};
