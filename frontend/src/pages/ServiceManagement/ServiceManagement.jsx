import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  Wrench,
  Plus,
  Edit,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useToast } from "../../Context/ToastContext";
import {
  getAllServicesApi,
  createServiceApi,
  updateServiceApi,
  deleteServiceApi,
} from "../../service/servicesListCreate.js";

export default function ServiceManagement() {
  const toast = useToast();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentServiceId, setCurrentServiceId] = useState(null);

  // Form inputs
  const [formData, setFormData] = useState({
    serviceName: "",
    serviceFees: "",
    isEnabled: true,
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Track touched fields
  const [touched, setTouched] = useState({});

  // --------------------------------------------------
  // FETCH SERVICES
  // --------------------------------------------------
  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);

    try {
      const data = await getAllServicesApi();
      setServices(data.services || data || []);
    } catch (err) {
      console.error("Failed to fetch services:", err);
      toast.error(err.message || "Failed to fetch services");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const validateField = (name, value) => {
    let error = "";

    if (name === "serviceName") {
      const trimmedValue = value.trim();

      if (!trimmedValue) {
        error =
          "Please enter a service name";
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

  const validateForm = () => {
    const newErrors = {};

    const serviceNameError = validateField(
      "serviceName",
      formData.serviceName
    );

    const serviceFeesError = validateField(
      "serviceFees",
      formData.serviceFees
    );

    if (serviceNameError) {
      newErrors.serviceName = serviceNameError;
    }

    if (serviceFeesError) {
      newErrors.serviceFees = serviceFeesError;
    }

    setErrors(newErrors);

    // Mark all fields as touched when submitting
    setTouched({
      serviceName: true,
      serviceFees: true,
    });

    return Object.keys(newErrors).length === 0;
  };

  // --------------------------------------------------
  // HANDLE INPUT CHANGE
  // --------------------------------------------------

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    // If user already touched the field,
    // validate immediately while typing
    if (touched[name]) {
      const error = validateField(name, newValue);

      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  // --------------------------------------------------
  // HANDLE BLUR
  // --------------------------------------------------

  const handleBlur = (e) => {
    const { name, value } = e.target;

    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));

    const error = validateField(name, value);

    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  // --------------------------------------------------
  // OPEN CREATE MODAL
  // --------------------------------------------------

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setCurrentServiceId(null);

    setFormData({
      serviceName: "",
      serviceFees: "",
      isEnabled: true,
    });

    setErrors({});
    setTouched({});

    setIsModalOpen(true);
  };

  // --------------------------------------------------
  // OPEN EDIT MODAL
  // --------------------------------------------------

  const handleOpenEditModal = (service) => {
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
  };

  // --------------------------------------------------
  // CLOSE MODAL
  // --------------------------------------------------

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setErrors({});
    setTouched({});
  };

  // --------------------------------------------------
  // SUBMIT FORM
  // --------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate before API call
    const isValid = validateForm();

    if (!isValid) {
      toast.error("Please correct the highlighted fields.");

      // Focus first invalid field
      if (errors.serviceName || !formData.serviceName.trim()) {
        document.getElementById("serviceName")?.focus();
      } else if (errors.serviceFees || formData.serviceFees === "") {
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
      if (isEditMode) {
        await updateServiceApi(currentServiceId, cleanedData);
        toast.success("Service updated successfully!");
      } else {
        await createServiceApi(cleanedData);
        toast.success("Service added successfully!");
      }

      handleCloseModal();
      fetchServices();
    } catch (err) {
      console.error("Failed to save service:", err);
      toast.error(
        err.message || "An error occurred while saving the service."
      );
    }
  };

  // --------------------------------------------------
  // DELETE
  // --------------------------------------------------

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service?")) {
      return;
    }

    try {
      await deleteServiceApi(id);

      toast.success("Service deleted successfully!");

      fetchServices();
    } catch (err) {
      console.error("Failed to delete service:", err);

      toast.error(err.message || "Failed to delete service.");
    }
  };

  // --------------------------------------------------
  // INPUT CLASS HELPER
  // --------------------------------------------------

  const getInputClass = (fieldName) => {
    const hasError = touched[fieldName] && errors[fieldName];

    return `
      w-full
      px-3.5
      py-2.5
      text-xs
      sm:text-sm
      bg-slate-50/70
      border
      rounded-xl
      outline-none
      font-medium
      text-slate-900
      transition-all
      ${
        hasError
          ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:ring-2 focus:ring-red-100"
          : "border-slate-200 focus:bg-white focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
      }
    `;
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <>
      <Helmet>
        <title>Service Management — SS Residency Hotel Management</title>

        <meta
          name="description"
          content="Configure hotel amenities, additional service fees, and live availability status."
        />
      </Helmet>

      {/* 
        IMPORTANT:
        min-w-0 prevents this component from forcing the parent/page
        to become horizontally scrollable.
      */}
      <main className="w-full max-w-6xl mx-auto min-w-0 overflow-x-hidden space-y-5 sm:space-y-6">
        {/* --------------------------------------------------
            HEADER
        -------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-200 min-w-0">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 truncate">
              Service Management
            </h1>

            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Manage hotel services and additional service charges.
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="
              flex
              w-full
              sm:w-auto
              items-center
              justify-center
              gap-2
              px-4
              py-2.5
              bg-teal-700
              hover:bg-teal-800
              active:bg-teal-900
              text-white
              font-semibold
              text-xs
              sm:text-sm
              rounded-xl
              shadow-sm
              transition-colors
              cursor-pointer
              shrink-0
            "
          >
            <Plus className="w-4 h-4" />
            Add New Service
          </button>
        </div>

        {/* --------------------------------------------------
            SERVICES CARD
        -------------------------------------------------- */}
        <div className="w-full min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-100 flex flex-col xs:flex-row sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 bg-teal-50 text-teal-700 rounded-xl shrink-0">
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Available Hotel Services
                </h2>

                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                  List of active amenities and extra service charges.
                </p>
              </div>
            </div>

            <span className="self-start sm:self-auto text-[10px] sm:text-xs font-bold px-3 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-full whitespace-nowrap">
              {services.length} Total
            </span>
          </div>

          {/* 
            =====================================================
            TABLE SCROLL AREA

            This is the ONLY element that can scroll horizontally.

            overflow-x-auto  -> horizontal scrolling
            overflow-y-hidden -> no vertical weirdness
            overscroll-x-contain -> swipe stays inside table
            touch-pan-x -> mobile browser understands horizontal swipe
            min-w-0 -> prevents parent from expanding
            =====================================================
          */}
          <div
            className="
              w-full
              min-w-0
              max-w-full
              overflow-x-auto
              overflow-y-hidden
              overscroll-x-contain
              touch-pan-x
              scrollbar-thin
            "
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehaviorX: "contain",
            }}
          >
            <table className="w-full min-w-[600px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200">
                  <th className="px-4 sm:px-6 py-3 sm:py-3.5 text-[10px] sm:text-[11px] font-bold text-slate-900 tracking-wider uppercase whitespace-nowrap">
                    Service Name
                  </th>

                  <th className="px-4 sm:px-6 py-3 sm:py-3.5 text-[10px] sm:text-[11px] font-bold text-slate-900 tracking-wider uppercase whitespace-nowrap">
                    Fees (₹)
                  </th>

                  <th className="px-4 sm:px-6 py-3 sm:py-3.5 text-[10px] sm:text-[11px] font-bold text-slate-900 tracking-wider uppercase whitespace-nowrap">
                    Status
                  </th>

                  <th className="px-4 sm:px-6 py-3 sm:py-3.5 text-[10px] sm:text-[11px] font-bold text-slate-900 tracking-wider uppercase text-right whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {/* LOADING */}
                {loading ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-12 text-center text-slate-900"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-teal-700" />

                        <span className="font-semibold text-sm">
                          Loading services...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  /* EMPTY */
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-12 text-center text-slate-900"
                    >
                      <span className="font-bold text-sm">
                        No services found. Click "Add New Service" to get
                        started.
                      </span>
                    </td>
                  </tr>
                ) : (
                  /* SERVICES */
                  services.map((service) => (
                    <tr
                      key={service._id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 font-bold text-slate-900 whitespace-nowrap">
                        {service.serviceName}
                      </td>

                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        ₹
                        {Number(service.serviceFees).toLocaleString("en-IN")}
                      </td>

                      <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold tracking-wide whitespace-nowrap ${
                            service.isEnabled
                              ? "bg-emerald-500 text-black border border-emerald-200"
                              : "bg-amber-500 text-black border border-amber-200"
                          }`}
                        >
                          {service.isEnabled ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}

                          {service.isEnabled ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 text-right whitespace-nowrap">
                        <div className="flex justify-end items-center gap-1.5 sm:gap-2">
                          {/* EDIT */}
                          <button
                            onClick={() => handleOpenEditModal(service)}
                            className="
                              inline-flex
                              items-center
                              justify-center
                              gap-1
                              px-2.5
                              sm:px-3
                              py-1.5
                              bg-amber-500
                              hover:bg-amber-600
                              active:bg-amber-700
                              text-white
                              border
                              border-amber-200
                              rounded-lg
                              font-semibold
                              text-[10px]
                              sm:text-xs
                              transition-colors
                              cursor-pointer
                            "
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </button>

                          {/* DELETE */}
                          <button
                            onClick={() => handleDelete(service._id)}
                            className="
                              inline-flex
                              items-center
                              justify-center
                              gap-1
                              px-2.5
                              sm:px-3
                              py-1.5
                              bg-red-500
                              hover:bg-red-600
                              active:bg-red-700
                              text-white
                              border
                              border-red-200
                              rounded-lg
                              font-semibold
                              text-[10px]
                              sm:text-xs
                              transition-colors
                              cursor-pointer
                            "
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile table hint */}
          {!loading && services.length > 0 && (
            <div className="sm:hidden px-4 py-2.5 bg-slate-50 border-t border-slate-100">
              <p className="text-[10px] text-slate-500 text-center">
                ← Swipe left or right on the table to see all columns →
              </p>
            </div>
          )}
        </div>

        {/* --------------------------------------------------
            MODAL
        -------------------------------------------------- */}
        {isModalOpen && (
          <div
            className="
              fixed
              inset-0
              bg-slate-900/60
              backdrop-blur-sm
              flex
              justify-center
              items-center
              z-50
              p-3
              sm:p-4
              overflow-y-auto
            "
          >
            <div
              className="
                bg-white
                rounded-2xl
                p-4
                sm:p-6
                lg:p-8
                w-full
                max-w-md
                max-h-[95vh]
                overflow-y-auto
                shadow-2xl
                border
                border-slate-200
              "
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {isEditMode ? "Edit Service" : "Add New Service"}
                  </h3>

                  <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                    Enter the service details below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="
                    ml-3
                    w-8
                    h-8
                    flex
                    items-center
                    justify-center
                    rounded-lg
                    text-slate-400
                    hover:text-slate-700
                    hover:bg-slate-100
                    font-bold
                    text-sm
                    cursor-pointer
                    shrink-0
                  "
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              {/* FORM */}
              <form onSubmit={handleSubmit} className="space-y-5 pt-5">
                {/* SERVICE NAME */}
                <div>
                  <label
                    htmlFor="serviceName"
                    className="block mb-1.5 font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-900"
                  >
                    Service Name
                    <span className="text-red-500 ml-1">*</span>
                  </label>

                  <input
                    id="serviceName"
                    type="text"
                    name="serviceName"
                    value={formData.serviceName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={getInputClass("serviceName")}
                    placeholder="e.g. Room Cleaning"
                    autoComplete="off"
                  />

                  {/* Validation message */}
                  {touched.serviceName && errors.serviceName ? (
                    <p className="mt-1.5 text-[11px] sm:text-xs text-red-600 font-medium leading-relaxed">
                      {errors.serviceName}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400">
                      Example: Room Cleaning, Airport Pickup
                    </p>
                  )}
                </div>

                {/* SERVICE FEES */}
                <div>
                  <label
                    htmlFor="serviceFees"
                    className="block mb-1.5 font-bold text-[10px] sm:text-xs uppercase tracking-wider text-slate-900"
                  >
                    Service Fees (₹)
                    <span className="text-red-500 ml-1">*</span>
                  </label>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs pointer-events-none">
                      ₹
                    </span>

                    <input
                      id="serviceFees"
                      type="number"
                      name="serviceFees"
                      value={formData.serviceFees}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      min="0"
                      step="0.01"
                      className={`${getInputClass(
                        "serviceFees"
                      )} pl-8 pr-4`}
                      placeholder="500"
                      inputMode="decimal"
                    />
                  </div>

                  {/* Validation message */}
                  {touched.serviceFees && errors.serviceFees ? (
                    <p className="mt-1.5 text-[11px] sm:text-xs text-red-600 font-medium leading-relaxed">
                      {errors.serviceFees}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[10px] sm:text-[11px] text-slate-400">
                      Example: ₹500
                    </p>
                  )}
                </div>

                {/* ACTIVE CHECKBOX */}
                <div className="flex items-start gap-3 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    name="isEnabled"
                    id="isEnabled"
                    checked={formData.isEnabled}
                    onChange={handleChange}
                    className="
                      w-4
                      h-4
                      mt-0.5
                      accent-teal-700
                      cursor-pointer
                      rounded
                      shrink-0
                    "
                  />

                  <div>
                    <label
                      htmlFor="isEnabled"
                      className="font-bold text-xs sm:text-sm text-slate-900 cursor-pointer"
                    >
                      Active / Available for Booking
                    </label>

                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                      Customers can use this service when it is active.
                    </p>
                  </div>
                </div>

                {/* BUTTONS */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="
                      w-full
                      sm:w-auto
                      px-4
                      py-2.5
                      bg-slate-100
                      hover:bg-slate-200
                      text-slate-800
                      font-semibold
                      text-xs
                      sm:text-sm
                      rounded-xl
                      transition-colors
                      cursor-pointer
                    "
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="
                      w-full
                      sm:w-auto
                      px-4
                      py-2.5
                      bg-teal-700
                      hover:bg-teal-800
                      active:bg-teal-900
                      text-white
                      font-semibold
                      text-xs
                      sm:text-sm
                      rounded-xl
                      shadow-sm
                      transition-colors
                      cursor-pointer
                    "
                  >
                    {isEditMode ? "Update Service" : "Save Service"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  );
}