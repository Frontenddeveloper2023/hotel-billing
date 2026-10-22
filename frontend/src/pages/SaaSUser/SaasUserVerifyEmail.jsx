import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  Building2,
  LogIn
} from "lucide-react";
import SaaSSetupProgress from "./SaaSSetupProgress";
import { sendRegistrationOTP, verifyRegistrationOTP } from "../../service/hotelRegistrationApi";
import { useToast } from "../../Context/ToastContext";

// Scoped keyframe animations
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
  35% { width: 50%; }
  75% { width: 85%; }
  100% { width: 100%; }
}
@keyframes hlShake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
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
  animation: hlProgressSweep 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
`;

const SaasUserVerifyEmail = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  const [step, setStep] = useState("email"); // "email" | "otp" | "success"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [alreadyRegisteredNotice, setAlreadyRegisteredNotice] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Pre-fill from session if exists
  useEffect(() => {
    const existingEmail = sessionStorage.getItem("hotelRegistrationEmail");
    if (existingEmail && typeof existingEmail === "string") {
      setEmail(existingEmail);
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Handle Send OTP (With Already Registered Check)
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    setError("");
    setAlreadyRegisteredNotice(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Please enter your hotel email address to proceed.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address (e.g., manager@grandhotel.com).");
      return;
    }

    try {
      setLoading(true);
      const response = await sendRegistrationOTP(trimmedEmail);

      if (response?.success) {
        setStep("otp");
        setOtp("");
        setOtpDigits(["", "", "", "", "", ""]);
        setResendCooldown(30);
        toast.success("Verification code sent to your email!");

        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 100);
      }
    } catch (err) {
      const msg = err?.message || "Unable to send verification code. Please try again.";

      if (err?.isRegistered || msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists")) {
        setAlreadyRegisteredNotice({
          email: trimmedEmail,
          message: msg,
        });
        toast.warn("This email is already registered. Please login to your account.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOTP = useCallback(
    async (e, explicitCode) => {
      if (e) e.preventDefault();
      if (loading || step === "success") return;

      setError("");

      const codeToVerify = explicitCode || otp || otpDigits.join("");

      if (!codeToVerify || codeToVerify.length !== 6 || !/^\d{6}$/.test(codeToVerify)) {
        setError("Please enter the complete 6-digit numeric verification code.");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        return;
      }

      try {
        setLoading(true);
        const response = await verifyRegistrationOTP(email.trim(), codeToVerify);

        if (response?.success) {
          setStep("success");

          // Save verified email to sessionStorage
          sessionStorage.setItem("hotelRegistrationEmail", email.trim().toLowerCase());
          sessionStorage.setItem("hotelRegistrationEmailVerified", "true");

          toast.success("Email verified successfully!");

          // Smooth transition to Choose Plan
          setTimeout(() => {
            navigate("/saas-user/choose-plan");
          }, 850);
        }
      } catch (err) {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        setError(err?.message || "Invalid or expired verification code. Please try again.");
        otpRefs.current[0]?.focus();
      } finally {
        setLoading(false);
      }
    },
    [loading, step, otp, otpDigits, email, navigate, toast]
  );

  // OTP Digit Slot Handlers
  const handleDigitChange = (index, value) => {
    const clean = value.replace(/\D/g, "");

    if (!clean) {
      const next = [...otpDigits];
      next[index] = "";
      setOtpDigits(next);
      setOtp(next.join(""));
      return;
    }

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

    const next = [...otpDigits];
    next[index] = clean;
    setOtpDigits(next);
    const combined = next.join("");
    setOtp(combined);

    if (index < 5 && clean) {
      otpRefs.current[index + 1]?.focus();
    }

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

  const handleBackToEmail = () => {
    setStep("email");
    setOtp("");
    setOtpDigits(["", "", "", "", "", ""]);
    setError("");
    setAlreadyRegisteredNotice(null);
    setIsShaking(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans antialiased text-slate-800">
      <style>{animationStyles}</style>

      {/* Progress Breadcrumbs */}
      <SaaSSetupProgress activeStep={1} />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-6 sm:p-10 relative overflow-hidden">
          
          {/* SUCCESS STATE */}
          {step === "success" ? (
            <div className="py-8 flex flex-col items-center text-center hl-animate-scale-in">
              <div className="w-16 h-16 sm:w-20 sm:h-20 mb-5 flex items-center justify-center rounded-2xl sm:rounded-3xl bg-emerald-50 border border-emerald-100 shadow-md shadow-emerald-500/10">
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

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Email Verified
              </span>

              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Email Confirmed!
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-xs">
                Redirecting to subscription plans...
              </p>

              <div className="w-full max-w-[220px] h-1.5 bg-slate-100 rounded-full overflow-hidden mt-6">
                <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 hl-progress-bar rounded-full"></div>
              </div>
            </div>
          ) : (
            /* EMAIL & OTP FORM */
            <div className="hl-animate-fade-in">
              {/* Header */}
              <div className="mb-6 sm:mb-8 text-center sm:text-left">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 mb-3.5 shadow-xs border border-blue-100/60">
                  {step === "otp" ? (
                    <KeyRound className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Building2 className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
                  Step 01 &bull; Account Verification
                </div>
               <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
  {step === "email" ? "Welcome" : "Verify Code"}
</h1>
<p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
  {step === "email"
    ? "Enter your email to receive a 6-digit code."
    : "We sent a 6-digit code to:"}
</p>

                {step === "otp" && (
                  <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs font-semibold text-slate-800">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={handleBackToEmail}
                      disabled={loading}
                      className="text-blue-600 hover:text-blue-700 underline text-[11px] ml-1 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              {/* ALREADY REGISTERED NOTICE BANNER */}
              {alreadyRegisteredNotice && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 hl-animate-fade-in space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm leading-relaxed">
                      <p className="font-semibold text-amber-950 mb-0.5">Email Already Registered</p>
                      <p className="text-amber-800">{alreadyRegisteredNotice.message}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-amber-200/60">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/hotel-login?email=${encodeURIComponent(alreadyRegisteredNotice.email)}`)
                      }
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
                    >
                      <LogIn className="w-3.5 h-3.5" /> Go to Hotel Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlreadyRegisteredNotice(null)}
                      className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-medium text-amber-800 hover:bg-amber-100/60 transition cursor-pointer"
                    >
                      Try Another Email
                    </button>
                  </div>
                </div>
              )}

              {/* Generic Error Banner */}
              {error && (
                <div className="mb-6 flex items-start gap-2.5 rounded-2xl bg-red-50/90 border border-red-200/80 p-3.5 text-xs sm:text-sm text-red-700 hl-animate-fade-in">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed font-medium">{error}</div>
                </div>
              )}

              {/* STEP 1: EMAIL INPUT */}
              {step === "email" && (
                <form onSubmit={handleSendOTP} className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Hotel Contact Email
                    </label>
                    <div className="relative rounded-xl sm:rounded-2xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError("");
                          if (alreadyRegisteredNotice) setAlreadyRegisteredNotice(null);
                        }}
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
                    className="w-full rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm text-white shadow-md shadow-blue-600/25 hover:shadow-blue-600/35 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        <span>Checking Email & Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Verification OTP</span>
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-slate-500">
                      Already registered your hotel?{" "}
                      <Link to="/hotel-login" className="font-semibold text-blue-600 hover:underline">
                        Log in here
                      </Link>
                    </p>
                  </div>
                </form>
              )}

              {/* STEP 2: 6-SLOT OTP INPUT */}
              {step === "otp" && (
                <form onSubmit={(e) => handleVerifyOTP(e)} className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600">
                        6-Digit Security Code
                      </label>
                      <button
                        type="button"
                        onClick={handleBackToEmail}
                        disabled={loading}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" /> Back
                      </button>
                    </div>

                    {/* Fluid 6 Slots */}
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
                          disabled={loading}
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
                    disabled={loading}
                    className="w-full rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm text-white shadow-md shadow-blue-600/25 hover:shadow-blue-600/35 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        <span>Verifying Security Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Choose Plan</span>
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
                      </>
                    )}
                  </button>

                  {/* Resend OTP */}
                  <div className="text-center pt-0.5">
                    <p className="text-[11px] sm:text-xs text-slate-500">
                      Didn't receive code?{" "}
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

           
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default SaasUserVerifyEmail;
