/**
 * Cashfree Web SDK Checkout Helper
 * Fully responsive, safe in-app popup modal execution
 */

export const getCashfreeInstance = async (mode) => {
  if (typeof window.Cashfree !== "function") {
    await new Promise((resolve, reject) => {
      // Check if already injected
      const existing = document.querySelector('script[src*="cashfree.com/js/v3/cashfree.js"]');
      if (existing) {
        existing.addEventListener("load", resolve);
        existing.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Unable to load Cashfree Payment Gateway SDK. Please check your internet connection."));
      document.head.appendChild(script);
    });
  }

  const configuredMode = mode || import.meta.env.VITE_CASHFREE_ENV || "sandbox";
  const normalizedMode = String(configuredMode).toLowerCase() === "production" ? "production" : "sandbox";
  return window.Cashfree({
    mode: normalizedMode,
  });
};

/**
 * Opens Cashfree Checkout in a clean modal window
 * @param {Object} options
 * @param {string} options.paymentSessionId - Session string from backend create-order API
 * @param {string} options.mode - "sandbox" | "production" from backend API
 */
export const openCashfreeCheckoutModal = async ({
  paymentSessionId,
  mode = "sandbox",
}) => {
  if (!paymentSessionId) {
    throw new Error("Invalid checkout session. Payment session ID is missing.");
  }

  const cashfree = await getCashfreeInstance(mode);

  return cashfree.checkout({
    paymentSessionId,
    redirectTarget: "_modal",
  });
};
