/**
 * mongoSessionStore.js
 * Custom MongoDB session store for whatsapp-web.js.
 * Replaces wwebjs-mongo without any extra package needed.
 * Stores the WhatsApp session in your existing MongoDB database.
 */

const mongoose = require("mongoose");

// Simple schema — just key + value (base64 session data)
const sessionSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: String, required: true },
}, { timestamps: true });

const SessionModel = mongoose.model("WhatsappSession", sessionSchema);

/**
 * MongoStore class compatible with whatsapp-web.js RemoteAuth interface.
 * Implements: sessionExists, save, extract, delete
 */
class MongoStore {
  /**
   * Check if a session exists in MongoDB
   */
  async sessionExists({ session }) {
    try {
      const doc = await SessionModel.findOne({ key: session });
      return !!doc;
    } catch (err) {
      console.error("[MongoStore] sessionExists error:", err.message);
      return false;
    }
  }

  /**
   * Save session data to MongoDB
   * @param {object} param0 - { session: string, data: string }
   */
  async save({ session, data }) {
    try {
      await SessionModel.findOneAndUpdate(
        { key: session },
        { key: session, value: typeof data === "string" ? data : JSON.stringify(data) },
        { upsert: true, new: true }
      );
      console.log("[MongoStore] ✅ Session saved:", session);
    } catch (err) {
      console.error("[MongoStore] save error:", err.message);
    }
  }

  /**
   * Extract (retrieve) session data from MongoDB
   * @param {object} param0 - { session: string, path: string }
   */
  async extract({ session, path: extractPath }) {
    try {
      const doc = await SessionModel.findOne({ key: session });
      if (!doc) return null;

      // whatsapp-web.js RemoteAuth expects the data written to a zip file at `path`
      // We write the base64 value back to disk so the library can read it
      const fs = require("fs");
      const dataToWrite = doc.value;

      // Ensure directory exists
      const dir = require("path").dirname(extractPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      fs.writeFileSync(extractPath, dataToWrite);
      console.log("[MongoStore] ✅ Session extracted:", session);
    } catch (err) {
      console.error("[MongoStore] extract error:", err.message);
    }
  }

  /**
   * Delete session from MongoDB
   */
  async delete({ session }) {
    try {
      await SessionModel.deleteOne({ key: session });
      console.log("[MongoStore] 🗑 Session deleted:", session);
    } catch (err) {
      console.error("[MongoStore] delete error:", err.message);
    }
  }
}

module.exports = { MongoStore };

