import React, { useEffect, useState } from "react";
import { X, Upload, Save, Pencil } from "lucide-react";
import { getFoodImageUrl } from "./Foodimage.js";

const inputCls =
    "w-full rounded-lg border border-[var(--line)] bg-[var(--tint)]/40 px-3.5 py-2.5 text-sm text-[#0a1a3f] outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";

export default function EditFood({ food, onClose, onSave, saving = false }) {
    const [formData, setFormData] = useState({
        foodName: food?.foodName || "",
        description: food?.description || "",
        foodQuantity: food?.foodQuantity ?? "",
        foodPrice: food?.foodPrice ?? "",
    });

    const [imageFile, setImageFile] = useState(null);
    const [preview, setPreview] = useState(getFoodImageUrl(food?.foodImage) || "");

    // ----------------------------------
    // INPUT CHANGE
    // ----------------------------------
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // ----------------------------------
    // IMAGE CHANGE
    // ----------------------------------
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select a valid image.");
            return;
        }

        setImageFile(file);
        setPreview(URL.createObjectURL(file));
    };

    // ----------------------------------
    // CLEAN PREVIEW
    // ----------------------------------
    useEffect(() => {
        return () => {
            if (preview && preview.startsWith("blob:")) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    // ----------------------------------
    // SUBMIT HANDLER
    // ----------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();

        const foodName = formData.foodName.trim();
        const description = formData.description.trim();
        const foodQuantity = Number(formData.foodQuantity);
        const foodPrice = Number(formData.foodPrice);

        if (!foodName) {
            alert("Please enter food name.");
            return;
        }

        if (!Number.isFinite(foodQuantity) || foodQuantity < 0) {
            alert("Please enter a valid quantity.");
            return;
        }

        if (!Number.isFinite(foodPrice) || foodPrice <= 0) {
            alert("Please enter a valid price.");
            return;
        }

        const data = new FormData();
        data.append("foodName", foodName);
        data.append("description", description);
        data.append("foodQuantity", foodQuantity);
        data.append("foodPrice", foodPrice);

        // Only append image if a new file was chosen
        if (imageFile) {
            data.append("foodImage", imageFile);
        }

        await onSave(food._id, data);
    };

    return (
        <div className="fm-fade fixed inset-0 z-[70] flex items-center justify-center bg-[#0a1a3f]/60 p-3 backdrop-blur-sm sm:p-4">
            <div className="fm-pop max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--line)] bg-white shadow-2xl">
                {/* HEADER */}
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-white/95 px-4 py-4 backdrop-blur sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#12306b] to-blue-500 text-white shadow-md shadow-blue-500/30">
                            <Pencil className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-[#0a1a3f]">Edit Food</h2>
                            <p className="mt-0.5 text-xs text-slate-400">
                                Update food item information.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close"
                        className="fm-btn flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-[var(--tint)] hover:text-blue-700 disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-5">
                    {/* IMAGE */}
                    <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">
                            Food Image
                        </label>

                        <label className="group relative block h-44 cursor-pointer overflow-hidden rounded-xl border border-dashed border-blue-200 bg-[var(--tint)] sm:h-48">
                            {preview ? (
                                <>
                                    <img
                                        src={preview}
                                        alt={formData.foodName}
                                        className="h-full w-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-[#0a1a3f]/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
                                            <Upload className="h-4 w-4" />
                                            Change image
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center text-blue-400">
                                    <Upload className="h-7 w-7" />
                                    <p className="mt-2 text-xs font-semibold">Upload image</p>
                                </div>
                            )}

                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                                disabled={saving}
                            />
                        </label>
                    </div>

                    {/* NAME */}
                    <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600">
                            Food Name
                        </label>
                        <input
                            type="text"
                            name="foodName"
                            value={formData.foodName}
                            onChange={handleChange}
                            disabled={saving}
                            className={inputCls}
                        />
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            disabled={saving}
                            rows={3}
                            className={`${inputCls} resize-none`}
                        />
                    </div>

                    {/* PRICE */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-slate-600">
                                Food Price
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-blue-500">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    name="foodPrice"
                                    min="0"
                                    step="0.01"
                                    value={formData.foodPrice}
                                    onChange={handleChange}
                                    disabled={saving}
                                    className={`${inputCls} pl-8`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* BUTTONS */}
                    <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="fm-btn cursor-pointer rounded-lg border border-[var(--line)] px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-[var(--tint)] disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="fm-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#12306b] to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 hover:brightness-110 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Update Food
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}