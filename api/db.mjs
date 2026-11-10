/**
 * ============================================================
 * DAINTY — JSON File Database  (api/db.mjs)
 * ============================================================
 * Zero native dependencies — uses Node's built-in fs module.
 * All data is stored as JSON files inside  data/  directory.
 *
 *   data/products.json
 *   data/orders.json
 *   data/messages.json
 *   data/settings.json
 *
 * Works on ANY Node.js version (18, 20, 22, 26…) on any OS.
 * ============================================================
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, randomBytes } from 'node:crypto';
import os from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Resolve a writable data directory.
// On Hostinger shared hosting the project root may be read-only;
// fall back to os.tmpdir() so the server can still start.
// Resolve a writable data directory.
// On Hostinger shared hosting the project root may be read-only or in versioned build directories;
// we also maintain a persistent mirror in ~/dainty_data so product images and items survive redeployments.
function resolveDataDir() {
  const candidates = [
    process.env.DATA_DIR,
    join(__dirname, '..', 'data'),           // <project>/data  (preferred when in server/ or dist/)
    join(process.cwd(), 'data'),             // <cwd>/data
    join(__dirname, 'data'),                 // <app_root>/data (when deployed from dist directly)
    join(os.homedir(), 'dainty_data'),        // ~/dainty_data   (shared host persistent home)
    join(os.tmpdir(),  'dainty_data'),        // /tmp/dainty_data (last resort)
  ].filter(Boolean);

  for (const dir of candidates) {
    try {
      mkdirSync(dir, { recursive: true });
      const probe = join(dir, '.write_probe');
      writeFileSync(probe, '1', 'utf8');
      return dir;
    } catch { /* try next */ }
  }
  throw new Error('No writable data directory found. Checked: ' + candidates.join(', '));
}

const DATA_DIR = resolveDataDir();
console.info('[DB] Primary data directory:', DATA_DIR);

// Persistent backup mirror directory in user's home folder (survives Hostinger version redeploys)
const BACKUP_DIR = (function() {
  try {
    const homedir = os.homedir();
    if (homedir) {
      const p = join(homedir, 'dainty_data');
      mkdirSync(p, { recursive: true });
      const probe = join(p, '.write_probe');
      writeFileSync(probe, '1', 'utf8');
      return p;
    }
  } catch {}
  return null;
})();
if (BACKUP_DIR && BACKUP_DIR !== DATA_DIR) {
  console.info('[DB] Persistent backup mirror directory:', BACKUP_DIR);
}

// ── Atomic JSON helpers ──────────────────────────────────────
function readJSON(file, fallback) {
  const primaryPath = join(DATA_DIR, file);
  let data = null;

  if (existsSync(primaryPath)) {
    try {
      data = JSON.parse(readFileSync(primaryPath, 'utf8'));
    } catch {}
  }

  // If primary is empty or missing, check persistent backup mirror
  if ((!data || (Array.isArray(data) && data.length === 0)) && BACKUP_DIR) {
    const backupPath = join(BACKUP_DIR, file);
    if (existsSync(backupPath)) {
      try {
        const backupData = JSON.parse(readFileSync(backupPath, 'utf8'));
        if (backupData && (!Array.isArray(backupData) || backupData.length > 0)) {
          data = backupData;
          // Sync backup forward to primary
          try { writeFileSync(primaryPath, JSON.stringify(data, null, 2), 'utf8'); } catch {}
        }
      } catch {}
    }
  }

  // Also check products_db.json for products
  if (file === 'products.json' && (!data || (Array.isArray(data) && data.length <= 10))) {
    const dbJsonPath = join(__dirname, 'products_db.json');
    if (existsSync(dbJsonPath)) {
      try {
        const dbProducts = JSON.parse(readFileSync(dbJsonPath, 'utf8'));
        if (Array.isArray(dbProducts) && dbProducts.length > 0) {
          if (!data || data.length === 0) {
            data = dbProducts;
          } else {
            // Merge custom products
            const map = new Map(data.map(p => [p.id, p]));
            for (const p of dbProducts) {
              if (p && p.id && !map.has(p.id)) {
                map.set(p.id, p);
              }
            }
            data = Array.from(map.values());
          }
        }
      } catch {}
    }
  }

  return data !== null ? data : fallback;
}

