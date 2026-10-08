import React, { useState, useEffect } from "react";
import {
  Wrench,
  Plus,
  Trash2,
  ReceiptText,
  Loader2,
  CheckCircle2,
  History,
  Clock,
  Sparkles,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { useToast } from "../../../../Context/ToastContext.jsx";
import {
  addRoomService,
  getBookingById,
} from "../../../../service/bookingApi";
import { getAllServicesApi } from "../../../../service/servicesListCreate";
import { deleteRoomService } from "../../../../service/roomServiceService";
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
  const [hasNewServicesAdded, setHasNewServicesAdded] = useState(false);
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
    setHasNewServicesAdded(false);
    setConfirmedSuccess(false);
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

  // Auto-hide the success banner after 4 seconds
  useEffect(() => {
    if (!confirmedSuccess) return;
    const timer = setTimeout(() => {
      setConfirmedSuccess(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [confirmedSuccess]);

  const fetchMasterServices = async () => {
    try {
      setFetchingCatalog(true);
      const res = await getAllServicesApi();
      const servicesArray = res?.services || res?.data || res || [];
      const activeServices = Array.isArray(servicesArray)
        ? servicesArray.filter((s) => s.isEnabled !== false)
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

      const rooms = Array.isArray(booking?.rooms) ? booking.rooms : [];

      // IMPORTANT:
      // roomId is the embedded Booking room _id.
      // room.roomId is the physical Room collection ID.
      const selectedRoom =
        rooms.find(
          (room) =>
            String(room?._id || room?.id || "") === String(roomId || "")
        ) ||
        rooms.find(
          (room) =>
            String(room?.roomNumber || "").trim() ===
            String(roomNumber || "").trim()
        );

      const embeddedServices = Array.isArray(selectedRoom?.roomServices)
        ? selectedRoom.roomServices
        : [];

      const pendingServices = embeddedServices.filter(
        (service) =>
          String(service?.paymentStatus || "").toLowerCase() === "pending"
      );

      const paidServices = embeddedServices.filter(
        (service) =>
          String(service?.paymentStatus || "").toLowerCase() === "paid"
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

    if (submitting) return;

    if (
      !serviceName.trim() ||
      serviceFee === "" ||
      Number(serviceFee) < 0
    ) {
      toast.warn("Please select a valid service from the catalog dropdown.");
      return;
    }

    // Duplicate service safeguard
    const isAlreadyQueued = serviceList.some(
      (item) =>
        (selectedServiceId &&
          (item.serviceId === selectedServiceId ||
            item._id === selectedServiceId ||
            item.id === selectedServiceId)) ||
        (item.serviceName || item.name || "").trim().toLowerCase() ===
          serviceName.trim().toLowerCase()
    );

    if (isAlreadyQueued) {
      toast.warn(
        `"${serviceName}" is already in the queued list for Room ${
          roomNumber || ""
        }.`
      );
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
      setError("");

      const payload = {
        serviceId: selectedServiceId || null,
        name: serviceName.trim(),
        fees: Number(serviceFee),
        quantity: 1,
        total: Number(serviceFee),
        paymentStatus: "Pending",
      };

      await addRoomService(bookingId, roomId, payload);
      await fetchBookingServices();

      const addedName = serviceName;
      setSelectedServiceId("");
      setServiceName("");
      setServiceFee("");

      // Enable the Confirm Bill button for new addition
      setHasNewServicesAdded(true);
      setConfirmedSuccess(false);

      toast.success(
        `"${addedName}" added to Room ${roomNumber || ""} service queue.`
      );
    } catch (err) {
      console.error("Failed to add room service:", err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to add service record.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const removeService = async (serviceId, serviceTitle, feeAmount) => {
    if (removingId) return;

    if (!serviceId) {
      toast.warn("Room service ID is missing.");
      return;
    }

    if (!bookingId || !roomId) {
      toast.warn("Booking or room ID is missing.");
      return;
    }

    // Professional confirm dialog before deleting
    toast.confirm(
      `Remove "${serviceTitle || "this service"}" (₹${feeAmount || 0}) from Room ${roomNumber || ""}?`,
      async () => {
        try {
          setRemovingId(serviceId);
          setError("");

          await deleteRoomService(bookingId, roomId, serviceId);
          await fetchBookingServices();

          setConfirmedSuccess(false);
          toast.success(
            `"${serviceTitle || "Service"}" removed from service list.`
          );
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
      {
        title: "Remove Service Charge",
        confirmText: "Remove Charge",
        cancelText: "Keep Service",
        variant: "danger",
      }
    );
  };

  const totalServiceFees = serviceList.reduce(
    (sum, item) =>
      sum +
      Number(
        item.total ??
          Number(
            item.fees ?? item.serviceFees ?? item.fee ?? 0
          ) * Number(item.quantity ?? 1)
      ),
    0
  );

  const handleSubmitServices = () => {
    if (confirming) return;

    if (!hasNewServicesAdded || serviceList.length === 0) {
      toast.warn("No new services to confirm.");
      return;
    }

    // Professional confirm modal before committing to final invoice
    toast.confirm(
      `Confirm newly added service charges (₹${totalServiceFees}) for Room ${roomNumber || ""}? These charges will be attached to the customer's checkout invoice.`,
      async () => {
        try {
          setConfirming(true);
          setError("");

          await fetchBookingServices();

          setHasNewServicesAdded(false);
          setConfirmedSuccess(true);
          toast.success(
            `Service bill of ₹${totalServiceFees} confirmed for Room ${roomNumber || ""}. Payment will be collected at checkout.`
          );
        } catch (err) {
          console.error("Failed to confirm service bill:", err);
          const errMsg = err?.message || "Failed to confirm service bill.";
          setError(errMsg);
          toast.error(errMsg);
        } finally {
          setConfirming(false);
        }
      },
      {
        title: "Confirm Service Bill",
        confirmText: `Confirm (₹${totalServiceFees})`,
        cancelText: "Review",
        variant: "primary",
      }
    );
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Recent"
      : `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
  };

  if (subscriptionLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8 bg-slate-50/50 rounded-2xl border border-slate-100">
        <Loader2 className="w-8 h-8 text-[#0f2a63] animate-spin mb-3" />
        <p className="text-sm font-bold text-[#0f2a63]">
          Checking Room Service Access...
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
          <Wrench className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-[#0f2a63]">
          Room Service Not Available
        </h3>
        <p className="text-xs text-slate-600 max-w-md mt-2 leading-relaxed">
          {featureMessage ||
            "Room Service is not included in your current subscription plan."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left 2 Cols: Form Input, Active Queue & Past Confirmed History */}
      <div className="lg:col-span-2 space-y-6">
        {/* Top Form Container */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_rgba(15,42,99,0.04)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0f2a63] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Wrench className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[#0f2a63] text-base">
                  Add Room Service
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 pl-10">
                Select a catalog service to attach charges to this room.
              </p>
            </div>

            {roomNumber && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-[#0f2a63] border border-blue-100 text-xs font-bold self-start sm:self-auto">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                Room {roomNumber}
              </span>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              {error}
            </div>
          )}

          {confirmedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Services confirmed successfully! Pending final checkout settlement.
            </div>
          )}

          <form onSubmit={handleAddService} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Service Item
              </label>
              <select
                value={selectedServiceId}
                onChange={handleServiceSelectionChange}
                disabled={fetchingCatalog}
                className="w-full px-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/15 transition-all shadow-xs"
              >
                <option value="">-- Choose a Service from Catalog --</option>
                {availableMasterServices.map((srv) => {
                  const sId = srv._id || srv.id;
                  return (
                    <option key={sId} value={sId}>
                      {srv.serviceName} — ₹{srv.serviceFees}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Rate (₹)
              </label>
              <input
                type="number"
                placeholder="Auto-filled"
                value={serviceFee}
                readOnly
                className="w-full px-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-not-allowed shadow-xs"
              />
            </div>

            <div className="sm:col-span-3 pt-1">
              <button
                type="submit"
                disabled={submitting || !selectedServiceId}
                className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-150 w-full sm:w-auto ${
                  !selectedServiceId || submitting
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    : "bg-[#0f2a63] hover:bg-[#183d8a] text-white shadow-sm cursor-pointer active:scale-98"
                }`}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {submitting ? "Adding Service..." : "Add to Service Queue"}
              </button>
            </div>
          </form>

          {/* Active Queued Services List */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-[#0f2a63] text-xs uppercase tracking-wide flex items-center gap-1.5">
                <span>Queued Services (Unconfirmed)</span>
              </h4>
              <span className="bg-blue-50 text-[#0f2a63] border border-blue-100 font-bold px-2.5 py-0.5 rounded-full text-[11px]">
                {serviceList.length} {serviceList.length === 1 ? "item" : "items"}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-2" />
                  <p className="text-xs font-medium">Loading room services...</p>
                </div>
              ) : serviceList.length === 0 ? (
                <div className="p-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-medium text-slate-500">
                    No new services in queue for Room {roomNumber || "-"}.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Select a service above to add it to this stay.
                  </p>
                </div>
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
                      className="bg-white p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-200 flex items-center justify-between shadow-xs transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0f2a63] flex items-center justify-center shrink-0 border border-blue-100">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10.5px] font-semibold text-slate-500">
                              Room {service.roomNumber || service.roomNo || service.room?.roomNumber || roomNumber || "-"}
                            </span>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
                              Pending
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 shrink-0 pl-2">
                        <span className="text-xs font-extrabold text-[#0f2a63]">
                          ₹{fee}
                        </span>
                        <button
                          type="button"
                          disabled={removingId === serviceId}
                          onClick={() => removeService(serviceId, name, fee)}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-transparent transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_rgba(15,42,99,0.04)] space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <h4 className="font-bold text-[#0f2a63] text-xs uppercase tracking-wide">
                Confirmed / Billed Services
              </h4>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {historyList.length} records
            </span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {historyList.length === 0 ? (
              <p className="text-xs text-slate-400 py-5 text-center font-medium">
                No previously confirmed service charges for this room.
              </p>
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
                const timestamp = formatDateTime(
                  item.createdAt || item.updatedAt
                );

                return (
                  <div
                    key={id}
                    className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 flex items-center justify-between"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> {timestamp}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded font-bold">
                          Paid
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-slate-700 shrink-0">
                      ₹{fee}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Right Sticky Sidebar: Current Active Bill Summary */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between min-h-[360px] sticky top-4 shadow-[0_6px_24px_rgba(15,42,99,0.06)] overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0f2a63] flex items-center justify-center shrink-0 border border-blue-100">
                <ReceiptText className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-[#0f2a63] text-sm">
                Bill Summary
              </h3>
            </div>
            {roomNumber && (
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                Room {roomNumber}
              </span>
            )}
          </div>

          <div className="space-y-2.5 my-3.5 flex-1 overflow-y-auto pr-1">
            {serviceList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 py-10">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  No active items queued.
                </p>
                <p className="text-[11px] text-slate-400 max-w-[200px]">
                  Add services from the catalog to prepare the bill.
                </p>
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
                  <div
                    key={sId}
                    className="flex justify-between items-center text-xs text-slate-600 py-1 border-b border-slate-50 last:border-0"
                  >
                    <span className="truncate pr-2 font-medium">{sName}</span>
                    <span className="font-bold text-slate-900 shrink-0">
                      ₹{sFee}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-100 pt-3.5 space-y-3 shrink-0 bg-white">
            <div className="flex items-center justify-between text-sm font-extrabold text-[#0f2a63]">
              <span>Pending Charges:</span>
              <span className="text-blue-600 text-base">₹{totalServiceFees}</span>
            </div>

            {hasNewServicesAdded && serviceList.length > 0 ? (
              <button
                onClick={handleSubmitServices}
                disabled={confirming}
                className="w-full py-2.5 bg-[#0f2a63] hover:bg-[#183d8a] text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-150 flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:cursor-not-allowed"
              >
                {confirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Confirming Bill...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Confirm Service Bill (₹{totalServiceFees})
                  </>
                )}
              </button>
            ) : (
              <button
                disabled
                className="w-full py-2.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <ShieldCheck className="w-4 h-4 text-slate-300" />
                Confirm Service Bill
              </button>
            )}

            <p className="text-[10px] text-slate-400 text-center font-medium">
              Confirmed charges are added to checkout invoice
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}