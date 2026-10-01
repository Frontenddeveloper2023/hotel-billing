import React, { memo } from "react";
import { Utensils } from "lucide-react";
import FoodCard from "./FoodCard";

function FoodList({ foods, onEdit, onDelete }) {
    if (!Array.isArray(foods) || foods.length === 0) {
        return (
            <section className="fm-fade rounded-2xl border border-[var(--line)] bg-white p-10 text-center shadow-sm sm:p-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--tint)]">
                    <Utensils className="h-7 w-7 text-blue-400" />
                </div>
                <p className="mt-4 text-sm font-bold text-[#0a1a3f]">
                    No food items found
                </p>
               
            </section>
        );
    }

    return (
        <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-4 sm:px-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#12306b] to-blue-500 text-white shadow-md shadow-blue-500/30">
                    <Utensils className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <h2 className="text-sm font-bold text-[#0a1a3f]">Food Menu</h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                        {foods.length} food {foods.length === 1 ? "item" : "items"}
                    </p>
                </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-5 xl:grid-cols-3 2xl:grid-cols-4">
                {foods.filter(Boolean).map((food, i) => (
                    <div
                        key={food._id}
                        className="fm-rise min-w-0"
                        style={{ "--i": Math.min(i, 11) }}
                    >
                        <FoodCard food={food} onEdit={onEdit} onDelete={onDelete} />
                    </div>
                ))}
            </div>
        </section>
    );
}

export default memo(FoodList);