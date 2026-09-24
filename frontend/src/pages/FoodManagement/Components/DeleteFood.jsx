import React from "react";

import {
    X,
    Trash2,
} from "lucide-react";

export default function DeleteFood({
    food,
    onClose,
    onDelete,
    saving = false,
}) {
    return (
        <div className="
            fixed
            inset-0
            z-[60]
            bg-slate-900/40
            backdrop-blur-sm
            flex
            items-center
            justify-center
            p-4
        ">

            <div className="
                w-full
                max-w-sm
                bg-white
                rounded-2xl
                shadow-2xl
                p-6
            ">

                {/* TOP */}
                <div className="
                    flex
                    items-center
                    justify-between
                ">

                    <div className="
                        w-11
                        h-11
                        rounded-xl
                        bg-slate-100
                        flex
                        items-center
                        justify-center
                    ">

                        <Trash2 className="
                            w-5
                            h-5
                            text-slate-600
                        " />

                    </div>


                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
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
                        <X className="w-4 h-4" />
                    </button>

                </div>


                {/* TITLE */}
                <h2 className="
                    text-base
                    font-bold
                    text-slate-900
                    mt-5
                ">
                    Delete Food Item?
                </h2>


                {/* MESSAGE */}
                <p className="
                    text-sm
                    text-slate-500
                    mt-2
                    leading-6
                ">
                    Are you sure you want to delete{" "}

                    <span className="
                        font-bold
                        text-slate-700
                    ">
                        {food.foodName}
                    </span>

                    ?
                </p>


                {/* BUTTONS */}
                <div className="
                    flex
                    flex-col-reverse
                    sm:flex-row
                    justify-end
                    gap-3
                    mt-6
                ">

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="
                            px-5
                            py-2.5
                            rounded-lg
                            border
                            border-slate-200
                            text-sm
                            font-bold
                            text-slate-700
                            hover:bg-slate-50
                            disabled:opacity-50
                        "
                    >
                        Cancel
                    </button>


                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={saving}
                        className="
                            px-5
                            py-2.5
                            rounded-lg
                            bg-slate-800
                            text-white
                            text-sm
                            font-bold
                            hover:bg-slate-900
                            disabled:opacity-50
                        "
                    >
                        {saving
                            ? "Deleting..."
                            : "Delete Food"}
                    </button>

                </div>

            </div>

        </div>
    );
}