/**
 * adminNotifier.js
 * Sends important event notifications to the owner's WhatsApp number.
 * Covers: new orders, new user registrations, complaints, subscription inquiries.
 */

// Format: 91XXXXXXXXXX@c.us (Indian number with country code, no +)
const getAdminChatId = () => {
  const raw = process.env.ADMIN_WHATSAPP || "919031447621";
  const digits = raw.replace(/\D/g, "");
  return `${digits}@c.us`;
};

let _client = null;

/**
 * Set the WhatsApp client reference (called from index.js after client is ready)
 */
function setClient(client) {
  _client = client;
}

/**
 * Send a notification to admin WhatsApp
 * @param {string} message
 */
async function notify(message) {
  if (!_client) {
    console.warn("[AdminNotifier] No WhatsApp client set. Skipping notification.");
    return;
  }
  try {
    const adminId = getAdminChatId();
    await _client.sendMessage(adminId, message);
    console.log(`[AdminNotifier] Sent to ${adminId}`);
  } catch (err) {
    console.error("[AdminNotifier] Failed to send:", err.message);
  }
}

/**
 * Notify admin about a new order placed via WhatsApp bot
 */
async function notifyNewOrder({ phoneNumber, customerName, address, item, amount }) {
  const ist = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const msg =
    `🍱 *NEW ORDER (Bot)*\n\n` +
    `👤 Name: ${customerName}\n` +
    `📱 Phone: ${phoneNumber.replace("@c.us", "")}\n` +
    `📍 Address: ${address}\n` +
    `🛒 Item: ${item}\n` +
    `💰 Amount: Rs. ${amount}\n` +
    `🕐 Time: ${ist}`;
  await notify(msg);
}

/**
 * Notify admin about a new user registered via bot
 */
async function notifyNewUser({ phoneNumber, name, phone }) {
  const ist = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const msg =
    `👤 *NEW USER REGISTERED (Bot)*\n\n` +
    `Name: ${name}\n` +
    `Phone: ${phone || phoneNumber.replace("@c.us", "")}\n` +
    `Time: ${ist}`;
  await notify(msg);
}

/**
 * Notify admin about a complaint / feedback
 */
async function notifyComplaint({ phoneNumber, customerName, issue }) {
  const ist = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const msg =
    `⚠️ *COMPLAINT / FEEDBACK (Bot)*\n\n` +
    `👤 ${customerName || phoneNumber.replace("@c.us", "")}\n` +
    `📱 ${phoneNumber.replace("@c.us", "")}\n` +
    `💬 ${issue}\n` +
    `🕐 ${ist}`;
  await notify(msg);
}

/**
 * Notify admin about a subscription inquiry
 */
async function notifySubscriptionInterest({ phoneNumber, customerName, planName }) {
  const ist = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const msg =
    `📋 *SUBSCRIPTION INTEREST (Bot)*\n\n` +
    `👤 ${customerName || phoneNumber.replace("@c.us", "")}\n` +
    `📱 ${phoneNumber.replace("@c.us", "")}\n` +
    `📦 Plan: ${planName || "Not specified"}\n` +
    `🕐 ${ist}`;
  await notify(msg);
}

module.exports = {
  setClient,
  notify,
  notifyNewOrder,
  notifyNewUser,
  notifyComplaint,
  notifySubscriptionInterest,
};
