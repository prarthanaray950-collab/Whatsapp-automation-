/**
 * userCreator.js
 * Creates users in the SatvikMeals website database via a secure internal API call.
 * This allows the bot to register customers who provide valid details.
 */

const BASE_URL = process.env.WEBSITE_API_URL || "https://satvikmeals.com";
const BOT_SECRET = process.env.BOT_SECRET || ""; // shared secret between bot and website API

/**
 * Create a new user in the website database.
 * Uses the dev-login endpoint which creates the user if not found.
 *
 * @param {object} details - { name, phone, email? }
 * @returns {{ success: boolean, user?: object, message?: string }}
 */
async function createUser({ name, phone, email }) {
  try {
    // Generate a placeholder email from phone if no email provided
    const userEmail = email || `${phone}@whatsapp.satvikmeals.com`;

    const res = await fetch(`${BASE_URL}/api/auth/dev-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": BOT_SECRET,
      },
      body: JSON.stringify({ name, email: userEmail }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, message: data.message || "User creation failed" };
    }

    // Also update phone number if we have a token and phone
    if (data.token && phone) {
      try {
        await fetch(`${BASE_URL}/api/auth/save-phone`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.token}`,
          },
          body: JSON.stringify({ phone }),
        });
      } catch (e) {
        console.warn("[UserCreator] Could not save phone:", e.message);
      }
    }

    return { success: true, user: data.user };
  } catch (err) {
    console.error("[UserCreator] Error:", err.message);
    return { success: false, message: "Server error creating user" };
  }
}

module.exports = { createUser };
