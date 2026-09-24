import React from "react";
import {
    CreditCard,
    CheckCircle2,
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


export default function InitialPayment({
    initialPayment,
    money,
}) {
    return (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

            <SectionHeader
                icon={<CreditCard />}
                title="Payment Already Received"
                subtitle="Initial payment collected during check-in"
            />


            <div className="p-5">

                <div className="flex items-center justify-between gap-4 px-4 py-4 rounded-xl bg-emerald-50 border border-emerald-100">

                    <div className="flex items-center gap-3">

                        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">

                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />

                        </div>

                        <div>

                            <p className="text-xs font-bold text-emerald-700">
                                Initial Payment
                            </p>

                            <p className="text-[10px] text-slate-500 mt-1">
                                Already paid by customer
                            </p>

                        </div>

                    </div>


                    <p className="text-xl font-bold text-emerald-700">
                        ₹{money(initialPayment)}
                    </p>

                </div>

            </div>

        </section>
    );
}