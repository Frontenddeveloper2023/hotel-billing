import React, { useEffect, useState } from "react";
import { X, Upload, Save } from "lucide-react";

export default function EditFood({
    food,
    onClose,
    onSave,
    saving = false,
}) {
    const [formData, setFormData] = useState({
        foodName: food?.foodName || "",
        description: food?.description || "",
        foodQuantity: food?.foodQuantity ?? "",
        foodPrice: food?.foodPrice ?? "",
    });

    const [imageFile, setImageFile] = useState(null);

    // ----------------------------------
    // RESOLVE IMAGE URL HELPER
    // ----------------------------------
const getImageUrl = (imagePath) => {
        if (!imagePath) return "";
        if (imagePath.startsWith("http") || imagePath.startsWith("blob:")) {
            return imagePath;
        }

        let backendUrl = import.meta.env.VITE_BACKEND_URL || "https://webscape.co.in/hotel-billing-system-backend";

        // Clean trailing slashes, /api, and duplicate subdirectory references if present in env variable
        backendUrl = backendUrl.replace(/\/+$/, "");
        backendUrl = backendUrl.replace(/\/api$/, "");
        backendUrl = backendUrl.replace(/\/hotel-billing-system-backend$/, "");

        const cleanPath = imagePath.replace(/\\/g, "/").replace(/^\/+/, "");
        const formattedPath = cleanPath.startsWith("uploads/") ? cleanPath : `uploads/${cleanPath}`;

        return `${backendUrl}/hotel-billing-system-backend/${formattedPath}`;
    };

    const [preview, setPreview] = useState(getImageUrl(food?.foodImage) || "");

    // ----------------------------------
    // INPUT CHANGE
    // ----------------------------------
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
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
        const imageUrl = URL.createObjectURL(file);
        setPreview(imageUrl);
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

        // Create FormData object (Browser automatically sets multipart headers & boundary)
        const data = new FormData();
        data.append("foodName", foodName);
        data.append("description", description);
        data.append("foodQuantity", foodQuantity);
        data.append("foodPrice", foodPrice);

        // Only append image if a new file was chosen
        if (imageFile) {
            data.append("foodImage", imageFile);
        }

        // Pass ID and FormData to parent's onSave function
        await onSave(food._id, data);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
                {/* HEADER */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            Edit Food
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Update food item information.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    {/* IMAGE */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-2">
                            Food Image
                        </label>

                        <label className="relative block h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer">
                            {preview ? (
                                <img
                                    src={preview}
                                    alt={formData.foodName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <Upload className="w-7 h-7" />
                                    <p className="text-xs font-semibold mt-2">
                                        Upload image
                                    </p>
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
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Food Name
                        </label>
                        <input
                            type="text"
                            name="foodName"
                            value={formData.foodName}
                            onChange={handleChange}
                            disabled={saving}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-[var(--teal,#08838d)] disabled:bg-slate-50"
                        />
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            disabled={saving}
                            rows={3}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none resize-none focus:border-[var(--teal,#08838d)] disabled:bg-slate-50"
                        />
                    </div>

                    {/* QUANTITY + PRICE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       

                        {/* PRICE */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">
                                Food Price
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
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
                                    className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none disabled:bg-slate-50"
                                />
                            </div>
                        </div>
                    </div>

                    {/* BUTTONS */}
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-5 py-2.5 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--teal-dark,#065b62)] text-white text-sm font-bold disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
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