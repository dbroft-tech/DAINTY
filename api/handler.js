import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const POSSIBLE_PERSISTENT_DIRS = [
  process.env.DATA_DIR,
  '/home/u111258626/domains/daintystudsandchains.com/dainty_data',
  resolve(__dirname, '../data'),
  resolve(__dirname, '../../dainty_data'),
  resolve(__dirname, 'data'),
  __dirname
].filter(Boolean);


// Helper to read and write database with persistent mirroring
function sanitizeImages(all) {
  if (!Array.isArray(all)) return [];
  return all.map(p => {
    if (!p) return p;
    if (Array.isArray(p.images)) {
      p.images = p.images.map(img => {
        if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://') || img.includes('unsplash.com'))) {
          return '/images/vi.jpeg';
        }
        return img;
      });
    }
    return p;
  });
}

function getDeletedIds() {
  for (const dir of POSSIBLE_PERSISTENT_DIRS) {
    try {
      if (existsSync(dir)) {
        const target = resolve(dir, 'deleted_ids.json');
        if (existsSync(target)) {
          const content = readFileSync(target, 'utf-8');
          return JSON.parse(content);
        }
      }
    } catch {}
  }
  return [];
}

function saveDeletedIds(ids) {
  let saved = false;
  for (const dir of POSSIBLE_PERSISTENT_DIRS) {
    try {
      if (existsSync(dir)) {
        const target = resolve(dir, 'deleted_ids.json');
        writeFileSync(target, JSON.stringify(ids, null, 2), 'utf-8');
        saved = true;
      }
    } catch {}
  }
  return saved;
}

function getDbProducts() {
  const deletedSet = new Set(getDeletedIds());
  for (const dir of POSSIBLE_PERSISTENT_DIRS) {
    try {
      if (existsSync(dir)) {
        const target = resolve(dir, 'products_db.json');
        if (existsSync(target)) {
          const content = readFileSync(target, 'utf-8');
          const all = JSON.parse(content);
          if (Array.isArray(all)) {
            const sanitized = sanitizeImages(all);
            return sanitized.filter(p => p && p.id && !deletedSet.has(p.id));
          }
        }
      }
    } catch {}
  }
  return [];
}

function saveDbProducts(products) {
  let saved = false;
  for (const dir of POSSIBLE_PERSISTENT_DIRS) {
    try {
      if (existsSync(dir)) {
        const target = resolve(dir, 'products_db.json');
        writeFileSync(target, JSON.stringify(products, null, 2), 'utf-8');
        saved = true;
      }
    } catch {}
  }
  return saved;
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 15_000_000) throw new Error('Request body too large');
  }
  return raw ? JSON.parse(raw) : {};
}

