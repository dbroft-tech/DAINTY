/**
 * ============================================================
 * DAINTY — Hybrid Database Client (src/db.js)
 * ============================================================
 * Provides synchronous instant return (for immediate React renders)
 * AND full asynchronous Promise/thenable support (for await/then).
 * Synchronizes seamlessly with the Express backend REST endpoints.
 * ============================================================
 */

// ── Categories (static — no DB needed) ─────────────────────
export const categories = [
  { id: 'rings',       name: 'Rings',                icon: '💍' },
  { id: 'necklaces',   name: 'Necklaces',             icon: '📿' },
  { id: 'earrings',    name: 'Earrings',              icon: '✨' },
  { id: 'bracelets',   name: 'Bracelets',             icon: '⛓️' },
  { id: 'anklets',     name: 'Anklets',               icon: '💎' },
  { id: 'watches',     name: 'Watches',               icon: '⌚' },
  { id: 'sets',        name: 'Jewelry Sets',          icon: '🧿' },
  { id: 'body',        name: 'Body Jewelry',          icon: '👑' },
  { id: 'accessories', name: 'Accessories & Gifts',   icon: '🎁' },
];

export const subcategories = [
  // Rings
  { id: 'eng_rings',  categoryId: 'rings',       name: 'Engagement Rings' },
  { id: 'wed_rings',  categoryId: 'rings',       name: 'Wedding Rings' },
  { id: 'prom_rings', categoryId: 'rings',       name: 'Promise Rings' },
  { id: 'fash_rings', categoryId: 'rings',       name: 'Fashion Rings' },
  { id: 'cock_rings', categoryId: 'rings',       name: 'Cocktail Rings' },
  { id: 'coup_rings', categoryId: 'rings',       name: 'Couple Rings' },
  { id: 'stat_rings', categoryId: 'rings',       name: 'Statement Rings' },
  { id: 'adj_rings',  categoryId: 'rings',       name: 'Adjustable Rings' },
  // Necklaces
  { id: 'pend_neck',  categoryId: 'necklaces',   name: 'Pendant Necklaces' },
  { id: 'chain_neck', categoryId: 'necklaces',   name: 'Chain Necklaces' },
  { id: 'chok_neck',  categoryId: 'necklaces',   name: 'Choker Necklaces' },
  { id: 'lay_neck',   categoryId: 'necklaces',   name: 'Layered Necklaces' },
  { id: 'name_neck',  categoryId: 'necklaces',   name: 'Name/Initial Necklaces' },
  { id: 'stat_neck',  categoryId: 'necklaces',   name: 'Statement Necklaces' },
  { id: 'pearl_neck', categoryId: 'necklaces',   name: 'Pearl Necklaces' },
  { id: 'cross_neck', categoryId: 'necklaces',   name: 'Cross Necklaces' },
  // Earrings
  { id: 'stud_ear',   categoryId: 'earrings',    name: 'Stud Earrings' },
  { id: 'hoop_ear',   categoryId: 'earrings',    name: 'Hoop Earrings' },
  { id: 'drop_ear',   categoryId: 'earrings',    name: 'Drop Earrings' },
  { id: 'dang_ear',   categoryId: 'earrings',    name: 'Dangle Earrings' },
  { id: 'hugg_ear',   categoryId: 'earrings',    name: 'Huggie Earrings' },
  { id: 'cuff_ear',   categoryId: 'earrings',    name: 'Ear Cuffs' },
  { id: 'stat_ear',   categoryId: 'earrings',    name: 'Statement Earrings' },
  { id: 'pearl_ear',  categoryId: 'earrings',    name: 'Pearl Earrings' },
  // Bracelets
  { id: 'chain_brac', categoryId: 'bracelets',   name: 'Chain Bracelets' },
  { id: 'bang_brac',  categoryId: 'bracelets',   name: 'Bangle Bracelets' },
  { id: 'charm_brac', categoryId: 'bracelets',   name: 'Charm Bracelets' },
  { id: 'cuff_brac',  categoryId: 'bracelets',   name: 'Cuff Bracelets' },
  { id: 'bead_brac',  categoryId: 'bracelets',   name: 'Beaded Bracelets' },
  { id: 'pearl_brac', categoryId: 'bracelets',   name: 'Pearl Bracelets' },
  { id: 'coup_brac',  categoryId: 'bracelets',   name: 'Couple/Friendship Bracelets' },
  // Anklets
  { id: 'chain_ank',  categoryId: 'anklets',     name: 'Chain Anklets' },
  { id: 'bead_ank',   categoryId: 'anklets',     name: 'Beaded Anklets' },
  { id: 'charm_ank',  categoryId: 'anklets',     name: 'Charm Anklets' },
  { id: 'lay_ank',    categoryId: 'anklets',     name: 'Layered Anklets' },
  // Watches
  { id: 'women_watch',categoryId: 'watches',     name: "Women's Watches" },
  { id: 'men_watch',  categoryId: 'watches',     name: "Men's Watches" },
  { id: 'coup_watch', categoryId: 'watches',     name: 'Couple Watches' },
  { id: 'fash_watch', categoryId: 'watches',     name: 'Fashion Watches' },
  { id: 'lux_watch',  categoryId: 'watches',     name: 'Luxury Watches' },
  // Jewelry Sets
  { id: 'neck_ear_set', categoryId: 'sets',      name: 'Necklace & Earrings Sets' },
  { id: 'neck_brac_set',categoryId: 'sets',      name: 'Necklace & Bracelet Sets' },
  { id: 'ear_brac_set', categoryId: 'sets',      name: 'Earrings & Bracelet Sets' },
  { id: 'comp_set',   categoryId: 'sets',        name: 'Complete Jewelry Sets' },
  { id: 'coup_set',   categoryId: 'sets',        name: 'Couple Sets' },
  // Body Jewelry
  { id: 'nose_jew',   categoryId: 'body',        name: 'Nose Jewelry' },
  { id: 'belly_ring', categoryId: 'body',        name: 'Belly Rings' },
  { id: 'lip_jew',    categoryId: 'body',        name: 'Lip Jewelry' },
  { id: 'ear_pierc',  categoryId: 'body',        name: 'Ear Piercing Jewelry' },
  { id: 'other_body', categoryId: 'body',        name: 'Other Body Jewelry' },
  // Accessories
  { id: 'jew_box',    categoryId: 'accessories', name: 'Jewelry Boxes' },
  { id: 'jew_org',    categoryId: 'accessories', name: 'Jewelry Organizers' },
  { id: 'gift_set',   categoryId: 'accessories', name: 'Gift Sets' },
  { id: 'gift_card',  categoryId: 'accessories', name: 'Gift Cards' },
  { id: 'care_prod',  categoryId: 'accessories', name: 'Jewelry Care Products' },
];

