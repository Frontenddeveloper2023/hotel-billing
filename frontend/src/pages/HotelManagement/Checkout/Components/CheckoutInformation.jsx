import React from "react";
import {
    CalendarDays,
    Clock3,
} from "lucide-react";


function SectionHeader({
    icon,
    title,
    subtitle,
}) {
    return (
        <div className="px-5 py-4 border-b border-slate-100">

            <div className="flex items-center gap-3">

                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">

                    {React.cloneElement(icon, {
                        className: "w-4 h-4 text-slate-600",
                    })}

                </div>

                <div>

                    <h2 className="text-sm font-bold text-slate-900">
                        {title}
                    </h2>

                    <p className="text-xs text-slate-400 mt-0.5">
                        {subtitle}
                    </p>

                </div>

            </div>

        </div>
    );
}


export default function CheckoutInformation({
    checkoutDate,
    checkoutTime,
    setCheckoutTime,
    formatDate,
}) {
    return (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

            <SectionHeader
                icon={<CalendarDays />}
                title="Checkout Information"
                subtitle="Record the actual guest departure"
            />


            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* DATE */}

                <div>

                    <label className="block text-xs font-bold text-slate-700 mb-2">
                        Checkout Date
                    </label>

                    <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-slate-200 bg-slate-50">

                        <CalendarDays className="w-4 h-4 text-slate-400" />

                        <span className="text-sm font-semibold text-slate-800">
                            {formatDate(checkoutDate)}
                        </span>

                    </div>

                    <p className="text-[10px] text-slate-400 mt-1.5">
                        Automatically set to today.
                    </p>

                </div>


                {/* TIME */}

                <div>

                    <label className="block text-xs font-bold text-slate-700 mb-2">
                        Checkout Time
                    </label>

                    <div className="relative">

                        <Clock3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />

                        <input
                            type="time"
                            value={checkoutTime}
                            onChange={(e) =>
                                setCheckoutTime(
                                    e.target.value
                                )
                            }
                            className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 outline-none focus:border-[var(--teal,#08838d)] focus:ring-2 focus:ring-teal-50"
                        />

                    </div>

                    <p className="text-[10px] text-slate-400 mt-1.5">
                        Enter the actual checkout time.
                    </p>

                </div>

            </div>

        </section>
    );
}