const { chat } = require("./openrouter");
const { getHistory, appendMessage, clearHistory } = require("./contextManager");
const Order = require("../db/models/Order");
const { createUser } = require("./userCreator");
const adminNotifier = require("./adminNotifier");

const extractBlock = (text, tag) => {
  const match = text.match(new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`));
  if (!match) return null;
  const block = match[1];
  const getValue = (key) => {
    const m = block.match(new RegExp(`${key}:\\s*(.+)`));
    return m ? m[1].trim() : "";
  };
  return { raw: block, getValue };
};

const cleanReply = (text) =>
  text
    .replace(/\[ORDER_CONFIRMED\][\s\S]*?\[\/ORDER_CONFIRMED\]/g, "")
    .replace(/\[REGISTER_USER\][\s\S]*?\[\/REGISTER_USER\]/g, "")
    .replace(/\[COMPLAINT\][\s\S]*?\[\/COMPLAINT\]/g, "")
    .replace(/\[SUBSCRIPTION_INTEREST\][\s\S]*?\[\/SUBSCRIPTION_INTEREST\]/g, "")
    .trim();

async function handleOrderConfirmed(aiReply, phoneNumber) {
  const block = extractBlock(aiReply, "ORDER_CONFIRMED");
  if (!block) return false;
  const customerName = block.getValue("Name") || "Unknown";
  const address = block.getValue("Address") || "";
  const item = block.getValue("Item") || "Unknown";
  const amount = parseInt(block.getValue("Amount").replace(/[^\d]/g, "")) || 0;
  try {
    await Order.create({ phoneNumber, customerName, address, items: [item], totalAmount: amount, status: "pending" });
    console.log(`[ORDER SAVED] ${phoneNumber} — ${customerName} — Rs.${amount}`);
  } catch (err) { console.error("[ORDER SAVE ERROR]", err.message); }
  await adminNotifier.notifyNewOrder({ phoneNumber, customerName, address, item, amount });
  await clearHistory(phoneNumber);
  return true;
}

async function handleRegisterUser(aiReply, phoneNumber) {
  const block = extractBlock(aiReply, "REGISTER_USER");
  if (!block) return false;
  const name = block.getValue("Name") || "Customer";
  const phone = block.getValue("Phone") || phoneNumber.replace("@c.us", "").replace(/^91/, "");
  const result = await createUser({ name, phone });
  if (result.success) {
    console.log(`[USER CREATED] ${name} — ${phone}`);
    await adminNotifier.notifyNewUser({ phoneNumber, name, phone });
  } else {
    console.warn(`[USER CREATION FAILED] ${result.message}`);
  }
  return true;
}

async function handleComplaint(aiReply, phoneNumber) {
  const block = extractBlock(aiReply, "COMPLAINT");
  if (!block) return false;
  const issue = block.getValue("Issue") || aiReply.slice(0, 200);
  await adminNotifier.notifyComplaint({ phoneNumber, customerName: "", issue });
  console.log(`[COMPLAINT] ${phoneNumber}: ${issue}`);
  return true;
}

async function handleSubscriptionInterest(aiReply, phoneNumber) {
  const block = extractBlock(aiReply, "SUBSCRIPTION_INTEREST");
  if (!block) return false;
  const planName = block.getValue("Plan") || "Not specified";
  await adminNotifier.notifySubscriptionInterest({ phoneNumber, customerName: "", planName });
  console.log(`[SUBSCRIPTION INTEREST] ${phoneNumber}: ${planName}`);
  return true;
}

const handleMessage = async (msg, client) => {
  const phoneNumber = msg.from;
  const userText = msg.body?.trim();
  if (msg.isGroupMsg || msg.from.includes("@g.us")) return;
  if (phoneNumber === "status@broadcast") return;
  if (!userText || msg.hasMedia) {
    if (msg.hasMedia) await client.sendMessage(phoneNumber, "Media messages abhi support nahi hote 😊 Please text mein likhein.");
    return;
  }
  console.log(`[MSG IN]  ${phoneNumber}: ${userText}`);
  try {
    const history = await getHistory(phoneNumber);
    await appendMessage(phoneNumber, "user", userText);
    const aiReply = await chat(userText, history);
    console.log(`[MSG OUT] ${phoneNumber}: ${cleanReply(aiReply).slice(0, 80)}...`);
    const orderDone = await handleOrderConfirmed(aiReply, phoneNumber);
    await handleRegisterUser(aiReply, phoneNumber);
    await handleComplaint(aiReply, phoneNumber);
    await handleSubscriptionInterest(aiReply, phoneNumber);
    if (!orderDone) await appendMessage(phoneNumber, "model", aiReply);
    const messageToSend = cleanReply(aiReply);
    if (messageToSend) await client.sendMessage(phoneNumber, messageToSend);
  } catch (err) {
    console.error(`[ERROR] ${phoneNumber}:`, err.message);
    await client.sendMessage(phoneNumber, "Kuch technical issue aa gaya 😔 Please thodi der baad try karein ya call karein: 6201276506");
  }
};

module.exports = { handleMessage };
