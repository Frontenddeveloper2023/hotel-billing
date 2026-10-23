import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Building2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Info,
  ArrowRight,
  Check,
  RefreshCw,
  KeyRound,
  CheckCheck
} from "lucide-react";
import {
  sendHotelOTP,
  verifyHotelOTP,
} from "../../service/usersService";
import { useAuth } from "../../Context/AuthContext";
import { useToast } from "../../Context/ToastContext";

// Scoped SaaS Keyframe Animations & Micro-Interactions
const animationStyles = `
@keyframes hlFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes hlScaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes hlCheckmarkCircle {
  0% { stroke-dashoffset: 166; }
  100% { stroke-dashoffset: 0; }
}
@keyframes hlCheckmarkCheck {
  0% { stroke-dashoffset: 48; }
  100% { stroke-dashoffset: 0; }
}
@keyframes hlProgressSweep {
  0% { width: 4%; }
  30% { width: 45%; }
  75% { width: 88%; }
  100% { width: 100%; }
}
@keyframes hlPulseGlow {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.75; transform: scale(1.06); }
}
@keyframes hlShake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}
.hl-animate-fade-in {
  animation: hlFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.hl-animate-scale-in {
  animation: hlScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.hl-animate-shake {
  animation: hlShake 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}
.hl-checkmark-circle {
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-miterlimit: 10;
  animation: hlCheckmarkCircle 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}
.hl-checkmark-check {
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: hlCheckmarkCheck 0.35s cubic-bezier(0.65, 0, 0.45, 1) 0.35s forwards;
}
.hl-progress-bar {
  animation: hlProgressSweep 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.hl-pulse-glow {
  animation: hlPulseGlow 3.5s ease-in-out infinite;
}
`;

