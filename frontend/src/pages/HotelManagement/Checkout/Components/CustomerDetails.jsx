import React from "react";
import {
    UserRound,
    Phone,
    Mail,
    FileText,
    MapPin,
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

                <div className="min-w-0">

                    <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">
                        {label}
                    </p>

                    <p className="text-sm font-semibold text-slate-800 mt-1 break-words">
                        {value || "Not provided"}
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

                    {subtitle && (
                        <p className="text-xs text-slate-400 mt-0.5">
                            {subtitle}
                        </p>
                    )}

                </div>

            </div>

        </div>
    );
}


export default function CustomerDetails({
    customerName,
    phone,
    alternativePhone,
    email,
    idProofType,
    idProofNumber,
    address,
}) {
    return (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

            <SectionHeader
                icon={<UserRound />}
                title="Customer Details"
                subtitle="Guest information"
            />

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">

                <DetailItem
                    label="Customer Name"
                    value={customerName}
                    icon={<UserRound />}
                />

                <DetailItem
                    label="Phone Number"
                    value={phone}
                    icon={<Phone />}
                />

                <DetailItem
                    label="Alternative Phone"
                    value={alternativePhone}
                    icon={<Phone />}
                />

                <DetailItem
                    label="Email"
                    value={email}
                    icon={<Mail />}
                />

                <DetailItem
                    label="ID Proof"
                    value={idProofType}
                    icon={<FileText />}
                />

                <DetailItem
                    label="ID Number"
                    value={idProofNumber}
                    icon={<FileText />}
                />

                <div className="sm:col-span-2">

                    <DetailItem
                        label="Address"
                        value={address}
                        icon={<MapPin />}
                    />

                </div>

            </div>

        </section>
    );
}