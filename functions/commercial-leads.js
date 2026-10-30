// Recebe leads comerciais da landing /anuncie/ e grava em Firestore (commercial_leads).
// Aberta ao público, porém: allow-list de origem, JSON obrigatório, limite de tamanho,
// honeypot, idempotência por UUID e limite transacional de 5 novas solicitações por IP/hora.
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const { validateLead } = require('./lead-schema');

if (!admin.apps.length) admin.initializeApp();

const allowedOrigins = new Set(['https://www.portalngbrasil.com.br', 'https://portalngbrasil.com.br']);
// Origens de teste só valem no emulador (FUNCTIONS_EMULATOR === 'true').
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
const isAllowed = (origin) => allowedOrigins.has(origin) || (isEmulator && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));

exports.receiveCommercialLead = onRequest({ region: 'southamerica-east1', maxInstances: 3, timeoutSeconds: 15 }, async (req, res) => {
  const db = admin.firestore();
  const { Timestamp } = admin.firestore;
  res.set('Cache-Control', 'no-store');
  const origin = req.get('origin');
  if (!origin || !isAllowed(origin)) return res.status(403).json({ error: 'Origem inválida.' });
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    return res.set('Access-Control-Allow-Methods', 'POST').set('Access-Control-Allow-Headers', 'Content-Type').status(204).end();
  }
  if (req.method !== 'POST') return res.set('Allow', 'POST').status(405).json({ error: 'Método não permitido.' });
  if (!req.is('application/json')) return res.status(415).json({ error: 'Formato inválido.' });
  if (req.rawBody && req.rawBody.byteLength > 12000) return res.status(413).json({ error: 'Briefing muito longo.' });

  const result = validateLead(req.body);
  if (result.error) return res.status(400).json({ error: result.error });

  const now = Timestamp.now();
  const bucket = Math.floor(now.toMillis() / 3600000);
  const hash = crypto.createHash('sha256').update(`${req.ip}:${bucket}`).digest('hex');
  const lead = db.collection('commercial_leads').doc(result.data.requestId);
  const limit = db.collection('commercial_rate_limits').doc(hash);

  try {
    await db.runTransaction(async (tx) => {
      const [existing, rate] = await Promise.all([tx.get(lead), tx.get(limit)]);
      if (existing.exists) return; // reenvio com o mesmo protocolo: idempotente
      const count = (rate.data() && rate.data().count) || 0;
      if (count >= 5) throw new Error('RATE_LIMIT');
      tx.create(lead, { ...result.data, createdAt: now, updatedAt: now, activity: [] });
      tx.set(limit, { count: count + 1, expiresAt: Timestamp.fromMillis(now.toMillis() + 86400000) });
    });
    return res.status(201).json({ id: result.data.requestId });
  } catch (err) {
    if (err.message === 'RATE_LIMIT') return res.status(429).json({ error: 'Muitas solicitações. Tente novamente mais tarde.' });
    console.error('Commercial lead persistence failed', { code: err.code || 'unknown' });
    return res.status(503).json({ error: 'Não foi possível salvar. Tente novamente.' });
  }
});