function writeJSON(file, data) {
  const content = JSON.stringify(data, null, 2);
  
  // 1. Write to primary DATA_DIR
  try {
    writeFileSync(join(DATA_DIR, file), content, 'utf8');
  } catch (err) {
    console.error(`[DB] Failed writing ${file} to ${DATA_DIR}:`, err.message);
  }

  // 2. Mirror to persistent BACKUP_DIR (survives Hostinger redeployments)
  if (BACKUP_DIR && BACKUP_DIR !== DATA_DIR) {
    try {
      writeFileSync(join(BACKUP_DIR, file), content, 'utf8');
    } catch {}
  }

  // 3. If products.json, also update api/products_db.json and cwd/data/products.json
  if (file === 'products.json') {
    try {
      writeFileSync(join(__dirname, 'products_db.json'), content, 'utf8');
    } catch {}
    try {
      const cwdData = join(process.cwd(), 'data', file);
      if (cwdData !== join(DATA_DIR, file)) {
        writeFileSync(cwdData, content, 'utf8');
      }
    } catch {}
  }
}

// ── Tiny ID generator ────────────────────────────────────────
function uid(prefix = '') {
  return prefix + Math.random().toString(36).substring(2, 11).toUpperCase();
}

// ═══════════════════════════════════════════════════════════
// Settings — key/value store
// ═══════════════════════════════════════════════════════════
function getSettings() { return readJSON('settings.json', {}); }
function setSetting(key, value) {
  const s = getSettings();
  s[key] = value;
  writeJSON('settings.json', s);
}

// ═══════════════════════════════════════════════════════════
// Admin password (HMAC-SHA256)
// ═══════════════════════════════════════════════════════════
function getSalt() {
  const s = getSettings();
  if (!s.admin_salt) {
    s.admin_salt = randomBytes(16).toString('hex');
    writeJSON('settings.json', s);
  }
  return s.admin_salt;
}

function hashPassword(plain) {
  return createHmac('sha256', getSalt()).update(plain).digest('hex');
}

// Seed admin password on first run — only if ADMIN_PASSWORD env var is set.
// server/index.js handles auth independently via bcrypt (ADMIN_PASSWORD_HASH).
{
  const s = getSettings();
  if (!s.admin_password_hash) {
    const seedPass = process.env.ADMIN_PASSWORD;
    if (seedPass) {
      setSetting('admin_password_hash', hashPassword(seedPass));
      console.info('[DB] Admin password initialised from ADMIN_PASSWORD env var.');
    } else {
      console.info('[DB] No ADMIN_PASSWORD set — skipping settings.json password seed (auth handled by bcrypt in server/index.js).');
    }
  }
}

export function verifyAdminPassword(plain) {
  const stored = getSettings().admin_password_hash;
  return Boolean(stored && stored === hashPassword(plain));
}

