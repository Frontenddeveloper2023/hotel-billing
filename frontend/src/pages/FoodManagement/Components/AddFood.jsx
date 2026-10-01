import React, { useEffect, useState } from "react";
import { X, Upload, Utensils, CheckCircle2, AlertCircle } from "lucide-react";

export default function AddFood({ onClose, onSave, saving = false }) {
    const [foodName, setFoodName] = useState("");
    const [description, setDescription] = useState("");
    const [foodPrice, setFoodPrice] = useState("");

    const [imageFile, setImageFile] = useState(null);
    const [preview, setPreview] = useState("");

    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // ----------------------------------
    // CLEAN PREVIEW URL
    // ----------------------------------
    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    // ----------------------------------
    // VALIDATE ONE FIELD
    // ----------------------------------
    const validateField = (field, value) => {
        let error = "";

        if (field === "foodName") {
            const v = value.trim();
            if (!v) error = "Food name is required. Example: Chicken Biryani.";
            else if (v.length < 2) error = "Food name should contain at least 2 characters.";
            else if (v.length > 100) error = "Food name should not be longer than 100 characters.";
        }

        if (field === "description") {
            // Description is optional
            if (value.trim().length > 500) {
                error = "Description is too long. Please keep it under 500 characters.";
            }
        }

        if (field === "foodPrice") {
            if (value === "") error = "Food price is required. Example: ₹250.";
            else if (Number.isNaN(Number(value))) error = "Please enter a valid price. Example: ₹250.";
            else if (Number(value) < 0) error = "Food price cannot be negative.";
        }

        return error;
    };

    // ----------------------------------
    // VALIDATE ENTIRE FORM
    // ----------------------------------
    const validateForm = () => {
        const newErrors = {};

        const foodNameError = validateField("foodName", foodName);
        const descriptionError = validateField("description", description);
        const foodPriceError = validateField("foodPrice", foodPrice);

        if (foodNameError) newErrors.foodName = foodNameError;
        if (descriptionError) newErrors.description = descriptionError;
        if (foodPriceError) newErrors.foodPrice = foodPriceError;

        setErrors(newErrors);
        setTouched({ foodName: true, description: true, foodPrice: true });

        return Object.keys(newErrors).length === 0;
    };

    // ----------------------------------
    // INPUT CHANGE
    // ----------------------------------
    const handleFoodNameChange = (e) => {
        const value = e.target.value;
        setFoodName(value);
        if (touched.foodName) {
            setErrors((prev) => ({ ...prev, foodName: validateField("foodName", value) }));
        }
    };

    const handleDescriptionChange = (e) => {
        const value = e.target.value;
        setDescription(value);
        if (touched.description) {
            setErrors((prev) => ({ ...prev, description: validateField("description", value) }));
        }
    };

    const handlePriceChange = (e) => {
        const value = e.target.value;
        setFoodPrice(value);
        if (touched.foodPrice) {
            setErrors((prev) => ({ ...prev, foodPrice: validateField("foodPrice", value) }));
        }
    };

    // ----------------------------------
    // BLUR VALIDATION
    // ----------------------------------
    const handleBlur = (field, value) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    };

    // ----------------------------------
    // IMAGE CHANGE
    // ----------------------------------
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setErrors((prev) => ({
                ...prev,
                image: "Please select a valid image. JPG, JPEG, PNG or WEBP are recommended.",
            }));
            setTouched((prev) => ({ ...prev, image: true }));
            return;
        }

        // Maximum 5 MB
        if (file.size > 5 * 1024 * 1024) {
            setErrors((prev) => ({
                ...prev,
                image: "Image size is too large. Please choose an image smaller than 5 MB.",
            }));
            setTouched((prev) => ({ ...prev, image: true }));
            return;
        }

        if (preview) URL.revokeObjectURL(preview);

        setImageFile(file);
        setPreview(URL.createObjectURL(file));
        setErrors((prev) => ({ ...prev, image: "" }));
        setTouched((prev) => ({ ...prev, image: true }));
    };

    // ----------------------------------
    // REMOVE IMAGE
    // ----------------------------------
    const handleRemoveImage = () => {
        if (preview) URL.revokeObjectURL(preview);
        setImageFile(null);
        setPreview("");
        setErrors((prev) => ({ ...prev, image: "" }));
    };

    // ----------------------------------
    // SUBMIT
    // ----------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();

        const isValid = validateForm();

        if (!isValid) {
            if (!foodName.trim()) {
                document.getElementById("foodName")?.focus();
                return;
            }
            if (foodPrice === "") {
                document.getElementById("foodPrice")?.focus();
                return;
            }
            return;
        }

        if (errors.image) return;

        const formData = new FormData();
        formData.append("foodName", foodName.trim());
        formData.append("description", description.trim());
        formData.append("foodPrice", Number(foodPrice));

        if (imageFile) {
            formData.append("foodImage", imageFile);
        }

        await onSave(formData);
    };

    // ----------------------------------
    // INPUT STYLE
    // ----------------------------------
    const getInputClass = (field) => {
        const hasError = touched[field] && errors[field];
        return `w-full rounded-xl border px-3.5 py-3 text-sm text-[#0a1a3f] outline-none transition-all placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 sm:px-4 ${
            hasError
                ? "border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                : "border-[var(--line)] bg-[var(--tint)]/40 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        }`;
    };

    const renderError = (field) =>
        touched[field] && errors[field] ? (
            <div className="fm-drop mt-1.5 flex items-start gap-1.5 text-rose-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p className="text-[11px] sm:text-xs">{errors[field]}</p>
            </div>
        ) : null;

    const labelCls = "mb-1.5 block text-xs font-bold text-slate-600 sm:text-[13px]";

    return (
        <div
            className="fm-fade fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#0a1a3f]/60 p-3 backdrop-blur-sm sm:p-4"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !saving) onClose();
            }}
        >
            <div
                className="fm-pop my-auto max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--line)] bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-3xl"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-white/95 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#12306b] to-blue-500 text-white shadow-md shadow-blue-500/30 sm:h-11 sm:w-11">
                            <Utensils className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold text-[#0a1a3f] sm:text-lg">Add Food</h2>
                            <p className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">
                                Add a new item to your menu
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

                <form onSubmit={handleSubmit} noValidate className="space-y-5 p-4 sm:p-6">
                    {/* FOOD NAME */}
                    <div>
                        <label htmlFor="foodName" className={labelCls}>
                            Food Name<span className="ml-1 text-rose-500">*</span>
                        </label>
                        <input
                            id="foodName"
                            type="text"
                            value={foodName}
                            onChange={handleFoodNameChange}
                            onBlur={() => handleBlur("foodName", foodName)}
                            disabled={saving}
                            placeholder="e.g. Chicken Biryani"
                            className={getInputClass("foodName")}
                        />
                        {renderError("foodName")}
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                        <label htmlFor="description" className={labelCls}>
                            Description
                        </label>
                        <textarea
                            id="description"
                            rows={3}
                            value={description}
                            onChange={handleDescriptionChange}
                            onBlur={() => handleBlur("description", description)}
                            disabled={saving}
                            maxLength={500}
                            placeholder="e.g. Basmati rice cooked with chicken and aromatic spices"
                            className={`${getInputClass("description")} resize-none`}
                        />
                        <div className="mt-1.5 flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                {renderError("description")}
                            </div>
                            <span className="ml-auto shrink-0 text-[11px] text-slate-400">
                                {description.length}/500
                            </span>
                        </div>
                    </div>

                    {/* PRICE */}
                    <div>
                        <label htmlFor="foodPrice" className={labelCls}>
                            Food Price<span className="ml-1 text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-500">
                                ₹
                            </span>
                            <input
                                id="foodPrice"
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                value={foodPrice}
                                onChange={handlePriceChange}
                                onBlur={() => handleBlur("foodPrice", foodPrice)}
                                disabled={saving}
                                placeholder="250"
                                className={`${getInputClass("foodPrice")} pl-8 sm:pl-9`}
                            />
                        </div>
                        {renderError("foodPrice")}
                    </div>

                    {/* IMAGE */}
                    <div>
                        <label className={labelCls}>Food Image</label>

                        <label className="group relative block h-40 cursor-pointer overflow-hidden rounded-xl border border-dashed border-blue-200 bg-[var(--tint)] transition-colors hover:border-blue-400 sm:h-44">
                            {preview ? (
                                <>
                                    <img src={preview} alt="Food preview" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-[#0a1a3f]/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
                                            <Upload className="h-4 w-4" />
                                            Change image
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center px-3">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm">
                                        <Upload className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <span className="mt-3 text-sm font-semibold text-[#12306b]">
                                        Upload food image
                                    </span>
                                    <span className="mt-1 text-center text-[10px] text-slate-400 sm:text-xs">
                                        JPG, JPEG, PNG or WEBP · Max 5 MB
                                    </span>
                                </div>
                            )}

                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/jpg"
                                onChange={handleImageChange}
                                className="hidden"
                                disabled={saving}
                            />
                        </label>

                        {errors.image && (
                            <div className="fm-drop mt-1.5 flex items-start gap-1.5 text-rose-600">
                                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <p className="text-[11px] sm:text-xs">{errors.image}</p>
                            </div>
                        )}

                        {preview && !saving && (
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="mt-2 cursor-pointer text-[11px] font-semibold text-rose-500 hover:text-rose-700 sm:text-xs"
                            >
                                Remove image
                            </button>
                        )}
                    </div>

                    {/* INFO */}
                    <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-[var(--tint)] px-3.5 py-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <p className="text-[10px] leading-relaxed text-slate-500 sm:text-[11px]">
                            Fields marked with <span className="font-bold text-rose-500">*</span> are
                            required. You can add a description and image later if needed.
                        </p>
                    </div>

                    {/* BUTTONS */}
                    <div className="flex flex-col-reverse gap-2.5 border-t border-[var(--line)] pt-4 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="fm-btn w-full cursor-pointer rounded-xl border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-[var(--tint)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="fm-btn flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#12306b] to-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-600/25 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[130px]"
                        >
                            {saving && (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            )}
                            {saving ? "Adding..." : "Add Food"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}