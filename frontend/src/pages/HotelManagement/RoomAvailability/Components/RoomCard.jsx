import React, { useState } from "react";
import { BedDouble, CheckCircle2, Users, Pencil, Trash2, Tag, ChevronDown, Loader2 } from "lucide-react";

export default function RoomCard({ room, onEdit, onDelete, onStatusChange, index = 0 }) {
  const status = String(room?.status || "").toLowerCase();
  const isAvailable = status === "available";
  const isOccupied = status === "occupied" || status === "booked";

  const roomNumber = room?.roomNumber || "N/A";
  const roomType = room?.roomType || "Not specified";
  const bedType = room?.bedType || "Not specified";
  const price = Number(room?.pricePerNight || 0);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleSelectStatus = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === status) return;

    try {
      setUpdatingStatus(true);
      if (onStatusChange) {
        await onStatusChange(room._id || room.id, newStatus);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 14) * 45}ms` }}
      className={`rc-in group w-full min-w-0 bg-white rounded-3xl p-4 sm:p-5 shadow-[0_10px_30px_rgba(6,20,52,0.1)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_22px_45px_rgba(6,20,52,0.2)] relative overflow-hidden`}
    >
      {/* Top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${isAvailable ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-red-400 to-rose-600"}`} />

      {/* HEADER */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${isAvailable ? "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/25" : "bg-gradient-to-br from-red-400 to-rose-600 text-white shadow-md shadow-red-500/25"}`}>
            <BedDouble className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8fa2ba] font-bold tracking-[0.12em] leading-none uppercase">ROOM</span>
            <span className="text-lg sm:text-xl font-extrabold text-[#0e2a4a] whitespace-nowrap leading-tight mt-0.5">{roomNumber}</span>
          </div>
        </div>

        {/* STATUS SELECT DROPDOWN (Allows manually toggling Occupied to Available) */}
        <div className="relative shrink-0">
          {updatingStatus ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-black border border-slate-200">
              <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
              Updating...
            </span>
          ) : (
            <div className="relative inline-flex items-center">
              <select
                value={status}
                onChange={handleSelectStatus}
                title="Change room status manually"
                className={`appearance-none cursor-pointer pl-2.5 pr-6 py-1 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide border transition-all outline-none focus:ring-2 focus:ring-offset-1 ${
                  isAvailable
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100/70 focus:ring-emerald-400"
                    : "bg-red-50 text-red-600 border-red-300 hover:bg-red-100/70 focus:ring-red-400"
                }`}
              >
                <option value="available" className="bg-white text-emerald-700 font-semibold py-1">
                  ● Available
                </option>
                <option value="occupied" className="bg-white text-red-600 font-semibold py-1">
                  ● Occupied
                </option>
              </select>
              <ChevronDown className={`w-3 h-3 absolute right-1.5 pointer-events-none ${isAvailable ? "text-emerald-700" : "text-red-600"}`} />
            </div>
          )}
        </div>
      </div>

      {/* DETAILS */}
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-[#6b7f99] shrink-0">Room Type</span>
          <span className="font-semibold text-[#0e2a4a] text-right truncate">{roomType}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-[#6b7f99] shrink-0">Bed</span>
          <span className="font-semibold text-[#0e2a4a] text-right truncate">{bedType}</span>
        </div>

        <div className={`flex items-center justify-between gap-3 rounded-2xl px-3.5 py-3 mt-1 ${isAvailable ? "bg-[#f0fbf6]" : "bg-[#f4f8fd]"}`}>
          <div className="flex items-center gap-2 min-w-0 text-[#6b7f99]">
            <Tag size={14} />
            <span className="text-sm">Per Night</span>
          </div>
          <span className="font-extrabold text-[#0e2a4a] text-sm sm:text-base whitespace-nowrap">₹{price.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="mt-4 pt-4 border-t border-[#eef3fa]">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onEdit?.(room)}
            disabled={isOccupied}
            title={isOccupied ? "Occupied/Booked room cannot be edited (change status to Available first)" : "Edit room"}
            className="min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white text-xs sm:text-sm font-bold hover:brightness-110 active:scale-[0.97] transition-all shadow-sm shadow-blue-500/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
          >
            <Pencil className="w-4 h-4 shrink-0" />
            <span className="truncate">Edit</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete?.(room)}
            disabled={isOccupied}
            title={isOccupied ? "Occupied room cannot be deleted (change status to Available first)" : "Delete room"}
            className="min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs sm:text-sm font-bold hover:bg-red-600 hover:text-white hover:border-red-600 active:scale-[0.97] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-50 disabled:hover:text-red-600"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Delete</span>
          </button>
        </div>
      </div>

      {/* STATUS MESSAGE */}
      <div className={`mt-3.5 pt-3 border-t ${isAvailable ? "border-emerald-100" : "border-red-100"}`}>
        <div className="flex items-start gap-2">
          {isAvailable ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <Users className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          )}
          <span className={`text-[11px] sm:text-xs font-semibold leading-5 ${isAvailable ? "text-emerald-700" : "text-red-600"}`}>
            {isAvailable ? "Room available for booking" : isOccupied ? "Room currently occupied (Click badge above to free room)" : "Room is not available"}
          </span>
        </div>
      </div>
    </div>
  );
}