import React, { useEffect, useState } from "react";
import {
    IndianRupee,
    RefreshCw,
    Save,
    X,
    Pencil,
    Hash,
    Layers,
    Gauge,
    BedDouble,
    AlertCircle,
    Lock
} from "lucide-react";

const styles = `
@keyframes er-fade{from{opacity:0}to{opacity:1}}
@keyframes er-pop{from{opacity:0;transform:translateY(22px) scale(.96)}to{opacity:1;transform:none}}
.er-fade{animation:er-fade .2s ease-out}
.er-pop{animation:er-pop .3s cubic-bezier(.2,.8,.2,1)}
@media (prefers-reduced-motion:reduce){.er-fade,.er-pop{animation:none}}
`;

const getFieldCls = (hasError) =>
    `w-full px-3.5 py-2.5 border rounded-xl text-sm text-[#0e2a4a] outline-none transition disabled:opacity-60 disabled:cursor-not-allowed ${
        hasError
            ? "border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            : "border-[#dbe6f5] bg-[#f6f9fe] focus:bg-white focus:border-[#3b82f0] focus:ring-2 focus:ring-[#3b82f0]/20"
    }`;

export default function EditRoom({ room, onClose, onSuccess, updateRoom, rooms = [] }) {
    const [updatingRoom, setUpdatingRoom] = useState(false);
    const [formError, setFormError] = useState("");
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        roomNumber: "",
        roomType: "",
        bedType: "",
        pricePerNight: "",
        status: "available",
    });

    const isOccupied =
        String(room?.status || "").toLowerCase() === "occupied" ||
        String(room?.status || "").toLowerCase() === "booked";

    useEffect(() => {
        if (!room) {
            return;
        }

        setForm({
            roomNumber: room.roomNumber || "",
            roomType: room.roomType || "",
            bedType: room.bedType || "",
            pricePerNight: room.pricePerNight !== undefined && room.pricePerNight !== null ? String(room.pricePerNight) : "",
            status: room.status || "available",
        });

        setFormError("");
        setErrors({});
    }, [room]);

    if (!room) {
        return null;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        
        // Clear specific field error
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
        setFormError("");
    };

    const validateForm = () => {
        const newErrors = {};
        const roomNumber = form.roomNumber.trim();
        const roomType = form.roomType.trim();
        const bedType = form.bedType.trim();
        const pricePerNight = Number(form.pricePerNight);

        if (!roomNumber) {
            newErrors.roomNumber = "Room number is required.";
        } else if (roomNumber.length > 20) {
            newErrors.roomNumber = "Room number cannot exceed 20 characters.";
        } else {
            const duplicateRoom = rooms.some(
                (item) =>
                    (item._id || item.id) !== (room._id || room.id) &&
                    String(item.roomNumber || "").trim().toLowerCase() === roomNumber.toLowerCase()
            );
            if (duplicateRoom) {
                newErrors.roomNumber = `Room ${roomNumber} already exists in your branch.`;
            }
        }

        if (!roomType) {
            newErrors.roomType = "Please select a room type (AC or Non-AC).";
        }

        if (!bedType) {
            newErrors.bedType = "Please select a bed type.";
        }

        if (!form.pricePerNight || form.pricePerNight.trim() === "") {
            newErrors.pricePerNight = "Price per night is required.";
        } else if (!Number.isFinite(pricePerNight) || pricePerNight <= 0) {
            newErrors.pricePerNight = "Price must be a valid number greater than ₹0.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (updatingRoom) {
            return;
        }

        if (isOccupied) {
            setFormError("This room is currently occupied/booked by a guest and cannot be edited.");
            return;
        }

        setFormError("");

        if (!validateForm()) {
            return;
        }

        const roomNumber = form.roomNumber.trim();
        const roomType = form.roomType.trim();
        const bedType = form.bedType.trim();
        const pricePerNight = Number(form.pricePerNight);

        try {
            setUpdatingRoom(true);

            await updateRoom(room._id || room.id, {
                roomNumber,
                roomType,
                bedType,
                price: pricePerNight,
                pricePerNight: pricePerNight,
                status: form.status,
            });

            onClose();
            if (typeof onSuccess === "function") {
                await onSuccess();
            }
        } catch (err) {
            console.error("Failed to update room:", err);
            setFormError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to update room. Please check your network and try again."
            );
        } finally {
            setUpdatingRoom(false);
        }
    };

    return (
        <div className="er-fade fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0b1d3d]/60 backdrop-blur-sm px-0 sm:px-4">
            <style>{styles}</style>
            <div className="er-pop w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-[0_24px_70px_rgba(6,20,52,0.45)] overflow-hidden max-h-[94vh] flex flex-col">

                {/* MODAL HEADER */}
                <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Pencil size={19} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold">Edit Room {room.roomNumber ? `(${room.roomNumber})` : ""}</h2>
                            <p className="text-xs text-blue-100 mt-0.5">
                                {isOccupied ? "Room is occupied — modifications locked" : "Update room information and pricing."}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={updatingRoom}
                        aria-label="Close"
                        className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center disabled:opacity-50 shrink-0 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* MODAL BODY */}
                <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4">
                    {/* OCCUPIED WARNING BANNER */}
                    {isOccupied && (
                        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-3">
                            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs leading-relaxed">
                                <p className="font-bold text-sm text-amber-800">Room Currently Occupied / Booked</p>
                                <p className="mt-0.5 text-amber-700">
                                    This room has an active guest stay. To preserve billing and stay records, room details cannot be edited until checkout is completed.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TOP GENERAL ERROR BANNER */}
                    {formError && (
                        <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 flex items-start gap-2.5 text-xs font-semibold">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span>{formError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* ROOM NUMBER */}
                        <div className="sm:col-span-2">
                            <label className="flex items-center gap-1.5 text-xs font-bold text-[#3d5473] mb-1.5">
                                <Hash size={13} className="text-[#5b9bf5]" /> Room Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="roomNumber"
                                placeholder="e.g. 101, A-202"
                                value={form.roomNumber}
                                onChange={handleChange}
                                disabled={updatingRoom || isOccupied}
                                className={getFieldCls(Boolean(errors.roomNumber))}
                            />
                            {errors.roomNumber && (
                                <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
                                    <AlertCircle size={12} /> {errors.roomNumber}
                                </p>
                            )}
                        </div>

                        {/* ROOM TYPE */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-[#3d5473] mb-1.5">
                                <Layers size={13} className="text-[#5b9bf5]" /> Room Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="roomType"
                                value={form.roomType}
                                onChange={handleChange}
                                disabled={updatingRoom || isOccupied}
                                className={`${getFieldCls(Boolean(errors.roomType))} bg-white`}
                            >
                                <option value="">Select Type</option>
                                <option value="AC">AC</option>
                                <option value="Non-AC">Non-AC</option>
                            </select>
                            {errors.roomType && (
                                <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
                                    <AlertCircle size={12} /> {errors.roomType}
                                </p>
                            )}
                        </div>

                        {/* BED TYPE */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-[#3d5473] mb-1.5">
                                <BedDouble size={13} className="text-[#5b9bf5]" /> Bed Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="bedType"
                                value={form.bedType}
                                onChange={handleChange}
                                disabled={updatingRoom || isOccupied}
                                className={`${getFieldCls(Boolean(errors.bedType))} bg-white`}
                            >
                                <option value="">Select Bed Type</option>
                                <option value="Single Bed">Single Bed</option>
                                <option value="2 Bed">2 Bed</option>
                                <option value="3 Bed">3 Bed</option>
                            </select>
                            {errors.bedType && (
                                <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
                                    <AlertCircle size={12} /> {errors.bedType}
                                </p>
                            )}
                        </div>

                        {/* PRICE PER NIGHT */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-[#3d5473] mb-1.5">
                                <IndianRupee size={13} className="text-[#5b9bf5]" /> Price Per Night <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa2ba]" />
                                <input
                                    type="number"
                                    min="1"
                                    step="any"
                                    placeholder="e.g. 1500"
                                    name="pricePerNight"
                                    value={form.pricePerNight}
                                    onChange={handleChange}
                                    disabled={updatingRoom || isOccupied}
                                    className={`${getFieldCls(Boolean(errors.pricePerNight))} pl-9`}
                                />
                            </div>
                            {errors.pricePerNight && (
                                <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
                                    <AlertCircle size={12} /> {errors.pricePerNight}
                                </p>
                            )}
                        </div>

                        {/* ROOM STATUS */}
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-[#3d5473] mb-1.5">
                                <Gauge size={13} className="text-[#5b9bf5]" /> Room Status
                            </label>
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                                disabled={updatingRoom || isOccupied}
                                className={`${getFieldCls(false)} bg-white`}
                            >
                                <option value="available">Available</option>
                                <option value="occupied">Occupied</option>
                            </select>
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={updatingRoom}
                            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={updatingRoom || isOccupied}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] hover:brightness-110 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/25 transition"
                        >
                            {updatingRoom ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" /> Updating...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" /> Update Room
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}