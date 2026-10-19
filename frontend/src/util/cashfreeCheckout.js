/**
 * Cashfree Web SDK Checkout Helper
 * Fully responsive, safe in-app popup modal execution
 */

// Global flag to avoid duplicate window.open wrappers
let isWindowOpenWrapped = false;

const ensureGenerousPopupDimensions = () => {
  if (isWindowOpenWrapped || typeof window === "undefined") return;
  isWindowOpenWrapped = true;

  const originalWindowOpen = window.open;
  window.open = function (url, target, features) {
    try {
      const urlStr = String(url || "");
      const featuresStr = String(features || "");
      const isPaymentOrSimulator =
        urlStr.includes("cashfree") ||
        urlStr.includes("simulator") ||
        urlStr.includes("pgbillpay") ||
        featuresStr.includes("width") ||
        featuresStr.includes("height");

      if (isPaymentOrSimulator) {
        const availWidth = window.screen?.availWidth || window.innerWidth || 1200;
        const availHeight = window.screen?.availHeight || window.innerHeight || 850;

        // Generous size: 90% of screen height and up to 960px width
        const width = Math.min(960, Math.max(760, Math.floor(availWidth * 0.9)));
        const height = Math.min(850, Math.max(680, Math.floor(availHeight * 0.9)));
        const left = Math.max(0, Math.floor((availWidth - width) / 2));
        const top = Math.max(0, Math.floor((availHeight - height) / 2));

        const enhancedFeatures = `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes,status=yes,toolbar=no,menubar=no`;
        return originalWindowOpen.call(window, url, target, enhancedFeatures);
      }
    } catch {
      // Fallback to original window.open
    }
    return originalWindowOpen.call(window, url, target, features);
  };
};

export const getCashfreeInstance = async (mode) => {
  ensureGenerousPopupDimensions();

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
      script.onerror = () =>
        reject(
          new Error("Unable to load Cashfree Payment Gateway SDK. Please check your internet connection.")
        );
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
 * @param {string} [options.redirectTarget="_modal"] - "_modal" | "_self"
 */
export const openCashfreeCheckoutModal = async ({
  paymentSessionId,
  mode = "sandbox",
  redirectTarget = "_modal",
}) => {
  if (!paymentSessionId) {
    throw new Error("Invalid checkout session. Payment session ID is missing.");
  }

  ensureGenerousPopupDimensions();
  const cashfree = await getCashfreeInstance(mode);

  return cashfree.checkout({
    paymentSessionId,
    redirectTarget,
  });
};

/**
 * Detects whether an error or response indicates an intentional cancellation/window close
 * @param {*} errOrResult
 * @returns {boolean}
 */
export const isPaymentCancellation = (errOrResult) => {
  if (!errOrResult) return false;
  const raw = String(
    errOrResult?.message ||
    errOrResult?.error?.message ||
    errOrResult?.code ||
    errOrResult?.error?.code ||
    errOrResult?.status ||
    errOrResult ||
    ""
  ).toLowerCase();

  return (
    raw.includes("abort") ||
    raw.includes("cancel") ||
    raw.includes("closed") ||
    raw.includes("close") ||
    raw.includes("dismiss") ||
    raw.includes("user dropped") ||
    raw.includes("drop") ||
    raw.includes("window closed")
  );
};

