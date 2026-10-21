/**
 * ============================================================
 * DAINTY — Node.js HTTP Server  (api/server.mjs)
 * ============================================================
 * Serves:
 *   • /api/products/*      — product catalog CRUD
 *   • /api/orders/*        — order management
 *   • /api/messages/*      — live-chat messages
 *   • /api/chats           — chat thread list
 *   • /api/admin/*         — admin auth + reset
 *   • /api/relworx/*       — Relworx payment proxy
 *   • /api/health          — health check
 *   • /*  (GET)            — React SPA static files from dist/
 * ============================================================
 */

import { createServer }              from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile, stat }            from 'node:fs/promises';
import { join, extname, dirname }    from 'node:path';
import { fileURLToPath }             from 'node:url';

// Database
import {
  getProducts, getProductById, saveProduct, deleteProduct,
  getOrders, getOrderById, saveOrder, updateOrderStatus,
  getMessages, saveMessage, getChats,
  verifyAdminPassword, resetDatabase,
} from './db.mjs';

// ── Config ───────────────────────────────────────────────────
const PORT       = Number(process.env.PORT || process.env.API_PORT || 8787);
const API_KEY    = process.env.RELWORX_API_KEY;
const ACCOUNT_NO = process.env.RELWORX_ACCOUNT_NO;
const WEBHOOK_KEY= process.env.RELWORX_WEBHOOK_KEY;
const BASE_URL   = (process.env.RELWORX_BASE_URL || 'https://payments.relworx.com/api').replace(/\/$/, '');
const WEBHOOK_URL= process.env.RELWORX_WEBHOOK_URL;

// Admin credentials (username is always "admin")
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const DIST_DIR   = join(__dirname, '..', 'dist');

// ── MIME types ───────────────────────────────────────────────
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
};

