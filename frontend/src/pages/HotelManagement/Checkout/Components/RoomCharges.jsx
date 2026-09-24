import React from "react";
import {
    BedDouble,
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


export default function RoomCharges({
    roomNumber,
    pricePerNight,
    nights,
    roomCharge,
    money,
}) {
    return (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

            <SectionHeader
                icon={<BedDouble />}
                title="Room Charges"
                subtitle="Room stay calculation"
            />


            <div className="p-5">

                <div className="rounded-xl border border-slate-100 overflow-hidden">

                    {/* HEADER */}

                    <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3 bg-slate-50 border-b border-slate-100">

                        <span className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
                            Description
                        </span>

                        <span className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
                            Amount
                        </span>

                    </div>


                    {/* ROOM */}

                    <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4">

                        <div>

                            <p className="text-sm font-bold text-slate-800">
                                Room {roomNumber || "-"}
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                                ₹{money(pricePerNight)} × {nights} nights
                            </p>

                        </div>


                        <p className="text-sm font-bold text-slate-900">
                            ₹{money(roomCharge)}
                        </p>

                    </div>

                </div>


                {/* TOTAL */}

                <div className="flex items-center justify-between mt-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">

                    <span className="text-xs font-bold text-slate-600">
                        Total Room Charges
                    </span>

                    <span className="text-sm font-bold text-slate-900">
                        ₹{money(roomCharge)}
                    </span>

                </div>

            </div>

        </section>
    );
}