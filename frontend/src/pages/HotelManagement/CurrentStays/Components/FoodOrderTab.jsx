import React, {
  useState,
  useEffect,
  useMemo,
} from "react";
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

  // CART
  const [cart, setCart] = useState({});

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
            `Food Service is not included in your current ${
              access.plan?.planName || "subscription"
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
  // FETCH BOOKING FOOD SERVICES
  // =====================================================
  useEffect(() => {
    if (!featureAllowed || !bookingId || !roomId) {
      setActiveFoodList([]);
      setHistoryFoodList([]);
      return;
    }

    fetchBookingFoodServices();
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
      "https://webscape.co.in/hotel-billing-system-backend";

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
  const handlePlaceOrder = () => {
    if (submitting) return;

    if (cartItems.length === 0) {
      toast.warn("Please select at least one food item.");
      return;
    }

    if (!bookingId) {
      toast.warn("Booking ID is missing. Please select a booking.");
      return;
    }

    if (!roomId) {
      toast.warn("Booked room ID is missing. Please select a room.");
      return;
    }

    toast.confirm(
      `Confirm food order of ₹${cartTotalAmount} (${cartItems.length} items) for Room ${
        roomNumber || ""
      }? These charges will be attached to checkout.`,
      async () => {
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
          await fetchBookingFoodServices();

          toast.success(
            `Food order of ₹${cartTotalAmount} added to Room ${
              roomNumber || ""
            } successfully.`
          );
        } catch (err) {
          console.error("Failed to place food order:", err);
          const errMsg = err?.message || "Failed to save food order.";
          setError(errMsg);
          toast.error(errMsg);
        } finally {
          setSubmitting(false);
        }
      },
      {
        title: "Confirm Food Order",
        confirmText: `Confirm Order (₹${cartTotalAmount})`,
        cancelText: "Review Cart",
        variant: "primary",
      }
    );
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
      `Remove "${foodItemName || "this food item"}" (₹${
        itemPrice || 0
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
        <p className="text-xs text-slate-500 mt-1">
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
        <p className="text-xs text-slate-600 max-w-md mt-2 leading-relaxed">
          {featureMessage ||
            "Food Service is not included in your current subscription plan."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* ===================================================
          LEFT SIDE: MENU & QUEUES
      ==================================================== */}
      <div className="lg:col-span-2 space-y-6">
        {/* FOOD CATALOG */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_rgba(15,42,99,0.04)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0f2a63] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[#0f2a63] text-base">
                  Food Menu
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 pl-10">
                Select food items and add them to the room order cart.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {roomNumber && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-[#0f2a63] border border-blue-100 text-xs font-bold shrink-0">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  Room {roomNumber}
                </span>
              )}
            </div>
          </div>

          {/* SEARCH & FILTERS BAR */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex gap-1.5 w-full sm:w-auto">
              {["All", "Veg", "Non-Veg"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                    selectedFilter === filter
                      ? "bg-[#0f2a63] text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search food item..."
                value={foodSearch}
                onChange={(e) => setFoodSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 transition-all shadow-xs"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              {error}
            </div>
          )}

          {/* FOOD CARDS LIST */}
          <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2.5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-2" />
                <p className="text-xs font-medium">Loading food menu...</p>
              </div>
            ) : filteredFoods.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-xs font-medium text-slate-500">
                No food items match your search or filter.
              </div>
            ) : (
              filteredFoods.map((food) => {
                const foodId = food._id || food.id;
                const foodName = food.foodName || food.name || "";
                const foodPrice = Number(
                  food.foodPrice ?? food.price ?? 0
                );
                const foodDesc = food.description || food.desc || "";
                const imageSrc = getImageUrl(
                  food.foodImage || food.image
                );
                const qty = Number(cart[foodId]?.quantity || 0);

                return (
                  <div
                    key={foodId}
                    className="bg-white p-3 rounded-xl border border-slate-200/80 hover:border-blue-200 flex items-center justify-between gap-3 shadow-xs transition-colors"
                  >
                    <img
                      src={imageSrc}
                      alt={foodName}
                      className="w-13 h-13 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-xs truncate">
                          {foodName}
                        </h4>
                        {(food.type || food.foodType) && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
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
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {foodDesc}
                        </p>
                      )}

                      <p className="text-xs font-extrabold text-[#0f2a63] mt-1">
                        ₹{foodPrice}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {qty > 0 ? (
                        <div className="flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-xl border border-blue-100">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(food, -1)}
                            className="w-6 h-6 bg-white rounded-lg shadow-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer active:scale-95 transition-all text-xs"
                          >
                            -
                          </button>

                          <span className="text-xs font-bold w-4 text-center text-[#0f2a63]">
                            {qty}
                          </span>

                          <button
                            type="button"
                            onClick={() => updateCartQuantity(food, 1)}
                            className="w-6 h-6 bg-white rounded-lg shadow-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer active:scale-95 transition-all text-xs"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(food, 1)}
                          className="px-3.5 py-1.5 bg-[#0f2a63] hover:bg-[#183d8a] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PENDING QUEUE & PAID HISTORY */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_rgba(15,42,99,0.04)] space-y-5">
          {/* PENDING FOOD ORDERS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-[#0f2a63] text-xs uppercase tracking-wide">
                Food Queue (Unconfirmed / Pending)
              </h4>
              <span className="bg-blue-50 text-[#0f2a63] border border-blue-100 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                {activeFoodList.length} items
              </span>
            </div>

            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {activeFoodList.length === 0 ? (
                <div className="p-5 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-xs font-medium text-slate-400">
                  No pending food orders for Room {roomNumber || "-"}.
                </div>
              ) : (
                activeFoodList.map((item) => {
                  const recordId = item._id || item.id;
                  const itemTotal = Number(
                    item.totalPrice ?? item.total ?? 0
                  );

                  return (
                    <div
                      key={recordId}
                      className="bg-white p-3 rounded-xl border border-slate-200/80 hover:border-blue-200 flex items-center justify-between shadow-xs transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0f2a63] flex items-center justify-center shrink-0 border border-blue-100">
                          <UtensilsCrossed className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {item.foodName} × {item.quantity}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-semibold text-slate-500">
                              Room {item.roomNumber || roomNumber || "-"}
                            </span>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                              Pending
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 pl-2">
                        <span className="text-xs font-extrabold text-[#0f2a63]">
                          ₹{itemTotal}
                        </span>

                        <button
                          type="button"
                          disabled={removingId === recordId}
                          onClick={() =>
                            handleRemoveActiveItem(
                              recordId,
                              item.foodName,
                              itemTotal
                            )
                          }
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-transparent transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                          title="Remove food item"
                        >
                          {removingId === recordId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
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
              <div className="flex justify-end mt-2 text-xs font-bold text-amber-700">
                Pending Food Total: ₹{activeTotal}
              </div>
            )}
          </div>

          {/* PAID FOOD HISTORY */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                <h4 className="font-bold text-[#0f2a63] text-xs uppercase tracking-wide">
                  Paid Food History
                </h4>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {historyFoodList.length} records
              </span>
            </div>

            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
              {historyFoodList.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center font-medium">
                  No past paid food orders found.
                </p>
              ) : (
                historyFoodList.map((item, idx) => {
                  const itemId = item._id || item.id || idx;
                  const itemTotal = Number(
                    item.totalPrice ?? item.total ?? 0
                  );

                  return (
                    <div
                      key={itemId}
                      className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate">
                          {item.foodName} × {item.quantity}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-600">
                            Room {item.roomNumber || roomNumber || "-"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatDateTime(
                              item.updatedAt || item.createdAt
                            )}
                          </span>
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.2 rounded font-bold">
                            Paid
                          </span>
                        </div>
                      </div>

                      <span className="font-extrabold text-slate-700 ml-3 shrink-0">
                        ₹{itemTotal}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {historyFoodList.length > 0 && (
              <div className="flex justify-end mt-2 text-xs font-bold text-emerald-700">
                Paid Food Total: ₹{historyTotal}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================
          RIGHT SIDEBAR: NEW ORDER CART
      ==================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between min-h-[360px] sticky top-4 shadow-[0_6px_24px_rgba(15,42,99,0.06)] overflow-hidden">
        <div className="flex flex-col h-full">
          {/* HEADER */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0f2a63] flex items-center justify-center shrink-0 border border-blue-100">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-[#0f2a63] text-sm">
                Food Order Cart
              </h3>
            </div>
            {roomNumber && (
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                Room {roomNumber}
              </span>
            )}
          </div>

          {/* CART ITEMS LIST */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 my-2 pr-1 min-h-0">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-12">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  Your cart is empty.
                </p>
                <p className="text-[11px] text-slate-400 max-w-[200px]">
                  Click 'Add' on food menu items to build the order.
                </p>
              </div>
            ) : (
              cartItems.map((item) => {
                const itemId = item._id || item.id;
                const imageSrc = getImageUrl(
                  item.foodImage || item.image
                );
                const itemTotal =
                  Number(item.price || 0) * Number(item.quantity || 0);

                return (
                  <div
                    key={itemId}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={imageSrc}
                        alt={item.name}
                        className="w-9 h-9 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
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
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Remove from cart"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* CART FOOTER */}
          <div className="border-t border-slate-100 pt-3.5 space-y-3 shrink-0 bg-white">
            <div className="flex items-center justify-between text-sm font-extrabold text-[#0f2a63]">
              <span>Cart Total:</span>
              <span className="text-blue-600 text-base">
                ₹{cartTotalAmount}
              </span>
            </div>

            {cartItems.length > 0 ? (
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={submitting || !bookingId || !roomId}
                className="w-full py-2.5 bg-[#0f2a63] hover:bg-[#183d8a] text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Confirm & Send to Bill (₹{cartTotalAmount})
                  </>
                )}
              </button>
            ) : (
              <button
                disabled
                className="w-full py-2.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <ShieldCheck className="w-4 h-4 text-slate-300" />
                Confirm & Send to Bill
              </button>
            )}

            <p className="text-[10px] text-slate-400 text-center font-medium">
              Confirmed food orders are attached to checkout invoice
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}