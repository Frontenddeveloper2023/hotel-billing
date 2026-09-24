import React, {
    useEffect,
    useState,
} from "react";

import {
    IndianRupee,
    RefreshCw,
    Save,
    X,
} from "lucide-react";


export default function EditRoom({
    room,
    onClose,
    onSuccess,
    updateRoom,
    rooms = [],
}) {

    const [updatingRoom, setUpdatingRoom] =
        useState(false);

    const [formError, setFormError] =
        useState("");


    const [form, setForm] =
        useState({
            roomNumber: "",
            roomType: "",
            bedType: "",
            pricePerNight: "",
            status: "available",
        });


    // =====================================================
    // LOAD ROOM DATA
    // =====================================================

    useEffect(() => {

        if (!room) {
            return;
        }


        setForm({
            roomNumber:
                room.roomNumber || "",

            roomType:
                room.roomType || "",

            bedType:
                room.bedType || "",

            pricePerNight:
                room.pricePerNight || "",

            status:
                room.status || "available",
        });


        setFormError("");

    }, [room]);


    if (!room) {
        return null;
    }


    // =====================================================
    // CHANGE
    // =====================================================

    const handleChange = (e) => {

        const {
            name,
            value,
        } = e.target;


        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));


        setFormError("");
    };


    // =====================================================
    // SUBMIT
    // =====================================================

    const handleSubmit = async (e) => {

        e.preventDefault();


        if (updatingRoom) {
            return;
        }


        setFormError("");


        const roomNumber =
            form.roomNumber.trim();

        const roomType =
            form.roomType.trim();

        const bedType =
            form.bedType.trim();

        const pricePerNight =
            Number(
                form.pricePerNight
            );


        // ROOM NUMBER

        if (!roomNumber) {

            setFormError(
                "Room number is required."
            );

            return;
        }


        // ROOM TYPE

        if (!roomType) {

            setFormError(
                "Room type is required."
            );

            return;
        }


        // BED TYPE

        if (!bedType) {

            setFormError(
                "Bed type is required."
            );

            return;
        }


        // PRICE

        if (
            !Number.isFinite(pricePerNight) ||
            pricePerNight <= 0
        ) {

            setFormError(
                "Please enter a valid price per night."
            );

            return;
        }


        // DUPLICATE ROOM NUMBER

        const duplicateRoom =
            rooms.some(
                (item) =>
                    item._id !== room._id &&
                    String(
                        item.roomNumber || ""
                    )
                        .trim()
                        .toLowerCase() ===
                    roomNumber.toLowerCase()
            );


        if (duplicateRoom) {

            setFormError(
                "This room number already exists."
            );

            return;
        }


        try {

            setUpdatingRoom(true);


            await updateRoom(
                room._id,
                {
                    roomNumber,
                    roomType,
                    bedType,
                    price: pricePerNight,
                    pricePerNight:
                        pricePerNight,
                    status:
                        form.status,
                }
            );


            onClose();


            await onSuccess();


        } catch (err) {

            console.error(
                "Failed to update room:",
                err
            );


            setFormError(
                err?.response?.data?.message ||
                "Failed to update room. Please try again."
            );

        } finally {

            setUpdatingRoom(false);

        }
    };


    // =====================================================
    // RENDER
    // =====================================================

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
                            Edit Room
                        </h2>

                        <p className="
                            text-xs
                            text-slate-500
                            mt-1
                        ">
                            Update room information.
                        </p>

                    </div>


                    <button
                        type="button"
                        onClick={onClose}
                        disabled={
                            updatingRoom
                        }
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
                                    form.roomNumber
                                }
                                onChange={
                                    handleChange
                                }
                                disabled={
                                    updatingRoom
                                }
                                className="
                                    w-full
                                    px-3
                                    py-2.5
                                    border
                                    border-slate-200
                                    rounded-lg
                                    text-sm
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
                                    form.roomType
                                }
                                onChange={
                                    handleChange
                                }
                                disabled={
                                    updatingRoom
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


                        {/* BED */}

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
                                    form.bedType
                                }
                                onChange={
                                    handleChange
                                }
                                disabled={
                                    updatingRoom
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

                        <div>

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
                                    name="price"
                                    value={
                                        form.pricePerNight
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        updatingRoom
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


                        {/* STATUS */}

                        <div>

                            <label className="
                                block
                                text-xs
                                font-bold
                                text-slate-700
                                mb-1.5
                            ">
                                Room Status
                            </label>

                            <select
                                name="status"
                                value={
                                    form.status
                                }
                                onChange={
                                    handleChange
                                }
                                disabled={
                                    updatingRoom
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

                                <option value="available">
                                    Available
                                </option>

                                <option value="occupied">
                                    Occupied
                                </option>

                            </select>

                        </div>

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
                            onClick={onClose}
                            disabled={
                                updatingRoom
                            }
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
                            disabled={
                                updatingRoom
                            }
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

                            {updatingRoom ? (

                                <>
                                    <RefreshCw
                                        className="
                                            w-4
                                            h-4
                                            animate-spin
                                        "
                                    />

                                    Updating...

                                </>

                            ) : (

                                <>
                                    <Save
                                        className="w-4 h-4"
                                    />

                                    Update Room
                                </>

                            )}

                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
}