import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  Phone,
  Mail,
  MapPin,
  ArrowUpRight,
  Crown,
  X,
  Loader2,
  RefreshCw,
  Building,
  ChevronDown,
} from "lucide-react";

import { useToast } from "../../Context/ToastContext";
import { useAuth } from "../../Context/AuthContext";
import {
  getAllBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchUsage,
} from "../../service/branchApi";

// ============================================================
// STATIC CONFIG (created once, not on every render)
// ============================================================

const INITIAL_FORM = {
  branchName: "",
  branchCode: "",
  phone: "",
  email: "",
  status: "active",
  street: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
};

const STATUS_TABS = ["all", "active", "inactive"];

const TAMIL_NADU_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"
];

const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const COUNTRIES_LIST = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

const isMainBranchOf = (branch) =>
  !!branch && (branch.isMainBranch || branch.branchCode === "MAIN");

// ============================================================
// STYLES (only transform + opacity are animated = smooth, GPU)
// ============================================================

const CSS = `
@keyframes bm-rise {
  from { opacity: 0; transform: translate3d(0, 16px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes bm-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes bm-modal {
  from { opacity: 0; transform: translate3d(0, 22px, 0) scale(.96); }
  to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
@keyframes bm-pop {
  from { opacity: 0; transform: scale(.92); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes bm-shine {
  from { transform: translate3d(-120%, 0, 0) skewX(-20deg); }
  to   { transform: translate3d(240%, 0, 0) skewX(-20deg); }
}
@keyframes bm-float {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50%      { transform: translate3d(0, -6px, 0); }
}

.bm-rise  { opacity: 0; animation: bm-rise .55s cubic-bezier(.22,1,.36,1) forwards; }
.bm-fade  { animation: bm-fade .25s ease-out both; }
.bm-modal { animation: bm-modal .35s cubic-bezier(.22,1,.36,1) both; }
.bm-pop   { animation: bm-pop .3s cubic-bezier(.22,1,.36,1) both; }
.bm-float { animation: bm-float 4s ease-in-out infinite; }
.bm-d1 { animation-delay: .04s; }
.bm-d2 { animation-delay: .12s; }
.bm-d3 { animation-delay: .2s; }
.bm-d4 { animation-delay: .28s; }

/* Card grid stagger (index via --i, capped in JS) */
.bm-card {
  opacity: 0;
  animation: bm-rise .5s cubic-bezier(.22,1,.36,1) forwards;
  animation-delay: calc(var(--i, 0) * 55ms);
  transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease, border-color .3s ease;
  contain: layout style;
}
@media (hover: hover) {
  .bm-card:hover {
    transform: translate3d(0, -4px, 0);
    box-shadow: 0 22px 44px -22px rgba(15, 42, 99, .45);
    border-color: #93c5fd;
  }
  .bm-lift { transition: transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s ease; }
  .bm-lift:hover { transform: translate3d(0, -3px, 0); box-shadow: 0 18px 36px -20px rgba(15,42,99,.4); }
}

.bm-input {
  transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
}
.bm-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, .12);
  background-color: #fff;
}

.bm-btn {
  position: relative;
  overflow: hidden;
  transition: transform .2s ease, box-shadow .25s ease, filter .2s ease, opacity .2s ease;
}
.bm-btn:active:not(:disabled) { transform: scale(.96); }
@media (hover: hover) {
  .bm-btn:hover:not(:disabled) {
    transform: translate3d(0, -1px, 0);
    filter: brightness(1.06);
  }
  .bm-btn:hover:not(:disabled)::after {
    content: "";
    position: absolute;
    inset: 0;
    width: 40%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent);
    animation: bm-shine .8s ease-out;
  }
}

.bm-bar {
  transform-origin: left center;
  transition: transform .8s cubic-bezier(.22,1,.36,1), background-color .4s ease;
}

.bm-scroll { overscroll-behavior: contain; scrollbar-width: thin; }

@media (prefers-reduced-motion: reduce) {
  .bm-rise, .bm-fade, .bm-modal, .bm-pop, .bm-card, .bm-float {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .bm-card, .bm-lift, .bm-input, .bm-btn, .bm-bar {
    transition: none !important;
  }
  .bm-btn::after { display: none !important; }
}
`;

