import React from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [showManualInstructions, setShowManualInstructions] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
      console.log('✅ beforeinstallprompt event fired');
    };

    window.addEventListener('beforeinstallprompt', handler);

    const showHandler = () => {
      setIsVisible(true);
    };
    window.addEventListener('show-install-pwa', showHandler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsVisible(false);
    } else {
      // If not installed, show the prompt after a short delay even if event hasn't fired
      // to ensure the "Red Button" is visible as requested
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('show-install-pwa', showHandler);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowManualInstructions(true);
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("Install prompt error:", err);
      setShowManualInstructions(true);
    }
  };

  if (!isVisible && !showManualInstructions) return null;

  return (
    <AnimatePresence>
      {(isVisible || showManualInstructions) && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 left-4 right-4 z-[100] md:left-auto md:right-4 md:w-96"
        >
          <div className="bg-zinc-900 border-2 border-red-600 rounded-2xl p-5 shadow-[0_20px_50px_rgba(220,38,38,0.3)] flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-red-600 p-3 rounded-xl shadow-lg shadow-red-600/20">
                <Download className="text-white w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-black italic uppercase tracking-tighter text-lg leading-tight">Instalar Road Racer App</h3>
                <p className="text-zinc-400 text-[11px] mt-1 leading-tight font-medium uppercase tracking-wide">
                  {showManualInstructions 
                    ? "Clique nos 3 pontinhos do Chrome e selecione 'Instalar aplicativo' para ter o App Real com ícone oficial."
                    : "Instale como aplicativo para acesso instantâneo e alertas SOS com som em tempo real."}
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsVisible(false);
                  setShowManualInstructions(false);
                }}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-black italic uppercase tracking-tighter py-4 px-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-red-600/40 animate-pulse"
              >
                {showManualInstructions ? "VER INSTRUÇÕES" : "INSTALAR AGORA"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
