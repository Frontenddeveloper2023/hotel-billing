import React from "react";
import { Hotel, Sparkles } from "lucide-react";

/**
 * Professional Staylio Project Theme Loader
 *
 * Props:
 * - message: Text displayed below spinner (default: "Loading...")
 * - subtitle: Optional secondary helper text
 * - fullPage: Centers in full screen or main viewport container (min-h-[55vh])
 * - size: "sm" | "md" | "lg" (default: "md")
 * - translucent: If true, renders with luxurious glassmorphism backdrop
 */
export default function StaylioLoader({
  message = "Loading...",
  subtitle = "Please wait a moment while we prepare your data.",
  fullPage = true,
  size = "md",
  translucent = true,
  className = "",
}) {
  const dimensions = {
    sm: { box: "w-10 h-10", ring: "w-10 h-10", icon: "w-4 h-4" },
    md: { box: "w-14 h-14", ring: "w-14 h-14", icon: "w-6 h-6" },
    lg: { box: "w-20 h-20", ring: "w-20 h-20", icon: "w-8 h-8" },
  }[size] || { box: "w-14 h-14", ring: "w-14 h-14", icon: "w-6 h-6" };

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 text-center select-none ${
        fullPage ? "min-h-[55vh] w-full" : "w-full py-8"
      } ${className}`}
    >
      <div
        className={`relative flex flex-col items-center justify-center rounded-3xl p-6 sm:p-8 transition-all duration-300 ${
          translucent
            ? "bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_18px_45px_rgba(6,20,52,0.12)] max-w-sm w-full"
            : ""
        }`}
      >
        {/* Animated Dual-Ring Resort Spinner */}
        <div className={`relative ${dimensions.box} flex items-center justify-center`}>
          {/* Outer glowing pulse ring */}
          <div
            className={`absolute inset-0 ${dimensions.ring} rounded-full bg-gradient-to-tr from-[#5b9bf5] to-[#2568e0] opacity-20 animate-ping`}
          />

          {/* Static track */}
          <div
            className={`absolute inset-0 ${dimensions.ring} rounded-full border-[3px] border-[#dbe6f5]/80`}
          />

          {/* High-speed gradient spinner border */}
          <div
            className={`absolute inset-0 ${dimensions.ring} rounded-full border-[3px] border-transparent border-t-[#2568e0] border-r-[#5b9bf5] animate-spin`}
            style={{ animationDuration: "0.85s" }}
          />

          {/* Center Brand Icon */}
          <div className="relative z-10 w-8 h-8 rounded-xl bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <Hotel className={`${dimensions.icon} text-white animate-pulse`} />
          </div>
        </div>

        {/* Message */}
        {message && (
          <h4 className="mt-4 text-sm sm:text-base font-extrabold tracking-tight text-black flex items-center gap-1.5 justify-center">
            {message}
          </h4>
        )}

        {/* Subtitle */}
        {subtitle && (
          <p className="mt-1 text-xs font-medium text-black/70 max-w-[260px] leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
