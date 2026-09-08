import Database from 'better-sqlite3';

// إنشاء قاعدة البيانات في ملف حقيقي داخل مجلد المشروع
const db = new Database('salla_agents.db');

// إنشاء جدول المتاجر إذا لم يكن موجوداً
db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    store_name TEXT,
    salla_store_id TEXT,
    salla_access_token TEXT,
    owner_email TEXT,
    settings TEXT
  )
`);

// 🆕 إضافة متاجر تجريبية تلقائياً إذا كان الجدول فارغاً (حتى لا يتعطل الوكيل)
const count = db.prepare('SELECT COUNT(*) as count FROM tenants').get().count;
if (count === 0) {
  db.prepare(`INSERT INTO tenants (id, store_name, salla_store_id, salla_access_token, owner_email, settings) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('store_demo_1', 'متجر عطور الأناقة', 'salla_98231', 'demo_token_perfume', 'owner@elegance-oud.sa', JSON.stringify({ tone: 'فاخر وراقي', dialect: 'اللهجة السعودية' }));
  
  db.prepare(`INSERT INTO tenants (id, store_name, salla_store_id, salla_access_token, owner_email, settings) VALUES (?, ?, ?, ?, ?, ?)`)
    .run('store_demo_2', 'أزياء النخبة ستايل', 'salla_54112', 'demo_token_fashion', 'contact@elitemode.sa', JSON.stringify({ tone: 'عصري وشبابي', dialect: 'فصحى مبسطة' }));
    
  console.log('✅ تم إضافة المتاجر التجريبية إلى قاعدة البيانات');
}

// تحويل الصفوف من قاعدة البيانات إلى كائنات JavaScript
function rowToTenant(row) {
  if (!row) return null;
  return {
    id: row.id,
    storeName: row.store_name,
    sallaStoreId: row.salla_store_id,
    sallaAccessToken: row.salla_access_token,
    ownerEmail: row.owner_email,
    settings: row.settings ? JSON.parse(row.settings) : {}
  };
}

// جلب متجر واحد بواسطة المعرّف
export function getTenantDb(tenantId) {
  const row = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
  return rowToTenant(row);
}

// جلب قائمة جميع المتاجر
export function listTenants() {
  const rows = db.prepare('SELECT * FROM tenants').all();
  return rows.map(rowToTenant);
}

// تسجيل / إضافة متجر جديد
export function registerTenantStore(data) {
  const id = `store_${Date.now()}`;
  const settings = JSON.stringify({ tone: 'ودي ومحفز بالشراء', dialect: 'سعودية بيضاء' });

  db.prepare(`
    INSERT INTO tenants (id, store_name, salla_store_id, salla_access_token, owner_email, settings)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.storeName, data.sallaStoreId, data.sallaAccessToken || 'demo_' + Date.now(), data.ownerEmail || 'unknown@email.com', settings);

  return getTenantDb(id);
}