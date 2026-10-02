import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Helmet } from "react-helmet-async";
import {
  Building2,
  Phone,
  Mail,
  Percent,
  Clock,
  Save,
  Image,
  Trash2,
  Settings2,
} from "lucide-react";

import Spinner from "../../components/Spinner";
import { useToast } from "../../Context/ToastContext";
import { useAuth } from "../../Context/AuthContext";

import {
  getSettings,
  updateSettings,
} from "../../service/settingsService";

import {
  getBranchById,
  updateBranch,
} from "../../service/branchApi";

// ============================================================
// STATIC CONFIG (outside component = created once)
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ||
  "http://localhost:5000";

const INITIAL_FORM = {
  companyName: "",
  phone: "",
  email: "",
  gstNumber: "",
  logo: "",
  logoFile: null,
  removeLogo: false,
  address: "",
  enableGst: false,
  gstPercentage: "",
  before12PmRateType: "percentage",
  before12PmValue: "",
  after12PmRateType: "full",
  after12PmValue: "",
};

const getLogoUrl = (logoPath) => {
  if (!logoPath) return "";

  if (
    logoPath.startsWith("blob:") ||
    logoPath.startsWith("http://") ||
    logoPath.startsWith("https://")
  ) {
    return logoPath;
  }

  const cleanBase = API_BASE_URL.replace(/\/+$/, "");
  const cleanPath = logoPath.replace(/^\/+/, "");

  return `${cleanBase}/${cleanPath}`;
};

const toStr = (...values) => {
  for (const v of values) {
    if (v !== undefined && v !== null) return String(v);
  }
  return "";
};

// ============================================================
// STYLES (GPU-friendly: only transform + opacity animate)
// ============================================================

const CSS = `
@keyframes st-rise {
  from { opacity: 0; transform: translate3d(0, 14px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes st-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes st-pop {
  from { opacity: 0; transform: scale(.9); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes st-err {
  from { opacity: 0; transform: translate3d(0, -4px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes st-shine {
  from { transform: translate3d(-120%, 0, 0) skewX(-20deg); }
  to   { transform: translate3d(220%, 0, 0) skewX(-20deg); }
}

.st-rise { opacity: 0; animation: st-rise .5s cubic-bezier(.22,1,.36,1) forwards; }
.st-fade { opacity: 0; animation: st-fade .4s ease-out forwards; }
.st-pop  { animation: st-pop .3s cubic-bezier(.22,1,.36,1) both; }
.st-err  { animation: st-err .2s ease-out both; }
.st-d1 { animation-delay: .04s; }
.st-d2 { animation-delay: .12s; }
.st-d3 { animation-delay: .2s; }
.st-d4 { animation-delay: .28s; }

.st-card {
  transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease;
  contain: layout style;
}
@media (hover: hover) {
  .st-card:hover {
    transform: translate3d(0, -2px, 0);
    box-shadow: 0 18px 40px -18px rgba(15, 42, 99, .35);
  }
}

.st-input {
  transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
}
.st-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, .12);
  background-color: #fff;
}

.st-btn {
  position: relative;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .25s ease, filter .2s ease;
}
.st-btn:active:not(:disabled) { transform: scale(.97); }
@media (hover: hover) {
  .st-btn:hover:not(:disabled) {
    transform: translate3d(0, -1px, 0);
    box-shadow: 0 14px 28px -12px rgba(37, 99, 235, .65);
    filter: brightness(1.05);
  }
  .st-btn:hover:not(:disabled)::after {
    content: "";
    position: absolute;
    inset: 0;
    width: 40%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent);
    animation: st-shine .8s ease-out;
  }
}

.st-toggle-track { transition: background-color .25s ease; }
.st-toggle-knob  { transition: transform .25s cubic-bezier(.22,1,.36,1); }

.st-collapse {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows .3s ease, opacity .3s ease;
}
.st-collapse[data-open="true"] {
  grid-template-rows: 1fr;
  opacity: 1;
}
.st-collapse > div { overflow: hidden; min-height: 0; }

@media (prefers-reduced-motion: reduce) {
  .st-rise, .st-fade, .st-pop, .st-err {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .st-card, .st-input, .st-btn, .st-collapse,
  .st-toggle-track, .st-toggle-knob {
    transition: none !important;
  }
  .st-btn::after { display: none !important; }
}
`;