export const DEFAULT_PRODUCTS = [
  {
    id: 'prod_1', name: '18K Gold Plated Heart Pendant Necklace',
    description: 'Elegant 18K Gold Plated Heart Pendant Necklace featuring a high-polished minimalist heart silhouette. Crafted with durability and timeless romance in mind, perfect for everyday elegance or a special evening.',
    price: 85000, sale_price: 75000, category_id: 'necklaces', subcategory_id: 'pend_neck',
    material: 'Gold-Plated', color: 'Gold', gender: 'Women', occasion: "Valentine's",
    stock_quantity: 24, sku: 'DSC-NK-HRT-01',
    featured: true, new_arrival: true, best_seller: true, limited_edition: false, clearance: false,
    tags: ['heart', 'love', 'gold chain', 'pendant'],
    images: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1611085583191-a3b1a30a5a40?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&auto=format&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1543294001-f7cbfe92237e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=800&auto=format&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&auto=format&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1543294001-f7cbfe92237e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=800&auto=format&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1611085583191-a3b1a30a5a40?w=800&auto=format&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1543294001-f7cbfe92237e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=800&auto=format&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1635767798638-3e25273a8236?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80',
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
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&auto=format&fit=crop&q=80',
    ],
    created_at: new Date(Date.now() - 60 * 864e5).toISOString(),
  },
];

