import React from "react";
import {
    BedDouble,
    UserRound,
    CalendarDays,
    Clock3,
} from "lucide-react";


function DetailItem({
    label,
    value,
    icon,
}) {
    return (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">

            <div className="flex items-start gap-2.5">

                <div className="mt-0.5 text-slate-400">

                    {React.cloneElement(icon, {
                        className: "w-3.5 h-3.5",
                    })}

                </div>

                <div>

                    <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
                        {label}
                    </p>

                    <p className="text-sm font-semibold text-slate-800 mt-1">
                        {value ?? "Not provided"}
                    </p>

                </div>

            </div>

        </div>
    );
}


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


export default function RoomStayDetails({
    roomNumber,
    roomType,
    bedType,
    adults,
    children,
    pricePerNight,
    nights,
    checkInDate,
    checkInTime,
    money,
}) {
    return (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

            <SectionHeader
                icon={<BedDouble />}
                title="Room & Stay Details"
                subtitle="Room and guest stay information"
            />

            <div className="p-5">

                {/* ROOM HEADER */}

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 rounded-xl bg-slate-50 border border-slate-100">

                    <div className="flex items-center gap-3">

                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center">

                            <BedDouble className="w-5 h-5 text-[var(--teal-dark,#065b62)]" />

                        </div>

                        <div>

                            <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
                                Room Number
                            </p>

                            <p className="text-xl font-bold text-slate-900 mt-0.5">
                                {roomNumber || "-"}
                            </p>

                        </div>

                    </div>


                    <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">
                        OCCUPIED
                    </span>

                </div>


                {/* ROOM INFORMATION */}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">

                    <DetailItem
                        label="Room Type"
                        value={roomType}
                        icon={<BedDouble />}
                    />

                    <DetailItem
                        label="Bed Type"
                        value={bedType}
                        icon={<BedDouble />}
                    />

                    <DetailItem
                        label="Adults"
                        value={adults}
                        icon={<UserRound />}
                    />

                    <DetailItem
                        label="Children"
                        value={children}
                        icon={<UserRound />}
                    />

                </div>


                {/* ROOM RATE */}

                <div className="flex items-center justify-between gap-4 mt-4 px-4 py-3 rounded-xl border border-slate-100 bg-white">

                    <div>

                        <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
                            Room Rate
                        </p>

                        <p className="text-xs text-slate-400 mt-0.5">
                            Per night
                        </p>

                    </div>

                    <p className="text-base font-bold text-slate-900">

                        ₹{money(pricePerNight)}

                        <span className="text-xs text-slate-400 font-medium ml-1">
                            / night
                        </span>

                    </p>

                </div>


                {/* CHECK-IN */}

                <div className="border-t border-slate-100 mt-5 pt-5">

                    <div className="flex items-center gap-2 mb-3">

                        <CalendarDays className="w-4 h-4 text-slate-500" />

                        <h3 className="text-sm font-bold text-slate-800">
                            Check-in Information
                        </h3>

                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">

                            <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
                                Check-in
                            </p>

                            <div className="flex items-center gap-2 mt-2">

                                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />

                                <p className="text-sm font-semibold text-slate-800">
                                    {checkInDate || "Not provided"}
                                </p>

                            </div>

                            <div className="flex items-center gap-2 mt-1.5">

                                <Clock3 className="w-3.5 h-3.5 text-slate-400" />

                                <p className="text-xs text-slate-500">
                                    {checkInTime || "Not provided"}
                                </p>

                            </div>

                        </div>


                        <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">

                            <p className="text-[10px] uppercase tracking-wide font-bold text-teal-600">
                                Total Stay
                            </p>

                            <div className="flex items-baseline gap-1 mt-1.5">

                                <p className="text-lg font-bold text-slate-900">
                                    {nights}
                                </p>

                                <span className="text-xs font-medium text-slate-500">
                                    Nights
                                </span>

                            </div>

                            <p className="text-xs text-slate-500 mt-1">
                                ₹{money(pricePerNight)} / night
                            </p>

                        </div>

                    </div>

                </div>

            </div>

        </section>
    );
}