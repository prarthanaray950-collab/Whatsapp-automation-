/**
 * Strip WhatsApp suffix from phone number
 * "919876543210@c.us" -> "919876543210"
 */
const cleanPhone = (whatsappId) => {
  return whatsappId.replace(/@c\.us$/, "").replace(/@.*$/, "");
};

/**
 * Format phone number for display
 * "919876543210" -> "+91 98765 43210"
 */
const formatPhone = (phone) => {
  const clean = cleanPhone(phone);
  if (clean.startsWith("91") && clean.length === 12) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  }
  return `+${clean}`;
};

module.exports = { cleanPhone, formatPhone };
