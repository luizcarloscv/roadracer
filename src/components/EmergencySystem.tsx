import React from 'react';
import { Siren, Navigation, CheckCircle2, Map as MapIcon, BellOff, Phone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { useAuth } from './AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db, collection, addDoc, onSnapshot, query, where, updateDoc, doc, setDoc, getDoc } from '@/lib/firebase';
import { Emergency } from '@/types';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics } from '@capacitor/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sendPushNotification } from '@/services/notificationService';

const VAPID_PUBLIC_KEY = 'BAbd49BGMQ8i7_5_2P0_pvycbNIxWT6K3FWJ7FagmQq0xezeci9EiN5yQ9DXAVml4sHIyj8CPwwreAJJXXsonfg';
const ENABLE_NATIVE_PUSH = import.meta.env.VITE_ENABLE_NATIVE_PUSH === '1';

export const EmergencySystem: React.FC = () => {
  const { profile, user, isAdmin, isMocked } = useAuth();
  const [emergencies, setEmergencies] = React.useState<Emergency[]>([]);
  const [isActivating, setIsActivating] = React.useState(false);
  const [isHelping, setIsHelping] = React.useState<string | null>(null);
  const [activeRoutes, setActiveRoutes] = React.useState<Record<string, string>>({});
  const [acknowledgedIds, setAcknowledgedIds] = React.useState<string[]>([]);
  const sirenAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const lastNotifiedIdRef = React.useRef<string | null>(null);
  const isNativeApp = Capacitor.isNativePlatform();

  const registerWebPushSubscription = React.useCallback(async () => {
    if (!('serviceWorker' in navigator) || !user?.uid) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const subscription =
        existing ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY,
        }));

      const serialized = JSON.parse(JSON.stringify(subscription));
      const subId = btoa(serialized.endpoint).slice(-50);
      await setDoc(
        doc(db, 'push_subscriptions', subId),
        {
          subscription: serialized,
          userId: user.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (error) {
      console.warn('Falha ao registrar WebPush:', error);
    }
  }, [user?.uid]);

  const registerNativePushToken = React.useCallback(async () => {
    if (!isNativeApp || !user?.uid || !ENABLE_NATIVE_PUSH) return;

    try {
      const permStatus = await PushNotifications.requestPermissions();
      if (permStatus.receive !== 'granted') {
        toast.error('Permissão de notificação negada. Ative nas configurações do Android.');
        return;
      }

      await PushNotifications.removeAllListeners();
      await PushNotifications.addListener('registration', async (token: Token) => {
        await setDoc(
          doc(db, 'push_tokens', user.uid),
          {
            token: token.value,
            userId: user.uid,
            platform: 'android',
            updatedAt: new Date().toISOString(),
          },
          { merge: true },
        );
      });

      await PushNotifications.addListener('registrationError', (error) => {
        console.error('Erro no registro do push nativo:', error);
      });

      await PushNotifications.register();
    } catch (error) {
      console.error('Falha ao registrar token nativo:', error);
    }
  }, [isNativeApp, user?.uid]);

  React.useEffect(() => {
    sirenAudioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1005/1005-preview.mp3');
    sirenAudioRef.current.loop = true;

    const initNotifications = async () => {
      try {
        await LocalNotifications.requestPermissions();
        await LocalNotifications.createChannel({
          id: 'emergency_alerts',
          name: 'Alertas de Emergencia',
          description: 'Canal critico para SOS do moto clube',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
        });
      } catch (error) {
        console.warn('Falha ao criar canal de notificacao local:', error);
      }

      await registerWebPushSubscription();
      await registerNativePushToken();
    };

    initNotifications();
    return () => {
      if (sirenAudioRef.current) sirenAudioRef.current.pause();
    };
  }, [registerNativePushToken, registerWebPushSubscription]);

  React.useEffect(() => {
    if (!user || isMocked) return;
    const q = query(collection(db, 'emergencies'), where('status', '==', 'active'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as Emergency));
      setEmergencies(data);

      const unacknowledged = data.filter((item) => !acknowledgedIds.includes(item.id));
      if (unacknowledged.length > 0) {
        const latest = unacknowledged[unacknowledged.length - 1];

        if (sirenAudioRef.current?.paused) {
          sirenAudioRef.current.play().catch(() => {
            // ignore autoplay errors and rely on native push sound
          });
        }

        if (latest.id !== lastNotifiedIdRef.current) {
          lastNotifiedIdRef.current = latest.id;
          Haptics.vibrate();
          LocalNotifications.schedule({
            notifications: [
              {
                title: '🚨 SOS ROAD RACER',
                body: `EMERGENCIA: ${latest.userName} PRECISA DE AJUDA!`,
                id: Number(latest.id.replace(/\D/g, '').slice(-5) || '100'),
                channelId: 'emergency_alerts',
                schedule: { at: new Date(Date.now() + 300) },
                extra: { url: '/' },
              },
            ],
          });
        }
      } else if (sirenAudioRef.current) {
        sirenAudioRef.current.pause();
        sirenAudioRef.current.currentTime = 0;
      }
    });

    return () => unsubscribe();
  }, [user, isMocked, acknowledgedIds]);

  const requestPreciseLocation = async () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });
  };

  const triggerEmergency = async () => {
    if (!user || !profile) return;

    try {
      setIsActivating(true);
      const pos = await requestPreciseLocation();
      const name = profile.nick || profile.displayName || user.displayName || 'Membro';
      const emergencyData = {
        userId: user.uid,
        userName: name,
        userPhone: profile.phone || '',
        location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
        status: 'active',
        responders: [],
        timestamp: new Date().toISOString(),
      };

      await addDoc(collection(db, 'emergencies'), emergencyData);
      await sendPushNotification(`🚨 SOS: ${name}`, 'AJUDA IMEDIATA! Toque para abrir o app.', '/');
      await Haptics.vibrate();
      toast.success('SOS enviado para todo o grupo.');
    } catch (error) {
      console.error('Falha ao acionar SOS:', error);
      toast.error('Nao foi possivel enviar o SOS. Confira GPS e notificacoes.');
    } finally {
      setIsActivating(false);
    }
  };

  const resolveEmergency = async (id: string) => {
    await updateDoc(doc(db, 'emergencies', id), { status: 'resolved' });
    toast.success('Emergencia finalizada.');
  };

  const handleHelp = async (emergency: Emergency) => {
    if (!user || !profile) return;

    try {
      setIsHelping(emergency.id);
      const responderName = profile.nick || profile.displayName || user.displayName || 'Membro';
      const motorcycle = profile.motorcycle?.model
        ? `${profile.motorcycle.make || ''} ${profile.motorcycle.model}`.trim()
        : undefined;
      const responderMotorcycle = motorcycle || 'Moto nao informada';
      const current = await requestPreciseLocation();
      const destination = `${emergency.location.latitude},${emergency.location.longitude}`;
      const origin = `${current.coords.latitude},${current.coords.longitude}`;
      const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

      const emergencyRef = doc(db, 'emergencies', emergency.id);
      const freshEmergencyDoc = await getDoc(emergencyRef);
      const responders = ((freshEmergencyDoc.data()?.responders || []) as Emergency['responders']).filter(
        (responder) => responder.uid !== user.uid,
      );
      responders.push({
        uid: user.uid,
        name: responderName,
        motorcycle: responderMotorcycle,
        acceptedAt: new Date().toISOString(),
      });
      await updateDoc(emergencyRef, { responders });

      setActiveRoutes((prev) => ({ ...prev, [emergency.id]: routeUrl }));
      window.open(routeUrl, '_blank');

      toast.success('Rota iniciada e presenca registrada como socorrista.');
    } catch (error) {
      console.error('Falha ao registrar socorrista:', error);
      const destination = `${emergency.location.latitude},${emergency.location.longitude}`;
      const fallbackRouteUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
      setActiveRoutes((prev) => ({ ...prev, [emergency.id]: fallbackRouteUrl }));
      window.open(fallbackRouteUrl, '_blank');
      toast.error('GPS indisponivel agora. Abrindo rota sem local atual.');
    } finally {
      setIsHelping(null);
    }
  };

  const handleStopHelping = async (emergency: Emergency) => {
    if (!user) return;

    try {
      setIsHelping(emergency.id);
      const emergencyRef = doc(db, 'emergencies', emergency.id);
      const freshEmergencyDoc = await getDoc(emergencyRef);
      const responders = ((freshEmergencyDoc.data()?.responders || []) as Emergency['responders']).filter(
        (responder) => responder.uid !== user.uid,
      );
      await updateDoc(emergencyRef, { responders });
      setActiveRoutes((prev) => {
        const next = { ...prev };
        delete next[emergency.id];
        return next;
      });
      toast.success('Voce saiu da ajuda neste SOS.');
    } catch (error) {
      console.error('Falha ao sair da ajuda:', error);
      toast.error('Nao foi possivel sair da ajuda agora.');
    } finally {
      setIsHelping(null);
    }
  };

  const handleCall = (phone?: string) => {
    const digits = (phone || '').replace(/\D/g, '');
    if (!digits) {
      toast.error('Numero de telefone nao informado para este SOS.');
      return;
    }
    const dialNumber = digits.length === 11 || digits.length === 10 ? digits : (phone || '').replace(/[^\d+]/g, '');
    window.open(`tel:${dialNumber}`, '_self');
  };

  const formatBrazilPhone = (phone?: string) => {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phone || 'Telefone nao informado';
  };

  const hasOwnActiveEmergency = emergencies.some((item) => item.userId === user?.uid && item.status === 'active');

  return (
    <div className="space-y-8">
      {hasOwnActiveEmergency && (
        <div className="bg-red-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-2xl animate-pulse border-2 border-red-400">
          <div className="flex items-center gap-3">
            <Siren className="w-6 h-6" />
            <div>
              <p className="font-black italic leading-none">SOS ATIVO</p>
              <p className="text-[10px] uppercase font-bold">Sua posicao esta sendo enviada</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="bg-white text-red-600 font-bold"
            onClick={() => {
              const myEmergency = emergencies.find((item) => item.userId === user?.uid && item.status === 'active');
              if (myEmergency) resolveEmergency(myEmergency.id);
            }}
          >
            FINALIZAR
          </Button>
        </div>
      )}

      <section className="flex flex-col items-center justify-center py-12 bg-red-950/10 rounded-3xl border border-red-900/20">
        <Button
          size="lg"
          variant="destructive"
          className={cn(
            'w-48 h-48 rounded-full text-2xl font-black shadow-[0_0_50px_rgba(220,38,38,0.3)] transition-all border-8 border-red-900/50 flex flex-col gap-2',
            isActivating && 'animate-pulse opacity-50',
          )}
          onClick={triggerEmergency}
          disabled={isActivating}
        >
          <Siren className="w-12 h-12" /> SOS
        </Button>
        <p className="mt-6 text-red-400 font-medium text-sm animate-pulse">TOQUE PARA AJUDA IMEDIATA</p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {emergencies.map((emergency) => {
          const isUserHelpingEmergency = (emergency.responders || []).some((responder) => responder.uid === user?.uid);
          return (
            <Card key={emergency.id} className="bg-neutral-900 border-red-900/50 border-2 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between text-white items-start">
                  <span className="flex flex-col">
                    <span>{emergency.userName}</span>
                    <span className="text-[11px] font-medium text-neutral-400">
                      {formatBrazilPhone(emergency.userPhone)}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      className="h-8 w-8 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleCall(emergency.userPhone)}
                      title={emergency.userPhone ? `Ligar para ${emergency.userName}` : 'Sem telefone cadastrado'}
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Badge className="bg-red-600">SOS</Badge>
                  </div>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div
                  className="w-full aspect-video bg-neutral-950 rounded-xl border border-red-900/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-red-950/20 transition-all"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${emergency.location.latitude},${emergency.location.longitude}`,
                      '_blank',
                    )
                  }
                >
                  <MapIcon className="w-12 h-12 text-red-600" />
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Ver localizacao no mapa</span>
                </div>

                <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800">
                  <p className="text-xs text-green-400 font-bold mb-2">{emergency.responders?.length || 0} indo ajudar</p>
                  {(emergency.responders || []).length === 0 && <p className="text-[11px] text-neutral-500">Ninguem confirmou ajuda ainda.</p>}
                  {(emergency.responders || []).map((responder, index) => (
                    <div key={`${responder.uid}-${index}`} className="text-[11px] text-neutral-300 py-1 border-t border-neutral-800">
                      {index + 1}. {responder.name} {responder.motorcycle ? `- ${responder.motorcycle}` : ''}
                    </div>
                  ))}
                </div>

                {activeRoutes[emergency.id] && (
                  <div className="rounded-lg border border-green-800 bg-green-950/20 p-3 space-y-2">
                    <p className="text-xs text-green-300 font-semibold">Sua rota para este SOS esta ativa.</p>
                    <Button
                      size="sm"
                      className="w-full bg-green-700 hover:bg-green-600 text-white font-bold"
                      onClick={() => window.open(activeRoutes[emergency.id], '_blank')}
                    >
                      <Navigation className="mr-2 w-4 h-4" /> ABRIR ROTA NOVAMENTE
                    </Button>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex gap-2">
                <Button
                  className={cn(
                    'flex-1 text-white font-bold',
                    isUserHelpingEmergency ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700',
                  )}
                  onClick={() => (isUserHelpingEmergency ? handleStopHelping(emergency) : handleHelp(emergency))}
                  disabled={isHelping === emergency.id}
                >
                  <Navigation className="mr-2 w-4 h-4" />{' '}
                  {isHelping === emergency.id ? 'PROCESSANDO...' : isUserHelpingEmergency ? 'SAIR DA AJUDA' : 'IR AJUDAR'}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => {
                    setAcknowledgedIds((prev) => [...prev, emergency.id]);
                    if (sirenAudioRef.current) sirenAudioRef.current.pause();
                  }}
                >
                  <BellOff className="w-4 h-4" />
                </Button>

                {(isAdmin || user?.uid === emergency.userId) && (
                  <Button variant="outline" className="border-neutral-700" onClick={() => resolveEmergency(emergency.id)}>
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};