export const DEFAULT_MESSAGES = [
  {
    id: 'msg_welcome',
    chat_id: 'admin_demo_chat',
    chatId: 'admin_demo_chat',
    sender: 'admin',
    content: 'Welcome to DAINTY STUDS AND CHAINS! How can we assist you today?',
    timestamp: new Date().toISOString(),
  },
];

// ── In-Memory & LocalStorage Cache ───────────────────────────
function loadLocal(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    if (val) return JSON.parse(val);
  } catch { /* ignore */ }
  return fallback;
}

function saveLocal(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    window.dispatchEvent(new Event('storage'));
  } catch { /* ignore */ }
}

let _products = loadLocal('dainty_products', DEFAULT_PRODUCTS);
let _orders   = loadLocal('dainty_orders', []);
let _messages = loadLocal('dainty_messages', DEFAULT_MESSAGES);

// ── Thenable Array Wrapper ───────────────────────────────────
// Allows an array to be used synchronously (e.g. products.filter) OR awaited (await getProducts())
function makeThenableArray(arr, promise) {
  const wrapper = [...arr];
  Object.defineProperty(wrapper, 'then', {
    value: (onFulfilled, onRejected) => promise.then(onFulfilled, onRejected),
    enumerable: false,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(wrapper, 'catch', {
    value: (onRejected) => promise.catch(onRejected),
    enumerable: false,
    configurable: true,
    writable: true,
  });
  return wrapper;
}

function makeThenableObject(obj, promise) {
  const wrapper = { ...obj };
  Object.defineProperty(wrapper, 'then', {
    value: (onFulfilled, onRejected) => promise.then(onFulfilled, onRejected),
    enumerable: false,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(wrapper, 'catch', {
    value: (onRejected) => promise.catch(onRejected),
    enumerable: false,
    configurable: true,
    writable: true,
  });
  return wrapper;
}

// ── Internal fetch helper ────────────────────────────────────
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `API error ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[db.js] apiFetch fallback for ${path}:`, err.message);
    throw err;
  }
}

// Background sync on module load
(async function syncWithServer() {
  try {
    const serverProds = await apiFetch('/api/products').catch(() => null);
    if (Array.isArray(serverProds) && serverProds.length > 0) {
      _products = serverProds;
      saveLocal('dainty_products', _products);
    }
  } catch { /* ignore */ }

  try {
    const serverOrders = await apiFetch('/api/orders').catch(() => null);
    if (Array.isArray(serverOrders)) {
      _orders = serverOrders;
      saveLocal('dainty_orders', _orders);
    }
  } catch { /* ignore */ }

  try {
    const serverMsgs = await apiFetch('/api/messages').catch(() => null);
    if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
      _messages = serverMsgs.map(m => ({ ...m, chatId: m.chat_id || m.chatId }));
      saveLocal('dainty_messages', _messages);
    }
  } catch { /* ignore */ }
})();

export function initDB() {
  // DB is synced automatically
}

// ════════════════════════════════════════════════════════════
// Products API
// ════════════════════════════════════════════════════════════

/** Returns all products — works synchronously or with await/then. */
export function getProducts() {
  const promise = apiFetch('/api/products')
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        _products = data;
        saveLocal('dainty_products', _products);
        return data;
      }
      return _products;
    })
    .catch(() => _products);

  return makeThenableArray(_products, promise);
}

/** Returns a single product by ID — works synchronously or with await/then. */
export function getProductById(id) {
  const found = _products.find(p => p.id === id) || null;
  const promise = apiFetch(`/api/products/${id}`).catch(() => found);
  return found ? makeThenableObject(found, promise) : null;
}

