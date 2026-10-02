import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Helmet } from "react-helmet-async";
import {
  Wrench,
  Plus,
  Edit,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  IndianRupee,
  ConciergeBell,
  ShieldAlert,
} from "lucide-react";
import { useToast } from "../../Context/ToastContext";
import { useAuth } from "../../Context/AuthContext";
import { checkRoomServiceAccess } from "../../service/subscriptionFeatureApi";
import {
  getAllServicesApi,
  createServiceApi,
  updateServiceApi,
  deleteServiceApi,
} from "../../service/servicesListCreate.js";

// ============================================================
// STATIC CONFIG + PURE HELPERS
// ============================================================

const EMPTY_FORM = {
  serviceName: "",
  serviceFees: "",
  isEnabled: true,
};

const validateField = (name, value) => {
  let error = "";

  if (name === "serviceName") {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      error = "Please enter a service name";
    } else if (trimmedValue.length < 2) {
      error = "Service name should contain at least 2 characters.";
    } else if (trimmedValue.length > 100) {
      error = "Service name should not be longer than 100 characters.";
    }
  }

  if (name === "serviceFees") {
    if (value === "" || value === null || value === undefined) {
      error = "Please enter the service fee. Example: ₹500.";
    } else if (Number.isNaN(Number(value))) {
      error = "Please enter a valid service fee. Example: ₹500.";
    } else if (Number(value) < 0) {
      error = "Service fee cannot be negative.";
    }
  }

  return error;
};

const fees = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// ============================================================
// STYLES (only transform + opacity are animated)
// ============================================================

const CSS = `
@keyframes sv-rise {
  from { opacity: 0; transform: translate3d(0, 14px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes sv-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes sv-modal {
  from { opacity: 0; transform: translate3d(0, 22px, 0) scale(.96); }
  to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
@keyframes sv-pop {
  from { opacity: 0; transform: scale(.94); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes sv-shine {
  from { transform: translate3d(-120%, 0, 0) skewX(-20deg); }
  to   { transform: translate3d(240%, 0, 0) skewX(-20deg); }
}

.sv-rise  { opacity: 0; animation: sv-rise .55s cubic-bezier(.22,1,.36,1) forwards; }
.sv-fade  { animation: sv-fade .25s ease-out both; }
.sv-modal { animation: sv-modal .35s cubic-bezier(.22,1,.36,1) both; }
.sv-pop   { animation: sv-pop .3s cubic-bezier(.22,1,.36,1) both; }
.sv-d1 { animation-delay: .04s; }
.sv-d2 { animation-delay: .12s; }
.sv-d3 { animation-delay: .2s; }

.sv-row {
  opacity: 0;
  animation: sv-rise .45s cubic-bezier(.22,1,.36,1) forwards;
  animation-delay: calc(var(--i, 0) * 45ms);
}
.sv-row td { transition: background-color .25s ease; }
.sv-row:hover td { background-color: rgba(219, 234, 254, .5); }

@media (hover: hover) {
  .sv-lift { transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease; }
  .sv-lift:hover { transform: translate3d(0, -3px, 0); box-shadow: 0 18px 36px -20px rgba(15,42,99,.4); }
}

.sv-input {
  transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
}
.sv-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, .12);
  background-color: #fff;
}

.sv-btn {
  position: relative;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .25s ease, filter .2s ease, background-color .2s ease, opacity .2s ease;
}
.sv-btn:active:not(:disabled) { transform: scale(.95); }
@media (hover: hover) {
  .sv-btn:hover:not(:disabled) { filter: brightness(1.06); }
  .sv-btn.sv-shine:hover:not(:disabled)::after {
    content: "";
    position: absolute;
    inset: 0;
    width: 40%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
    animation: sv-shine .8s ease-out;
  }
}

.sv-track { transition: background-color .25s ease; }
.sv-knob  { transition: transform .25s cubic-bezier(.22,1,.36,1); }

.sv-scroll { scrollbar-width: thin; overscroll-behavior: contain; }

@media (prefers-reduced-motion: reduce) {
  .sv-rise, .sv-fade, .sv-modal, .sv-pop, .sv-row {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .sv-lift, .sv-input, .sv-btn, .sv-row td, .sv-track, .sv-knob {
    transition: none !important;
  }
  .sv-btn::after { display: none !important; }
}
`;

// ============================================================
// SMALL MEMOIZED PIECES
// ============================================================

