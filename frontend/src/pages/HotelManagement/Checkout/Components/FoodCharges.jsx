import React from "react";
import { Utensils } from "lucide-react";

export default function FoodCharges({
    foodOrders = [],
    money,
    formatDate,
}) {
    return (
        <div>
            <div className="flex items-center justify-between gap-3 mb-4">

                <div className="flex items-center gap-3">

                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                        <Utensils className="w-4 h-4 text-orange-600" />
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-800">
                            Food Charges
                        </h3>

                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Food ordered during the stay
                        </p>
                    </div>

                </div>

                <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold">
                    {foodOrders.length} Orders
                </span>

            </div>


            {foodOrders.length > 0 ? (

                <div className="space-y-3">

                    {foodOrders.map((food, index) => {

                        const quantity = Number(
                            food.quantity || 1
                        );

                        const price = Number(
                            food.price ||
                            food.rate ||
                            0
                        );

                        const amount =
                            food.amount !== undefined
                                ? Number(food.amount)
                                : quantity * price;

                        return (
                            <div
                                key={
                                    food.id ||
                                    food._id ||
                                    index
                                }
                                className="rounded-xl border border-slate-200 overflow-hidden"
                            >

                                <div className="p-4">

                                    <div className="flex flex-col sm:flex-row gap-4">

                                        {/* IMAGE */}

                                        <div className="w-full sm:w-20 h-20 rounded-xl overflow-hidden bg-orange-50 shrink-0">

                                            {food.image ||
                                            food.foodImage ? (

                                                <img
                                                    src={
                                                        food.image ||
                                                        food.foodImage
                                                    }
                                                    alt={
                                                        food.name ||
                                                        food.foodName ||
                                                        "Food"
                                                    }
                                                    className="w-full h-full object-cover"
                                                />

                                            ) : (

                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Utensils className="w-6 h-6 text-orange-300" />
                                                </div>

                                            )}

                                        </div>


                                        {/* DETAILS */}

                                        <div className="flex-1 min-w-0">

                                            <div className="flex flex-col sm:flex-row sm:justify-between gap-3">

                                                <div>

                                                    <h4 className="text-sm font-bold text-slate-900">
                                                        {food.name ||
                                                        food.foodName ||
                                                        "Food Order"}
                                                    </h4>

                                                    <p className="text-xs text-slate-500 mt-1">
                                                        {food.description ||
                                                        food.desc ||
                                                        "Food order"}
                                                    </p>

                                                </div>

                                                <div className="sm:text-right">

                                                    <p className="text-base font-bold text-slate-900">
                                                        ₹{money(amount)}
                                                    </p>

                                                    <p className="text-[10px] text-slate-400">
                                                        Total
                                                    </p>

                                                </div>

                                            </div>


                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">

                                                <div className="rounded-lg bg-slate-50 px-3 py-2">
                                                    <p className="text-[9px] uppercase font-bold text-slate-400">
                                                        Quantity
                                                    </p>

                                                    <p className="text-xs font-bold text-slate-700 mt-1">
                                                        {quantity}
                                                    </p>
                                                </div>


                                                <div className="rounded-lg bg-slate-50 px-3 py-2">
                                                    <p className="text-[9px] uppercase font-bold text-slate-400">
                                                        Unit Price
                                                    </p>

                                                    <p className="text-xs font-bold text-slate-700 mt-1">
                                                        ₹{money(price)}
                                                    </p>
                                                </div>


                                                <div className="rounded-lg bg-slate-50 px-3 py-2">

                                                    <p className="text-[9px] uppercase font-bold text-slate-400">
                                                        Order Date
                                                    </p>

                                                    <p className="text-xs font-bold text-slate-700 mt-1">
                                                        {formatDate(
                                                            food.orderDate ||
                                                            food.date
                                                        )}
                                                    </p>

                                                </div>


                                                <div className="rounded-lg bg-slate-50 px-3 py-2">

                                                    <p className="text-[9px] uppercase font-bold text-slate-400">
                                                        Order Time
                                                    </p>

                                                    <p className="text-xs font-bold text-slate-700 mt-1">
                                                        {food.orderTime ||
                                                        food.time ||
                                                        "Not provided"}
                                                    </p>

                                                </div>

                                            </div>

                                        </div>

                                    </div>

                                </div>

                            </div>
                        );
                    })}

                </div>

            ) : (

                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">

                    <Utensils className="w-6 h-6 mx-auto text-slate-300" />

                    <p className="text-xs font-semibold text-slate-500 mt-2">
                        No food charges
                    </p>

                    <p className="text-[10px] text-slate-400 mt-1">
                        No food orders were added to this stay.
                    </p>

                </div>

            )}

        </div>
    );
}