/** Create or update a product. */
export function saveProduct(product) {
  let updated;
  if (product.id) {
    const idx = _products.findIndex(p => p.id === product.id);
    if (idx !== -1) {
      _products[idx] = { ..._products[idx], ...product };
      updated = _products[idx];
    } else {
      updated = { ...product };
      _products.unshift(updated);
    }
  } else {
    updated = {
      ...product,
      id: 'prod_' + Math.random().toString(36).substring(2, 9),
      created_at: new Date().toISOString(),
    };
    _products.unshift(updated);
  }

  saveLocal('dainty_products', _products);

  const promise = (product.id
    ? apiFetch(`/api/products/${product.id}`, { method: 'PUT', body: JSON.stringify(updated) })
    : apiFetch('/api/products', { method: 'POST', body: JSON.stringify(updated) })
  ).then(res => {
    if (res && res.id) {
      const idx = _products.findIndex(p => p.id === res.id);
      if (idx !== -1) _products[idx] = res;
      saveLocal('dainty_products', _products);
      return res;
    }
    return updated;
  }).catch(() => updated);

  return makeThenableObject(updated, promise);
}

/** Delete a product by ID. */
export function deleteProduct(productId) {
  _products = _products.filter(p => p.id !== productId);
  saveLocal('dainty_products', _products);

  const promise = apiFetch(`/api/products/${productId}`, { method: 'DELETE' })
    .catch(() => ({ ok: true }));

  return makeThenableObject({ ok: true }, promise);
}

