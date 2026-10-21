/**
 * ============================================================
 * DAINTY — Frontend Database Client  (src/db.js)
 * ============================================================
 * All data now lives in the server-side SQLite database.
 * This file is the frontend API client that calls the same-
 * origin REST endpoints exposed by api/server.mjs.
 *
 * The public API surface is identical to the original localStorage
 * version so that no components need changing.
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

// ── Internal fetch helper ────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res  = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

// ── initDB (no-op — server initialises the DB on startup) ───
export function initDB() {
  // Nothing to do on the frontend; the server seeds the DB automatically.
}

// ════════════════════════════════════════════════════════════
// Products API
// ════════════════════════════════════════════════════════════

/** Returns all products from the server database. */
export async function getProducts() {
  return apiFetch('/api/products');
}

/** Returns a single product by ID. */
export async function getProductById(id) {
  return apiFetch(`/api/products/${id}`);
}

/** Create or update a product. Pass id to update, omit to create. */
export async function saveProduct(product) {
  if (product.id) {
    return apiFetch(`/api/products/${product.id}`, {
      method: 'PUT',
      body:   JSON.stringify(product),
    });
  }
  return apiFetch('/api/products', {
    method: 'POST',
    body:   JSON.stringify(product),
  });
}

/** Delete a product by ID. */
export async function deleteProduct(productId) {
  return apiFetch(`/api/products/${productId}`, { method: 'DELETE' });
}

/** Update only price/sale_price for a product. */
export async function updateProductPrice(productId, newPrice, newSalePrice = null) {
  return apiFetch(`/api/products/${productId}`, {
    method: 'PATCH',
    body:   JSON.stringify({ price: newPrice, sale_price: newSalePrice }),
  });
}

// ════════════════════════════════════════════════════════════
// Orders API
// ════════════════════════════════════════════════════════════

/** Returns all orders, newest first. */
export async function getOrders() {
  return apiFetch('/api/orders');
}

/** Create a new order and decrement stock. Returns the saved order. */
export async function saveOrder(orderData) {
  return apiFetch('/api/orders', {
    method: 'POST',
    body:   JSON.stringify(orderData),
  });
}

/** Update the status of an order (Pending → Shipped → Delivered | Cancelled). */
export async function updateOrderStatus(orderId, status) {
  return apiFetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status }),
  });
}

// ════════════════════════════════════════════════════════════
// Messages / Chat API
// ════════════════════════════════════════════════════════════

/** Returns all messages, optionally filtered by chat_id. */
export async function getMessages(chatId) {
  const qs = chatId ? `?chat_id=${encodeURIComponent(chatId)}` : '';
  return apiFetch(`/api/messages${qs}`);
}

/** Save a new chat message. Returns the saved message. */
export async function saveMessage(chatId, sender, content) {
  return apiFetch('/api/messages', {
    method: 'POST',
    body:   JSON.stringify({ chat_id: chatId, sender, content }),
  });
}

/** Returns all chat threads (grouped by chatId, sorted newest first). */
export async function getChats() {
  return apiFetch('/api/chats');
}

// ════════════════════════════════════════════════════════════
// Admin Auth
// ════════════════════════════════════════════════════════════

/** Verifies admin credentials against the server. Returns true/false. */
export async function verifyAdmin(username, password) {
  try {
    await apiFetch('/api/admin/login', {
      method: 'POST',
      body:   JSON.stringify({ username, password }),
    });
    return true;
  } catch {
    return false;
  }
}

// ════════════════════════════════════════════════════════════
// Reset (Admin utility)
// ════════════════════════════════════════════════════════════

/** Wipes all DB data. Requires admin password for safety. */
export async function resetDatabase(password) {
  return apiFetch('/api/admin/reset', {
    method: 'POST',
    body:   JSON.stringify({ password }),
  });
}
