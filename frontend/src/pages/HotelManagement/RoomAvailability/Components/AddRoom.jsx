import React, {
    useState,
} from "react";

import {
    IndianRupee,
    Plus,
    RefreshCw,
    X,
} from "lucide-react";


export default function AddRoom({
    open,
    onClose,
    onSuccess,
    createRoom,
}) {

    const [addingRoom, setAddingRoom] =
        useState(false);

    const [formError, setFormError] =
        useState("");

    const [roomForm, setRoomForm] =
        useState({
            roomNumber: "",
            roomType: "",
            bedType: "",
            pricePerNight: "",
        });


    if (!open) {
        return null;
    }


    // =====================================================
    // FORM CHANGE
    // =====================================================

    const handleChange = (e) => {

        const {
            name,
            value,
        } = e.target;


        setRoomForm((prev) => ({
            ...prev,
            [name]: value,
        }));


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

    // ==========================================
    // ROOM NUMBER
    // ==========================================

    const roomNumber = roomForm.roomNumber.trim();

    if (!roomNumber) {
        setFormError(
            "Please enter a room number."
        );
        return;
    }

    // ==========================================
    // ROOM TYPE
    // ==========================================

    const roomType = roomForm.roomType.trim();

    if (!roomType) {
        setFormError(
            "Please select or enter a room type."
        );
        return;
    }

    // ==========================================
    // BED TYPE
    // ==========================================

    const bedType = roomForm.bedType.trim();

    if (!bedType) {
        setFormError(
            "Please select or enter a bed type."
        );
        return;
    }

    // ==========================================
    // PRICE
    // ==========================================

    const price = Number(
        roomForm.pricePerNight
    );

    if (
        !Number.isFinite(price) ||
        price <= 0
    ) {
        setFormError(
            "Please enter a valid price per night greater than ₹0."
        );
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

        // ==========================================
        // RESET FORM
        // ==========================================

        setRoomForm({
            roomNumber: "",
            roomType: "",
            bedType: "",
            pricePerNight: "",
        });

        setFormError("");

        // ==========================================
        // CLOSE MODAL
        // ==========================================

        onClose();

        // ==========================================
        // REFRESH PARENT
        // ==========================================

        await onSuccess();

    } 

     catch (err) {
    console.error("Failed to add room:", err);

    let message =
        "Unable to add the room. Please try again.";

    // ==========================================
    // GET BACKEND ERROR MESSAGE
    // ==========================================

    const backendMessage =
        err?.response?.data?.message ||
        err?.data?.message ||
        err?.message ||
        (typeof err === "string" ? err : "");

    const errorText = String(
        backendMessage
    ).trim();

    const lowerError = errorText.toLowerCase();

    // ==========================================
    // DUPLICATE ROOM NUMBER
    // ==========================================

    if (
        lowerError.includes("already exists") ||
        lowerError.includes("already exist") ||
        lowerError.includes("duplicate") ||
        lowerError.includes("duplicate key") ||
        lowerError.includes("room number already")
    ) {
        message =
            `Room number "${roomNumber}" already exists. Please enter a different room number.`;
    }

    // ==========================================
    // NETWORK ERROR
    // ==========================================

    else if (
        err?.code === "ERR_NETWORK" ||
        lowerError.includes("network error")
    ) {
        message =
            "Unable to connect to the server. Please check your internet connection.";
    }

    // ==========================================
    // VALIDATION ERROR
    // ==========================================

    else if (
        lowerError.includes("required") ||
        lowerError.includes("validation") ||
        lowerError.includes("invalid")
    ) {
        message =
            errorText ||
            "Please check the room details and try again.";
    }

    // ==========================================
    // AUTH ERROR
    // ==========================================

    else if (
        err?.response?.status === 401 ||
        lowerError.includes("unauthorized")
    ) {
        message =
            "Your session has expired. Please log in again.";
    }

    // ==========================================
    // SERVER ERROR
    // ==========================================

    else if (
        err?.response?.status >= 500
    ) {
        message =
            "The server encountered a problem while adding the room. Please try again later.";
    }

    // ==========================================
    // OTHER BACKEND ERROR
    // ==========================================

    else if (errorText) {
        message = errorText;
    }

    setFormError(message);

} finally {
    setAddingRoom(false);
}
};


    return (

        <div className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/40
            backdrop-blur-[2px]
            px-4
        ">

            <div className="
                w-full
                max-w-lg
                bg-white
                rounded-2xl
                shadow-2xl
                overflow-hidden
            ">

                {/* HEADER */}

                <div className="
                    flex
                    items-center
                    justify-between
                    px-6
                    py-5
                    border-b
                    border-slate-100
                ">

                    <div>

                        <h2 className="
                            text-lg
                            font-bold
                            text-slate-900
                        ">
                            Add New Room
                        </h2>

                        <p className="
                            text-xs
                            text-slate-500
                            mt-1
                        ">
                            Add a new room to your hotel.
                        </p>

                    </div>


                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={addingRoom}
                        className="
                            w-9
                            h-9
                            rounded-lg
                            flex
                            items-center
                            justify-center
                            text-slate-400
                            hover:bg-slate-100
                            disabled:opacity-50
                        "
                    >

                        <X className="w-5 h-5" />

                    </button>

                </div>


                {/* FORM */}

                <form
                    onSubmit={handleSubmit}
                    className="p-6"
                >

                    {/* ERROR */}

                    {formError && (

                        <div className="
                            mb-5
                            px-4
                            py-3
                            rounded-lg
                            border
                            border-red-200
                            bg-red-50
                            text-red-600
                            text-sm
                        ">
                            {formError}
                        </div>

                    )}


                    <div className="
                        grid
                        grid-cols-1
                        sm:grid-cols-2
                        gap-5
                    ">

                        {/* ROOM NUMBER */}

                        <div className="sm:col-span-2">

                            <label className="
                                block
                                text-xs
                                font-bold
                                text-slate-700
                                mb-1.5
                            ">
                                Room Number *
                            </label>

                            <input
                                type="text"
                                name="roomNumber"
                                value={
                                    roomForm.roomNumber
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Example: 101"
                                disabled={
                                    addingRoom
                                }
                                className="
                                    w-full
                                    px-3
                                    py-2.5
                                    border
                                    border-slate-200
                                    rounded-lg
                                    text-sm
                                    outline-none
                                    focus:border-[var(--teal,#08838d)]
                                "
                            />

                        </div>


                        {/* ROOM TYPE */}

                        <div>

                            <label className="
                                block
                                text-xs
                                font-bold
                                text-slate-700
                                mb-1.5
                            ">
                                Room Type *
                            </label>

                            <select
                                name="roomType"
                                value={
                                    roomForm.roomType
                                }
                                onChange={
                                    handleChange
                                }
                                disabled={
                                    addingRoom
                                }
                                className="
                                    w-full
                                    px-3
                                    py-2.5
                                    border
                                    border-slate-200
                                    rounded-lg
                                    text-sm
                                    bg-white
                                "
                            >

                                <option value="">
                                    Select Type
                                </option>

                                <option value="AC">
                                    AC
                                </option>

                                <option value="Non-AC">
                                    Non-AC
                                </option>

                            </select>

                        </div>


                        {/* BED TYPE */}

                        <div>

                            <label className="
                                block
                                text-xs
                                font-bold
                                text-slate-700
                                mb-1.5
                            ">
                                Bed Type *
                            </label>

                            <select
                                name="bedType"
                                value={
                                    roomForm.bedType
                                }
                                onChange={
                                    handleChange
                                }
                                disabled={
                                    addingRoom
                                }
                                className="
                                    w-full
                                    px-3
                                    py-2.5
                                    border
                                    border-slate-200
                                    rounded-lg
                                    text-sm
                                    bg-white
                                "
                            >

                                <option value="">
                                    Select Bed Type
                                </option>

                                <option value="Single Bed">
                                    Single Bed
                                </option>

                                <option value="2 Bed">
                                    2 Bed
                                </option>

                                <option value="3 Bed">
                                    3 Bed
                                </option>

                            </select>

                        </div>


                        {/* PRICE */}

                        <div className="sm:col-span-2">

                            <label className="
                                block
                                text-xs
                                font-bold
                                text-slate-700
                                mb-1.5
                            ">
                                Price Per Night *
                            </label>

                            <div className="relative">

                                <IndianRupee className="
                                    absolute
                                    left-3
                                    top-1/2
                                    -translate-y-1/2
                                    w-4
                                    h-4
                                    text-slate-400
                                " />

                                <input
                                    type="number"
                                    min="1"
                                    name="pricePerNight"
                                    value={
                                        roomForm.pricePerNight
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Enter price per night"
                                    disabled={
                                        addingRoom
                                    }
                                    className="
                                        w-full
                                        pl-9
                                        pr-3
                                        py-2.5
                                        border
                                        border-slate-200
                                        rounded-lg
                                        text-sm
                                    "
                                />

                            </div>

                        </div>

                    </div>


                    {/* INFO */}

                    <div className="
                        mt-5
                        px-4
                        py-3
                        bg-green-50
                        border
                        border-green-100
                        rounded-lg
                    ">

                        <p className="
                            text-xs
                            text-green-700
                        ">
                            New rooms are automatically
                            added with{" "}
                            <strong>
                                Available
                            </strong>{" "}
                            status.
                        </p>

                    </div>


                    {/* BUTTONS */}

                    <div className="
                        flex
                        justify-end
                        gap-3
                        mt-6
                    ">

                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={addingRoom}
                            className="
                                px-5
                                py-2.5
                                border
                                border-slate-200
                                rounded-lg
                                text-sm
                                font-bold
                                text-slate-700
                            "
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            disabled={addingRoom}
                            className="
                                inline-flex
                                items-center
                                justify-center
                                gap-2
                                px-5
                                py-2.5
                                rounded-lg
                                bg-[var(--teal-dark,#065b62)]
                                text-white
                                text-sm
                                font-bold
                                disabled:opacity-60
                            "
                        >

                            {addingRoom ? (

                                <>
                                    <RefreshCw
                                        className="
                                            w-4
                                            h-4
                                            animate-spin
                                        "
                                    />

                                    Adding...

                                </>

                            ) : (

                                <>
                                    <Plus
                                        className="w-4 h-4"
                                    />

                                    Add Room
                                </>

                            )}

                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
}