/**
 * mongoSessionStore.js
 * Custom MongoDB session store for whatsapp-web.js RemoteAuth.
 * Saves the session ZIP file as base64 in MongoDB.
 */

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const sessionSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: String, required: true }, // base64 encoded zip
}, { timestamps: true });

// Prevent model recompile error on hot reload
const SessionModel = mongoose.models.WhatsappSession
  || mongoose.model("WhatsappSession", sessionSchema);

class MongoStore {

  async sessionExists({ session }) {
    try {
      const doc = await SessionModel.findOne({ key: session });
      const exists = !!doc;
      console.log(`[MongoStore] sessionExists(${session}): ${exists}`);
      return exists;
    } catch (err) {
      console.error("[MongoStore] sessionExists error:", err.message);
      return false;
    }
  }

  async save({ session, data }) {
    try {
      // data is a path to a zip file — read it and encode as base64
      let value;
      if (typeof data === "string" && fs.existsSync(data)) {
        // data is a file path
        const buf = fs.readFileSync(data);
        value = buf.toString("base64");
        console.log(`[MongoStore] Read zip from path: ${data} (${buf.length} bytes)`);
      } else if (Buffer.isBuffer(data)) {
        value = data.toString("base64");
      } else if (typeof data === "string") {
        value = data; // already base64 or stringified
      } else {
        value = JSON.stringify(data);
      }

      await SessionModel.findOneAndUpdate(
        { key: session },
        { key: session, value },
        { upsert: true, new: true }
      );
      console.log(`[MongoStore] ✅ Session saved to MongoDB: ${session}`);
    } catch (err) {
      console.error("[MongoStore] save error:", err.message);
    }
  }

  async extract({ session, path: extractPath }) {
    try {
      const doc = await SessionModel.findOne({ key: session });
      if (!doc) {
        console.log(`[MongoStore] No session found in MongoDB for: ${session}`);
        return;
      }

      // Ensure directory exists
      const dir = path.dirname(extractPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write base64 back as binary zip file
      const buf = Buffer.from(doc.value, "base64");
      fs.writeFileSync(extractPath, buf);
      console.log(`[MongoStore] ✅ Session extracted from MongoDB to: ${extractPath} (${buf.length} bytes)`);
    } catch (err) {
      console.error("[MongoStore] extract error:", err.message);
    }
  }

  async delete({ session }) {
    try {
      await SessionModel.deleteOne({ key: session });
      console.log(`[MongoStore] 🗑 Session deleted: ${session}`);
    } catch (err) {
      console.error("[MongoStore] delete error:", err.message);
    }
  }
}

module.exports = { MongoStore };
