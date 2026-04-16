"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyEmergency = exports.deleteMember = void 0;
const cors_1 = __importDefault(require("cors"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const options_1 = require("firebase-functions/v2/options");
(0, options_1.setGlobalOptions)({
    region: 'us-central1',
});
if (!admin.apps.length) {
    admin.initializeApp();
}
const corsHandler = (0, cors_1.default)({ origin: true });
function getBearerToken(req) {
    const raw = req.headers?.authorization || req.headers?.Authorization;
    if (typeof raw !== 'string')
        return null;
    const m = raw.match(/^Bearer\s+(.+)$/i);
    return m?.[1] || null;
}
async function requireAdmin(req) {
    const token = getBearerToken(req);
    if (!token) {
        const err = new Error('Missing Authorization Bearer token');
        err.status = 401;
        throw err;
    }
    const decoded = await admin.auth().verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase();
    const adminEmails = new Set(['luizcarloscv@msn.com']);
    if (!email || !adminEmails.has(email)) {
        const err = new Error('Not authorized');
        err.status = 403;
        throw err;
    }
    return { decoded, email };
}
async function requireAuth(req) {
    const token = getBearerToken(req);
    if (!token) {
        const err = new Error('Missing Authorization Bearer token');
        err.status = 401;
        throw err;
    }
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded;
}
exports.deleteMember = (0, https_1.onRequest)(async (req, res) => {
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
            }
            catch {
                // ignore
            }
            // Auth cleanup (this is what "frees" the email)
            try {
                await admin.auth().deleteUser(uid);
            }
            catch (err) {
                if (err?.code !== 'auth/user-not-found') {
                    throw err;
                }
            }
            res.json({ success: true });
        }
        catch (e) {
            const status = Number(e?.status || 500);
            res.status(status).json({ error: e?.message || 'Internal error' });
        }
    });
});
exports.notifyEmergency = (0, https_1.onRequest)(async (req, res) => {
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
                .filter((t) => typeof t === 'string' && t.length > 20);
            if (tokens.length === 0) {
                res.json({ success: false, reason: 'No tokens' });
                return;
            }
            const message = {
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
        }
        catch (e) {
            const status = Number(e?.status || 500);
            res.status(status).json({ error: e?.message || 'Internal error' });
        }
    });
});
