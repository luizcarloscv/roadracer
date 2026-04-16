import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store as StoreIcon, MapPin, Phone, Instagram, Plus, Trash2, Edit, Navigation, ExternalLink, Loader2, Search, Camera } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { db, collection, addDoc, onSnapshot, query, updateDoc, doc, deleteDoc, orderBy } from '@/lib/firebase';
import { Store } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ImageEditor } from './ImageEditor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const StoreManagement: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [stores, setStores] = React.useState<Store[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [editingStore, setEditingStore] = React.useState<Store | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [imageToCrop, setImageToCrop] = React.useState<{ url: string, storeId: string } | null>(null);

  const [formData, setFormData] = React.useState({
    name: '',
    category: '',
    address: '',
    phone: '',
    instagram: ''
  });

  React.useEffect(() => {
    const q = query(collection(db, 'stores'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
      setStores(data);
      setLoading(false);
    }, (error) => {
      console.error("Error listening to stores:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (!formData.name || !formData.category || !formData.address || !formData.phone) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStore) {
        const storeRef = doc(db, 'stores', editingStore.id);
        await updateDoc(storeRef, {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        toast.success("Loja atualizada com sucesso!");
      } else {
        await addDoc(collection(db, 'stores'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
        toast.success("Loja cadastrada com sucesso!");
      }
      setIsAddDialogOpen(false);
      setEditingStore(null);
      setFormData({ name: '', category: '', address: '', phone: '', instagram: '' });
    } catch (error) {
      console.error("Error saving store:", error);
      toast.error("Erro ao salvar loja.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta loja?")) return;
    try {
      await deleteDoc(doc(db, 'stores', id));
      toast.success("Loja excluída com sucesso.");
    } catch (error) {
      console.error("Error deleting store:", error);
      toast.error("Erro ao excluir loja.");
    }
  };

  const openEditDialog = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      category: store.category,
      address: store.address,
      phone: store.phone,
      instagram: store.instagram || ''
    });
    setIsAddDialogOpen(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, storeId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop({ url: reader.result as string, storeId });
    };
    reader.onerror = () => {
      console.error("FileReader error");
      toast.error("Erro ao carregar imagem.");
    };
    reader.readAsDataURL(file);
  };

  const filteredStores = stores.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <StoreIcon className="text-red-500" />
            Lojas Parceiras
          </h2>
          <p className="text-neutral-500 text-sm">Confira os benefícios e descontos exclusivos para membros.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input 
              placeholder="Buscar loja..." 
              className="pl-10 bg-neutral-900 border-neutral-800"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setEditingStore(null);
                setFormData({ name: '', category: '', address: '', phone: '', instagram: '' });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-red-600 hover:bg-red-700 font-bold">
                  <Plus className="w-4 h-4" />
                  CADASTRAR LOJA
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
                <DialogHeader>
                  <DialogTitle>{editingStore ? 'Editar Loja' : 'Cadastrar Nova Loja'}</DialogTitle>
                  <DialogDescription className="text-neutral-400">
                    Insira as informações da loja parceira para que os membros possam encontrá-la.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome da Loja *</Label>
                    <Input 
                      id="name" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="bg-neutral-800 border-neutral-700"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Ramo / Categoria *</Label>
                    <Input 
                      id="category" 
                      placeholder="Ex: Oficina, Peças, Acessórios"
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="bg-neutral-800 border-neutral-700"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Endereço Completo *</Label>
                    <Input 
                      id="address" 
                      value={formData.address} 
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="bg-neutral-800 border-neutral-700"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="bg-neutral-800 border-neutral-700"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="instagram">Instagram (Opcional)</Label>
                    <Input 
                      id="instagram" 
                      placeholder="@loja_exemplo"
                      value={formData.instagram} 
                      onChange={e => setFormData({...formData, instagram: e.target.value})}
                      className="bg-neutral-800 border-neutral-700"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                  <Button 
                    className="bg-red-600 hover:bg-red-700" 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingStore ? 'Salvar Alterações' : 'Cadastrar')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {imageToCrop && (
        <Dialog open={!!imageToCrop} onOpenChange={() => setImageToCrop(null)}>
          <DialogContent className="bg-neutral-900 border-neutral-800 text-white">
            <DialogHeader>
              <DialogTitle>Ajustar Logo da Loja</DialogTitle>
            </DialogHeader>
            <ImageEditor 
              image={imageToCrop.url}
              onClose={() => setImageToCrop(null)}
              onSuccess={() => setImageToCrop(null)}
              userEmail={user?.email || undefined}
              targetDocPath={`stores/${imageToCrop.storeId}`}
              targetField="logoUrl"
              buttonText="Salvar Logo"
            />
          </DialogContent>
        </Dialog>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredStores.map((store) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card className="bg-neutral-900 border-neutral-800 overflow-hidden hover:border-red-900/30 transition-all group h-full flex flex-col relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-checkerboard opacity-20" />
                  
                  <CardHeader className="pb-4 flex flex-col items-center text-center">
                    <div className="w-full flex justify-between items-start absolute top-4 px-4">
                      <div /> {/* Spacer */}
                      {isAdmin && (
                        <div className="flex gap-1 bg-black/40 backdrop-blur-md p-1 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-neutral-400 hover:text-white"
                            onClick={() => openEditDialog(store)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-neutral-400 hover:text-red-500"
                            onClick={() => handleDelete(store.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="relative mt-4 group/logo">
                      <Avatar className="w-32 h-32 border-4 border-neutral-800 shadow-2xl group-hover:border-red-600 transition-all">
                        <AvatarImage src={store.logoUrl} className="object-cover" />
                        <AvatarFallback className="bg-neutral-800 text-red-500">
                          <StoreIcon className="w-16 h-16" />
                        </AvatarFallback>
                      </Avatar>

                      {isAdmin && (
                        <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer border-2 border-dashed border-red-500/50">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleLogoUpload(e, store.id)} 
                          />
                          <Camera className="w-8 h-8 text-white" />
                        </label>
                      )}
                    </div>

                    <div className="mt-6">
                      <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-white">{store.name}</CardTitle>
                      <CardDescription className="text-red-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1 bg-red-600/10 px-3 py-1 rounded-full border border-red-600/20 inline-block">
                        {store.category}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 flex-1 px-6">
                    <div className="space-y-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                      <div className="flex items-start gap-3 text-sm text-neutral-400">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span className="leading-tight">{store.address}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-neutral-400">
                        <Phone className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="text-white font-bold tracking-tight">{store.phone}</span>
                      </div>
                      {store.instagram && (
                        <div className="flex items-center gap-3 text-sm text-neutral-400">
                          <Instagram className="w-4 h-4 text-red-500 shrink-0" />
                          <a 
                            href={`https://instagram.com/${store.instagram.replace('@', '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-white transition-colors flex items-center gap-1 font-medium"
                          >
                            {store.instagram}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 pt-0">
                    <Button 
                      variant="default" 
                      className="w-full bg-red-600 hover:bg-red-700 text-white gap-2 font-black italic uppercase tracking-tighter h-12 shadow-[0_4px_20px_rgba(220,38,38,0.2)]"
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.address)}`, '_blank')}
                    >
                      <Navigation className="w-5 h-5" />
                      TRAÇAR ROTA
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredStores.length === 0 && (
            <div className="col-span-full py-20 text-center border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/50">
              <StoreIcon className="w-16 h-16 text-neutral-800 mx-auto mb-4" />
              <p className="text-neutral-500 font-medium">Nenhuma loja parceira encontrada.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
