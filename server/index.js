/**
 * ============================================================
 * DAINTY — Express Server  (server/index.js)
 * ============================================================
 * Handles:
 *  • Admin auth   — bcrypt password check + JWT httpOnly cookie
 *  • Products     — CRUD via JSON file DB
 *  • Orders       — create, list, status update
 *  • Messages     — live chat (customer ↔ admin)
 *  • Relworx      — payment proxy + webhook
 *  • Static files — serves dist/ (React SPA)
 * ============================================================
 */

import express        from 'express';
import bcrypt         from 'bcryptjs';
import jwt            from 'jsonwebtoken';
import cookieParser   from 'cookie-parser';
import { createHmac, timingSafeEqual } from 'node:crypto';
import path           from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getProducts, getProductById, saveProduct, deleteProduct,
  getOrders,   getOrderById,   saveOrder,   updateOrderStatus,
  getMessages, saveMessage,    getChats,
  resetDatabase,
} from '../api/db.mjs';

// ── Config ────────────────────────────────────────────────────
const PORT           = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'dev_secret_change_me_in_production';
const ADMIN_USER     = process.env.ADMIN_USERNAME  || 'admin';
const ADMIN_HASH     = process.env.ADMIN_PASSWORD_HASH || ''; // bcrypt hash in prod
const ADMIN_PASS_DEV = process.env.ADMIN_PASSWORD  || 'admin123'; // fallback for dev

const API_KEY    = process.env.RELWORX_API_KEY;
const ACCOUNT_NO = process.env.RELWORX_ACCOUNT_NO;
const WEBHOOK_KEY= process.env.RELWORX_WEBHOOK_KEY;
const BASE_URL   = (process.env.RELWORX_BASE_URL || 'https://payments.relworx.com/api').replace(/\/$/, '');
const WEBHOOK_URL= process.env.RELWORX_WEBHOOK_URL;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_PATH = path.join(__dirname, '..', 'dist');

// ── Express app ──────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ═══════════════════════════════════════════════════════════
// Admin Auth Helpers
// ═══════════════════════════════════════════════════════════

/** Verify password against bcrypt hash (prod) or plain env var (dev fallback). */
async function verifyPassword(plain) {
  if (ADMIN_HASH) {
    return bcrypt.compare(plain, ADMIN_HASH);
  }
  // Dev-only fallback: compare plain text
  return plain === ADMIN_PASS_DEV;
}

/** Middleware — require a valid admin JWT cookie. */
function requireAdmin(req, res, next) {
  const token = req.cookies.admin_session;
  if (!token) return res.status(401).json({ authenticated: false });
  try {
    req.admin = jwt.verify(token, SESSION_SECRET);
    next();
  } catch {
    return res.status(401).json({ authenticated: false });
  }
}

// ═══════════════════════════════════════════════════════════
// Admin Auth Routes
// ═══════════════════════════════════════════════════════════

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const usernameOk = username === ADMIN_USER;
  const passwordOk = await verifyPassword(password);

  if (!usernameOk || !passwordOk) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const token = jwt.sign({ role: 'admin' }, SESSION_SECRET, { expiresIn: '8h' });

  res.cookie('admin_session', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   8 * 60 * 60 * 1000, // 8 hours
  });

  return res.json({ success: true });
});

app.get('/api/admin/session', requireAdmin, (req, res) => {
  res.json({ authenticated: true, role: req.admin.role });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_session');
  res.json({ success: true });
});

// Reset (requires valid admin session)
app.post('/api/admin/reset', requireAdmin, (req, res) => {
  resetDatabase();
  res.json({ ok: true, message: 'Database reset to defaults.' });
});

// ═══════════════════════════════════════════════════════════
// Health
// ═══════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({ ok: true, relworxConfigured: Boolean(API_KEY && ACCOUNT_NO) });
});

// ═══════════════════════════════════════════════════════════
// Products
// ═══════════════════════════════════════════════════════════
app.get('/api/products', (req, res) => res.json(getProducts()));

app.get('/api/products/:id', (req, res) => {
  const p = getProductById(req.params.id);
  p ? res.json(p) : res.status(404).json({ error: 'Product not found.' });
});

app.post('/api/products', requireAdmin, (req, res) => {
  res.status(201).json(saveProduct(req.body));
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
  res.json(saveProduct({ ...req.body, id: req.params.id }));
});

app.patch('/api/products/:id', requireAdmin, (req, res) => {
  const existing = getProductById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });
  res.json(saveProduct({ ...existing, ...req.body, id: req.params.id }));
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
  deleteProduct(req.params.id);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════
// Orders
// ═══════════════════════════════════════════════════════════
app.get('/api/orders', requireAdmin, (req, res) => res.json(getOrders()));

app.get('/api/orders/:id', requireAdmin, (req, res) => {
  const o = getOrderById(req.params.id);
  o ? res.json(o) : res.status(404).json({ error: 'Order not found.' });
});

