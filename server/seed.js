// Schema + seed data. Kept as a JS string (not a .sql file) so it is bundled
// with the Vercel function automatically.
export const SCHEMA_AND_SEED = `
CREATE TABLE products (
  sku            TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  units_per_case INTEGER NOT NULL CHECK (units_per_case > 0),
  image_url      TEXT                 -- product preview image (served from /public)
);

CREATE TABLE locations (
  code  TEXT PRIMARY KEY,           -- e.g. A1-R2-S1
  aisle INTEGER NOT NULL,           -- parsed from code; drives pick sequence
  rack  INTEGER NOT NULL,
  shelf INTEGER NOT NULL
);

CREATE TABLE inventory (
  sku           TEXT NOT NULL REFERENCES products(sku),
  location_code TEXT NOT NULL REFERENCES locations(code),
  cases         INTEGER NOT NULL CHECK (cases >= 0),   -- full cases only
  PRIMARY KEY (sku, location_code)
);

CREATE TABLE open_shelf (
  sku            TEXT PRIMARY KEY REFERENCES products(sku),
  capacity_units INTEGER NOT NULL CHECK (capacity_units > 0),
  current_units  INTEGER NOT NULL CHECK (current_units >= 0),
  overflow_units INTEGER NOT NULL DEFAULT 0 CHECK (overflow_units >= 0), -- loose units from an opened case
  CHECK (current_units <= capacity_units)
);

INSERT INTO products (sku, name, units_per_case, image_url) VALUES
  ('TURTLE-01', 'Sea Turtle Plush', 12, '/products/turtle-01.webp'),
  ('SHARK-02',  'Shark Plush',       8, '/products/shark-02.webp'),
  ('MOOSE-03',  'Moose Plush',       6, '/products/moose-03.webp'),
  ('ALIEN-04',  'Alien Plush',      12, '/products/alien-04.webp');

INSERT INTO locations (code, aisle, rack, shelf) VALUES
  ('A1-R2-S1', 1, 2, 1),
  ('A2-R3-S1', 2, 3, 1),
  ('A3-R4-S2', 3, 4, 2),
  ('A4-R1-S2', 4, 1, 2),
  ('A5-R1-S1', 5, 1, 1);

INSERT INTO inventory (sku, location_code, cases) VALUES
  ('TURTLE-01', 'A1-R2-S1', 18),
  ('TURTLE-01', 'A4-R1-S2',  7),
  ('SHARK-02',  'A2-R3-S1', 14),
  ('MOOSE-03',  'A5-R1-S1',  9),
  ('ALIEN-04',  'A3-R4-S2',  4);

INSERT INTO open_shelf (sku, capacity_units, current_units, overflow_units) VALUES
  ('TURTLE-01', 60, 17, 0);
`;
