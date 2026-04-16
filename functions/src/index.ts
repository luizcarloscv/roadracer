import cors from 'cors';
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2/options';

setGlobalOptions({
  region: 'us-central1',
});

if (!admin.apps.length) {
  admin.initializeApp();
}

const corsHandler = cors({ origin: true });

function getBearerToken(req: any): string | null {
  const raw = req.headers?.authorization || req.headers?.Authorization;
  if (typeof raw !== 'string') return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

async function requireAdmin(req: any) {
  const token = getBearerToken(req);
  if (!token) {
    const err: any = new Error('Missing Authorization Bearer token');
    err.status = 401;
    throw err;
  }

  const decoded = await admin.auth().verifyIdToken(token);
  const email = (decoded.email || '').toLowerCase();
  const adminEmails = new Set<string>(['luizcarloscv@msn.com']);

  if (!email || !adminEmails.has(email)) {
    const err: any = new Error('Not authorized');
    err.status = 403;
    throw err;
  }

  return { decoded, email };
}

async function requireAuth(req: any) {
  const token = getBearerToken(req);
  if (!token) {
    const err: any = new Error('Missing Authorization Bearer token');
    err.status = 401;
    throw err;
  }

  const decoded = await admin.auth().verifyIdToken(token);
  return decoded;
}

export const deleteMember = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      await requireAdmin(req);

      const uid = String(req.body?.uid || '').trim();
      if (!uid) {
        res.status(400).json({ error: 'Missing uid' });
        return;
      }

      const db = admin.firestore();

      // Firestore cleanup (best-effort)
      await Promise.allSettled([
        db.doc(`users/${uid}`).delete(),
        db.doc(`members/${uid}`).delete(),
        db.doc(`push_tokens/${uid}`).delete(),
      ]);

      // Remove web-push subscriptions linked to this user
      try {
        const subsSnap = await db.collection('push_subscriptions').where('userId', '==', uid).get();
        if (!subsSnap.empty) {
          const batch = db.batch();
          subsSnap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      } catch {
        // ignore
      }

      // Auth cleanup (this is what "frees" the email)
      try {
        await admin.auth().deleteUser(uid);
      } catch (err: any) {
        if (err?.code !== 'auth/user-not-found') {
          throw err;
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      const status = Number(e?.status || 500);
      res.status(status).json({ error: e?.message || 'Internal error' });
    }
  });
});

export const notifyEmergency = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      await requireAuth(req);

      const title = String(req.body?.title || '🚨 SOS ROAD RACER');
      const body = String(req.body?.body || 'Emergência detectada');
      const url = String(req.body?.url || '/');

      const db = admin.firestore();
      const snap = await db.collection('push_tokens').get();
      const tokens = snap.docs
        .map((d) => d.data()?.token)
        .filter((t): t is string => typeof t === 'string' && t.length > 20);

      if (tokens.length === 0) {
        res.json({ success: false, reason: 'No tokens' });
        return;
      }

      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: { title, body },
        data: {
          url,
          emergency: 'true',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'emergency_alerts',
            sound: 'default',
            visibility: 'public',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      const resp = await admin.messaging().sendEachForMulticast(message);
      res.json({
        success: resp.successCount > 0,
        successCount: resp.successCount,
        failureCount: resp.failureCount,
      });
    } catch (e: any) {
      const status = Number(e?.status || 500);
      res.status(status).json({ error: e?.message || 'Internal error' });
    }
  });
});

