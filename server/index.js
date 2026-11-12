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
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  getProducts, getProductById, saveProduct, deleteProduct, saveProductsBatch,
  getOrders,   getOrderById,   saveOrder,   updateOrderStatus,
  getMessages, saveMessage,    getChats,
  resetDatabase,
} from '../api/db.mjs';

// ── Config ────────────────────────────────────────────────────
const isAiStudio     = Boolean(process.env.K_SERVICE || process.env.AI_STUDIO_APPLET_ID);
const PORT           = isAiStudio ? 3000 : Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'dainty_dev_session_secret_32_bytes_super_secure';
const ADMIN_USER     = process.env.ADMIN_USERNAME  || 'admin';
let ADMIN_HASH       = process.env.ADMIN_PASSWORD_HASH || '';

if (!ADMIN_HASH) {
  // Generate bcrypt hash for default admin password 'admin123' so dev server never crashes
  ADMIN_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
  console.info('[Server] Default admin credentials active (user: admin, pass: admin123).');
}

const API_KEY    = process.env.RELWORX_API_KEY;
const ACCOUNT_NO = process.env.RELWORX_ACCOUNT_NO;
const _WEBHOOK_KEY = process.env.RELWORX_WEBHOOK_KEY;
const BASE_URL   = (process.env.RELWORX_BASE_URL || 'https://payments.relworx.com/api').replace(/\/$/, '');
const WEBHOOK_URL= process.env.RELWORX_WEBHOOK_URL;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Find the built SPA: repo layout (<root>/dist), or Hostinger layout where the
// server is bundled into dist/server.js and sits next to index.html.
const DIST_PATH = [
  path.join(__dirname, '..', 'dist'),
  __dirname,
  path.join(__dirname, '..'),
].find(p => existsSync(path.join(p, 'index.html'))) || path.join(__dirname, '..', 'dist');

// ── Express app ──────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// ═══════════════════════════════════════════════════════════
// Admin Auth Helpers
// ═══════════════════════════════════════════════════════════

