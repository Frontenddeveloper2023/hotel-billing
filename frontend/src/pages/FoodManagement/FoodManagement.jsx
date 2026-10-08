import React, {
    useCallback,
    useDeferredValue,
    useEffect,
    useMemo,
    useState,
} from "react";
import { Plus, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "../../Context/AuthContext";
import { checkFoodServiceAccess } from "../../service/subscriptionFeatureApi";

import "./Components/FoodTheme.css";

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

    const { hotelUser: userData } = useAuth();
    const [hasAccess, setHasAccess] = useState(false);
    const [accessLoading, setAccessLoading] = useState(true);

    // Keeps typing responsive while a big list re-filters
    const deferredSearch = useDeferredValue(search);

    // ----------------------------------
    // GET ALL FOODS
    // ----------------------------------
    const fetchFoods = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getAllFoods();

            const foodData = response?.foods || response?.data || [];

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
    }, []);

    // ----------------------------------
    // LOAD FOODS AND ACCESS ON PAGE LOAD
    // ----------------------------------
    useEffect(() => {
        let mounted = true;
        const verifyAccess = async () => {
            if (userData?.role === "admin") {
                if (mounted) {
                    setHasAccess(true);
                    setAccessLoading(false);
                    fetchFoods();
                }
                return;
            }

            try {
                const result = await checkFoodServiceAccess();
                if (mounted) {
                    setHasAccess(result.featureAllowed);
                    if (result.featureAllowed) {
                        fetchFoods();
                    }
                }
            } catch (err) {
                if (mounted) setHasAccess(false);
            } finally {
                if (mounted) setAccessLoading(false);
            }
        };

        verifyAccess();

        return () => {
            mounted = false;
        };
    }, [fetchFoods, userData?.role]);

    // ----------------------------------
    // SEARCH
    // ----------------------------------
    const filteredFoods = useMemo(() => {
        // If user selected a specific food from search suggestions
        if (selectedFood) {
            return [selectedFood];
        }

        const query = deferredSearch.toLowerCase().trim();

        if (!query) {
            return foods;
        }

        return foods.filter((food) => {
            return (
                food.foodName?.toLowerCase().includes(query) ||
                food.description?.toLowerCase().includes(query)
            );
        });
    }, [foods, deferredSearch, selectedFood]);

    // ----------------------------------
    // ADD FOOD
    // ----------------------------------
    const handleAddFood = useCallback(
        async (formData) => {
            try {
                setSaving(true);
                setError("");

                await createFood(formData);

                setShowAdd(false);
                await fetchFoods();
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
        },
        [fetchFoods]
    );

    // ----------------------------------
    // UPDATE FOOD
    // ----------------------------------
    const handleUpdateFood = useCallback(
        async (id, formData) => {
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
        },
        [fetchFoods]
    );

    // ----------------------------------
    // DELETE FOOD
    // ----------------------------------
    const handleDeleteFood = useCallback(async () => {
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
    }, [deletingFood, fetchFoods]);

    // stable close handlers (keeps modals from re-rendering needlessly)
    const closeAdd = useCallback(() => setShowAdd(false), []);
    const closeEdit = useCallback(() => setEditingFood(null), []);
    const closeDelete = useCallback(() => setDeletingFood(null), []);

    if (accessLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                    <ShieldAlert className="w-10 h-10 text-rose-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">
                    Feature Not Available
                </h2>
                <p className="text-white max-w-md mx-auto mb-8 leading-relaxed">
                    The Food Management feature is not included in your current subscription plan. Please upgrade your plan to unlock this feature
                </p>
            </div>
        );
    }

  return (
    <div className="fm-root mx-auto w-full max-w-7xl space-y-5 px-3 sm:space-y-6 sm:px-4 md:px-5 lg:px-6">
        {/* HEADER */}
        <div className="fm-rise w-full">
            <div
                className="
                    flex w-full flex-col gap-4
                    sm:gap-5
                    lg:relative lg:flex-row lg:items-center lg:justify-between
                "
            >
                {/* TITLE */}
                <div className="min-w-0 shrink-0">
                    <h1
                        className="
                            text-[20px]
                            font-extrabold
                            leading-tight
                            tracking-[-0.035em]
                            text-white
                            sm:text-[22px]
                            md:text-[24px]
                            lg:text-[25px]
                        "
                    >
                        Food Management
                    </h1>
                </div>

                {/* SEARCH */}
                <div
                    className="
                        w-full
                        sm:w-full
                        md:w-full
                        lg:absolute
                        lg:left-1/2
                        lg:top-1/2
                        lg:w-[360px]
                        lg:-translate-x-1/2
                        lg:-translate-y-1/2
                        xl:w-[400px]
                    "
                >
                    <FoodSearch
                        search={search}
                        setSearch={setSearch}
                        foods={foods}
                        onFoodSelect={setSelectedFood}
                    />
                </div>

                {/* ADD FOOD */}
                <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    className="
                        fm-btn
                        inline-flex
                        h-11
                        w-full
                        shrink-0
                        cursor-pointer
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        bg-white
                        px-5
                        py-2.5
                        text-sm
                        font-bold
                        text-[#12306b]
                        shadow-lg
                        shadow-[#0a1a3f]/20
                        transition-all
                        duration-200
                        hover:-translate-y-0.5
                        hover:shadow-xl
                        active:translate-y-0
                        sm:h-11
                        sm:w-auto
                        sm:min-w-[130px]
                        lg:ml-auto
                    "
                >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>Add Food</span>
                </button>
            </div>
        </div>

        {/* ERROR */}
        {error && (
            <div
                role="alert"
                className="
                    fm-drop
                    w-full
                    rounded-xl
                    border
                    border-rose-200
                    bg-rose-50
                    px-3
                    py-3
                    text-sm
                    font-medium
                    leading-5
                    text-rose-600
                    sm:px-4
                "
            >
                {error}
            </div>
        )}

        {/* LOADING */}
        {loading ? (
            <section
                aria-busy="true"
                aria-label="Loading food items"
                className="
                    w-full
                    overflow-hidden
                    rounded-2xl
                    border
                    border-[var(--line)]
                    bg-white
                    shadow-sm
                "
            >
                <div
                    className="
                        flex
                        min-w-0
                        items-center
                        gap-3
                        border-b
                        border-[var(--line)]
                        px-3
                        py-4
                        sm:px-5
                    "
                >
                    <div className="fm-skel h-10 w-10 shrink-0 rounded-xl" />

                    <div className="min-w-0 space-y-2">
                        <div className="fm-skel h-3 w-24 rounded" />
                        <div className="fm-skel h-2.5 w-16 rounded" />
                    </div>
                </div>

                <div
                    className="
                        grid
                        grid-cols-1
                        gap-3
                        p-3
                        sm:grid-cols-2
                        sm:gap-4
                        sm:p-4
                        lg:gap-5
                        lg:p-5
                        xl:grid-cols-3
                        2xl:grid-cols-4
                    "
                >
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className="
                                min-w-0
                                overflow-hidden
                                rounded-2xl
                                border
                                border-[var(--line)]
                            "
                        >
                            <div
                                className="
                                    fm-skel
                                    h-40
                                    w-full
                                    sm:h-44
                                    md:h-48
                                "
                            />

                            <div className="space-y-2.5 p-4">
                                <div className="fm-skel h-3.5 w-3/4 rounded" />
                                <div className="fm-skel h-2.5 w-full rounded" />
                                <div className="fm-skel h-2.5 w-2/3 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        ) : (
            <div className="w-full min-w-0">
                <FoodList
                    foods={filteredFoods}
                    onEdit={setEditingFood}
                    onDelete={setDeletingFood}
                />
            </div>
        )}

        {/* ADD FOOD MODAL */}
        {showAdd && (
            <AddFood
                onClose={closeAdd}
                onSave={handleAddFood}
                saving={saving}
            />
        )}

        {/* EDIT FOOD MODAL */}
        {editingFood && (
            <EditFood
                food={editingFood}
                onClose={closeEdit}
                onSave={handleUpdateFood}
                saving={saving}
            />
        )}

        {/* DELETE FOOD MODAL */}
        {deletingFood && (
            <DeleteFood
                food={deletingFood}
                onClose={closeDelete}
                onDelete={handleDeleteFood}
                saving={saving}
            />
        )}
    </div>
);
}