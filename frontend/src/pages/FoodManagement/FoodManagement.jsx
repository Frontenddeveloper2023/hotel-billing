import React, { useEffect, useMemo, useState } from "react";

import FoodSearch from "./Components/FoodSearch";
import FoodList from "./Components/FoodList";
import AddFood from "./Components/AddFood";
import EditFood from "./Components/EditFood";
import DeleteFood from "./Components/DeleteFood";

import {
    getAllFoods,
    createFood,
    updateFood,
    deleteFood,
} from "../../service/foodService";

export default function FoodManagement() {
    const [foods, setFoods] = useState([]);
    const [search, setSearch] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [editingFood, setEditingFood] = useState(null);
    const [deletingFood, setDeletingFood] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [selectedFood, setSelectedFood] = useState(null);

    // ----------------------------------
    // GET ALL FOODS
    // ----------------------------------
    const fetchFoods = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getAllFoods();

            const foodData =
                response?.foods ||
                response?.data ||
                [];

            setFoods(Array.isArray(foodData) ? foodData : []);
        } catch (error) {
            console.error("Get foods error:", error);

            setError(
                error?.message ||
                error?.error ||
                "Failed to load food items."
            );
        } finally {
            setLoading(false);
        }
    };

    // ----------------------------------
    // LOAD FOODS ON PAGE LOAD
    // ----------------------------------
    useEffect(() => {
        fetchFoods();
    }, []);

    // ----------------------------------
    // SEARCH
    // ----------------------------------

    const filteredFoods = useMemo(() => {
    // If user selected a specific food from search suggestions
    if (selectedFood) {
        return [selectedFood];
    }

    const query = search.toLowerCase().trim();

    if (!query) {
        return foods;
    }

    return foods.filter((food) => {
        return (
            food.foodName
                ?.toLowerCase()
                .includes(query) ||
            food.description
                ?.toLowerCase()
                .includes(query)
        );
    });
}, [foods, search, selectedFood]);

// ----------------------------------
    // ADD FOOD
    // ----------------------------------
    const handleAddFood = async (formData) => {
        try {
            setSaving(true);
            setError("");

            await createFood(formData);

            setShowAdd(false);
            await fetchFoods(); // Fetch fresh data from DB, exactly like update does
        } catch (error) {
            console.error("Create food error:", error);

            alert(
                error?.message ||
                error?.error ||
                "Failed to add food."
            );
        } finally {
            setSaving(false);
        }
    };

    // ----------------------------------
    // UPDATE FOOD (Fixed signature to safely capture ID from editingFood state)
    // ----------------------------------
   // ----------------------------------
    // UPDATE FOOD (Updated to match component signature)
    // ----------------------------------
    const handleUpdateFood = async (id, formData) => {
        try {
            setSaving(true);
            setError("");

            await updateFood(id, formData);

            setEditingFood(null);
            await fetchFoods();
        } catch (error) {
            console.error("Update food error:", error);

            alert(
                error?.message ||
                error?.error ||
                "Failed to update food."
            );
        } finally {
            setSaving(false);
        }
    };

    // ----------------------------------
    // DELETE FOOD
    // ----------------------------------
    const handleDeleteFood = async () => {
        if (!deletingFood) {
            return;
        }

        try {
            setSaving(true);
            setError("");

            await deleteFood(deletingFood._id);

            setDeletingFood(null);
            await fetchFoods();
        } catch (error) {
            console.error("Delete food error:", error);

            alert(
                error?.message ||
                error?.error ||
                "Failed to delete food."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 ">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Food Management
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage food items, prices, stock and images.
                    </p>
                </div>

               <button
    type="button"
    onClick={() => {
        console.log("Add Food clicked");
        setShowAdd(true);
    }}
    className="
        inline-flex
        items-center
        justify-center
        px-5
        py-2.5
        rounded-lg
        bg-[var(--teal-dark,#065b62)]
        text-white
        text-sm
        font-bold
        hover:opacity-95
        cursor-pointer
    "
>
    + Add Food
</button>
            </div>

            {/* SEARCH */}
            <FoodSearch
    search={search}
    setSearch={setSearch}
    foods={foods}
    onFoodSelect={setSelectedFood}
/>

            {/* ERROR */}
            {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                    {error}
                </div>
            )}

            {/* LOADING */}
            {loading ? (
                <section className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                    <div className="w-8 h-8 mx-auto rounded-full border-4 border-slate-200 border-t-[var(--teal,#08838d)] animate-spin" />
                    <p className="text-sm font-semibold text-slate-500 mt-4">
                        Loading food items...
                    </p>
                </section>
            ) : (
                <FoodList
                    foods={filteredFoods}
                    onEdit={setEditingFood}
                    onDelete={setDeletingFood}
                />
            )}

            {/* ADD FOOD MODAL */}
            {showAdd && (
                <AddFood
                    onClose={() => setShowAdd(false)}
                    onSave={handleAddFood}
                    saving={saving}
                />
            )}

          

            {/* EDIT FOOD MODAL */}
            {editingFood && (
                <EditFood
                    food={editingFood}
                    onClose={() => setEditingFood(null)}
                    onSave={handleUpdateFood}
                    saving={saving}
                />
            )}

            {/* DELETE FOOD MODAL */}
            {deletingFood && (
                <DeleteFood
                    food={deletingFood}
                    onClose={() => setDeletingFood(null)}
                    onDelete={handleDeleteFood}
                    saving={saving}
                />
            )}
        </div>
    );
}