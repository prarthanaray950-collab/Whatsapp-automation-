/**
 * liveData.js
 * Fetches live menu and plans from the SatvikMeals website API.
 * Results are cached for 15 minutes to avoid hammering the API.
 */

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

let _menuCache   = null;
let _menuCacheAt = 0;
let _plansCache   = null;
let _plansCacheAt = 0;

const BASE_URL = process.env.WEBSITE_API_URL || "https://satvikmeals.com";

async function fetchJSON(path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    timeout: 8000,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return res.json();
}

/**
 * Returns current week menu. Cached for 15 min.
 * @returns {object|null}
 */
async function getLiveMenu() {
  if (_menuCache && Date.now() - _menuCacheAt < CACHE_TTL_MS) return _menuCache;
  try {
    const data = await fetchJSON("/api/menu/current");
    _menuCache   = data;
    _menuCacheAt = Date.now();
    return data;
  } catch (err) {
    console.warn("[LiveData] Could not fetch menu:", err.message);
    return _menuCache || null; // return stale cache if available
  }
}

/**
 * Returns active subscription plans. Cached for 15 min.
 * @returns {Array}
 */
async function getLivePlans() {
  if (_plansCache && Date.now() - _plansCacheAt < CACHE_TTL_MS) return _plansCache;
  try {
    const data = await fetchJSON("/api/plans");
    _plansCache   = Array.isArray(data) ? data : [];
    _plansCacheAt = Date.now();
    return _plansCache;
  } catch (err) {
    console.warn("[LiveData] Could not fetch plans:", err.message);
    return _plansCache || [];
  }
}

/**
 * Format the week's menu into a readable WhatsApp-friendly string.
 */
function formatMenu(menuData) {
  if (!menuData || !menuData.items || menuData.items.length === 0) {
    return "Iss hafte ka menu abhi available nahi hai. Kripya call karein: 6201276506";
  }

  const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const items = menuData.items
    .filter((d) => DAY_ORDER.includes(d.day))
    .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day));

  const lines = ["🗓 *Is Hafte Ka Menu:*\n"];
  for (const day of items) {
    lines.push(`📅 *${day.day}*`);
    if (day.lunchItems?.length)  lines.push(`  🌞 Lunch: ${day.lunchItems.join(", ")}`);
    if (day.dinnerItems?.length) lines.push(`  🌙 Dinner: ${day.dinnerItems.join(", ")}`);
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Format plans into readable WhatsApp text.
 */
function formatPlans(plans) {
  if (!plans || plans.length === 0) {
    return "Abhi koi active plan available nahi hai. Call karein: 6201276506";
  }
  const lines = ["📋 *Subscription Plans:*\n"];
  for (const p of plans) {
    lines.push(`✅ *${p.name}* — Rs. ${p.price}/${p.type}`);
    if (p.description) lines.push(`   ${p.description}`);
    if (p.features?.length) lines.push(`   Features: ${p.features.join(" | ")}`);
    lines.push("");
  }
  return lines.join("\n");
}

module.exports = { getLiveMenu, getLivePlans, formatMenu, formatPlans };