// ============================================================
// SMALL MEMOIZED PIECES (defined outside = never remount)
// ============================================================

const inputClass = (hasError, extra = "") =>
  `bm-input w-full text-sm rounded-xl border outline-none text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed ${
    hasError
      ? "border-rose-400 bg-rose-50/40"
      : "border-slate-200 bg-slate-50/70"
  } ${extra}`;

const Field = memo(function Field({
  label,
  error,
  hint,
  required,
  className = "",
  children,
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {hint && (
        <p className="text-[11px] text-slate-400 mt-1">{hint}</p>
      )}
      {error && (
        <p className="bm-pop text-xs text-rose-600 mt-1 font-medium">
          {error}
        </p>
      )}
    </div>
  );
});

const StatCard = memo(function StatCard({
  label,
  value,
  note,
  valueClass,
  noteClass,
}) {
  return (
    <div className="bm-lift bg-white border border-blue-100/80 rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] flex flex-col justify-between min-h-[110px]">
      <span className="text-xs font-semibold text-slate-500">
        {label}
      </span>
      <div className="mt-2">
        <span
          className={`text-3xl sm:text-4xl font-extrabold tabular-nums ${valueClass}`}
        >
          {value}
        </span>
        <p className={`text-xs font-medium mt-1 ${noteClass}`}>
          {note}
        </p>
      </div>
    </div>
  );
});

