import 'dotenv/config';

const storeTokens = new Map();
const refreshLocks = new Map();

// Base URL confirmed against official Salla Merchant API docs:
// https://docs.salla.dev/merchants/store-info
const SALLA_API_BASE = 'https://api.salla.dev/admin/v2';

function isDemoToken(token) {
  return typeof token === 'string' && token.startsWith('demo_');
}

function normalizeExpiry(expires) {
  const value = Number(expires);
  if (!Number.isFinite(value) || value <= 0) return null;
  // Salla sends Unix timestamps in seconds.
  return value;
}

/**
 * CRITICAL FIX:
 * Salla's `merchant` field in webhook payloads is a plain numeric ID.
 * If it is ever handled as a JS float (e.g. via JSON libraries, query
 * string parsing, or naive templating) it can be stringified as
 * "42417562.0" instead of "42417562". Since salla_store_id is UNIQUE
 * in the database, a mismatched string creates a *second*, orphaned
 * tenant row instead of updating the existing one — which is exactly
 * how a stale "متجر بدون اسم" row survives forever while updates keep
 * hitting a *different* correctly named row.
 *
 * This function is the single source of truth for turning ANY
 * representation of a Salla store id (number, float-like string,
 * string with whitespace) into one canonical integer string.
 */
export function normalizeStoreId(rawId) {
  if (rawId === null || rawId === undefined || rawId === '') return null;

  const numeric = Number(rawId);
  if (!Number.isFinite(numeric)) return null;

  // Math.trunc guards against any accidental float representation
  // (e.g. 42417562.0) collapsing to a non-canonical string.
  return String(Math.trunc(numeric));
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function requestSalla(path, accessToken, options = {}) {
  return fetch(`${SALLA_API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      // Per Salla docs: "Authorization" header, value = "Bearer <token>".
      // No additional custom headers are required for Merchant API calls.
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {})
    }
  });
}

export const sallaClient = {
  handleWebhook(data) {
    const eventData = data?.data || {};
    const rawStoreId = eventData.merchant ?? data?.merchant ?? null;
    const storeId = normalizeStoreId(rawStoreId);
    const accessToken = eventData.access_token;
    const refreshToken = eventData.refresh_token;
    const expires = normalizeExpiry(eventData.expires);

    if (accessToken && storeId) {
      storeTokens.set(storeId, {
        accessToken,
        refreshToken: refreshToken || null,
        expires
      });

      return {
        success: true,
        storeId,
        accessToken,
        refreshToken: refreshToken || null,
        expires
      };
    }

    return { success: false, error: 'لم يتم استلام توكن أو معرّف متجر صالح' };
  },

  async getStoreInfo(accessToken, { retries = 1 } = {}) {
    let attempt = 0;

    while (attempt <= retries) {
      try {
        const response = await requestSalla('/store/info', accessToken);
        const result = await parseJsonResponse(response);

        if (response.ok && result?.data?.name) {
          return result.data;
        }

        console.error(
          `❌ Salla Store Info Error (attempt ${attempt + 1}/${retries + 1}):`,
          response.status,
          result
        );

        // Don't retry on 401/403 — token itself is the problem, not transience.
        if (response.status === 401 || response.status === 403) {
          return {};
        }
      } catch (error) {
        console.error(
          `❌ خطأ في جلب معلومات المتجر (attempt ${attempt + 1}/${retries + 1}):`,
          error.message
        );
      }

      attempt += 1;
    }

    return {};
  },

  async getProducts(tenant) {
    const storeId = normalizeStoreId(tenant.sallaStoreId);
    const tokenData = storeId ? storeTokens.get(storeId) : null;
    const accessToken = tenant.sallaAccessToken || tokenData?.accessToken;

    // Demo tenants continue to use demo data intentionally.
    if (!accessToken || isDemoToken(accessToken)) {
      return [
        {
          id: 101,
          name: 'منتج تجريبي',
          price: 0,
          category: 'قسم تجريبي',
          quantity: 0
        }
      ];
    }

    try {
      const response = await requestSalla('/products', accessToken);
      const data = await parseJsonResponse(response);

      if (response.ok) {
        return data.data || [];
      }

      if (response.status === 401) {
        throw new Error('SALLA_TOKEN_EXPIRED');
      }

      throw new Error(
        `Salla products request failed (${response.status}): ${JSON.stringify(data)}`
      );
    } catch (error) {
      console.error('❌ خطأ في جلب منتجات سلة:', error.message);
      throw error;
    }
  },

  // ⭐ تحديث منتج موجود في Salla (مع طباعة تشخيصية)
  async updateProduct(tenant, productId, updates) {
    const storeId = normalizeStoreId(tenant.sallaStoreId);
    const tokenData = storeId ? storeTokens.get(storeId) : null;
    const accessToken = tenant.sallaAccessToken || tokenData?.accessToken;

    if (!accessToken || isDemoToken(accessToken)) {
      throw new Error('SALLA_NO_VALID_TOKEN');
    }

    try {
      // 🔍 تشخيص: طباعة ما سنرسله إلى Salla
      console.log(`📤 إرسال إلى Salla (product ${productId}):`);
      console.log(JSON.stringify(updates, null, 2));

      const response = await requestSalla(`/products/${productId}`, accessToken, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await parseJsonResponse(response);

      // 🔍 تشخيص: طباعة رد Salla
      console.log(`📥 رد Salla (${response.status}):`);
      console.log(JSON.stringify(data, null, 2));

      if (response.ok) {
        console.log(`✅ تم تحديث المنتج ${productId} في Salla بنجاح`);
        return { success: true, data: data.data };
      }

      if (response.status === 401) {
        throw new Error('SALLA_TOKEN_EXPIRED');
      }

      throw new Error(
        `Salla product update failed (${response.status}): ${JSON.stringify(data)}`
      );
    } catch (error) {
      console.error('❌ خطأ في تحديث المنتج في Salla:', error.message);
      throw error;
    }
  },

  // Placeholder for the next Salla foundation step.
  // Refresh must be implemented with a per-merchant lock because Salla refresh tokens are single-use.
  async refreshAccessToken() {
    throw new Error('SALLA_REFRESH_NOT_IMPLEMENTED');
  },

  getRefreshLock(storeId) {
    const normalized = normalizeStoreId(storeId);
    return normalized ? refreshLocks.get(normalized) || null : null;
  }
};