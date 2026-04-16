import React from 'react';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { Login } from './components/Login';
import { EmergencySystem } from './components/EmergencySystem';
import { InstallPWA } from './components/InstallPWA';
import { RideManagement } from './components/RideManagement';
import { MemberManagement } from './components/MemberManagement';
import { StoreManagement } from './components/StoreManagement';
import { HistorySection } from './components/HistorySection';
import { PermissionGuard } from './components/PermissionGuard';
import { Toaster } from '@/components/ui/sonner';
import { Bike, Map, Users, Shield, Store, MapPin, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const AppContent: React.FC = () => {
  const { user, loading, profile } = useAuth();
  const [activeTab, setActiveTab] = React.useState('rides');

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // If user is logged in but has no profile, they might be a new user waiting for approval
  // For this demo, we'll show a simple welcome/setup if profile is missing
  if (!profile && user) {
     return (
       <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
         <div className="absolute inset-0 bg-checkerboard opacity-5 pointer-events-none" />
         <Shield className="w-16 h-16 text-red-600 mb-4 relative z-10" />
         <h1 className="text-2xl font-bold mb-2 relative z-10 text-white uppercase italic tracking-tighter">Aguardando Aprovação</h1>
         <p className="text-neutral-500 max-w-md relative z-10">
           Seu acesso ainda não foi liberado pela diretoria. 
           Entre em contato com o Presidente para validar seu cadastro.
         </p>
         <p className="mt-4 text-xs text-neutral-600 relative z-10">UID: {user.uid}</p>
       </div>
     );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="space-y-12">
        {/* Emergency Section is always visible at the top if there are active ones, 
            but the button is only on the 'map' or 'rides' tab for focus */}
        {(activeTab === 'rides' || activeTab === 'map') && <EmergencySystem />}

        {activeTab === 'rides' && <RideManagement />}
        
        {activeTab === 'map' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Map className="text-red-500" />
              Monitoramento em Tempo Real
            </h2>
            <div className="aspect-video bg-neutral-900 rounded-3xl border border-neutral-800 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-30 bg-[url('https://www.google.com/maps/vt/pb=!1m4!1m3!1i12!2i2345!3i1234!2m3!1e0!2sm!3i123456789!3m8!2spt-BR!3sUS!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m1!1f2')] bg-cover bg-center" />
              <div className="relative z-10 text-center space-y-2">
                <MapPin className="w-12 h-12 text-red-600 mx-auto animate-bounce" />
                <p className="text-neutral-400 font-medium">Mapa Interativo do Comboio</p>
                <p className="text-[10px] text-neutral-600 uppercase tracking-widest">Integração com Google Maps API</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stores' && <StoreManagement />}

        {activeTab === 'history' && <HistorySection />}

        {activeTab === 'admin' && <MemberManagement />}
      </div>
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <PermissionGuard>
        <AppContent />
      </PermissionGuard>
      <Toaster position="top-center" theme="dark" closeButton richColors />
    </AuthProvider>
  );
}
