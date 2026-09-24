import React, {
    useState,
} from "react";

import {
    AlertTriangle,
    RefreshCw,
    Trash2,
    X,
} from "lucide-react";


export default function DeleteRoom({
    room,
    onClose,
    onSuccess,
    deleteRoom,
}) {

    const [deleting, setDeleting] =
        useState(false);

    const [error, setError] =
        useState("");


    if (!room) {
        return null;
    }


    // =====================================================
    // DELETE
    // =====================================================

    const handleDelete = async () => {

        if (deleting) {
            return;
        }


        try {

            setDeleting(true);
            setError("");


            await deleteRoom(
                room._id
            );


            // CLOSE

            onClose();


            // REFRESH

            await onSuccess();


        } catch (err) {

            console.error(
                "Failed to delete room:",
                err
            );


            setError(
                err?.response?.data?.message ||
                "Failed to delete room. Please try again."
            );

        } finally {

            setDeleting(false);

        }
    };


    return (

        <div className="
            fixed
            inset-0
            z-[60]
            flex
            items-center
            justify-center
            bg-black/40
            backdrop-blur-[2px]
            px-4
        ">

            <div className="
                w-full
                max-w-md
                bg-white
                rounded-2xl
                shadow-2xl
                p-6
            ">

                {/* ICON */}

                <div className="
                    w-12
                    h-12
                    rounded-full
                    bg-red-50
                    flex
                    items-center
                    justify-center
                    mb-4
                ">

                    <AlertTriangle className="
                        w-6
                        h-6
                        text-red-600
                    " />

                </div>


                {/* TITLE */}

                <div className="
                    flex
                    items-start
                    justify-between
                    gap-4
                ">

                    <div>

                        <h2 className="
                            text-lg
                            font-bold
                            text-slate-900
                        ">
                            Delete Room?
                        </h2>

                        <p className="
                            text-sm
                            text-slate-500
                            mt-2
                            leading-6
                        ">

                            Are you sure you want to
                            delete room{" "}

                            <span className="
                                font-bold
                                text-slate-800
                            ">
                                {room.roomNumber}
                            </span>
                            ?

                        </p>

                    </div>


                    <button
                        type="button"
                        onClick={onClose}
                        disabled={deleting}
                        className="
                            w-8
                            h-8
                            rounded-lg
                            flex
                            items-center
                            justify-center
                            text-slate-400
                            hover:bg-slate-100
                            disabled:opacity-50
                        "
                    >

                        <X className="
                            w-5
                            h-5
                        " />

                    </button>

                </div>


                {/* ROOM INFO */}

                <div className="
                    mt-4
                    p-4
                    rounded-xl
                    bg-slate-50
                    border
                    border-slate-100
                ">

                    <div className="
                        flex
                        justify-between
                        text-sm
                    ">

                        <span className="
                            text-slate-500
                        ">
                            Room
                        </span>

                        <span className="
                            font-bold
                            text-slate-900
                        ">
                            {room.roomNumber}
                        </span>

                    </div>


                    <div className="
                        flex
                        justify-between
                        text-sm
                        mt-2
                    ">

                        <span className="
                            text-slate-500
                        ">
                            Type
                        </span>

                        <span className="
                            font-semibold
                            text-slate-900
                        ">
                            {room.roomType}
                        </span>

                    </div>


                    <div className="
                        flex
                        justify-between
                        text-sm
                        mt-2
                    ">

                        <span className="
                            text-slate-500
                        ">
                            Bed
                        </span>

                        <span className="
                            font-semibold
                            text-slate-900
                        ">
                            {room.bedType}
                        </span>

                    </div>

                </div>


                {/* ERROR */}

                {error && (

                    <div className="
                        mt-4
                        px-4
                        py-3
                        rounded-lg
                        bg-red-50
                        border
                        border-red-200
                        text-red-600
                        text-sm
                    ">
                        {error}
                    </div>

                )}


                {/* WARNING */}

                <p className="
                    text-xs
                    text-slate-400
                    mt-4
                ">
                    This action cannot be undone.
                </p>


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
                        disabled={deleting}
                        className="
                            px-5
                            py-2.5
                            rounded-lg
                            border
                            border-slate-200
                            text-slate-700
                            text-sm
                            font-bold
                            hover:bg-slate-50
                            disabled:opacity-50
                        "
                    >
                        Cancel
                    </button>


                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="
                            inline-flex
                            items-center
                            justify-center
                            gap-2
                            px-5
                            py-2.5
                            rounded-lg
                            bg-red-600
                            text-white
                            text-sm
                            font-bold
                            hover:bg-red-700
                            disabled:opacity-60
                        "
                    >

                        {deleting ? (

                            <>
                                <RefreshCw
                                    className="
                                        w-4
                                        h-4
                                        animate-spin
                                    "
                                />

                                Deleting...

                            </>

                        ) : (

                            <>
                                <Trash2
                                    className="
                                        w-4
                                        h-4
                                    "
                                />

                                Delete Room
                            </>

                        )}

                    </button>

                </div>

            </div>

        </div>
    );
}