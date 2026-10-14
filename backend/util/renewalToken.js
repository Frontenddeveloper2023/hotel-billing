import crypto from "crypto";

/**
 * Generates an encrypted/tamper-proof URL-safe token for 1-click renewal from email
 */
export const generateRenewalToken = ({ hotelId, planId, billingCycle, expiresInDays = 7 }) => {
  const secret = process.env.JWT_SECRET || process.env.CASHFREE_SECRET_KEY || "staylio-renewal-secret";
  const expiresAt = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  const cycle = billingCycle || "monthly";
  const payload = `${hotelId}:${planId}:${cycle}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
};

/**
 * Validates the renewal token and extracts hotelId, planId, billingCycle
 */
export const verifyRenewalToken = (token) => {
  try {
    if (!token || typeof token !== "string") {
      return { valid: false, message: "Renewal token is missing." };
    }

    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 5) {
      return { valid: false, message: "Invalid renewal token structure." };
    }

    const [hotelId, planId, billingCycle, expiresAtStr, signature] = parts;
    const expiresAt = Number(expiresAtStr);

    if (!hotelId || !planId || !billingCycle || isNaN(expiresAt) || !signature) {
      return { valid: false, message: "Malformed renewal token." };
    }

    if (Date.now() > expiresAt) {
      return { valid: false, message: "Renewal link has expired. Please log in to your portal to renew your plan." };
    }

    const secret = process.env.JWT_SECRET || process.env.CASHFREE_SECRET_KEY || "staylio-renewal-secret";
    const expectedPayload = `${hotelId}:${planId}:${billingCycle}:${expiresAtStr}`;
    const expectedSig = crypto.createHmac("sha256", secret).update(expectedPayload).digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedSigBuffer = Buffer.from(expectedSig, "hex");

    if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
      return { valid: false, message: "Tampered or invalid renewal token signature." };
    }

    return {
      valid: true,
      hotelId,
      planId,
      billingCycle,
    };
  } catch (err) {
    return { valid: false, message: "Renewal token decoding failed." };
  }
};
