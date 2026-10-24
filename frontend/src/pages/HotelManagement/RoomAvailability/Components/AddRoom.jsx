import React, {
    useState,
    useRef,
} from "react";
import { useNavigate } from "react-router-dom";

import {
    IndianRupee,
    Plus,
    RefreshCw,
    X,
    Lock,
    AlertCircle,
} from "lucide-react";


export default function AddRoom({
    open,
    onClose,
    onSuccess,
    createRoom,
    roomLimit = 0,
    totalRooms = 0,
    isRoomLimitReached = false,
    planName = "Current Plan",
}) {
    const navigate = useNavigate();

    const [addingRoom, setAddingRoom] = useState(false);
    const [formError, setFormError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const [roomForm, setRoomForm] = useState({
        roomNumber: "",
        roomType: "",
        bedType: "",
        pricePerNight: "",
    });

    // Refs for precision auto-focus & smooth scrolling to the exact error field
    const roomNumberRef = useRef(null);
    const roomTypeRef = useRef(null);
    const bedTypeRef = useRef(null);
    const pricePerNightRef = useRef(null);

    if (!open) {
        return null;
    }

    // Helper: Focus and smoothly center on error field
    const scrollToAndFocus = (ref) => {
        if (ref && ref.current) {
            ref.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
            setTimeout(() => {
                ref.current?.focus();
            }, 100);
        }
    };

    // =====================================================
    // FORM CHANGE
    // =====================================================
    const handleChange = (e) => {
        const { name, value } = e.target;

        setRoomForm((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Clear field error on typing
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }

        setFormError("");
    };

    // =====================================================
    // CLOSE
    // =====================================================
    const handleClose = () => {
        if (addingRoom) {
            return;
        }

        setRoomForm({
            roomNumber: "",
            roomType: "",
            bedType: "",
            pricePerNight: "",
        });

        setFieldErrors({});
        setFormError("");
        onClose();
    };

    // =====================================================
    // SUBMIT
    // =====================================================
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (addingRoom) {
            return;
        }

        setFormError("");
        setFieldErrors({});

        if (isRoomLimitReached) {
            setFormError(
                `Room allocation limit reached! Your current ${planName} plan allows a maximum of ${roomLimit} room(s) per branch (${totalRooms}/${roomLimit} used). Please upgrade your plan to add more rooms.`
            );
            return;
        }

        const errors = {};

        // 1. Room Number
        const roomNumber = roomForm.roomNumber.trim();
        if (!roomNumber) {
            errors.roomNumber = "Please enter a room number.";
        }

        // 2. Room Type
        const roomType = roomForm.roomType.trim();
        if (!roomType) {
            errors.roomType = "Please select a room type.";
        }

        // 3. Bed Type
        const bedType = roomForm.bedType.trim();
        if (!bedType) {
            errors.bedType = "Please select a bed type.";
        }

        // 4. Price
        const rawPrice = String(roomForm.pricePerNight).trim();
        const price = Number(rawPrice);
        if (!rawPrice) {
            errors.pricePerNight = "Please enter price per night.";
        } else if (!Number.isFinite(price) || price <= 0) {
            errors.pricePerNight = "Price must be greater than ₹0.";
        }

        // Direct land on the first errored field
        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);

            if (errors.roomNumber) {
                scrollToAndFocus(roomNumberRef);
            } else if (errors.roomType) {
                scrollToAndFocus(roomTypeRef);
            } else if (errors.bedType) {
                scrollToAndFocus(bedTypeRef);
            } else if (errors.pricePerNight) {
                scrollToAndFocus(pricePerNightRef);
            }
            return;
        }

        try {
            setAddingRoom(true);

            await createRoom({
                roomNumber,
                roomType,
                bedType,
                pricePerNight: price,
            });

            // RESET FORM
            setRoomForm({
                roomNumber: "",
                roomType: "",
                bedType: "",
                pricePerNight: "",
            });
            setFieldErrors({});
            setFormError("");

            onClose();
            await onSuccess();
        } catch (err) {
            console.error("Failed to add room:", err);

            let message = "Unable to add the room. Please try again.";

            const backendMessage =
                err?.response?.data?.message ||
                err?.data?.message ||
                err?.message ||
                (typeof err === "string" ? err : "");

            const errorText = String(backendMessage).trim();
            const lowerError = errorText.toLowerCase();

            // DUPLICATE ROOM NUMBER -> Directly land on roomNumber field
            if (
                lowerError.includes("already exists") ||
                lowerError.includes("already exist") ||
                lowerError.includes("duplicate") ||
                lowerError.includes("duplicate key") ||
                lowerError.includes("room number already")
            ) {
                message = `Room number "${roomNumber}" already exists. Please enter a different room number.`;
                setFieldErrors((prev) => ({
                    ...prev,
                    roomNumber: message,
                }));
                scrollToAndFocus(roomNumberRef);
            } else if (
                err?.code === "ERR_NETWORK" ||
                lowerError.includes("network error")
            ) {
                message = "Unable to connect to the server. Please check your internet connection.";
            } else if (
                lowerError.includes("room type")
            ) {
                setFieldErrors((prev) => ({
                    ...prev,
                    roomType: errorText,
                }));
                scrollToAndFocus(roomTypeRef);
            } else if (
                lowerError.includes("bed type")
            ) {
                setFieldErrors((prev) => ({
                    ...prev,
                    bedType: errorText,
                }));
                scrollToAndFocus(bedTypeRef);
            } else if (
                lowerError.includes("price")
            ) {
                setFieldErrors((prev) => ({
                    ...prev,
                    pricePerNight: errorText,
                }));
                scrollToAndFocus(pricePerNightRef);
            } else if (
                lowerError.includes("required") ||
                lowerError.includes("validation") ||
                lowerError.includes("invalid")
            ) {
                message = errorText || "Please check the room details and try again.";
            } else if (
                err?.response?.status === 401 ||
                lowerError.includes("unauthorized")
            ) {
                message = "Your session has expired. Please log in again.";
            } else if (err?.response?.status >= 500) {
                message = "The server encountered a problem while adding the room. Please try again later.";
            } else if (errorText) {
                message = errorText;
            }

            setFormError(message);
        } finally {
            setAddingRoom(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-lg sm:max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto border border-slate-100">
                {/* HEADER */}
                <div className="flex items-center justify-between px-6 py-4 sm:py-5 border-b border-slate-100 bg-white shrink-0">
                    <div>
                        <h2 className="text-base sm:text-lg font-bold text-black">
                            Add New Room
                        </h2>
                        <p className="text-xs sm:text-sm text-black mt-0.5">
                            Add a new room to your hotel.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={addingRoom}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-black hover:text-black hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* SCROLLABLE BODY */}
                <div className="p-6 overflow-y-auto space-y-5">
                    <form id="add-room-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
                        {/* QUOTA FULL ALERT */}
                        {isRoomLimitReached && (
                            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
                                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-amber-950">
                                        Room Quota Reached ({totalRooms}/{roomLimit} Rooms)
                                    </p>
                                    <p className="mt-0.5 text-amber-800">
                                        Your current <strong>{planName}</strong> plan allows a maximum of {roomLimit} room{roomLimit === 1 ? "" : "s"}. To add more rooms, please upgrade your subscription plan.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onClose();
                                            navigate("/saas-user/choose-plan");
                                        }}
                                        className="inline-flex items-center gap-1 font-bold text-amber-700 hover:text-amber-800 mt-2 underline cursor-pointer"
                                    >
                                        Upgrade Plan &rarr;
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* FORM ERROR */}
                        {formError && !fieldErrors.roomNumber && (
                            <div className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-600 text-xs sm:text-sm font-medium flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                                <span>{formError}</span>
                            </div>
                        )}

                        {/* INPUT GRID */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            {/* ROOM NUMBER */}
                            <div className="sm:col-span-2">
                                <label
                                    htmlFor="roomNumber"
                                    className="block text-xs sm:text-sm font-bold text-black mb-1.5"
                                >
                                    Room Number *
                                </label>
                                <input
                                    ref={roomNumberRef}
                                    id="roomNumber"
                                    type="text"
                                    name="roomNumber"
                                    value={roomForm.roomNumber}
                                    onChange={handleChange}
                                    placeholder="Example: 101"
                                    disabled={addingRoom}
                                    className={`w-full px-3.5 py-2.5 sm:py-3 border rounded-xl text-xs sm:text-sm text-black placeholder:text-black outline-none transition ${
                                        fieldErrors.roomNumber
                                            ? "border-red-500 bg-red-50/20 ring-2 ring-red-500/20"
                                            : "border-slate-200 focus:border-[var(--teal,#08838d)] focus:ring-2 focus:ring-[var(--teal,#08838d)]/20"
                                    }`}
                                />
                                {fieldErrors.roomNumber && (
                                    <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1 animate-fadeIn">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{fieldErrors.roomNumber}</span>
                                    </p>
                                )}
                            </div>

                            {/* ROOM TYPE */}
                            <div>
                                <label
                                    htmlFor="roomType"
                                    className="block text-xs sm:text-sm font-bold text-black mb-1.5"
                                >
                                    Room Type *
                                </label>
                                <select
                                    ref={roomTypeRef}
                                    id="roomType"
                                    name="roomType"
                                    value={roomForm.roomType}
                                    onChange={handleChange}
                                    disabled={addingRoom}
                                    className={`w-full px-3.5 py-2.5 sm:py-3 border rounded-xl text-xs sm:text-sm text-black bg-white outline-none transition cursor-pointer ${
                                        fieldErrors.roomType
                                            ? "border-red-500 bg-red-50/20 ring-2 ring-red-500/20"
                                            : "border-slate-200 focus:border-[var(--teal,#08838d)] focus:ring-2 focus:ring-[var(--teal,#08838d)]/20"
                                    }`}
                                >
                                    <option value="">Select Type</option>
                                    <option value="AC">AC</option>
                                    <option value="Non-AC">Non-AC</option>
                                </select>
                                {fieldErrors.roomType && (
                                    <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1 animate-fadeIn">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{fieldErrors.roomType}</span>
                                    </p>
                                )}
                            </div>

                            {/* BED TYPE */}
                            <div>
                                <label
                                    htmlFor="bedType"
                                    className="block text-xs sm:text-sm font-bold text-black mb-1.5"
                                >
                                    Bed Type *
                                </label>
                                <select
                                    ref={bedTypeRef}
                                    id="bedType"
                                    name="bedType"
                                    value={roomForm.bedType}
                                    onChange={handleChange}
                                    disabled={addingRoom}
                                    className={`w-full px-3.5 py-2.5 sm:py-3 border rounded-xl text-xs sm:text-sm text-black bg-white outline-none transition cursor-pointer ${
                                        fieldErrors.bedType
                                            ? "border-red-500 bg-red-50/20 ring-2 ring-red-500/20"
                                            : "border-slate-200 focus:border-[var(--teal,#08838d)] focus:ring-2 focus:ring-[var(--teal,#08838d)]/20"
                                    }`}
                                >
                                    <option value="">Select Bed Type</option>
                                    <option value="Single Bed">Single Bed</option>
                                    <option value="2 Bed">2 Bed</option>
                                    <option value="3 Bed">3 Bed</option>
                                </select>
                                {fieldErrors.bedType && (
                                    <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1 animate-fadeIn">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{fieldErrors.bedType}</span>
                                    </p>
                                )}
                            </div>

                            {/* PRICE */}
                            <div className="sm:col-span-2">
                                <label
                                    htmlFor="pricePerNight"
                                    className="block text-xs sm:text-sm font-bold text-black mb-1.5"
                                >
                                    Price Per Night *
                                </label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                                    <input
                                        ref={pricePerNightRef}
                                        id="pricePerNight"
                                        type="number"
                                        min="1"
                                        name="pricePerNight"
                                        value={roomForm.pricePerNight}
                                        onChange={handleChange}
                                        placeholder="Enter price per night"
                                        disabled={addingRoom}
                                        className={`w-full pl-10 pr-3.5 py-2.5 sm:py-3 border rounded-xl text-xs sm:text-sm text-black placeholder:text-black outline-none transition ${
                                            fieldErrors.pricePerNight
                                                ? "border-red-500 bg-red-50/20 ring-2 ring-red-500/20"
                                                : "border-slate-200 focus:border-[var(--teal,#08838d)] focus:ring-2 focus:ring-[var(--teal,#08838d)]/20"
                                        }`}
                                    />
                                </div>
                                {fieldErrors.pricePerNight && (
                                    <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1 animate-fadeIn">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{fieldErrors.pricePerNight}</span>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* INFO BADGE */}
                        <div className="px-4 py-3 bg-emerald-50/80 border border-emerald-200/60 rounded-xl">
                            <p className="text-xs sm:text-sm text-emerald-800 font-medium">
                                New rooms are automatically added with <strong>Available</strong> status.
                            </p>
                        </div>
                    </form>
                </div>

                {/* STICKY FOOTER */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={addingRoom}
                        className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-black bg-white hover:bg-slate-50 transition cursor-pointer shadow-sm"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        form="add-room-form"
                        disabled={addingRoom || isRoomLimitReached}
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer ${
                            isRoomLimitReached
                                ? "bg-amber-600 cursor-not-allowed opacity-80"
                                : "bg-[var(--teal-dark,#065b62)] hover:bg-[var(--teal,#08838d)]"
                        } disabled:opacity-60`}
                    >
                        {addingRoom ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Adding...
                            </>
                        ) : isRoomLimitReached ? (
                            <>
                                <Lock className="w-4 h-4" />
                                Limit Reached ({totalRooms}/{roomLimit})
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4" />
                                Add Room 
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}