/** Update only price/sale_price for a product. */
export function updateProductPrice(productId, newPrice, newSalePrice = null) {
  const idx = _products.findIndex(p => p.id === productId);
  if (idx !== -1) {
    _products[idx].price = newPrice;
    _products[idx].sale_price = newSalePrice;
    saveLocal('dainty_products', _products);
  }

  const promise = apiFetch(`/api/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify({ price: newPrice, sale_price: newSalePrice }),
  }).catch(() => _products[idx]);

  return _products[idx] ? makeThenableObject(_products[idx], promise) : null;
}

// ════════════════════════════════════════════════════════════
// Orders API
// ════════════════════════════════════════════════════════════

/** Returns all orders — works synchronously or with await/then. */
export function getOrders() {
  const promise = apiFetch('/api/orders')
    .then(data => {
      if (Array.isArray(data)) {
        _orders = data;
        saveLocal('dainty_orders', _orders);
        return data;
      }
      return _orders;
    })
    .catch(() => _orders);

  return makeThenableArray(_orders, promise);
}

export function getOrderById(id) {
  const found = _orders.find(o => o.id === id) || null;
  const promise = apiFetch(`/api/orders/${id}`).catch(() => found);
  return found ? makeThenableObject(found, promise) : null;
}

/** Create a new order. Works synchronously or with await/then. */
export function saveOrder(orderData) {
  const newOrder = {
    id: 'ORD_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    customer_name:    orderData.name || orderData.customer_name || 'Customer',
    customer_email:   orderData.email || orderData.customer_email || null,
    customer_phone:   orderData.phone || orderData.customer_phone || '',
    delivery_address: orderData.address || orderData.delivery_address || '',
    notes:            orderData.notes || null,
    total_amount:     orderData.total_amount || 0,
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

  _orders.unshift(newOrder);
  saveLocal('dainty_orders', _orders);

  // Decrement local product stock
  (orderData.items || []).forEach(item => {
    const prodId = item.id || item.product_id;
    const p = _products.find(x => x.id === prodId);
    if (p) p.stock_quantity = Math.max(0, (p.stock_quantity || 0) - (item.quantity || 1));
  });
  saveLocal('dainty_products', _products);

  const promise = apiFetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify(newOrder),
  }).then(saved => {
    if (saved && saved.id) {
      const idx = _orders.findIndex(o => o.id === newOrder.id);
      if (idx !== -1) _orders[idx] = saved;
      saveLocal('dainty_orders', _orders);
      return saved;
    }
    return newOrder;
  }).catch(() => newOrder);

  return makeThenableObject(newOrder, promise);
}

/** Update order status. */
export function updateOrderStatus(orderId, status) {
  const idx = _orders.findIndex(o => o.id === orderId);
  let updated = null;
  if (idx !== -1) {
    _orders[idx] = { ..._orders[idx], status };
    updated = _orders[idx];
    saveLocal('dainty_orders', _orders);
  }

  const promise = apiFetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).catch(() => updated);

  return updated ? makeThenableObject(updated, promise) : null;
}

// ════════════════════════════════════════════════════════════
// Messages / Chat API
// ════════════════════════════════════════════════════════════

/** Returns all messages (or filtered by chatId) — works synchronously or with await/then. */
export function getMessages(chatId) {
  const filtered = chatId
    ? _messages.filter(m => (m.chatId || m.chat_id) === chatId)
    : _messages;

  const qs = chatId ? `?chat_id=${encodeURIComponent(chatId)}` : '';
  const promise = apiFetch(`/api/messages${qs}`)
    .then(data => {
      if (Array.isArray(data)) {
        const normalized = data.map(m => ({ ...m, chatId: m.chat_id || m.chatId }));
        if (!chatId) {
          _messages = normalized;
          saveLocal('dainty_messages', _messages);
        }
        return normalized;
      }
      return filtered;
    })
    .catch(() => filtered);

  return makeThenableArray(filtered, promise);
}

/** Save a new chat message. */
export function saveMessage(chatId, sender, content) {
  const newMsg = {
    id:        'msg_' + Math.random().toString(36).substring(2, 9),
    chat_id:   chatId,
    chatId:    chatId,
    sender,
    content,
    timestamp: new Date().toISOString(),
  };

  _messages.push(newMsg);
  saveLocal('dainty_messages', _messages);

  const promise = apiFetch('/api/messages', {
    method: 'POST',
    body: JSON.stringify({ chat_id: chatId, sender, content }),
  }).catch(() => newMsg);

  return makeThenableObject(newMsg, promise);
}

/** Returns all chat threads grouped by chatId. */
export function getChats() {
  const chatMap = {};
  _messages.forEach(m => {
    const cId = m.chatId || m.chat_id || 'general';
    if (!chatMap[cId]) chatMap[cId] = [];
    chatMap[cId].push({ ...m, chatId: cId });
  });

  const chatList = Object.entries(chatMap)
    .map(([chatId, msgs]) => {
      const sorted = msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return {
        chatId,
        lastMessage: sorted[sorted.length - 1],
        messages: sorted,
      };
    })
    .sort((a, b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp));

  const promise = apiFetch('/api/chats')
    .then(res => (Array.isArray(res) ? res : chatList))
    .catch(() => chatList);

  return makeThenableArray(chatList, promise);
}

// ════════════════════════════════════════════════════════════
// Admin Auth
// ════════════════════════════════════════════════════════════

export async function verifyAdmin(username, password) {
  try {
    await apiFetch('/api/admin/login', {
      method:      'POST',
      credentials: 'include',
      body:        JSON.stringify({ username, password }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function checkAdminSession() {
  try {
    const res = await fetch('/api/admin/session', { credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminLogout() {
  try {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
  } catch { /* ignore */ }
}

export function getAdminCredentials() {
  try {
    const stored = localStorage.getItem('dainty_admin_credentials');
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { username: 'admin', password: 'admin123' };
}

export function updateAdminCredentials(username, password) {
  const creds = { username: username || 'admin', password };
  try {
    localStorage.setItem('dainty_admin_credentials', JSON.stringify(creds));
  } catch { /* ignore */ }
  return creds;
}

export function resetDatabase() {
  _products = [...DEFAULT_PRODUCTS];
  _orders   = [];
  _messages = [...DEFAULT_MESSAGES];
  saveLocal('dainty_products', _products);
  saveLocal('dainty_orders', _orders);
  saveLocal('dainty_messages', _messages);

  const promise = apiFetch('/api/admin/reset', {
    method: 'POST',
    credentials: 'include',
  }).catch(() => ({ ok: true }));

  return makeThenableObject({ ok: true }, promise);
}
