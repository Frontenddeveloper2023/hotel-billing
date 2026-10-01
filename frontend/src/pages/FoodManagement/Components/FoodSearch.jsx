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
        <div className="relative z-30 flex w-full justify-center">
            <div className="relative w-full max-w-xl">
                {/* SEARCH BAR (blue glass) */}
                <div className="flex h-11 w-full overflow-hidden rounded-xl border border-white/25 bg-white/10 shadow-lg shadow-[#0a1a3f]/20 backdrop-blur-md transition-all duration-300 focus-within:border-sky-300 focus-within:bg-white/15 focus-within:ring-2 focus-within:ring-sky-300/40 sm:h-12">
                    <div className="flex shrink-0 items-center justify-center pl-3 sm:pl-4">
                        <Search className="h-4 w-4 text-white/70 sm:h-5 sm:w-5" />
                    </div>

                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            // User started a new search
                            if (onFoodSelect) onFoodSelect(null);
                            setIsFocused(true);
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 120)}
                        placeholder="Search food, dishes..."
                        className="min-w-0 flex-1 bg-transparent px-3 text-xs font-medium text-white outline-none placeholder:text-white/60 sm:text-sm"
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={handleClear}
                            title="Clear search"
                            aria-label="Clear search"
                            className="flex w-9 shrink-0 cursor-pointer items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}

                    <button
                        type="button"
                        title="Search"
                        aria-label="Search"
                        className="fm-btn flex w-11 shrink-0 cursor-pointer items-center justify-center bg-gradient-to-br from-blue-500 to-sky-400 text-white hover:brightness-110 sm:w-12"
                    >
                        <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                </div>

                {/* RESULTS */}
                {isFocused && search.trim() && (
                    <div className="fm-drop absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-2xl shadow-[#0a1a3f]/25">
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
                                            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--tint)] sm:h-12 sm:w-12">
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

                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-semibold text-[#0a1a3f] sm:text-sm">
                                                    {food.foodName}
                                                </p>
                                                <p className="mt-0.5 text-[10px] font-medium text-blue-600 sm:text-xs">
                                                    ₹{Number(food.foodPrice || 0).toLocaleString("en-IN")}
                                                </p>
                                            </div>

                                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-blue-500" />
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="px-4 py-6 text-center">
                                <Search className="mx-auto h-6 w-6 text-blue-200" />
                                <p className="mt-2 text-xs font-semibold text-slate-600 sm:text-sm">
                                    No food found
                                </p>
                                <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">
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