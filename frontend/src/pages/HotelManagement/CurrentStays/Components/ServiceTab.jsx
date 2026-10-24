import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  ChevronLeft,
  X,
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
  const [currentStep, setCurrentStep] = useState("services"); // "services" | "confirm"
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Check subscription + plan before loading this feature.
  useEffect(() => {
    verifyRoomServiceAccess();
  }, []);

  // Fetch embedded room services whenever the selected booking/room changes & listen for real-time updates.
  useEffect(() => {
    if (!featureAllowed || !bookingId) return;
    setHasNewServicesAdded(false);
    setConfirmedSuccess(false);
    fetchBookingServices();

    const handleRoomServiceUpdated = (e) => {
      if (!e.detail?.bookingId || e.detail.bookingId === bookingId) {
        fetchBookingServices();
      }
    };

    window.addEventListener("roomServiceUpdated", handleRoomServiceUpdated);
    return () => {
      window.removeEventListener("roomServiceUpdated", handleRoomServiceUpdated);
    };
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

  const handleSubmitServices = async () => {
    if (confirming) return;

    if (!hasNewServicesAdded || serviceList.length === 0) {
      toast.warn("No new services to confirm.");
      return;
    }

    try {
      setConfirming(true);
      setError("");

      await fetchBookingServices();

      setHasNewServicesAdded(false);
      setConfirmedSuccess(true);
      toast.success(
        `Service bill of ₹${totalServiceFees} confirmed for Room ${roomNumber || ""}. Added to checkout invoice.`
      );
    } catch (err) {
      console.error("Failed to confirm service bill:", err);
      const errMsg = err?.message || "Failed to confirm service bill.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setConfirming(false);
    }
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
          <Wrench className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-[#0f2a63]">
          Room Service Not Available
        </h3>
        <p className="text-xs text-black max-w-md mt-2 leading-relaxed">
          {featureMessage ||
            "Room Service is not included in your current subscription plan."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* ===================================================
          STEP 1: SELECT & QUEUE SERVICES
      ==================================================== */}
      {currentStep === "services" && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          {/* HEADER WITH ORDERS / HISTORY BUTTON */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h3 className="font-bold text-[#0f2a63] text-sm sm:text-base flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />
                <span>Room Services</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Choose service, add charges & confirm to bill
              </p>
            </div>

            <div className="flex items-center gap-2">
              {roomNumber && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                  Room {roomNumber}
                </span>
              )}

              {/* QUICK ACCESS TO ORDERS & HISTORY POPUP */}
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-[#0f2a63] text-xs font-bold transition-all cursor-pointer border border-slate-200/80 active:scale-95 shadow-2xs"
                title="View Pending & Past Services"
              >
                <History className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">History</span>
                {serviceList.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              {error}
            </div>
          )}

          {confirmedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Services confirmed successfully! Attached to room invoice.
            </div>
          )}

          {/* SERVICE SELECTION FORM */}
          <form onSubmit={handleAddService} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Select Service
              </label>
              <select
                value={selectedServiceId}
                onChange={handleServiceSelectionChange}
                disabled={fetchingCatalog}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-all"
              >
                <option value="">-- Choose a Service --</option>
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
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Fee (₹)
              </label>
              <input
                type="number"
                placeholder="Rate"
                value={serviceFee}
                readOnly
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end pt-1">
              <button
                type="submit"
                disabled={submitting || !selectedServiceId}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all w-full sm:w-auto ${
                  !selectedServiceId || submitting
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    : "bg-[#0f2a63] hover:bg-[#183d8a] text-white shadow-2xs cursor-pointer active:scale-95"
                }`}
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>{submitting ? "Adding..." : "Add to service bill"}</span>
              </button>
            </div>
          </form>

          {/* ACTIVE QUEUED SERVICES CARDS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-[#0f2a63] text-xs uppercase tracking-wider">
                Queued Services
              </h4>
              <span className="bg-blue-50 text-blue-700 border border-blue-100 font-bold px-2 py-0.5 rounded-full text-[10px]">
                {serviceList.length} items
              </span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 staylio-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin mb-1.5" />
                  <p className="text-xs">Loading services...</p>
                </div>
              ) : serviceList.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-medium text-slate-600">
                    No services in queue for Room {roomNumber || "-"}.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Select a service above and tap Add to Queue.
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
                      className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 hover:border-blue-200 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
                          <Wrench className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {name}
                          </p>
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Pending
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 pl-2">
                        <span className="text-xs font-extrabold text-[#0f2a63]">
                          ₹{fee}
                        </span>
                        <button
                          type="button"
                          disabled={removingId === serviceId}
                          onClick={() => removeService(serviceId, name, fee)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
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

          {/* BOTTOM ACTION: 1-CLICK CONFIRM BILL */}
          <div className="pt-3 pb-7 border-t border-slate-100 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Queued Services</p>
              <p className="text-sm font-extrabold text-[#0f2a63]">
                {serviceList.length} items • <span className="text-blue-600">₹{totalServiceFees}</span>
              </p>
            </div>

            <button
              type="button"
              disabled={confirming || !hasNewServicesAdded || serviceList.length === 0}
              onClick={handleSubmitServices}
              className="px-5 py-2.5 bg-[#0f2a63] hover:bg-[#183d8a] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-98"
            >
              {confirming ? (
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
          STEP 2: CONFIRM BILL & ATTACH CHARGES
      ==================================================== */}
      {currentStep === "confirm" && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          {/* HEADER WITH BACK BUTTON */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep("services")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Services</span>
            </button>

            <span className="text-xs font-extrabold text-[#0f2a63]">
              Confirm Bill (Room {roomNumber || "-"})
            </span>
          </div>

          {/* SERVICE ITEMS REVIEW */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 staylio-scrollbar">
            {serviceList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No services queued.
              </div>
            ) : (
              serviceList.map((item) => {
                const sId = item._id || item.id;
                const sName = item.serviceName || item.name;
                const fee =
                  item.total ??
                  Number(
                    item.fees ?? item.serviceFees ?? item.fee ?? 0
                  ) * Number(item.quantity ?? 1);

                return (
                  <div
                    key={sId}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {sName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Room {roomNumber || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-extrabold text-[#0f2a63]">
                        ₹{fee}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeService(sId, sName, fee)}
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
              <span>Total Services:</span>
              <span className="font-bold text-slate-900">{serviceList.length} items</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Billing Type:</span>
              <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                Added to Room Checkout Invoice
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-sm font-extrabold text-[#0f2a63]">
              <span>Final Bill Amount:</span>
              <span className="text-blue-600 text-base">₹{totalServiceFees}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pb-7 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep("services")}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Add More Services
            </button>

            <button
              type="button"
              onClick={handleSubmitServices}
              disabled={confirming || !hasNewServicesAdded || serviceList.length === 0}
              className="flex-1 py-2.5 bg-[#0f2a63] hover:bg-[#183d8a] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {confirming ? (
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
          HISTORY & PENDING SERVICES MODAL (PORTAL)
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
                    Services & History
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
              {/* QUEUED SERVICES */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-[#0f2a63] text-xs uppercase tracking-wider">
                    Queued Services
                  </h4>
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-full text-[10px]">
                    {serviceList.length} items
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1 staylio-scrollbar">
                  {serviceList.length === 0 ? (
                    <div className="p-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                      No queued room services.
                    </div>
                  ) : (
                    serviceList.map((item) => {
                      const sId = item._id || item.id;
                      const sName = item.serviceName || item.name;
                      const fee =
                        item.total ??
                        Number(
                          item.fees ?? item.serviceFees ?? item.fee ?? 0
                        ) * Number(item.quantity ?? 1);

                      return (
                        <div
                          key={sId}
                          className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {sName}
                            </p>
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              Pending
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 pl-2">
                            <span className="text-xs font-extrabold text-[#0f2a63]">
                              ₹{fee}
                            </span>
                            <button
                              type="button"
                              disabled={removingId === sId}
                              onClick={() => removeService(sId, sName, fee)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            >
                              {removingId === sId ? (
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

                {serviceList.length > 0 && (
                  <div className="flex justify-end pt-2 text-xs font-bold text-amber-800 border-t border-slate-100 mt-2">
                    Queued Total: ₹{totalServiceFees}
                  </div>
                )}
              </div>

              {/* PAID / BILLED SERVICES HISTORY */}
              {/* <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-[#0f2a63] text-xs uppercase tracking-wider">
                    Paid / Billed History
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    {historyList.length} items
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1 staylio-scrollbar">
                  {historyList.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">
                      No past billed services found.
                    </p>
                  ) : (
                    historyList.map((item, idx) => {
                      const id = item._id || item.id || idx;
                      const name = item.serviceName || item.name;
                      const fee =
                        item.total ??
                        Number(
                          item.fees ?? item.serviceFees ?? item.fee ?? 0
                        ) * Number(item.quantity ?? 1);
                      const timestamp = formatDateTime(
                        item.createdAt || item.updatedAt
                      );

                      return (
                        <div
                          key={id}
                          className="bg-slate-50/70 p-2 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span>{timestamp}</span>
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 py-0.2 rounded font-bold text-[9px]">
                                Paid
                              </span>
                            </div>
                          </div>

                          <span className="font-extrabold text-slate-800 ml-2 shrink-0">
                            ₹{fee}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
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
