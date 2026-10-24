import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  HelpCircle,
} from "lucide-react";

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
};

const MAX_VISIBLE_TOASTS = 5;
const TOAST_EXIT_MS = 380;
const DIALOG_EXIT_MS = 220;

const TOAST_TYPES = {
  success: { title: "Success", Icon: CheckCircle2, role: "status" },
  error: { title: "Error", Icon: AlertCircle, role: "alert" },
  warning: { title: "Warning", Icon: AlertTriangle, role: "alert" },
  info: { title: "Information", Icon: Info, role: "status" },
};

// =========================================================
// SINGLE TOAST
// - progress bar drives auto-dismiss (so hover can pause it)
// - smooth spring enter + collapse exit (no layout jump)
// =========================================================
const ToastNotificationItem = ({ toast, onRemove }) => {
  const [isClosing, setIsClosing] = useState(false);
  const closedRef = useRef(false);
  const timerRef = useRef(null);

  const cfg = TOAST_TYPES[toast.type] || TOAST_TYPES.info;
  const IconComponent = cfg.Icon;
  const duration = toast.duration || 3500;
  const persistent = duration <= 0 || !Number.isFinite(duration);

  const handleClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setIsClosing(true);
    timerRef.current = setTimeout(() => onRemove(toast.id), TOAST_EXIT_MS);
  }, [onRemove, toast.id]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className={`tn-wrap ${isClosing ? "tn-closing" : ""}`}>
      <div className="tn-clip">
        <div
          className={`tn-card tn-${toast.type in TOAST_TYPES ? toast.type : "info"}`}
          role={cfg.role}
        >
          <div className="tn-body">
            <div className="tn-icon">
              <span className="tn-ripple" />
              <IconComponent className="tn-icon-svg" strokeWidth={2.4} />
            </div>

            <div className="tn-content">
              <div className="tn-header-row">
                <span className="tn-badge">{toast.title || cfg.title}</span>
              </div>
              <p className="tn-message">{toast.message}</p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="tn-close"
              aria-label="Dismiss notification"
              title="Dismiss"
            >
              <X size={15} strokeWidth={2.5} />
            </button>
          </div>

          {!persistent && (
            <div className="tn-progress" aria-hidden="true">
              <span
                style={{ animationDuration: `${duration}ms` }}
                onAnimationEnd={handleClose}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirmClosing, setConfirmClosing] = useState(false);
  const confirmTimerRef = useRef(null);

  // =========================================================
  // NORMAL TOAST
  // =========================================================
  const showToast = useCallback(
    (message, type = "success", duration = 3500, title = "") => {
      const id = Date.now() + Math.random().toString(36).substr(2, 9);

      setToasts((prev) =>
        [...prev, { id, message, type, duration, title }].slice(
          -MAX_VISIBLE_TOASTS
        )
      );

      return id;
    },
    []
  );

  // =========================================================
  // REMOVE TOAST
  // =========================================================
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // =========================================================
  // CONFIRMATION DIALOG
  // =========================================================
  const showConfirm = useCallback((message, onConfirm, options = {}) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);

    const {
      title = "Confirm Action",
      confirmText = "Confirm",
      cancelText = "Cancel",
      variant = "danger", // "danger" | "primary" | "warning" | "success"
    } = options;

    clearTimeout(confirmTimerRef.current);
    setConfirmClosing(false);
    setConfirmDialog({
      id,
      message,
      title,
      confirmText,
      cancelText,
      variant,
      onConfirm,
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmClosing(true);
    clearTimeout(confirmTimerRef.current);
    confirmTimerRef.current = setTimeout(() => {
      setConfirmDialog(null);
      setConfirmClosing(false);
    }, DIALOG_EXIT_MS);
  }, []);

  const handleConfirmAction = useCallback(() => {
    if (confirmClosing) return; // prevent double click
    if (confirmDialog?.onConfirm) {
      confirmDialog.onConfirm();
    }
    closeConfirm();
  }, [confirmDialog, confirmClosing, closeConfirm]);

  // Esc to close + lock page scroll while dialog is open
  useEffect(() => {
    if (!confirmDialog) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") closeConfirm();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [confirmDialog, closeConfirm]);

  useEffect(() => () => clearTimeout(confirmTimerRef.current), []);

  // =========================================================
  // TOAST API (unchanged)
  // =========================================================
  const toast = {
    success: (msg, dur, title) => showToast(msg, "success", dur, title),
    error: (msg, dur, title) => showToast(msg, "error", dur, title),
    warn: (msg, dur, title) => showToast(msg, "warning", dur, title),
    info: (msg, dur, title) => showToast(msg, "info", dur, title),
    confirm: (message, onConfirm, options) =>
      showConfirm(message, onConfirm, options),
  };

  const variant = confirmDialog?.variant || "danger";
  const DialogIcon =
    variant === "success" ? CheckCircle2 :
    variant === "danger" || variant === "warning" ? AlertTriangle : HelpCircle;

  return (
    <ToastContext.Provider value={toast}>
      <style>{TOAST_CSS}</style>

      {children}

      {/* =====================================================
          TOAST CONTAINER (Top Center)
      ====================================================== */}
      <div className="tn-container" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <ToastNotificationItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>

      {/* =====================================================
          CONFIRMATION MODAL
      ====================================================== */}
      {confirmDialog && (
        <div
          className={`tn-backdrop ${confirmClosing ? "tn-backdrop-out" : ""}`}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeConfirm();
          }}
        >
          <div
            className={`tn-modal tn-v-${variant} ${
              confirmClosing ? "tn-modal-out" : ""
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tn-dialog-title"
            aria-describedby="tn-dialog-desc"
          >
            <div className="tn-modal-accent" />

            <div className="tn-modal-inner">
              <div className="tn-modal-head">
                <div className="tn-modal-icon">
                  <span className="tn-modal-halo" />
                  <DialogIcon size={24} strokeWidth={2.2} />
                </div>

                <div className="tn-modal-text">
                  <h3 id="tn-dialog-title">{confirmDialog.title}</h3>
                  <p id="tn-dialog-desc">{confirmDialog.message}</p>
                </div>

                <button
                  type="button"
                  onClick={closeConfirm}
                  className="tn-close tn-modal-close"
                  aria-label="Close dialog"
                >
                  <X size={16} strokeWidth={2.4} />
                </button>
              </div>

              <div className="tn-modal-actions">
                <button
                  type="button"
                  onClick={closeConfirm}
                  className="tn-btn tn-btn-ghost"
                  autoFocus={variant === "danger"}
                >
                  {confirmDialog.cancelText}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAction}
                  className="tn-btn tn-btn-solid"
                  autoFocus={variant !== "danger"}
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

// =========================================================
// STYLES — Crafted with 15+ Year Senior Design System Precision
// =========================================================
const TOAST_CSS = `
:root {
  --tn-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --tn-ease-spring: cubic-bezier(0.34, 1.35, 0.64, 1);
  --tn-navy: #0f172a;
}

/* ---------- container ---------- */
.tn-container {
  position: fixed;
  top: max(16px, env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%);
  width: min(390px, 92vw);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}

/* ---------- collapse wrapper (smooth stack reflow) ---------- */
.tn-wrap {
  display: grid;
  grid-template-rows: 1fr;
  opacity: 1;
  transition:
    grid-template-rows ${TOAST_EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 240ms ease;
}
.tn-wrap.tn-closing {
  grid-template-rows: 0fr;
  opacity: 0;
}
.tn-clip {
  min-height: 0;
  overflow: hidden;
  padding: 4px 6px 10px;
}

/* ---------- type palettes ---------- */
.tn-success {
  --a1: #10b981;
  --a2: #059669;
  --soft: rgba(16, 185, 129, 0.08);
  --ink: #065f46;
  --badge-bg: rgba(16, 185, 129, 0.12);
  --badge-text: #047857;
  --border-tint: rgba(16, 185, 129, 0.22);
  --glow: rgba(16, 185, 129, 0.32);
}
.tn-error {
  --a1: #f43f5e;
  --a2: #e11d48;
  --soft: rgba(244, 63, 94, 0.08);
  --ink: #881337;
  --badge-bg: rgba(244, 63, 94, 0.12);
  --badge-text: #be123c;
  --border-tint: rgba(244, 63, 94, 0.22);
  --glow: rgba(244, 63, 94, 0.32);
}
.tn-warning {
  --a1: #f59e0b;
  --a2: #d97706;
  --soft: rgba(245, 158, 11, 0.08);
  --ink: #78350f;
  --badge-bg: rgba(245, 158, 11, 0.12);
  --badge-text: #b45309;
  --border-tint: rgba(245, 158, 11, 0.24);
  --glow: rgba(245, 158, 11, 0.32);
}
.tn-info {
  --a1: #3b82f6;
  --a2: #2563eb;
  --soft: rgba(59, 130, 246, 0.08);
  --ink: #1e3a8a;
  --badge-bg: rgba(59, 130, 246, 0.12);
  --badge-text: #1d4ed8;
  --border-tint: rgba(59, 130, 246, 0.22);
  --glow: rgba(59, 130, 246, 0.32);
}

/* ---------- card ---------- */
.tn-card {
  position: relative;
  overflow: hidden;
  pointer-events: auto;
  border-radius: 14px;
  background:
    linear-gradient(110deg, var(--soft) 0%, rgba(255,255,255,0) 65%),
    rgba(255, 255, 255, 0.94);
  -webkit-backdrop-filter: blur(24px) saturate(1.8);
  backdrop-filter: blur(24px) saturate(1.8);
  border: 1px solid var(--border-tint);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 8px 24px -6px rgba(15, 23, 42, 0.14),
    0 2px 6px -1px rgba(15, 23, 42, 0.05);
  animation: tn-in 0.48s var(--tn-ease-out) both;
  transition: transform 0.24s var(--tn-ease-out), box-shadow 0.24s ease, border-color 0.24s ease;
  will-change: transform, opacity;
}
.tn-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3.5px;
  border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, var(--a1), var(--a2));
}
.tn-card:hover {
  transform: translateY(-1.5px);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 14px 30px -8px rgba(15, 23, 42, 0.18),
    0 4px 10px -2px rgba(15, 23, 42, 0.07);
}
.tn-wrap.tn-closing .tn-card {
  animation: tn-out ${TOAST_EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1) both;
}

.tn-body {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 10px 10px 11px 13px;
}

/* ---------- icon ---------- */
.tn-icon {
  position: relative;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(140deg, var(--a1), var(--a2));
  box-shadow:
    0 4px 12px -2px var(--glow),
    0 1px 0 rgba(255, 255, 255, 0.4) inset;
  animation: tn-icon-pop 0.55s var(--tn-ease-spring) 0.06s both;
}
.tn-icon-svg {
  width: 17px;
  height: 17px;
  position: relative;
  z-index: 1;
}
.tn-ripple {
  position: absolute;
  inset: 0;
  border-radius: 9px;
  border: 2px solid var(--a1);
  opacity: 0;
  animation: tn-ripple 1.3s ease-out 0.15s 1 both;
}

/* ---------- content ---------- */
.tn-content {
  flex: 1;
  min-width: 0;
  padding-top: 1px;
}
.tn-header-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tn-badge {
  display: inline-block;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--badge-text);
  background: var(--badge-bg);
  padding: 1.5px 7px;
  border-radius: 5px;
  line-height: 1.25;
}
.tn-message {
  margin: 3.5px 0 0;
  font-size: 13px;
  line-height: 1.42;
  font-weight: 500;
  color: #1e293b;
  word-break: break-word;
  animation: tn-text-in 0.4s var(--tn-ease-out) 0.1s both;
}

/* ---------- close button ---------- */
.tn-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  margin-top: 2px;
  transition: background 0.18s ease, color 0.18s ease, transform 0.22s var(--tn-ease-out);
}
.tn-close:hover {
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
  transform: rotate(90deg);
}
.tn-close:active {
  transform: rotate(90deg) scale(0.9);
}
.tn-close:focus-visible {
  outline: 2px solid var(--a1, #3b82f6);
  outline-offset: 2px;
}

/* ---------- progress bar ---------- */
.tn-progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2.5px;
  background: rgba(15, 23, 42, 0.04);
}
.tn-progress span {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(90deg, var(--a1), var(--a2));
  border-radius: 0 2px 2px 0;
  animation-name: tn-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
.tn-card:hover .tn-progress span {
  animation-play-state: paused;
}

/* ---------- toast keyframes ---------- */
@keyframes tn-in {
  0% {
    opacity: 0;
    transform: translateY(-24px) scale(0.92);
    filter: blur(4px);
  }
  60% {
    opacity: 1;
    transform: translateY(3px) scale(1.008);
    filter: blur(0);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}
@keyframes tn-out {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-14px) scale(0.94);
    filter: blur(3px);
  }
}
@keyframes tn-icon-pop {
  0% {
    transform: scale(0.4) rotate(-18deg);
    opacity: 0;
  }
  100% {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}
@keyframes tn-ripple {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.7);
    opacity: 0;
  }
}
@keyframes tn-text-in {
  0% {
    opacity: 0;
    transform: translateY(4px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes tn-progress {
  0% { transform: scaleX(1); }
  100% { transform: scaleX(0); }
}

/* =====================================================
   CONFIRM DIALOG (Refined Medium Pro Polish)
===================================================== */
.tn-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background:
    radial-gradient(1000px 500px at 50% -10%, rgba(59, 130, 246, 0.14), transparent 60%),
    rgba(15, 23, 42, 0.58);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  animation: tn-fade-in 0.26s ease both;
}
.tn-backdrop-out {
  animation: tn-fade-out ${DIALOG_EXIT_MS}ms ease both;
}

.tn-v-danger  { --a1: #f43f5e; --a2: #e11d48; --glow: rgba(244, 63, 94, 0.35);  --soft: rgba(244, 63, 94, 0.08); }
.tn-v-warning { --a1: #f59e0b; --a2: #d97706; --glow: rgba(245, 158, 11, 0.35); --soft: rgba(245, 158, 11, 0.09); }
.tn-v-primary { --a1: #3b82f6; --a2: #2563eb; --glow: rgba(37, 99, 235, 0.35);  --soft: rgba(59, 130, 246, 0.08); }
.tn-v-success { --a1: #10b981; --a2: #059669; --glow: rgba(16, 185, 129, 0.35); --soft: rgba(16, 185, 129, 0.08); }

.tn-modal {
  position: relative;
  width: 100%;
  max-width: 388px;
  overflow: hidden;
  border-radius: 20px;
  background:
    radial-gradient(360px 180px at 0% 0%, var(--soft), transparent 70%),
    #ffffff;
  border: 1px solid rgba(15, 23, 42, 0.09);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.9) inset,
    0 24px 54px -14px rgba(15, 23, 42, 0.38),
    0 8px 18px -4px rgba(15, 23, 42, 0.12);
  animation: tn-modal-in 0.44s var(--tn-ease-spring) both;
}
.tn-modal-out {
  animation: tn-modal-out ${DIALOG_EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1) both;
}

.tn-modal-accent {
  height: 3px;
  background: linear-gradient(90deg, var(--a2), var(--a1), var(--a2));
  background-size: 200% 100%;
  animation: tn-shimmer 3s linear infinite;
}
.tn-modal-inner {
  padding: 18px 18px 16px;
}
.tn-modal-head {
  display: flex;
  align-items: flex-start;
  gap: 13px;
}

.tn-modal-icon {
  position: relative;
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(140deg, var(--a1), var(--a2));
  box-shadow:
    0 6px 16px -3px var(--glow),
    0 1px 0 rgba(255, 255, 255, 0.4) inset;
  animation: tn-icon-pop 0.6s var(--tn-ease-spring) 0.08s both;
}
.tn-modal-halo {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  border: 2px solid var(--a1);
  opacity: 0;
  animation: tn-ripple 1.6s ease-out 0.25s 2 both;
}
.tn-modal-text {
  flex: 1;
  min-width: 0;
  padding-top: 1px;
}
.tn-modal-text h3 {
  margin: 0;
  font-size: 15.5px;
  font-weight: 700;
  letter-spacing: -0.015em;
  color: var(--tn-navy);
  line-height: 1.3;
  animation: tn-text-in 0.4s var(--tn-ease-out) 0.1s both;
}
.tn-modal-text p {
  margin: 5px 0 0;
  font-size: 13px;
  line-height: 1.48;
  font-weight: 500;
  color: #475569;
  animation: tn-text-in 0.4s var(--tn-ease-out) 0.15s both;
}
.tn-modal-close {
  width: 26px;
  height: 26px;
  margin: -2px -4px 0 0;
}

.tn-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #f1f5f9;
  animation: tn-text-in 0.4s var(--tn-ease-out) 0.2s both;
}
.tn-btn {
  position: relative;
  overflow: hidden;
  padding: 8px 16px;
  border: 0;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  letter-spacing: 0.01em;
  transition: transform 0.2s var(--tn-ease-out), box-shadow 0.2s ease, background 0.2s ease, filter 0.2s ease;
}
.tn-btn:active {
  transform: scale(0.96);
}
.tn-btn:focus-visible {
  outline: 2px solid var(--a1);
  outline-offset: 2px;
}
.tn-btn-ghost {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}
.tn-btn-ghost:hover {
  background: #e2e8f0;
  color: #0f172a;
}
.tn-btn-solid {
  color: #fff;
  background: linear-gradient(135deg, var(--a1), var(--a2));
  box-shadow: 0 4px 14px -3px var(--glow);
  border: 1px solid rgba(255, 255, 255, 0.25);
}
.tn-btn-solid::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%);
  transform: translateX(-120%);
  transition: transform 0.5s var(--tn-ease-out);
}
.tn-btn-solid:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -5px var(--glow);
  filter: brightness(1.04);
}
.tn-btn-solid:hover::after {
  transform: translateX(120%);
}
.tn-btn-solid:active {
  transform: translateY(0) scale(0.96);
}

@keyframes tn-fade-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes tn-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes tn-modal-in {
  0% {
    opacity: 0;
    transform: translateY(16px) scale(0.93);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes tn-modal-out {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
}
@keyframes tn-shimmer {
  0% { background-position: 0% 0; }
  100% { background-position: 200% 0; }
}

/* ---------- small screens ---------- */
@media (max-width: 480px) {
  .tn-container { width: calc(100vw - 24px); }
  .tn-clip { padding-left: 4px; padding-right: 4px; }
  .tn-modal-inner { padding: 16px 14px 14px; }
  .tn-modal-actions .tn-btn { flex: 1; padding: 9px 12px; }
}

/* ---------- reduced motion (progress still runs so toasts auto-close) ---------- */
@media (prefers-reduced-motion: reduce) {
  .tn-card, .tn-icon, .tn-ripple, .tn-badge, .tn-message,
  .tn-modal, .tn-modal-icon, .tn-modal-halo, .tn-modal-text h3,
  .tn-modal-text p, .tn-modal-actions, .tn-modal-accent, .tn-backdrop {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
  .tn-wrap, .tn-card, .tn-close, .tn-btn { transition-duration: 0.01ms !important; }
  .tn-wrap.tn-closing .tn-card { animation-duration: 0.01ms !important; }
}
`;