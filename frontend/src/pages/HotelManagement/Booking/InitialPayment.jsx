import React, { useMemo, useState } from "react";
import {
    X,
    CreditCard,
    Banknote,
    Smartphone,
    WalletCards,
    IndianRupee,
    CheckCircle2,
    Loader2,
} from "lucide-react";

export default function InitialPayment({
    booking,
    onConfirm,
    onCancel,
}) {
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [amountTouched, setAmountTouched] = useState(false);

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
        if (Array.isArray(booking?.rooms)) {
            return booking.rooms;
        }

        if (Array.isArray(booking?.selectedRooms)) {
            return booking.selectedRooms;
        }

        if (booking?.roomNumber) {
            return [
                {
                    roomNumber: booking.roomNumber,
                    roomType: booking.roomType,
                    bedType: booking.bedType,
                    pricePerNight: Number(
                        booking?.pricePerNight || 0
                    ),
                },
            ];
        }

        return [];
    }, [booking]);

    const paymentAmount = Number(amount || 0);

    const remainingAmount = Math.max(
        roomTotal - paymentAmount,
        0
    );

    const formatMoney = (value) =>
        Number(value || 0).toLocaleString("en-IN");

    const getAmountError = (value) => {
        if (!value || value.trim() === "") {
            return "Please enter the initial payment amount.";
        }

        const numericValue = Number(value);

        if (!Number.isFinite(numericValue)) {
            return "Please enter a valid payment amount.";
        }

        if (numericValue <= 0) {
            return "Payment amount must be greater than ₹0.";
        }

        if (numericValue > roomTotal) {
            return `Payment cannot be more than the booking total of ₹${formatMoney(
                roomTotal
            )}.`;
        }

        return "";
    };

    const amountError = amountTouched
        ? getAmountError(amount)
        : "";

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
                paymentMethod:
                    paymentViaMap[paymentMethod] || "Cash",
                roomTotal,
                remainingAmount,
            });
        } catch (error) {
            console.error(
                "Initial payment confirmation failed:",
                error
            );

            setErrorMessage(
                error?.message ||
                    "Payment could not be confirmed. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const paymentMethods = [
        { key: "cash", label: "Cash", icon: Banknote },
        { key: "card", label: "Card", icon: CreditCard },
        { key: "upi", label: "UPI", icon: Smartphone },
        { key: "other", label: "Other", icon: WalletCards },
    ];

    return (
        <div
            className="
                fixed inset-0 z-[100]
                bg-slate-950/60 backdrop-blur-sm
                flex items-end sm:items-center justify-center
                p-0 sm:p-4
            "
        >
            <div
                className="
                    w-full sm:max-w-xl
                    max-h-[96vh] sm:max-h-[92vh]
                    bg-white
                    rounded-t-3xl sm:rounded-3xl
                    shadow-2xl border border-slate-200
                    overflow-hidden
                    flex flex-col
                "
            >
                {/* HEADER */}
                <div
                    className="
                        shrink-0 flex items-center justify-between gap-3
                        px-4 sm:px-5 lg:px-6 py-4
                        border-b border-slate-200 bg-white
                    "
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="
                                w-10 h-10 sm:w-11 sm:h-11
                                rounded-xl bg-teal-50 border border-teal-100
                                flex items-center justify-center shrink-0
                            "
                        >
                            <CreditCard
                                className="
                                    w-5 h-5
                                    text-[var(--teal-dark,#065b62)]
                                "
                            />
                        </div>

                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                Initial Payment
                            </h2>

                            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                                Collect the advance payment for this booking.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        aria-label="Close payment window"
                        className="
                            w-9 h-9 sm:w-10 sm:h-10
                            rounded-xl border border-slate-300 bg-white
                            flex items-center justify-center
                            text-slate-600
                            hover:bg-slate-100 hover:text-slate-900
                            transition shrink-0
                            disabled:opacity-50 disabled:cursor-not-allowed
                        "
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div
                    className="
                        flex-1 overflow-y-auto overscroll-contain
                        p-4 sm:p-5 lg:p-6 space-y-5
                    "
                >
                    {/* ERROR */}
                    {errorMessage && (
                        <div
                            role="alert"
                            className="
                                flex items-start gap-2.5
                                p-3.5 sm:p-4
                                rounded-xl
                                bg-red-50 border border-red-300
                            "
                        >
                            <X className="w-4 h-4 text-red-700 mt-0.5 shrink-0" />

                            <p className="text-xs sm:text-sm font-semibold text-red-800 leading-5">
                                {errorMessage}
                            </p>
                        </div>
                    )}

                    {/* GUEST SUMMARY */}
                    <div
                        className="
                            rounded-2xl bg-slate-50
                            border border-slate-200 p-4 sm:p-5
                        "
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="min-w-0">
                                <p className="text-[10px] sm:text-xs uppercase tracking-wide font-bold text-slate-600">
                                    Guest
                                </p>

                                <p className="text-sm sm:text-base font-bold text-slate-900 mt-1 break-words">
                                    {booking?.customerName || "Guest"}
                                </p>
                            </div>

                            <div className="sm:text-right">
                                <p className="text-[10px] sm:text-xs uppercase tracking-wide font-bold text-slate-600">
                                    Rooms
                                </p>

                                <p className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                                    {selectedRooms.length ||
                                        booking?.roomNumber ||
                                        "-"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* SELECTED ROOMS */}
                    <div
                        className="
                            rounded-2xl border border-slate-200
                            overflow-hidden bg-white
                        "
                    >
                        <div
                            className="
                                px-4 sm:px-5 py-3.5
                                bg-slate-50 border-b border-slate-200
                            "
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-bold text-slate-900">
                                        Selected Rooms
                                    </p>

                                    <p className="text-xs text-slate-600 mt-0.5">
                                        Room charges included in this booking
                                    </p>
                                </div>

                                <div
                                    className="
                                        px-2.5 py-1 rounded-lg
                                        bg-white border border-slate-200
                                        text-xs font-bold text-slate-700
                                        shrink-0
                                    "
                                >
                                    {selectedRooms.length}{" "}
                                    {selectedRooms.length === 1
                                        ? "Room"
                                        : "Rooms"}
                                </div>
                            </div>
                        </div>

                        <div className="p-3 sm:p-4 space-y-3">
                            {selectedRooms.length > 0 ? (
                                selectedRooms.map((room, index) => {
                                    const roomPrice = Number(
                                        room?.pricePerNight ??
                                            room?.perNightRoomPrice ??
                                            0
                                    );

                                    const checkIn =
                                        room?.checkIn ||
                                        booking?.checkIn ||
                                        "";

                                    const checkOut =
                                        room?.checkOut ||
                                        booking?.checkOut ||
                                        "";

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
                                                  (roomEnd.getTime() -
                                                      roomStart.getTime()) /
                                                      86400000
                                              )
                                            : Number(booking?.nights || 0);

                                    const roomAmount =
                                        roomPrice * nights;

                                    return (
                                        <div
                                            key={
                                                room?._id ||
                                                room?.id ||
                                                room?.roomNumber ||
                                                index
                                            }
                                            className="
                                                rounded-xl border border-slate-200
                                                bg-white p-3.5 sm:p-4
                                            "
                                        >
                                            <div
                                                className="
                                                    flex flex-col
                                                    min-[420px]:flex-row
                                                    min-[420px]:items-start
                                                    min-[420px]:justify-between
                                                    gap-3
                                                "
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="
                                                                w-8 h-8 rounded-lg
                                                                bg-teal-50
                                                                flex items-center justify-center
                                                                shrink-0
                                                            "
                                                        >
                                                            <CreditCard
                                                                className="
                                                                    w-4 h-4
                                                                    text-[var(--teal-dark,#065b62)]
                                                                "
                                                            />
                                                        </div>

                                                        <p className="text-sm sm:text-base font-bold text-slate-900">
                                                            Room{" "}
                                                            {room?.roomNumber || "-"}
                                                        </p>
                                                    </div>

                                                    <p className="text-xs sm:text-sm text-slate-700 mt-2">
                                                        {room?.roomType || "-"}{" "}
                                                        <span className="text-slate-400">
                                                            •
                                                        </span>{" "}
                                                        {room?.bedType || "-"}
                                                    </p>

                                                    <p className="text-xs text-slate-600 mt-1.5">
                                                        {checkIn || "-"}{" "}
                                                        <span className="text-slate-400">
                                                            →
                                                        </span>{" "}
                                                        {checkOut || "-"}
                                                    </p>

                                                    <p className="text-xs text-slate-700 mt-1.5">
                                                        ₹{formatMoney(roomPrice)} ×{" "}
                                                        {nights}{" "}
                                                        {nights === 1
                                                            ? "night"
                                                            : "nights"}
                                                    </p>
                                                </div>

                                                <div
                                                    className="
                                                        min-[420px]:text-right
                                                        border-t min-[420px]:border-t-0
                                                        pt-2 min-[420px]:pt-0
                                                        shrink-0
                                                    "
                                                >
                                                    <p className="text-[10px] uppercase tracking-wide font-bold text-slate-600">
                                                        Room Total
                                                    </p>

                                                    <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                                                        ₹{formatMoney(roomAmount)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div
                                    className="
                                        py-5 text-center rounded-xl
                                        bg-slate-50 border border-dashed border-slate-300
                                    "
                                >
                                    <p className="text-sm font-semibold text-slate-700">
                                        No room details available.
                                    </p>

                                    <p className="text-xs text-slate-600 mt-1">
                                        Please check the booking details.
                                    </p>
                                </div>
                            )}

                            {/* TOTAL */}
                            <div
                                className="
                                    flex items-center justify-between gap-3
                                    pt-4 mt-1 border-t border-slate-200
                                "
                            >
                                <div>
                                    <p className="text-sm font-bold text-slate-900">
                                        Booking Total
                                    </p>

                                    <p className="text-xs text-slate-600 mt-0.5">
                                        Total room charges
                                    </p>
                                </div>

                                <p className="text-lg sm:text-xl font-bold text-slate-900 whitespace-nowrap">
                                    ₹{formatMoney(roomTotal)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* PAYMENT AMOUNT */}
                    <div>
                        <label
                            htmlFor="initialPaymentAmount"
                            className="
                                block text-sm font-bold text-slate-900 mb-2
                            "
                        >
                            Initial Payment Amount
                            <span className="text-red-600 ml-1">*</span>
                        </label>

                        <div className="relative">
                            <IndianRupee
                                className="
                                    absolute left-3 top-1/2 -translate-y-1/2
                                    w-4 h-4 text-slate-600
                                    pointer-events-none
                                "
                            />

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
                                className={`
                                    w-full pl-9 pr-4 py-3
                                    rounded-xl border
                                    text-sm sm:text-base font-semibold
                                    text-slate-900
                                    placeholder:text-slate-500
                                    outline-none transition-all
                                    ${
                                        amountError
                                            ? `
                                                border-red-500 bg-red-50
                                                focus:border-red-600
                                                focus:ring-2 focus:ring-red-100
                                            `
                                            : `
                                                border-slate-300 bg-white
                                                focus:border-[var(--teal,#08838d)]
                                                focus:ring-2 focus:ring-teal-100
                                            `
                                    }
                                    disabled:bg-slate-100
                                    disabled:text-slate-500
                                `}
                            />
                        </div>

                        {amountError ? (
                            <p className="flex items-start gap-1.5 text-xs sm:text-sm font-semibold text-red-700 mt-2 leading-5">
                                <span>•</span>
                                <span>{amountError}</span>
                            </p>
                        ) : (
                            <p className="text-xs text-slate-600 mt-2">
                                Maximum payment: ₹{formatMoney(roomTotal)}
                            </p>
                        )}
                    </div>

                    {/* PAYMENT METHOD */}
                    <div>
                        <p className="text-sm font-bold text-slate-900 mb-2.5">
                            Payment Method
                            <span className="text-red-600 ml-1">*</span>
                        </p>

                        <div
                            className="
                                grid grid-cols-2 sm:grid-cols-4 gap-2.5
                            "
                        >
                            {paymentMethods.map((method) => {
                                const Icon = method.icon;
                                const selected =
                                    paymentMethod === method.key;

                                return (
                                    <button
                                        key={method.key}
                                        type="button"
                                        disabled={loading}
                                        onClick={() =>
                                            setPaymentMethod(method.key)
                                        }
                                        className={`
                                            min-h-[76px] cursor-pointer
                                            flex flex-col items-center justify-center
                                            gap-2 rounded-xl border
                                            transition-all active:scale-[0.98]
                                            disabled:opacity-50
                                            disabled:cursor-not-allowed
                                            ${
                                                selected
                                                    ? `
                                                        border-[var(--teal-dark,#065b62)]
                                                        bg-teal-50
                                                        text-[var(--teal-dark,#065b62)]
                                                        ring-2 ring-teal-100
                                                    `
                                                    : `
                                                        border-slate-300
                                                        bg-white text-slate-700
                                                        hover:bg-slate-50
                                                        hover:border-slate-400
                                                    `
                                            }
                                        `}
                                    >
                                        <Icon className="w-5 h-5" />

                                        <span className="text-xs font-bold">
                                            {method.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* PAYMENT SUMMARY */}
                    {paymentAmount > 0 &&
                        paymentAmount <= roomTotal && (
                            <div
                                className="
                                    rounded-2xl bg-teal-50
                                    border border-teal-200 p-4 sm:p-5
                                "
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs sm:text-sm font-semibold text-slate-700">
                                        Advance Received
                                    </span>

                                    <span className="text-sm sm:text-base font-bold text-[var(--teal-dark,#065b62)]">
                                        ₹{formatMoney(paymentAmount)}
                                    </span>
                                </div>

                                <div
                                    className="
                                        flex items-center justify-between gap-3
                                        mt-3 pt-3 border-t border-teal-200
                                    "
                                >
                                    <span className="text-xs sm:text-sm font-semibold text-slate-700">
                                        Balance at Checkout
                                    </span>

                                    <span className="text-base sm:text-lg font-bold text-slate-900">
                                        ₹{formatMoney(remainingAmount)}
                                    </span>
                                </div>
                            </div>
                        )}
                </div>

                {/* FOOTER */}
                <div
                    className="
                        shrink-0 border-t border-slate-200
                        bg-white p-4 sm:px-5 lg:px-6
                    "
                >
                    <div
                        className="
                            flex flex-col-reverse sm:flex-row
                            gap-2.5 sm:justify-end
                        "
                    >
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={loading}
                            className="
                                w-full sm:w-auto min-h-[44px]
                                px-5 py-2.5 rounded-xl cursor-pointer
                                border border-slate-300 bg-white
                                text-sm font-bold text-slate-800
                                hover:bg-slate-100 transition
                                disabled:opacity-50
                                disabled:cursor-not-allowed
                            "
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
                            className="
                                w-full sm:w-auto min-h-[44px]
                                inline-flex items-center justify-center gap-2
                                px-5 py-2.5 rounded-xl
                                bg-[var(--teal-dark,#065b62)]
                                text-white text-sm font-bold shadow-sm
                                hover:bg-[var(--teal-dark,#054f55)]
                                transition 
                                cursor-pointer
                                disabled:bg-slate-300
                                disabled:text-slate-600
                                disabled:cursor-not-allowed
                                disabled:shadow-none
                            "
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 cursor-pointer h-4" />
                                    <span className="cursor-pointer">Confirm Payment</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
