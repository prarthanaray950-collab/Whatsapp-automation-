const Conversation = require("../db/models/Conversation");

const HISTORY_LIMIT = 12; // last 12 messages kept in context (6 exchanges)

/**
 * Load conversation history for a phone number
 * Returns in Gemini-compatible format: [{role, parts}]
 */
const getHistory = async (phoneNumber) => {
  try {
    const convo = await Conversation.findOne({ phoneNumber });
    if (!convo || !convo.history.length) return [];

    return convo.history.slice(-HISTORY_LIMIT).map((m) => ({
      role: m.role,
      parts: m.parts,
    }));
  } catch (err) {
    console.error("[ContextManager] getHistory error:", err.message);
    return [];
  }
};

/**
 * Append a message to conversation history
 */
const appendMessage = async (phoneNumber, role, text) => {
  try {
    await Conversation.findOneAndUpdate(
      { phoneNumber },
      {
        $push: { history: { role, parts: [{ text }] } },
        $set: { updatedAt: new Date() },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error("[ContextManager] appendMessage error:", err.message);
  }
};

/**
 * Clear all history for a phone number (called after order is placed)
 */
const clearHistory = async (phoneNumber) => {
  try {
    await Conversation.findOneAndUpdate(
      { phoneNumber },
      { $set: { history: [], updatedAt: new Date() } }
    );
  } catch (err) {
    console.error("[ContextManager] clearHistory error:", err.message);
  }
};

module.exports = { getHistory, appendMessage, clearHistory };
