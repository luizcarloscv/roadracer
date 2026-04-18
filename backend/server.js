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
  return String(value).trim();
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
    projectId
  });
  
  console.log(`Firebase Admin inicializado para o projeto: ${projectId}`);
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Erro de Autenticação:", error.message);
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function isAdminEmail(email) {
  const raw = process.env.ADMIN_EMAILS || 'luizcarloscv@msn.com';
  const allowed = raw.split(',').map(i => i.trim().toLowerCase());
  return allowed.includes((email || '').toLowerCase());
}

app.get('/health', (_, res) => {
  res.json({ 
    ok: true, 
    databaseId: process.env.FIREBASE_DATABASE_ID || '(default)',
    projectId: process.env.FIREBASE_PROJECT_ID 
  });
});

app.post('/delete-member', requireAuth, async (req, res) => {
  try {
    if (!isAdminEmail(req.user.email)) {
      return res.status(403).json({ error: 'Acesso negado: Apenas administradores podem excluir membros.' });
    }

    const uid = String(req.body?.uid || '').trim();
    if (!uid) return res.status(400).json({ error: 'UID não fornecido' });

    const dbId = process.env.FIREBASE_DATABASE_ID || '(default)';
    const db = getFirestore(dbId);
    
    console.log(`[DELETE] Iniciando exclusão do UID: ${uid} no banco: ${dbId}`);

    // 1. Verificar se o documento existe antes de apagar
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      console.log(`[WARN] Documento users/${uid} não encontrado no banco ${dbId}`);
      return res.json({ 
        success: true, 
        message: `O usuário não foi encontrado no banco de dados (${dbId}), mas o comando foi processado.` 
      });
    }

    // 2. Executar exclusões em paralelo
    const results = await Promise.allSettled([
      db.collection('users').doc(uid).delete(),
      db.collection('members').doc(uid).delete(),
      db.collection('push_tokens').doc(uid).delete(),
      admin.auth().deleteUser(uid).catch(err => {
        if (err.code === 'auth/user-not-found') return null;
        throw err;
      })
    ]);

    console.log(`[SUCCESS] UID ${uid} excluído com sucesso.`);

    res.json({ 
      success: true, 
      message: "Membro e conta de acesso excluídos permanentemente." 
    });

  } catch (error) {
    console.error('[ERROR] Falha na exclusão:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/notify-emergency', requireAuth, async (req, res) => {
  try {
    const { title, body, url, senderUid } = req.body;
    const dbId = process.env.FIREBASE_DATABASE_ID || '(default)';
    const db = getFirestore(dbId);

    const tokensSnap = await db.collection('push_tokens').get();
    const tokens = tokensSnap.docs
      .map(d => d.data())
      .filter(d => d.token && d.userId !== senderUid)
      .map(d => d.token);

    if (tokens.length > 0) {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data: { url: String(url) },
        android: { priority: 'high' }
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initFirebaseAdmin();
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => console.log(`Backend rodando na porta ${port}`));