const HotelLogin = () => {
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  const [step, setStep] = useState("email"); // "email" | "otp"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [paymentNotice, setPaymentNotice] = useState(null);

  // Smooth SaaS redirect transition states
  const [authPhase, setAuthPhase] = useState("idle"); // "idle" | "verifying" | "success" | "redirecting"
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(0);

  // -------------------------------------------------------------
  // PERFORMANCE PRELOAD: Prefetch Layout & Dashboard Chunks
  // Eliminates blank screens/lazy fallback delay when navigating
  // -------------------------------------------------------------
  useEffect(() => {
    let timerId;
    const preloadAppModules = () => {
      import("../../Components/Layout").catch(() => {});
      import("../Dashboard/Dashboard").catch(() => {});
    };

    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(preloadAppModules);
      } else {
        timerId = setTimeout(preloadAppModules, 600);
      }
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  // Resend OTP countdown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Handle URL Params and Payment / Session Notices (Preserves 100% functionality)
  useEffect(() => {
    const logoutMsg = sessionStorage.getItem("hotelLogoutToast");
    if (logoutMsg) {
      setError(logoutMsg);
      sessionStorage.removeItem("hotelLogoutToast");
    }

    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const rawOrderId = params.get("order_id") || params.get("link_id") || params.get("orderId") || params.get("cf_link_id");
    const orderId = rawOrderId ? rawOrderId.split("?")[0].split("&")[0].trim() : null;
    const status = params.get("status");
    const rawError = params.get("error");
    const paymentStatus = params.get("payment_status");
    const linkStatus = params.get("link_status");
    const emailParam = params.get("email");

    // Auto-populate registered email if returned from renewal flow
    if (emailParam && typeof emailParam === "string") {
      try {
        setEmail(decodeURIComponent(emailParam).trim());
      } catch {
        setEmail(emailParam.trim());
      }
    }

    // Case 1: Subscription Already Active
    if (status === "already_active") {
      setPaymentNotice({
        type: "info",
        title: "Subscription Active",
        message: "Your hotel subscription is already active and up to date! Please sign in with your email to continue.",
      });
      toast.info("Your subscription is already active! Please sign in to continue.");
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Case 2: Link Expired or Used
    if (status === "invalid_link" || status === "missing_token" || status === "invalid_token" || rawError === "missing_token") {
      setPaymentNotice({
        type: "info",
        title: "Renewal Link Notice",
        message: "This renewal link has already been used or has expired. Please check your latest email from StayLio or log in to manage your hotel.",
      });
      toast.info("This renewal link has expired or was already used.");
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Case 3: Payment Cancelled by User
    if (
      status === "cancelled" ||
      payment === "cancelled" ||
      paymentStatus === "CANCELLED" ||
      paymentStatus === "USER_DROPPED" ||
      linkStatus === "USER_DROPPED" ||
      linkStatus === "CANCELLED"
    ) {
      setPaymentNotice({
        type: "info",
        title: "Payment Cancelled",
        message: "The payment process was cancelled and no amount was deducted from your account. You can click the renewal link in your email anytime to complete your payment.",
      });
      toast.info("Payment was cancelled. No amount was deducted.");
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Case 4: Payment Failed or Declined
    if (
      status === "failed" ||
      payment === "failed" ||
      paymentStatus === "FAILED" ||
      linkStatus === "FAILED"
    ) {
      setPaymentNotice({
        type: "warning",
        title: "Payment Unsuccessful",
        message: "Your bank was unable to complete this transaction. If any amount was deducted, your bank will automatically refund it within 3 to 5 business days. Please try again using another UPI app or card.",
      });
      toast.warn("Payment was unsuccessful. Please try again with another UPI app or card.");
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Case 5: Returned from Cashfree with Success & Order ID
    const isPaymentSuccess =
      payment === "success" ||
      status === "success" ||
      status === "PAID" ||
      linkStatus === "PAID" ||
      paymentStatus === "SUCCESS" ||
      params.get("txStatus") === "SUCCESS";

    if (isPaymentSuccess) {
      if (orderId) {
        setPaymentNotice({
          type: "pending",
          title: "Verifying Renewal",
          message: "Payment received! Verifying your subscription activation...",
        });

        // Auto-verify renewal with backend
        import("../../service/api").then(({ default: api }) => {
          api.get(`/payments/verify-renewal?orderId=${encodeURIComponent(orderId)}`)
            .then((res) => {
              if (res.data?.success) {
                setPaymentNotice({
                  type: "success",
                  title: "Payment Successful",
                  message: "Payment was success! Plan was activated, login to continue your access.",
                });
                toast.success("Payment was success! Plan was activated, login to continue your access.");
              } else if (res.data?.pending) {
                setPaymentNotice({
                  type: "pending",
                  title: "Payment Under Bank Processing",
                  message: res.data?.message || "Your payment is currently being confirmed by your bank. Your subscription will activate automatically once confirmed. You can log in shortly.",
                });
                toast.info("Payment is being confirmed by your bank. Your plan will activate shortly.");
              } else if (res.data?.cancelled) {
                setPaymentNotice({
                  type: "info",
                  title: "Payment Cancelled",
                  message: "The payment was cancelled and no amount was deducted from your account. You can click the renewal link in your email anytime to complete your payment.",
                });
                toast.info("Payment was cancelled. No amount was deducted.");
              } else {
                setPaymentNotice({
                  type: "warning",
                  title: "Payment Notice",
                  message: res.data?.message || "Your payment has been received. If confirmation takes a few moments, your plan will activate automatically.",
                });
                toast.warn("Payment verification in progress. Please check back shortly.");
              }
            })
            .catch((e) => {
              console.warn("[HotelLogin] verify-renewal:", e?.message);
              setPaymentNotice({
                type: "success",
                title: "Payment Successful",
                message: "Payment was success! Plan was activated, login to continue your access.",
              });
              toast.success("Payment was success! Plan was activated, login to continue your access.");
            })
            .finally(() => {
              window.history.replaceState({}, document.title, window.location.pathname);
            });
        });
      } else {
        setPaymentNotice({
          type: "success",
          title: "Payment Successful",
          message: "Payment was success! Plan was activated, login to continue your access.",
        });
        toast.success("Payment was success! Plan was activated, login to continue your access.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return;
    }

    // Case 6: Generic Notice
    if (rawError || status) {
      setPaymentNotice({
        type: "info",
        title: "Notice",
        message: "Unable to process the renewal link right now. Please sign in directly with your registered email.",
      });
      toast.info("Please sign in directly with your registered email.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // STEP 1: SEND OTP
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your registered hotel email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address (e.g. manager@grandhotel.com).");
      return;
    }

    try {
      setLoading(true);
      const response = await sendHotelOTP(trimmedEmail);

      setSuccess(
        response?.message || "Verification code successfully sent to your email."
      );
      setStep("otp");
      setOtp("");
      setOtpDigits(["", "", "", "", "", ""]);
      setResendCooldown(30);

      // Smooth autofocus first digit box
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to dispatch OTP. Please verify your email or try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: VERIFY OTP & SMOOTH SAAS DASHBOARD TRANSITION
  const handleVerifyOTP = useCallback(
    async (e, explicitCode) => {
      if (e) e.preventDefault();
      if (loading || authPhase === "success" || authPhase === "redirecting") return;

      setError("");
      setSuccess("");

      const codeToVerify = explicitCode || otp || otpDigits.join("");

      if (!codeToVerify || codeToVerify.length !== 6 || !/^\d{6}$/.test(codeToVerify)) {
        setError("Please enter the complete 6-digit numeric verification code.");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        return;
      }

      try {
        setLoading(true);
        setAuthPhase("verifying");

        const response = await verifyHotelOTP(
          email.trim(),
          codeToVerify
        );

        const loggedInUser =
          response?.user ||
          response?.data?.user;
        const authToken = response?.token || response?.data?.token;
        const cookieName = response?.cookieName || response?.data?.cookieName;

        if (authToken) {
          sessionStorage.setItem("hotelToken", authToken);
        }
        if (cookieName) {
          sessionStorage.setItem("hotelCookieName", cookieName);
        }

        // Establish session in AuthContext
        if (loggedInUser) {
          await loginUser(loggedInUser);
        }

        // Store user info for personalized SaaS greeting
        setVerifiedUser(loggedInUser);

        // TRANSITION TO HIGH-END SAAS SUCCESS SCREEN
        setAuthPhase("success");

        // 1. Give the user ~750ms to appreciate the animated checkmark & personalized workspace loading
        setTimeout(() => {
          setIsExiting(true); // Smooth card dissolve
        }, 700);

        // 2. Seamlessly navigate into the dashboard while the transition is active
        setTimeout(() => {
          navigate("/hotel/dashboard", {
            replace: true,
          });
        }, 850);

      } catch (err) {
        setLoading(false);
        setAuthPhase("idle");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setError(
          err?.response?.data?.message ||
            "Invalid or expired verification code. Please check and try again."
        );
        otpRefs.current[0]?.focus();
      }
    },
    [loading, authPhase, otp, otpDigits, email, loginUser, navigate]
  );

  // OTP Digit Slot Handlers (Responsive, Flexible, Auto-Advance)
  const handleDigitChange = (index, value) => {
    const clean = value.replace(/\D/g, "");

    if (!clean) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      setOtp(next.join(""));
      return;
    }

    // Handle full paste inside a slot
    if (clean.length > 1) {
      const pasteArr = clean.slice(0, 6).split("");
      const next = [...otpDigits];
      pasteArr.forEach((char, i) => {
        if (i < 6) next[i] = char;
      });
      setOtpDigits(next);
      const combined = next.join("");
      setOtp(combined);

      const nextFocus = Math.min(pasteArr.length, 5);
      otpRefs.current[nextFocus]?.focus();

      if (combined.length === 6) {
        handleVerifyOTP(null, combined);
      }
      return;
    }

    // Single digit input
    const next = [...otpDigits];
    next[index] = clean;
    setOtpDigits(next);
    const combined = next.join("");
    setOtp(combined);

    // Auto advance to next slot
    if (index < 5 && clean) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto verify as soon as 6th digit is typed
    if (combined.length === 6) {
      handleVerifyOTP(null, combined);
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
        const next = [...otpDigits];
        next[index - 1] = "";
        setOtpDigits(next);
        setOtp(next.join(""));
      } else {
        const next = [...otpDigits];
        next[index] = "";
        setOtpDigits(next);
        setOtp(next.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      otpRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleVerifyOTP(null);
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || "";
    }
    setOtpDigits(next);
    const combined = next.join("");
    setOtp(combined);

    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();

    if (combined.length === 6) {
      handleVerifyOTP(null, combined);
    }
  };

  const handleBack = () => {
    setStep("email");
    setOtp("");
    setOtpDigits(["", "", "", "", "", ""]);
    setError("");
    setSuccess("");
    setAuthPhase("idle");
    setIsShaking(false);
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/50 p-3 sm:p-6 lg:p-8 font-sans antialiased">
      <style>{animationStyles}</style>

      {/* Main SaaS Card Container with Responsive Medium Sizing */}
      <div
        className={`w-full max-w-5xl rounded-2xl sm:rounded-3xl bg-white shadow-xl lg:shadow-2xl shadow-blue-900/10 border border-slate-100/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 transition-all duration-300 my-auto ${
          isExiting ? "opacity-0 scale-[0.98] blur-[1px]" : "opacity-100 scale-100"
        }`}
      >
        
        {/* LEFT COLUMN: Immersive Visual (Shown on lg+ displays) */}
        <div className="hidden lg:flex lg:col-span-6 relative bg-slate-950 overflow-hidden items-end p-8 lg:p-10 select-none">
          {/* Background Image with Gradient Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80"
              alt="Luxury Hotel Architecture"
              className="w-full h-full object-cover object-center transform scale-105 hover:scale-100 transition-transform duration-1000 opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20"></div>
          </div>

          {/* Top Pill: Platform Status */}
          <div className="absolute top-6 left-6 lg:top-8 lg:left-8 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/70 backdrop-blur-md border border-white/15 text-white text-xs font-medium shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            StayLio · Hotel Portal
          </div>

          {/* Floating Glassmorphism Feature Card */}
          <div className="relative z-10 w-full bg-white/90 backdrop-blur-md rounded-2xl p-4 lg:p-5 shadow-2xl border border-white/40 space-y-2.5 transform translate-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pb-2 border-b border-slate-200/60">
              <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                <Building2 className="w-4 h-4" /> Hotel Operations & Automated Billing
              </span>
             
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2 lg:p-2.5 text-slate-600 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                <span className="truncate">Room Bookings</span>
              </div>
              <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2 lg:p-2.5 text-slate-600 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                <span className="truncate">Instant GST Invoicing</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Medium Sized, Fully Responsive Form */}
        <div className="lg:col-span-6 p-5 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center bg-white relative">
          <div className="max-w-md w-full mx-auto">

            {/* Mobile / Tablet SaaS Header Branding */}
            <div className="lg:hidden flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-blue-600/30">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight leading-none">StayLio</span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">Hotel Management</span>
                </div>
              </div>
          
            </div>
            
            {/* SUCCESS / REDIRECTING STATE: Ultra-smooth SaaS Dashboard Handoff */}
            {authPhase === "success" || authPhase === "redirecting" ? (
              <div className="relative py-4 sm:py-6 flex flex-col items-center text-center hl-animate-scale-in">
                {/* Radiant Ambient Glow Behind Success Card */}
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-indigo-500/10 rounded-3xl blur-xl hl-pulse-glow pointer-events-none"></div>

                {/* Animated SVG Checkmark */}
                <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6 flex items-center justify-center rounded-2xl sm:rounded-3xl bg-emerald-50/80 border border-emerald-100 shadow-md shadow-emerald-500/10">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-600" viewBox="0 0 52 52">
                    <circle
                      className="hl-checkmark-circle"
                      cx="26"
                      cy="26"
                      r="24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="hl-checkmark-check"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.1 27.2l7.1 7.2 16.7-16.8"
                    />
                  </svg>
                </div>

                {/* Status Pill */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-[11px] sm:text-xs font-semibold mb-2 sm:mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> Authentication Verified
                </div>

                {/* Personalized Greeting */}
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 leading-snug">
                  Welcome back,{" "}
                  <span className="text-blue-600">
                    {verifiedUser?.name || verifiedUser?.branchName || "Manager"}
                  </span>
                </h2>
                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-500 max-w-xs sm:max-w-sm leading-relaxed">
                  {verifiedUser?.branchName
                    ? `Connecting to ${verifiedUser.branchName} workspace...`
                    : "Preparing your hotel management dashboard..."}
                </p>

                {/* High-Precision Micro Progress Bar */}
                <div className="w-full max-w-[240px] sm:max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden mt-5 sm:mt-6 mb-3 sm:mb-4">
                  <div className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 hl-progress-bar rounded-full"></div>
                </div>

               
              </div>
            ) : (
              /* NORMAL LOGIN FLOW (Email / OTP Steps) */
              <div className="hl-animate-fade-in">
                {/* Header branding */}
                <div className="mb-5 sm:mb-7">
                  
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
                    {step === "email" ? "Login to Your Hotel" : "Enter Verification Code"}
                  </h1>
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {step === "email"
                      ? "Sign in securely using your registered hotel email address"
                      : "We've dispatched a secure 6-digit access code to:"}
                  </p>
                  {step === "otp" && (
                  <div className="mt-2 flex w-full sm:w-auto items-center justify-between sm:justify-start gap-3 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800">
  <div className="flex items-center gap-2.5 min-w-0">
    <Mail className="w-4 h-4 text-blue-600 shrink-0" />
    <span className="truncate text-slate-900 font-medium">{email}</span>
  </div>
  <button
    type="button"
    onClick={handleBack}
    disabled={loading}
    className="text-blue-600 hover:text-blue-700 underline text-xs font-semibold shrink-0 disabled:opacity-50 cursor-pointer"
  >
    Change
  </button>
</div>
                  )}
                </div>

                {/* Friendly Payment / Renewal Status Banner */}
                {paymentNotice && (
                  <div
                    className={`mb-4 sm:mb-6 flex items-start gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-xs sm:text-sm hl-animate-fade-in transition-all border ${
                      paymentNotice.type === "success"
                        ? "bg-emerald-50/90 border-emerald-100 text-emerald-800"
                        : paymentNotice.type === "pending"
                        ? "bg-amber-50/90 border-amber-100 text-amber-800"
                        : paymentNotice.type === "warning"
                        ? "bg-rose-50/90 border-rose-100 text-rose-800"
                        : "bg-blue-50/90 border-blue-100 text-blue-800"
                    }`}
                  >
                    {paymentNotice.type === "success" && (
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    {paymentNotice.type === "pending" && (
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    {paymentNotice.type === "warning" && (
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    {paymentNotice.type === "info" && (
                      <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 leading-relaxed">
                      {paymentNotice.title && (
                        <div className="font-semibold mb-0.5 text-slate-900">
                          {paymentNotice.title}
                        </div>
                      )}
                      <div className="font-normal opacity-90">{paymentNotice.message}</div>
                    </div>
                  </div>
                )}

                {/* Error Notification Banner */}
                {error && (
                  <div className="mb-4 sm:mb-6 flex items-start gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-red-50/95 border border-red-200/80 p-3 sm:p-4 text-xs sm:text-sm text-red-700 hl-animate-fade-in shadow-xs">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-relaxed font-medium">{error}</div>
                  </div>
                )}

                {/* Success Notification Banner */}
                {success && (
                  <div className="mb-4 sm:mb-6 flex items-start gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl bg-emerald-50/95 border border-emerald-200/80 p-3 sm:p-4 text-xs sm:text-sm text-emerald-700 hl-animate-fade-in shadow-xs">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-relaxed font-medium">{success}</div>
                  </div>
                )}

                {/* STEP 1: EMAIL INPUT FORM (Responsive Medium Size) */}
                {step === "email" && (
                  <form onSubmit={handleSendOTP} className="space-y-4 sm:space-y-5 hl-animate-fade-in">
                    <div>
                      <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 sm:mb-2">
                        Registered Hotel Email
                      </label>
                      <div className="relative rounded-xl sm:rounded-2xl shadow-xs">
                        <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="manager@luxuryhotel.com"
                          autoComplete="email"
                          disabled={loading}
                          autoFocus
                          className="w-full rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/60 pl-10 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-slate-900 text-xs sm:text-sm placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-3 focus:ring-blue-600/10 outline-none transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2.5 sm:py-3 lg:py-3.5 font-semibold text-xs sm:text-sm lg:text-base text-white shadow-md shadow-blue-600/25 hover:shadow-blue-600/35 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                          <span>Sending Verification Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Verification OTP</span>
                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* STEP 2: PROFESSIONAL 6-SLOT OTP INPUT (Fluid & Medium Sized) */}
                {step === "otp" && (
                  <form onSubmit={(e) => handleVerifyOTP(e)} className="space-y-4 sm:space-y-5 hl-animate-fade-in">
                    <div>
                      <div className="flex items-center justify-between mb-2 sm:mb-2.5">
                        <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600">
                          6-Digit Security Code
                        </label>
                        <button
                          type="button"
                          onClick={handleBack}
                          disabled={loading}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                        >
                          <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Back to Email
                        </button>
                      </div>

                      {/* 6 Individual Fluid Medium-Sized Digit Slots */}
                      <div
                        onPaste={handleOtpPaste}
                        className={`flex items-center justify-between gap-1.5 sm:gap-2.5 ${
                          isShaking ? "hl-animate-shake" : ""
                        }`}
                      >
                        {otpDigits.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={(el) => (otpRefs.current[idx] = el)}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleDigitChange(idx, e.target.value)}
                            onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                            disabled={loading || authPhase === "success"}
                            autoComplete="one-time-code"
                            className={`flex-1 min-w-0 max-w-[46px] sm:max-w-[54px] h-12 sm:h-14 text-center text-lg sm:text-2xl font-bold font-mono rounded-xl sm:rounded-2xl border transition-all duration-200 outline-none select-all ${
                              digit
                                ? "border-blue-600 bg-blue-50/30 text-blue-900 shadow-xs shadow-blue-500/10"
                                : "border-slate-200 bg-slate-50/60 text-slate-900"
                            } focus:border-blue-600 focus:bg-white focus:ring-3 focus:ring-blue-600/15 disabled:opacity-60`}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || authPhase === "success"}
                      className="w-full rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2.5 sm:py-3 lg:py-3.5 font-semibold text-xs sm:text-sm lg:text-base text-white shadow-md shadow-blue-600/25 hover:shadow-blue-600/35 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      {loading || authPhase === "verifying" ? (
                        <>
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                          <span>Verifying & Opening Dashboard...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify & Access Dashboard</span>
                          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
                        </>
                      )}
                    </button>

                    {/* Resend OTP with Cooldown */}
                    <div className="text-center pt-0.5">
                      <p className="text-[11px] sm:text-xs text-slate-500">
                        Didn't receive the email?{" "}
                        {resendCooldown > 0 ? (
                          <span className="font-semibold text-slate-400 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Resend in {resendCooldown}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={loading}
                            className="font-semibold text-blue-600 hover:underline disabled:opacity-50 cursor-pointer inline-flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" /> Resend Code
                          </button>
                        )}
                      </p>
                    </div>
                  </form>
                )}

                {/* Footer security badge */}
              
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};

export default HotelLogin;