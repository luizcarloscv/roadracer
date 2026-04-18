import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import admin from 'firebase-admin';

dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return String(value);
}

function initFirebaseAdmin() {
  if (admin.apps.length > 0) return;

  const projectId = getRequiredEnv('FIREBASE_PROJECT_ID');
  const clientEmail = getRequiredEnv('FIREBASE_CLIENT_EMAIL');
  const privateKey = getRequiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Missing bearer token' });
      return;
    }
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function isAdminEmail(email) {
  const raw = process.env.ADMIN_EMAILS || 'luizcarloscv@msn.com';
  const allowed = raw
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes((email || '').toLowerCase());
}

function requireAdmin(req, res, next) {
  const email = req.user?.email || '';
  if (!isAdminEmail(email)) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }
  next();
}

app.get('/health', (_, res) => {
  res.json({ ok: true });
});

app.post('/delete-member', requireAuth, requireAdmin, async (req, res) => {
  try {
    const uid = String(req.body?.uid || '').trim();
    if (!uid) {
      res.status(400).json({ error: 'Missing uid' });
      return;
    }

    // IMPORTANTE: Conecta ao banco de dados específico definido no ENV ou usa o default
    const dbId = process.env.FIREBASE_DATABASE_ID || '(default)';
    const db = admin.firestore(dbId);
    
    console.log(`Iniciando exclusão do UID: ${uid} no banco: ${dbId}`);

    // Deleta do Firestore primeiro
    await Promise.allSettled([
      db.doc(`users/${uid}`).delete(),
      db.doc(`members/${uid}`).delete(),
      db.doc(`push_tokens/${uid}`).delete(),
    ]);

    // Limpa inscrições de push
    try {
      const subs = await db.collection('push_subscriptions').where('userId', '==', uid).get();
      if (!subs.empty) {
        const batch = db.batch();
        subs.docs.forEach((entry) => batch.delete(entry.ref));
        await batch.commit();
      }
    } catch (e) {
      console.error("Cleanup push error:", e);
    }

    // Deleta do Auth (isso libera o e-mail)
    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') throw error;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('delete-member error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/notify-emergency', requireAuth, async (req, res) => {
  try {
    const title = String(req.body?.title || 'ROAD RACER');
    const body = String(req.body?.body || 'Nova notificação');
    const url = String(req.body?.url || '/');
    const level = String(req.body?.level || 'info');
    const senderUid = String(req.body?.senderUid || '');

    const dbId = process.env.FIREBASE_DATABASE_ID || '(default)';
    const db = admin.firestore(dbId);

    const tokensSnap = await db.collection('push_tokens').get();
    const tokens = tokensSnap.docs
      .map((entry) => entry.data())
      .filter((row) => typeof row.token === 'string' && row.token.length > 20 && row.userId !== senderUid)
      .map((row) => row.token);

    if (tokens.length === 0) {
      res.json({ success: false, reason: 'No registered push tokens' });
      return;
    }

    const isEmergency = level === 'emergency' || title.includes('SOS');
    
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: {
        url,
        type: isEmergency ? 'emergency' : 'ride',
      },
      android: {
        priority: 'high',
        ttl: 3600 * 1000,
        notification: {
          channelId: isEmergency ? 'emergency_alerts' : 'default',
          sound: 'default',
          priority: 'high',
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
            contentAvailable: true,
          },
        },
      },
    });

    res.json({
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error('notify-emergency error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = Number(process.env.PORT || 8080);
initFirebaseAdmin();
app.listen(port, () => {
  console.log(`RoadRacer backend listening on ${port}`);
});