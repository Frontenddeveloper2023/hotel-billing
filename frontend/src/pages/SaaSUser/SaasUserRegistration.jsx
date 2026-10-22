import React, { useState, useEffect } from "react";

import SaaSSetupProgress from "./SaaSSetupProgress";

import {
  Building2,
  User,
  Mail,
  Search,
  Phone,
  MapPin,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  LockKeyhole,
  ReceiptText,
  Landmark,
  Globe2,
  MapPinned,
  CreditCard,
  Sparkles,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useToast } from "../../Context/ToastContext";

import {
  createRegistration,
  registerFreeTrial,
} from "../../service/hotelRegistrationApi";


// ============================================================
// HELPER
// ============================================================

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};



const countries = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Singapore",
  "Malaysia",
  "United Arab Emirates",
  "Japan",
  "New Zealand",
];

const states = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const cities = [
  "Ariyalur",
  "Chengalpattu",
  "Chennai",
  "Coimbatore",
  "Cuddalore",
  "Dharmapuri",
  "Dindigul",
  "Erode",
  "Kallakurichi",
  "Kancheepuram",
  "Karur",
  "Krishnagiri",
  "Madurai",
  "Mayiladuthurai",
  "Nagapattinam",
  "Namakkal",
  "Nilgiris",
  "Perambalur",
  "Pudukkottai",
  "Ramanathapuram",
  "Ranipet",
  "Salem",
  "Sivaganga",
  "Tenkasi",
  "Thanjavur",
  "Theni",
  "Thoothukudi",
  "Tiruchirappalli",
  "Tirunelveli",
  "Tirupathur",
  "Tiruppur",
  "Tiruvallur",
  "Tiruvarur",
  "Vellore",
  "Viluppuram",
  "Virudhunagar",
];



// ============================================================
// COMPONENT
// ============================================================

const SaaSUserRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const toast = useToast();

  // ============================================================
  // GET PLAN SELECTED FROM CHOOSE PLAN
  // ============================================================
  const routerPlan = location.state?.selectedPlan || null;
  const routerBillingCycle = location.state?.billingCycle || null;

  let savedPlan = null;
  try {
    const storedPlan = sessionStorage.getItem("saasSelectedPlan");
    if (storedPlan) {
      savedPlan = JSON.parse(storedPlan);
    }
  } catch (error) {
    console.error("Unable to read selected plan:", error);
  }

  const savedBillingCycle = sessionStorage.getItem("saasBillingCycle");

  const selectedPlan = routerPlan || savedPlan || null;
  const selectedBillingCycle = routerBillingCycle || savedBillingCycle || "monthly";

  const isFreeTrial = Boolean(
    location.state?.isFreeTrial ||
    selectedPlan?.isFreeTrial ||
    sessionStorage.getItem("saasIsFreeTrial") === "true"
  );

  const [trialSuccessModal, setTrialSuccessModal] = useState(null);

  // ==========================================================
  // VERIFIED EMAIL CHECK & FORM STATE
  // ==========================================================
  const verifiedEmail = sessionStorage.getItem("hotelRegistrationEmail");

  let savedHotelDetails = null;
  try {
    const raw = sessionStorage.getItem("saasHotelDetails") || sessionStorage.getItem("saasRegistration");
    if (raw) savedHotelDetails = JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }

  const [form, setForm] = useState({
    hotelName: savedHotelDetails?.hotelName || "",
    ownerName: savedHotelDetails?.ownerName || "",
    email: verifiedEmail || "",
    phone: savedHotelDetails?.phone || "",
    country: savedHotelDetails?.address?.country || "India",
    state: savedHotelDetails?.address?.state || "Tamil Nadu",
    city: savedHotelDetails?.address?.city || "Chennai",
    pincode: savedHotelDetails?.address?.pincode || "",
    street: savedHotelDetails?.address?.street || "",
    gstNumber: savedHotelDetails?.gstNumber || "",
    taxEnabled: Boolean(savedHotelDetails?.taxEnabled),
    billingCycle: isFreeTrial ? "trial" : selectedBillingCycle,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!verifiedEmail) {
      toast.warn("Please verify your email address before entering hotel details.");
      navigate("/saas-user/verify-email", { replace: true });
      return;
    }
    // Always keep form.email strictly locked to verifiedEmail
    if (form.email !== verifiedEmail) {
      setForm((prev) => ({ ...prev, email: verifiedEmail }));
    }
  }, [verifiedEmail, navigate, toast, form.email]);

  // ==========================================================
  // HANDLE INPUT & CLEAR FIELD ERRORS
  // ==========================================================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Email and Country are locked and strictly cannot be changed
    if (name === "email" || name === "country") return;

    let processedValue = type === "checkbox" ? checked : value;

    // Phone: only digits, strictly max 10 digits
    if (name === "phone") {
      processedValue = value.replace(/\D/g, "").slice(0, 10);
    }

    // Pincode: only digits, strictly max 6 digits
    if (name === "pincode") {
      processedValue = value.replace(/\D/g, "").slice(0, 6);
    }

    setForm((previous) => ({
      ...previous,
      [name]: processedValue,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // ==========================================================
  // PROFESSIONAL VALIDATION & DIRECT SMOOTH SCROLL TO ERROR
  // ==========================================================
  const validateForm = () => {
    if (!selectedPlan?._id) {
      toast.error("Please select a subscription plan before registering your hotel.");
      return false;
    }

    const newErrors = {};

    if (!form.hotelName || !form.hotelName.trim()) {
      newErrors.hotelName = "Hotel name is required.";
    } else if (form.hotelName.trim().length < 2) {
      newErrors.hotelName = "Hotel name must be at least 2 characters.";
    }

    if (!form.ownerName || !form.ownerName.trim()) {
      newErrors.ownerName = "Owner name is required.";
    } else if (form.ownerName.trim().length < 2) {
      newErrors.ownerName = "Owner name must be at least 2 characters.";
    }

    const activeEmail = (verifiedEmail || form.email || "").trim().toLowerCase();
    if (!activeEmail) {
      newErrors.email = "Email address is required. Please verify your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(activeEmail)) {
      newErrors.email = "Please enter a valid email address.";
    }

    const cleanPhone = form.phone ? form.phone.replace(/\D/g, "") : "";
    if (!cleanPhone) {
      newErrors.phone = "Phone number is required.";
    } else if (cleanPhone.length !== 10) {
      newErrors.phone = "Phone number must be exactly 10 digits.";
    }

    if (!form.country || !form.country.trim()) {
      newErrors.country = "Please select a country.";
    }

    if (!form.state || !form.state.trim()) {
      newErrors.state = "Please select a state.";
    }

    if (!form.city || !form.city.trim()) {
      newErrors.city = "Please select a city.";
    }

    const cleanPincode = form.pincode ? form.pincode.replace(/\D/g, "") : "";
    if (!cleanPincode) {
      newErrors.pincode = "Pincode is required.";
    } else if (cleanPincode.length !== 6) {
      newErrors.pincode = "Pincode must be exactly 6 digits.";
    }

    if (!form.street || !form.street.trim()) {
      newErrors.street = "Street address is required.";
    } else if (form.street.trim().length < 3) {
      newErrors.street = "Please enter street address (min 3 characters).";
    }

    if (form.taxEnabled) {
      if (!form.gstNumber || !form.gstNumber.trim()) {
        newErrors.gstNumber = "GSTIN is required when tax is enabled.";
      } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(form.gstNumber.trim())) {
        newErrors.gstNumber = "Please enter a valid 15-character GSTIN (e.g., 33AAAAA0000A1Z5).";
      }
    }

    setErrors(newErrors);

    const errorKeys = Object.keys(newErrors);
    if (errorKeys.length > 0) {
      const fieldOrder = [
        "hotelName",
        "ownerName",
        "email",
        "phone",
        "country",
        "state",
        "city",
        "pincode",
        "street",
        "gstNumber",
      ];

      const firstErrorKey = fieldOrder.find((k) => newErrors[k]) || errorKeys[0];
      const targetElement = document.getElementById(`field-${firstErrorKey}`);

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          const inputEl = document.getElementById(`input-${firstErrorKey}`);
          if (inputEl) inputEl.focus({ preventScroll: true });
        }, 300);
      }

      toast.error(`Please correct: ${newErrors[firstErrorKey]}`);
      return false;
    }

    return true;
  };

  // ==========================================================
  // SUBMIT REGISTRATION
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    try {
      setLoading(true);

      const lockedEmail = (verifiedEmail || form.email).trim().toLowerCase();

      // ======================================================
      // 1. FREE TRIAL REGISTRATION FLOW (INSTANT ACCESS)
      // ======================================================
      if (isFreeTrial) {
        const trialResponse = await registerFreeTrial({
          hotelName: form.hotelName.trim(),
          ownerName: form.ownerName.trim(),
          email: lockedEmail,
          phone: form.phone.trim(),
          address: {
            street: form.street.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            country: form.country.trim(),
            pincode: form.pincode.trim(),
          },
          gstNumber: form.gstNumber.trim(),
          taxEnabled: form.taxEnabled,
          planId: selectedPlan?._id !== "free-trial" ? selectedPlan?._id : undefined,
        });

        if (!trialResponse?.success) {
          throw new Error(
            trialResponse?.message || "Unable to start your free trial."
          );
        }

        sessionStorage.removeItem("saasSelectedPlan");
        sessionStorage.removeItem("saasBillingCycle");
        sessionStorage.removeItem("saasIsFreeTrial");

        setTrialSuccessModal(
          trialResponse.data || {
            hotelName: form.hotelName.trim(),
            ownerEmail: lockedEmail,
            startDate: new Date(),
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            trialDays: 14,
          }
        );

        toast.success("Your free trial plan was enabled successfully!");
        return;
      }

      // ======================================================
      // 2. REGULAR PAID REGISTRATION FLOW (CHECKOUT & REVIEW)
      // ======================================================
      const registrationData = {
        hotelName:
          form.hotelName.trim(),

        ownerName:
          form.ownerName.trim(),

        email:
          lockedEmail,

        phone:
          form.phone.trim(),

        address: {
          street:
            form.street.trim(),

          city:
            form.city.trim(),

          state:
            form.state.trim(),

          country:
            form.country.trim(),

          pincode:
            form.pincode.trim(),
        },

        gstNumber:
          form.gstNumber.trim(),

        taxEnabled:
          form.taxEnabled,

        planId:
          selectedPlan._id,

        billingCycle:
          form.billingCycle,

        paymentStatus:
          "pending",
      };


      console.log(
        "Registration data:",
        registrationData
      );


      // Cache details in sessionStorage for checkout and return visits
      // Note: Data is saved to DB ONLY AFTER successful payment verification!
      sessionStorage.setItem("saasHotelDetails", JSON.stringify(registrationData));
      sessionStorage.setItem("saasRegistration", JSON.stringify(registrationData));

      // Navigate directly to checkout without creating an unpaid database record
      navigate(
        "/saas-user/checkout",
        {
          state: {
            selectedPlan,
            billingCycle: form.billingCycle,
            registration: registrationData,
            registrationData,
            hotelDetails: registrationData,
          },
        }
      );

    } catch (err) {
      console.error(
        "Hotel registration error:",
        err
      );

      const errMsg = err?.message ||
        err?.data?.message ||
        err?.response?.data?.message ||
        "Unable to submit your registration. Please try again.";

      // Show toast for duplicate email
      if (
          errMsg.toLowerCase().includes("email") &&
          errMsg.toLowerCase().includes("exists")
      ) {
    toast.error(
        "Email already registered. Please upgrade your plan from your hotel portal."
    );
} else {
    toast.error(errMsg);
}

    } finally {
      setLoading(false);
    }
  };


  // ==========================================================
  // ==========================================================
  // NO PLAN
  // ==========================================================

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#112E50_0%,#173B63_28%,#D8E6F3_70%,#F5F9FD_100%)]">

        <div className="
          mx-auto
          flex
          min-h-screen
          max-w-5xl
          items-center
          justify-center
          px-4
          py-10
          sm:px-6
        ">

          <div
            className="
              w-full
              rounded-[24px]
              border
              border-[#E3E5ED]
              bg-white
              p-8
              text-center
              sm:p-12
            "
            style={{
              animation:
                "fadeUp 0.45s ease-out both",
            }}
          >

<button
  type="button"
  onClick={() => navigate("/saas-user/choose-plan")}
  className="
    group mb-8 inline-flex items-center gap-2 
    text-sm font-medium text-slate-600 
    transition-colors duration-200 
    hover:text-indigo-600 focus:outline-none focus-visible:underline
  "
>
  <ArrowLeft 
    size={16} 
    className="transition-transform duration-200 group-hover:-translate-x-1" 
  />
  <span className="hover:underline underline-offset-4">
    Back to Plans
  </span>
</button>


            <div className="
              mx-auto
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              bg-[#EAF3FF]
              text-[#1769D2]
            ">
              <AlertCircle size={30} />
            </div>


            <h1 className="
              mt-6
              text-[28px]
              font-extrabold
              leading-tight
              tracking-[-0.04em]
              text-[#111827]
              sm:text-[34px]
            ">
              No Plan Selected
            </h1>


            <p className="
              mx-auto
              mt-3
              max-w-md
              text-[14px]
              font-medium
              leading-6
              text-[#475569]
            ">
              Please select a subscription plan
              before registering your hotel.
            </p>


            <button
              type="button"
              onClick={() =>
                navigate(
                  "/saas-user/choose-plan"
                )
              }
              className="
                mt-7
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-[#2F80ED]
                px-6
                py-3
                text-sm
                font-bold
                text-white
                transition-all
                duration-200
                hover:bg-[#1769D2]
                active:scale-[0.98]
              "
            >
              Choose a Plan

              <ArrowRight size={17} />
            </button>

          </div>

        </div>

        <style>{`
          @keyframes fadeUp {
            from {
              opacity: 0;
              transform: translateY(16px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

      </div>
    );
  }


  // ==========================================================
  // PRICE
  // ==========================================================

  const currentPrice =
    selectedPlan
      ?.pricing?.[
        form.billingCycle
      ] || 0;


  // ==========================================================
  // MAIN PAGE
  // ==========================================================

  return (
    <div
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[linear-gradient(180deg,#112E50_0%,#173B63_24%,#315B82_42%,#D8E6F3_68%,#F5F9FD_100%)]
        text-[#172033]
      "
    >

      {/* ======================================================
          BACKGROUND DECORATION
      ======================================================= */}

      <div
        className="
          pointer-events-none
          absolute
          inset-x-0
          top-0
          h-[430px]
          bg-[radial-gradient(circle_at_50%_20%,rgba(91,157,244,0.28)_0%,rgba(91,157,244,0.12)_28%,transparent_65%)]
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[300px]
          h-[320px]
          w-[900px]
          -translate-x-1/2
          rounded-full
          bg-[radial-gradient(ellipse,rgba(255,255,255,0.48)_0%,rgba(255,255,255,0.18)_42%,transparent_72%)]
          blur-3xl
        "
      />

      <div
        className="
          pointer-events-none
          absolute
          inset-x-0
          bottom-0
          h-[300px]
          bg-[linear-gradient(180deg,transparent_0%,rgba(245,249,253,0.55)_55%,#F5F9FD_100%)]
        "
      />

      {/* ======================================================
          ANIMATION
      ======================================================= */}

      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes softPulse {
          0%, 100% {
            opacity: 1;
          }

          50% {
            opacity: 0.55;
          }
        }
      `}</style>


      {/* ======================================================
          PROGRESS
      ======================================================= */}

      <SaaSSetupProgress
        activeStep={3}
      />


      {/* ======================================================
          PAGE
      ======================================================= */}

      <main className="
        relative
        z-10
        mx-auto
        w-full
        max-w-[1440px]
        px-4
        py-7
        sm:px-6
        sm:py-9
        lg:px-8
        xl:px-10
      ">


        {/* ====================================================
            HEADER
        ==================================================== */}

      <header
        className="
          mb-7
          flex
          flex-col
          gap-5
          lg:flex-row
          lg:items-end
          lg:justify-between
        "
        style={{
          animation: "fadeUp 0.45s ease-out both",
        }}
      >
        <div className="min-w-0">
          <h1
            className=" 
              text-[18px]
              font-bold
              leading-[1.1]
              tracking-[-0.045em]
              text-white
              sm:text-[24px]
              lg:text-[28px]
            "
          >
            Register Your Hotel 
          </h1>
        </div>
      </header>

        {/* ====================================================
            FORM
        ==================================================== */}

        <form
          onSubmit={handleSubmit}
          className="
            grid
            w-full
            min-w-0
            grid-cols-1
            gap-5
            lg:gap-6
            xl:grid-cols-[minmax(0,1fr)_390px]
          "
        >

          {/* ==================================================
              LEFT
          ================================================== */}

          <div className="space-y-5">

            {/* =================================================
                HOTEL INFORMATION
            ================================================= */}

            <SectionCard
              icon={Building2}
              title="Hotel Information"
              description="Enter the official details of your hotel."
              delay="0.05s"
            >

              <div className="
                grid
                grid-cols-1
                gap-5
                md:grid-cols-2
              ">

                <InputField
                  label="Hotel Name"
                  name="hotelName"
                  value={form.hotelName}
                  onChange={handleChange}
                  placeholder="Enter hotel name"
                  required
                  icon={Building2}
                  error={errors.hotelName}
                />

                <InputField
                  label="Owner Name"
                  name="ownerName"
                  value={form.ownerName}
                  onChange={handleChange}
                  placeholder="Enter owner name"
                  required
                  icon={User}
                  error={errors.ownerName}
                />

              </div>

            </SectionCard>


            {/* =================================================
                CONTACT
            ================================================= */}

            <SectionCard
              icon={User}
              title="Contact Information"
              delay="0.10s"
            >

              <div className="
                grid
                grid-cols-1
                gap-5
                md:grid-cols-2
              ">

                {/* LOCKED VERIFIED EMAIL DISPLAY */}
                <div className="min-w-0 w-full" id="field-email">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[13px] font-bold leading-5 text-[#243B53]">
                      Verified Email Address <span className="ml-1 text-red-500">*</span>
                    </label>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-xs">
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      Verified via OTP
                    </span>
                  </div>

                  <div className="relative w-full">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center text-emerald-600">
                      <Mail size={17} />
                    </div>

                    <input
                      type="email"
                      name="email"
                      id="input-email"
                      value={form.email || verifiedEmail || ""}
                      readOnly
                      disabled
                      tabIndex={-1}
                      autoComplete="off"
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-[#F1F5F9] text-[#1E293B] font-semibold text-[14px] leading-5 py-3.5 pl-11 pr-24 outline-none cursor-not-allowed select-none pointer-events-none opacity-95"
                    />

                  
                  </div>

                  {errors.email ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{errors.email}</span>
                    </p>
                  ) : (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#64748B]">
                      <LockKeyhole size={11} className="text-slate-400 shrink-0" />
                      Email is Already Verified. Cannot be edited.
                    </p>
                  )}
                </div>

                <InputField
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter 10-digit phone number"
                  required
                  icon={Phone}
                  error={errors.phone}
                />

              </div>


            

            </SectionCard>


            {/* =================================================
                ADDRESS
            ================================================= */}

            <SectionCard
              icon={MapPin}
              title="Hotel Address"
              description="Provide the registered address of your hotel."
              delay="0.15s"
            >
              <div className="space-y-5">

                {/* COUNTRY (DEFAULT & NON-EDITABLE) */}
                <InputField
                  label="Country"
                  name="country"
                  value={form.country || "India"}
                  readOnly={true}
                  disabled={true}
                  required
                  icon={Globe2}
                  error={errors.country}
                />

                {/* STATE */}
                <SearchableSelect
                  label="State"
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  placeholder="Search state..."
                  options={states}
                  required
                  icon={MapPinned}
                  error={errors.state}
                />

                {/* CITY */}
                <SearchableSelect
                  label="City"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Search city..."
                  options={cities}
                  required
                  icon={Landmark}
                  error={errors.city}
                />

                {/* PINCODE */}
                <InputField
                  label="Pincode"
                  name="pincode"
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  value={form.pincode}
                  onChange={handleChange}
                  placeholder="Enter 6-digit pincode"
                  required
                  icon={MapPin}
                  error={errors.pincode}
                />

                {/* STREET / ADDRESS */}
                <InputField
                  label="Street / Address"
                  name="street"
                  value={form.street}
                  onChange={handleChange}
                  placeholder="Building, street, area"
                  required
                  icon={MapPin}
                  error={errors.street}
                />

              </div>
            </SectionCard>


            {/* =================================================
                GST & TAX (OPTIONAL)
            ================================================= */}

            {/* <SectionCard
              icon={ReceiptText}
              title="GST & Tax Information (Optional)"
              description="Enable if your hotel is registered for GST invoicing."
              delay="0.20s"
            >
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="taxEnabled"
                    id="input-taxEnabled"
                    checked={form.taxEnabled}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-[13px] font-bold text-[#243B53]">Enable GST Billing for this Hotel</span>
                </label>

                {form.taxEnabled && (
                  <InputField
                    label="GSTIN Number"
                    name="gstNumber"
                    value={form.gstNumber}
                    onChange={handleChange}
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    required={true}
                    icon={ReceiptText}
                    error={errors.gstNumber}
                  />
                )}
              </div>
            </SectionCard> */}


          


            {/* =================================================
                MOBILE BUTTONS
            ================================================= */}

            {/* <div className="
              flex
              flex-col-reverse
              gap-3
              xl:hidden
              sm:flex-row
              sm:justify-between
            ">

              <BackToPlansButton
                navigate={navigate}
              />

              <SubmitButton
                loading={loading}
              />

            </div> */}


          </div>


          {/* ==================================================
              RIGHT PLAN SUMMARY
          ================================================== */}

          <aside className="
            min-w-0
            xl:sticky
            xl:top-6
            xl:self-start
          ">

    <div
  className="
    w-full
    min-w-0
    overflow-hidden
    rounded-[18px]
    border
    border-[#DCE7F5]
    bg-white
    shadow-[0_12px_35px_rgba(31,78,121,0.07)]
    sm:rounded-[20px]
    lg:rounded-[22px]
  "
  style={{
    animation: "fadeUp 0.5s ease-out 0.1s both",
  }}
>
  {/* =================================================
      PLAN HEADER
  ================================================= */}

  <div
    className="
      relative
      w-full
      min-w-0
      overflow-hidden
      border-b
      border-[#6AA5FF]
      bg-[linear-gradient(145deg,#5597F5_0%,#347BE9_58%,#2868DA_100%)]
      px-4
      py-5
      sm:px-5
      sm:py-6
      md:px-6
      md:py-7
    "
  >
    <div
      className="
        pointer-events-none
        absolute
        right-0
        top-0
        h-[110px]
        w-[130px]
        bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24)_0%,transparent_72%)]
        sm:h-[150px]
        sm:w-[180px]
      "
    />

    <div
      className="
        relative
        flex
        min-w-0
        flex-col
        gap-3
        sm:flex-row
        sm:items-start
        sm:justify-between
      "
    >
      <div className="min-w-0 flex-1">
        <p
          className="
            text-[10px]
            font-bold
            uppercase
            tracking-[0.08em]
            text-[#E2EEFF]
            sm:text-[11px]
            md:text-[12px]
          "
        >
          Selected Plan Summary
        </p>

        <h2
          className="
            mt-1.5
            break-words
            text-[20px]
            font-bold
            leading-tight
            tracking-[-0.03em]
            text-white
            sm:mt-2
            sm:text-[22px]
            md:text-[23px]
          "
        >
          {selectedPlan.planName}
        </h2>
      </div>

      <span
        className="
          inline-flex
          w-fit
          shrink-0
          items-center
          gap-1.5
          rounded-full
          border
          border-white/30
          bg-white/20
          px-2.5
          py-1.5
          text-[10px]
          font-bold
          text-white
          sm:px-3
          sm:text-[11px]
        "
      >
        <span
          className="
            h-1.5
            w-1.5
            shrink-0
            rounded-full
            bg-white
          "
          style={{
            animation:
              "softPulse 1.8s ease-in-out infinite",
          }}
        />

        Active
      </span>
    </div>

    {/* PRICE */}
    <div
      className="
        relative
        mt-4
        flex
        min-w-0
        flex-wrap
        items-end
        gap-x-2
        gap-y-1
        sm:mt-5
        md:mt-6
      "
    >
      <span
        className="
          break-words
          text-[28px]
          font-extrabold
          leading-none
          tracking-[-0.04em]
          text-white
          sm:text-[34px]
          md:text-[38px]
        "
      >
        {formatCurrency(currentPrice)}
      </span>

      <span
        className="
          pb-0.5
          text-[11px]
          font-semibold
          text-[#EAF3FF]
          sm:text-[13px]
          md:text-[14px]
        "
      >
        {isFreeTrial ? "Free Trial" : `/ ${getBillingLabel(form.billingCycle)}`}
      </span>
    </div>

    <p
      className="
        relative
        mt-2
        break-words
        text-[10px]
        font-medium
        leading-5
        text-[#E2EEFF]
        sm:text-[11px]
        md:text-[12px]
      "
    >
      {isFreeTrial
        ? "Full feature access • No payment required"
        : `Billed ${getBillingLabel(form.billingCycle)} • Subscription billing`}
    </p>
  </div>

  {/* =================================================
      PLAN BODY
  ================================================= */}

  <div
    className="
      w-full
      min-w-0
      p-3
      sm:p-5
      md:p-6
      lg:p-7
    "
  >
    {/* BILLING CYCLE (Hidden for Free Trial) */}
    {!isFreeTrial && (
      <>
        <div className="w-full min-w-0">
          <p
            className="
              text-[10px]
              font-extrabold
              uppercase
              tracking-[0.1em]
              text-[#475569]
              sm:text-[11px]
            "
          >
            Billing Cycle
          </p>

          <div className="relative mt-2 w-full">
            <CreditCard
              size={16}
              className="
                pointer-events-none
                absolute
                left-3
                top-1/2
                z-10
                -translate-y-1/2
                text-[#1769D2]
              "
            />

            <select
              name="billingCycle"
              value={form.billingCycle}
              onChange={handleChange}
              className="
                h-11
                w-full
                min-w-0
                appearance-none
                rounded-xl
                border
                border-[#D6E1EF]
                bg-[#F8FBFF]
                py-2.5
                pl-10
                pr-4
                text-[12px]
                font-bold
                text-[#1E293B]
                outline-none
                transition-all
                duration-200
                focus:border-[#3B8EF3]
                focus:bg-white
                focus:ring-2
                focus:ring-[#3B8EF3]/10
                sm:h-12
                sm:text-[13px]
              "
            >
              <option value="monthly">
                Monthly
              </option>

              <option value="quarterly">
                Quarterly
              </option>

              <option value="halfYearly">
                Half Yearly
              </option>

              <option value="yearly">
                Yearly
              </option>
            </select>
          </div>
        </div>

        {/* DIVIDER */}
        <div
          className="
            my-5
            h-px
            w-full
            bg-[#E7E9EF]
            sm:my-6
          "
        />
      </>
    )}

    {/* =================================================
        LIMITS
    ================================================= */}

    {selectedPlan.limits && (
      <div className="w-full min-w-0">
        <div
          className="
            mt-3
            grid
            w-full
            min-w-0
            grid-cols-1
            gap-2
            rounded-xl
            border
            border-[#D7E8FA]
            bg-[#EEF6FF]
            p-2.5
            sm:grid-cols-3
            sm:gap-3
            sm:p-3
          "
        >
          <div className="min-w-0">
            <Quota
              value={selectedPlan?.limits?.rooms}
              label="Rooms"
            />
          </div>

          <div className="min-w-0">
            <Quota
              value={selectedPlan?.limits?.branches}
              label="Branches"
            />
          </div>

          <div className="min-w-0">
            <Quota
              value={selectedPlan?.limits?.receptionists}
              label="Staff Access"
            />
          </div>
        </div>
      </div>
    )}

    {/* =================================================
        FEATURES
    ================================================= */}

    {selectedPlan.features && (
      <div className="mt-5 w-full min-w-0 sm:mt-6">
        <p
          className="
            text-[10px]
            font-extrabold
            uppercase
            tracking-[0.1em]
            text-[#475569]
            sm:text-[11px]
          "
        >
          Included Features
        </p>

        <div className="mt-3 w-full min-w-0 space-y-2.5 sm:space-y-3">
          <FeatureRow
            label="Food Service"
            enabled={
              selectedPlan?.features?.foodService
            }
          />

          <FeatureRow
            label="Room Service"
            enabled={
              selectedPlan?.features?.roomService
            }
          />
        </div>
      </div>
    )}

    {/* =================================================
        PLAN DESCRIPTION
    ================================================= */}

    {selectedPlan.description && (
      <div
        className="
          mt-5
          w-full
          min-w-0
          rounded-xl
          border
          border-[#D8E7F7]
          bg-[#F8FBFF]
          p-3
          sm:mt-6
          sm:p-4
        "
      >
        <p
          className="
            text-[10px]
            font-extrabold
            uppercase
            tracking-[0.1em]
            text-[#475569]
            sm:text-[11px]
          "
        >
          Plan Description
        </p>

        <p
          className="
            mt-2
            break-words
            text-[11px]
            font-medium
            leading-5
            text-[#475569]
            sm:text-[12px]
          "
        >
          {selectedPlan.description}
        </p>
      </div>
    )}

    {/* =================================================
        INFO
    ================================================= */}

    <div
      className="
        mt-5
        flex
        w-full
        min-w-0
        items-start
        gap-2.5
        rounded-xl
        border
        border-[#CFE2FA]
        bg-[#EFF7FF]
        px-3
        py-3
        sm:mt-6
        sm:gap-3
        sm:px-4
        sm:py-3.5
      "
    >
      <div
        className="
          flex
          h-7
          w-7
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-[#2F80ED]
          text-white
        "
      >
        <CheckCircle2 size={14} />
      </div>

      <p
        className="
          min-w-0
          break-words
          text-[10px]
          font-semibold
          leading-5
          text-[#475569]
          sm:text-[11px]
        "
      >
        {isFreeTrial
          ? "Your free trial will be activated immediately with full feature access."
          : "Your hotel details will be submitted before continuing to checkout."}
      </p>
    </div>

    {/* =================================================
        CHECKOUT ACTIONS
    ================================================= */}

    <div
      className="
        mt-5
        flex
        w-full
        justify-center
        sm:mt-6
      "
    >
      <div
        className="
          w-full
          max-w-[320px]
          sm:max-w-[340px]
        "
      >
        <SubmitButton loading={loading} isFreeTrial={isFreeTrial} />
      </div>
    </div>

    <div
      className="
        mt-2.5
        flex
        w-full
        justify-center
        sm:mt-3
      "
    >
      <div
        className="
          w-full
          max-w-[320px]
          sm:max-w-[340px]
        "
      >
        <BackToPlansButton
          navigate={navigate}
          fullWidth
        />
      </div>
    </div>

    {/* =================================================
        SECURITY
    ================================================= */}

    <div
      className="
        mt-5
        flex
        w-full
        min-w-0
        items-start
        gap-2
        border-t
        border-[#E7E9EF]
        pt-4
        sm:gap-2.5
      "
    >
      <ShieldCheck
        size={15}
        className="
          mt-0.5
          shrink-0
          text-[#087A58]
        "
      />

      <p
        className="
          min-w-0
          break-words
          text-[10px]
          font-medium
          leading-5
          text-[#64748B]
          sm:text-[11px]
        "
      >
        Your information is securely submitted for admin
        review.
      </p>
    </div>
  </div>
</div>

          </aside>

        </form>

      </main>

      {/* FREE TRIAL SUCCESS MODAL */}
      <FreeTrialSuccessModal
        data={trialSuccessModal}
        onLogin={() => navigate("/hotel-login")}
      />

    </div>
  );
};


const SearchableSelect = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  options = [],
  required = false,
  icon: Icon,
  error,
  id,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (option) => {
    onChange({
      target: {
        name,
        value: option,
        type: "text",
      },
    });

    setSearch("");
    setOpen(false);
  };

  return (
    <div className="relative w-full" id={id || `field-${name}`}>
      <label className="mb-2 block text-[13px] font-bold leading-5 text-[#243B53]">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className={`pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 ${
              error ? "text-red-500" : "text-[#71859A]"
            }`}
          />
        )}

        <button
          type="button"
          id={`input-${name}`}
          onClick={() => setOpen((previous) => !previous)}
          className={`
            w-full rounded-xl border
            ${
              error
                ? "border-red-400 bg-red-50/20 text-[#17324D] ring-2 ring-red-400/20 focus:border-red-500"
                : "border-[#D6E1EF] bg-[#F8FBFF] text-[#17324D] hover:border-[#B8CCE3] focus:border-[#3B8EF3] focus:bg-white focus:ring-4 focus:ring-[#3B8EF3]/10"
            }
            px-3.5 py-3.5 pl-11 pr-4 text-left text-[14px] font-semibold outline-none transition-all
          `}
        >
          {value || placeholder}
        </button>

        {error && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
            <AlertCircle size={13} className="shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {open && (
          <div
            className="
              absolute
              left-0
              right-0
              top-[calc(100%+6px)]
              z-50
              overflow-hidden
              rounded-xl
              border
              border-[#D6E1EF]
              bg-white
              shadow-[0_15px_40px_rgba(31,78,121,0.15)]
            "
          >
            {/* SEARCH */}
            <div className="border-b border-[#E7E9EF] p-2.5">
              <div className="relative">
                <Search
                  size={15}
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-[#71859A]
                  "
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder={placeholder}
                  autoFocus
                  className="
                    w-full
                    rounded-lg
                    border
                    border-[#D6E1EF]
                    bg-[#F8FBFF]
                    py-2.5
                    pl-9
                    pr-3
                    text-[13px]
                    font-medium
                    text-[#17324D]
                    outline-none
                    focus:border-[#3B8EF3]
                    focus:bg-white
                    focus:ring-2
                    focus:ring-[#3B8EF3]/10
                  "
                />
              </div>
            </div>

            {/* OPTIONS */}
            <div className="max-h-60 overflow-y-auto p-1.5">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`
                      w-full
                      rounded-lg
                      px-3
                      py-2.5
                      text-left
                      text-[13px]
                      font-semibold
                      transition-colors
                      ${
                        value === option
                          ? "bg-[#EAF3FF] text-[#1769D2]"
                          : "text-[#334155] hover:bg-[#F4F8FC]"
                      }
                    `}
                  >
                    {option}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-[12px] font-medium text-[#64748B]">
                  No results found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// SECTION CARD
// ============================================================

const SectionCard = ({
  icon: Icon,
  title,
  description,
  children,
  delay = "0s",
}) => {
  return (
  

    <section
  className="
    w-full
    min-w-0
    overflow-hidden
    rounded-[18px]
    border
    border-[#DCE7F5]
    bg-white
    p-3
    shadow-[0_12px_35px_rgba(31,78,121,0.07)]
    sm:rounded-[20px]
    sm:p-4
    md:p-5
    lg:rounded-[22px]
    lg:p-6
    xl:p-7
  "
  style={{
    animation: `fadeUp 0.5s ease-out ${delay} both`,
  }}
>
  <div
    className="
      mb-4
      flex
      w-full
      min-w-0
      items-start
      gap-2.5
      sm:mb-5
      sm:gap-3
      md:mb-6
      md:gap-4
    "
  >
    {/* ICON */}
    <div
      className="
        flex
        h-9
        w-9
        shrink-0
        items-center
        justify-center
        rounded-lg
        border
        border-[#D5E6FF]
        bg-[#EAF3FF]
        text-[#1769D2]
        sm:h-10
        sm:w-10
        sm:rounded-xl
        md:h-11
        md:w-11
      "
    >
      <Icon
        size={17}
        className="sm:h-[18px] sm:w-[18px] md:h-5 md:w-5"
      />
    </div>

    {/* TITLE + DESCRIPTION */}
    <div className="min-w-0 flex-1">
      <h2
        className="
          break-words
          text-[16px]
          font-bold
          leading-5
          tracking-[-0.02em]
          text-[#17324D]
          sm:text-[17px]
          sm:leading-6
          md:text-[19px]
        "
      >
        {title}
      </h2>

      {description && (
        <p
          className="
            mt-1
            break-words
            text-[12px]
            font-medium
            leading-[18px]
            text-[#647B91]
            sm:mt-1.5
            sm:text-[13px]
            sm:leading-5
            md:text-[14px]
          "
        >
          {description}
        </p>
      )}
    </div>
  </div>

  {/* CONTENT */}
  <div className="w-full min-w-0">
    {children}
  </div>
</section>


  );
};


// ============================================================
// INPUT FIELD
// ============================================================

const InputField = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  icon: Icon,
  error,
  readOnly = false,
  disabled = false,
  maxLength,
  inputMode,
  pattern,
  id,
  badge,
  ...rest
}) => {
  return (
    <div className="min-w-0 w-full" id={id || `field-${name}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-[13px] font-bold leading-5 text-[#243B53]">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        {badge && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            {badge}
          </span>
        )}
      </div>
      <div className="relative w-full">
        {Icon && (
          <Icon
            size={17}
            className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${
              error ? "text-red-500" : "text-[#71859A]"
            }`}
          />
        )}
        <input
          type={type}
          name={name}
          id={`input-${name}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
          disabled={disabled}
          maxLength={maxLength}
          inputMode={inputMode}
          pattern={pattern}
          {...rest}
          className={`
            w-full min-w-0 rounded-xl border
            ${
              error
                ? "border-red-400 bg-red-50/20 text-[#17324D] ring-2 ring-red-400/20 focus:border-red-500 focus:ring-red-400/30"
                : readOnly
                ? "border-slate-200 bg-[#F1F5F9] text-[#1E293B] cursor-not-allowed select-none opacity-95"
                : "border-[#D6E1EF] bg-[#F8FBFF] text-[#17324D] hover:border-[#B8CCE3] focus:border-[#3B8EF3] focus:bg-white focus:ring-4 focus:ring-[#3B8EF3]/10"
            }
            px-3.5 py-3.5 text-[14px] font-semibold leading-5
            outline-none transition-all duration-200 placeholder:text-[#8A9AAF]
            ${Icon ? "pl-11" : ""}
            ${readOnly ? "pr-20" : ""}
          `}
        />
        {readOnly && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-white border border-slate-200/80 rounded-md px-2 py-0.5 select-none shadow-xs">
            <LockKeyhole size={11} className="text-slate-400" />
            Default
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};


// ============================================================
// QUOTA
// ============================================================

const Quota = ({ value, label }) => {
  const displayValue = Number(value || 0) === 0 ? "Unlimited" : value;
  return (
    <div className="min-w-0 rounded-lg px-2 py-2 text-center">
      <p className="break-words text-[18px] font-extrabold leading-5 tracking-[-0.02em] text-[#1769D2]">
        {displayValue}
      </p>
      <p className="mt-1 break-words text-[11px] font-bold leading-4 text-[#52667A]">{label}</p>
    </div>
  );
};


// ============================================================
// FEATURE ROW
// ============================================================

const FeatureRow = ({ label, enabled }) => {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#E4ECF5] bg-[#FAFCFF] px-3.5 py-3">
      {enabled ? (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E7F7F0] text-[#087A58]">
          <CheckCircle2 size={16} strokeWidth={2.6} />
        </span>
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F1F4F8] text-red-500">
          <XCircle size={16} strokeWidth={2.3} />
        </span>
      )}
      <span className={`min-w-0 break-words text-[14px] font-semibold leading-5 ${enabled ? "text-[#243B53]" : "text-[#243B53] line-through decoration-[#243B53]"}`}>
        {label}
      </span>
    </div>
  );
};


// ============================================================
// BILLING LABEL
// ============================================================

const getBillingLabel = (
  billingCycle
) => {
  switch (billingCycle) {

    case "quarterly":
      return "quarter";

    case "halfYearly":
      return "6 months";

    case "yearly":
      return "year";

    default:
      return "month";
  }
};


// ============================================================
// BACK TO PLANS
// ============================================================

const BackToPlansButton = ({ navigate, fullWidth = false }) => {
  return (
<button
  type="button"
  onClick={() => navigate("/saas-user/choose-plan")}
  className={`
    inline-flex items-center gap-1.5 text-xs font-medium text-slate-600
    transition-colors duration-150 hover:text-slate-900 hover:underline
    underline-offset-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-slate-400
    ${fullWidth ? "w-full justify-start" : "w-auto"}
  `}
>
  <ArrowLeft size={14} className="text-slate-500" />
  <span>Back to Plans</span>
</button>
  );
};


// ============================================================
// SUBMIT BUTTON
// ============================================================

const SubmitButton = ({ loading, isFreeTrial }) => {
  return (
<button
  type="submit"
  disabled={loading}
  className={`
    group relative inline-flex w-full sm:w-auto sm:min-w-[280px] items-center justify-center gap-2.5 
    rounded-xl px-6 py-3.5 text-sm sm:text-[15px] font-semibold text-white
    transition-all duration-200 ease-out
    hover:-translate-y-0.5 active:translate-y-0
    disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 cursor-pointer
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    ${
      isFreeTrial
        ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_4px_20px_rgba(13,148,136,0.25)] hover:shadow-[0_6px_24px_rgba(13,148,136,0.35)] focus-visible:ring-emerald-500 border border-emerald-500/20"
        : "bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 shadow-[0_4px_20px_rgba(15,23,42,0.3)] hover:shadow-[0_6px_24px_rgba(15,23,42,0.4)] focus-visible:ring-indigo-500 border border-slate-700/50"
    }
  `}
>
  {loading ? (
    <>
      <Loader2 size={18} className="animate-spin text-white/80" />
      <span>{isFreeTrial ? "Starting Free Trial..." : "Processing..."}</span>
    </>
  ) : isFreeTrial ? (
    <>
      <Sparkles size={18} className="text-emerald-300 transition-transform duration-300 group-hover:scale-110" />
      <span>Start your free trial</span>
      <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
    </>
  ) : (
    <>
      <span>Continue to Checkout</span>
      <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" />
    </>
  )}
</button>
  );
};

// ============================================================
// FREE TRIAL SUCCESS MODAL
// ============================================================

const FreeTrialSuccessModal = ({ data, onLogin }) => {
  if (!data) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const startFormatted = formatDate(data.startDate);
  const endFormatted = formatDate(data.endDate);

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
  <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100 text-left">
    
    {/* Header Section */}
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
        <Sparkles size={20} />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-slate-900 tracking-tight">
          Free Trial Activated
        </h2>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
          Your hotel account has been successfully set up with instant trial access.
        </p>
      </div>
    </div>

    {/* Trial Window Banner */}
    <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200/70 p-3.5">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>Trial Period</span>
        <span className="font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
          {data.trialDays || 14} Days Active
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
        <span>{startFormatted}</span>
        <span className="text-slate-400 font-normal text-xs">to</span>
        <span>{endFormatted}</span>
      </div>
    </div>

    {/* Details Section */}
    <div className="mt-4 space-y-2.5 rounded-xl border border-slate-200/60 bg-white p-3.5 text-xs">
      <div className="flex justify-between items-center">
        <span className="text-slate-500">Hotel Name</span>
        <span className="font-medium text-slate-900 truncate max-w-[200px]">{data.hotelName}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-slate-500">Login Email</span>
        <span className="font-medium text-slate-900 truncate max-w-[200px]">{data.ownerEmail}</span>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
        <span className="text-slate-500">Unlocked Access</span>
        <span className="font-medium text-emerald-700">Food, Service & Bookings</span>
      </div>
    </div>

    {/* Primary Action Button */}
    <div className="mt-6">
      <button
        type="button"
        onClick={onLogin}
        className="w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-slate-800 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
      >
        <span>Go to Hotel Dashboard</span>
        <ArrowRight size={16} className="text-slate-400" />
      </button>
    </div>

  </div>
</div>
  );
};

export default SaaSUserRegistration;