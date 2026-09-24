import React from "react";
import { Wrench } from "lucide-react";

export default function ServiceCharges({
    services = [],
    money,
    formatDate,
}) {
    return (
        <div>

            <div className="flex items-center justify-between gap-3 mb-4">

                <div className="flex items-center gap-3">

                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Wrench className="w-4 h-4 text-blue-600" />
                    </div>

                    <div>

                        <h3 className="text-sm font-bold text-slate-800">
                            Service Charges
                        </h3>

                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Additional hotel services
                        </p>

                    </div>

                </div>


                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold">
                    {services.length} Services
                </span>

            </div>


            {services.length > 0 ? (

                <div className="space-y-3">

                    {services.map((service, index) => {

                        const amount = Number(
                            service.amount ||
                            service.fee ||
                            service.price ||
                            service.serviceFee ||
                            0
                        );

                        return (
                            <div
                                key={
                                    service.id ||
                                    service._id ||
                                    index
                                }
                                className="rounded-xl border border-slate-200"
                            >

                                <div className="p-4">

                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                                        <div className="flex items-start gap-3">

                                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                <Wrench className="w-4 h-4 text-blue-600" />
                                            </div>

                                            <div>

                                                <h4 className="text-sm font-bold text-slate-900">
                                                    {service.name ||
                                                    service.serviceName ||
                                                    service.title ||
                                                    "Hotel Service"}
                                                </h4>

                                                <p className="text-xs text-slate-500 mt-1">
                                                    {service.description ||
                                                    service.detail ||
                                                    service.details ||
                                                    "Additional hotel service"}
                                                </p>

                                            </div>

                                        </div>


                                        <div className="sm:text-right">

                                            <p className="text-base font-bold text-slate-900">
                                                ₹{money(amount)}
                                            </p>

                                            <p className="text-[10px] text-slate-400">
                                                Service Fee
                                            </p>

                                        </div>

                                    </div>


                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">

                                        <div className="rounded-lg bg-slate-50 px-3 py-2">

                                            <p className="text-[9px] uppercase font-bold text-slate-400">
                                                Service Date
                                            </p>

                                            <p className="text-xs font-bold text-slate-700 mt-1">
                                                {formatDate(
                                                    service.serviceDate ||
                                                    service.date
                                                )}
                                            </p>

                                        </div>


                                        <div className="rounded-lg bg-slate-50 px-3 py-2">

                                            <p className="text-[9px] uppercase font-bold text-slate-400">
                                                Service Time
                                            </p>

                                            <p className="text-xs font-bold text-slate-700 mt-1">
                                                {service.serviceTime ||
                                                service.time ||
                                                "Not provided"}
                                            </p>

                                        </div>

                                    </div>

                                </div>

                            </div>
                        );
                    })}

                </div>

            ) : (

                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">

                    <Wrench className="w-6 h-6 mx-auto text-slate-300" />

                    <p className="text-xs font-semibold text-slate-500 mt-2">
                        No service charges
                    </p>

                    <p className="text-[10px] text-slate-400 mt-1">
                        No additional services were added.
                    </p>

                </div>

            )}

        </div>
    );
}