// ═══════════════════════════════════════════════════════════
// Default seed data
// ═══════════════════════════════════════════════════════════
const DEFAULT_PRODUCTS = [
  {
    id: 'prod_1', name: '18K Gold Plated Heart Pendant Necklace',
    description: 'Elegant 18K Gold Plated Heart Pendant Necklace featuring a high-polished minimalist heart silhouette. Crafted with durability and timeless romance in mind, perfect for everyday elegance or a special evening.',
    price: 85000, sale_price: 75000, category_id: 'necklaces', subcategory_id: 'pend_neck',
    material: 'Gold-Plated', color: 'Gold', gender: 'Women', occasion: "Valentine's",
    stock_quantity: 24, sku: 'DSC-NK-HRT-01',
    featured: true, new_arrival: true, best_seller: true, limited_edition: false, clearance: false,
    tags: ['heart', 'love', 'gold chain', 'pendant'],
    images: [
      '/images/iv.jpeg',
      '/images/v.jpeg'
    ],
    created_at: new Date(Date.now() - 5 * 864e5).toISOString(),
  },
  {
    id: 'prod_2', name: 'Eternal Promise Diamond Band',
    description: 'A classic symbol of commitment — micro-pavé CZ crystals on Sterling Silver. Perfect for stacking or pairing with engagement rings.',
    price: 180000, sale_price: null, category_id: 'rings', subcategory_id: 'prom_rings',
    material: 'Sterling Silver', color: 'Silver', gender: 'Unisex', occasion: 'Promise',
    stock_quantity: 15, sku: 'DSC-RG-PRM-02',
    featured: true, new_arrival: false, best_seller: true, limited_edition: false, clearance: false,
    tags: ['diamond', 'promise', 'wedding', 'silver ring'],
    images: [
      '/images/i.jpeg',
      '/images/ii.jpeg'
    ],
    created_at: new Date(Date.now() - 40 * 864e5).toISOString(),
  },
  {
    id: 'prod_3', name: 'Classic Gold Hoop Earrings',
    description: '18K Gold Plated lightweight hollow hoops with a secure latch closure. Comfortable all-day everyday wear.',
    price: 48000, sale_price: 39000, category_id: 'earrings', subcategory_id: 'hoop_ear',
    material: 'Gold-Plated', color: 'Gold', gender: 'Women', occasion: 'Everyday',
    stock_quantity: 45, sku: 'DSC-ER-HOP-03',
    featured: false, new_arrival: true, best_seller: true, limited_edition: false, clearance: false,
    tags: ['hoops', 'everyday', 'gold', 'minimalist'],
    images: [
      '/images/iii.jpeg',
      '/images/vi.jpeg'
    ],
    created_at: new Date(Date.now() - 10 * 864e5).toISOString(),
  },
  {
    id: 'prod_4', name: 'Baroque Pearl Choker Necklace',
    description: 'Handpicked genuine freshwater baroque pearls on a gold-plated stainless steel paperclip chain. Fully adjustable.',
    price: 120000, sale_price: null, category_id: 'necklaces', subcategory_id: 'chok_neck',
    material: 'Sterling Silver', color: 'White', gender: 'Women', occasion: 'Wedding',
    stock_quantity: 8, sku: 'DSC-NK-PRL-04',
    featured: true, new_arrival: true, best_seller: false, limited_edition: true, clearance: false,
    tags: ['pearl', 'choker', 'bridal', 'baroque'],
    images: [
      '/images/iv.jpeg',
      '/images/vii.jpeg'
    ],
    created_at: new Date(Date.now() - 12 * 864e5).toISOString(),
  },
  {
    id: 'prod_5', name: 'Premium Minimalist Gold Chronograph Watch',
    description: '316L Stainless Steel case with premium gold-plated brush, classic white dials, sapphire crystal face, Japanese Quartz movement.',
    price: 490000, sale_price: 450000, category_id: 'watches', subcategory_id: 'lux_watch',
    material: 'Stainless Steel', color: 'Gold', gender: 'Men', occasion: 'Anniversary',
    stock_quantity: 6, sku: 'DSC-WT-LUX-05',
    featured: true, new_arrival: false, best_seller: true, limited_edition: true, clearance: false,
    tags: ['watch', 'luxury', 'men watch', 'chronograph'],
    images: [
      '/images/0.jpeg',
      '/images/vi.jpeg'
    ],
    created_at: new Date(Date.now() - 25 * 864e5).toISOString(),
  },
  {
    id: 'prod_6', name: 'Gilded Intertwined Couple Ring Set',
    description: 'High-polished gold-plated titanium. Robust thick male ring + elegant braided female ring. Perfect matching couples set.',
    price: 135000, sale_price: null, category_id: 'rings', subcategory_id: 'coup_rings',
    material: 'Titanium', color: 'Gold', gender: 'Unisex', occasion: 'Engagement',
    stock_quantity: 12, sku: 'DSC-RG-CUP-06',
    featured: true, new_arrival: true, best_seller: false, limited_edition: false, clearance: false,
    tags: ['couple ring', 'promise ring', 'wedding band', 'matching'],
    images: [
      '/images/i.jpeg',
      '/images/v.jpeg'
    ],
    created_at: new Date(Date.now() - 3 * 864e5).toISOString(),
  },
  {
    id: 'prod_7', name: 'Chunky Paperclip Gold Chain Bracelet',
    description: 'Premium 18K gold-plated marine-grade stainless steel paperclip link bracelet. Water-resistant & tarnish-resistant.',
    price: 65000, sale_price: 55000, category_id: 'bracelets', subcategory_id: 'chain_brac',
    material: 'Gold-Plated', color: 'Gold', gender: 'Women', occasion: 'Everyday',
    stock_quantity: 32, sku: 'DSC-BR-PPR-07',
    featured: false, new_arrival: false, best_seller: true, limited_edition: false, clearance: false,
    tags: ['bracelet', 'chain', 'paperclip', 'gold links'],
    images: [
      '/images/iv.jpeg',
      '/images/v.jpeg'
    ],
    created_at: new Date(Date.now() - 45 * 864e5).toISOString(),
  },
  {
    id: 'prod_8', name: 'Timeless Diamond & Sapphire Wedding Ring',
    description: 'Cushion-cut deep blue sapphire center, double halo of conflict-free diamonds in 18K solid white gold settings.',
    price: 850000, sale_price: null, category_id: 'rings', subcategory_id: 'wed_rings',
    material: 'Gold', color: 'White', gender: 'Women', occasion: 'Wedding',
    stock_quantity: 3, sku: 'DSC-RG-WED-08',
    featured: true, new_arrival: false, best_seller: false, limited_edition: true, clearance: false,
    tags: ['sapphire', 'wedding ring', 'diamonds', 'luxury'],
    images: [
      '/images/ii.jpeg',
      '/images/iii.jpeg'
    ],
    created_at: new Date(Date.now() - 15 * 864e5).toISOString(),
  },
  {
    id: 'prod_9', name: 'Sparkling Emerald Cut Ear Cuffs',
    description: 'No piercings required! Slides onto cartilage. Emerald-cut green CZ stones on yellow gold-plated brass.',
    price: 35000, sale_price: 30000, category_id: 'earrings', subcategory_id: 'cuff_ear',
    material: 'Gold-Plated', color: 'Mixed', gender: 'Women', occasion: 'Gift',
    stock_quantity: 50, sku: 'DSC-ER-CUF-09',
    featured: false, new_arrival: true, best_seller: false, limited_edition: false, clearance: true,
    tags: ['ear cuff', 'no piercing', 'emerald', 'gift under 50k'],
    images: [
      '/images/iii.jpeg',
      '/images/vii.jpeg'
    ],
    created_at: new Date(Date.now() - 2 * 864e5).toISOString(),
  },
  {
    id: 'prod_10', name: 'Regal Velvet Jewelry Organizer Box',
    description: 'Soft velvet drawer partitions, custom ring slots, necklace hooks, and a built-in lock with gold-tone key.',
    price: 150000, sale_price: 130000, category_id: 'accessories', subcategory_id: 'jew_box',
    material: 'Stainless Steel', color: 'Black', gender: 'Unisex', occasion: 'Birthday',
    stock_quantity: 10, sku: 'DSC-AC-BOX-10',
    featured: true, new_arrival: false, best_seller: false, limited_edition: false, clearance: false,
    tags: ['box', 'organizer', 'velvet', 'storage'],
    images: [
      '/images/0.jpeg',
      '/images/vi.jpeg'
    ],
    created_at: new Date(Date.now() - 60 * 864e5).toISOString(),
  },
];

