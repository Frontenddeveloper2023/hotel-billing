import React, { memo, useMemo, useState } from "react";
import { Search, X, ChevronRight } from "lucide-react";
import { getFoodImageUrl } from "./Foodimage.js";

function FoodSearch({ search, setSearch, foods = [], onFoodSelect }) {
    const [isFocused, setIsFocused] = useState(false);

    // ----------------------------------
    // SEARCH RESULTS
    // ----------------------------------
    const searchResults = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return [];
        return foods
            .filter((food) => food?.foodName?.toLowerCase().includes(q))
            .slice(0, 6);
    }, [foods, search]);

    // ----------------------------------
    // SELECT FOOD
    // ----------------------------------
    const handleFoodSelect = (food) => {
        setSearch(food.foodName);
        setIsFocused(false);
        if (onFoodSelect) onFoodSelect(food);
    };

    // ----------------------------------
    // CLEAR
    // ----------------------------------
    const handleClear = () => {
        setSearch("");
        setIsFocused(false);
        if (onFoodSelect) onFoodSelect(null);
    };

    return (
        <div className="relative z-30 flex w-full justify-center px-2 sm:px-4">
            <div className="relative w-full max-w-xl">
                {/* SEARCH BAR (Clean White High-Contrast) */}
                <div className="relative w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />

                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            if (onFoodSelect) onFoodSelect(null);
                            setIsFocused(true);
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                        placeholder="Search food, dishes..."
                        className="staylio-search-input"
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={handleClear}
                            title="Clear search"
                            aria-label="Clear search"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-black hover:bg-slate-100 transition cursor-pointer"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* RESULTS */}
                {isFocused && search.trim() && (
                    <div className="fm-drop absolute left-0 right-0 top-full z-50 mt-2 max-h-72 overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--line)] bg-white shadow-2xl shadow-[#0a1a3f]/25">
                        {searchResults.length > 0 ? (
                            <div className="py-1.5">
                                {searchResults.map((food) => {
                                    const imageUrl = getFoodImageUrl(food.foodImage);

                                    return (
                                        <button
                                            key={food._id}
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => handleFoodSelect(food)}
                                            className="group flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--tint)] active:bg-blue-100 sm:px-4 sm:py-3"
                                        >
                                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--tint)] sm:h-12 sm:w-12">
                                                {imageUrl ? (
                                                    <img
                                                        src={imageUrl}
                                                        alt={food.foodName || "Food"}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-blue-300">
                                                        <Search className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1 pr-1">
                                                <p className="truncate text-xs font-semibold text-[#0a1a3f] sm:text-sm">
                                                    {food.foodName}
                                                </p>
                                                <p className="mt-0.5 text-[10px] font-medium text-blue-600 sm:text-xs">
                                                    ₹{Number(food.foodPrice || 0).toLocaleString("en-IN")}
                                                </p>
                                            </div>

                                            <ChevronRight className="h-4 w-4 shrink-0 text-black transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-blue-500" />
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="px-4 py-6 text-center">
                                <Search className="mx-auto h-6 w-6 text-blue-200" />
                                <p className="mt-2 text-xs font-semibold text-black sm:text-sm">
                                    No food found
                                </p>
                                <p className="mt-1 text-[10px] text-black sm:text-xs">
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

export default memo(FoodSearch);