import React from "react";
import {
    BedDouble,
    CheckCircle2,
    Users,
    Edit,
    Trash2,
    CircleDollarSign,
} from "lucide-react";

export default function RoomCard({
    room,
    onEdit,
    onDelete,
}) {
    const status = String(room?.status || "").toLowerCase();

    const isAvailable = status === "available";
    const isOccupied = status === "occupied";

    const roomNumber = room?.roomNumber || "N/A";
    const roomType = room?.roomType || "Not specified";
    const bedType = room?.bedType || "Not specified";

    const price = Number(room?.pricePerNight || 0);

    return (
        <div
            className={`
                group
                w-full
                min-w-0
                bg-white
                border
                rounded-2xl
                p-4
                sm:p-5
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:shadow-md
                ${
                    isAvailable
                        ? "border-green-200 hover:border-green-300"
                        : "border-red-200 hover:border-red-300"
                }
            `}
        >
            {/* ================= HEADER ================= */}
            <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Room Icon */}
                    <div
                        className={`
                            shrink-0
                            w-11
                            h-11
                            sm:w-12
                            sm:h-12
                            rounded-xl
                            flex
                            items-center
                            justify-center
                            ${
                                isAvailable
                                    ? "bg-green-50"
                                    : "bg-red-50"
                            }
                        `}
                    >
                        <BedDouble
                            className={`
                                w-5
                                h-5
                                sm:w-6
                                sm:h-6
                                ${
                                    isAvailable
                                        ? "text-green-600"
                                        : "text-red-500"
                                }
                            `}
                        />
                    </div>

                    {/* Room Number */}
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs text-slate-400 font-bold tracking-wide">
                            ROOM
                        </p>

                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                            {roomNumber}
                        </h2>
                    </div>
                </div>

                {/* Status Badge */}
                <span
                    className={`
                        shrink-0
                        inline-flex
                        items-center
                        px-2.5
                        py-1.5
                        rounded-full
                        text-[9px]
                        sm:text-[10px]
                        font-bold
                        uppercase
                        tracking-wide
                        ${
                            isAvailable
                                ? "bg-green-50 text-green-700 border border-green-100"
                                : "bg-red-50 text-red-600 border border-red-100"
                        }
                    `}
                >
                    {room?.status || "Unknown"}
                </span>
            </div>

            {/* ================= DETAILS ================= */}
            <div className="mt-5 space-y-3">
                {/* Room Type */}
                <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500 shrink-0">
                        Room Type
                    </span>

                    <span className="font-semibold text-slate-800 text-right truncate">
                        {roomType}
                    </span>
                </div>

                {/* Bed Type */}
                <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-slate-500 shrink-0">
                        Bed
                    </span>

                    <span className="font-semibold text-slate-800 text-right truncate">
                        {bedType}
                    </span>
                </div>

                {/* Price */}
                <div
                    className={`
                        flex
                        items-center
                        justify-between
                        gap-3
                        rounded-xl
                        px-3
                        py-2.5
                        ${
                            isAvailable
                                ? "bg-green-50/70"
                                : "bg-slate-50"
                        }
                    `}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        

                        <span className="text-sm text-slate-500">
                            Per Night
                        </span>
                    </div>

                    <span className="font-bold text-slate-900 text-sm sm:text-base whitespace-nowrap">
                        ₹{price.toLocaleString("en-IN")}
                    </span>
                </div>
            </div>

            {/* ================= ACTIONS ================= */}
            <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2.5">
                    {/* Edit */}
                    <button
                        type="button"
                        onClick={() => onEdit?.(room)}
                        className="
                            min-w-0
                            inline-flex
                            items-center
                            justify-center
                            gap-1.5
                            sm:gap-2
                            px-3
                            py-2.5
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            text-slate-700
                            text-xs
                            sm:text-sm
                            font-bold
                            hover:bg-slate-50
                            hover:border-slate-300
                            active:scale-[0.98]
                            transition-all
                            focus:outline-none
                            focus:ring-2
                            focus:ring-slate-200
                        "
                    >
                        <Edit className="w-4 h-4 shrink-0" />

                        <span className="truncate">
                            Edit
                        </span>
                    </button>

                    {/* Delete */}
                    <button
                        type="button"
                        onClick={() => onDelete?.(room)}
                        disabled={isOccupied}
                        title={
                            isOccupied
                                ? "Occupied room cannot be deleted"
                                : "Delete room"
                        }
                        className="
                            min-w-0
                            inline-flex
                            items-center
                            justify-center
                            gap-1.5
                            sm:gap-2
                            px-3
                            py-2.5
                            rounded-xl
                            border
                            border-red-200
                            bg-red-50
                            text-red-600
                            text-xs
                            sm:text-sm
                            font-bold
                            hover:bg-red-100
                            hover:border-red-300
                            active:scale-[0.98]
                            transition-all
                            disabled:opacity-40
                            disabled:cursor-not-allowed
                            disabled:hover:bg-red-50
                            disabled:hover:border-red-200
                            focus:outline-none
                            focus:ring-2
                            focus:ring-red-200
                        "
                    >
                        <Trash2 className="w-4 h-4 shrink-0" />

                        <span className="truncate">
                            Delete
                        </span>
                    </button>
                </div>
            </div>

            {/* ================= STATUS MESSAGE ================= */}
            <div
                className={`
                    mt-4
                    pt-3
                    border-t
                    ${
                        isAvailable
                            ? "border-green-100"
                            : "border-red-100"
                    }
                `}
            >
                <div className="flex items-start gap-2">
                    {isAvailable ? (
                        <CheckCircle2
                            className="
                                w-4
                                h-4
                                text-green-600
                                shrink-0
                                mt-0.5
                            "
                        />
                    ) : (
                        <Users
                            className="
                                w-4
                                h-4
                                text-red-500
                                shrink-0
                                mt-0.5
                            "
                        />
                    )}

                    <span
                        className={`
                            text-[11px]
                            sm:text-xs
                            font-semibold
                            leading-5
                            ${
                                isAvailable
                                    ? "text-green-700"
                                    : "text-red-600"
                            }
                        `}
                    >
                        {isAvailable
                            ? "Room available for booking"
                            : isOccupied
                                ? "Room currently occupied"
                                : "Room is not available"}
                    </span>
                </div>
            </div>
        </div>
    );
}