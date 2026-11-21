const COOKIE = 'aeroboy_admin';
const SESSION_SECONDS = 60 * 60 * 10;

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
});

const now = () => new Date().toISOString();
const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const id = value => clean(value, 90).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '');
const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const active = value => value === false || value === 0 || value === '0' ? 0 : 1;
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const decodeB64url = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), char => char.charCodeAt(0));

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))));
}

async function safeEqual(left, right) {
  const [a, b] = await Promise.all([left, right].map(value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)))));
  return crypto.subtle.timingSafeEqual ? crypto.subtle.timingSafeEqual(a, b) : b64url(new Uint8Array(a)) === b64url(new Uint8Array(b));
}

function cookies(request) {
  return Object.fromEntries((request.headers.get('cookie') || '').split(';').map(part => part.trim().split(/=(.*)/s).slice(0, 2)).filter(([key]) => key));
}

async function createSession(secret) {
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })));
  return `${payload}.${await sign(payload, secret)}`;
}

async function isAdmin(request, env) {
  if (!env.SESSION_SECRET) return false;
  const token = cookies(request)[COOKIE];
  if (!token || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  if (!(await safeEqual(signature, await sign(payload, env.SESSION_SECRET)))) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(decodeB64url(payload)));
    return Number(data.exp) > Math.floor(Date.now() / 1000);
  } catch (_) { return false; }
}