// ============================================================
// SMALL REUSABLE PIECES (memoized, defined outside so they
// never remount and only re-render when their props change)
// ============================================================

const inputClass = (hasError, extra = "") =>
  `st-input w-full text-sm rounded-xl border outline-none text-slate-900 placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed ${
    hasError
      ? "border-red-400 bg-red-50/40"
      : "border-slate-200 bg-slate-50/70"
  } ${extra}`;

const Field = memo(function Field({
  label,
  required,
  error,
  hint,
  htmlFor,
  className = "",
  children,
}) {
  return (
    <div className={`flex flex-col gap-1.5 min-w-0 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold text-slate-700"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1">*</span>
        )}
      </label>

      {children}

      {hint && (
        <span className="text-[11px] text-slate-400">
          {hint}
        </span>
      )}

      {error && (
        <span className="st-err text-xs text-red-500 font-medium">
          {error}
        </span>
      )}
    </div>
  );
});

const SectionCard = memo(function SectionCard({
  icon: Icon,
  title,
  subtitle,
  delay,
  children,
}) {
  return (
    <section
      className={`st-rise ${delay} st-card bg-white rounded-2xl border border-blue-100/80 shadow-[0_8px_30px_-16px_rgba(15,42,99,.25)] p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6`}
    >
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="shrink-0 p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-600/25">
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-[#0f2a63]">
            {title}
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
});

const PolicyCard = memo(function PolicyCard({
  title,
  subtitle,
  children,
  error,
}) {
  return (
    <div className="p-4 sm:p-5 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white flex flex-col justify-between gap-4 transition-colors duration-300 hover:border-blue-300">
      <div>
        <h3 className="text-sm font-bold text-[#0f2a63]">
          {title}
        </h3>
        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
          {subtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {children}
      </div>

      {error && (
        <span className="st-err text-xs text-red-500 font-medium">
          {error}
        </span>
      )}
    </div>
  );
});

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Settings() {
  const toast = useToast();
  const { userData } = useAuth();

  // Keep latest toast in a ref so callbacks stay stable
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // ============================================================
  // SUB-BRANCH CHECK
  // ============================================================

  const isSubBranchOwner =
    userData?.role === "hotelOwner" && !!userData?.branchId;

  const branchId = userData?.branchId;

  // ============================================================
  // STATES
  // ============================================================

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================================
  // FETCH SETTINGS
  // ============================================================

  const fetchSettingsData = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setIsLoading(true);

        console.info("[Settings UI] Loading hotel settings...");

        // Fetch settings + branch profile in parallel (faster load)
        const [settingsRes, branchRes] = await Promise.all([
          getSettings(),
          isSubBranchOwner && branchId
            ? getBranchById(branchId)
            : Promise.resolve(null),
        ]);

        let item = settingsRes?.success
          ? settingsRes.data || {}
          : {};

        // ------------------------------------------------------
        // SUB-BRANCH PROFILE DATA
        // ------------------------------------------------------

        if (branchRes?.success && branchRes?.data) {
          const branch = branchRes.data;

          // Branch details override main hotel profile details
          item = {
            ...item,

            companyName:
              branch.branchName || item.companyName || "",

            phone: branch.phone || item.phone || "",

            email:
              branch.email ||
              item.emailAddress ||
              item.email ||
              "",

            address: [
              branch.address?.street,
              branch.address?.city,
              branch.address?.state,
              branch.address?.country,
              branch.address?.pincode,
            ]
              .filter(Boolean)
              .join(", "),
          };
        }

        // ------------------------------------------------------
        // SET FORM
        // ------------------------------------------------------

        if (settingsRes?.success && item) {
          const rawLogo =
            item.companyLogo || item.logo || item.logoUrl || "";

          let formattedPhone = "";

          if (Array.isArray(item.phoneNumbers)) {
            formattedPhone = item.phoneNumbers.join(", ");
          } else if (Array.isArray(item.phoneNumber)) {
            formattedPhone = item.phoneNumber.join(", ");
          } else {
            formattedPhone = item.phone || item.phoneNumber || "";
          }

          setFormData({
            companyName: item.companyName || "",
            phone: formattedPhone,
            email: item.emailAddress || item.email || "",
            gstNumber: item.gstNumber || "",
            logo: getLogoUrl(rawLogo),
            logoFile: null,
            removeLogo: false,
            address: item.address || item.hotelAddress || "",

            enableGst:
              item.gstCalculationEnabled ??
              item.enableGst ??
              false,

            gstPercentage: toStr(
              item.gstPercentage,
              item.gstRate
            ),

            before12PmRateType:
              item.beforeCheckoutPolicyType ||
              item.before12PmRateType ||
              "percentage",

            before12PmValue: toStr(
              item.beforeCheckoutValue,
              item.before12PmValue
            ),

            after12PmRateType:
              item.afterCheckoutPolicyType ||
              item.after12PmRateType ||
              "full",

            after12PmValue: toStr(
              item.afterCheckoutValue,
              item.after12PmValue
            ),
          });

          setErrors({});

          console.info(
            "[Settings UI] Hotel settings loaded successfully."
          );
        } else {
          toastRef.current.error(
            settingsRes?.message ||
              "Unable to load hotel settings."
          );
        }
      } catch (error) {
        console.error(
          "[Settings UI] Failed to load settings:",
          error
        );

        toastRef.current.error(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to load hotel settings. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isSubBranchOwner, branchId]
  );

  // ============================================================
  // LOAD SETTINGS
  // ============================================================

  useEffect(() => {
    if (!userData) return;

    fetchSettingsData();
  }, [userData, fetchSettingsData]);

  // ============================================================
  // INPUT CHANGE
  // ============================================================

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;

    const val = type === "checkbox" ? checked : value;

    setFormData((prev) => ({ ...prev, [name]: val }));

    setErrors((prev) =>
      prev[name] ? { ...prev, [name]: "" } : prev
    );
  }, []);

  // ============================================================
  // LOGO UPLOAD
  // ============================================================

  const handleLogoUpload = useCallback((e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      toastRef.current.error(
        "Logo file size must be less than 1MB."
      );

      e.target.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

    if (!allowedTypes.includes(file.type)) {
      toastRef.current.error(
        "Only JPG, JPEG, and PNG formats are supported."
      );

      e.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setFormData((prev) => {
      if (prev.logo && prev.logo.startsWith("blob:")) {
        URL.revokeObjectURL(prev.logo);
      }

      return {
        ...prev,
        logoFile: file,
        logo: previewUrl,
        removeLogo: false,
      };
    });

    toastRef.current.info(
      "New logo selected. Click Save Settings to upload it."
    );
  }, []);

  // ============================================================
  // REMOVE LOGO
  // ============================================================

  const handleRemoveLogo = useCallback(() => {
    setFormData((prev) => {
      if (prev.logo && prev.logo.startsWith("blob:")) {
        URL.revokeObjectURL(prev.logo);
      }

      return {
        ...prev,
        logo: "",
        logoFile: null,
        removeLogo: true,
      };
    });

    toastRef.current.info(
      "Logo removed. Click Save Settings to confirm."
    );
  }, []);

  // ============================================================
  // FORM VALIDATION
  // ============================================================

  const validateForm = () => {
    const formErrors = {};

    // COMPANY NAME
    if (!String(formData.companyName || "").trim()) {
      formErrors.companyName = "Company name is required.";
    }

    // GST NUMBER
    // if (!String(formData.gstNumber || "").trim()) {
    //   formErrors.gstNumber = "GST number is required.";
    // }

    // GST PERCENTAGE
    if (formData.enableGst) {
      const gstValue = String(formData.gstPercentage || "").trim();

      if (!gstValue) {
        formErrors.gstPercentage = "GST percentage is required.";
      } else {
        const gstNumber = Number(gstValue);

        if (Number.isNaN(gstNumber) || gstNumber < 0) {
          formErrors.gstPercentage =
            "Enter a valid GST percentage.";
        }
      }
    }

    // PHONE
    if (!String(formData.phone || "").trim()) {
      formErrors.phone = "Phone number is required.";
    } else {
      const phoneNumbers = String(formData.phone)
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      if (phoneNumbers.length === 0) {
        formErrors.phone =
          "At least one phone number is required.";
      } else if (
        phoneNumbers.some((p) => !/^[+0-9\s()-]+$/.test(p))
      ) {
        formErrors.phone = "Enter a valid phone number.";
      }
    }

    // EMAIL
    const email = String(formData.email || "").trim();

    if (!email) {
      formErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      formErrors.email = "Enter a valid email address.";
    }

    // ADDRESS
    if (!String(formData.address || "").trim()) {
      formErrors.address = "Address is required.";
    }

    // BEFORE CHECKOUT
    if (
      formData.before12PmValue !== "" &&
      formData.before12PmValue !== null &&
      formData.before12PmValue !== undefined
    ) {
      const value = Number(formData.before12PmValue);

      if (Number.isNaN(value) || value < 0) {
        formErrors.before12PmValue =
          "Enter a valid before-checkout value.";
      }
    }

    // AFTER CHECKOUT
    if (
      formData.after12PmRateType !== "full" &&
      formData.after12PmValue !== "" &&
      formData.after12PmValue !== null &&
      formData.after12PmValue !== undefined
    ) {
      const value = Number(formData.after12PmValue);

      if (Number.isNaN(value) || value < 0) {
        formErrors.after12PmValue =
          "Enter a valid after-checkout value.";
      }
    }

    setErrors(formErrors);

    return Object.keys(formErrors).length === 0;
  };

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error(
        "Please fix the errors in the form before saving."
      );
      return;
    }

    setIsSaving(true);

    try {
      // ========================================================
      // SUB-BRANCH PROFILE UPDATE
      // ========================================================

      if (isSubBranchOwner && userData?.branchId) {
        const branchRes = await updateBranch(userData.branchId, {
          branchName: formData.companyName.trim(),
          phone: formData.phone.trim(),
          address: {
            street: formData.address.trim(),
          },
        });

        if (!branchRes?.success) {
          throw new Error(
            branchRes?.message ||
              "Unable to update branch details."
          );
        }
      }

      // ========================================================
      // SETTINGS FORM DATA
      // ========================================================

      const data = new FormData();

      data.append("companyName", String(formData.companyName).trim());
      data.append("phone", String(formData.phone).trim());

      // IMPORTANT:
      // Sub-branch email must never be changed
      // through Settings API.
      if (!isSubBranchOwner) {
        data.append("email", String(formData.email).trim());
      }

      data.append("gstNumber", String(formData.gstNumber).trim());
      data.append("address", String(formData.address).trim());
      data.append("enableGst", String(Boolean(formData.enableGst)));

      data.append(
        "gstPercentage",
        formData.enableGst
          ? String(formData.gstPercentage || "")
          : "0"
      );

      data.append("before12PmRateType", formData.before12PmRateType);
      data.append(
        "before12PmValue",
        String(formData.before12PmValue || "")
      );

      data.append("after12PmRateType", formData.after12PmRateType);
      data.append(
        "after12PmValue",
        String(formData.after12PmValue || "")
      );

      data.append("removeLogo", String(Boolean(formData.removeLogo)));

      // ========================================================
      // LOGO
      // ========================================================

      if (formData.logoFile) {
        data.append("companyLogo", formData.logoFile);
      }

      // ========================================================
      // UPDATE SETTINGS
      // ========================================================

      const res = await updateSettings(data);

      if (!res?.success) {
        throw new Error(res?.message || "Failed to update settings.");
      }

      toast.success("Settings updated successfully.");

      // ========================================================
      // REFRESH LOCAL DATA (silent = no full-page spinner flash)
      // ========================================================

      await fetchSettingsData(true);
    } catch (error) {
      console.error("[Settings UI] Error updating settings:", error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Something went wrong while saving settings. Please try again.";

      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================
  // CLEANUP BLOB URL
  // ============================================================

  useEffect(() => {
    return () => {
      if (formData.logo && formData.logo.startsWith("blob:")) {
        URL.revokeObjectURL(formData.logo);
      }
    };
  }, [formData.logo]);

  // ============================================================
  // LOADING
  // ============================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="st-pop flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-7 shadow-lg shadow-blue-900/10 border border-blue-100">
          <Spinner />
          <span className="text-xs font-medium text-slate-500">
            Loading settings...
          </span>
        </div>
        <style>{CSS}</style>
      </div>
    );
  }

  const isPercentBefore =
    formData.before12PmRateType === "percentage";

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      <style>{CSS}</style>

      <Helmet>
        <title>Settings — SS Residency Hotel Management</title>

        <meta
          name="description"
          content="Manage hotel configuration settings at SS Residency."
        />
      </Helmet>

      <main className="w-full max-w-6xl mx-auto space-y-5 sm:space-y-6 pb-8">
        {/* HEADER */}

        <header className="st-rise st-d1 flex flex-col gap-3 pb-4 sm:pb-5 border-b border-white/20">
        

          <div className="flex items-start gap-3">
          

            <div className="min-w-0">
<h1 className="text-[12px] sm:text-[20px] lg:text-[25px] leading-tight font-extrabold tracking-[-0.035em] text-white">                System Settings
              </h1>

             
            </div>
          </div>
        </header>

        {/* FORM */}

        <form
          onSubmit={handleFormSubmit}
          noValidate
          className="space-y-5 sm:space-y-6"
        >
          {/* COMPANY & TAX PROFILE */}

          <SectionCard
            icon={Building2}
            title="Hotel details & Tax Settings"
            delay="st-d2"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* COMPANY NAME */}

              <Field
                label="Company Name"
                required
                error={errors.companyName}
                htmlFor="companyName"
              >
                <input
                  id="companyName"
                  type="text"
                  name="companyName"
                  disabled={isSaving}
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="e.g. SS Residency"
                  className={inputClass(
                    errors.companyName,
                    "px-3.5 py-2.5"
                  )}
                />
              </Field>

              {/* GST NUMBER */}

              <Field
                label="GST Number"
                htmlFor="gstNumber"
              >
                <input
                  id="gstNumber"
                  type="text"
                  name="gstNumber"
                  disabled={isSaving}
                  value={formData.gstNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. 29GGGGG1314R9Z6"
                  className={inputClass(
                    errors.gstNumber,
                    "px-3.5 py-2.5 uppercase"
                  )}
                />
              </Field>

              {/* PHONE */}

              <Field
                label="Phone Number(s)"
                required
                error={errors.phone}
                htmlFor="phone"
                hint="For multiple numbers, separate them with commas."
              >
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />

                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    disabled={isSaving}
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+91 9876543210"
                    className={inputClass(
                      errors.phone,
                      "pl-10 pr-4 py-2.5"
                    )}
                  />
                </div>
              </Field>

              {/* EMAIL */}

              <Field
                label="Email Address"
                required
                error={errors.email}
                htmlFor="email"
                hint={
                  isSubBranchOwner
                    ? "Branch email cannot be changed."
                    : undefined
                }
              >
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 pointer-events-none" />

                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={isSaving || isSubBranchOwner}
                    readOnly={isSubBranchOwner}
                    placeholder="contact@example.com"
                    className={inputClass(
                      errors.email,
                      `pl-10 pr-4 py-2.5 ${
                        isSubBranchOwner ? "!bg-slate-100" : ""
                      }`
                    )}
                  />
                </div>
              </Field>

              {/* GST TOGGLE */}

              <div className="flex flex-col gap-3 p-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white transition-colors duration-300 hover:border-blue-300">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Percent className="w-4 h-4 shrink-0 text-blue-600" />

                    <span className="text-xs font-semibold text-slate-700">
                      GST Tax Calculation
                    </span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      name="enableGst"
                      checked={formData.enableGst}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      className="sr-only peer"
                      aria-label="Enable GST calculation"
                    />

                    <div className="st-toggle-track w-11 h-6 bg-slate-300 rounded-full peer-checked:bg-blue-600 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-600/20 peer-disabled:opacity-60" />

                    <div className="st-toggle-knob absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow peer-checked:translate-x-5" />
                  </label>
                </div>

                <div
                  className="st-collapse"
                  data-open={formData.enableGst ? "true" : "false"}
                >
                  <div>
                    <div className="flex flex-col gap-1 pt-3 border-t border-blue-100">
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="number"
                          name="gstPercentage"
                          min="0"
                          step="0.01"
                          disabled={isSaving || !formData.enableGst}
                          value={formData.gstPercentage}
                          onChange={handleInputChange}
                          placeholder="e.g. 12"
                          tabIndex={formData.enableGst ? 0 : -1}
                          aria-label="GST percentage"
                          className={inputClass(
                            errors.gstPercentage,
                            "w-24 px-3 py-1.5 font-semibold !bg-white"
                          )}
                        />

                        <span className="text-xs font-medium text-slate-600">
                          % GST rate applied automatically on invoices
                        </span>
                      </div>

                      {errors.gstPercentage && (
                        <span className="st-err text-xs text-red-500 font-medium">
                          {errors.gstPercentage}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ADDRESS */}

              <Field
                label="Hotel Address"
                required
                error={errors.address}
                htmlFor="address"
              >
                <textarea
                  id="address"
                  name="address"
                  rows="3"
                  disabled={isSaving}
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter complete physical address..."
                  className={inputClass(
                    errors.address,
                    "px-3.5 py-2.5 resize-none"
                  )}
                />
              </Field>

              {/* LOGO */}

              <div className="flex flex-col gap-3 md:col-span-2">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-700">
                    Company Logo
                  </span>

                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Supported formats:{" "}
                    <strong className="text-slate-700">
                      JPG, JPEG, PNG
                    </strong>{" "}
                    · Max size:{" "}
                    <strong className="text-slate-700">1MB</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <div>
                    <input
                      type="file"
                      id="logo-upload"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      disabled={isSaving}
                      onChange={handleLogoUpload}
                      className="sr-only peer"
                    />

                    <label
                      htmlFor="logo-upload"
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-dashed border-blue-300 text-blue-700 bg-blue-50/60 cursor-pointer transition-all duration-300 hover:bg-blue-100/70 hover:border-blue-500 active:scale-[.98] peer-focus-visible:ring-4 peer-focus-visible:ring-blue-600/20"
                    >
                      <Image className="w-4 h-4" />
                      Upload New Logo
                    </label>
                  </div>

                  {formData.logo ? (
                    <div className="st-pop flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl border border-blue-100 overflow-hidden bg-slate-50 flex items-center justify-center shadow-sm">
                        <img
                          src={formData.logo}
                          alt="Company logo preview"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 hover:bg-red-100 active:scale-95 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">
                      No logo uploaded yet
                    </span>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* CHECKOUT RULES */}

          <SectionCard
            icon={Clock}
            title="Extra Time & Checkout Rules"
            delay="st-d3"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* BEFORE 12 PM */}

              <PolicyCard
                title="Before 12 PM Checkout Fees"
                error={errors.before12PmValue}
              >
                <select
                  name="before12PmRateType"
                  value={formData.before12PmRateType}
                  onChange={handleInputChange}
                  disabled={isSaving}
                  aria-label="Before 12 PM rate type"
                  className="st-input px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 outline-none cursor-pointer"
                >
                  <option value="percentage">% of Room Rate</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>

                <input
                  type="number"
                  name="before12PmValue"
                  min="0"
                  step="0.01"
                  value={formData.before12PmValue}
                  onChange={handleInputChange}
                  disabled={isSaving}
                  placeholder="Enter value"
                  aria-label="Before 12 PM value"
                  className={inputClass(
                    errors.before12PmValue,
                    "w-28 px-3.5 py-2 font-bold !bg-white"
                  )}
                />

                <span className="text-sm font-bold text-blue-700">
                  {isPercentBefore ? "%" : "₹"}
                </span>
              </PolicyCard>

              {/* AFTER 12 PM */}

              <PolicyCard
                title="After 12 PM Checkout Fees"
                error={errors.after12PmValue}
              >
                <select
                  name="after12PmRateType"
                  value={formData.after12PmRateType}
                  onChange={handleInputChange}
                  disabled={isSaving}
                  aria-label="After 12 PM rate type"
                  className="st-input px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 outline-none cursor-pointer"
                >
                  <option value="full">Full Day Charge</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>

                {formData.after12PmRateType !== "full" && (
                  <div className="st-pop flex items-center gap-2 sm:gap-3">
                    <input
                      type="number"
                      name="after12PmValue"
                      min="0"
                      step="0.01"
                      value={formData.after12PmValue}
                      onChange={handleInputChange}
                      disabled={isSaving}
                      placeholder="Enter amount"
                      aria-label="After 12 PM amount"
                      className={inputClass(
                        errors.after12PmValue,
                        "w-28 px-3.5 py-2 font-bold !bg-white"
                      )}
                    />

                    <span className="text-sm font-bold text-blue-700">
                      ₹
                    </span>
                  </div>
                )}
              </PolicyCard>
            </div>
          </SectionCard>

          {/* SAVE */}

          <div className="st-rise st-d4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="st-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 rounded-xl shadow-lg shadow-blue-700/30 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed min-w-[150px]"
            >
              {isSaving ? (
                <>
                  <Spinner />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </>
  );
}