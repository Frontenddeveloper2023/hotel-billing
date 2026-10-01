import React, { useState } from "react";
import { AlertTriangle, RefreshCw, Trash2, X } from "lucide-react";

const styles = `
@keyframes dr-fade{from{opacity:0}to{opacity:1}}
@keyframes dr-pop{from{opacity:0;transform:translateY(22px) scale(.95)}to{opacity:1;transform:none}}
@keyframes dr-shake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}
.dr-fade{animation:dr-fade .2s ease-out}
.dr-pop{animation:dr-pop .3s cubic-bezier(.2,.8,.2,1)}
.dr-shake{animation:dr-shake .5s}
@media (prefers-reduced-motion:reduce){.dr-fade,.dr-pop,.dr-shake{animation:none}}
`;

export default function DeleteRoom({ room, onClose, onSuccess, deleteRoom }) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");

    if (!room) {
        return null;
    }

    const handleDelete = async () => {
        if (deleting) {
            return;
        }

        try {
            setDeleting(true);
            setError("");

            await deleteRoom(room._id);

            onClose();
            await onSuccess();
        } catch (err) {
            console.error("Failed to delete room:", err);
            setError(err?.response?.data?.message || "Failed to delete room. Please try again.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="dr-fade fixed inset-0 z-[60] flex items-center justify-center bg-[#0b1d3d]/65 backdrop-blur-sm px-4">
            <style>{styles}</style>
            <div className={`dr-pop w-full max-w-md bg-white rounded-3xl shadow-[0_24px_70px_rgba(6,20,52,0.45)] p-6 ${error ? "dr-shake" : ""}`}>

                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-400 to-rose-600 text-white flex items-center justify-center mb-4 shadow-md shadow-red-500/25">
                    <AlertTriangle className="w-6 h-6" />
                </div>

                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-[#0e2a4a]">Delete Room?</h2>
                        <p className="text-sm text-[#6b7f99] mt-2 leading-6">
                            Are you sure you want to delete room <span className="font-bold text-[#0e2a4a]">{room.roomNumber}</span>?
                        </p>
                    </div>

                    <button type="button" onClick={onClose} disabled={deleting} aria-label="Close"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8fa2ba] hover:bg-slate-100 disabled:opacity-50 transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mt-4 p-4 rounded-2xl bg-[#f4f8fd] border border-[#e7eff8] space-y-2">
                    {[["Room", room.roomNumber], ["Type", room.roomType], ["Bed", room.bedType]].map(([l, v]) => (
                        <div key={l} className="flex justify-between text-sm">
                            <span className="text-[#6b7f99]">{l}</span>
                            <span className="font-semibold text-[#0e2a4a]">{v}</span>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
                )}

                <p className="text-xs text-[#8fa2ba] mt-4">This action cannot be undone.</p>

                <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={onClose} disabled={deleting}
                        className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold disabled:opacity-50 transition">
                        Cancel
                    </button>

                    <button type="button" onClick={handleDelete} disabled={deleting}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-60 transition">
                        {deleting ? (
                            <><RefreshCw className="w-4 h-4 animate-spin" /> Deleting...</>
                        ) : (
                            <><Trash2 className="w-4 h-4" /> Delete Room</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}