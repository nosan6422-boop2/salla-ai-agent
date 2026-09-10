import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// إنشاء الجدول إذا لم يكن موجوداً
await db.execute(`
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

// إضافة المتاجر التجريبية إذا كانت القاعدة فارغة
const countResult = await db.execute('SELECT COUNT(*) as count FROM tenants');
const count = countResult.rows[0]?.count || 0;

if (count === 0) {
  await db.execute({
    sql: `INSERT INTO tenants (id, store_name, salla_store_id, salla_access_token, salla_refresh_token, salla_token_expires, owner_email, settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ['store_demo_1', 'متجر عطور الأناقة', 'salla_98231', 'demo_token_perfume', null, null, 'owner@elegance-oud.sa', JSON.stringify({ tone: 'فاخر وراقي', dialect: 'اللهجة السعودية' })]
  });
  
  await db.execute({
    sql: `INSERT INTO tenants (id, store_name, salla_store_id, salla_access_token, salla_refresh_token, salla_token_expires, owner_email, settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ['store_demo_2', 'أزياء النخبة ستايل', 'salla_54112', 'demo_token_fashion', null, null, 'contact@elitemode.sa', JSON.stringify({ tone: 'عصري وشبابي', dialect: 'فصحى مبسطة' })]
  });
  
  console.log('✅ تم إضافة المتاجر التجريبية إلى قاعدة البيانات (Turso)');
}

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

export async function getTenantDb(tenantId) {
  const result = await db.execute({
    sql: 'SELECT * FROM tenants WHERE id = ?',
    args: [tenantId]
  });
  return rowToTenantFull(result.rows[0]);
}

export async function listTenants() {
  const result = await db.execute('SELECT * FROM tenants');
  return result.rows.map(rowToTenantPublic);
}

export async function registerTenantStore(data) {
  const sallaStoreId = String(data.sallaStoreId);
  
  const existingResult = await db.execute({
    sql: 'SELECT * FROM tenants WHERE salla_store_id = ?',
    args: [sallaStoreId]
  });
  const existing = existingResult.rows[0];

  const settings = JSON.stringify(
    data.settings || { tone: 'ودي ومحفز بالشراء', dialect: 'سعودية بيضاء' }
  );

  if (existing) {
    await db.execute({
      sql: `UPDATE tenants SET 
              store_name = ?,
              salla_access_token = COALESCE(?, salla_access_token),
              salla_refresh_token = COALESCE(?, salla_refresh_token),
              salla_token_expires = COALESCE(?, salla_token_expires),
              settings = ?
            WHERE salla_store_id = ?`,
      args: [
        data.storeName || existing.store_name,
        data.sallaAccessToken || null,
        data.sallaRefreshToken || null,
        data.sallaTokenExpires ?? null,
        settings,
        sallaStoreId
      ]
    });
    console.log(`🔄 تم تحديث المتجر (${sallaStoreId}) في قاعدة البيانات`);
    return getTenantDb(existing.id);
  }

  const id = `store_${sallaStoreId}`;
  await db.execute({
    sql: `INSERT INTO tenants (id, store_name, salla_store_id, salla_access_token, salla_refresh_token, salla_token_expires, owner_email, settings) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.storeName || 'متجر بدون اسم',
      sallaStoreId,
      data.sallaAccessToken || '',
      data.sallaRefreshToken || null,
      data.sallaTokenExpires ?? null,
      data.ownerEmail || 'unknown@email.com',
      settings
    ]
  });

  console.log(`✅ تم إنشاء متجر جديد (${id}) في قاعدة البيانات`);
  return getTenantDb(id);
}