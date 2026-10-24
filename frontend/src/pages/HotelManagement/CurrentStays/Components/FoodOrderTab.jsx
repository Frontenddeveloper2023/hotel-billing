import React, {
  useState,
  useEffect,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { useToast } from "../../../../Context/ToastContext.jsx";
import {
  Search,
  Plus,
  Trash2,
  ShoppingBag,
  Loader2,
  CheckCircle2,
  History,
  Clock,
  UtensilsCrossed,
  Tag,
  ShieldCheck,
  X,
  ChevronLeft,
} from "lucide-react";
import { getAllFoods } from "../../../../service/foodService.js";
import {
  getBookingById,
  addFoodService,
  deleteFoodService,
} from "../../../../service/bookingApi.js";
import { checkFoodServiceAccess } from "../../../../service/subscriptionFeatureApi.js";

export default function FoodOrderTab({
  customerId,
  roomNumber,
  bookingId,
  roomId,
}) {
  const toast = useToast();

  // =====================================================
  // FOOD CATALOG & STATE
  // =====================================================
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // FILTER / SEARCH
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [foodSearch, setFoodSearch] = useState("");

  // CART & WIZARD STEPS ("menu" | "confirm")
  const [cart, setCart] = useState({});
  const [currentStep, setCurrentStep] = useState("menu");
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // DATABASE FOOD RECORDS
  const [activeFoodList, setActiveFoodList] = useState([]);
  const [historyFoodList, setHistoryFoodList] = useState([]);

  // LOADING STATES
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState(null);

  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [featureAllowed, setFeatureAllowed] = useState(false);
  const [featureMessage, setFeatureMessage] = useState("");

  // =====================================================
  // SUBSCRIPTION + PLAN ACCESS
  // =====================================================
  useEffect(() => {
    verifyFoodServiceAccess();
  }, []);

  const verifyFoodServiceAccess = async () => {
    try {
      setSubscriptionLoading(true);
      setFeatureMessage("");

      const access = await checkFoodServiceAccess();

      if (!access.featureAllowed) {
        setFeatureAllowed(false);
        setFeatureMessage(
          access.message ||
          `Food Service is not included in your current ${access.plan?.planName || "subscription"
          } plan.`
        );
        return;
      }

      setFeatureAllowed(true);
      await fetchCatalog();
    } catch (err) {
      console.error("Food service subscription check failed:", err);
      setFeatureAllowed(false);
      setFeatureMessage(
        err?.response?.data?.message ||
        err?.message ||
        "Unable to verify your Food Service subscription."
      );
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // =====================================================
  // FETCH BOOKING FOOD SERVICES & REAL-TIME SYNC
  // =====================================================
  useEffect(() => {
    if (!featureAllowed || !bookingId || !roomId) {
      setActiveFoodList([]);
      setHistoryFoodList([]);
      return;
    }

    fetchBookingFoodServices();

    const handleFoodServiceUpdated = (e) => {
      // If the food update belongs to the current booking & room, refresh immediately
      if (!e.detail?.bookingId || e.detail.bookingId === bookingId) {
        fetchBookingFoodServices();
      }
    };

    window.addEventListener("foodServiceUpdated", handleFoodServiceUpdated);
    return () => {
      window.removeEventListener("foodServiceUpdated", handleFoodServiceUpdated);
    };
  }, [featureAllowed, bookingId, roomId, roomNumber]);

  // =====================================================
  // FETCH MASTER FOOD CATALOG
  // =====================================================
  const fetchCatalog = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAllFoods();
      const foodData =
        response?.foods || response?.data || response || [];

      setFoods(Array.isArray(foodData) ? foodData : []);
    } catch (err) {
      console.error("Failed to load food items:", err);
      setError(err?.message || "Could not load food catalog.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingFoodServices = async () => {
    try {
      setError("");

      if (!bookingId || !roomId) {
        setActiveFoodList([]);
        setHistoryFoodList([]);
        return;
      }

      const response = await getBookingById(bookingId);
      const booking =
        response?.data || response?.booking || response;

      if (!booking || !Array.isArray(booking.rooms)) {
        setActiveFoodList([]);
        setHistoryFoodList([]);
        return;
      }

      let selectedRoom =
        booking.rooms.find(
          (room) => String(room._id) === String(roomId)
        ) ||
        booking.rooms.find(
          (room) => String(room.roomId) === String(roomId)
        ) ||
        (roomNumber
          ? booking.rooms.find(
            (room) =>
              String(room.roomNumber).trim() ===
              String(roomNumber).trim()
          )
          : null);

      if (!selectedRoom) {
        setActiveFoodList([]);
        setHistoryFoodList([]);
        return;
      }

      const foodServices = Array.isArray(selectedRoom.foodServices)
        ? selectedRoom.foodServices
        : [];

      const normalizedFoods = foodServices.map((item) => {
        const quantity = Number(item.quantity || 1);
        const price = Number(item.price ?? item.foodPrice ?? 0);
        const total = Number(
          item.total ?? item.totalPrice ?? price * quantity
        );

        return {
          ...item,
          _id: item._id,
          bookingId: booking._id,
          roomId: selectedRoom._id,
          roomNumber: selectedRoom.roomNumber,
          foodId: item.foodId,
          foodName: item.name || item.foodName || "",
          foodPrice: price,
          price: price,
          quantity: quantity,
          total: total,
          totalPrice: total,
          paymentStatus: item.paymentStatus || "Pending",
          updatedAt: item.updatedAt || booking.updatedAt,
          createdAt: item.createdAt || booking.updatedAt,
        };
      });

      const pendingFoods = normalizedFoods.filter(
        (item) =>
          String(item.paymentStatus || "").toLowerCase() === "pending"
      );

      const paidFoods = normalizedFoods.filter(
        (item) =>
          String(item.paymentStatus || "").toLowerCase() === "paid"
      );

      setActiveFoodList(pendingFoods);
      setHistoryFoodList(paidFoods);
    } catch (err) {
      console.error("Failed to fetch booking food services:", err);
      setError(
        err?.message || "Could not load booking food services."
      );
      setActiveFoodList([]);
      setHistoryFoodList([]);
    }
  };

  // =====================================================
  // IMAGE URL HELPER
  // =====================================================
  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=60";
    }

    if (
      imagePath.startsWith("http") ||
      imagePath.startsWith("blob:")
    ) {
      return imagePath;
    }

    let backendUrl =
      import.meta.env.VITE_BACKEND_URL ||
      "https://jayam.co.in/hotel-billing-system-backend";

    backendUrl = backendUrl.replace(/\/+$/, "");
    backendUrl = backendUrl.replace(/\/api$/, "");
    backendUrl = backendUrl.replace(
      /\/hotel-billing-system-backend$/,
      ""
    );

    const cleanPath = imagePath
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");

    const formattedPath = cleanPath.startsWith("uploads/")
      ? cleanPath
      : `uploads/${cleanPath}`;

    return `${backendUrl}/hotel-billing-system-backend/${formattedPath}`;
  };

  // =====================================================
  // FILTER FOOD CATALOG
  // =====================================================
  const filteredFoods = useMemo(() => {
    const query = foodSearch.toLowerCase().trim();

    return foods.filter((item) => {
      const category = item.type || item.foodType || "Veg";
      const matchesCategory =
        selectedFilter === "All" || category === selectedFilter;

      const name = item.foodName || item.name || "";
      const description = item.description || item.desc || "";

      const matchesSearch =
        name.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [foods, selectedFilter, foodSearch]);

  // =====================================================
  // CART OPERATIONS
  // =====================================================
  const updateCartQuantity = (item, delta) => {
    const itemId = item._id || item.id;
    if (!itemId) return;

    setCart((prev) => {
      const currentQty = Number(prev[itemId]?.quantity || 0);
      const newQty = currentQty + delta;

      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }

      return {
        ...prev,
        [itemId]: {
          ...item,
          name: item.foodName || item.name || "",
          price: Number(item.foodPrice ?? item.price ?? 0),
          quantity: newQty,
        },
      };
    });
  };

  const cartItems = Object.values(cart);

  const cartTotalAmount = cartItems.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  // =====================================================
  // PLACE FOOD ORDER
  // =====================================================
  const handlePlaceOrder = async () => {
    if (submitting) return;

    if (cartItems.length === 0) {
      toast.warn("Please select at least one food item.");
      return;
    }

    if (!bookingId || !roomId) {
      toast.warn("Booking or room ID is missing.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await Promise.all(
        cartItems.map(async (cartItem) => {
          const foodId = cartItem._id || cartItem.id;
          if (!foodId) throw new Error("Food ID is missing.");

          const price = Number(
            cartItem.price || cartItem.foodPrice || 0
          );
          const quantity = Number(cartItem.quantity || 1);

          const payload = {
            foodId,
            name: cartItem.name || cartItem.foodName || "",
            price,
            quantity,
            total: price * quantity,
            paymentStatus: "Pending",
          };

          await addFoodService(bookingId, roomId, payload);
        })
      );

      setCart({});
      setCurrentStep("menu");
      await fetchBookingFoodServices();

      toast.success(
        `Food order of ₹${cartTotalAmount} added to Room ${roomNumber || ""} successfully.`
      );
    } catch (err) {
      console.error("Failed to place food order:", err);
      const errMsg = err?.message || "Failed to save food order.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // REMOVE PENDING FOOD ITEM
  // =====================================================
  const handleRemoveActiveItem = (recordId, foodItemName, itemPrice) => {
    if (removingId) return;

    if (!recordId) {
      toast.warn("Food service ID is missing.");
      return;
    }

    if (!bookingId || !roomId) {
      toast.warn("Booking or room ID is missing.");
      return;
    }

    toast.confirm(
      `Remove "${foodItemName || "this food item"}" (₹${itemPrice || 0
      }) from Room ${roomNumber || ""}?`,
      async () => {
        try {
          setRemovingId(recordId);
          setError("");

          await deleteFoodService(bookingId, roomId, recordId);
          await fetchBookingFoodServices();

          toast.success(
            `"${foodItemName || "Food item"}" removed from order list.`
          );
        } catch (err) {
          console.error("Failed to remove food item:", err);
          const errMsg = err?.message || "Failed to remove food item.";
          setError(errMsg);
          toast.error(errMsg);
        } finally {
          setRemovingId(null);
        }
      },
      {
        title: "Remove Food Item",
        confirmText: "Remove Item",
        cancelText: "Keep Item",
        variant: "danger",
      }
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Recent";

    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString(
      [],
      { hour: "2-digit", minute: "2-digit" }
    )}`;
  };

  const activeTotal = activeFoodList.reduce(
    (sum, item) =>
      sum + Number(item.totalPrice || item.total || 0),
    0
  );

  const historyTotal = historyFoodList.reduce(
    (sum, item) =>
      sum + Number(item.totalPrice || item.total || 0),
    0
  );

  if (subscriptionLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8 bg-slate-50/50 rounded-2xl border border-slate-100">
        <Loader2 className="w-8 h-8 text-[#0f2a63] animate-spin mb-3" />
        <p className="text-sm font-bold text-[#0f2a63]">
          Checking Food Service Access...
        </p>
        <p className="text-xs text-black mt-1">
          Verifying active plan permissions.
        </p>
      </div>
    );
  }

  if (!featureAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center px-6 py-10 bg-gradient-to-b from-amber-50/40 to-white rounded-2xl border border-amber-200/70 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25 flex items-center justify-center mb-4">
          <UtensilsCrossed className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-[#0f2a63]">
          Food Service Not Available
        </h3>
        <p className="text-xs text-black max-w-md mt-2 leading-relaxed">
          {featureMessage ||
            "Food Service is not included in your current subscription plan."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ===================================================
          STEP 1: CHOOSE FOOD MENU & ADD
      ==================================================== */}
      {currentStep === "menu" && (
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
          {/* TOP BAR */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0f2a63] text-white flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#0f2a63] text-sm sm:text-base leading-tight">
                  Choose Food
                </h3>
                {roomNumber && (
                  <span className="text-[10px] text-blue-600 font-bold">
                    Room {roomNumber}
                  </span>
                )}
              </div>
            </div>

            {/* QUICK HISTORY & PENDING ICON BUTTON */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-[#0f2a63] text-xs font-bold transition-all cursor-pointer border border-slate-200/80 active:scale-95 shadow-2xs"
                title="View Pending & Past Orders"
              >
                <History className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Orders</span>
                {activeFoodList.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* SEARCH & FILTER */}
          {/* <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="flex gap-1">
              {["All", "Veg", "Non-Veg"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    selectedFilter === filter
                      ? "bg-[#0f2a63] text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search menu..."
                value={foodSearch}
                onChange={(e) => setFoodSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {foodSearch && (
                <button
                  type="button"
                  onClick={() => setFoodSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div> */}

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              {error}
            </div>
          )}

          {/* FOOD MENU CARDS (Compact, Clean, Touch-friendly) */}
          <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2 staylio-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin mb-1.5" />
                <p className="text-xs">Loading menu...</p>
              </div>
            ) : filteredFoods.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
                No items match your filter.
              </div>
            ) : (
              filteredFoods.map((food) => {
                const foodId = food._id || food.id;
                const foodName = food.foodName || food.name || "";
                const foodPrice = Number(food.foodPrice ?? food.price ?? 0);
                const foodDesc = food.description || food.desc || "";
                const imageSrc = getImageUrl(food.foodImage || food.image);
                const qty = Number(cart[foodId]?.quantity || 0);

                return (
                  <div
                    key={foodId}
                    className="bg-slate-50/60 p-2.5 sm:p-3 rounded-xl border border-slate-200/80 hover:border-blue-300 flex items-center justify-between gap-3 transition-colors"
                  >
                    <img
                      src={imageSrc}
                      alt={foodName}
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg object-cover bg-slate-200 shrink-0 border border-slate-200"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-900 text-xs truncate">
                          {foodName}
                        </h4>
                        {(food.type || food.foodType) && (
                          <span
                            className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded border ${
                              (food.type || food.foodType) === "Veg"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {food.type || food.foodType}
                          </span>
                        )}
                      </div>

                      {foodDesc && (
                        <p className="text-[10.5px] text-slate-500 line-clamp-1 mt-0.5">
                          {foodDesc}
                        </p>
                      )}

                      <p className="text-xs font-extrabold text-[#0f2a63] mt-0.5">
                        ₹{foodPrice}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {qty > 0 ? (
                        <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200/80">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(food, -1)}
                            className="w-6 h-6 bg-white rounded shadow-2xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer active:scale-90 transition-all text-xs"
                          >
                            -
                          </button>

                          <span className="text-xs font-extrabold w-4 text-center text-blue-700">
                            {qty}
                          </span>

                          <button
                            type="button"
                            onClick={() => updateCartQuantity(food, 1)}
                            className="w-6 h-6 bg-white rounded shadow-2xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer active:scale-90 transition-all text-xs"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(food, 1)}
                          className="px-3 py-1.5 bg-[#0f2a63] hover:bg-[#183d8a] text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* BOTTOM ACTION: 1-CLICK CONFIRM BILL */}
          <div className="pt-3 pb-7 border-t border-slate-100 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Selected Items</p>
              <p className="text-sm font-extrabold text-[#0f2a63]">
                {cartItems.length} items • <span className="text-blue-600">₹{cartTotalAmount}</span>
              </p>
            </div>

            <button
              type="button"
              disabled={submitting || cartItems.length === 0}
              onClick={handlePlaceOrder}
              className="px-5 py-2.5 bg-[#0f2a63] hover:bg-[#183d8a] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-98"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Confirming...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Confirm Bill</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================
          STEP 2: CONFIRM BILL & SEND TO ROOM
      ==================================================== */}
      {currentStep === "confirm" && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          {/* HEADER WITH BACK BUTTON */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep("menu")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Menu</span>
            </button>

            <span className="text-xs font-extrabold text-[#0f2a63]">
              Confirm Bill (Room {roomNumber || "-"})
            </span>
          </div>

          {/* ORDER ITEMS REVIEW */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 staylio-scrollbar">
            {cartItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Cart is empty.
              </div>
            ) : (
              cartItems.map((item) => {
                const itemId = item._id || item.id;
                const imageSrc = getImageUrl(item.foodImage || item.image);
                const itemTotal = Number(item.price || 0) * Number(item.quantity || 0);

                return (
                  <div
                    key={itemId}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={imageSrc}
                        alt={item.name}
                        className="w-9 h-9 rounded-lg object-cover bg-slate-200 shrink-0 border border-slate-200"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          ₹{item.price} × {item.quantity}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-extrabold text-[#0f2a63]">
                        ₹{itemTotal}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) => {
                            const copy = { ...prev };
                            delete copy[itemId];
                            return copy;
                          })
                        }
                        className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* BILL SUMMARY & CONFIRM TRIGGER */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Items Total:</span>
              <span className="font-bold text-slate-900">₹{cartTotalAmount}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Payment Type:</span>
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                Added to Room Bill
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-sm font-extrabold text-[#0f2a63]">
              <span>Final Bill Amount:</span>
              <span className="text-blue-600 text-base">₹{cartTotalAmount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-7 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep("menu")}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Add More Items
            </button>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={submitting || cartItems.length === 0 || !bookingId || !roomId}
              className="flex-1 py-2.5 bg-[#0f2a63] hover:bg-[#183d8a] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Bill...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm Bill</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================
          HISTORY & PENDING ORDERS MODAL (PORTAL)
      ==================================================== */}
      {showHistoryModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-[#061434]/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
            onClick={() => setShowHistoryModal(false)}
          >
            <div
              className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_rgba(6,20,52,0.45)] border border-slate-200/90 max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between py-2.5 px-3.5 sm:px-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <History className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0f2a63] text-xs sm:text-sm leading-tight">
                    Orders & History
                  </h3>
                  <span className="text-[9.5px] text-slate-500 font-semibold">
                    Room {roomNumber || "-"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-500 hover:text-black flex items-center justify-center cursor-pointer active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* MODAL BODY */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 staylio-scrollbar">
              {/* PENDING QUEUE */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-[#0f2a63] text-xs uppercase tracking-wider">
                    Pending Orders
                  </h4>
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full text-[10px]">
                    {activeFoodList.length} items
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1 staylio-scrollbar">
                  {activeFoodList.length === 0 ? (
                    <div className="p-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                      No pending food orders.
                    </div>
                  ) : (
                    activeFoodList.map((item) => {
                      const recordId = item._id || item.id;
                      const itemTotal = Number(item.totalPrice ?? item.total ?? 0);

                      return (
                        <div
                          key={recordId}
                          className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {item.foodName} × {item.quantity}
                            </p>
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              Pending
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 pl-2">
                            <span className="text-xs font-extrabold text-[#0f2a63]">
                              ₹{itemTotal}
                            </span>
                            <button
                              type="button"
                              disabled={removingId === recordId}
                              onClick={() =>
                                handleRemoveActiveItem(recordId, item.foodName, itemTotal)
                              }
                              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              {removingId === recordId ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {activeFoodList.length > 0 && (
                  <div className="flex justify-end pt-2 text-xs font-bold text-amber-800 border-t border-slate-100 mt-2">
                    Pending Total: ₹{activeTotal}
                  </div>
                )}
              </div>

              {/* PAID HISTORY */}
              {/* <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-[#0f2a63] text-xs uppercase tracking-wider">
                    Paid History
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    {historyFoodList.length} items
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1 staylio-scrollbar">
                  {historyFoodList.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">
                      No past paid orders found.
                    </p>
                  ) : (
                    historyFoodList.map((item, idx) => {
                      const itemId = item._id || item.id || idx;
                      const itemTotal = Number(item.totalPrice ?? item.total ?? 0);

                      return (
                        <div
                          key={itemId}
                          className="bg-slate-50/70 p-2 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {item.foodName} × {item.quantity}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span>{formatDateTime(item.updatedAt || item.createdAt)}</span>
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.2 rounded font-bold text-[9px]">
                                Paid
                              </span>
                            </div>
                          </div>

                          <span className="font-extrabold text-slate-800 ml-2 shrink-0">
                            ₹{itemTotal}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {historyFoodList.length > 0 && (
                  <div className="flex justify-end mt-1.5 text-xs font-bold text-emerald-700">
                    Paid Total: ₹{historyTotal}
                  </div>
                )}
              </div> */}
            </div>

            {/* MODAL FOOTER */}
            {/* <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-1.5 bg-[#0f2a63] text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div> */}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
