import React from "react";
import { X, Trash2 } from "lucide-react";

export default function DeleteFood({ food, onClose, onDelete, saving = false }) {
    return (
        <div className="fm-fade fixed inset-0 z-[70] flex items-center justify-center bg-[#0a1a3f]/60 p-4 backdrop-blur-sm">
            <div className="fm-pop w-full max-w-sm rounded-2xl border border-[var(--line)] bg-white p-5 shadow-2xl sm:p-6">
                {/* TOP */}
                <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#12306b] to-blue-500 text-white shadow-md shadow-blue-500/30">
                        <Trash2 className="h-5 w-5" />
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close"
                        className="fm-btn flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-[var(--tint)] hover:text-blue-700 disabled:opacity-50"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <h2 className="mt-5 text-base font-bold text-[#0a1a3f]">
                    Delete Food Item?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                    Are you sure you want to delete{" "}
                    <span className="break-words font-bold text-[#12306b]">
                        {food.foodName}
                    </span>
                    ?
                </p>

                <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="fm-btn cursor-pointer rounded-lg border border-[var(--line)] px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-[var(--tint)] disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={saving}
                        className="fm-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0a1a3f] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#12306b] disabled:opacity-50"
                    >
                        {saving && (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        )}
                        {saving ? "Deleting..." : "Delete Food"}
                    </button>
                </div>
            </div>
        </div>
    );
}