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
              <IconComponent className="tn-icon-svg" strokeWidth={2.2} />
            </div>

            <div className="tn-content">
              <h4 className="tn-title">{toast.title || cfg.title}</h4>
              <p className="tn-message">{toast.message}</p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="tn-close"
              aria-label="Dismiss notification"
              title="Dismiss"
            >
              <X size={14} strokeWidth={2.4} />
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
      variant = "danger", // "danger" | "primary" | "warning"
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
    success: (msg, dur) => showToast(msg, "success", dur),
    error: (msg, dur) => showToast(msg, "error", dur),
    warn: (msg, dur) => showToast(msg, "warning", dur),
    info: (msg, dur) => showToast(msg, "info", dur),
    confirm: (message, onConfirm, options) =>
      showConfirm(message, onConfirm, options),
  };

  const variant = confirmDialog?.variant || "danger";
  const DialogIcon =
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
// STYLES
// =========================================================
const TOAST_CSS = `
:root {
  --tn-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --tn-ease-spring: cubic-bezier(0.34, 1.45, 0.64, 1);
  --tn-navy: #0f2a63;
}

/* ---------- container ---------- */
.tn-container {
  position: fixed;
  top: max(14px, env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%);
  width: min(468px, 100vw);
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
    opacity 260ms ease;
}
.tn-wrap.tn-closing {
  grid-template-rows: 0fr;
  opacity: 0;
}
.tn-clip {
  min-height: 0;
  overflow: hidden;
  padding: 6px 18px 12px; /* room for the soft shadow */
}

/* ---------- type palettes ---------- */
.tn-success { --a1:#10b981; --a2:#0d9488; --soft:rgba(16,185,129,.13); --ink:#064e3b; --glow:rgba(16,185,129,.35); }
.tn-error   { --a1:#f43f5e; --a2:#dc2626; --soft:rgba(244,63,94,.12);  --ink:#881337; --glow:rgba(244,63,94,.35); }
.tn-warning { --a1:#fbbf24; --a2:#f97316; --soft:rgba(245,158,11,.14); --ink:#78350f; --glow:rgba(245,158,11,.38); }
.tn-info    { --a1:#3b82f6; --a2:#0f2a63; --soft:rgba(59,130,246,.12); --ink:#0f2a63; --glow:rgba(59,130,246,.35); }

/* ---------- card ---------- */
.tn-card {
  position: relative;
  overflow: hidden;
  pointer-events: auto;
  border-radius: 18px;
  background:
    linear-gradient(100deg, var(--soft) 0%, rgba(255,255,255,0) 58%),
    rgba(255, 255, 255, 0.88);
  -webkit-backdrop-filter: blur(20px) saturate(1.7);
  backdrop-filter: blur(20px) saturate(1.7);
  border: 1px solid rgba(15, 42, 99, 0.07);
  box-shadow:
    0 1px 0 rgba(255,255,255,.9) inset,
    0 14px 34px -10px rgba(15, 42, 99, 0.22),
    0 3px 8px -2px rgba(15, 42, 99, 0.07);
  animation: tn-in 0.62s var(--tn-ease-out) both;
  transition: transform .3s var(--tn-ease-out), box-shadow .3s ease;
  will-change: transform, opacity;
}
.tn-card::before { /* accent edge */
  content: "";
  position: absolute;
  left: 0; top: 14px; bottom: 14px;
  width: 3px;
  border-radius: 0 4px 4px 0;
  background: linear-gradient(180deg, var(--a1), var(--a2));
}
.tn-card:hover {
  transform: translateY(1px) scale(1.012);
  box-shadow:
    0 1px 0 rgba(255,255,255,.9) inset,
    0 20px 40px -12px rgba(15, 42, 99, 0.28),
    0 4px 10px -2px rgba(15, 42, 99, 0.09);
}
.tn-wrap.tn-closing .tn-card {
  animation: tn-out ${TOAST_EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1) both;
}

.tn-body {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 14px 12px 16px 16px;
}

/* ---------- icon ---------- */
.tn-icon {
  position: relative;
  flex-shrink: 0;
  width: 38px; height: 38px;
  border-radius: 12px;
  display: grid; place-items: center;
  color: #fff;
  background: linear-gradient(145deg, var(--a1), var(--a2));
  box-shadow:
    0 6px 14px -3px var(--glow),
    0 1px 0 rgba(255,255,255,.35) inset;
  animation: tn-icon-pop .7s var(--tn-ease-spring) .08s both;
}
.tn-icon-svg { width: 20px; height: 20px; position: relative; z-index: 1; }
.tn-ripple {
  position: absolute; inset: 0;
  border-radius: 12px;
  border: 2px solid var(--a1);
  opacity: 0;
  animation: tn-ripple 1.4s ease-out .2s 1 both;
}

/* ---------- text ---------- */
.tn-content { flex: 1; min-width: 0; padding-top: 1px; }
.tn-title {
  margin: 0;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
  color: var(--ink);
  opacity: .92;
  animation: tn-text-in .5s var(--tn-ease-out) .12s both;
}
.tn-message {
  margin: 3px 0 0;
  font-size: 14px;
  line-height: 1.45;
  font-weight: 500;
  color: #334155;
  word-break: break-word;
  animation: tn-text-in .5s var(--tn-ease-out) .18s both;
}

/* ---------- close ---------- */
.tn-close {
  flex-shrink: 0;
  width: 26px; height: 26px;
  display: grid; place-items: center;
  border: 0; border-radius: 9px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: background .2s ease, color .2s ease, transform .2s var(--tn-ease-out);
}
.tn-close:hover { background: rgba(15,42,99,.07); color: #1e293b; transform: rotate(90deg); }
.tn-close:active { transform: rotate(90deg) scale(.88); }
.tn-close:focus-visible { outline: 2px solid var(--a1, #3b82f6); outline-offset: 2px; }

/* ---------- progress ---------- */
.tn-progress {
  position: absolute; left: 0; right: 0; bottom: 0;
  height: 3px;
  background: rgba(15, 42, 99, 0.05);
}
.tn-progress span {
  display: block;
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: linear-gradient(90deg, var(--a1), var(--a2));
  border-radius: 0 3px 3px 0;
  animation-name: tn-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
.tn-card:hover .tn-progress span { animation-play-state: paused; }

/* ---------- toast keyframes ---------- */
@keyframes tn-in {
  0%   { opacity: 0; transform: translateY(-34px) scale(.88); filter: blur(8px); }
  55%  { opacity: 1; transform: translateY(5px) scale(1.012); filter: blur(0); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
@keyframes tn-out {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-18px) scale(.94); filter: blur(4px); }
}
@keyframes tn-icon-pop {
  0%   { transform: scale(.3) rotate(-24deg); opacity: 0; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
@keyframes tn-ripple {
  0%   { transform: scale(1);   opacity: .55; }
  100% { transform: scale(1.9); opacity: 0; }
}
@keyframes tn-text-in {
  0%   { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes tn-progress {
  0%   { transform: scaleX(1); }
  100% { transform: scaleX(0); }
}

/* =====================================================
   CONFIRM DIALOG
===================================================== */
.tn-backdrop {
  position: fixed; inset: 0;
  z-index: 10000;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  background:
    radial-gradient(1200px 600px at 50% -10%, rgba(59,130,246,.18), transparent 60%),
    rgba(7, 19, 43, 0.55);
  -webkit-backdrop-filter: blur(7px);
  backdrop-filter: blur(7px);
  animation: tn-fade-in .3s ease both;
}
.tn-backdrop-out { animation: tn-fade-out ${DIALOG_EXIT_MS}ms ease both; }

.tn-v-danger  { --a1:#f43f5e; --a2:#dc2626; --glow:rgba(244,63,94,.38);  --soft:rgba(244,63,94,.10); }
.tn-v-warning { --a1:#fbbf24; --a2:#f97316; --glow:rgba(245,158,11,.40); --soft:rgba(245,158,11,.12); }
.tn-v-primary { --a1:#3b82f6; --a2:#0f2a63; --glow:rgba(37,99,235,.38);  --soft:rgba(59,130,246,.10); }

.tn-modal {
  position: relative;
  width: 100%; max-width: 432px;
  overflow: hidden;
  border-radius: 26px;
  background:
    radial-gradient(420px 200px at 0% 0%, var(--soft), transparent 70%),
    #ffffff;
  border: 1px solid rgba(15, 42, 99, 0.07);
  box-shadow:
    0 1px 0 rgba(255,255,255,.9) inset,
    0 40px 80px -20px rgba(7, 19, 43, 0.45),
    0 10px 24px -8px rgba(15, 42, 99, 0.18);
  animation: tn-modal-in .55s var(--tn-ease-spring) both;
}
.tn-modal-out { animation: tn-modal-out ${DIALOG_EXIT_MS}ms cubic-bezier(.4,0,1,1) both; }

.tn-modal-accent {
  height: 4px;
  background: linear-gradient(90deg, var(--a2), var(--a1), var(--a2));
  background-size: 200% 100%;
  animation: tn-shimmer 3.2s linear infinite;
}
.tn-modal-inner { padding: 24px 24px 22px; }
.tn-modal-head { display: flex; align-items: flex-start; gap: 16px; }

.tn-modal-icon {
  position: relative;
  flex-shrink: 0;
  width: 50px; height: 50px;
  border-radius: 16px;
  display: grid; place-items: center;
  color: #fff;
  background: linear-gradient(145deg, var(--a1), var(--a2));
  box-shadow: 0 10px 22px -6px var(--glow), 0 1px 0 rgba(255,255,255,.35) inset;
  animation: tn-icon-pop .7s var(--tn-ease-spring) .12s both;
}
.tn-modal-halo {
  position: absolute; inset: 0;
  border-radius: 16px;
  border: 2px solid var(--a1);
  opacity: 0;
  animation: tn-ripple 1.8s ease-out .3s 2 both;
}
.tn-modal-text { flex: 1; min-width: 0; padding-top: 2px; }
.tn-modal-text h3 {
  margin: 0;
  font-size: 18px; font-weight: 800; letter-spacing: -.01em;
  color: var(--tn-navy);
  animation: tn-text-in .5s var(--tn-ease-out) .14s both;
}
.tn-modal-text p {
  margin: 7px 0 0;
  font-size: 14px; line-height: 1.55; font-weight: 500;
  color: #475569;
  animation: tn-text-in .5s var(--tn-ease-out) .2s both;
}
.tn-modal-close { width: 30px; height: 30px; margin: -4px -6px 0 0; }

.tn-modal-actions {
  display: flex; justify-content: flex-end; gap: 10px;
  margin-top: 26px; padding-top: 18px;
  border-top: 1px solid #eef2f7;
  animation: tn-text-in .5s var(--tn-ease-out) .26s both;
}
.tn-btn {
  position: relative;
  overflow: hidden;
  padding: 11px 22px;
  border: 0; border-radius: 14px;
  font-size: 14px; font-weight: 650; font-family: inherit;
  cursor: pointer;
  transition: transform .22s var(--tn-ease-out), box-shadow .22s ease, background .22s ease, filter .22s ease;
}
.tn-btn:active { transform: scale(.96); }
.tn-btn:focus-visible { outline: 2px solid var(--a1); outline-offset: 3px; }
.tn-btn-ghost { background: #f1f5f9; color: #475569; }
.tn-btn-ghost:hover { background: #e2e8f0; color: #0f172a; }
.tn-btn-solid {
  color: #fff;
  background: linear-gradient(135deg, var(--a1), var(--a2));
  box-shadow: 0 10px 22px -8px var(--glow);
}
.tn-btn-solid::after { /* light sweep on hover */
  content: "";
  position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,.35) 50%, transparent 70%);
  transform: translateX(-120%);
  transition: transform .6s var(--tn-ease-out);
}
.tn-btn-solid:hover { transform: translateY(-2px); box-shadow: 0 16px 28px -10px var(--glow); filter: brightness(1.05); }
.tn-btn-solid:hover::after { transform: translateX(120%); }
.tn-btn-solid:active { transform: translateY(0) scale(.96); }

@keyframes tn-fade-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes tn-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes tn-modal-in {
  0%   { opacity: 0; transform: translateY(22px) scale(.9); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes tn-modal-out {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(10px) scale(.95); }
}
@keyframes tn-shimmer {
  0%   { background-position: 0% 0; }
  100% { background-position: 200% 0; }
}

/* ---------- small screens ---------- */
@media (max-width: 480px) {
  .tn-clip { padding-left: 12px; padding-right: 12px; }
  .tn-modal-inner { padding: 20px 18px 18px; }
  .tn-modal-actions .tn-btn { flex: 1; }
}

/* ---------- reduced motion (progress still runs so toasts auto-close) ---------- */
@media (prefers-reduced-motion: reduce) {
  .tn-card, .tn-icon, .tn-ripple, .tn-title, .tn-message,
  .tn-modal, .tn-modal-icon, .tn-modal-halo, .tn-modal-text h3,
  .tn-modal-text p, .tn-modal-actions, .tn-modal-accent, .tn-backdrop {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
  }
  .tn-wrap, .tn-card, .tn-close, .tn-btn { transition-duration: .01ms !important; }
  .tn-wrap.tn-closing .tn-card { animation-duration: .01ms !important; }
}
`;