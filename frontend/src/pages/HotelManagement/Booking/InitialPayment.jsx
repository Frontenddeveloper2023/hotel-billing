import React, { useEffect, useMemo, useState } from "react";
import {
    X,
    CreditCard,
    Banknote,
    Smartphone,
    WalletCards,
    IndianRupee,
    CheckCircle2,
    Loader2,
    BedDouble,
    CalendarDays,
    AlertCircle,
} from "lucide-react";

/* =========================================================
   MOTION HELPERS
========================================================= */

function useEntered() {
    const [entered, setEntered] = useState(false);

    useEffect(() => {
        let r2;
        const r1 = requestAnimationFrame(() => {
            r2 = requestAnimationFrame(() => setEntered(true));
        });
        return () => {
            cancelAnimationFrame(r1);
            cancelAnimationFrame(r2);
        };
    }, []);

    return entered;
}

function ModalShell({ children }) {
    const entered = useEntered();

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-[#0e2a4a]/65 backdrop-blur-sm p-0 sm:p-4 transition-opacity duration-300 motion-reduce:transition-none ${
                entered ? "opacity-100" : "opacity-0"
            }`}
        >
            <div
                className={`w-full sm:max-w-xl max-h-[96vh] sm:max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-[#0e2a4a]/30 border border-[#e2ebf7] overflow-hidden flex flex-col transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                    entered
                        ? "opacity-100 translate-y-0 sm:scale-100"
                        : "opacity-0 translate-y-8 sm:translate-y-2 sm:scale-95"
                }`}
            >
                {children}
            </div>
        </div>
    );
}

function Fade({ delay = 0, className = "", children }) {
    const entered = useEntered();

    return (
        <div
            style={{ transitionDelay: entered ? `${delay}ms` : "0ms" }}
            className={`transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
                entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            } ${className}`}
        >
            {children}
        </div>
    );
}

function ProgressBar({ pct }) {
    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#dbe6f5]">
            <div
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                className="h-full rounded-full bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] transition-[width] duration-500 ease-out motion-reduce:transition-none"
            />
        </div>
    );
}

/* =========================================================
   HELPERS
========================================================= */

const fmt = (v) => Number(v || 0).toLocaleString("en-IN");

/* =========================================================
   COMPONENT
========================================================= */

export default function InitialPayment({ booking, onConfirm, onCancel }) {
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [amountTouched, setAmountTouched] = useState(false);

    /* ── DERIVED VALUES ── */

    const roomTotal = useMemo(() => {
        const total = Number(booking?.roomTotal);

        if (Number.isFinite(total) && total >= 0) {
            return total;
        }

        return (
            Number(booking?.pricePerNight || 0) *
            Number(booking?.nights || 0)
        );
    }, [booking]);

    const selectedRooms = useMemo(() => {
        if (Array.isArray(booking?.rooms)) return booking.rooms;
        if (Array.isArray(booking?.selectedRooms)) return booking.selectedRooms;

        if (booking?.roomNumber) {
            return [
                {
                    roomNumber: booking.roomNumber,
                    roomType: booking.roomType,
                    bedType: booking.bedType,
                    pricePerNight: Number(booking?.pricePerNight || 0),
                },
            ];
        }

        return [];
    }, [booking]);

    const paymentAmount = Number(amount || 0);
    const remainingAmount = Math.max(roomTotal - paymentAmount, 0);
    const paidPct = roomTotal > 0 ? (paymentAmount / roomTotal) * 100 : 0;
    const isFullPayment = paymentAmount >= roomTotal && roomTotal > 0;

    /* ── VALIDATION ── */

    const getAmountError = (value) => {
        if (!value || String(value).trim() === "") {
            return "Please enter the initial payment amount.";
        }

        const num = Number(value);

        if (!Number.isFinite(num)) {
            return "Please enter a valid payment amount.";
        }

        if (num <= 0) {
            return "Payment amount must be greater than ₹0.";
        }

        if (num > roomTotal) {
            return `Payment cannot exceed the booking total of ₹${fmt(roomTotal)}.`;
        }

        return "";
    };

    const amountError = amountTouched ? getAmountError(amount) : "";

    /* ── HANDLERS ── */

    const handleAmountChange = (e) => {
        let value = e.target.value.replace(/[^\d.]/g, "");

        const parts = value.split(".");

        if (parts.length > 2) {
            value = `${parts[0]}.${parts.slice(1).join("")}`;
        }

        setAmount(value);
        setErrorMessage("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setAmountTouched(true);
        setErrorMessage("");

        if (!roomTotal || roomTotal <= 0) {
            setErrorMessage(
                "Booking total is invalid. Please check the selected rooms before continuing."
            );
            return;
        }

        const validationError = getAmountError(amount);

        if (validationError) {
            setErrorMessage(validationError);
            return;
        }

        try {
            setLoading(true);

            const paymentViaMap = {
                cash: "Cash",
                card: "Card",
                upi: "UPI",
                other: "Other",
            };

            await onConfirm({
                amount: paymentAmount,
                paymentMethod: paymentViaMap[paymentMethod] || "Cash",
                roomTotal,
                remainingAmount,
            });
        } catch (error) {
            console.error("Initial payment confirmation failed:", error);

            setErrorMessage(
                error?.message ||
                    "Payment could not be confirmed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    /* ── PAYMENT METHOD OPTIONS ── */

    const paymentMethods = [
        { key: "cash", label: "Cash", icon: Banknote },
        { key: "card", label: "Card", icon: CreditCard },
        { key: "upi", label: "UPI", icon: Smartphone },
        { key: "other", label: "Other", icon: WalletCards },
    ];

    /* ── RENDER ── */

    return (
        <ModalShell>
            {/* HEADER */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 lg:px-6 py-4 border-b border-[#e7eff8] bg-white/95 backdrop-blur">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-xl bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white shadow-md shadow-blue-600/25 flex items-center justify-center">
                        <CreditCard className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                        <h2 className="text-base sm:text-lg font-bold text-[#0e2a4a] truncate">
                            Initial Payment
                        </h2>

                        <p className="text-xs sm:text-sm text-[#6b7f99] mt-0.5 truncate">
                            Collect the advance payment for this booking.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    aria-label="Close payment window"
                    className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl border border-[#dbe6f5] bg-white text-[#9aabc0] hover:bg-[#eaf3ff] hover:text-[#2568e0] hover:border-[#5b9bf5] active:scale-95 transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5">

                {/* ERROR BANNER */}
                {errorMessage && (
                    <Fade>
                        <div
                            role="alert"
                            className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200"
                        >
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />

                            <p className="text-xs sm:text-sm font-semibold text-red-800 leading-5">
                                {errorMessage}
                            </p>
                        </div>
                    </Fade>
                )}

                {/* GUEST SUMMARY BANNER */}
                <Fade delay={40}>
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0e2a4a] via-[#2568e0] to-blue-600 p-4 sm:p-5 text-white shadow-lg shadow-[#0e2a4a]/25">
                        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-300/20 blur-2xl" />

                        <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-blue-200 uppercase tracking-wide">Guest</p>
                                <p className="text-sm sm:text-base font-bold mt-1 break-words">
                                    {booking?.customerName || "Guest"}
                                </p>
                            </div>

                            <div>
                                <p className="text-[11px] font-semibold text-blue-200 uppercase tracking-wide">Rooms</p>
                                <p className="text-sm sm:text-base font-bold mt-1">
                                    {selectedRooms.length || booking?.roomNumber || "—"}
                                </p>
                            </div>

                            <div className="col-span-2 sm:col-span-1 sm:text-right">
                                <p className="text-[11px] font-semibold text-blue-200 uppercase tracking-wide">
                                    Booking Total
                                </p>
                                <p className="text-lg sm:text-xl font-bold mt-1">
                                    ₹{fmt(roomTotal)}
                                </p>
                            </div>
                        </div>
                    </div>
                </Fade>

                {/* SELECTED ROOMS */}
                <Fade delay={80}>
                    <div className="rounded-2xl border border-[#dbe6f5] overflow-hidden">
                        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#eaf3ff] to-white border-b border-[#e7eff8]">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white flex items-center justify-center">
                                    <BedDouble className="w-4 h-4" />
                                </div>

                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-[#0e2a4a]">Selected Rooms</p>
                                    <p className="text-xs text-[#6b7f99] mt-0.5 truncate">
                                        Room charges included in this booking
                                    </p>
                                </div>
                            </div>

                            <span className="px-2.5 py-1 rounded-full bg-[#2568e0] text-white text-[11px] font-bold shrink-0">
                                {selectedRooms.length}{" "}
                                {selectedRooms.length === 1 ? "Room" : "Rooms"}
                            </span>
                        </div>

                        <div className="p-3 sm:p-4 space-y-3">
                            {selectedRooms.length > 0 ? (
                                selectedRooms.map((room, index) => {
                                    const roomPrice = Number(
                                        room?.pricePerNight ?? room?.perNightRoomPrice ?? 0
                                    );

                                    const checkIn = room?.checkIn || booking?.checkIn || "";
                                    const checkOut = room?.checkOut || booking?.checkOut || "";

                                    const roomStart = checkIn
                                        ? new Date(`${checkIn}T00:00:00`)
                                        : null;
                                    const roomEnd = checkOut
                                        ? new Date(`${checkOut}T00:00:00`)
                                        : null;

                                    const nights =
                                        roomStart &&
                                        roomEnd &&
                                        !Number.isNaN(roomStart.getTime()) &&
                                        !Number.isNaN(roomEnd.getTime()) &&
                                        roomEnd > roomStart
                                            ? Math.ceil(
                                                  (roomEnd.getTime() - roomStart.getTime()) /
                                                      86400000
                                              )
                                            : Number(booking?.nights || 0);

                                    const roomAmount = roomPrice * nights;

                                    return (
                                        <div
                                            key={
                                                room?._id ||
                                                room?.id ||
                                                room?.roomNumber ||
                                                index
                                            }
                                            className="rounded-xl border border-[#dbe6f5] bg-white p-3.5 sm:p-4 hover:border-[#5b9bf5] hover:bg-[#eaf3ff]/50 transition-colors duration-200"
                                        >
                                            <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-start min-[420px]:justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white flex items-center justify-center shrink-0">
                                                            <BedDouble className="w-4 h-4" />
                                                        </div>

                                                        <p className="text-sm sm:text-base font-bold text-[#0e2a4a]">
                                                            Room {room?.roomNumber || "—"}
                                                        </p>
                                                    </div>

                                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                        {room?.roomType && (
                                                            <span className="px-2 py-0.5 rounded-md bg-[#eaf3ff] border border-[#dbe6f5] text-xs font-semibold text-[#2568e0]">
                                                                {room.roomType}
                                                            </span>
                                                        )}
                                                        {room?.bedType && (
                                                            <span className="px-2 py-0.5 rounded-md bg-[#eaf3ff] border border-[#dbe6f5] text-xs font-semibold text-[#2568e0]">
                                                                {room.bedType}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {(checkIn || checkOut) && (
                                                        <p className="flex items-center gap-1.5 text-xs text-[#6b7f99] mt-2">
                                                            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                                                            {checkIn || "—"}
                                                            <span className="text-slate-300">→</span>
                                                            {checkOut || "—"}
                                                        </p>
                                                    )}

                                                    <p className="text-xs text-[#6b7f99] mt-1">
                                                        ₹{fmt(roomPrice)} × {nights}{" "}
                                                        {nights === 1 ? "night" : "nights"}
                                                    </p>
                                                </div>

                                                <div className="min-[420px]:text-right border-t min-[420px]:border-t-0 pt-2 min-[420px]:pt-0 shrink-0">
                                                    <p className="text-[11px] font-semibold text-[#9aabc0] uppercase tracking-wide">
                                                        Room Total
                                                    </p>
                                                    <p className="text-base sm:text-lg font-bold text-[#0e2a4a] mt-0.5">
                                                        ₹{fmt(roomAmount)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-6 text-center border border-dashed border-[#dbe6f5] rounded-xl bg-[#f6f9fe]">
                                    <BedDouble className="w-7 h-7 mx-auto text-blue-300" />
                                    <p className="text-sm font-semibold text-[#5b7089] mt-3">
                                        No room details available.
                                    </p>
                                    <p className="text-xs text-[#9aabc0] mt-1">
                                        Please check the booking details.
                                    </p>
                                </div>
                            )}

                            {/* BOOKING TOTAL ROW */}
                            <div className="flex items-center justify-between gap-3 pt-4 mt-1 border-t border-[#dbe6f5]">
                                <div>
                                    <p className="text-sm font-bold text-[#0e2a4a]">Booking Total</p>
                                    <p className="text-xs text-[#6b7f99] mt-0.5">Total room charges</p>
                                </div>
                                <p className="text-lg sm:text-xl font-bold text-[#0e2a4a] whitespace-nowrap">
                                    ₹{fmt(roomTotal)}
                                </p>
                            </div>
                        </div>
                    </div>
                </Fade>

                {/* PAYMENT AMOUNT */}
                <Fade delay={120}>
                    <div>
                        <label
                            htmlFor="initialPaymentAmount"
                            className="block text-sm font-bold text-[#0e2a4a] mb-2"
                        >
                            Initial Payment Amount
                            <span className="text-red-500 ml-1">*</span>
                        </label>

                        <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />

                            <input
                                id="initialPaymentAmount"
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                disabled={loading}
                                onChange={handleAmountChange}
                                onBlur={() => setAmountTouched(true)}
                                placeholder="Enter advance amount"
                                aria-invalid={!!amountError}
                                aria-describedby="amount-hint"
                                className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm sm:text-base font-semibold text-[#0e2a4a] placeholder:text-[#9aabc0] outline-none transition-all duration-200 disabled:bg-slate-100 disabled:text-[#6b7f99] disabled:cursor-not-allowed ${
                                    amountError
                                        ? "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-100"
                                        : "border-[#dbe6f5] bg-[#f6f9fe] focus:bg-white focus:border-[#3b82f0] focus:ring-2 focus:ring-[#3b82f0]/20"
                                }`}
                            />
                        </div>

                        {amountError ? (
                            <p
                                id="amount-hint"
                                role="alert"
                                className="flex items-start gap-1.5 text-xs font-semibold text-red-700 mt-2 leading-5"
                            >
                                <span className="shrink-0">&bull;</span>
                                <span>{amountError}</span>
                            </p>
                        ) : (
                            <p id="amount-hint" className="text-xs text-[#6b7f99] mt-2">
                                Maximum payment: ₹{fmt(roomTotal)}
                            </p>
                        )}

                        {paymentAmount > 0 && (
                            <div className="mt-3 space-y-1.5">
                                <ProgressBar pct={paidPct} />
                                <p className="text-[11px] text-[#6b7f99] text-right">
                                    {Math.min(100, Math.round(paidPct))}% of booking total
                                </p>
                            </div>
                        )}
                    </div>
                </Fade>

                {/* PAYMENT METHOD */}
                <Fade delay={160}>
                    <div>
                        <p className="text-sm font-bold text-[#0e2a4a] mb-2.5">
                            Payment Method
                            <span className="text-red-500 ml-1">*</span>
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {paymentMethods.map((method) => {
                                const Icon = method.icon;
                                const isSelected = paymentMethod === method.key;

                                return (
                                    <button
                                        key={method.key}
                                        type="button"
                                        disabled={loading}
                                        aria-pressed={isSelected}
                                        onClick={() => setPaymentMethod(method.key)}
                                        className={`min-h-[76px] cursor-pointer flex flex-col items-center justify-center gap-2 rounded-xl border transition-all duration-200 motion-reduce:transition-none active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ${
                                            isSelected
                                                ? "border-blue-500 bg-[#eaf3ff] text-[#2568e0] ring-2 ring-blue-200 shadow-sm shadow-blue-600/10"
                                                : "border-[#dbe6f5] bg-white text-[#5b7089] hover:bg-[#eaf3ff]/70 hover:border-[#5b9bf5] hover:text-[#2568e0]"
                                        }`}
                                    >
                                        <div
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                                                isSelected
                                                    ? "bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white"
                                                    : "bg-[#eaf3ff] text-[#5b9bf5]"
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-bold">{method.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </Fade>

                {/* PAYMENT SUMMARY */}
                <div
                    className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none ${
                        paymentAmount > 0 && paymentAmount <= roomTotal
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0"
                    }`}
                >
                    <div className="overflow-hidden min-h-0">
                        <Fade delay={200}>
                            <div className="rounded-2xl bg-[#f4f8fd] border border-[#e2ebf7] p-4 sm:p-5 space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="text-xs sm:text-sm font-semibold text-slate-700">
                                            Advance Received
                                        </span>
                                    </div>
                                    <span className="text-sm sm:text-base font-bold text-emerald-700">
                                        ₹{fmt(paymentAmount)}
                                    </span>
                                </div>

                                <div className="border-t border-blue-100" />

                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs sm:text-sm font-semibold text-slate-700">
                                        Balance at Checkout
                                    </span>
                                    <span
                                        className={`text-base sm:text-lg font-bold ${
                                            isFullPayment ? "text-emerald-700" : "text-[#0e2a4a]"
                                        }`}
                                    >
                                        {isFullPayment
                                            ? "Fully Paid ✓"
                                            : `₹${fmt(remainingAmount)}`}
                                    </span>
                                </div>
                            </div>
                        </Fade>
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className="shrink-0 border-t border-[#dbe6f5] bg-white p-4 sm:px-5 lg:px-6">
                <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-[#dbe6f5] bg-white text-sm font-bold text-[#0e2a4a] hover:bg-[#eaf3ff] hover:text-[#2568e0] hover:border-[#5b9bf5] active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={
                            loading ||
                            !roomTotal ||
                            paymentAmount <= 0 ||
                            paymentAmount > roomTotal
                        }
                        className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2568e0] to-blue-600 text-white text-sm font-bold shadow-md shadow-blue-600/25 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] transition-all duration-200 motion-reduce:transform-none disabled:from-slate-300 disabled:to-slate-300 disabled:text-[#6b7f99] disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Confirm Payment</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </ModalShell>
    );
}