function send(res, status, data) {
  res.writeHead(status, { 
    'content-type': 'application/json', 
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

async function callRelworx(path, method = 'GET', payload, { apiKey, accountNo, baseUrl }) {
  if (!apiKey || !accountNo) {
    throw new Error('Relworx server credentials are not configured. Set RELWORX_API_KEY and RELWORX_ACCOUNT_NO.');
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.relworx.v2',
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    ...(payload ? { body: JSON.stringify({ ...payload, account_no: accountNo }) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `Relworx HTTP ${response.status}`);
  return data;
}

function validWebhook(req, data, { webhookKey, webhookUrl }) {
  if (!webhookKey || !webhookUrl) return false;
  const signatureHeader = req.headers['relworx-signature'] || '';
  const parts = Object.fromEntries(signatureHeader.split(',').map(part => part.trim().split('=')));
  if (!parts.t || !parts.v || !/^\d+$/.test(parts.t)) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const selected = { status: data.status, customer_reference: data.customer_reference, internal_reference: data.internal_reference };
  const signed = webhookUrl + parts.t + Object.keys(selected).sort().map(key => key + String(selected[key] ?? '')).join('');
  const expected = createHmac('sha256', webhookKey).update(signed).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function handleApiRequest(req, res, customEnv = {}) {
  const env = { ...process.env, ...customEnv };
  const API_KEY = env.RELWORX_API_KEY;
  const ACCOUNT_NO = env.RELWORX_ACCOUNT_NO;
  const WEBHOOK_KEY = env.RELWORX_WEBHOOK_KEY;
  const BASE_URL = (env.RELWORX_BASE_URL || 'https://payments.relworx.com/api').replace(/\/$/, '');
  const WEBHOOK_URL = env.RELWORX_WEBHOOK_URL;

  const url = new URL(req.url, 'http://localhost');
  const pathname = (url.pathname || '/').replace(/\/+$/, '') || '/';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization, X-Requested-With'
    });
    res.end();
    return;
  }

  try {
    // =========================================================================
    // DATABASE STATUS & HEALTH ENDPOINTS (Fixes Hostinger /api/database/status)
    // =========================================================================
    if (pathname === '/api/database/status' || pathname === '/api/db_status' || pathname === '/api/status') {
      const prods = getDbProducts();
      return send(res, 200, {
        status: 'connected',
        driver: 'Node.js 22 Hostinger Persistent Server Database',
        products_count: prods.length,
        persistent: true,
        online: true,
        timestamp: new Date().toISOString()
      });
    }

    if ((req.method === 'POST' || req.method === 'PUT') && (pathname === '/api/database/config' || pathname === '/api/db_config')) {
      const config = await readJson(req);
      try {
        const publicConfigPath = resolve(__dirname, '../public/api/db_config.json');
        writeFileSync(publicConfigPath, JSON.stringify(config, null, 2), 'utf-8');
      } catch (err) {
        console.warn('Could not write public/api/db_config.json:', err);
      }
      return send(res, 200, {
        success: true,
        message: 'Database configuration saved successfully.'
      });
    }

    // =========================================================================
    // PRODUCTS DATABASE REST ENDPOINTS (GET, POST, PUT, DELETE, RESET)
    // =========================================================================
    
    // GET /api/products -> Retrieve all stored products
    if (req.method === 'GET' && pathname === '/api/products') {
      const products = getDbProducts();
      return send(res, 200, products);
    }

    // GET /api/products/:id -> Retrieve a single product by ID
    if (req.method === 'GET' && pathname.startsWith('/api/products/')) {
      const productId = pathname.replace('/api/products/', '').trim();
      const products = getDbProducts();
      const found = products.find(p => p.id === productId);
      if (found) {
        return send(res, 200, found);
      }
      return send(res, 404, { error: `Product ${productId} not found.` });
    }

    // POST or PUT /api/products or /api/products/:id -> Create or update product
    if ((req.method === 'POST' || req.method === 'PUT') && (pathname === '/api/products' || pathname.startsWith('/api/products/'))) {
      if (pathname === '/api/products/reset') {
        // Fall through to reset handler below
      } else {
        const product = await readJson(req);
        if (!product || (!product.name && !product.title)) {
          return send(res, 400, { error: 'Product name is required.' });
        }

        // Check if ID is in URL
        const idFromUrl = pathname.startsWith('/api/products/') ? pathname.replace('/api/products/', '').trim() : '';
        if (idFromUrl && !product.id) {
          product.id = idFromUrl;
        }

        if (product.id) {
          const deletedIds = getDeletedIds();
          if (deletedIds.includes(product.id)) {
            saveDeletedIds(deletedIds.filter(id => id !== product.id));
          }
        } else {
          product.id = 'prod_' + Math.random().toString(36).substr(2, 9);
          product.created_at = new Date().toISOString();
        }

        const products = getDbProducts();
        const idx = products.findIndex(p => p.id === product.id);
        if (idx !== -1) {
          products[idx] = { ...products[idx], ...product };
        } else {
          products.unshift(product);
        }

        saveDbProducts(products);
        return send(res, 200, product);
      }
    }

    // DELETE /api/products/:id -> Delete a product by ID permanently
    if (req.method === 'DELETE' && pathname.startsWith('/api/products/')) {
      const productId = pathname.replace('/api/products/', '').trim();
      if (!productId) {
        return send(res, 400, { error: 'Product ID required' });
      }
      
      // Add to permanent deleted IDs blacklist
      const deletedIds = getDeletedIds();
      if (!deletedIds.includes(productId)) {
        deletedIds.push(productId);
        saveDeletedIds(deletedIds);
      }

      const products = getDbProducts();
      const filtered = products.filter(p => p.id !== productId);
      saveDbProducts(filtered);
      return send(res, 200, { success: true, deletedId: productId, count: filtered.length });
    }

    // POST /api/products/reset -> Reset database
    if (req.method === 'POST' && pathname === '/api/products/reset') {
      const resetProducts = await readJson(req);
      saveDeletedIds([]); // Clear deleted blacklist on explicit reset
      const toSave = Array.isArray(resetProducts) && resetProducts.length > 0 ? resetProducts : getDbProducts();
      saveDbProducts(toSave);
      return send(res, 200, { success: true, count: toSave.length });
    }

    // =========================================================================
    // PAYMENTS & RELWORX ENDPOINTS
    // =========================================================================
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return send(res, 200, { ok: true, relworxConfigured: Boolean(API_KEY && ACCOUNT_NO) });
    }

    if (req.method === 'POST' && url.pathname === '/api/relworx/webhook') {
      const data = await readJson(req);
      if (!validWebhook(req, data, { webhookKey: WEBHOOK_KEY, webhookUrl: WEBHOOK_URL })) {
        return send(res, 401, { error: 'Invalid webhook signature or webhook URL configuration.' });
      }
      console.info('Verified Relworx webhook', JSON.stringify({ status: data.status, customer_reference: data.customer_reference, internal_reference: data.internal_reference }));
      return send(res, 200, { received: true });
    }

    if (url.pathname === '/api/relworx/mobile-money/request-payment' && req.method === 'POST') {
      const data = await readJson(req);
      const { msisdn, amount, reference, description } = data;
      if (!/^\+256\d{9}$/.test(msisdn || '') || !Number.isFinite(Number(amount)) || Number(amount) < 500 || Number(amount) > 5_000_000 || !/^[A-Za-z0-9]{8,36}$/.test(reference || '')) {
        return send(res, 400, { error: 'Invalid phone, amount, or payment reference.' });
      }
      const result = await callRelworx('/mobile-money/request-payment', 'POST', {
        msisdn,
        amount: Number(amount),
        reference,
        currency: 'UGX',
        description: String(description || `DAINTY Order ${reference}`).slice(0, 100)
      }, { apiKey: API_KEY, accountNo: ACCOUNT_NO, baseUrl: BASE_URL });
      return send(res, 200, result);
    }

    if (req.method === 'GET' && url.pathname === '/api/relworx/mobile-money/check-request-status') {
      const internalReference = url.searchParams.get('internal_reference');
      if (!internalReference || !/^[A-Za-z0-9-]+$/.test(internalReference)) {
        return send(res, 400, { error: 'Invalid internal reference.' });
      }
      const query = new URLSearchParams({ internal_reference: internalReference, account_no: ACCOUNT_NO || '' });
      const result = await callRelworx(`/mobile-money/check-request-status?${query}`, 'GET', null, { apiKey: API_KEY, accountNo: ACCOUNT_NO, baseUrl: BASE_URL });
      if ((result.status || '').toLowerCase() === 'success') result.status = 'successful';
      return send(res, 200, result);
    }

    if (url.pathname === '/api/relworx/mobile-money/validate-mobile-number' && req.method === 'POST') {
      const { msisdn } = await readJson(req);
      if (!/^\+256\d{9}$/.test(msisdn || '')) return send(res, 400, { error: 'Invalid Uganda mobile number.' });
      const result = await callRelworx('/mobile-money/validate-mobile-number', 'POST', { msisdn }, { apiKey: API_KEY, accountNo: ACCOUNT_NO, baseUrl: BASE_URL });
      return send(res, 200, result);
    }

    return send(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('API error:', error.message);
    return send(res, 502, { error: error.message || 'Service error' });
  }
}
