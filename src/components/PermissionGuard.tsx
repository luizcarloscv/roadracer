import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Loader2, MapPin, RefreshCcw, Vibrate } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics } from '@capacitor/haptics';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PermissionGuardProps {
  children: React.ReactNode;
}

type PermissionStatus = 'pending' | 'granted' | 'denied';

interface PermissionItem {
  status: PermissionStatus;
  detail: string;
}

export function PermissionGuard({ children }: PermissionGuardProps) {
  const [permissions, setPermissions] = useState<Record<string, PermissionItem>>({
    gps: { status: 'pending', detail: 'Aguardando validacao do GPS...' },
    notifications: { status: 'pending', detail: 'Aguardando permissao de notificacoes...' },
    vibration: { status: 'pending', detail: 'Aguardando teste de vibracao...' },
  });
  const [loading, setLoading] = useState(true);
  const [isNative, setIsNative] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const allGreen = useMemo(() => Object.values(permissions).every((item) => item.status === 'granted'), [permissions]);

  const updatePermission = (key: string, status: PermissionStatus, detail: string) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: { status, detail },
    }));
  };

  const requestGps = async () => {
    if (!navigator.geolocation) {
      updatePermission('gps', 'denied', 'GPS nao suportado neste dispositivo.');
      return;
    }

    try {
      await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      updatePermission('gps', 'granted', 'GPS ativo e funcionando.');
    } catch {
      updatePermission('gps', 'denied', 'Ative localizacao precisa nas permissoes do app.');
    }
  };

  const requestNotifications = async () => {
    try {
      if (isNative) {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display === 'granted') {
          updatePermission('notifications', 'granted', 'Notificacoes ativas.');
        } else {
          updatePermission('notifications', 'denied', 'Permita notificacoes para alertas SOS.');
        }
        return;
      }

      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          updatePermission('notifications', 'granted', 'Notificacoes ativas.');
        } else {
          updatePermission('notifications', 'denied', 'Permita notificacoes no navegador.');
        }
        return;
      }

      updatePermission('notifications', 'denied', 'Notificacoes nao suportadas.');
    } catch {
      updatePermission('notifications', 'denied', 'Nao foi possivel validar notificacoes.');
    }
  };

  const requestVibration = async () => {
    try {
      if (isNative) {
        await Haptics.vibrate();
        updatePermission('vibration', 'granted', 'Vibracao testada com sucesso.');
        return;
      }

      if ('vibrate' in navigator) {
        navigator.vibrate(120);
        updatePermission('vibration', 'granted', 'Vibracao suportada no dispositivo.');
      } else {
        updatePermission('vibration', 'denied', 'Vibracao nao suportada neste dispositivo.');
      }
    } catch {
      updatePermission('vibration', 'denied', 'Nao foi possivel testar vibracao.');
    }
  };

  const runValidation = async () => {
    setIsValidating(true);
    await requestGps();
    await requestNotifications();
    await requestVibration();
    setIsValidating(false);
    setLoading(false);
  };

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  useEffect(() => {
    if (!isNative) {
      setLoading(false);
      return;
    }
    runValidation();
  }, [isNative]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 font-bold">INICIALIZANDO ROAD RACER...</p>
        </div>
      </div>
    );
  }

  if (!isNative) {
    return <>{children}</>;
  }

  if (!allGreen) {
    const permissionRows = [
      { key: 'gps', label: 'GPS / Localizacao', icon: MapPin },
      { key: 'notifications', label: 'Notificacoes', icon: Bell },
      { key: 'vibration', label: 'Som e Vibracao', icon: Vibrate },
    ] as const;

    return (
      <div className="fixed inset-0 bg-black z-[9999] p-4 flex items-center justify-center">
        <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-red-900/40 bg-neutral-950 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-white text-lg font-black uppercase">Validacao Obrigatoria</h1>
              <p className="text-xs text-neutral-400">Somente com tudo em verde o app e liberado.</p>
            </div>
          </div>

          <div className="space-y-2">
            {permissionRows.map((row) => {
              const item = permissions[row.key];
              const Icon = row.icon;
              const ok = item.status === 'granted';
              return (
                <div key={row.key} className={cn('rounded-xl border p-3', ok ? 'border-green-700 bg-green-950/20' : 'border-red-900/40 bg-neutral-900')}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className={cn('w-4 h-4', ok ? 'text-green-400' : 'text-neutral-400')} />
                      <p className="text-sm font-semibold text-white">{row.label}</p>
                    </div>
                    {ok ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <span className="text-[10px] text-red-400 font-bold uppercase">Pendente</span>}
                  </div>
                  <p className="text-[11px] mt-1 text-neutral-300">{item.detail}</p>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold" onClick={runValidation} disabled={isValidating}>
              {isValidating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
              VALIDAR PERMISSOES
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}