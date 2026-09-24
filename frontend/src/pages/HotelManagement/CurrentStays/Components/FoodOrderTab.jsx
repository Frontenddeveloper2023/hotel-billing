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
} from "lucide-react";

// =====================================================
// FOOD MASTER API
// =====================================================

import {
  getAllFoods,
} from "../../../../service/foodService.js";

// =====================================================
// BOOKING API
// =====================================================

import {
  getBookingById,
  addFoodService,
  deleteFoodService,
} from "../../../../service/bookingApi.js";
import { checkFoodServiceAccess } from "../../../../service/subscriptionFeatureApi.js";


// =====================================================
// COMPONENT
// =====================================================

export default function FoodOrderTab({
  customerId,
  roomNumber,
  bookingId,
  roomId,
}) {

  const { success, error: toastError, warn, info, confirm } = useToast();

  // =====================================================
  // FOOD CATALOG
  // =====================================================

  const [foods, setFoods] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // =====================================================
  // FILTER / SEARCH
  // =====================================================

  const [selectedFilter, setSelectedFilter] =
    useState("All");

  const [foodSearch, setFoodSearch] =
    useState("");


  // =====================================================
  // CART
  // =====================================================

  const [cart, setCart] =
    useState({});


  // =====================================================
  // DATABASE FOOD RECORDS
  // =====================================================

  const [activeFoodList, setActiveFoodList] =
    useState([]);

  const [historyFoodList, setHistoryFoodList] =
    useState([]);


  // =====================================================
  // LOADING STATES
  // =====================================================

  const [submitting, setSubmitting] =
    useState(false);

  const [removingId, setRemovingId] =
    useState(null);



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
            `Food Service is not included in your current ${access.plan?.planName || "subscription"} plan.`
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
  }, [
    featureAllowed,
    bookingId,
    roomId,
    roomNumber,
  ]);


  // =====================================================
  // AUTO HIDE SUCCESS MESSAGE
  // =====================================================




  // =====================================================
  // FETCH MASTER FOOD CATALOG
  // =====================================================

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await getAllFoods();

      const foodData =
        response?.foods ||
        response?.data ||
        response ||
        [];

      setFoods(
        Array.isArray(foodData)
          ? foodData
          : []
      );

    } catch (err) {
      console.error(
        "Failed to load food items:",
        err
      );

      setError(
        err?.message ||
          "Could not load food catalog."
      );

    } finally {
      setLoading(false);
    }
  };


  // =====================================================
  // FETCH FOOD SERVICES FROM BOOKING
  // =====================================================
  //
  // New structure:
  //
  // Booking
  //   └── rooms[]
  //         └── foodServices[]
  //
  // =====================================================

  const fetchBookingFoodServices =
    async () => {

      try {
        setError("");

        if (!bookingId) {
          setActiveFoodList([]);
          setHistoryFoodList([]);
          return;
        }

        if (!roomId) {
          setActiveFoodList([]);
          setHistoryFoodList([]);
          return;
        }

        console.log(
          "========== FETCH BOOKING FOOD =========="
        );

        console.log(
          "bookingId:",
          bookingId
        );

        console.log(
          "roomId:",
          roomId
        );

        console.log(
          "roomNumber:",
          roomNumber
        );


        // -------------------------------------------------
        // GET BOOKING
        // -------------------------------------------------

        const response =
          await getBookingById(
            bookingId
          );


        // -------------------------------------------------
        // NORMALIZE RESPONSE
        // -------------------------------------------------

        const booking =
          response?.data ||
          response?.booking ||
          response;


        if (!booking) {
          throw new Error(
            "Booking data was not returned."
          );
        }


        if (
          !Array.isArray(
            booking.rooms
          )
        ) {
          setActiveFoodList([]);
          setHistoryFoodList([]);
          return;
        }


        // -------------------------------------------------
        // FIND SELECTED BOOKED ROOM
        // -------------------------------------------------
        //
        // IMPORTANT:
        // roomId should be Booking.rooms[]._id
        //
        // -------------------------------------------------

        let selectedRoom =
          booking.rooms.find(
            (room) =>
              String(room._id) ===
              String(roomId)
          );


        // -------------------------------------------------
        // FALLBACK BY ROOM ID
        // -------------------------------------------------

        if (!selectedRoom) {
          selectedRoom =
            booking.rooms.find(
              (room) =>
                String(room.roomId) ===
                String(roomId)
            );
        }


        // -------------------------------------------------
        // FALLBACK BY ROOM NUMBER
        // -------------------------------------------------

        if (
          !selectedRoom &&
          roomNumber
        ) {
          selectedRoom =
            booking.rooms.find(
              (room) =>
                String(
                  room.roomNumber
                ).trim() ===
                String(
                  roomNumber
                ).trim()
            );
        }


        if (!selectedRoom) {

          console.warn(
            "Selected booking room was not found.",
            {
              bookingId,
              roomId,
              roomNumber,
              rooms: booking.rooms,
            }
          );

          setActiveFoodList([]);
          setHistoryFoodList([]);

          return;
        }


        console.log(
          "Selected booking room:",
          selectedRoom
        );


        // -------------------------------------------------
        // GET EMBEDDED FOOD SERVICES
        // -------------------------------------------------

        const foodServices =
          Array.isArray(
            selectedRoom.foodServices
          )
            ? selectedRoom.foodServices
            : [];


        // -------------------------------------------------
        // NORMALIZE FOOD DATA FOR UI
        // -------------------------------------------------

        const normalizedFoods =
          foodServices.map(
            (item) => {

              const quantity =
                Number(
                  item.quantity || 1
                );

              const price =
                Number(
                  item.price ??
                    item.foodPrice ??
                    0
                );

              const total =
                Number(
                  item.total ??
                    item.totalPrice ??
                    price *
                      quantity
                );


              return {
                ...item,

                _id:
                  item._id,

                bookingId:
                  booking._id,

                roomId:
                  selectedRoom._id,

                roomNumber:
                  selectedRoom.roomNumber,

                foodId:
                  item.foodId,

                foodName:
                  item.name ||
                  item.foodName ||
                  "",

                foodPrice:
                  price,

                price:
                  price,

                quantity:
                  quantity,

                total:
                  total,

                totalPrice:
                  total,

                paymentStatus:
                  item.paymentStatus ||
                  "Pending",

                updatedAt:
                  item.updatedAt ||
                  booking.updatedAt,

                createdAt:
                  item.createdAt ||
                  booking.updatedAt,
              };
            }
          );


        // -------------------------------------------------
        // PENDING
        // -------------------------------------------------

        const pendingFoods =
          normalizedFoods.filter(
            (item) =>
              String(
                item.paymentStatus ||
                  ""
              ).toLowerCase() ===
              "pending"
          );


        // -------------------------------------------------
        // PAID
        // -------------------------------------------------

        const paidFoods =
          normalizedFoods.filter(
            (item) =>
              String(
                item.paymentStatus ||
                  ""
              ).toLowerCase() ===
              "paid"
          );


        setActiveFoodList(
          pendingFoods
        );

        setHistoryFoodList(
          paidFoods
        );

      } catch (err) {

        console.error(
          "Failed to fetch booking food services:",
          err
        );

        setError(
          err?.message ||
            "Could not load booking food services."
        );

        setActiveFoodList([]);
        setHistoryFoodList([]);
      }
    };


  // =====================================================
  // IMAGE URL
  // =====================================================

  const getImageUrl = (
    imagePath
  ) => {

    if (!imagePath) {
      return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=60";
    }


    if (
      imagePath.startsWith(
        "http"
      ) ||
      imagePath.startsWith(
        "blob:"
      )
    ) {
      return imagePath;
    }


    let backendUrl =
      import.meta.env
        .VITE_BACKEND_URL ||
      "https://webscape.co.in/hotel-billing-system-backend";


    backendUrl =
      backendUrl.replace(
        /\/+$/,
        ""
      );


    backendUrl =
      backendUrl.replace(
        /\/api$/,
        ""
      );


    backendUrl =
      backendUrl.replace(
        /\/hotel-billing-system-backend$/,
        ""
      );


    const cleanPath =
      imagePath
        .replace(
          /\\/g,
          "/"
        )
        .replace(
          /^\/+/,
          ""
        );


    const formattedPath =
      cleanPath.startsWith(
        "uploads/"
      )
        ? cleanPath
        : `uploads/${cleanPath}`;


    return `${backendUrl}/hotel-billing-system-backend/${formattedPath}`;
  };


  // =====================================================
  // FILTER FOOD CATALOG
  // =====================================================

  const filteredFoods =
    useMemo(() => {

      const query =
        foodSearch
          .toLowerCase()
          .trim();


      return foods.filter(
        (item) => {

          const category =
            item.type ||
            item.foodType ||
            "Veg";


          const matchesCategory =
            selectedFilter ===
              "All" ||
            category ===
              selectedFilter;


          const name =
            item.foodName ||
            item.name ||
            "";


          const description =
            item.description ||
            item.desc ||
            "";


          const matchesSearch =
            name
              .toLowerCase()
              .includes(query) ||
            description
              .toLowerCase()
              .includes(query);


          return (
            matchesCategory &&
            matchesSearch
          );
        }
      );

    }, [
      foods,
      selectedFilter,
      foodSearch,
    ]);


  // =====================================================
  // UPDATE CART QUANTITY
  // =====================================================

  const updateCartQuantity = (
    item,
    delta
  ) => {

    const itemId =
      item._id ||
      item.id;


    if (!itemId) {
      return;
    }


    setCart(
      (prev) => {

        const currentQty =
          Number(
            prev[itemId]
              ?.quantity || 0
          );


        const newQty =
          currentQty + delta;


        if (newQty <= 0) {

          const copy = {
            ...prev,
          };


          delete copy[itemId];


          return copy;
        }


        return {
          ...prev,

          [itemId]: {
            ...item,

            name:
              item.foodName ||
              item.name ||
              "",

            price:
              Number(
                item.foodPrice ??
                  item.price ??
                  0
              ),

            quantity:
              newQty,
          },
        };
      }
    );
  };


  // =====================================================
  // CART ITEMS
  // =====================================================

  const cartItems =
    Object.values(cart);


  // =====================================================
  // CART TOTAL
  // =====================================================

  const cartTotalAmount =
    cartItems.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.price || 0
        ) *
          Number(
            item.quantity || 0
          ),
      0
    );


  // =====================================================
  // PLACE FOOD ORDER
  // =====================================================
  //
  // New flow:
  //
  // POST
  // /api/bookings/:bookingId/rooms/:roomId/food
  //
  // New food = Pending
  //
  // =====================================================

  const handlePlaceOrder =
    async () => {

      if (
        cartItems.length === 0
      ) {
        warn("Please select at least one food item.");
        return;
      }


      if (!bookingId) {
       warn("Booking ID is missing. Please select a booking.");
        return;
      }


      if (!roomId) {
        warn("Booked room ID is missing. Please select a room.");
        return;
      }


      if (!roomNumber) {
        warn("Room number is missing.");
        return;
      }


      try {

        setSubmitting(true);
       
        setError("");


        console.log(
          "========== ADD FOOD ORDER =========="
        );

        console.log(
          "bookingId:",
          bookingId
        );

        console.log(
          "roomId:",
          roomId
        );

        console.log(
          "roomNumber:",
          roomNumber
        );


        // -------------------------------------------------
        // ADD EACH CART ITEM
        // -------------------------------------------------

        await Promise.all(
          cartItems.map(
            async (
              cartItem
            ) => {

              const foodId =
                cartItem._id ||
                cartItem.id;


              if (!foodId) {
                throw new Error(
                  "Food ID is missing."
                );
              }


              const price =
                Number(
                  cartItem.price ||
                    cartItem.foodPrice ||
                    0
                );


              const quantity =
                Number(
                  cartItem.quantity ||
                    1
                );


              const payload = {

                foodId,

                name:
                  cartItem.name ||
                  cartItem.foodName ||
                  "",

                price,

                quantity,

                total:
                  price *
                  quantity,

                paymentStatus:
                  "Pending",
              };


              console.log(
                "Adding food:",
                payload
              );


              await addFoodService(
                bookingId,
                roomId,
                payload
              );
            }
          )
        );


        // -------------------------------------------------
        // CLEAR CART
        // -------------------------------------------------

        setCart({});


        // -------------------------------------------------
        // RELOAD DATABASE
        // -------------------------------------------------

        await fetchBookingFoodServices();



       success("Food order added to the bill successfully.");

      } catch (err) {

        console.error(
          "Failed to place food order:",
          err
        );


        setError("");

toastError(
  err?.message ||
    "Failed to save food order."
);

      } finally {

        setSubmitting(false);
      }
    };


  // =====================================================
  // REMOVE PENDING FOOD
  // =====================================================

  const handleRemoveActiveItem =
    async (
      recordId
    ) => {

      if (!recordId) {
  warn("Food service ID is missing.");
  return;
}


     if (!roomId) {
  warn("Room ID is missing.");
  return;
}


      if (!roomId) {
  warn("Room ID is missing.");
  return;
}


      try {

        setRemovingId(
          recordId
        );


        await deleteFoodService(
          bookingId,
          roomId,
          recordId
        );


        await fetchBookingFoodServices();


      } catch (err) {

      toastError(
  err?.message ||
    "Failed to remove food item."
);


        toastError(
  err?.message ||
    "Failed to remove food item."
);

      } finally {

        setRemovingId(
          null
        );
      }
    };


  // =====================================================
  // CONFIRM FOOD BILL
  // =====================================================
  //
  // IMPORTANT:
  //
  // Confirming the bill DOES NOT make food Paid.
  //
  // Food remains Pending until final checkout.
  //
  // =====================================================

  const handleConfirmBill =
    async () => {

     if (activeFoodList.length === 0) {
  warn("No pending food orders to confirm.");
  return;
}

success(
  "Food bill confirmed. Payment will be marked Paid at final checkout."
);

    };


  // =====================================================
  // FORMAT DATE / TIME
  // =====================================================

  const formatDateTime =
    (
      dateString
    ) => {

      if (!dateString) {
        return "Just now";
      }


      const date =
        new Date(
          dateString
        );


      if (
        isNaN(
          date.getTime()
        )
      ) {
        return "Recent";
      }


      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )}`;
    };


  // =====================================================
  // ACTIVE TOTAL
  // =====================================================

  const activeTotal =
    activeFoodList.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.totalPrice ||
            item.total ||
            0
        ),
      0
    );


  // =====================================================
  // HISTORY TOTAL
  // =====================================================

  const historyTotal =
    historyFoodList.reduce(
      (
        sum,
        item
      ) =>
        sum +
        Number(
          item.totalPrice ||
            item.total ||
            0
        ),
      0
    );


  // =====================================================
  // UI
  // =====================================================

  if (subscriptionLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[280px] text-center">
        <Loader2 className="w-7 h-7 text-teal-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Checking Food Service access...</p>
        <p className="text-xs text-slate-400 mt-1">Verifying your subscription and plan.</p>
      </div>
    );
  }

  if (!featureAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[280px] text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
          <UtensilsCrossed className="w-7 h-7 text-amber-600" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Food Service Not Available</h3>
        <p className="text-xs text-slate-500 max-w-md mt-2">
          {featureMessage || "Food Service is not included in your current subscription plan."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

      {/* ===================================================
          LEFT SIDE
      ==================================================== */}

      <div className="lg:col-span-2 space-y-6">

        {/* =================================================
            FOOD CATALOG
        ================================================= */}

        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200">

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">

            <div>

              <h3 className="font-bold text-slate-900 text-sm">
                Food Menu
              </h3>

              <div className="flex items-center gap-2 mt-0.5">

                <p className="text-xs text-slate-400">
                  Select food items and add them to the bill.
                </p>

                {roomNumber && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-bold">
                    Room {roomNumber}
                  </span>
                )}

              </div>

            </div>


            {/* SEARCH */}

            <div className="relative w-full sm:w-60">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />

              <input
                type="text"
                placeholder="Search food item..."
                value={foodSearch}
                onChange={(e) =>
                  setFoodSearch(
                    e.target.value
                  )
                }
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600"
              />

            </div>

          </div>


          {/* =================================================
              FILTERS
          ================================================= */}

          <div className="flex gap-2 mb-4">

            {[
              "All",
              "Veg",
              "Non-Veg",
            ].map(
              (filter) => (

                <button
                  key={filter}
                  type="button"
                  onClick={() =>
                    setSelectedFilter(
                      filter
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                    selectedFilter ===
                    filter
                      ? "bg-teal-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {filter}
                </button>

              )
            )}

          </div>


          {/* ERROR */}

          {error && (
            <div className="mb-3 p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}


          {/* SUCCESS */}

         


          {/* FOOD LIST */}

          <div className="max-h-[320px] overflow-y-auto pr-2 space-y-3">

            {loading ? (

              <div className="flex flex-col items-center justify-center py-12">

                <Loader2 className="w-6 h-6 text-teal-600 animate-spin mb-2" />

                <p className="text-xs text-slate-400">
                  Loading menu catalog...
                </p>

              </div>

            ) : filteredFoods.length === 0 ? (

              <div className="text-center py-12 text-slate-400 text-xs">
                No food items found.
              </div>

            ) : (

              filteredFoods.map(
                (food) => {

                  const foodId =
                    food._id ||
                    food.id;


                  const foodName =
                    food.foodName ||
                    food.name ||
                    "";


                  const foodPrice =
                    Number(
                      food.foodPrice ??
                        food.price ??
                        0
                    );


                  const foodDesc =
                    food.description ||
                    food.desc ||
                    "";


                  const imageSrc =
                    getImageUrl(
                      food.foodImage ||
                        food.image
                    );


                  const qty =
                    Number(
                      cart[foodId]
                        ?.quantity || 0
                    );


                  return (

                    <div
                      key={foodId}
                      className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-4 shadow-xs"
                    >

                      <img
                        src={imageSrc}
                        alt={foodName}
                        className="w-14 h-14 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                      />


                      <div className="flex-1 min-w-0">

                        <h4 className="font-bold text-slate-900 text-xs truncate">
                          {foodName}
                        </h4>


                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {foodDesc}
                        </p>


                        <p className="text-xs font-bold text-teal-700 mt-1">
                          ₹{foodPrice}
                        </p>

                      </div>


                      <div className="flex items-center gap-2 flex-shrink-0">

                        {qty > 0 ? (

                          <div className="flex items-center gap-2 bg-slate-100 px-2 py-1 rounded-lg">

                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(
                                  food,
                                  -1
                                )
                              }
                              className="w-6 h-6 bg-white rounded shadow-xs font-bold text-slate-700"
                            >
                              -
                            </button>


                            <span className="text-xs font-bold w-4 text-center">
                              {qty}
                            </span>


                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(
                                  food,
                                  1
                                )
                              }
                              className="w-6 h-6 bg-white rounded shadow-xs font-bold text-slate-700"
                            >
                              +
                            </button>

                          </div>

                        ) : (

                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(
                                food,
                                1
                              )
                            }
                            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-1"
                          >

                            <Plus className="w-3.5 h-3.5" />

                            Add

                          </button>

                        )}

                      </div>

                    </div>

                  );
                }
              )

            )}

          </div>

        </div>


        {/* =================================================
            PENDING + HISTORY
        ================================================= */}

        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">

          {/* =================================================
              PENDING
          ================================================= */}

          <div>

            <h4 className="font-bold text-slate-800 text-xs uppercase mb-2 flex items-center justify-between">

              <span>
                Food Queue (Pending Payment)
              </span>

              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px]">
                {activeFoodList.length} items
              </span>

            </h4>


            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">

              {activeFoodList.length === 0 ? (

                <p className="text-xs text-slate-400 py-4 text-center">
                  No pending food orders for this room.
                </p>

              ) : (

                activeFoodList.map(
                  (item) => {

                    const recordId =
                      item._id ||
                      item.id;


                    const itemTotal =
                      Number(
                        item.totalPrice ??
                          item.total ??
                          0
                      );


                    return (

                      <div
                        key={recordId}
                        className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between"
                      >

                        <div className="flex items-center gap-2.5 min-w-0">

                          <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 flex-shrink-0">

                            <UtensilsCrossed className="w-3.5 h-3.5" />

                          </div>


                          <div className="min-w-0">

                            <p className="text-xs font-bold text-slate-900 truncate">
                              {item.foodName} ×
                              {item.quantity}
                            </p>


                            <div className="flex items-center gap-2 flex-wrap">

                              <p className="text-[10px] text-slate-500 font-semibold">
                                Room{" "}
                                {item.roomNumber ||
                                  roomNumber ||
                                  "-"}
                              </p>


                              <p className="text-[10px] text-amber-600 font-semibold">
                                Payment Status:
                                Pending
                              </p>

                            </div>

                          </div>

                        </div>


                        <div className="flex items-center gap-3 flex-shrink-0">

                          <span className="text-xs font-bold text-slate-900">
                            ₹{itemTotal}
                          </span>


                          <button
                            type="button"
                            disabled={
                              removingId ===
                              recordId
                            }
                            onClick={() =>
                              handleRemoveActiveItem(
                                recordId
                              )
                            }
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-50"
                          >

                            {removingId ===
                            recordId ? (

                              <Loader2 className="w-3.5 h-3.5 animate-spin" />

                            ) : (

                              <Trash2 className="w-3.5 h-3.5" />

                            )}

                          </button>

                        </div>

                      </div>

                    );
                  }
                )

              )}

            </div>


            {/* PENDING TOTAL */}

            {activeFoodList.length >
              0 && (

              <div className="flex justify-end mt-2 text-xs font-bold text-amber-700">
                Pending Food Total: ₹
                {activeTotal}
              </div>

            )}

          </div>


          {/* =================================================
              PAID HISTORY
          ================================================= */}

          <div className="border-t border-slate-100 pt-3">

            <h4 className="font-bold text-slate-800 text-xs uppercase mb-2 flex items-center gap-1.5">

              <History className="w-3.5 h-3.5 text-slate-600" />

              Paid Food History (
              {historyFoodList.length}
              )

            </h4>


            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">

              {historyFoodList.length ===
              0 ? (

                <p className="text-xs text-slate-400 py-2 text-center">
                  No paid food history.
                </p>

              ) : (

                historyFoodList.map(
                  (item) => {

                    const itemId =
                      item._id ||
                      item.id;


                    const itemTotal =
                      Number(
                        item.totalPrice ??
                          item.total ??
                          0
                      );


                    return (

                      <div
                        key={itemId}
                        className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                      >

                        <div className="min-w-0">

                          <p className="font-bold text-slate-800">
                            {item.foodName} ×
                            {item.quantity}
                          </p>


                          <div className="flex items-center gap-2 text-[8px] text-slate-400">

                            <span className="font-semibold text-slate-500">
                              Room{" "}
                              {item.roomNumber ||
                                roomNumber ||
                                "-"}
                            </span>


                            <span className="flex items-center gap-1">

                              <Clock className="w-3 h-3" />

                              {formatDateTime(
                                item.updatedAt ||
                                  item.createdAt
                              )}

                            </span>

                          </div>


                          <span className="inline-block mt-1 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-[10px] rounded">
                            Payment Status: Paid
                          </span>

                        </div>


                        <span className="font-bold text-emerald-700 ml-3">
                          ₹{itemTotal}
                        </span>

                      </div>

                    );
                  }
                )

              )}

            </div>


            {historyFoodList.length >
              0 && (

              <div className="flex justify-end mt-2 text-xs font-bold text-emerald-700">
                Paid Food Total: ₹
                {historyTotal}
              </div>

            )}

          </div>

        </div>

      </div>


      {/* =====================================================
          RIGHT SIDEBAR
      ====================================================== */}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between h-[350px] sticky top-0 shadow-sm overflow-hidden">

        <div className="flex flex-col h-full">

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 flex-shrink-0">

            <ShoppingBag className="w-4 h-4 text-teal-600" />

            <h3 className="font-bold text-slate-900 text-sm">
              New Food Order Cart
            </h3>

          </div>


          {/* =================================================
              CART
          ================================================= */}

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 my-2 pr-1 min-h-0">

            {cartItems.length ===
            0 ? (

              <div className="text-center py-16 text-slate-400 text-xs">
                No items added to cart yet. Click 'Add' on any food card.
              </div>

            ) : (

              cartItems.map(
                (item) => {

                  const itemId =
                    item._id ||
                    item.id;


                  const imageSrc =
                    getImageUrl(
                      item.foodImage ||
                        item.image
                    );


                  const itemTotal =
                    Number(
                      item.price || 0
                    ) *
                    Number(
                      item.quantity || 0
                    );


                  return (

                    <div
                      key={itemId}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >

                      <div className="flex items-center gap-2 min-w-0">

                        <img
                          src={imageSrc}
                          alt={item.name}
                          className="w-9 h-9 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                        />


                        <div className="min-w-0">

                          <p className="text-xs font-bold text-slate-800 truncate">
                            {item.name}
                          </p>


                          <p className="text-[11px] text-slate-400">
                            ₹{item.price} ×{" "}
                            {item.quantity}
                          </p>

                        </div>

                      </div>


                      <div className="flex items-center gap-2.5 flex-shrink-0">

                        <span className="text-xs font-bold text-slate-900">
                          ₹{itemTotal}
                        </span>


                        <button
                          type="button"
                          onClick={() =>
                            setCart(
                              (
                                prev
                              ) => {

                                const copy =
                                  {
                                    ...prev,
                                  };


                                delete copy[
                                  itemId
                                ];


                                return copy;
                              }
                            )
                          }
                          className="text-slate-400 hover:text-rose-600"
                        >

                          <Trash2 className="w-3.5 h-3.5" />

                        </button>

                      </div>

                    </div>

                  );
                }
              )

            )}

          </div>


          {/* =================================================
              CART FOOTER
          ================================================= */}

          <div className="border-t border-slate-100 pt-3 space-y-3 flex-shrink-0 bg-white">

            <div className="flex items-center justify-between text-sm font-bold text-slate-900">

              <span>
                Cart Total:
              </span>

              <span className="text-teal-700">
                ₹{cartTotalAmount}
              </span>

            </div>


            <button
              type="button"
              onClick={
                handlePlaceOrder
              }
              disabled={
                cartItems.length ===
                  0 ||
                submitting ||
                !bookingId ||
                !roomId
              }
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2"
            >

              {submitting && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}

              {submitting
                ? "Placing Order..."
                : "Confirm & Send to Bill"}

            </button>


            {!bookingId && (

              <p className="text-[10px] text-rose-500 text-center">
                Booking ID is missing.
              </p>

            )}


            {bookingId &&
              !roomId && (

              <p className="text-[10px] text-rose-500 text-center">
                Booked room ID is missing.
              </p>

            )}

          </div>

        </div>

      </div>

    </div>
  );
}