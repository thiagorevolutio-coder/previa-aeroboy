CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  line TEXT NOT NULL,
  category TEXT NOT NULL,
  sizes TEXT NOT NULL DEFAULT '[]',
  retail REAL NOT NULL DEFAULT 0,
  wholesale REAL NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_active_sort ON products(active, sort_order, name);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  mode TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  payment TEXT NOT NULL,
  delivery TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  items TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);

INSERT OR IGNORE INTO settings(key, value, updated_at) VALUES
  ('catalog', '{"title":"Catálogo completo","subtitle":"Escolha suas peças e monte seu pedido.","notice":"FABRICAÇÃO PRÓPRIA • ATACADO E VAREJO • ENVIO PARA TODO O BRASIL","instagram":"https://www.instagram.com/aeroboyoficial/"}', datetime('now'));

INSERT OR IGNORE INTO units(id, name, phone, address, active, sort_order, updated_at) VALUES
  ('centro1', 'Centro Fashion — Loja 1', '5585985009803', '', 1, 1, datetime('now')),
  ('centro2', 'Centro Fashion — Loja 2', '5585996858724', '', 1, 2, datetime('now')),
  ('shopping', 'Shopping Central', '5585997018084', '', 1, 3, datetime('now')),
  ('jangurussu', 'Jangurussu — Loja 5', '5585994261652', '', 1, 4, datetime('now')),
  ('planalto', 'Planalto Ayrton Senna', '5585997018084', '', 1, 5, datetime('now'));
