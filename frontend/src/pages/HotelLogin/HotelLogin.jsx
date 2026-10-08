import React, { useState } from "react";
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
  MapPin,
  Calendar
} from "lucide-react";
import {
  sendHotelOTP,
  verifyHotelOTP,
} from "../../service/usersService";
import { useAuth } from "../../Context/AuthContext";

const HotelLogin = () => {
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [step, setStep] = useState("email"); // "email" | "otp"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendOTP = async (e) => {
    e.preventDefault();
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
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to dispatch OTP. Please verify your email or try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setError("Please enter the complete 6-digit numeric verification code.");
      return;
    }

    try {
      setLoading(true);
      const response = await verifyHotelOTP(
        email.trim(),
        otp
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

      if (loggedInUser) {
        await loginUser(loggedInUser);
      }

      setSuccess(
        response?.message || "Authentication successful. Redirecting to dashboard..."
      );

      setTimeout(() => {
        navigate("/hotel/dashboard", {
          replace: true,
        });
      }, 600);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Invalid or expired verification code. Please check and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep("email");
    setOtp("");
    setError("");
    setSuccess("");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl shadow-blue-900/10 border border-slate-100 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        
        {/* LEFT COLUMN: Immersive Visual & Floating Card (Matches reference design) */}
        <div className="hidden lg:flex lg:col-span-6 relative bg-slate-900 overflow-hidden items-end p-10">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80"
              alt="Luxury Hotel Architecture"
              className="w-full h-full object-cover object-center transform scale-105 hover:scale-100 transition-transform duration-1000"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent"></div>
          </div>

          {/* Floating Glassmorphism Search/Booking Card overlay */}
          <div className="relative z-10 w-full bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-white/40 space-y-3 transform translate-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pb-2 border-b border-slate-200/60">
              <span className="flex items-center gap-1.5 text-blue-600">
                <Building2 className="w-4 h-4" /> Login to Manage your Hotel 
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-600 flex items-center gap-2">
                <span className="truncate">Manage Room Bookings</span>
              </div>
              <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2.5 text-xs text-slate-600 flex items-center gap-2">
                <span className="truncate"> Manage Bookings Records</span>
              </div>
            </div>

           
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Form with Smooth Transitions */}
        <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            
            {/* Header branding */}
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-sm border border-blue-100/60">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Login to Access your Hotel 
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {step === "email"
                  ? "Sign in securely using your registered email"
                  : `We've sent a 6-digit confirmation code to ${email}`}
              </p>
            </div>

            {/* Error Notification Banner */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-50/90 border border-red-100 p-4 text-sm text-red-700 animate-fadeIn transition-all">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed font-medium">{error}</div>
              </div>
            )}

            {/* Success Notification Banner */}
            {success && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl bg-emerald-50/90 border border-emerald-100 p-4 text-sm text-emerald-700 animate-fadeIn transition-all">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed font-medium">{success}</div>
              </div>
            )}

            {/* STEP 1: EMAIL INPUT FORM */}
            {step === "email" && (
              <form onSubmit={handleSendOTP} className="space-y-5 animate-fadeIn">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Your Hotel Email
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="manager@luxuryhotel.com"
                      autoComplete="email"
                      disabled={loading}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3.5 text-slate-900 text-sm placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <span>Send Verification OTP</span>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: OTP INPUT FORM */}
            {step === "otp" && (
              <form onSubmit={handleVerifyOTP} className="space-y-5 animate-fadeIn">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Enter 6-Digit OTP
                    </label>
                    <button
                      type="button"
                      onClick={handleBack}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Change Email
                    </button>
                  </div>
                  
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                      placeholder="------"
                      autoComplete="one-time-code"
                      disabled={loading}
                      autoFocus
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3.5 text-slate-900 text-xl font-mono tracking-[0.5em] text-center placeholder:text-slate-300 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-4 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verifying & Logging In...</span>
                    </>
                  ) : (
                    <span>Verify & Login</span>
                  )}
                </button>

                <div className="text-center pt-2">
                  <p className="text-xs text-slate-500">
                    Didn't receive code?{" "}
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={loading}
                      className="font-semibold text-blue-600 hover:underline disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* Footer help note */}
            <div className="mt-10 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                Protected by enterprise-grade security &bull; Need help? Contact Support
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default HotelLogin;