const BranchCard = memo(function BranchCard({
  branch,
  index,
  onEdit,
  onDelete,
}) {
  const isMain = isMainBranchOf(branch);
  const isActive = branch.status === "active";

  const address =
    [
      branch.address?.street,
      branch.address?.city,
      branch.address?.state,
      branch.address?.pincode,
    ]
      .filter(Boolean)
      .join(", ") || "No address provided";

  return (
    <article
      style={{ "--i": Math.min(index, 8) }}
      className={`bm-card group relative bg-white rounded-2xl border p-5 sm:p-6 flex flex-col justify-between shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] ${
        isMain
          ? "border-blue-400 ring-1 ring-blue-500/15"
          : "border-blue-100/80"
      }`}
    >
      {isMain && (
        <div className="absolute -top-3 left-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#0f2a63] to-blue-600 text-white rounded-full text-xs font-semibold shadow-md shadow-blue-900/25">
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            Primary Main Branch
          </span>
        </div>
      )}

      <div className={isMain ? "pt-2" : ""}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-[#0f2a63] group-hover:text-blue-600 transition-colors duration-300 break-words">
              {branch.branchName}
            </h3>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 font-mono text-xs font-semibold rounded-md">
                {branch.branchCode || "N/A"}
              </span>

              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                    isActive ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                />
                {branch.status}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2.5 text-sm text-slate-600 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Phone className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="truncate">
              {branch.phone || "No phone provided"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            <Mail className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="truncate">
              {branch.email || "No email provided"}
            </span>
          </div>

          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span className="text-xs text-slate-500 line-clamp-2">
              {address}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">
          Created{" "}
          {branch.createdAt
            ? new Date(branch.createdAt).toLocaleDateString()
            : "—"}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(branch)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20"
            title="Edit Branch"
            aria-label={`Edit ${branch.branchName}`}
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {!isMain && (
            <button
              type="button"
              onClick={() => onDelete(branch)}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 active:scale-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20"
              title="Delete Sub-Branch"
              aria-label={`Delete ${branch.branchName}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
});

const SearchableSelect = memo(function SearchableSelect({
  name,
  value,
  options,
  placeholder,
  onChange,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(lower));
  }, [options, search]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div 
        className={inputClass(false, "px-3 py-2 flex items-center justify-between cursor-pointer")}
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) setSearch(""); // Reset search on open
        }}
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-blue-100 rounded-xl shadow-[0_8px_30px_-15px_rgba(15,42,99,.25)] overflow-hidden bm-pop">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              autoFocus
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm outline-none bg-transparent text-slate-700"
            />
          </div>
          <ul className="max-h-48 overflow-y-auto bm-scroll p-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <li
                  key={opt}
                  onClick={() => {
                    onChange({ target: { name, value: opt } });
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
                    value === opt 
                      ? "bg-blue-50 text-blue-700 font-semibold" 
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt}
                </li>
              ))
            ) : (
              <li className="px-3 py-4 text-sm text-center text-slate-400 font-medium">
                No results found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
});

// One shared modal for both Add and Edit (removes ~300 duplicated lines)
const BranchFormModal = memo(function BranchFormModal({
  mode,
  branch,
  formData,
  formErrors,
  submitting,
  remainingCount,
  onChange,
  onSubmit,
  onClose,
}) {
  const isEdit = mode === "edit";
  const codeLocked = isEdit && isMainBranchOf(branch);
  const Icon = isEdit ? Edit2 : Plus;

  return (
    <div
      className="bm-fade fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0a1a3f]/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bm-modal bm-scroll bg-white w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl shadow-2xl border border-blue-100">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-3 sticky top-0 bg-white/95 backdrop-blur z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-600/25">
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-[#0f2a63]">
                {isEdit ? "Edit Branch Details" : "Add New Sub-Branch"}
              </h2>
              
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Branch Name"
              required
              error={formErrors.branchName}
              className="sm:col-span-2"
            >
              <input
                type="text"
                name="branchName"
                required
                autoFocus
                placeholder="e.g. Seaside Resort Branch"
                value={formData.branchName}
                onChange={onChange}
                className={inputClass(
                  formErrors.branchName,
                  "px-3.5 py-2.5"
                )}
              />
            </Field>

            <Field
              label={isEdit ? "Branch Code" : "Branch Code (Optional)"}
              error={formErrors.branchCode}
              hint={
                codeLocked
                  ? "Main branch code cannot be modified."
                  : undefined
              }
            >
              <input
                type="text"
                name="branchCode"
                disabled={codeLocked}
                placeholder="e.g. BEACH01"
                value={formData.branchCode}
                onChange={onChange}
                className={inputClass(
                  formErrors.branchCode,
                  `px-3.5 py-2.5 font-mono ${
                    codeLocked ? "!bg-slate-100 !text-slate-400" : ""
                  }`
                )}
              />
            </Field>

            <Field label="Status">
              <select
                name="status"
                value={formData.status}
                onChange={onChange}
                className={inputClass(false, "px-3.5 py-2.5 cursor-pointer")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>

            <Field label="Phone (10 Digits)" error={formErrors.phone}>
              <input
                type="tel"
                name="phone"
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                value={formData.phone}
                onChange={onChange}
                className={inputClass(formErrors.phone, "px-3.5 py-2.5")}
              />
            </Field>

            <Field label="Branch Email" error={formErrors.email}>
              <input
                type="email"
                name="email"
                placeholder="branch@hotel.com"
                value={formData.email}
                onChange={onChange}
                className={inputClass(formErrors.email, "px-3.5 py-2.5")}
              />
            </Field>
          </div>

          {/* Address */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-[#0f2a63] mb-2.5">
              Address Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  name="street"
                  placeholder="Street address"
                  value={formData.street}
                  onChange={onChange}
                  className={inputClass(false, "px-3 py-2")}
                />
              </div>
              
              <SearchableSelect
                name="country"
                value={formData.country}
                options={COUNTRIES_LIST}
                placeholder="Country"
                onChange={onChange}
              />

              <SearchableSelect
                name="state"
                value={formData.state}
                options={INDIAN_STATES}
                placeholder="State"
                onChange={onChange}
              />

              <SearchableSelect
                name="city"
                value={formData.city}
                options={TAMIL_NADU_DISTRICTS}
                placeholder="City"
                onChange={onChange}
              />

              <input
                type="text"
                name="pincode"
                placeholder="Pincode"
                value={formData.pincode}
                onChange={onChange}
                className={inputClass(false, "px-3 py-2")}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="bm-btn inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 rounded-xl shadow-lg shadow-blue-700/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Branch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

const DeleteModal = memo(function DeleteModal({
  branch,
  submitting,
  onConfirm,
  onClose,
}) {
  return (
    <div
      className="bm-fade fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1a3f]/60 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="alertdialog"
      aria-modal="true"
    >
      <div className="bm-modal bg-white rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl border border-blue-100">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-[#0f2a63]">
          Delete Sub-Branch
        </h3>

        <p className="text-sm text-slate-600 mt-2">
          Are you sure you want to delete{" "}
          <strong>"{branch.branchName}"</strong>? This action cannot be
          undone.
        </p>

        <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className="bm-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 rounded-xl shadow-lg shadow-rose-600/25 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete Branch
          </button>
        </div>
      </div>
    </div>
  );
});

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function BranchManagement() {
  const toast = useToast();
  const { userData } = useAuth(); // kept for parity with original
  const navigate = useNavigate();

  // ============================================================
  // STATES
  // ============================================================
  const [branches, setBranches] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);

  // Form State
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Keeps typing fast: filtering runs on a deferred copy of the input
  const deferredSearch = useDeferredValue(searchTerm);

  // ============================================================
  // LOAD DATA
  // ============================================================
  const loadData = useCallback(
    async (isManual = false) => {
      try {
        if (isManual) setRefreshing(true);
        else setLoading(true);

        const [branchesRes, usageRes] = await Promise.all([
          getAllBranches(),
          getBranchUsage(),
        ]);

        if (branchesRes?.success) {
          setBranches(branchesRes.data || []);
        }

        if (usageRes?.success) {
          setUsage(usageRes.data);
        }
      } catch (err) {
        console.error("[BranchManagement] Error loading data:", err);
        toast.error(
          err?.message || "Failed to load branches or plan quota details."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    loadData();

    const handleSubscriptionUpdated = () => {
      console.log(
        "[BranchManagement] Subscription updated event - reloading quotas"
      );
      loadData();
    };

    window.addEventListener("subscriptionUpdated", handleSubscriptionUpdated);
    return () => {
      window.removeEventListener(
        "subscriptionUpdated",
        handleSubscriptionUpdated
      );
    };
  }, [loadData]);

  // ============================================================
  // MODAL HELPERS
  // ============================================================
  const anyModalOpen =
    isAddModalOpen || isEditModalOpen || isDeleteModalOpen;

  const closeAddModal = useCallback(() => setIsAddModalOpen(false), []);
  const closeEditModal = useCallback(() => setIsEditModalOpen(false), []);
  const closeDeleteModal = useCallback(
    () => setIsDeleteModalOpen(false),
    []
  );

  // Lock background scroll + close on Escape while a modal is open
  useEffect(() => {
    if (!anyModalOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => {
      if (e.key === "Escape") {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setIsDeleteModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [anyModalOpen]);

  // ============================================================
  // FORM CHANGE (single handler for every field)
  // ============================================================
  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "branchCode" ? value.toUpperCase() : value,
    }));
  }, []);

  // ============================================================
  // FORM VALIDATION
  // ============================================================
  const validateForm = (isEdit = false) => {
    const errors = {};

    if (!formData.branchName.trim()) {
      errors.branchName = "Branch name is required";
    } else if (formData.branchName.trim().length < 2) {
      errors.branchName = "Branch name must contain at least 2 characters";
    }

    if (formData.branchCode.trim()) {
      const codeUpper = formData.branchCode.trim().toUpperCase();
      if (!isEdit && codeUpper === "MAIN") {
        errors.branchCode = "Code 'MAIN' is reserved for the primary branch";
      }
    }

    if (formData.phone.trim()) {
      if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
        errors.phone = "Phone number must be exactly 10 digits";
      }
    }

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = "Please enter a valid email address";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================
  // OPEN ADD MODAL
  // ============================================================
  const handleOpenAddModal = useCallback(() => {
    if (usage && !usage.canCreate) {
      toast.warn(
        `Branch limit reached (${usage.limit} max). Please upgrade your subscription plan.`
      );
      return;
    }
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsAddModalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usage]);

  // ============================================================
  // OPEN EDIT MODAL
  // ============================================================
  const handleOpenEditModal = useCallback((branch) => {
    setSelectedBranch(branch);
    setFormData({
      branchName: branch.branchName || "",
      branchCode: branch.branchCode || "",
      phone: branch.phone || "",
      email: branch.email || "",
      status: branch.status || "active",
      street: branch.address?.street || "",
      city: branch.address?.city || "",
      state: branch.address?.state || "",
      country: branch.address?.country || "India",
      pincode: branch.address?.pincode || "",
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  }, []);

  // ============================================================
  // OPEN DELETE MODAL
  // ============================================================
  const handleOpenDeleteModal = useCallback((branch) => {
    if (isMainBranchOf(branch)) {
      toast.warn("Primary Main Branch cannot be deleted.");
      return;
    }
    setSelectedBranch(branch);
    setIsDeleteModalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // SUBMIT ADD BRANCH
  // ============================================================
  const handleCreateBranch = async (e) => {
    e.preventDefault();

    if (!validateForm(false)) return;

    try {
      setSubmitting(true);

      const payload = {
        branchName: formData.branchName.trim(),
        branchCode: formData.branchCode.trim().toUpperCase(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        status: formData.status,
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          country: formData.country.trim(),
          pincode: formData.pincode.trim(),
        },
      };

      const res = await createBranch(payload);

      if (!res?.success) {
        throw new Error(res?.message || "Failed to create branch.");
      }

      // Get the newly created branch from backend
      const newBranch = res?.data;

      if (!newBranch?._id) {
        throw new Error(
          "Branch created, but server did not return branch data."
        );
      }

      // IMMEDIATELY UPDATE BRANCH LIST
      setBranches((prev) => {
        const alreadyExists = prev.some(
          (branch) => branch._id === newBranch._id
        );

        if (alreadyExists) return prev;

        return [...prev, newBranch];
      });

      // IMMEDIATELY UPDATE USAGE
      setUsage((prev) => {
        if (!prev) return prev;

        const currentUsed = Number(prev.used || 0);
        const currentRemaining = Number(prev.remaining || 0);

        const newUsed = currentUsed + 1;
        const newRemaining = Math.max(0, currentRemaining - 1);

        return {
          ...prev,
          used: newUsed,
          remaining: newRemaining,
          canCreate: newRemaining > 0,
        };
      });

      // CLOSE MODAL IMMEDIATELY
      setIsAddModalOpen(false);

      // Reset form
      setFormData(INITIAL_FORM);
      setFormErrors({});

      toast.success("Sub-branch created successfully!");
    } catch (err) {
      console.error("[BranchManagement] Create error:", err);

      toast.error(err?.message || "Failed to create branch.");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // SUBMIT UPDATE BRANCH
  // ============================================================
  const handleUpdateBranch = async (e) => {
    e.preventDefault();
    if (!selectedBranch) return;
    if (!validateForm(true)) return;

    try {
      setSubmitting(true);

      const payload = {
        branchName: formData.branchName.trim(),
        branchCode: formData.branchCode.trim().toUpperCase(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        status: formData.status,
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          country: formData.country.trim(),
          pincode: formData.pincode.trim(),
        },
      };

      const res = await updateBranch(selectedBranch._id, payload);

      if (!res?.success) {
        throw new Error(res?.message || "Failed to update branch.");
      }

      const updatedBranch = res.data;

      // Immediately update branch in UI
      if (updatedBranch?._id) {
        setBranches((prev) =>
          prev.map((branch) =>
            branch._id === updatedBranch._id ? updatedBranch : branch
          )
        );
      }

      // Close edit modal immediately
      setIsEditModalOpen(false);
      setSelectedBranch(null);

      // Clear form
      setFormData(INITIAL_FORM);
      setFormErrors({});

      toast.success("Branch updated successfully!");
    } catch (err) {
      console.error("[BranchManagement] Update error:", err);
      toast.error(err?.message || "Failed to update branch.");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // SUBMIT DELETE BRANCH
  // ============================================================
  const handleDeleteBranch = async () => {
    if (!selectedBranch?._id) return;

    try {
      setSubmitting(true);

      const res = await deleteBranch(selectedBranch._id);

      if (!res?.success) {
        throw new Error(res?.message || "Failed to delete branch.");
      }

      // Remove branch immediately from UI
      setBranches((prev) =>
        prev.filter((branch) => branch._id !== selectedBranch._id)
      );

      // Update quota immediately
      setUsage((prev) => {
        if (!prev) return prev;

        const newUsed = Math.max(0, Number(prev.used || 0) - 1);
        const newRemaining = Number(prev.remaining || 0) + 1;

        return {
          ...prev,
          used: newUsed,
          remaining: newRemaining,
          canCreate: true,
        };
      });

      // Close delete modal
      setIsDeleteModalOpen(false);
      setSelectedBranch(null);

      toast.success("Branch deleted successfully!");
    } catch (err) {
      console.error("[BranchManagement] Delete error:", err);

      toast.error(err?.message || "Failed to delete branch.");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // FILTERED BRANCHES
  // ============================================================
  const filteredBranches = useMemo(() => {
    const q = deferredSearch.toLowerCase();

    return branches.filter((branch) => {
      const matchSearch =
        !deferredSearch ||
        branch.branchName?.toLowerCase().includes(q) ||
        branch.branchCode?.toLowerCase().includes(q) ||
        branch.phone?.toLowerCase().includes(q) ||
        branch.address?.city?.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === "all" || branch.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [branches, deferredSearch, statusFilter]);

  const activeCount = useMemo(
    () => branches.filter((b) => b.status === "active").length,
    [branches]
  );

  // Usage stats
  const usedCount = usage?.used ?? branches.length;
  const limitCount = usage?.limit ?? 1;
  const remainingCount =
    usage?.remaining ?? Math.max(0, limitCount - usedCount);
  const isLimitReached = !usage?.canCreate && usage !== null;
  const progressPercent = Math.min(
    100,
    Math.round((usedCount / (limitCount || 1)) * 100)
  );

  const barColor =
    progressPercent >= 100
      ? "bg-rose-400"
      : progressPercent >= 75
      ? "bg-amber-400"
      : "bg-sky-400";

  // ============================================================
  // UI
  // ============================================================
  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 sm:space-y-6 pb-8">
      <style>{CSS}</style>

      <Helmet>
        <title>Branch Management | Hotel SaaS</title>
      </Helmet>

      {/* ============================================================
          TOP HEADER
      ============================================================ */}
      <header className="bm-rise bm-d1 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-blue-100/80 rounded-2xl p-4 sm:p-6 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)]">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <div className="shrink-0 p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-800 text-white shadow-lg shadow-blue-900/25">
            <Building2 className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#0f2a63] tracking-tight mt-1.5">
              Branch Management
            </h1>
          
          </div>
        </div>

        <div className="flex items-center gap-3">
          

          <button
            type="button"
            onClick={handleOpenAddModal}
            disabled={isLimitReached}
            className={`bm-btn flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm ${
              isLimitReached
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white shadow-lg shadow-blue-700/30"
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Sub-Branch
          </button>
        </div>
      </header>

      {/* ============================================================
          SUBSCRIPTION LIMIT & USAGE
      ============================================================ */}
      <section className="bm-rise bm-d2 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Quota hero */}
        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#0a1a3f] via-[#0f2a63] to-blue-700 text-white rounded-2xl p-5 sm:p-6 shadow-xl shadow-blue-900/25 flex flex-col justify-between gap-5">
          <div
            aria-hidden="true"
            className="bm-float pointer-events-none absolute -right-10 -top-10 w-44 h-44 rounded-full bg-blue-400/20 blur-2xl"
          />

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/15 text-white">
                  {usage?.planName || "Active Plan"}
                </span>
                <span className="text-xs text-blue-100/80">
                  Subscription quota
                </span>
              </div>

              <div className="text-right">
                <span className="text-3xl sm:text-4xl font-bold tabular-nums">
                  {usedCount}
                </span>
                <span className="text-blue-100/70 text-sm font-medium">
                  {" "}
                  / {limitCount} Branches
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="w-full bg-white/15 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className={`bm-bar h-full w-full rounded-full ${barColor}`}
                  style={{ transform: `scaleX(${progressPercent / 100})` }}
                />
              </div>

              <div className="flex justify-between items-center mt-2 text-xs text-blue-100/80">
                <span>{progressPercent}% allocated</span>
                <span>
                  {remainingCount > 0
                    ? `${remainingCount} slot${
                        remainingCount === 1 ? "" : "s"
                      } available`
                    : "No quota remaining"}
                </span>
              </div>
            </div>
          </div>

          {isLimitReached ? (
            <div className="relative p-3.5 bg-rose-500/15 border border-rose-300/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
                <p className="text-xs md:text-sm font-medium text-rose-50">
                  Branch limit reached! Upgrade your subscription plan to
                  create additional branches.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate("/hotel-billing-system/saas-user/choose-plan")
                }
                className="bm-btn inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white text-[#0f2a63] rounded-lg text-xs font-bold whitespace-nowrap shadow-sm"
              >
                Upgrade Plan <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="relative flex items-center gap-2 text-xs text-blue-100/90">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>
                You can create <strong>{remainingCount}</strong> more
                sub-branch{remainingCount === 1 ? "" : "es"} on your current
                plan.
              </span>
            </div>
          )}
        </div>

        {/* Quick metrics */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Total Branches"
            value={branches.length}
            note={`${activeCount} Active`}
            valueClass="text-[#0f2a63]"
            noteClass="text-emerald-600"
          />
          <StatCard
            label="Remaining Quota"
            value={remainingCount}
            note="Available slots"
            valueClass={
              remainingCount === 0 ? "text-rose-600" : "text-blue-600"
            }
            noteClass="text-slate-400"
          />
        </div>
      </section>

      {/* ============================================================
          SEARCH & FILTER TOOLBAR
      ============================================================ */}
      <section className="bm-rise bm-d3 bg-white border border-blue-100/80 rounded-2xl p-3 sm:p-4 shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-blue-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by branch name, code, city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={inputClass(false, "pl-10 pr-4 py-2.5")}
          />
        </div>

        <div className="flex items-center gap-1 bg-blue-50 p-1 rounded-xl w-full sm:w-auto">
          {STATUS_TABS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all duration-300 active:scale-95 ${
                statusFilter === status
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-blue-700"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      {/* ============================================================
          BRANCHES LISTING / GRID
      ============================================================ */}
      {loading ? (
        <div className="bm-pop bg-white border border-blue-100/80 rounded-2xl p-12 sm:p-16 flex flex-col items-center justify-center text-center shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500 mt-3">
            Loading your branches and quota...
          </p>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="bm-pop bg-white border border-blue-100/80 rounded-2xl p-10 sm:p-16 flex flex-col items-center justify-center text-center shadow-[0_8px_30px_-18px_rgba(15,42,99,.3)]">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
            <Building className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-[#0f2a63] mt-4">
            No Branches Found
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            {searchTerm
              ? "No branches match your search criteria. Try modifying your filter."
              : "You haven't created any sub-branches yet."}
          </p>
          {!isLimitReached && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="bm-btn mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-700/30"
            >
              <Plus className="w-4 h-4" /> Add Sub-Branch
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 pt-2">
          {filteredBranches.map((branch, index) => (
            <BranchCard
              key={branch._id}
              branch={branch}
              index={index}
              onEdit={handleOpenEditModal}
              onDelete={handleOpenDeleteModal}
            />
          ))}
        </div>
      )}

      {/* ============================================================
          MODALS (mounted only when open)
      ============================================================ */}
      {isAddModalOpen && (
        <BranchFormModal
          mode="add"
          formData={formData}
          formErrors={formErrors}
          submitting={submitting}
          remainingCount={remainingCount}
          onChange={handleFormChange}
          onSubmit={handleCreateBranch}
          onClose={closeAddModal}
        />
      )}

      {isEditModalOpen && selectedBranch && (
        <BranchFormModal
          mode="edit"
          branch={selectedBranch}
          formData={formData}
          formErrors={formErrors}
          submitting={submitting}
          remainingCount={remainingCount}
          onChange={handleFormChange}
          onSubmit={handleUpdateBranch}
          onClose={closeEditModal}
        />
      )}

      {isDeleteModalOpen && selectedBranch && (
        <DeleteModal
          branch={selectedBranch}
          submitting={submitting}
          onConfirm={handleDeleteBranch}
          onClose={closeDeleteModal}
        />
      )}
    </div>
  );
}