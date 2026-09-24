import React from "react";
import {
    ReceiptText,
    IndianRupee,
    CreditCard,
    ArrowRight,
} from "lucide-react";


function AmountRow({
    label,
    amount,
    bold = false,
}) {
    return (
        <div className="flex items-center justify-between gap-4">

            <span
                className={
                    bold
                        ? "text-sm font-bold text-slate-800"
                        : "text-sm text-slate-500"
                }
            >
                {label}
            </span>

            <span
                className={
                    bold
                        ? "text-sm font-bold text-slate-900"
                        : "text-sm font-semibold text-slate-700"
                }
            >
                ₹{Number(amount || 0).toLocaleString("en-IN")}
            </span>

        </div>
    );
}


export default function BillSummary({
    roomCharge,
    foodTotal,
    serviceTotal,
    additionalCharges,
    subtotal,
    gstPercent,
    setGstPercent,
    gstAmount,
    grandTotal,
    initialPayment,
    remainingAmount,
    checkoutTime,
    handleProceedToPayment,
    money,
}) {
    return (
        <aside className="xl:sticky xl:top-5">

            <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

                {/* HEADER */}

                <div className="px-5 py-4 bg-[var(--teal-dark,#065b62)] text-white">

                    <div className="flex items-center gap-3">

                        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">

                            <ReceiptText className="w-4 h-4" />

                        </div>

                        <div>

                            <h2 className="text-sm font-bold">
                                Final Bill
                            </h2>

                            <p className="text-[10px] opacity-70 mt-0.5">
                                Checkout payment summary
                            </p>

                        </div>

                    </div>

                </div>


                {/* SUMMARY */}

                <div className="p-5 space-y-4">

                    <AmountRow
                        label="Room Charges"
                        amount={roomCharge}
                    />

                    <AmountRow
                        label="Food Charges"
                        amount={foodTotal}
                    />

                    <AmountRow
                        label="Service Charges"
                        amount={serviceTotal}
                    />


                    {/* ADDITIONAL */}

                    <div className="pt-4 border-t border-slate-100">

                        <AmountRow
                            label="Additional Charges"
                            amount={additionalCharges}
                            bold
                        />

                    </div>


                    {/* SUBTOTAL */}

                    <div className="pt-4 border-t border-slate-100">

                        <AmountRow
                            label="Subtotal"
                            amount={subtotal}
                            bold
                        />

                    </div>


                    {/* GST */}

                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">

                        <div className="flex items-center justify-between gap-3">

                            <div>

                                <p className="text-xs font-bold text-slate-700">
                                    GST
                                </p>

                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    Applied to subtotal
                                </p>

                            </div>


                            <div className="relative w-24">

                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={gstPercent}
                                    onChange={(e) =>
                                        setGstPercent(
                                            Number(e.target.value)
                                        )
                                    }
                                    className="w-full px-3 py-2 pr-7 rounded-lg border border-slate-200 bg-white text-sm font-bold text-right outline-none focus:border-[var(--teal,#08838d)]"
                                />

                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                                    %
                                </span>

                            </div>

                        </div>


                        <div className="flex items-center justify-between pt-3">

                            <span className="text-xs text-slate-500">
                                GST Amount
                            </span>

                            <span className="text-sm font-bold text-slate-800">
                                ₹{money(gstAmount)}
                            </span>

                        </div>

                    </div>


                    {/* GRAND TOTAL */}

                    <div className="pt-4 border-t border-slate-200">

                        <div className="flex items-end justify-between gap-4">

                            <div>

                                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
                                    Grand Total
                                </p>

                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    ₹{money(grandTotal)}
                                </p>

                            </div>


                            <span className="px-2.5 py-1 rounded-full bg-teal-50 text-[var(--teal-dark,#065b62)] text-[10px] font-bold">
                                FINAL
                            </span>

                        </div>

                    </div>


                    {/* INITIAL PAYMENT */}

                    <div className="flex items-center justify-between gap-3 px-3 py-3 rounded-lg bg-emerald-50 border border-emerald-100">

                        <span className="text-xs font-semibold text-emerald-700">
                            Initial Payment
                        </span>

                        <span className="text-sm font-bold text-emerald-700">
                            - ₹{money(initialPayment)}
                        </span>

                    </div>


                    {/* REMAINING */}

                    <div className="rounded-xl bg-slate-900 text-white p-4">

                        <div className="flex items-center justify-between gap-4">

                            <div>

                                <p className="text-[10px] uppercase tracking-wide font-bold text-white/50">
                                    Remaining Amount
                                </p>

                                <p className="text-2xl font-bold mt-1">
                                    ₹{money(remainingAmount)}
                                </p>

                            </div>


                            <IndianRupee className="w-5 h-5 text-white/40" />

                        </div>

                    </div>


                    {/* PROCEED */}

                    <button
                        type="button"
                        onClick={handleProceedToPayment}
                        disabled={!checkoutTime}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-[var(--teal-dark,#065b62)] text-white text-sm font-bold hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >

                        <CreditCard className="w-4 h-4" />

                        Proceed to Payment

                        <ArrowRight className="w-4 h-4" />

                    </button>


                    {!checkoutTime && (
                        <p className="text-[10px] text-center text-amber-600">
                            Enter checkout time to continue.
                        </p>
                    )}

                </div>

            </section>

        </aside>
    );
}