app.post('/api/orders', (req, res) => {
  // Public: customers create orders
  res.status(201).json(saveOrder(req.body));
});

app.patch('/api/orders/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  try {
    const updated = updateOrderStatus(req.params.id, status);
    updated ? res.json(updated) : res.status(404).json({ error: 'Order not found.' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/orders/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  try {
    const updated = updateOrderStatus(req.params.id, status);
    updated ? res.json(updated) : res.status(404).json({ error: 'Order not found.' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// Messages / Chat
// ═══════════════════════════════════════════════════════════
app.get('/api/messages', (req, res) => {
  res.json(getMessages(req.query.chat_id || null));
});

app.post('/api/messages', (req, res) => {
  const { chat_id, sender, content } = req.body || {};
  if (!chat_id || !sender || !String(content || '').trim()) {
    return res.status(400).json({ error: 'chat_id, sender, and content are required.' });
  }
  res.status(201).json(saveMessage(chat_id, sender, String(content).trim()));
});

app.get('/api/chats', requireAdmin, (req, res) => res.json(getChats()));

// ═══════════════════════════════════════════════════════════
// Relworx Payment Proxy
// ═══════════════════════════════════════════════════════════

async function relworxFetch(path, method = 'GET', payload) {
  if (!API_KEY || !ACCOUNT_NO) throw new Error('Relworx credentials not configured.');
  const r = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Accept:         'application/vnd.relworx.v2',
      Authorization:  `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(payload ? { body: JSON.stringify({ ...payload, account_no: ACCOUNT_NO }) } : {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || data.error || `Relworx HTTP ${r.status}`);
  return data;
}

function validWebhook(req, data) {
  if (!WEBHOOK_KEY || !WEBHOOK_URL) return false;
  const sig   = req.headers['relworx-signature'] || '';
  const parts = Object.fromEntries(sig.split(',').map(p => p.trim().split('=')));
  if (!parts.t || !parts.v || !/^\d+$/.test(parts.t)) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const selected = { status: data.status, customer_reference: data.customer_reference, internal_reference: data.internal_reference };
  const signed   = WEBHOOK_URL + parts.t + Object.keys(selected).sort().map(k => k + String(selected[k] ?? '')).join('');
  const expected = createHmac('sha256', WEBHOOK_KEY).update(signed).digest('hex');
  const a = Buffer.from(expected), b = Buffer.from(parts.v);
  return a.length === b.length && timingSafeEqual(a, b);
}

app.post('/api/relworx/webhook', (req, res) => {
  if (!validWebhook(req, req.body)) {
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }
  console.info('[Webhook]', JSON.stringify({
    status: req.body.status,
    ref:    req.body.customer_reference,
  }));
  res.json({ received: true });
});

app.post('/api/relworx/mobile-money/request-payment', async (req, res) => {
  const { msisdn, amount, reference, description } = req.body || {};
  if (!/^\+256\d{9}$/.test(msisdn || '') ||
      !Number.isFinite(Number(amount)) || Number(amount) < 500 ||
      !/^[A-Za-z0-9_-]{8,36}$/.test(reference || '')) {
    return res.status(400).json({ error: 'Invalid phone, amount, or reference.' });
  }
  try {
    const result = await relworxFetch('/mobile-money/request-payment', 'POST', {
      msisdn, amount: Number(amount), reference, currency: 'UGX',
      description: String(description || `DAINTY Order ${reference}`).slice(0, 100),
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/relworx/mobile-money/check-request-status', async (req, res) => {
  const ref = req.query.internal_reference;
  if (!ref || !/^[A-Za-z0-9_-]+$/.test(ref)) {
    return res.status(400).json({ error: 'Invalid internal reference.' });
  }
  try {
    const qs     = new URLSearchParams({ internal_reference: ref, account_no: ACCOUNT_NO || '' });
    const result = await relworxFetch(`/mobile-money/check-request-status?${qs}`);
    if ((result.status || '').toLowerCase() === 'success') result.status = 'successful';
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/relworx/mobile-money/validate-mobile-number', async (req, res) => {
  const { msisdn } = req.body || {};
  if (!/^\+256\d{9}$/.test(msisdn || '')) {
    return res.status(400).json({ error: 'Invalid Uganda mobile number.' });
  }
  try {
    res.json(await relworxFetch('/mobile-money/validate-mobile-number', 'POST', { msisdn }));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════
// Serve React SPA (dist/)
// ═══════════════════════════════════════════════════════════
app.use(express.static(DIST_PATH));

app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_PATH, 'index.html'));
});

// ═══════════════════════════════════════════════════════════
// Start
// ═══════════════════════════════════════════════════════════
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏆 DAINTY server → http://localhost:${PORT}`);
  console.log(`   Auth mode : ${ADMIN_HASH ? 'bcrypt hash' : 'plain env (dev)'}`);
  console.log(`   Relworx   : ${API_KEY ? '✅ configured' : '⚠️  not configured'}`);
});
