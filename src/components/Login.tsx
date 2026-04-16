import React from 'react';
import { motion } from 'motion/react';
import { Bike, Shield, LogIn, User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signInWithEmailAndPassword, auth, db, onSnapshot, doc, getDoc, sendPasswordResetEmail } from '@/lib/firebase';
import { toast } from 'sonner';

export const Login: React.FC = () => {
  const { loginWithFirestore } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [logoUrl, setLogoUrl] = React.useState('/attachment/39ba9f98-0228-483e-9e90-efedb5f73770?v=6');

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Try real Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists() && userSnap.data().isBlocked) {
        await auth.signOut();
        toast.error("Sua conta está bloqueada. Entre em contato com a diretoria.");
        setIsLoading(false);
        return;
      }
      
      toast.success("Bem-vindo ao Road Racer!");
    } catch (error) {
      // 2. Fallback to Firestore-only login (for members created in management tab)
      const success = await loginWithFirestore(email, password);
      if (success) {
        toast.success("Bem-vindo ao Road Racer! (Acesso via Perfil)");
      } else {
        toast.error("Credenciais inválidas ou usuário bloqueado.");
      }
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error('Digite seu e-mail no campo acima para recuperar a senha.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      toast.success('Link de redefinicao enviado para seu e-mail.');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error('Nao foi possivel enviar o link de redefinicao.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-checkerboard" />
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neutral-800 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 relative z-10"
      >
        <div className="text-center space-y-4">
            <div className="w-32 h-32 mx-auto flex items-center justify-center bg-white rounded-full shadow-2xl shadow-red-600/20 border-4 border-red-600 overflow-hidden">
              <img 
                src={logoUrl} 
                alt="Road Racer Logo" 
                className="w-full h-full object-contain p-1"
                referrerPolicy="no-referrer"
              />
            </div>
          
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter italic uppercase text-white">
              Road Racer <span className="text-red-600">App</span>
            </h1>
            <p className="text-neutral-400 text-sm font-medium">
              Plataforma exclusiva para membros do Moto Clube
            </p>
          </div>
        </div>

        <div className="bg-neutral-900/80 backdrop-blur-xl border border-red-600/20 p-8 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-checkerboard opacity-20" />
          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            <div className="space-y-2">
              <Label htmlFor="email">Usuário / E-mail</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input 
                  id="email"
                  type="text"
                  placeholder="admin" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 bg-neutral-950 border border-white/10 h-12 rounded-xl text-white outline-none focus:border-red-500/50 transition-colors"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input 
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 bg-neutral-950 border border-white/10 h-12 rounded-xl text-white outline-none focus:border-red-500/50 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              className="text-xs text-red-400 hover:text-red-300 font-semibold"
              onClick={handleForgotPassword}
            >
              Esqueci a senha
            </button>

            <Button 
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl gap-3 text-lg transition-all active:scale-95 mt-4"
            >
              {isLoading ? "Entrando..." : <><LogIn className="w-5 h-5" /> Entrar</>}
            </Button>
          </form>

          <div className="flex items-center gap-3 p-4 bg-neutral-950/50 rounded-2xl border border-white/5">
            <Shield className="text-red-500 w-5 h-5" />
            <div className="text-left">
              <p className="text-xs font-bold text-white uppercase tracking-widest">Acesso Restrito</p>
              <p className="text-[10px] text-neutral-500">Apenas membros autorizados pela diretoria.</p>
            </div>
          </div>

          <p className="text-[10px] text-center text-neutral-600 uppercase tracking-widest">
            Road Racer Moto Clube — Desde 2016
          </p>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-neutral-500 italic">
            "Em memória do nosso eterno presidente Miguel Moreira"
          </p>
        </div>
      </motion.div>
    </div>
  );
};