/** Verify password against bcrypt hash stored in ADMIN_PASSWORD_HASH. */
async function verifyPassword(plain) {
  if (!ADMIN_HASH) return false; // refuse login if hash is not configured
  return bcrypt.compare(plain, ADMIN_HASH);
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
  if (p) {
    res.json(p);
  } else {
    res.status(404).json({ error: 'Product not found.' });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const saved = saveProduct(req.body);
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/products/batch', (req, res) => {
  try {
    const items = req.body.products || req.body;
    const saved = saveProductsBatch(items);
    res.json({ success: true, count: saved.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/products/reset', (req, res) => {
  try {
    const customList = Array.isArray(req.body) && req.body.length > 0 ? req.body : null;
    resetDatabase(customList);
    res.json({ ok: true, message: 'Database reset to defaults.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  res.json(saveProduct({ ...req.body, id: req.params.id }));
});

app.patch('/api/products/:id', (req, res) => {
  const existing = getProductById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });
  res.json(saveProduct({ ...existing, ...req.body, id: req.params.id }));
});

app.delete('/api/products/:id', (req, res) => {
  deleteProduct(req.params.id);
  res.json({ ok: true, deletedId: req.params.id });
});

// ═══════════════════════════════════════════════════════════
// Orders
// ═══════════════════════════════════════════════════════════
app.get('/api/orders', (req, res) => res.json(getOrders()));

app.get('/api/orders/:id', (req, res) => {
  const o = getOrderById(req.params.id);
  if (o) {
    res.json(o);
  } else {
    res.status(404).json({ error: 'Order not found.' });
  }
});

app.post('/api/orders', (req, res) => {
  // Public: customers create orders
  res.status(201).json(saveOrder(req.body));
});

app.patch('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  try {
    const updated = updateOrderStatus(req.params.id, status);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Order not found.' });
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/orders/:id/status', (req, res) => {
  const { status } = req.body;
  try {
    const updated = updateOrderStatus(req.params.id, status);
    if (updated) {
      res.json(updated);
    } else {
      res.status(404).json({ error: 'Order not found.' });
    }
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

app.get('/api/chats', (req, res) => res.json(getChats()));

// ═══════════════════════════════════════════════════════════
// Relworx Payment Proxy & Configuration
// ═══════════════════════════════════════════════════════════

const simulatedPayments = new Map();

function getPaymentConfig() {
  const file = path.join(__dirname, '..', 'api', 'payment_config.json');
  if (existsSync(file)) {
    try {
      return JSON.parse(readFileSync(file, 'utf-8'));
    } catch {}
  }
  return {
    mode: 'sandbox',
    account_no: 'REL11AE925B85',
    api_key: '',
    webhook_key: '',
    mtn_merchant_number: '+256788227027',
    airtel_merchant_number: '+256759924291',
    currency: 'UGX'
  };
}

function savePaymentConfig(cfg) {
  const file = path.join(__dirname, '..', 'api', 'payment_config.json');
  writeFileSync(file, JSON.stringify(cfg, null, 2), 'utf-8');
}

app.get('/api/payment/config', (req, res) => {
  const cfg = getPaymentConfig();
  const key = process.env.RELWORX_API_KEY || cfg.api_key || '';
  const acct = process.env.RELWORX_ACCOUNT_NO || cfg.account_no || 'REL11AE925B85';
  const masked = key ? `${key.substring(0, 5)}••••••••${key.slice(-4)}` : '';
  res.json({
    ok: true,
    mode: cfg.mode || 'sandbox',
    account_no: acct,
    api_key_masked: masked,
    has_api_key: Boolean(key),
    webhook_key_set: Boolean(process.env.RELWORX_WEBHOOK_KEY || cfg.webhook_key),
    mtn_merchant_number: cfg.mtn_merchant_number || '+256788227027',
    airtel_merchant_number: cfg.airtel_merchant_number || '+256759924291',
    currency: 'UGX',
    is_live_ready: Boolean(key && acct),
    status_label: (cfg.mode === 'live' && key) ? 'Live Relworx Gateway Active' : 'Sandbox / Test Mode Active'
  });
});

app.post('/api/payment/config', (req, res) => {
  const existing = getPaymentConfig();
  const body = req.body || {};
  const updated = {
    mode: body.mode === 'live' ? 'live' : 'sandbox',
    account_no: (body.account_no || existing.account_no || 'REL11AE925B85').trim(),
    api_key: (body.api_key && !body.api_key.includes('••••')) ? body.api_key.trim() : existing.api_key,
    webhook_key: (body.webhook_key && !body.webhook_key.includes('••••')) ? body.webhook_key.trim() : existing.webhook_key,
    mtn_merchant_number: (body.mtn_merchant_number || existing.mtn_merchant_number || '+256788227027').trim(),
    airtel_merchant_number: (body.airtel_merchant_number || existing.airtel_merchant_number || '+256759924291').trim(),
    currency: 'UGX',
    updated_at: new Date().toISOString()
  };
  savePaymentConfig(updated);
  res.json({
    success: true,
    message: 'Relworx payment gateway settings updated and persisted successfully.',
    mode: updated.mode,
    is_live_ready: Boolean(updated.api_key && updated.account_no)
  });
});

app.post('/api/payment/test', async (req, res) => {
  const cfg = getPaymentConfig();
  const key = process.env.RELWORX_API_KEY || cfg.api_key || '';
  const acct = process.env.RELWORX_ACCOUNT_NO || cfg.account_no || '';

  if (!key || !acct) {
    return res.json({
      ok: true,
      mode: 'sandbox',
      message: 'Currently running in Sandbox/Demo mode. Customer checkouts simulate USSD prompt approval and complete seamlessly. Enter live credentials whenever you wish to activate real Mobile Money collection.'
    });
  }

  try {
    const testRes = await relworxFetch('/mobile-money/validate-mobile-number', 'POST', {
      msisdn: '+256788227027'
    });
    res.json({
      ok: true,
      mode: cfg.mode || 'sandbox',
      message: 'Relworx API connectivity and credentials verified successfully with official Relworx servers.',
      details: testRes
    });
  } catch (err) {
    res.json({
      ok: false,
      error: err.message || 'Could not verify credentials with Relworx servers. Please verify your API Key and Account Number.'
    });
  }
});

async function relworxFetch(path, method = 'GET', payload) {
  const cfg = getPaymentConfig();
  const activeKey = process.env.RELWORX_API_KEY || cfg.api_key;
  const activeAcct = process.env.RELWORX_ACCOUNT_NO || cfg.account_no;
  if (!activeKey || !activeAcct) throw new Error('Relworx credentials not configured.');
  const r = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Accept:         'application/vnd.relworx.v2',
      Authorization:  `Bearer ${activeKey}`,
      'Content-Type': 'application/json',
    },
    ...(payload ? { body: JSON.stringify({ ...payload, account_no: activeAcct }) } : {}),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || data.error || `Relworx HTTP ${r.status}`);
  return data;
}

function validWebhook(req, data) {
  const cfg = getPaymentConfig();
  const activeWebhookKey = process.env.RELWORX_WEBHOOK_KEY || cfg.webhook_key;
  if (!activeWebhookKey || !WEBHOOK_URL) return false;
  const sig   = req.headers['relworx-signature'] || '';
  const parts = Object.fromEntries(sig.split(',').map(p => p.trim().split('=')));
  if (!parts.t || !parts.v || !/^\d+$/.test(parts.t)) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const selected = { status: data.status, customer_reference: data.customer_reference, internal_reference: data.internal_reference };
  const signed   = WEBHOOK_URL + parts.t + Object.keys(selected).sort().map(k => k + String(selected[k] ?? '')).join('');
  const expected = createHmac('sha256', activeWebhookKey).update(signed).digest('hex');
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
      !/^[A-Za-z0-9_-]{6,64}$/.test(reference || '')) {
    return res.status(400).json({ error: 'Invalid phone, amount, or reference.' });
  }

  const cfg = getPaymentConfig();
  const key = process.env.RELWORX_API_KEY || cfg.api_key;
  const isLive = (cfg.mode === 'live') && Boolean(key && cfg.account_no);

  if (isLive) {
    try {
      const result = await relworxFetch('/mobile-money/request-payment', 'POST', {
        msisdn, amount: Number(amount), reference, currency: 'UGX',
        description: String(description || `DAINTY Order ${reference}`).slice(0, 100),
      });
      return res.json(result);
    } catch (e) {
      return res.status(400).json({ success: false, error: e.message });
    }
  }

  // Simulation mode
  const simInternalRef = `RWX_SIM_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  simulatedPayments.set(simInternalRef, {
    reference, msisdn, amount: Number(amount), status: 'pending', createdAt: Date.now()
  });

  res.json({
    success: true,
    message: 'USSD prompt dispatched to phone. Please enter your Mobile Money PIN on your handset to approve.',
    internal_reference: simInternalRef,
    simulated: true,
    mode: 'sandbox'
  });
});

app.get('/api/relworx/mobile-money/check-request-status', async (req, res) => {
  const ref = req.query.internal_reference;
  if (!ref || !/^[A-Za-z0-9_-]+$/.test(ref)) {
    return res.status(400).json({ error: 'Invalid internal reference.' });
  }

  if (ref.startsWith('RWX_SIM_') || simulatedPayments.has(ref)) {
    const item = simulatedPayments.get(ref) || { createdAt: Date.now() - 5000 };
    const elapsed = Date.now() - item.createdAt;
    if (elapsed < 3500) {
      return res.json({
        status: 'pending',
        message: 'Waiting for PIN approval on customer handset...',
        internal_reference: ref,
        simulated: true
      });
    }
    item.status = 'successful';
    simulatedPayments.set(ref, item);
    return res.json({
      status: 'successful',
      message: 'Payment confirmed successfully via Mobile Money PIN authorization.',
      internal_reference: ref,
      simulated: true
    });
  }

  try {
    const cfg = getPaymentConfig();
    const acct = process.env.RELWORX_ACCOUNT_NO || cfg.account_no || '';
    const qs = new URLSearchParams({ internal_reference: ref, account_no: acct });
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
  const cfg = getPaymentConfig();
  if (cfg.mode === 'live' && (process.env.RELWORX_API_KEY || cfg.api_key)) {
    try {
      return res.json(await relworxFetch('/mobile-money/validate-mobile-number', 'POST', { msisdn }));
    } catch {
      // Fall through to regex
    }
  }
  const prefix = msisdn.substring(4, 6);
  const isMtn = ['77', '78', '76', '31', '39'].includes(prefix);
  const isAirtel = ['70', '74', '75', '56', '57'].includes(prefix);
  res.json({
    valid: isMtn || isAirtel,
    msisdn,
    network: isMtn ? 'MTN' : (isAirtel ? 'AIRTEL' : 'UNKNOWN')
  });
});

// ═══════════════════════════════════════════════════════════
// Frontend Serving (Static in production / Vite in development)
// ═══════════════════════════════════════════════════════════
const canUseVite = process.env.NODE_ENV !== 'production' && existsSync(path.join(__dirname, '..', 'vite.config.js'));

if (canUseVite) {
  let viteMiddleware = null;
  import('vite').then(({ createServer: createViteServer }) => {
    return createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
  }).then(vite => {
    viteMiddleware = vite.middlewares;
    console.log('[Server] Vite dev middleware initialized.');
  }).catch(err => {
    console.warn('[Server] Could not initialize Vite middleware:', err.message);
  });

  // Delegate to Vite dev server in development
  app.use((req, res, next) => {
    if (viteMiddleware) {
      return viteMiddleware(req, res, next);
    }
    next();
  });
}

// Serve built React SPA (dist/)
app.use(express.static(DIST_PATH));

// SPA fallback — middleware form works in both Express 4 and 5
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
  res.sendFile(path.join(DIST_PATH, 'index.html'), err => err && next(err));
});

process.on('uncaughtException',  e => console.error('[Fatal] uncaughtException:', e));
process.on('unhandledRejection', e => console.error('[Fatal] unhandledRejection:', e));

// ═══════════════════════════════════════════════════════════
// Start — bind to Hostinger-assigned PORT on all interfaces
// ═══════════════════════════════════════════════════════════
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`   Auth mode : bcrypt hash`);
  console.log(`   Relworx   : ${API_KEY ? 'configured' : 'not configured'}`);
}).on('error', e => console.error('[Fatal] listen failed:', e));
