
import React, { useEffect, useState } from "react";
import {
    X,
    Upload,
    Utensils,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";

export default function AddFood({
    onClose,
    onSave,
    saving = false,
}) {
    const [foodName, setFoodName] = useState("");
    const [description, setDescription] = useState("");
    const [foodPrice, setFoodPrice] = useState("");

    const [imageFile, setImageFile] = useState(null);
    const [preview, setPreview] = useState("");

    // ----------------------------------
    // VALIDATION ERRORS
    // ----------------------------------
    const [errors, setErrors] = useState({});

    // ----------------------------------
    // TOUCHED FIELDS
    // ----------------------------------
    const [touched, setTouched] = useState({});

    // ----------------------------------
    // CLEAN PREVIEW URL
    // ----------------------------------
    useEffect(() => {
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    // ----------------------------------
    // VALIDATE ONE FIELD
    // ----------------------------------
    const validateField = (field, value) => {
        let error = "";

        // -------------------------------
        // FOOD NAME
        // -------------------------------
        if (field === "foodName") {
            const valueTrimmed = value.trim();

            if (!valueTrimmed) {
                error =
                    "Food name is required. Example: Chicken Biryani.";
            } else if (valueTrimmed.length < 2) {
                error =
                    "Food name should contain at least 2 characters.";
            } else if (valueTrimmed.length > 100) {
                error =
                    "Food name should not be longer than 100 characters.";
            }
        }

        // -------------------------------
        // DESCRIPTION
        // -------------------------------
        if (field === "description") {
            // Description is optional
            if (value.trim().length > 500) {
                error =
                    "Description is too long. Please keep it under 500 characters.";
            }
        }

        // -------------------------------
        // FOOD PRICE
        // -------------------------------
        if (field === "foodPrice") {
            if (value === "") {
                error =
                    "Food price is required. Example: ₹250.";
            } else if (Number.isNaN(Number(value))) {
                error =
                    "Please enter a valid price. Example: ₹250.";
            } else if (Number(value) < 0) {
                error =
                    "Food price cannot be negative.";
            }
        }

        return error;
    };

    // ----------------------------------
    // VALIDATE ENTIRE FORM
    // ----------------------------------
    const validateForm = () => {
        const newErrors = {};

        const foodNameError = validateField(
            "foodName",
            foodName
        );

        const descriptionError = validateField(
            "description",
            description
        );

        const foodPriceError = validateField(
            "foodPrice",
            foodPrice
        );

        if (foodNameError) {
            newErrors.foodName = foodNameError;
        }

        if (descriptionError) {
            newErrors.description = descriptionError;
        }

        if (foodPriceError) {
            newErrors.foodPrice = foodPriceError;
        }

        setErrors(newErrors);

        // Mark required/used fields as touched
        setTouched({
            foodName: true,
            description: true,
            foodPrice: true,
        });

        return Object.keys(newErrors).length === 0;
    };

    // ----------------------------------
    // INPUT CHANGE
    // ----------------------------------
    const handleFoodNameChange = (e) => {
        const value = e.target.value;

        setFoodName(value);

        if (touched.foodName) {
            setErrors((prev) => ({
                ...prev,
                foodName: validateField(
                    "foodName",
                    value
                ),
            }));
        }
    };

    const handleDescriptionChange = (e) => {
        const value = e.target.value;

        setDescription(value);

        if (touched.description) {
            setErrors((prev) => ({
                ...prev,
                description: validateField(
                    "description",
                    value
                ),
            }));
        }
    };

    const handlePriceChange = (e) => {
        const value = e.target.value;

        setFoodPrice(value);

        if (touched.foodPrice) {
            setErrors((prev) => ({
                ...prev,
                foodPrice: validateField(
                    "foodPrice",
                    value
                ),
            }));
        }
    };

    // ----------------------------------
    // BLUR VALIDATION
    // ----------------------------------
    const handleBlur = (field, value) => {
        setTouched((prev) => ({
            ...prev,
            [field]: true,
        }));

        const error = validateField(field, value);

        setErrors((prev) => ({
            ...prev,
            [field]: error,
        }));
    };

    // ----------------------------------
    // IMAGE CHANGE
    // ----------------------------------
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        // Validate image type
        if (!file.type.startsWith("image/")) {
            setErrors((prev) => ({
                ...prev,
                image:
                    "Please select a valid image. JPG, JPEG, PNG or WEBP are recommended.",
            }));

            setTouched((prev) => ({
                ...prev,
                image: true,
            }));

            return;
        }

        // Maximum 5 MB
        if (file.size > 5 * 1024 * 1024) {
            setErrors((prev) => ({
                ...prev,
                image:
                    "Image size is too large. Please choose an image smaller than 5 MB.",
            }));

            setTouched((prev) => ({
                ...prev,
                image: true,
            }));

            return;
        }

        // Remove old preview
        if (preview) {
            URL.revokeObjectURL(preview);
        }

        setImageFile(file);
        setPreview(URL.createObjectURL(file));

        setErrors((prev) => ({
            ...prev,
            image: "",
        }));

        setTouched((prev) => ({
            ...prev,
            image: true,
        }));
    };

    // ----------------------------------
    // REMOVE IMAGE
    // ----------------------------------
    const handleRemoveImage = () => {
        if (preview) {
            URL.revokeObjectURL(preview);
        }

        setImageFile(null);
        setPreview("");

        setErrors((prev) => ({
            ...prev,
            image: "",
        }));
    };

    // ----------------------------------
    // SUBMIT
    // ----------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();

        const isValid = validateForm();

        if (!isValid) {
            // Find first invalid field
            if (!foodName.trim()) {
                document
                    .getElementById("foodName")
                    ?.focus();
                return;
            }

            if (foodPrice === "") {
                document
                    .getElementById("foodPrice")
                    ?.focus();
                return;
            }

            return;
        }

        // Check image validation before submit
        if (errors.image) {
            return;
        }

        const formData = new FormData();

        formData.append(
            "foodName",
            foodName.trim()
        );

        formData.append(
            "description",
            description.trim()
        );

        formData.append(
            "foodPrice",
            Number(foodPrice)
        );

        if (imageFile) {
            formData.append(
                "foodImage",
                imageFile
            );
        }

        await onSave(formData);
    };

    // ----------------------------------
    // INPUT STYLE
    // ----------------------------------
    const getInputClass = (field) => {
        const hasError =
            touched[field] && errors[field];

        return `
            w-full
            rounded-xl
            border
            px-3.5
            sm:px-4
            py-3
            text-sm
            text-slate-900
            outline-none
            transition-all
            placeholder:text-slate-400
            disabled:bg-slate-100
            disabled:cursor-not-allowed
            ${
                hasError
                    ? `
                        border-rose-400
                        bg-rose-50/30
                        focus:border-rose-500
                        focus:ring-2
                        focus:ring-rose-100
                    `
                    : `
                        border-slate-200
                        bg-slate-50/50
                        focus:bg-white
                        focus:border-teal-500
                        focus:ring-2
                        focus:ring-teal-100
                    `
            }
        `;
    };

    return (
        <div
            className="
                fixed
                inset-0
                z-[9999]

                flex
                items-center
                justify-center

                bg-slate-900/60
                backdrop-blur-sm

                p-3
                sm:p-4

                overflow-y-auto
            "
            onMouseDown={(e) => {
                if (
                    e.target === e.currentTarget &&
                    !saving
                ) {
                    onClose();
                }
            }}
        >
            {/* ==================================================
                MODAL
            ================================================== */}
            <div
                className="
                    w-full
                    max-w-lg

                    max-h-[94vh]
                    sm:max-h-[90vh]

                    overflow-y-auto

                    bg-white
                    rounded-2xl
                    sm:rounded-3xl

                    shadow-2xl

                    border
                    border-slate-200

                    my-auto
                "
                onMouseDown={(e) =>
                    e.stopPropagation()
                }
            >
                {/* ==================================================
                    HEADER
                ================================================== */}
                <div
                    className="
                        sticky
                        top-0
                        z-10

                        flex
                        items-center
                        justify-between

                        px-4
                        sm:px-6

                        py-4
                        sm:py-5

                        bg-white

                        border-b
                        border-slate-100
                    "
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="
                                w-10
                                h-10

                                rounded-xl

                                bg-teal-50

                                flex
                                items-center
                                justify-center

                                shrink-0
                            "
                        >
                            <Utensils
                                className="
                                    w-5
                                    h-5
                                    text-[var(--teal-dark,#065b62)]
                                "
                            />
                        </div>

                        <div className="min-w-0">
                            <h2
                                className="
                                    text-base
                                    sm:text-lg

                                    font-bold
                                    text-slate-900
                                "
                            >
                                Add Food
                            </h2>

                            <p
                                className="
                                    text-[10px]
                                    sm:text-xs

                                    text-slate-500
                                    mt-0.5
                                "
                            >
                                Add a new item to your menu
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="
                            w-9
                            h-9

                            rounded-xl

                            flex
                            items-center
                            justify-center

                            text-slate-400

                            hover:bg-slate-100
                            hover:text-slate-800

                            active:scale-95

                            transition-all

                            cursor-pointer

                            disabled:opacity-50
                            disabled:cursor-not-allowed

                            shrink-0
                        "
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ==================================================
                    FORM
                ================================================== */}
                <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="
                        p-4
                        sm:p-6

                        space-y-5
                    "
                >
                    {/* ==================================================
                        FOOD NAME
                    ================================================== */}
                    <div>
                        <label
                            htmlFor="foodName"
                            className="
                                block
                                text-sm
                                font-semibold
                                text-slate-800
                                mb-1.5
                            "
                        >
                            Food Name
                            <span className="text-rose-500 ml-1">
                                *
                            </span>
                        </label>

                        <input
                            id="foodName"
                            type="text"
                            value={foodName}
                            onChange={handleFoodNameChange}
                            onBlur={() =>
                                handleBlur(
                                    "foodName",
                                    foodName
                                )
                            }
                            placeholder="e.g. Chicken Biryani"
                            disabled={saving}
                            autoComplete="off"
                            className={getInputClass(
                                "foodName"
                            )}
                        />

                        {touched.foodName &&
                        errors.foodName ? (
                            <div
                                className="
                                    flex
                                    items-start
                                    gap-1.5
                                    mt-1.5
                                    text-rose-600
                                "
                            >
                                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />

                                <p className="text-[11px] sm:text-xs leading-relaxed">
                                    {errors.foodName}
                                </p>
                            </div>
                        ) : (
                            <p
                                className="
                                    text-[10px]
                                    sm:text-[11px]
                                    text-slate-400
                                    mt-1.5
                                "
                            >
                                Example: Chicken Biryani,
                                Paneer Butter Masala
                            </p>
                        )}
                    </div>

                    {/* ==================================================
                        DESCRIPTION
                    ================================================== */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label
                                htmlFor="description"
                                className="
                                    block
                                    text-sm
                                    font-semibold
                                    text-slate-800
                                "
                            >
                                Description
                            </label>

                            <span
                                className="
                                    text-[10px]
                                    text-slate-400
                                "
                            >
                                Optional
                            </span>
                        </div>

                        <textarea
                            id="description"
                            value={description}
                            onChange={
                                handleDescriptionChange
                            }
                            onBlur={() =>
                                handleBlur(
                                    "description",
                                    description
                                )
                            }
                            placeholder="e.g. Basmati rice cooked with chicken and aromatic spices"
                            rows={3}
                            maxLength={500}
                            disabled={saving}
                            className={`
                                ${getInputClass(
                                    "description"
                                )}
                                resize-none
                            `}
                        />

                        <div className="flex justify-between gap-2 mt-1.5">
                            {touched.description &&
                            errors.description ? (
                                <div
                                    className="
                                        flex
                                        items-start
                                        gap-1.5
                                        text-rose-600
                                    "
                                >
                                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />

                                    <p className="text-[11px] sm:text-xs">
                                        {
                                            errors.description
                                        }
                                    </p>
                                </div>
                            ) : (
                                <p
                                    className="
                                        text-[10px]
                                        sm:text-[11px]
                                        text-slate-400
                                    "
                                >
                                    Briefly describe the
                                    food item.
                                </p>
                            )}

                            <span
                                className="
                                    text-[10px]
                                    text-slate-400
                                    shrink-0
                                "
                            >
                                {description.length}/500
                            </span>
                        </div>
                    </div>

                    {/* ==================================================
                        FOOD PRICE
                    ================================================== */}
                    <div>
                        <label
                            htmlFor="foodPrice"
                            className="
                                block
                                text-sm
                                font-semibold
                                text-slate-800
                                mb-1.5
                            "
                        >
                            Food Price
                            <span className="text-rose-500 ml-1">
                                *
                            </span>
                        </label>

                        <div className="relative">
                            <span
                                className="
                                    absolute
                                    left-4
                                    top-1/2
                                    -translate-y-1/2

                                    text-slate-500
                                    font-semibold

                                    pointer-events-none
                                "
                            >
                                ₹
                            </span>

                            <input
                                id="foodPrice"
                                type="number"
                                min="0"
                                step="0.01"
                                value={foodPrice}
                                onChange={handlePriceChange}
                                onBlur={() =>
                                    handleBlur(
                                        "foodPrice",
                                        foodPrice
                                    )
                                }
                                placeholder="250"
                                disabled={saving}
                                inputMode="decimal"
                                className={`
                                    ${getInputClass(
                                        "foodPrice"
                                    )}
                                    pl-9
                                `}
                            />
                        </div>

                        {touched.foodPrice &&
                        errors.foodPrice ? (
                            <div
                                className="
                                    flex
                                    items-start
                                    gap-1.5
                                    mt-1.5
                                    text-rose-600
                                "
                            >
                                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />

                                <p className="text-[11px] sm:text-xs leading-relaxed">
                                    {errors.foodPrice}
                                </p>
                            </div>
                        ) : (
                            <p
                                className="
                                    text-[10px]
                                    sm:text-[11px]
                                    text-slate-400
                                    mt-1.5
                                "
                            >
                                Example: ₹250
                            </p>
                        )}
                    </div>

                    {/* ==================================================
                        FOOD IMAGE
                    ================================================== */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label
                                className="
                                    block
                                    text-sm
                                    font-semibold
                                    text-slate-800
                                "
                            >
                                Food Image
                            </label>

                            <span
                                className="
                                    text-[10px]
                                    text-slate-400
                                "
                            >
                                Optional
                            </span>
                        </div>

                        <label
                            className={`
                                block
                                border-2
                                border-dashed
                                rounded-2xl
                                overflow-hidden
                                transition-all
                                ${
                                    errors.image
                                        ? "border-rose-300 bg-rose-50/20"
                                        : "border-slate-200 hover:border-teal-400 hover:bg-teal-50/20"
                                }
                                ${
                                    saving
                                        ? "cursor-not-allowed opacity-70"
                                        : "cursor-pointer"
                                }
                            `}
                        >
                            {preview ? (
                                <div className="relative">
                                    <img
                                        src={preview}
                                        alt="Food preview"
                                        className="
                                            w-full
                                            h-48
                                            sm:h-56
                                            object-cover
                                        "
                                    />

                                    {/* IMAGE OVERLAY */}
                                    <div
                                        className="
                                            absolute
                                            inset-0
                                            bg-black/35
                                            flex
                                            items-center
                                            justify-center
                                            opacity-0
                                            hover:opacity-100
                                            transition-opacity
                                        "
                                    >
                                        <span
                                            className="
                                                px-4
                                                py-2
                                                rounded-xl
                                                bg-white
                                                text-xs
                                                sm:text-sm
                                                font-semibold
                                                text-slate-800
                                            "
                                        >
                                            Change Image
                                        </span>
                                    </div>

                                    {/* IMAGE NAME */}
                                    <div
                                        className="
                                            absolute
                                            left-2
                                            right-2
                                            bottom-2

                                            px-3
                                            py-2

                                            rounded-lg

                                            bg-black/60
                                            backdrop-blur-sm

                                            text-white
                                            text-[10px]
                                            sm:text-xs

                                            truncate
                                        "
                                    >
                                        {imageFile?.name}
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="
                                        h-40
                                        sm:h-44

                                        flex
                                        flex-col
                                        items-center
                                        justify-center

                                        px-4
                                    "
                                >
                                    <div
                                        className="
                                            w-12
                                            h-12

                                            rounded-full

                                            bg-teal-50

                                            flex
                                            items-center
                                            justify-center
                                        "
                                    >
                                        <Upload
                                            className="
                                                w-5
                                                h-5
                                                text-teal-700
                                            "
                                        />
                                    </div>

                                    <span
                                        className="
                                            text-sm
                                            font-semibold
                                            text-slate-700
                                            mt-3
                                        "
                                    >
                                        Upload food image
                                    </span>

                                    <span
                                        className="
                                            text-[10px]
                                            sm:text-xs
                                            text-slate-400
                                            mt-1
                                            text-center
                                        "
                                    >
                                        JPG, JPEG, PNG or WEBP
                                        · Max 5 MB
                                    </span>
                                </div>
                            )}

                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/jpg"
                                onChange={
                                    handleImageChange
                                }
                                className="hidden"
                                disabled={saving}
                            />
                        </label>

                        {/* IMAGE ERROR */}
                        {errors.image && (
                            <div
                                className="
                                    flex
                                    items-start
                                    gap-1.5
                                    mt-1.5
                                    text-rose-600
                                "
                            >
                                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />

                                <p className="text-[11px] sm:text-xs">
                                    {errors.image}
                                </p>
                            </div>
                        )}

                        {/* REMOVE IMAGE */}
                        {preview && !saving && (
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="
                                    mt-2
                                    text-[11px]
                                    sm:text-xs
                                    font-semibold
                                    text-rose-500
                                    hover:text-rose-700
                                    cursor-pointer
                                "
                            >
                                Remove image
                            </button>
                        )}
                    </div>

                    {/* ==================================================
                        FORM INFORMATION
                    ================================================== */}
                    <div
                        className="
                            flex
                            items-start
                            gap-2.5

                            rounded-xl

                            bg-slate-50
                            border
                            border-slate-100

                            px-3.5
                            py-3
                        "
                    >
                        <CheckCircle2
                            className="
                                w-4
                                h-4
                                text-teal-600
                                mt-0.5
                                shrink-0
                            "
                        />

                        <p
                            className="
                                text-[10px]
                                sm:text-[11px]
                                text-slate-500
                                leading-relaxed
                            "
                        >
                            Fields marked with{" "}
                            <span className="text-rose-500 font-bold">
                                *
                            </span>{" "}
                            are required. You can add a
                            description and image later if
                            needed.
                        </p>
                    </div>

                    {/* ==================================================
                        BUTTONS
                    ================================================== */}
                    <div
                        className="
                            flex
                            flex-col-reverse
                            sm:flex-row

                            gap-2.5

                            pt-4

                            border-t
                            border-slate-100
                        "
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="
                                w-full
                                sm:w-auto

                                px-5
                                py-2.5

                                rounded-xl

                                border
                                border-slate-200

                                bg-white

                                text-sm
                                font-semibold
                                text-slate-700

                                hover:bg-slate-50
                                hover:border-slate-300

                                active:scale-[0.98]

                                transition-all

                                cursor-pointer

                                disabled:opacity-50
                                disabled:cursor-not-allowed
                            "
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="
                                w-full
                                sm:w-auto

                                sm:min-w-[130px]

                                px-5
                                py-2.5

                                rounded-xl

                                bg-[var(--teal-dark,#065b62)]

                                text-white
                                text-sm
                                font-bold

                                hover:bg-[var(--teal,#08838d)]

                                active:scale-[0.98]

                                transition-all

                                cursor-pointer

                                disabled:opacity-50
                                disabled:cursor-not-allowed

                                flex
                                items-center
                                justify-center
                                gap-2
                            "
                        >
                            {saving && (
                                <span
                                    className="
                                        w-4
                                        h-4
                                        rounded-full
                                        border-2
                                        border-white/30
                                        border-t-white
                                        animate-spin
                                    "
                                />
                            )}

                            {saving
                                ? "Adding..."
                                : "Add Food"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
