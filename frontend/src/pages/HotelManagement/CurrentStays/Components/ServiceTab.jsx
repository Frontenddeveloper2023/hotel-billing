import React, { useState, useEffect } from "react";
import { Wrench, Plus, Trash2, ReceiptText, Loader2, CheckCircle2, History, Clock } from "lucide-react";
import {
  addRoomService,
  getBookingById,
} from "../../../../service/bookingApi";
import { getAllServicesApi } from "../../../../service/servicesListCreate";



import {
  deleteRoomService,
} from "../../../../service/roomServiceService";

import { checkRoomServiceAccess } from "../../../../service/subscriptionFeatureApi";

export default function ServiceTab({
  customerId,
  roomNumber,
  bookingId,
  roomId,
}) {
  const [availableMasterServices, setAvailableMasterServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [serviceFee, setServiceFee] = useState("");
  
  const [serviceList, setServiceList] = useState([]); // Active queued services
  const [historyList, setHistoryList] = useState([]); // Previously confirmed bills
  const [loading, setLoading] = useState(false);
  const [fetchingCatalog, setFetchingCatalog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);
  const [error, setError] = useState("");
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [featureAllowed, setFeatureAllowed] = useState(false);
  const [featureMessage, setFeatureMessage] = useState("");
  const [removingId, setRemovingId] = useState(null);

  // Check subscription + plan before loading this feature.
  useEffect(() => {
    verifyRoomServiceAccess();
  }, []);

  // Fetch embedded room services whenever the selected booking/room changes.
  useEffect(() => {
    if (!featureAllowed || !bookingId) return;
    fetchBookingServices();
  }, [featureAllowed, bookingId, roomId, roomNumber]);

  const verifyRoomServiceAccess = async () => {
    try {
      setSubscriptionLoading(true);
      setFeatureMessage("");
      const access = await checkRoomServiceAccess();

      if (!access.featureAllowed) {
        setFeatureAllowed(false);
        setFeatureMessage(
          access.message ||
            `Room Service is not included in your current ${access.plan?.planName || "subscription"} plan.`
        );
        return;
      }

      setFeatureAllowed(true);
      await fetchMasterServices();
    } catch (err) {
      console.error("Room service subscription check failed:", err);
      setFeatureAllowed(false);
      setFeatureMessage(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to verify your Room Service subscription."
      );
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Auto-hide the success banner after 3 seconds
  useEffect(() => {
    if (!confirmedSuccess) return;
    const timer = setTimeout(() => {
      setConfirmedSuccess(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [confirmedSuccess]);

  const fetchMasterServices = async () => {
    try {
      setFetchingCatalog(true);
      const res = await getAllServicesApi();
      const servicesArray = res?.services || res?.data || res || [];
      const activeServices = Array.isArray(servicesArray) 
        ? servicesArray.filter(s => s.isEnabled !== false) 
        : [];
      setAvailableMasterServices(activeServices);
    } catch (err) {
      console.error("Failed to load master service catalog:", err);
    } finally {
      setFetchingCatalog(false);
    }
  };

 const fetchBookingServices = async () => {
  try {
    setLoading(true);
    setError("");

    if (!bookingId) {
      setServiceList([]);
      setHistoryList([]);
      setError("Booking ID is missing. Please select a valid booking.");
      return;
    }

    const response = await getBookingById(bookingId);

    const booking =
      response?.data?.booking ||
      response?.data?.data ||
      response?.data ||
      response?.booking ||
      response;

    const rooms = Array.isArray(booking?.rooms)
      ? booking.rooms
      : [];

    // IMPORTANT:
    // roomId is the embedded Booking room _id.
    // room.roomId is the physical Room collection ID.
    const selectedRoom =
      rooms.find(
        (room) =>
          String(room?._id || room?.id || "") ===
          String(roomId || "")
      ) ||
      rooms.find(
        (room) =>
          String(room?.roomNumber || "").trim() ===
          String(roomNumber || "").trim()
      );

    const embeddedServices = Array.isArray(
      selectedRoom?.roomServices
    )
      ? selectedRoom.roomServices
      : [];

    const pendingServices = embeddedServices.filter(
      (service) =>
        String(service?.paymentStatus || "").toLowerCase() ===
        "pending"
    );

    const paidServices = embeddedServices.filter(
      (service) =>
        String(service?.paymentStatus || "").toLowerCase() ===
        "paid"
    );

    setServiceList(pendingServices);
    setHistoryList(paidServices);
  } catch (err) {
    console.error("Failed to fetch booking room services:", err);

    setServiceList([]);
    setHistoryList([]);

    setError(
      err?.response?.data?.message ||
        err?.message ||
        "Could not load room services."
    );
  } finally {
    setLoading(false);
  }
};

  const handleServiceSelectionChange = (e) => {
    const chosenId = e.target.value;
    setSelectedServiceId(chosenId);

    if (!chosenId) {
      setServiceName("");
      setServiceFee("");
      return;
    }

    const matchedService = availableMasterServices.find(
      (s) => (s._id || s.id) === chosenId
    );

    if (matchedService) {
      setServiceName(matchedService.serviceName || "");
      setServiceFee(matchedService.serviceFees ?? matchedService.fee ?? "");
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();

    if (
      !serviceName.trim() ||
      serviceFee === "" ||
      Number(serviceFee) < 0
    ) {
      alert("Please select a valid service from the dropdown.");
      return;
    }

    if (!customerId) {
      alert("Customer ID is missing. Please select a valid customer.");
      return;
    }

    if (!bookingId) {
      alert("Booking ID is missing. Please select a valid booking.");
      return;
    }

    if (!roomId) {
      alert("Booking room ID is missing. Please select a valid room.");
      return;
    }

    try {
      setSubmitting(true);
      setConfirmedSuccess(false);
      setError("");

      const payload = {
        serviceId: selectedServiceId || null,
        name: serviceName.trim(),
        fees: Number(serviceFee),
        quantity: 1,
        total: Number(serviceFee),
        paymentStatus: "Pending",
      };

      console.log("========== ADD ROOM SERVICE ==========");
      console.log("Booking ID:", bookingId);
      console.log("Booking Room ID:", roomId);
      console.log("Room Number:", roomNumber);
      console.log("Payload:", payload);

      await addRoomService(bookingId, roomId, payload);

      await fetchBookingServices();

      setSelectedServiceId("");
      setServiceName("");
      setServiceFee("");
    } catch (err) {
      console.error("Failed to add room service:", err);

      alert(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to add service record."
      );
    } finally {
      setSubmitting(false);
    }
  };

 const removeService = async (serviceId) => {
  if (!serviceId) {
    alert("Room service ID is missing.");
    return;
  }

  if (!bookingId || !roomId) {
    alert("Booking or room ID is missing.");
    return;
  }

  try {
    setRemovingId(serviceId);
    setError("");

    await deleteRoomService(
      bookingId,
      roomId,
      serviceId
    );

    await fetchBookingServices();
  } catch (err) {
    console.error("Failed to delete room service:", err);

    const message =
      err?.response?.data?.message ||
      err?.message ||
      "Failed to remove room service.";

    setError(message);
    alert(message);
  } finally {
    setRemovingId(null);
  }
};

  const totalServiceFees = serviceList.reduce(
    (sum, item) =>
      sum +
      Number(
        item.total ??
          Number(
            item.fees ??
              item.serviceFees ??
              item.fee ??
              0
          ) * Number(item.quantity ?? 1)
      ),
    0
  );

const handleSubmitServices = async () => {
  if (serviceList.length === 0) {
    alert("Please add at least one service.");
    return;
  }

  try {
    setConfirming(true);
    setError("");

    // Confirm Service Bill does NOT mark services as Paid.
    // Services remain Pending until the final Checkout Payment.
    await fetchBookingServices();

    setConfirmedSuccess(true);
  } catch (err) {
    console.error("Failed to confirm service bill:", err);
    setError(err?.message || "Failed to confirm service bill.");
    alert(err?.message || "Failed to confirm service bill.");
  } finally {
    setConfirming(false);
  }
};

  const formatDateTime = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Recent"
      : `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (subscriptionLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[280px] text-center">
        <Loader2 className="w-7 h-7 text-teal-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">Checking Room Service access...</p>
        <p className="text-xs text-slate-400 mt-1">Verifying your subscription and plan.</p>
      </div>
    );
  }

  if (!featureAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[280px] text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
          <Wrench className="w-7 h-7 text-amber-600" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Room Service Not Available</h3>
        <p className="text-xs text-slate-500 max-w-md mt-2">
          {featureMessage || "Room Service is not included in your current subscription plan."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left 2 Cols: Dropdown Form Input, Active Queue & Past Confirmed History */}
      <div className="lg:col-span-2 space-y-6">
        {/* Top Form Container */}
        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Add Service Charge</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-slate-400">
                Select a service from the catalog list to automatically fill fees.
              </p>

              {roomNumber && (
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-bold">
                  Room {roomNumber}
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {confirmedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-300">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Services confirmed and kept Pending until final checkout payment.
            </div>
          )}

          <form onSubmit={handleAddService} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Select Service</label>
              <select
                value={selectedServiceId}
                onChange={handleServiceSelectionChange}
                disabled={fetchingCatalog}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-600 shadow-xs"
              >
                <option value="">-- Choose a Service --</option>
                {availableMasterServices.map((srv) => {
                  const sId = srv._id || srv.id;
                  return (
                    <option key={sId} value={sId}>
                      {srv.serviceName} (₹{srv.serviceFees})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Service Fee (₹)</label>
              <input
                type="number"
                placeholder="Auto-filled"
                value={serviceFee}
                readOnly
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none shadow-xs cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={submitting || !selectedServiceId}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition w-full sm:w-auto"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {submitting ? "Adding..." : "Add to Service List"}
              </button>
            </div>
          </form>

          {/* Active Queued Services List */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase mb-3 flex items-center justify-between">
              <span>Queued Services (To Be Billed)</span>
              <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full text-[10px]">
                {serviceList.length} items
              </span>
            </h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                </div>
              ) : serviceList.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No new services added for this billing session.
                </p>
              ) : (
                serviceList.map((service) => {
                  const serviceId = service._id || service.id;
                  const name = service.serviceName || service.name;
                  const fee =
                    service.total ??
                    Number(
                      service.fees ??
                        service.serviceFees ??
                        service.fee ??
                        0
                    ) * Number(service.quantity ?? 1);

                  return (
                    <div
                      key={serviceId}
                      className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-700 flex-shrink-0">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-slate-500 font-semibold">
                              Room {service.roomNumber || service.roomNo || service.room?.roomNumber || roomNumber || "-"}
                            </p>
                            <p className="text-[11px] text-amber-600 font-semibold">
                              Status: Pending
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs font-bold text-slate-900">₹{fee}</span>
                        <button
                          type="button"
                          disabled={removingId === serviceId}
                          onClick={() => removeService(serviceId)}
                          className="text-slate-400 hover:text-rose-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {removingId === serviceId ? (
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
          </div>
        </div>

        {/* Previously Confirmed Bills History Section */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <History className="w-4 h-4 text-slate-600" />
            <h4 className="font-bold text-slate-800 text-xs uppercase">
              Previously Confirmed Bills ({historyList.length})
            </h4>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {historyList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No past confirmed bills found.</p>
            ) : (
              historyList.map((item, idx) => {
                const id = item._id || item.id || idx;
                const name = item.serviceName || item.name;
                const fee =
                  item.total ??
                  Number(
                    item.fees ??
                      item.serviceFees ??
                      item.fee ??
                      0
                  ) * Number(item.quantity ?? 1);
                const timestamp = formatDateTime(item.createdAt || item.updatedAt);

                return (
                  <div
                    key={id}
                    className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {timestamp}
                        </span>
                        <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-medium">
                          Payment Status: Paid
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 flex-shrink-0">₹{fee}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Sticky Sidebar: Current Active Payment Details */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between h-[350px] sticky top-0 shadow-sm overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 flex-shrink-0">
            <ReceiptText className="w-4 h-4 text-teal-600" />
            <h3 className="font-bold text-slate-900 text-sm">Active Bill Summary</h3>
          </div>

          <div className="space-y-3 my-3 flex-1 overflow-y-auto pr-1">
            {serviceList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-12">
                <p className="text-xs text-slate-400">No active items in the current bill.</p>
                <p className="text-[11px] text-slate-400">Select services from dropdown to calculate total.</p>
              </div>
            ) : (
              serviceList.map((s) => {
                const sId = s._id || s.id;
                const sName = s.serviceName || s.name;
                const sFee =
                  s.total ??
                  Number(
                    s.fees ??
                      s.serviceFees ??
                      s.fee ??
                      0
                  ) * Number(s.quantity ?? 1);

                return (
                  <div key={sId} className="flex justify-between text-xs text-slate-600">
                    <span className="truncate pr-2">{sName}</span>
                    <span className="font-semibold text-slate-900 flex-shrink-0">₹{sFee}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3 flex-shrink-0 bg-white">
            <div className="flex items-center justify-between text-sm font-bold text-slate-900">
              <span>Current Total:</span>
              <span className="text-teal-700">₹{totalServiceFees}</span>
            </div>
            <button
              onClick={handleSubmitServices}
              disabled={serviceList.length === 0 || confirming}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2 active:scale-95"
            >
              {confirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirming Bill...
                </>
              ) : (
                "Confirm Service Bill"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}