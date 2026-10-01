import React, { useState, useEffect } from "react";
import { Wrench, Plus, Trash2, ReceiptText, Loader2, CheckCircle2, History, Clock } from "lucide-react";
import { useToast } from "../../../../Context/ToastContext.jsx";
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
  const toast = useToast();
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
      toast.warn("Please select a valid service from the dropdown.");
      return;
    }

    if (!customerId) {
      toast.warn("Customer ID is missing. Please select a valid customer.");
      return;
    }

    if (!bookingId) {
      toast.warn("Booking ID is missing. Please select a valid booking.");
      return;
    }

    if (!roomId) {
      toast.warn("Booking room ID is missing. Please select a valid room.");
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

      toast.success(`"${serviceName}" added to service list.`);
    } catch (err) {
      console.error("Failed to add room service:", err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to add service record."
      );
    } finally {
      setSubmitting(false);
    }
  };

 const removeService = async (serviceId, serviceName) => {
  if (!serviceId) {
    toast.warn("Room service ID is missing.");
    return;
  }

  if (!bookingId || !roomId) {
    toast.warn("Booking or room ID is missing.");
    return;
  }

  // confirm before delete
  toast.confirm(
    `Remove "${serviceName || "this service"}" from the service list?`,
    async () => {
      try {
        setRemovingId(serviceId);
        setError("");

        await deleteRoomService(bookingId, roomId, serviceId);
        await fetchBookingServices();

        toast.success("Service removed successfully.");
      } catch (err) {
        console.error("Failed to delete room service:", err);
        const message =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to remove room service.";
        setError(message);
        toast.error(message);
      } finally {
        setRemovingId(null);
      }
    },
    { title: "Remove Service", confirmText: "Remove", cancelText: "Keep" }
  );
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
    toast.warn("Please add at least one service.");
    return;
  }

  try {
    setConfirming(true);
    setError("");

    await fetchBookingServices();

    setConfirmedSuccess(true);
    toast.success("Service bill confirmed. Payment will be collected at checkout.");
  } catch (err) {
    console.error("Failed to confirm service bill:", err);
    setError(err?.message || "Failed to confirm service bill.");
    toast.error(err?.message || "Failed to confirm service bill.");
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
        <Loader2 className="w-7 h-7 text-[#2568e0] animate-spin mb-3" />
        <p className="text-sm font-semibold text-[#3d5473]">Checking Room Service access...</p>
        <p className="text-xs text-[#9aabc0] mt-1">Verifying your subscription and plan.</p>
      </div>
    );
  }

  if (!featureAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[280px] text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
          <Wrench className="w-7 h-7 text-amber-600" />
        </div>
        <h3 className="text-base font-bold text-[#0e2a4a]">Room Service Not Available</h3>
        <p className="text-xs text-[#6b7f99] max-w-md mt-2">
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
        <div className="bg-[#f4f8fd]/50 p-5 rounded-2xl border border-[#dbe6f5] space-y-4">
          <div>
            <h3 className="font-bold text-[#0e2a4a] text-sm">Add Service Charge</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-[#9aabc0]">
                Select a service from the catalog list to automatically fill fees.
              </p>

              {roomNumber && (
                <span className="px-2 py-0.5 rounded-full bg-[#eaf3ff] text-[#2568e0] border border-[#dbe6f5] text-[10px] font-bold">
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
              <label className="block text-xs font-semibold text-[#6b7f99] mb-1">Select Service</label>
              <select
                value={selectedServiceId}
                onChange={handleServiceSelectionChange}
                disabled={fetchingCatalog}
                className="w-full px-3 py-2 bg-white border border-[#dbe6f5] rounded-xl text-xs focus:outline-none focus:border-[#2568e0] shadow-[0_1px_4px_rgba(6,20,52,0.06)]"
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
              <label className="block text-xs font-semibold text-[#6b7f99] mb-1">Service Fee (₹)</label>
              <input
                type="number"
                placeholder="Auto-filled"
                value={serviceFee}
                readOnly
                className="w-full px-3 py-2 bg-[#eaf3ff] border border-[#dbe6f5] rounded-xl text-xs text-[#6b7f99] focus:outline-none shadow-[0_1px_4px_rgba(6,20,52,0.06)] cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={submitting || !selectedServiceId}
                className="px-4 py-2 bg-[#2568e0] hover:bg-[#1d56c4] disabled:bg-[#5b9bf5] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(6,20,52,0.08)] transition w-full sm:w-auto"
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
          <div className="border-t border-[#dbe6f5] pt-4">
            <h4 className="font-bold text-[#0e2a4a] text-xs uppercase mb-3 flex items-center justify-between">
              <span>Queued Services (To Be Billed)</span>
              <span className="bg-[#dbe6f5] text-[#0e2a4a] px-2 py-0.5 rounded-full text-[10px]">
                {serviceList.length} items
              </span>
            </h4>
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-[#2568e0] animate-spin" />
                </div>
              ) : serviceList.length === 0 ? (
                <p className="text-xs text-[#9aabc0] py-6 text-center">
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
                      className="bg-white p-3 rounded-xl border border-[#dbe6f5] flex items-center justify-between shadow-[0_1px_4px_rgba(6,20,52,0.06)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#eaf3ff] flex items-center justify-center text-[#2568e0] flex-shrink-0">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0e2a4a] truncate">{name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-[#6b7f99] font-semibold">
                              Room {service.roomNumber || service.roomNo || service.room?.roomNumber || roomNumber || "-"}
                            </p>
                            <p className="text-[11px] text-amber-600 font-semibold">
                              Status: Pending
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs font-bold text-[#0e2a4a]">₹{fee}</span>
                        <button
                          type="button"
                          disabled={removingId === serviceId}
                          onClick={() => removeService(serviceId, name)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#9aabc0] hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Remove service"
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
        <div className="bg-white p-5 rounded-2xl border border-[#dbe6f5] space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#e7eff8]">
            <History className="w-4 h-4 text-[#6b7f99]" />
            <h4 className="font-bold text-[#0e2a4a] text-xs uppercase">
              Previously Confirmed Bills ({historyList.length})
            </h4>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {historyList.length === 0 ? (
              <p className="text-xs text-[#9aabc0] py-4 text-center">No past confirmed bills found.</p>
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
                    className="bg-[#f4f8fd] p-3 rounded-xl border border-[#e7eff8] flex items-center justify-between"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold text-[#0e2a4a] truncate">{name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-[#9aabc0]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {timestamp}
                        </span>
                        <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-medium">
                          Payment Status: Paid
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#3d5473] flex-shrink-0">₹{fee}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Sticky Sidebar: Current Active Payment Details */}
      <div className="bg-white border border-[#dbe6f5] rounded-2xl p-4 flex flex-col justify-between h-[350px] sticky top-0 shadow-[0_2px_8px_rgba(6,20,52,0.08)] overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 pb-3 border-b border-[#e7eff8] flex-shrink-0">
            <ReceiptText className="w-4 h-4 text-[#2568e0]" />
            <h3 className="font-bold text-[#0e2a4a] text-sm">Active Bill Summary</h3>
          </div>

          <div className="space-y-3 my-3 flex-1 overflow-y-auto pr-1">
            {serviceList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-12">
                <p className="text-xs text-[#9aabc0]">No active items in the current bill.</p>
                <p className="text-[11px] text-[#9aabc0]">Select services from dropdown to calculate total.</p>
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
                  <div key={sId} className="flex justify-between text-xs text-[#6b7f99]">
                    <span className="truncate pr-2">{sName}</span>
                    <span className="font-semibold text-[#0e2a4a] flex-shrink-0">₹{sFee}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-[#e7eff8] pt-3 space-y-3 flex-shrink-0 bg-white">
            <div className="flex items-center justify-between text-sm font-bold text-[#0e2a4a]">
              <span>Current Total:</span>
              <span className="text-[#2568e0]">₹{totalServiceFees}</span>
            </div>
            <button
              onClick={handleSubmitServices}
              disabled={serviceList.length === 0 || confirming}
              className="w-full py-2.5 bg-[#2568e0] hover:bg-[#1d56c4] disabled:bg-[#dbe6f5] text-white rounded-xl text-xs font-semibold shadow-[0_2px_8px_rgba(6,20,52,0.08)] transition flex items-center justify-center gap-2 active:scale-95"
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