function cookie(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function assertMutationOrigin(request) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

function mapProduct(row) {
  return { ...row, sizes: JSON.parse(row.sizes || '[]'), retail: Number(row.retail), wholesale: Number(row.wholesale), active: Boolean(row.active), sortOrder: Number(row.sort_order) };
}

function productInput(body, fallbackId = '') {
  const productId = id(body.id || fallbackId || body.name);
  return {
    id: productId,
    name: clean(body.name, 120),
    line: clean(body.line, 40) || 'Slim',
    category: clean(body.category, 50) || 'camisas',
    sizes: JSON.stringify((Array.isArray(body.sizes) ? body.sizes : clean(body.sizes).split(',')).map(value => clean(value, 12)).filter(Boolean)),
    retail: number(body.retail),
    wholesale: number(body.wholesale),
    note: clean(body.note, 280),
    image: clean(body.image, 500),
    active: active(body.active),
    sortOrder: Math.floor(number(body.sortOrder))
  };
}

async function readJson(request) {
  try { return await request.json(); } catch (_) { return null; }
}

async function listProducts(db, publicOnly = false) {
  const where = publicOnly ? 'WHERE active = 1' : '';
  const result = await db.prepare(`SELECT * FROM products ${where} ORDER BY sort_order, name`).all();
  return (result.results || []).map(mapProduct);
}

async function handlePublic(path, request, env) {
  if (path === 'public/products' && request.method === 'GET') {
    const products = await listProducts(env.AEROBOY_DB, true);
    return json({ products }, 200, { 'cache-control': 'public, max-age=60' });
  }
  if (path === 'public/settings' && request.method === 'GET') {
    const [settings, units] = await Promise.all([
      env.AEROBOY_DB.prepare('SELECT value FROM settings WHERE key = ?').bind('catalog').first(),
      env.AEROBOY_DB.prepare('SELECT id, name, phone, address FROM units WHERE active = 1 ORDER BY sort_order, name').all()
    ]);
    return json({ settings: JSON.parse(settings?.value || '{}'), units: units.results || [] }, 200, { 'cache-control': 'public, max-age=60' });
  }
  if (path === 'public/orders' && request.method === 'POST') {
    const body = await readJson(request);
    if (!body || !clean(body.customerName, 100) || !Array.isArray(body.items) || !body.items.length) return json({ error: 'Pedido inválido.' }, 400);
    const orderId = crypto.randomUUID();
    const timestamp = now();
    await env.AEROBOY_DB.prepare('INSERT INTO orders(id, customer_name, mode, unit_id, payment, delivery, notes, items, item_count, total, status, created_at, updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(orderId, clean(body.customerName, 100), clean(body.mode, 20), clean(body.unitId, 90), clean(body.payment, 60), clean(body.delivery, 60), clean(body.notes, 500), JSON.stringify(body.items).slice(0, 30000), Math.floor(number(body.itemCount)), number(body.total), 'new', timestamp, timestamp).run();
    return json({ ok: true, id: orderId }, 201);
  }
  return null;
}

async function handleAuth(path, request, env) {
  if (path === 'auth/session' && request.method === 'GET') return json({ authenticated: await isAdmin(request, env) });
  if (path === 'auth/login' && request.method === 'POST') {
    if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return json({ error: 'Painel ainda não foi configurado no servidor.' }, 503);
    const body = await readJson(request);
    if (!body || !(await safeEqual(body.password || '', env.ADMIN_PASSWORD))) return json({ error: 'Senha incorreta.' }, 401);
    const token = await createSession(env.SESSION_SECRET);
    return json({ ok: true }, 200, { 'set-cookie': cookie(token, SESSION_SECONDS) });
  }
  if (path === 'auth/logout' && request.method === 'POST') return json({ ok: true }, 200, { 'set-cookie': cookie('', 0) });
  return null;
}

async function handleProducts(path, request, env) {
  if (path === 'admin/products' && request.method === 'GET') return json({ products: await listProducts(env.AEROBOY_DB) });
  if (path === 'admin/products' && request.method === 'POST') {
    const body = await readJson(request); const p = productInput(body || {});
    if (!p.id || !p.name) return json({ error: 'Informe nome e código do produto.' }, 400);
    const timestamp = now();
    await env.AEROBOY_DB.prepare('INSERT INTO products(id,name,line,category,sizes,retail,wholesale,note,image,active,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(p.id,p.name,p.line,p.category,p.sizes,p.retail,p.wholesale,p.note,p.image,p.active,p.sortOrder,timestamp,timestamp).run();
    return json({ ok: true, product: p }, 201);
  }
  if (path === 'admin/products/import' && request.method === 'POST') {
    const body = await readJson(request);
    const incoming = Array.isArray(body?.products) ? body.products.slice(0, 500) : [];
    const statements = incoming.map((item, index) => {
      const p = productInput({ ...item, sortOrder: item.sortOrder ?? index + 1 }); const timestamp = now();
      return env.AEROBOY_DB.prepare('INSERT INTO products(id,name,line,category,sizes,retail,wholesale,note,image,active,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,line=excluded.line,category=excluded.category,sizes=excluded.sizes,retail=excluded.retail,wholesale=excluded.wholesale,note=excluded.note,image=excluded.image,active=excluded.active,sort_order=excluded.sort_order,updated_at=excluded.updated_at')
        .bind(p.id,p.name,p.line,p.category,p.sizes,p.retail,p.wholesale,p.note,p.image,p.active,p.sortOrder,timestamp,timestamp);
    });
    if (statements.length) await env.AEROBOY_DB.batch(statements);
    return json({ ok: true, imported: statements.length });
  }
  const match = path.match(/^admin\/products\/([^/]+)$/);
  if (match && request.method === 'PUT') {
    const body = await readJson(request); const p = productInput(body || {}, match[1]);
    const result = await env.AEROBOY_DB.prepare('UPDATE products SET name=?,line=?,category=?,sizes=?,retail=?,wholesale=?,note=?,image=?,active=?,sort_order=?,updated_at=? WHERE id=?')
      .bind(p.name,p.line,p.category,p.sizes,p.retail,p.wholesale,p.note,p.image,p.active,p.sortOrder,now(),match[1]).run();
    return result.meta.changes ? json({ ok: true }) : json({ error: 'Produto não encontrado.' }, 404);
  }
  if (match && request.method === 'DELETE') {
    await env.AEROBOY_DB.prepare('DELETE FROM products WHERE id = ?').bind(match[1]).run();
    return json({ ok: true });
  }
  return null;
}

async function handleAdmin(path, request, env) {
  const productResponse = await handleProducts(path, request, env); if (productResponse) return productResponse;
  if (path === 'admin/dashboard' && request.method === 'GET') {
    const [products, activeProducts, orders, newOrders] = await Promise.all([
      env.AEROBOY_DB.prepare('SELECT COUNT(*) count FROM products').first(), env.AEROBOY_DB.prepare('SELECT COUNT(*) count FROM products WHERE active=1').first(),
      env.AEROBOY_DB.prepare('SELECT COUNT(*) count FROM orders').first(), env.AEROBOY_DB.prepare("SELECT COUNT(*) count FROM orders WHERE status='new'").first()
    ]);
    return json({ products: products.count || 0, activeProducts: activeProducts.count || 0, orders: orders.count || 0, newOrders: newOrders.count || 0 });
  }
  if (path === 'admin/settings' && request.method === 'GET') {
    const row = await env.AEROBOY_DB.prepare('SELECT value FROM settings WHERE key=?').bind('catalog').first();
    return json({ settings: JSON.parse(row?.value || '{}') });
  }
  if (path === 'admin/settings' && request.method === 'PUT') {
    const body = await readJson(request); const value = JSON.stringify(body || {}).slice(0, 20000);
    await env.AEROBOY_DB.prepare('INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind('catalog', value, now()).run();
    return json({ ok: true });
  }
  if (path === 'admin/units' && request.method === 'GET') {
    const result = await env.AEROBOY_DB.prepare('SELECT * FROM units ORDER BY sort_order,name').all();
    return json({ units: result.results || [] });
  }
  if (path === 'admin/units' && request.method === 'PUT') {
    const body = await readJson(request); const units = Array.isArray(body?.units) ? body.units.slice(0, 30) : [];
    const timestamp = now();
    const statements = units.map((unit, index) => env.AEROBOY_DB.prepare('INSERT INTO units(id,name,phone,address,active,sort_order,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,phone=excluded.phone,address=excluded.address,active=excluded.active,sort_order=excluded.sort_order,updated_at=excluded.updated_at')
      .bind(id(unit.id || unit.name), clean(unit.name,120), clean(unit.phone,30).replace(/\D/g,''), clean(unit.address,220), active(unit.active), index + 1, timestamp));
    if (statements.length) await env.AEROBOY_DB.batch(statements);
    return json({ ok: true });
  }
  if (path === 'admin/orders' && request.method === 'GET') {
    const result = await env.AEROBOY_DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200').all();
    return json({ orders: (result.results || []).map(row => ({ ...row, items: JSON.parse(row.items || '[]') })) });
  }
  const statusMatch = path.match(/^admin\/orders\/([^/]+)\/status$/);
  if (statusMatch && request.method === 'PUT') {
    const body = await readJson(request); const status = ['new','contacted','completed','cancelled'].includes(body?.status) ? body.status : 'new';
    await env.AEROBOY_DB.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').bind(status,now(),statusMatch[1]).run();
    return json({ ok: true });
  }
  if (path === 'admin/media' && request.method === 'POST') {
    const form = await request.formData(); const file = form.get('file');
    if (!(file instanceof File)) return json({ error: 'Selecione uma imagem.' }, 400);
    if (!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)) return json({ error: 'Use JPG, PNG, WEBP ou AVIF.' }, 415);
    if (file.size > 8 * 1024 * 1024) return json({ error: 'A imagem deve ter no máximo 8 MB.' }, 413);
    const ext = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif' }[file.type];
    const key = `products/${crypto.randomUUID()}.${ext}`;
    await env.AEROBOY_MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' }, customMetadata: { originalName: clean(file.name, 150) } });
    return json({ ok: true, key, url: `/media/${key}` }, 201);
  }
  return json({ error: 'Rota não encontrada.' }, 404);
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (!assertMutationOrigin(request)) return json({ error: 'Origem da requisição não permitida.' }, 403);
  if (!env.AEROBOY_DB) return json({ error: 'Banco de dados não configurado.' }, 503);
  const path = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  const publicResponse = await handlePublic(path, request, env); if (publicResponse) return publicResponse;
  const authResponse = await handleAuth(path, request, env); if (authResponse) return authResponse;
  if (!path.startsWith('admin/')) return json({ error: 'Rota não encontrada.' }, 404);
  if (!(await isAdmin(request, env))) return json({ error: 'Não autorizado.' }, 401);
  return handleAdmin(path, request, env);
}
