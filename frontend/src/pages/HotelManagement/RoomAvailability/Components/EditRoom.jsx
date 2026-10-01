import React, { useEffect, useState } from "react";
import { IndianRupee, RefreshCw, Save, X, Pencil, Hash, Layers, Gauge } from "lucide-react";

const styles = `
@keyframes er-fade{from{opacity:0}to{opacity:1}}
@keyframes er-pop{from{opacity:0;transform:translateY(22px) scale(.96)}to{opacity:1;transform:none}}
.er-fade{animation:er-fade .2s ease-out}
.er-pop{animation:er-pop .3s cubic-bezier(.2,.8,.2,1)}
@media (prefers-reduced-motion:reduce){.er-fade,.er-pop{animation:none}}
`;

const fieldCls = "w-full px-3.5 py-2.5 border border-[#dbe6f5] rounded-xl text-sm text-[#0e2a4a] bg-[#f6f9fe] outline-none transition focus:bg-white focus:border-[#3b82f0] focus:ring-2 focus:ring-[#3b82f0]/20 disabled:opacity-60";

export default function EditRoom({ room, onClose, onSuccess, updateRoom, rooms = [] }) {
    const [updatingRoom, setUpdatingRoom] = useState(false);
    const [formError, setFormError] = useState("");

    const [form, setForm] = useState({
        roomNumber: "",
        roomType: "",
        bedType: "",
        pricePerNight: "",
        status: "available",
    });

    useEffect(() => {
        if (!room) {
            return;
        }

        setForm({
            roomNumber: room.roomNumber || "",
            roomType: room.roomType || "",
            bedType: room.bedType || "",
            pricePerNight: room.pricePerNight || "",
            status: room.status || "available",
        });

        setFormError("");
    }, [room]);

    if (!room) {
        return null;
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setFormError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (updatingRoom) {
            return;
        }

        setFormError("");

        const roomNumber = form.roomNumber.trim();
        const roomType = form.roomType.trim();
        const bedType = form.bedType.trim();
        const pricePerNight = Number(form.pricePerNight);

        if (!roomNumber) {
            setFormError("Room number is required.");
            return;
        }

        if (!roomType) {
            setFormError("Room type is required.");
            return;
        }

        if (!bedType) {
            setFormError("Bed type is required.");
            return;
        }

        if (!Number.isFinite(pricePerNight) || pricePerNight <= 0) {
            setFormError("Please enter a valid price per night.");
            return;
        }

        const duplicateRoom = rooms.some(
            (item) => item._id !== room._id && String(item.roomNumber || "").trim().toLowerCase() === roomNumber.toLowerCase()
        );

        if (duplicateRoom) {
            setFormError("This room number already exists.");
            return;
        }

        try {
            setUpdatingRoom(true);

            await updateRoom(room._id, {
                roomNumber,
                roomType,
                bedType,
                price: pricePerNight,
                pricePerNight: pricePerNight,
                status: form.status,
            });

            onClose();
            await onSuccess();
        } catch (err) {
            console.error("Failed to update room:", err);
            setFormError(err?.response?.data?.message || "Failed to update room. Please try again.");
        } finally {
            setUpdatingRoom(false);
        }
    };

    return (
        <div className="er-fade fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0b1d3d]/60 backdrop-blur-sm px-0 sm:px-4">
            <style>{styles}</style>
            <div className="er-pop w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-[0_24px_70px_rgba(6,20,52,0.45)] overflow-hidden max-h-[94vh] flex flex-col">

                <div className="shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><Pencil size={19} /></div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold">Edit Room</h2>
                            <p className="text-xs text-blue-100 mt-0.5">Update room information.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} disabled={updatingRoom} aria-label="Close"
                        className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center disabled:opacity-50 shrink-0 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto">
                    {formError && (
                        <div className="mb-5 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm">{formError}</div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="flex items-center gap-1.5 text-xs font-bold text-[#3d5473] mb-1.5"><Hash size={12} /> Room Number *</label>
                            <input type="text" name="roomNumber" value={form.roomNumber} onChange={handleChange} disabled={updatingRoom} className={fieldCls} />
                        </div>

                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-[#3d5473] mb-1.5"><Layers size={12} /> Room Type *</label>
                            <select name="roomType" value={form.roomType} onChange={handleChange} disabled={updatingRoom} className={`${fieldCls} bg-white`}>
                                <option value="">Select Type</option>
                                <option value="AC">AC</option>
                                <option value="Non-AC">Non-AC</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#3d5473] mb-1.5">Bed Type *</label>
                            <select name="bedType" value={form.bedType} onChange={handleChange} disabled={updatingRoom} className={`${fieldCls} bg-white`}>
                                <option value="">Select Bed Type</option>
                                <option value="Single Bed">Single Bed</option>
                                <option value="2 Bed">2 Bed</option>
                                <option value="3 Bed">3 Bed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[#3d5473] mb-1.5">Price Per Night *</label>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa2ba]" />
                                <input type="number" min="1" name="price" value={form.pricePerNight} onChange={handleChange} disabled={updatingRoom} className={`${fieldCls} pl-9`} />
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-[#3d5473] mb-1.5"><Gauge size={12} /> Room Status</label>
                            <select name="status" value={form.status} onChange={handleChange} disabled={updatingRoom} className={`${fieldCls} bg-white`}>
                                <option value="available">Available</option>
                                <option value="occupied">Occupied</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} disabled={updatingRoom}
                            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition disabled:opacity-50">
                            Cancel
                        </button>

                        <button type="submit" disabled={updatingRoom}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] hover:brightness-110 text-white text-sm font-bold disabled:opacity-60 shadow-md shadow-blue-500/25 transition">
                            {updatingRoom ? (
                                <><RefreshCw className="w-4 h-4 animate-spin" /> Updating...</>
                            ) : (
                                <><Save className="w-4 h-4" /> Update Room</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}