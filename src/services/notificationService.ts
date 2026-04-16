import { auth } from '@/lib/firebase';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL && String(import.meta.env.VITE_BACKEND_URL).trim()) || '';

export async function sendPushNotification(title: string, body: string, url: string = '/') {
  try {
    if (!BACKEND_URL) return { success: false, reason: 'VITE_BACKEND_URL não configurado' };

    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) {
      return { success: false, reason: 'Usuário não autenticado para enviar push' };
    }

    const response = await fetch(`${BACKEND_URL}/notify-emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        title,
        body,
        url,
        level: title.includes('SOS') || body.toLowerCase().includes('ajuda') ? 'emergency' : 'info',
        senderUid: auth.currentUser?.uid || '',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json().catch(() => ({ success: true }));
  } catch (error) {
    console.error("Failed to send push notification:", error);
    throw error;
  }
}
