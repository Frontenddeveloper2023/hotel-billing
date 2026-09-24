import React from "react";
import { ReceiptText } from "lucide-react";

import FoodCharges from "./FoodCharges";
import ServiceCharges from "./ServiceCharges";

export default function AdditionalCharges({
    foodOrders,
    services,
    additionalCharges,
    money,
    formatDate,
}) {
    return (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

            {/* HEADER */}

            <div className="px-5 py-4 border-b border-slate-100">

                <div className="flex items-center gap-3">

                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">

                        <ReceiptText className="w-4 h-4 text-slate-600" />

                    </div>

                    <div>

                        <h2 className="text-sm font-bold text-slate-900">
                            Additional Charges
                        </h2>

                        <p className="text-xs text-slate-400 mt-0.5">
                            Food and hotel service charges
                        </p>

                    </div>

                </div>

            </div>


            <div className="p-5 space-y-6">

                <FoodCharges
                    foodOrders={foodOrders}
                    money={money}
                    formatDate={formatDate}
                />


                <div className="border-t border-slate-100" />


                <ServiceCharges
                    services={services}
                    money={money}
                    formatDate={formatDate}
                />


                {/* TOTAL */}

                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">

                    <div>

                        <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
                            Total Additional Charges
                        </p>

                        <p className="text-xs text-slate-500 mt-0.5">
                            Food + Services
                        </p>

                    </div>


                    <p className="text-base font-bold text-slate-900">
                        ₹{money(additionalCharges)}
                    </p>

                </div>

            </div>

        </section>
    );
}