const StatusChip = memo(function StatusChip({ enabled }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap border ${
        enabled
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-amber-50 text-amber-700 border-amber-200"
      }`}
    >
      {enabled ? (
        <CheckCircle2 className="w-3.5 h-3.5" />
      ) : (
        <XCircle className="w-3.5 h-3.5" />
      )}
      {enabled ? "Active" : "Inactive"}
    </span>
  );
});

const ActionButtons = memo(function ActionButtons({
  service,
  onEdit,
  onDelete,
  full,
}) {
  const base = `sv-btn cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-lg text-[11px] sm:text-xs font-bold border focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 ${
    full ? "flex-1 py-2.5" : "px-3 py-1.5"
  }`;

  return (
    <div className={`flex items-center gap-2 ${full ? "w-full" : "justify-end"}`}>
      <button
        type="button"
        onClick={() => onEdit(service)}
        className={`${base} bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100`}
      >
        <Edit className="w-3.5 h-3.5" />
        Edit
      </button>

      <button
        type="button"
        onClick={() => onDelete(service._id)}
        className={`${base} bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100`}
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </button>
    </div>
  );
});

const ServiceRow = memo(function ServiceRow({
  service,
  index,
  onEdit,
  onDelete,
}) {
  return (
    <tr style={{ "--i": Math.min(index, 10) }} className="sv-row">
      <td className="px-4 lg:px-6 py-4 font-bold text-[#0f2a63] whitespace-nowrap">
        <span className="inline-flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <ConciergeBell className="w-4 h-4" />
          </span>
          {service.serviceName}
        </span>
      </td>

      <td className="px-4 lg:px-6 py-4 font-bold text-[#0f2a63] tabular-nums whitespace-nowrap">
        {fees(service.serviceFees)}
      </td>

      <td className="px-4 lg:px-6 py-4">
        <StatusChip enabled={service.isEnabled} />
      </td>

      <td className="px-4 lg:px-6 py-4 text-right whitespace-nowrap">
        <ActionButtons service={service} onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  );
});

const ServiceCard = memo(function ServiceCard({
  service,
  index,
  onEdit,
  onDelete,
}) {
  return (
    <article
      style={{ "--i": Math.min(index, 10) }}
      className="sv-row sv-lift bg-white border border-blue-100/80 rounded-2xl p-4 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 p-2 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-600/25">
            <ConciergeBell className="w-4 h-4" />
          </span>
          <p className="text-base font-bold text-[#0f2a63] truncate">
            {service.serviceName}
          </p>
        </div>
        <StatusChip enabled={service.isEnabled} />
      </div>

      <div className="flex items-center justify-between bg-blue-50/60 rounded-xl px-3.5 py-2.5">
        <span className="text-xs font-semibold text-slate-500">Fees</span>
        <span className="text-lg font-extrabold text-[#0f2a63] tabular-nums">
          {fees(service.serviceFees)}
        </span>
      </div>

      <ActionButtons full service={service} onEdit={onEdit} onDelete={onDelete} />
    </article>
  );
});

const inputClass = (hasError, extra = "") =>
  `sv-input w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none font-medium text-slate-900 placeholder:text-slate-400 ${
    hasError
      ? "border-red-400 bg-red-50/40"
      : "border-slate-200 bg-slate-50/70"
  } ${extra}`;

const ServiceModal = memo(function ServiceModal({
  isEditMode,
  formData,
  errors,
  touched,
  submitting,
  onChange,
  onBlur,
  onSubmit,
  onClose,
}) {
  const nameError = touched.serviceName && errors.serviceName;
  const feesError = touched.serviceFees && errors.serviceFees;

  return (
    <div
      className="sv-fade fixed inset-0 z-50 bg-[#0a1a3f]/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="sv-modal sv-scroll bg-white w-full sm:max-w-md max-h-[95vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl border border-blue-100 p-4 sm:p-6 lg:p-7">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-600/25">
              {isEditMode ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-[#0f2a63]">
                {isEditMode ? "Edit Service" : "Add New Service"}
              </h3>
            
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="sv-btn cursor-pointer w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-5 pt-5" noValidate>
          {/* SERVICE NAME */}
          <div>
            <label
              htmlFor="serviceName"
              className="block mb-1.5 text-xs font-semibold text-slate-700"
            >
              Service Name<span className="text-red-500 ml-1">*</span>
            </label>

            <input
              id="serviceName"
              type="text"
              name="serviceName"
              autoFocus
              value={formData.serviceName}
              onChange={onChange}
              onBlur={onBlur}
              className={inputClass(nameError)}
              placeholder="e.g. Room Cleaning"
              autoComplete="off"
            />

            {nameError ? (
              <p className="sv-pop mt-1.5 text-xs text-red-600 font-medium leading-relaxed">
                {errors.serviceName}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-400">
                Example: Room Cleaning, Airport Pickup
              </p>
            )}
          </div>

          {/* SERVICE FEES */}
          <div>
            <label
              htmlFor="serviceFees"
              className="block mb-1.5 text-xs font-semibold text-slate-700"
            >
              Service Fees (₹)<span className="text-red-500 ml-1">*</span>
            </label>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 font-bold text-sm pointer-events-none">
                ₹
              </span>

              <input
                id="serviceFees"
                type="number"
                name="serviceFees"
                value={formData.serviceFees}
                onChange={onChange}
                onBlur={onBlur}
                min="0"
                step="0.01"
                className={inputClass(feesError, "pl-8 pr-4")}
                placeholder="500"
                inputMode="decimal"
              />
            </div>

            {feesError ? (
              <p className="sv-pop mt-1.5 text-xs text-red-600 font-medium leading-relaxed">
                {errors.serviceFees}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-400">Example: ₹500</p>
            )}
          </div>

          {/* ACTIVE TOGGLE */}
          <label
            htmlFor="isEnabled"
            className="flex items-center justify-between gap-3 bg-blue-50/60 p-3.5 sm:p-4 rounded-xl border border-blue-100 cursor-pointer transition-colors hover:border-blue-300"
          >
            <div className="min-w-0">
              <span className="block font-bold text-xs sm:text-sm text-[#0f2a63]">
                Active / Available for Booking
              </span>
             
            </div>


            <span className="relative inline-flex items-center shrink-0">
              <input
                type="checkbox"
                name="isEnabled"
                id="isEnabled"
                checked={formData.isEnabled}
                onChange={onChange}
                className="sr-only peer"
              />
              <span className="sv-track block w-11 h-6 bg-slate-300 rounded-full peer-checked:bg-blue-600 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-600/20" />
              <span className="sv-knob absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow peer-checked:translate-x-5" />
            </span>
          </label>

          {/* BUTTONS */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="sv-btn cursor-pointer w-full sm:w-auto px-5 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="sv-btn sv-shine cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-700/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditMode ? "Update Service" : "Save Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ServiceManagement() {
  const { userData } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [accessLoading, setAccessLoading] = useState(true);

  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentServiceId, setCurrentServiceId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // --------------------------------------------------
  // FETCH SERVICES
  // --------------------------------------------------

  const fetchServices = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getAllServicesApi();
      setServices(data.services || data || []);
    } catch (err) {
      console.error("Failed to fetch services:", err);
      toastRef.current.error(err.message || "Failed to fetch services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const verifyAccess = async () => {
      if (userData?.role === "admin") {
        if (mounted) {
          setHasAccess(true);
          setAccessLoading(false);
          fetchServices();
        }
        return;
      }

      try {
        const result = await checkRoomServiceAccess();
        if (mounted) {
          setHasAccess(result.featureAllowed);
          if (result.featureAllowed) {
            fetchServices();
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
  }, [fetchServices, userData?.role]);

  const activeCount = useMemo(
    () => services.filter((s) => s.isEnabled).length,
    [services]
  );

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const validateForm = () => {
    const newErrors = {};

    const serviceNameError = validateField("serviceName", formData.serviceName);
    const serviceFeesError = validateField("serviceFees", formData.serviceFees);

    if (serviceNameError) newErrors.serviceName = serviceNameError;
    if (serviceFeesError) newErrors.serviceFees = serviceFeesError;

    setErrors(newErrors);

    // Mark all fields as touched when submitting
    setTouched({ serviceName: true, serviceFees: true });

    return newErrors;
  };

  // --------------------------------------------------
  // HANDLE INPUT CHANGE / BLUR
  // --------------------------------------------------

  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      const newValue = type === "checkbox" ? checked : value;

      setFormData((prev) => ({ ...prev, [name]: newValue }));

      // If user already touched the field, validate immediately while typing
      if (touched[name]) {
        const error = validateField(name, newValue);
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [touched]
  );

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;

    setTouched((prev) => ({ ...prev, [name]: true }));

    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  // --------------------------------------------------
  // OPEN / CLOSE MODAL
  // --------------------------------------------------

  const handleOpenCreateModal = useCallback(() => {
    setIsEditMode(false);
    setCurrentServiceId(null);
    setFormData(EMPTY_FORM);
    setErrors({});
    setTouched({});
    setIsModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((service) => {
    setIsEditMode(true);
    setCurrentServiceId(service._id);

    setFormData({
      serviceName: service.serviceName || "",
      serviceFees: service.serviceFees ?? "",
      isEnabled: service.isEnabled ?? true,
    });

    setErrors({});
    setTouched({});
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setErrors({});
    setTouched({});
  }, []);

  // Lock background scroll + close on Escape while the modal is open
  useEffect(() => {
    if (!isModalOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") handleCloseModal();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [isModalOpen, handleCloseModal]);

  // --------------------------------------------------
  // SUBMIT FORM
  // --------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate before API call
    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      toastRef.current.error("Please correct the highlighted fields.");

      // Focus first invalid field
      if (newErrors.serviceName) {
        document.getElementById("serviceName")?.focus();
      } else if (newErrors.serviceFees) {
        document.getElementById("serviceFees")?.focus();
      }

      return;
    }

    const cleanedData = {
      ...formData,
      serviceName: formData.serviceName.trim(),
      serviceFees: Number(formData.serviceFees),
    };

    try {
      setSubmitting(true);

      if (isEditMode) {
        await updateServiceApi(currentServiceId, cleanedData);
        toastRef.current.success("Service updated successfully!");
      } else {
        await createServiceApi(cleanedData);
        toastRef.current.success("Service added successfully!");
      }

      handleCloseModal();
      fetchServices();
    } catch (err) {
      console.error("Failed to save service:", err);
      toastRef.current.error(
        err.message || "An error occurred while saving the service."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("Are you sure you want to delete this service?")) {
        return;
      }

      try {
        await deleteServiceApi(id);

        toastRef.current.success("Service deleted successfully!");

        fetchServices();
      } catch (err) {
        console.error("Failed to delete service:", err);

        toastRef.current.error(err.message || "Failed to delete service.");
      }
    },
    [fetchServices]
  );

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  const thClass =
    "px-4 lg:px-6 py-3.5 text-[11px] font-bold tracking-wide whitespace-nowrap";

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
          The Service Management feature is not included in your current subscription plan. Please upgrade your plan to unlock this feature.
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>

      <Helmet>
        <title>Service Management — SS Residency Hotel Management</title>

        <meta
          name="description"
          content="Configure hotel amenities, additional service fees, and live availability status."
        />
      </Helmet>

      <main className="w-full max-w-6xl mx-auto min-w-0 space-y-5 sm:space-y-6 pb-8">
        {/* HEADER */}
        <header className="sv-rise sv-d1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4  shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] min-w-0">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          

            <div className="min-w-0">
              

<h1 className="text-[12px] sm:text-[20px] lg:text-[25px] leading-tight font-extrabold tracking-[-0.035em] text-white">   Service Management
              </h1>

            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="sv-btn sv-shine cursor-pointer flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-700/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add New Service
          </button>
        </header>

        {/* SERVICES */}
        <section className="sv-rise sv-d2 w-full min-w-0">
          {/* Card header */}
          <div className="bg-white border border-blue-100/80 rounded-2xl shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] overflow-hidden">
            <div className="p-4 sm:p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                  <IndianRupee className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-[#0f2a63]">
                    Available Hotel Services
                  </h2>
                 
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] sm:text-xs font-bold px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full whitespace-nowrap tabular-nums">
                  {services.length} Total
                </span>
                <span className="text-[11px] sm:text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full whitespace-nowrap tabular-nums">
                  {activeCount} Active
                </span>
              </div>
            </div>

            {/* Loading / empty (inside the card) */}
            {loading ? (
              <div className="sv-pop px-6 py-14 flex items-center justify-center gap-2 border-t border-slate-100">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="font-semibold text-sm text-[#0f2a63]">
                  Loading services...
                </span>
              </div>
            ) : services.length === 0 ? (
              <div className="sv-pop px-6 py-14 flex flex-col items-center text-center border-t border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                  <Wrench className="w-7 h-7" />
                </div>
                <p className="font-bold text-sm text-[#0f2a63] mt-4">
                  No services found
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Click "Add New Service" to get started.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="sv-btn sv-shine cursor-pointer mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-700/30"
                >
                  <Plus className="w-4 h-4" />
                  Add New Service
                </button>
              </div>
            ) : (
              /* Tablet / desktop: table */
              <div className="hidden md:block sv-scroll w-full min-w-0 max-w-full overflow-x-auto">
                <table className="w-full min-w-[600px] text-left border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-[#0f2a63] to-blue-800 text-white">
                      <th className={thClass}>Service Name</th>
                      <th className={thClass}>Fees (₹)</th>
                      <th className={thClass}>Status</th>
                      <th className={`${thClass} text-right`}>Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {services.map((service, index) => (
                      <ServiceRow
                        key={service._id}
                        service={service}
                        index={index}
                        onEdit={handleOpenEditModal}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Mobile: cards */}
          {!loading && services.length > 0 && (
            <div className="md:hidden mt-4 space-y-4">
              {services.map((service, index) => (
                <ServiceCard
                  key={service._id}
                  service={service}
                  index={index}
                  onEdit={handleOpenEditModal}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>

        {/* MODAL (mounted only when open) */}
        {isModalOpen && (
          <ServiceModal
            isEditMode={isEditMode}
            formData={formData}
            errors={errors}
            touched={touched}
            submitting={submitting}
            onChange={handleChange}
            onBlur={handleBlur}
            onSubmit={handleSubmit}
            onClose={handleCloseModal}
          />
        )}
      </main>
    </>
  );
}