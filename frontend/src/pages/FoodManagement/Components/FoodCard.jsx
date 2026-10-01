import React, { memo, useState } from "react";
import { Pencil, Trash2, Utensils, ImageOff } from "lucide-react";
import { getFoodImageUrl } from "./Foodimage.js";

function FoodCard({ food, onEdit, onDelete }) {
    const [imgFailed, setImgFailed] = useState(false);

    if (!food) return null;

    const displayImage = getFoodImageUrl(food.foodImage);
    const foodName = food.foodName?.trim() || "Untitled Dish";
    const description =
        food.description?.trim() || "No description provided for this menu item.";
    const price = Number(food.foodPrice || 0).toLocaleString("en-IN");

    return (
        <div className="fm-card group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
            {/* IMAGE */}
            <div className="relative h-40 w-full shrink-0 overflow-hidden bg-[var(--tint)] sm:h-44 lg:h-40 xl:h-44">
                {displayImage && !imgFailed ? (
                    <>
                        <img
                            src={displayImage}
                            alt={foodName}
                            loading="lazy"
                            decoding="async"
                            onError={() => setImgFailed(true)}
                            className="fm-img h-full w-full object-cover"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a1a3f]/25 via-transparent to-transparent" />
                    </>
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-blue-300">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm sm:h-14 sm:w-14">
                            {imgFailed ? (
                                <ImageOff className="h-5 w-5 sm:h-6 sm:w-6" />
                            ) : (
                                <Utensils className="h-5 w-5 sm:h-6 sm:w-6" />
                            )}
                        </div>
                        <span className="mt-2 text-[11px] font-semibold text-slate-400">
                            {imgFailed ? "Image unavailable" : "No image"}
                        </span>
                    </div>
                )}
            </div>

            {/* CONTENT */}
            <div className="flex min-w-0 flex-1 flex-col p-3.5 sm:p-4">
                <div className="flex min-w-0 flex-col gap-2.5 min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between">
                    <div className="min-w-0 flex-1">
                        <h3
                            title={foodName}
                            className="line-clamp-2 break-words text-sm font-bold leading-snug tracking-tight text-[#0a1a3f] sm:text-base"
                        >
                            {foodName}
                        </h3>
                        <p
                            title={description}
                            className="mt-1.5 line-clamp-2 min-h-[30px] text-[11px] leading-relaxed text-slate-500 sm:min-h-[32px] sm:text-xs"
                        >
                            {description}
                        </p>
                    </div>

                    <span className="inline-flex shrink-0 self-start whitespace-nowrap rounded-lg border border-blue-100 bg-[var(--tint)] px-2.5 py-1 text-xs font-extrabold text-blue-700 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-sm">
                        ₹{price}
                    </span>
                </div>

                {/* ACTIONS */}
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3 sm:pt-3.5">
                    <span className="hidden truncate text-[10px] font-medium text-slate-400 min-[400px]:block sm:text-[11px]">
                        Menu item
                    </span>

                    <div className="ml-auto flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onEdit(food)}
                            aria-label={`Edit ${foodName}`}
                            title="Edit food"
                            className="fm-btn flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--tint)] text-slate-600 hover:border-blue-300 hover:bg-blue-600 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:h-10 sm:w-10"
                        >
                            <Pencil className="h-4 w-4 sm:h-[17px] sm:w-[17px]" />
                        </button>

                        <button
                            type="button"
                            onClick={() => onDelete(food)}
                            aria-label={`Delete ${foodName}`}
                            title="Delete food"
                            className="fm-btn flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--tint)] text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 sm:h-10 sm:w-10"
                        >
                            <Trash2 className="h-4 w-4 sm:h-[17px] sm:w-[17px]" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default memo(FoodCard);