const DEFAULT_MESSAGES = [
  {
    id: 'msg_welcome',
    chat_id: 'admin_demo_chat',
    sender: 'admin',
    content: 'Welcome to DAINTY STUDS AND CHAINS! How can we assist you today?',
    timestamp: new Date().toISOString(),
  },
];

// ── Seed on first run ────────────────────────────────────────
if (!existsSync(join(DATA_DIR, 'products.json'))) {
  writeJSON('products.json', DEFAULT_PRODUCTS);
  console.info('[DB] Seeded 10 default products.');
}
if (!existsSync(join(DATA_DIR, 'orders.json'))) {
  writeJSON('orders.json', []);
}
if (!existsSync(join(DATA_DIR, 'messages.json'))) {
  writeJSON('messages.json', DEFAULT_MESSAGES);
}

// ═══════════════════════════════════════════════════════════
// Products API
// ═══════════════════════════════════════════════════════════
export function getProducts() {
  return readJSON('products.json', []).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

export function getProductById(id) {
  return getProducts().find(p => p.id === id) || null;
}

export function saveProduct(product) {
  const products = readJSON('products.json', []);
  const isNew = !product.id;

  if (isNew) {
    product = {
      ...product,
      id: 'prod_' + uid(),
      created_at: new Date().toISOString(),
    };
    products.unshift(product);
  } else {
    const idx = products.findIndex(p => p.id === product.id);
    if (idx === -1) {
      products.unshift(product);
    } else {
      products[idx] = { ...products[idx], ...product };
    }
  }

  writeJSON('products.json', products);
  return getProductById(product.id);
}

export function deleteProduct(id) {
  const products = readJSON('products.json', []).filter(p => p.id !== id);
  writeJSON('products.json', products);
}

export function saveProductsBatch(productsList) {
  if (!Array.isArray(productsList) || productsList.length === 0) return getProducts();
  const current = readJSON('products.json', []);
  const map = new Map();
  for (const p of current) {
    if (p && p.id) map.set(p.id, p);
  }
  for (const p of productsList) {
    if (p && p.id) {
      const existing = map.get(p.id) || {};
      map.set(p.id, { ...existing, ...p });
    }
  }
  const merged = Array.from(map.values()).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  writeJSON('products.json', merged);
  return merged;
}

function adjustStock(productId, delta) {
  const products = readJSON('products.json', []);
  const idx = products.findIndex(p => p.id === productId);
  if (idx !== -1) {
    products[idx].stock_quantity = Math.max(0, (products[idx].stock_quantity || 0) + delta);
    writeJSON('products.json', products);
  }
}

// ═══════════════════════════════════════════════════════════
// Orders API
// ═══════════════════════════════════════════════════════════
export function getOrders() {
  return readJSON('orders.json', []).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

export function getOrderById(id) {
  return getOrders().find(o => o.id === id) || null;
}

export function saveOrder(orderData) {
  const orders = readJSON('orders.json', []);

  const newOrder = {
    id: 'ORD_' + uid(),
    customer_name:    orderData.name,
    customer_email:   orderData.email || null,
    customer_phone:   orderData.phone,
    delivery_address: orderData.address,
    notes:            orderData.notes || null,
    total_amount:     orderData.total_amount,
    discount_applied: orderData.discount_applied || 0,
    coupon_code:      orderData.coupon_code || null,
    payment_method:   orderData.payment_method || null,
    momo_phone:       orderData.momo_phone || null,
    momo_network:     orderData.momo_network || null,
    relworx_reference:          orderData.relworx_reference || null,
    relworx_internal_reference: orderData.relworx_internal_reference || null,
    status:           'Pending',
    items:            orderData.items || [],
    created_at:       new Date().toISOString(),
  };

  orders.unshift(newOrder);
  writeJSON('orders.json', orders);

  // Reduce stock for each item
  (orderData.items || []).forEach(item => {
    if (item.product_id) adjustStock(item.product_id, -item.quantity);
  });

  return newOrder;
}

export function updateOrderStatus(orderId, status) {
  const VALID = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];
  if (!VALID.includes(status)) throw new Error('Invalid status: ' + status);

  const orders = readJSON('orders.json', []);
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return null;

  orders[idx].status = status;
  writeJSON('orders.json', orders);
  return orders[idx];
}

// ═══════════════════════════════════════════════════════════
// Messages / Chat API
// ═══════════════════════════════════════════════════════════
export function getMessages(chatId) {
  const all = readJSON('messages.json', []);
  return chatId ? all.filter(m => m.chat_id === chatId) : all;
}

export function saveMessage(chatId, sender, content) {
  const messages = readJSON('messages.json', []);
  const msg = {
    id:        'msg_' + uid(),
    chat_id:   chatId,
    sender,
    content,
    timestamp: new Date().toISOString(),
  };
  messages.push(msg);
  writeJSON('messages.json', messages);
  return msg;
}

export function getChats() {
  const all = readJSON('messages.json', []);
  const chatMap = {};

  // Group messages by chat_id
  all.forEach(m => {
    if (!chatMap[m.chat_id]) chatMap[m.chat_id] = [];
    chatMap[m.chat_id].push(m);
  });

  return Object.entries(chatMap)
    .map(([chatId, msgs]) => {
      const sorted = msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return {
        chatId,
        lastMessage: sorted[sorted.length - 1],
        messages:    sorted,
      };
    })
    .sort((a, b) =>
      new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
    );
}

// ═══════════════════════════════════════════════════════════
// Reset (Admin utility)
// ═══════════════════════════════════════════════════════════
export function resetDatabase(customProducts = null) {
  const toSave = Array.isArray(customProducts) && customProducts.length > 0 ? customProducts : DEFAULT_PRODUCTS;
  writeJSON('products.json', toSave);
  writeJSON('orders.json', []);
  writeJSON('messages.json', DEFAULT_MESSAGES);
  console.info('[DB] Database reset.');
}
