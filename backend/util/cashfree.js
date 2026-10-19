import crypto from "crypto";
import { log } from "./logger.js";

/**
 * Returns Cashfree PG Configuration based on environment variables
 */
export const getCashfreeConfig = () => {
  const appId = process.env.CASHFREE_APP_ID?.trim();
  const secretKey = process.env.CASHFREE_SECRET_KEY?.trim();
  const env = (process.env.CASHFREE_ENV || "sandbox").trim().toLowerCase();
  const apiVersion = (process.env.CASHFREE_API_VERSION || "2023-08-01").trim();
  const baseUrl =
    env === "production"
      ? (process.env.CASHFREE_PROD_URL?.trim() || "https://api.cashfree.com/pg")
      : (process.env.CASHFREE_TEST_URL?.trim() || "https://sandbox.cashfree.com/pg");

  return {
    appId,
    secretKey,
    env,
    apiVersion,
    baseUrl,
  };
};

/**
 * Creates an Order in Cashfree Payment Gateway
 * Returns payment_session_id required by Cashfree Web Checkout SDK
 */
export const createCashfreeOrder = async ({
  orderId,
  orderAmount,
  customerDetails,
  returnUrl,
  orderNote = "",
}) => {
  const { appId, secretKey, baseUrl, apiVersion, env } = getCashfreeConfig();

  if (!appId || !secretKey) {
    throw new Error(
      "Cashfree credentials missing. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in environment."
    );
  }

  const sanitizedAmount = Number(orderAmount);
  if (isNaN(sanitizedAmount) || sanitizedAmount <= 0) {
    throw new Error("Invalid order amount. Amount must be greater than 0.");
  }

  // Format customer phone (strip non-digits, max 10 digits)
  const rawPhone = String(customerDetails?.customer_phone || "").replace(/\D/g, "");
  const customerPhone = rawPhone.length >= 10 ? rawPhone.slice(-10) : "9999999999";

  const payload = {
    order_id: String(orderId),
    order_amount: Number(sanitizedAmount.toFixed(2)),
    order_currency: "INR",
    customer_details: {
      customer_id: String(customerDetails?.customer_id || `cust_${Date.now()}`),
      customer_name: String(customerDetails?.customer_name || "Valued Customer").trim(),
      customer_email: String(customerDetails?.customer_email || "billing@hotel.com").trim().toLowerCase(),
      customer_phone: customerPhone,
    },
    order_meta: {
      return_url:
        returnUrl ||
        process.env.CASHFREE_RETURN_URL ||
        `${(process.env.CLIENT_URL || process.env.FRONTEND_URL || process.env.BACKEND_URL || "").trim().replace(/\/+$/, "")}/hotel-billing-system/payment-return?order_id={order_id}`.replace("/hotel-billing-system/hotel-billing-system", "/hotel-billing-system"),
    },
    order_note: orderNote || "Hotel Billing SaaS Plan Subscription",
  };

  log.info(
    `[Cashfree] Creating order ${payload.order_id} (₹${payload.order_amount}) in ${env} mode for ${payload.customer_details.customer_email}`
  );

  const response = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: {
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": apiVersion,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Cashfree API returned HTTP ${response.status}`;
    log.error(`[Cashfree] Order creation failed for ${payload.order_id}: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  log.info(
    `[Cashfree] Order ${payload.order_id} created successfully. CF Order ID: ${data.cf_order_id}, Session: ${data.payment_session_id?.slice(0, 15)}...`
  );

  return {
    success: true,
    orderId: data.order_id,
    cfOrderId: data.cf_order_id,
    paymentSessionId: data.payment_session_id,
    orderStatus: data.order_status,
    orderAmount: data.order_amount,
    currency: data.order_currency,
    env,
  };
};

/**
 * Fetches order details from Cashfree to verify status
 */
export const fetchCashfreeOrder = async (orderId) => {
  const { appId, secretKey, baseUrl, apiVersion, env } = getCashfreeConfig();

  if (!appId || !secretKey) {
    throw new Error("Cashfree credentials missing in environment.");
  }

  log.info(`[Cashfree] Fetching order status for ${orderId} in ${env} mode`);

  const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: {
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": apiVersion,
      Accept: "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.message || `Failed to fetch Cashfree order: HTTP ${response.status}`;
    log.error(`[Cashfree] Fetch order error for ${orderId}: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  return data;
};

/**
 * Fetches transaction payment attempts for an order from Cashfree
 */
export const fetchCashfreeOrderPayments = async (orderId) => {
  const { appId, secretKey, baseUrl, apiVersion } = getCashfreeConfig();

  const response = await fetch(`${baseUrl}/orders/${encodeURIComponent(orderId)}/payments`, {
    method: "GET",
    headers: {
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": apiVersion,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};


/**
 * Creates a Cashfree Payment Link for 1-click renewal from email
 */
export const createCashfreePaymentLink = async ({
  linkId,
  linkAmount,
  linkCurrency = "INR",
  linkPurpose,
  customerDetails,
  linkNotes = {},
  returnUrl,
  expiryDays = 7,
}) => {
  const { appId, secretKey, baseUrl, apiVersion, env } = getCashfreeConfig();

  if (!appId || !secretKey) {
    throw new Error("Cashfree credentials missing in server environment.");
  }

  let customerPhone = String(customerDetails?.customer_phone || "").replace(/\D/g, "");
  if (customerPhone.length < 10) {
    customerPhone = "9999999999";
  } else if (customerPhone.length > 10) {
    customerPhone = customerPhone.slice(-10);
  }

  const expiryDate = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  const payload = {
    link_id: linkId,
    link_amount: Number(Number(linkAmount).toFixed(2)),
    link_currency: linkCurrency,
    link_purpose: String(linkPurpose || "Subscription Renewal").slice(0, 100),
    customer_details: {
      customer_name: String(customerDetails?.customer_name || "Hotel Owner").trim().slice(0, 50),
      customer_email: String(customerDetails?.customer_email || "billing@hotel.com").trim().toLowerCase(),
      customer_phone: customerPhone,
    },
    link_notes: linkNotes,
    link_expiry_time: expiryDate.toISOString(),
    link_notify: {
      send_email: false,
      send_sms: false,
    },
    link_meta: {
      return_url: returnUrl,
    },
  };

  log.info(
    `[Cashfree Link] Creating payment link ${payload.link_id} (₹${payload.link_amount}) in ${env} mode for ${payload.customer_details.customer_email}`
  );

  const response = await fetch(`${baseUrl}/links`, {
    method: "POST",
    headers: {
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": apiVersion,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Cashfree API returned HTTP ${response.status}`;
    log.error(`[Cashfree Link] Creation failed for ${payload.link_id}: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  log.info(`[Cashfree Link] Link created successfully: ${data.link_url}`);
  return data;
};

/**
 * Fetches status of a Cashfree Payment Link
 */
export const fetchCashfreePaymentLink = async (linkId) => {
  const { appId, secretKey, baseUrl, apiVersion } = getCashfreeConfig();
  if (!appId || !secretKey || !linkId) {
    return null;
  }

  const response = await fetch(`${baseUrl}/links/${encodeURIComponent(linkId)}`, {
    method: "GET",
    headers: {
      "x-client-id": appId,
      "x-client-secret": secretKey,
      "x-api-version": apiVersion,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
};

/**
 * Verifies webhook signature sent by Cashfree
 */
export const verifyCashfreeWebhook = ({ rawBody, signature, timestamp }) => {
  const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY;
  if (!webhookSecret || !signature || !timestamp || !rawBody) {
    return false;
  }

  try {
    const signaturePayload = `${timestamp}${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(signaturePayload)
      .digest("base64");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (err) {
    log.error(`[Cashfree] Webhook signature verification error: ${err.message}`);
    return false;
  }
};
