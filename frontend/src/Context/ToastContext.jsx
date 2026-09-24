
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

import {
  CheckCircle2,
  AlertCircle,
  Info,
  X,
} from "lucide-react";

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // =========================================================
  // NORMAL TOAST
  // =========================================================
  const showToast = useCallback(
    (message, type = "success", duration = 3000) => {
      const id =
        Date.now() + Math.random().toString(36).substr(2, 9);

      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          type,
          isConfirm: false,
        },
      ]);

      setTimeout(() => {
        setToasts((prev) =>
          prev.filter((t) => t.id !== id)
        );
      }, duration);
    },
    []
  );

  // =========================================================
  // CONFIRMATION TOAST
  // =========================================================
  const showConfirm = useCallback(
    (
      message,
      onConfirm,
      options = {}
    ) => {
      const id =
        Date.now() + Math.random().toString(36).substr(2, 9);

      const {
        title = "Confirm Action",
        confirmText = "Confirm",
        cancelText = "Cancel",
      } = options;

      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          type: "warning",
          isConfirm: true,
          title,
          confirmText,
          cancelText,
          onConfirm,
        },
      ]);
    },
    []
  );

  // =========================================================
  // REMOVE TOAST
  // =========================================================
  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.filter((t) => t.id !== id)
    );
  }, []);

  // =========================================================
  // CONFIRM HANDLER
  // =========================================================
  const handleConfirm = useCallback(
    (toastItem) => {
      if (toastItem.onConfirm) {
        toastItem.onConfirm();
      }

      removeToast(toastItem.id);
    },
    [removeToast]
  );

  // =========================================================
  // TOAST API
  // =========================================================
  const toast = {
    success: (msg, dur) =>
      showToast(msg, "success", dur),

    error: (msg, dur) =>
      showToast(msg, "error", dur),

    warn: (msg, dur) =>
      showToast(msg, "warning", dur),

    info: (msg, dur) =>
      showToast(msg, "info", dur),

    confirm: (
      message,
      onConfirm,
      options
    ) =>
      showConfirm(
        message,
        onConfirm,
        options
      ),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* =====================================================
          TOAST CONTAINER
      ====================================================== */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-3 max-w-sm w-full px-4 pointer-events-none">

        {toasts.map((t) => {
          let bgClass = "";
          let icon = null;

          switch (t.type) {
            case "success":
              bgClass = "bg-[#E8F8F3]";

              icon = (
                <CheckCircle2
                  className="w-6 h-6 fill-[#35C99A] text-white stroke-2 shrink-0"
                />
              );
              break;

            case "error":
              bgClass = "bg-[#FDEBEC]";

              icon = (
                <AlertCircle
                  className="w-6 h-6 fill-[#E94B61] text-white stroke-2 shrink-0"
                />
              );
              break;

            case "warning":
              bgClass = "bg-[#FFF9E8]";

              icon = (
                <AlertCircle
                  className="w-6 h-6 fill-[#FBBF24] text-white stroke-2 shrink-0"
                />
              );
              break;

            case "info":
              bgClass = "bg-[#E6F9FC]";

              icon = (
                <Info
                  className="w-6 h-6 fill-[#16BBD4] text-white stroke-2 shrink-0"
                />
              );
              break;

            default:
              bgClass = "bg-slate-50";

              icon = (
                <Info
                  className="w-6 h-6 fill-slate-400 text-white stroke-2 shrink-0"
                />
              );
          }

          // ===================================================
          // CONFIRMATION TOAST
          // ===================================================
          if (t.isConfirm) {
            return (
              <div
                key={t.id}
                className={`pointer-events-auto w-full rounded-xl shadow-lg border border-amber-100 ${bgClass} overflow-hidden`}
              >
                {/* Header */}
                <div className="flex items-start gap-3 px-5 pt-5">
                  {icon}

                  <div className="flex-1">
                    <h3 className="text-[15px] font-bold text-[#171717]">
                      {t.title}
                    </h3>

                    <p className="mt-1 text-[14px] text-[#4a4a4a] leading-5">
                      {t.message}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeToast(t.id)}
                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 px-5 py-4 mt-2">
                  <button
                    type="button"
                    onClick={() => removeToast(t.id)}
                    className="px-3.5 py-2 text-sm font-semibold text-[#4a5965] bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    {t.cancelText}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConfirm(t)}
                    className="px-3.5 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
                  >
                    {t.confirmText}
                  </button>
                </div>
              </div>
            );
          }

          // ===================================================
          // NORMAL TOAST
          // ===================================================
          return (
            <div
              key={t.id}
              className={`flex items-center gap-4 px-5 py-4 rounded-xl shadow-sm pointer-events-auto transition-all ${bgClass}`}
            >
              {icon}

              <span className="text-[15px] text-[#171717] font-medium tracking-normal leading-normal">
                {t.message}
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