// ── Helpers ──────────────────────────────────────────────────
function send(res, status, data) {
  res.writeHead(status, {
    'content-type':  'application/json',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*', // dev convenience; tighten in prod if needed
  });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 524_288) throw new Error('Request body too large'); // 512 KB
  }
  return raw ? JSON.parse(raw) : {};
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let filePath = join(DIST_DIR, url.pathname);
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(DIST_DIR, 'index.html'); // SPA fallback
  }
  try {
    const content     = await readFile(filePath);
    const ext         = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isHashed    = /\/assets\//.test(url.pathname);
    res.writeHead(200, {
      'content-type':  contentType,
      'cache-control': isHashed ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    res.end(content);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }
}

// ── Relworx helpers ──────────────────────────────────────────
async function relworxFetch(path, method = 'GET', payload) {
  if (!API_KEY || !ACCOUNT_NO) throw new Error('Relworx credentials not configured.');
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Accept:         'application/vnd.relworx.v2',
      Authorization:  `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(payload ? { body: JSON.stringify({ ...payload, account_no: ACCOUNT_NO }) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Relworx HTTP ${res.status}`);
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

// ═══════════════════════════════════════════════════════════
// HTTP Server
// ═══════════════════════════════════════════════════════════
createServer(async (req, res) => {
  const url    = new URL(req.url, 'http://localhost');
  const path   = url.pathname;
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin':  '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
    });
    return res.end();
  }

  // ── API Routes ─────────────────────────────────────────────
  if (path.startsWith('/api/')) {
    try {

      // ── Health ────────────────────────────────────────────
      if (method === 'GET' && path === '/api/health') {
        return send(res, 200, { ok: true, relworxConfigured: Boolean(API_KEY && ACCOUNT_NO) });
      }

      // ── Admin Login ───────────────────────────────────────
      if (method === 'POST' && path === '/api/admin/login') {
        const { username, password } = await readJson(req);
        if (username === ADMIN_USER && verifyAdminPassword(password)) {
          return send(res, 200, { ok: true });
        }
        return send(res, 401, { error: 'Invalid credentials.' });
      }

      // ── Admin Reset ───────────────────────────────────────
      if (method === 'POST' && path === '/api/admin/reset') {
        const { password } = await readJson(req);
        if (!verifyAdminPassword(password)) return send(res, 401, { error: 'Unauthorised.' });
        resetDatabase();
        return send(res, 200, { ok: true, message: 'Database reset. Restart server to re-seed.' });
      }

      // ── Products — GET all ────────────────────────────────
      if (method === 'GET' && path === '/api/products') {
        return send(res, 200, getProducts());
      }

      // ── Products — GET one ────────────────────────────────
      if (method === 'GET' && path.startsWith('/api/products/')) {
        const id = path.split('/')[3];
        const p  = getProductById(id);
        return p ? send(res, 200, p) : send(res, 404, { error: 'Product not found.' });
      }

      // ── Products — CREATE ─────────────────────────────────
      if (method === 'POST' && path === '/api/products') {
        const body = await readJson(req);
        const saved = saveProduct(body);
        return send(res, 201, saved);
      }

      // ── Products — UPDATE ─────────────────────────────────
      if ((method === 'PUT' || method === 'PATCH') && path.startsWith('/api/products/')) {
        const id   = path.split('/')[3];
        const body = await readJson(req);
        const saved = saveProduct({ ...body, id });
        return send(res, 200, saved);
      }

      // ── Products — DELETE ─────────────────────────────────
      if (method === 'DELETE' && path.startsWith('/api/products/')) {
        const id = path.split('/')[3];
        deleteProduct(id);
        return send(res, 200, { ok: true });
      }

      // ── Orders — GET all ──────────────────────────────────
      if (method === 'GET' && path === '/api/orders') {
        return send(res, 200, getOrders());
      }

      // ── Orders — GET one ──────────────────────────────────
      if (method === 'GET' && path.startsWith('/api/orders/')) {
        const id = path.split('/')[3];
        const o  = getOrderById(id);
        return o ? send(res, 200, o) : send(res, 404, { error: 'Order not found.' });
      }

      // ── Orders — CREATE ───────────────────────────────────
      if (method === 'POST' && path === '/api/orders') {
        const body     = await readJson(req);
        const newOrder = saveOrder(body);
        return send(res, 201, newOrder);
      }

      // ── Orders — UPDATE STATUS ────────────────────────────
      if ((method === 'PATCH' || method === 'PUT') && path.startsWith('/api/orders/') && path.endsWith('/status')) {
        const id     = path.split('/')[3];
        const { status } = await readJson(req);
        const updated = updateOrderStatus(id, status);
        return updated ? send(res, 200, updated) : send(res, 404, { error: 'Order not found.' });
      }

      // ── Messages — GET (all, or by chatId) ───────────────
      if (method === 'GET' && path === '/api/messages') {
        const chatId = url.searchParams.get('chat_id');
        return send(res, 200, getMessages(chatId));
      }

      // ── Messages — POST ───────────────────────────────────
      if (method === 'POST' && path === '/api/messages') {
        const { chat_id, sender, content } = await readJson(req);
        if (!chat_id || !sender || !content?.trim()) {
          return send(res, 400, { error: 'chat_id, sender, and content are required.' });
        }
        const msg = saveMessage(chat_id, sender, content.trim());
        return send(res, 201, msg);
      }

      // ── Chats — GET list ──────────────────────────────────
      if (method === 'GET' && path === '/api/chats') {
        return send(res, 200, getChats());
      }

      // ── Relworx — Webhook ─────────────────────────────────
      if (method === 'POST' && path === '/api/relworx/webhook') {
        const data = await readJson(req);
        if (!validWebhook(req, data)) return send(res, 401, { error: 'Invalid webhook signature.' });
        console.info('[Webhook] Relworx event:', JSON.stringify({
          status: data.status,
          customer_reference: data.customer_reference,
          internal_reference: data.internal_reference,
        }));
        return send(res, 200, { received: true });
      }

      // ── Relworx — Request Payment ─────────────────────────
      if (method === 'POST' && path === '/api/relworx/mobile-money/request-payment') {
        const { msisdn, amount, reference, description } = await readJson(req);
        if (!/^\+256\d{9}$/.test(msisdn || '') ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) < 500 || Number(amount) > 5_000_000 ||
            !/^[A-Za-z0-9_-]{8,36}$/.test(reference || '')) {
          return send(res, 400, { error: 'Invalid phone, amount, or reference.' });
        }
        const result = await relworxFetch('/mobile-money/request-payment', 'POST', {
          msisdn, amount: Number(amount), reference,
          currency: 'UGX',
          description: String(description || `DAINTY Order ${reference}`).slice(0, 100),
        });
        return send(res, 200, result);
      }

      // ── Relworx — Check Status ────────────────────────────
      if (method === 'GET' && path === '/api/relworx/mobile-money/check-request-status') {
        const ref = url.searchParams.get('internal_reference');
        if (!ref || !/^[A-Za-z0-9_-]+$/.test(ref)) return send(res, 400, { error: 'Invalid internal reference.' });
        const qs     = new URLSearchParams({ internal_reference: ref, account_no: ACCOUNT_NO || '' });
        const result = await relworxFetch(`/mobile-money/check-request-status?${qs}`);
        if ((result.status || '').toLowerCase() === 'success') result.status = 'successful';
        return send(res, 200, result);
      }

      // ── Relworx — Validate Number ─────────────────────────
      if (method === 'POST' && path === '/api/relworx/mobile-money/validate-mobile-number') {
        const { msisdn } = await readJson(req);
        if (!/^\+256\d{9}$/.test(msisdn || '')) return send(res, 400, { error: 'Invalid Uganda mobile number.' });
        return send(res, 200, await relworxFetch('/mobile-money/validate-mobile-number', 'POST', { msisdn }));
      }

      return send(res, 404, { error: 'API route not found.' });

    } catch (err) {
      console.error('[API Error]', err.message);
      return send(res, 500, { error: err.message || 'Internal server error.' });
    }
  }

  // ── Static File Serving ────────────────────────────────────
  if (method === 'GET' || method === 'HEAD') {
    return serveStatic(req, res);
  }

  send(res, 405, { error: 'Method not allowed.' });

}).listen(PORT, () => {
  console.log(`🏆 DAINTY server running → http://localhost:${PORT}`);
  console.log(`   Database → data/dainty.db`);
  console.log(`   Relworx  → ${API_KEY ? '✅ configured' : '⚠️  not configured (set RELWORX_API_KEY)'}`);
});
