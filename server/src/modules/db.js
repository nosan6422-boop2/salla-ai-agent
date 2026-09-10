import Database from 'better-sqlite3';
import { normalizeStoreId } from './salla.js';

const db = new Database('salla_agents.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    store_name TEXT,
    salla_store_id TEXT UNIQUE,
    salla_access_token TEXT,
    salla_refresh_token TEXT,
    salla_token_expires INTEGER,
    owner_email TEXT,
    settings TEXT
  )
`);

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// Keeps existing local databases compatible with the new token fields.
ensureColumn('tenants', 'salla_refresh_token', 'TEXT');
ensureColumn('tenants', 'salla_token_expires', 'INTEGER');

const count = db.prepare('SELECT COUNT(*) as count FROM tenants').get().count;

if (count === 0) {
  db.prepare(`
    INSERT INTO tenants
      (id, store_name, salla_store_id, salla_access_token, salla_refresh_token, salla_token_expires, owner_email, settings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'store_demo_1',
    'متجر عطور الأناقة',
    'salla_98231',
    'demo_token_perfume',
    null,
    null,
    'owner@elegance-oud.sa',
    JSON.stringify({ tone: 'فاخر وراقي', dialect: 'اللهجة السعودية' })
  );

  db.prepare(`
    INSERT INTO tenants
      (id, store_name, salla_store_id, salla_access_token, salla_refresh_token, salla_token_expires, owner_email, settings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'store_demo_2',
    'أزياء النخبة ستايل',
    'salla_54112',
    'demo_token_fashion',
    null,
    null,
    'contact@elitemode.sa',
    JSON.stringify({ tone: 'عصري وشبابي', dialect: 'فصحى مبسطة' })
  );

  console.log('✅ تم إضافة المتاجر التجريبية إلى قاعدة البيانات');
}

/**
 * ONE-TIME MIGRATION:
 * Older code could write salla_store_id as "42417562.0" (float-like
 * string) instead of "42417562", producing an orphaned duplicate row
 * — usually the one still showing "متجر بدون اسم" in the UI, separate
 * from any later, correctly named row for the same real store.
 *
 * This pass finds any row whose id is NOT the canonical normalized
 * form, and either merges it into the canonical row (preferring real
 * data over placeholders) or renames it in place if no canonical row
 * exists yet.
 */
function migrateMalformedStoreIds() {
  const rows = db.prepare('SELECT * FROM tenants').all();

  for (const row of rows) {
    if (!row.salla_store_id) continue;

    const canonical = normalizeStoreId(row.salla_store_id);
    if (!canonical || canonical === row.salla_store_id) continue;

    const canonicalRow = db
      .prepare('SELECT * FROM tenants WHERE salla_store_id = ?')
      .get(canonical);

    if (canonicalRow) {
      // A correct row already exists — keep it, prefer its real name,
      // backfill tokens if the canonical row is missing them, then
      // delete the malformed duplicate.
      db.prepare(`
        UPDATE tenants
        SET salla_access_token = COALESCE(NULLIF(salla_access_token, ''), ?),
            salla_refresh_token = COALESCE(salla_refresh_token, ?),
            salla_token_expires = COALESCE(salla_token_expires, ?)
        WHERE salla_store_id = ?
      `).run(
        row.salla_access_token,
        row.salla_refresh_token,
        row.salla_token_expires,
        canonical
      );

      db.prepare('DELETE FROM tenants WHERE id = ?').run(row.id);
      console.log(
        `🧹 تم دمج السجل الفاسد (${row.salla_store_id}) داخل السجل الصحيح (${canonical}) وحذف التكرار.`
      );
    } else {
      // No canonical row yet — just fix the id in place.
      const newId = `store_${canonical}`;
      db.prepare(`
        UPDATE tenants
        SET id = ?, salla_store_id = ?
        WHERE id = ?
      `).run(newId, canonical, row.id);
      console.log(
        `🧹 تم تصحيح معرّف المتجر الفاسد (${row.salla_store_id}) إلى (${canonical}).`
      );
    }
  }
}

migrateMalformedStoreIds();

function parseSettings(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function rowToTenantFull(row) {
  if (!row) return null;

  return {
    id: row.id,
    storeName: row.store_name,
    sallaStoreId: row.salla_store_id,
    sallaAccessToken: row.salla_access_token,
    sallaRefreshToken: row.salla_refresh_token,
    sallaTokenExpires: row.salla_token_expires,
    ownerEmail: row.owner_email,
    settings: parseSettings(row.settings)
  };
}

function rowToTenantPublic(row) {
  if (!row) return null;

  return {
    id: row.id,
    storeName: row.store_name,
    sallaStoreId: row.salla_store_id,
    ownerEmail: row.owner_email,
    settings: parseSettings(row.settings)
  };
}

export function getTenantDb(tenantId) {
  const row = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
  return rowToTenantFull(row);
}

export function listTenants() {
  const rows = db.prepare('SELECT * FROM tenants').all();
  return rows.map(rowToTenantPublic);
}

/**
 * CRITICAL FIX vs previous version:
 * 1. sallaStoreId is ALWAYS normalized before touching the DB, so the
 *    ".0" duplication bug can never happen again.
 * 2. storeName is now REQUIRED — no more silent 'متجر بدون اسم'
 *    fallback. If Salla's name couldn't be resolved, the caller must
 *    fix that upstream (see index.js, which now refuses to call this
 *    without a verified name) rather than have the DB paper over it.
 */
export function registerTenantStore(data) {
  const sallaStoreId = normalizeStoreId(data.sallaStoreId);

  if (!sallaStoreId) {
    throw new Error('sallaStoreId is required and must be a valid store id');
  }

  if (!data.storeName || !String(data.storeName).trim()) {
    throw new Error('storeName is required — refusing to save a store without a real name');
  }

  const existing = db
    .prepare('SELECT * FROM tenants WHERE salla_store_id = ?')
    .get(sallaStoreId);

  const settings = JSON.stringify(
    data.settings || { tone: 'ودي ومحفز بالشراء', dialect: 'سعودية بيضاء' }
  );

  if (existing) {
    db.prepare(`
      UPDATE tenants
      SET store_name = ?,
          salla_access_token = COALESCE(?, salla_access_token),
          salla_refresh_token = COALESCE(?, salla_refresh_token),
          salla_token_expires = COALESCE(?, salla_token_expires),
          owner_email = COALESCE(?, owner_email),
          settings = ?
      WHERE salla_store_id = ?
    `).run(
      data.storeName,
      data.sallaAccessToken || null,
      data.sallaRefreshToken || null,
      data.sallaTokenExpires ?? null,
      data.ownerEmail || null,
      settings,
      sallaStoreId
    );

    console.log(`🔄 تم تحديث المتجر (${sallaStoreId}) في قاعدة البيانات`);
    return getTenantDb(existing.id);
  }

  const id = `store_${sallaStoreId}`;

  db.prepare(`
    INSERT INTO tenants
      (id, store_name, salla_store_id, salla_access_token, salla_refresh_token, salla_token_expires, owner_email, settings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.storeName,
    sallaStoreId,
    data.sallaAccessToken || '',
    data.sallaRefreshToken || null,
    data.sallaTokenExpires ?? null,
    data.ownerEmail || 'unknown@email.com',
    settings
  );

  console.log(`✅ تم إنشاء متجر جديد (${id}) في قاعدة البيانات`);
  return getTenantDb(id);
}