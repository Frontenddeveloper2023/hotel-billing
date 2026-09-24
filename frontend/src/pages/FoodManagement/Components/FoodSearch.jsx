
import React, { useState } from "react";
import { Search, X } from "lucide-react";

export default function FoodSearch({
    search,
    setSearch,
    foods = [],
    onFoodSelect,
}) {
    const [isFocused, setIsFocused] = useState(false);

    // ----------------------------------
    // IMAGE URL
    // ----------------------------------
    const getFoodImageUrl = (imagePath) => {
        if (!imagePath) return "";

        if (
            imagePath.startsWith("http://") ||
            imagePath.startsWith("https://")
        ) {
            return imagePath;
        }

        let baseUrl =
            import.meta.env.VITE_BACKEND_URL ||
            "https://webscape.co.in/hotel-billing-system-backend";

        baseUrl = baseUrl.replace(/\/+$/, "");
        baseUrl = baseUrl.replace(/\/api$/, "");
        baseUrl = baseUrl.replace(
            /\/hotel-billing-system-backend$/,
            ""
        );

        const cleanPath = imagePath.replace(/^\/+/, "");

        const formattedPath = cleanPath.startsWith("uploads/")
            ? cleanPath
            : `uploads/${cleanPath}`;

        return `${baseUrl}/hotel-billing-system-backend/${formattedPath}`;
    };

    // ----------------------------------
    // SEARCH RESULTS
    // ----------------------------------
    const searchResults =
        search.trim().length > 0
            ? foods
                  .filter((food) =>
                      food?.foodName
                          ?.toLowerCase()
                          .includes(search.trim().toLowerCase())
                  )
                  .slice(0, 6)
            : [];

    // ----------------------------------
    // SELECT FOOD
    // ----------------------------------
    const handleFoodSelect = (food) => {
        setSearch(food.foodName);

        setIsFocused(false);

        if (onFoodSelect) {
            onFoodSelect(food);
        }
    };

    // ----------------------------------
    // CLEAR
    // ----------------------------------
    const handleClear = () => {
    setSearch("");
    setIsFocused(false);

    if (onFoodSelect) {
        onFoodSelect(null);
    }
};

    return (
        <div className="w-full flex justify-center">
            <div className="relative w-full max-w-xl">
                {/* =========================================
                    SEARCH BAR
                ========================================= */}
                <div
                    className="
                        flex
                        w-full
                        h-11
                        sm:h-12
                        rounded-xl
                        overflow-hidden
                        border
                        border-slate-300
                        focus-within:border-[var(--teal,#08838d)]
                        focus-within:ring-2
                        focus-within:ring-teal-100
                        transition-all
                        bg-white
                        shadow-sm
                    "
                >
                    {/* SEARCH ICON */}
                    <div className="flex items-center justify-center pl-3 sm:pl-4 shrink-0">
                        <Search
                            className="
                                w-4
                                h-4
                                sm:w-5
                                sm:h-5
                                text-slate-400
                            "
                        />
                    </div>

                    {/* INPUT */}
                   <input
    type="text"
    value={search}
    onChange={(e) => {
        setSearch(e.target.value);

        // User started a new search
        if (onFoodSelect) {
            onFoodSelect(null);
        }

        setIsFocused(true);
    }}
    onFocus={() => setIsFocused(true)}
    placeholder="Search food, dishes..."
    className="
        flex-1
        min-w-0
        px-3
        text-xs
        sm:text-sm
        text-slate-900
        font-medium
        outline-none
        bg-transparent
        placeholder:text-slate-400
    "
/>

                    {/* CLEAR */}
                    {search && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="
                                w-9
                                flex
                                items-center
                                justify-center
                                text-slate-400
                                hover:text-slate-700
                                hover:bg-slate-50
                                cursor-pointer
                                shrink-0
                            "
                            title="Clear search"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    {/* SEARCH BUTTON */}
                    <button
                        type="button"
                        className="
                            w-11
                            sm:w-12
                            bg-[var(--teal,#08838d)]
                            hover:bg-[var(--teal-dark,#066b73)]
                            text-white
                            flex
                            items-center
                            justify-center
                            cursor-pointer
                            shrink-0
                        "
                        title="Search"
                    >
                        <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>

                {/* =========================================
                    AMAZON STYLE SEARCH RESULTS
                ========================================= */}
                {isFocused && search.trim() && (
                    <div
                        className="
                            absolute
                            top-full
                            left-0
                            right-0
                            mt-2
                            bg-white
                            border
                            border-slate-200
                            rounded-xl
                            shadow-xl
                            overflow-hidden
                            z-50
                        "
                    >
                        {searchResults.length > 0 ? (
                            <div className="py-1.5">
                                {searchResults.map((food) => {
                                    const imageUrl = getFoodImageUrl(
                                        food.foodImage
                                    );

                                    return (
                                        <button
                                            key={food._id}
                                            type="button"
                                            onClick={() =>
                                                handleFoodSelect(food)
                                            }
                                            className="
                                                w-full
                                                flex
                                                items-center
                                                gap-3
                                                px-3
                                                sm:px-4
                                                py-2.5
                                                sm:py-3
                                                text-left
                                                hover:bg-slate-50
                                                active:bg-slate-100
                                                transition-colors
                                                cursor-pointer
                                            "
                                        >
                                            {/* FOOD IMAGE */}
                                            <div
                                                className="
                                                    w-11
                                                    h-11
                                                    sm:w-12
                                                    sm:h-12
                                                    rounded-lg
                                                    overflow-hidden
                                                    bg-slate-100
                                                    border
                                                    border-slate-200
                                                    shrink-0
                                                "
                                            >
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt={
                                                            food.foodName ||
                                                            "Food"
                                                        }
                                                        className="
                                                            w-full
                                                            h-full
                                                            object-cover
                                                        "
                                                    />
                                                ) : (
                                                    <div
                                                        className="
                                                            w-full
                                                            h-full
                                                            flex
                                                            items-center
                                                            justify-center
                                                            text-slate-400
                                                        "
                                                    >
                                                        <Search className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* FOOD DETAILS */}
                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className="
                                                        text-xs
                                                        sm:text-sm
                                                        font-semibold
                                                        text-slate-900
                                                        truncate
                                                    "
                                                >
                                                    {food.foodName}
                                                </p>

                                                <p
                                                    className="
                                                        text-[10px]
                                                        sm:text-xs
                                                        text-slate-500
                                                        mt-0.5
                                                    "
                                                >
                                                    ₹
                                                    {Number(
                                                        food.foodPrice || 0
                                                    ).toLocaleString(
                                                        "en-IN"
                                                    )}
                                                </p>
                                            </div>

                                            {/* ARROW */}
                                            <span
                                                className="
                                                    text-slate-300
                                                    text-lg
                                                    shrink-0
                                                "
                                            >
                                                ›
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="px-4 py-6 text-center">
                                <Search className="w-6 h-6 mx-auto text-slate-300" />

                                <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-600">
                                    No food found
                                </p>

                                <p className="mt-1 text-[10px] sm:text-xs text-slate-400">
                                    Try searching with another food name.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
