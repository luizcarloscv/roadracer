import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

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
    projectId // Garante que o ID do projeto esteja explícito
  });
  
  console.log("Firebase Admin inicializado com sucesso.");
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
    console.error("Auth Error:", error.message);
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
  res.json({ 
    ok: true, 
    databaseId: process.env.FIREBASE_DATABASE_ID || '(default)',
    projectId: process.env.FIREBASE_PROJECT_ID 
  });
});

app.post('/delete-member', requireAuth, requireAdmin, async (req, res) => {
  try {
    const uid = String(req.body?.uid || '').trim();
    if (!uid) {
      res.status(400).json({ error: 'Missing uid' });
      return;
    }

    const dbId = process.env.FIREBASE_DATABASE_ID || '(default)';
    // Usando getFirestore(dbId) que é a forma correta para bancos nomeados
    const db = getFirestore(dbId);
    
    console.log(`Tentando excluir UID: ${uid} no banco: ${dbId}`);

    // Verifica se o usuário existe antes de tentar apagar (para debug)
    const userDoc = await db.doc(`users/${uid}`).get();
    if (!userDoc.exists) {
      console.warn(`Aviso: Documento users/${uid} não encontrado no banco ${dbId}`);
    }

    // Executa as exclusões
    const results = await Promise.allSettled([
      db.doc(`users/${uid}`).delete(),
      db.doc(`members/${uid}`).delete(),
      db.doc(`push_tokens/${uid}`).delete(),
      admin.auth().deleteUser(uid).catch(err => {
        if (err.code === 'auth/user-not-found') return null;
        throw err;
      })
    ]);

    const errors = results.filter(r => r.status === 'rejected');
    if (errors.length > 0) {
      console.error("Algumas operações falharam:", errors);
    }

    res.json({ 
      success: true, 
      found: userDoc.exists,
      message: userDoc.exists ? "Membro excluído" : "Membro não encontrado no Firestore, mas comando processado"
    });
  } catch (error) {
    console.error('delete-member error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/notify-emergency', requireAuth, async (req, res) => {
  try {
    const { title, body, url, level, senderUid } = req.body;
    const dbId = process.env.FIREBASE_DATABASE_ID || '(default)';
    const db = getFirestore(dbId);

    const tokensSnap = await db.collection('push_tokens').get();
    const tokens = tokensSnap.docs
      .map((entry) => entry.data())
      .filter((row) => typeof row.token === 'string' && row.token.length > 20 && row.userId !== senderUid)
      .map((row) => row.token);

    if (tokens.length === 0) {
      res.json({ success: false, reason: 'No registered push tokens' });
      return;
    }

    const isEmergency = level === 'emergency' || String(title).includes('SOS');
    
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: String(title), body: String(body) },
      data: { url: String(url), type: isEmergency ? 'emergency' : 'ride' },
      android: {
        priority: 'high',
        notification: {
          channelId: isEmergency ? 'emergency_alerts' : 'default',
          sound: 'default',
        },
      },
    });

    res.json({ success: response.successCount > 0, count: response.successCount });
  } catch (error) {
    console.error('notify-emergency error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = Number(process.env.PORT || 8080);
initFirebaseAdmin();
app.listen(port, '0.0.0.0', () => {
  console.log(`RoadRacer backend listening on ${port}`);
});