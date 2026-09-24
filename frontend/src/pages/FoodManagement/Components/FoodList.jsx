import React from "react";
import { Utensils } from "lucide-react";
import FoodCard from "./FoodCard";

export default function FoodList({
    foods,
    onEdit,
    onDelete,
}) {
    if (!Array.isArray(foods) || foods.length === 0) {
        return (
            <section className="
                bg-white
                border
                border-slate-200
                rounded-2xl
                p-12
                text-center
            ">
                <Utensils className="w-8 h-8 mx-auto text-slate-300" />

                <p className="
                    text-sm
                    font-bold
                    text-slate-600
                    mt-3
                ">
                    No food items found
                </p>

                <p className="
                    text-xs
                    text-slate-400
                    mt-1
                ">
                    Try another search or add a new food item.
                </p>
            </section>
        );
    }

    return (
        <section className="
            bg-white
            border
            border-slate-200
            rounded-2xl
            overflow-hidden
        ">

            {/* Header */}
            <div className="
                px-5
                py-4
                border-b
                border-slate-100
            ">
                <h2 className="
                    text-sm
                    font-bold
                    text-slate-900
                ">
                    Food Menu
                </h2>

                <p className="
                    text-xs
                    text-slate-400
                    mt-1
                ">
                    {foods.length} food items
                </p>
            </div>

            {/* Food Cards */}
            <div className="
                p-5
                grid
                grid-cols-1
                md:grid-cols-2
                xl:grid-cols-3
                gap-5
            ">
                {foods
                    .filter(Boolean)
                    .map((food) => (
                        <FoodCard
                            key={food._id}
                            food={food}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
            </div>

        </section>
    );
}