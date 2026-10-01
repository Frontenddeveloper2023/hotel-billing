import React, { useEffect, useState } from "react";

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
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../Context/AuthContext";

import {
  createRegistration,
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
  const { isAuthenticated, userData } = useAuth();

  // ==========================================================
  // GET PLAN FROM ROUTER STATE
  // ==========================================================

  const routerPlan =
    location.state?.selectedPlan || null;

  const routerBillingCycle =
    location.state?.billingCycle || null;


  // ==========================================================
  // GET PLAN FROM SESSION STORAGE
  // ==========================================================

  let savedPlan = null;

  try {
    const storedPlan =
      sessionStorage.getItem(
        "saasSelectedPlan"
      );

    if (storedPlan) {
      savedPlan = JSON.parse(storedPlan);
    }
  } catch (error) {
    console.error(
      "Unable to read selected plan:",
      error
    );
  }


  const savedBillingCycle =
    sessionStorage.getItem(
      "saasBillingCycle"
    );


  // ==========================================================
  // FINAL PLAN
  // ==========================================================

  const selectedPlan =
    routerPlan ||
    savedPlan ||
    null;


  // ==========================================================
  // FINAL BILLING CYCLE
  // ==========================================================

  const selectedBillingCycle =
    routerBillingCycle ||
    savedBillingCycle ||
    "monthly";

  // If already registered hotel owner, skip registration directly to checkout
  useEffect(() => {
    const isUpgrade =
      location.state?.isUpgrade ||
      sessionStorage.getItem("saasIsUpgrade") === "true" ||
      Boolean(isAuthenticated && userData?.hotelId);

    if (isUpgrade && selectedPlan) {
      sessionStorage.setItem("saasIsUpgrade", "true");
      navigate("/saas-user/checkout", {
        replace: true,
        state: {
          selectedPlan,
          billingCycle: selectedBillingCycle,
          isUpgrade: true,
          hotelDetails: location.state?.hotelDetails || {
            hotelName: userData?.hotelName || "Your Hotel",
            ownerName: userData?.name || "Hotel Owner",
            email: userData?.email || "",
            phone: userData?.phone || "",
          },
        },
      });
    }
  }, [isAuthenticated, userData, selectedPlan, selectedBillingCycle, location.state, navigate]);

  // ==========================================================
  // FORM
  // ==========================================================

const [form, setForm] = useState({
  hotelName: "",
  ownerName: "",
  email: "",
  phone: "",

  country: "India",
  state: "Tamil Nadu",
  city: "Chennai",

  pincode: "",
  street: "",

  gstNumber: "",
  taxEnabled: false,
  billingCycle: selectedBillingCycle,
});


  // ==========================================================
  // UI STATE
  // ==========================================================

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  // ==========================================================
  // HANDLE INPUT
  // ==========================================================

  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setForm((previous) => ({
      ...previous,

      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    if (error) {
      setError("");
    }
  };


  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validateForm = () => {
    if (!selectedPlan?._id) {
      return (
        "Please select a subscription plan before registering your hotel."
      );
    }

    if (!form.hotelName.trim()) {
      return "Please enter your hotel name.";
    }

    if (!form.ownerName.trim()) {
      return "Please enter the owner name.";
    }

    if (!form.email.trim()) {
      return "Please enter your email address.";
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(
        form.email.trim()
      )
    ) {
      return "Please enter a valid email address.";
    }

    if (!form.phone.trim()) {
      return "Please enter your phone number.";
    }

    const phoneDigits =
      form.phone.replace(
        /\D/g,
        ""
      );

    if (
      phoneDigits.length < 10 ||
      phoneDigits.length > 15
    ) {
      return "Please enter a valid phone number.";
    }

    if (!form.city.trim()) {
      return "Please enter your city.";
    }

    if (!form.state.trim()) {
      return "Please enter your state.";
    }

    if (!form.country.trim()) {
      return "Please enter your country.";
    }

    if (!form.pincode.trim()) {
      return "Please enter your pincode.";
    }

    if (!form.billingCycle) {
      return "Please select a billing cycle.";
    }

    return "";
  };


  // ==========================================================
  // SUBMIT REGISTRATION
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      // ------------------------------------------------------
      // REGISTRATION DATA
      // ------------------------------------------------------

      const registrationData = {
        hotelName:
          form.hotelName.trim(),

        ownerName:
          form.ownerName.trim(),

        email:
          form.email
            .trim()
            .toLowerCase(),

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


      // ------------------------------------------------------
      // API
      // ------------------------------------------------------

      const response =
        await createRegistration(
          registrationData
        );


      console.log(
        "Registration response:",
        response
      );


      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to submit your hotel registration."
        );
      }


      // ------------------------------------------------------
      // GET REGISTRATION DATA
      // ------------------------------------------------------

      const registration =
        response?.data ||
        response?.registration ||
        {};


      const registrationId =
        registration?.registrationId ||
        registration?._id ||
        response?.registrationId ||
        response?.data?.registrationId;


      if (!registrationId) {
        throw new Error(
          "Registration was created, but the application ID was not returned by the server."
        );
      }


      // ------------------------------------------------------
      // SAVE REGISTRATION ID
      // ------------------------------------------------------

      localStorage.setItem(
        "saasRegistrationId",
        registrationId
      );


      // ------------------------------------------------------
      // KEEP PLAN AVAILABLE
      // ------------------------------------------------------

      sessionStorage.setItem(
        "saasSelectedPlan",
        JSON.stringify(selectedPlan)
      );


      sessionStorage.setItem(
        "saasBillingCycle",
        form.billingCycle
      );


      // ------------------------------------------------------
      // GO TO CHECKOUT
      // ------------------------------------------------------

      navigate(
        "/saas-user/checkout",
        {
          state: {
            selectedPlan,

            billingCycle:
              form.billingCycle,

            registration: {
              registrationId,

              hotelName:
                form.hotelName.trim(),

              ownerName:
                form.ownerName.trim(),

              email:
                form.email
                  .trim()
                  .toLowerCase(),

              phone:
                form.phone.trim(),
            },

            registrationResponse:
              response,
          },
        }
      );

    } catch (err) {
      console.error(
        "Hotel registration error:",
        err
      );

      setError(
        err?.message ||
          err?.data?.message ||
          err?.response?.data?.message ||
          "Unable to submit your registration. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };


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
              onClick={() =>
                navigate(
                  "/saas-user/choose-plan"
                )
              }
              className="
                mb-8
                inline-flex
                items-center
                gap-2
                rounded-xl
                border
                border-[#D8DCE7]
                bg-white
                px-5
                py-3
                text-sm
                font-bold
                text-[#334155]
                transition-all
                duration-200
                hover:border-[#3B8EF3]
                hover:bg-[#F4F9FF]
                hover:text-[#1769D2]
              "
            >
              <ArrowLeft size={16} />

              Back to Plans
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
        activeStep={2}
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
              mt-4
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
            ERROR
        ==================================================== */}

        {error && (
          <div
            className="
              mb-6
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-red-200
              bg-[#FFF7F7]
              px-4
              py-4
            "
            style={{
              animation:
                "fadeUp 0.3s ease-out both",
            }}
          >

            <div className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-red-100
              text-red-600
            ">
              <AlertCircle size={17} />
            </div>


            <div>

              <p className="
                text-[13px]
                font-extrabold
                text-red-800
              ">
                Registration Error
              </p>

              <p className="
                mt-1
                text-[12px]
                font-medium
                leading-5
                text-red-700
              ">
                {error}
              </p>

            </div>

          </div>
        )}


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
                />


                <InputField
                  label="Owner Name"
                  name="ownerName"
                  value={form.ownerName}
                  onChange={handleChange}
                  placeholder="Enter owner name"
                  required
                  icon={User}
                />

              </div>

            </SectionCard>


            {/* =================================================
                CONTACT
            ================================================= */}

            <SectionCard
              icon={User}
              title="Contact Information"
              description="These details will be used for communication and account access."
              delay="0.10s"
            >

              <div className="
                grid
                grid-cols-1
                gap-5
                md:grid-cols-2
              ">

                <InputField
                  label="Email Address"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  required
                  icon={Mail}
                />


                <InputField
                  label="Phone Number"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  required
                  icon={Phone}
                />

              </div>


              <div className="
                mt-4
                flex
                items-center
                gap-2
                text-[11px]
                font-medium
                leading-5
                text-[#64748B]
              ">

                <LockKeyhole
                  size={13}
                  className="shrink-0 text-[#1769D2]"
                />

                Contact details are used for
                communication and login.

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

    {/* COUNTRY */}
    <SearchableSelect
      label="Country"
      name="country"
      value={form.country}
      onChange={handleChange}
      placeholder="Search country..."
      options={countries}
      required
      icon={Globe2}
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
    />

    {/* PINCODE */}
    <InputField
      label="Pincode"
      name="pincode"
      value={form.pincode}
      onChange={handleChange}
      placeholder="Enter pincode"
      required
      icon={MapPin}
    />

    {/* STREET / ADDRESS */}
    <InputField
      label="Street / Address"
      name="street"
      value={form.street}
      onChange={handleChange}
      placeholder="Building, street, area"
      icon={MapPin}
    />

   

  </div>
</SectionCard>


          


            {/* =================================================
                MOBILE BUTTONS
            ================================================= */}

            <div className="
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

            </div>

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
                overflow-hidden
                rounded-[22px]
                border
                border-[#DCE7F5]
                bg-white
              "
              style={{
                animation:
                  "fadeUp 0.5s ease-out 0.1s both",
              }}
            >


              {/* =================================================
                  PLAN HEADER
              ================================================= */}

              <div
                className="
                  relative
                  overflow-hidden
                  border-b
                  border-[#6AA5FF]
                  bg-[linear-gradient(145deg,#5597F5_0%,#347BE9_58%,#2868DA_100%)]
                  px-5 py-6 sm:px-6 sm:py-7
                "
              >
                <div className="pointer-events-none absolute right-0 top-0 h-[150px] w-[180px] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24)_0%,transparent_72%)]" />
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#E2EEFF]">Selected Plan Summary</p>
                    <h2 className="mt-2 break-words text-[23px] font-bold leading-tight tracking-[-0.03em] text-white">
                      {selectedPlan.planName}
                    </h2>
                  </div>
                  <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-[11px] font-bold text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" style={{ animation: "softPulse 1.8s ease-in-out infinite" }} />
                    Active Tier
                  </span>
                </div>
                <div className="relative mt-6 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <span className="break-words text-[34px] font-extrabold leading-none tracking-[-0.04em] text-white sm:text-[38px]">
                    {formatCurrency(currentPrice)}
                  </span>
                  <span className="pb-0.5 text-[14px] font-semibold text-[#EAF3FF]">/ {getBillingLabel(form.billingCycle)}</span>
                </div>
                <p className="relative mt-2 text-[12px] font-medium leading-5 text-[#E2EEFF]">
                  Billed {getBillingLabel(form.billingCycle)} • Subscription billing
                </p>
              </div>

              {/* =================================================
                  PLAN BODY
              ================================================= */}

              <div className="w-full p-4 sm:p-6 lg:p-7">


                {/* BILLING CYCLE */}

                <div>

                  <p className="
                    text-[10px]
                    font-extrabold
                    uppercase
                    tracking-[0.1em]
                    text-[#475569]
                  ">
                    Billing Cycle
                  </p>


                  <div className="relative mt-2">

                    <CreditCard
                      size={16}
                      className="
                        pointer-events-none
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        text-[#1769D2]
                      "
                    />

                    <select
                      name="billingCycle"
                      value={form.billingCycle}
                      onChange={handleChange}
                      className="
                        w-full
                        appearance-none
                        rounded-xl
                        border
                        border-[#D6E1EF]
                        bg-[#F8FBFF]
                        py-3
                        pl-10
                        pr-4
                        text-[13px]
                        font-bold
                        text-[#1E293B]
                        outline-none
                        transition-all
                        duration-200
                        focus:border-[#3B8EF3]
                        focus:bg-white
                        focus:ring-2
                        focus:ring-[#3B8EF3]/10
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


                <div className="
                  my-6
                  h-px
                  bg-[#E7E9EF]
                " />


                {/* =================================================
                    LIMITS
                ================================================= */}

                {selectedPlan.limits && (
                  <div>

                  


                <div
  className="
    mt-3
    grid
    grid-cols-1
    gap-2
    rounded-xl
    border
    border-[#D7E8FA]
    bg-[#EEF6FF]
    p-3
    sm:grid-cols-3
  "
>
  <Quota
    value={selectedPlan?.limits?.rooms}
    label="Rooms"
  />

  <Quota
    value={selectedPlan?.limits?.branches}
    label="Branches"
  />

  <Quota
    value={selectedPlan?.limits?.receptionists}
    label="Staff Access"
  />
</div>

                  </div>
                )}


                {/* =================================================
                    FEATURES
                ================================================= */}

                {selectedPlan.features && (
                  <div className="mt-6">

                    <p className="
                      text-[10px]
                      font-extrabold
                      uppercase
                      tracking-[0.1em]
                      text-[#475569]
                    ">
                      Included Features
                    </p>


                    <div className="
                      mt-3
                      space-y-3
                    ">

                      <FeatureRow
                        label="Food Service"
                        enabled={
                          selectedPlan
                            ?.features
                            ?.foodService
                        }
                      />


                      <FeatureRow
                        label="Room Service"
                        enabled={
                          selectedPlan
                            ?.features
                            ?.roomService
                        }
                      />

                    </div>

                  </div>
                )}


                {/* =================================================
                    PLAN DESCRIPTION
                ================================================= */}

                {selectedPlan.description && (
                  <div className="
                    mt-6
                    rounded-xl
                    border
                    border-[#D8E7F7]
                    bg-[#F8FBFF]
                    p-4
                  ">

                    <p className="
                      text-[10px]
                      font-extrabold
                      uppercase
                      tracking-[0.1em]
                      text-[#475569]
                    ">
                      Plan Description
                    </p>

                    <p className="
                      mt-2
                      text-[12px]
                      font-medium
                      leading-5
                      text-[#475569]
                    ">
                      {selectedPlan.description}
                    </p>

                  </div>
                )}


                {/* =================================================
                    INFO
                ================================================= */}

                <div className="
                  mt-6
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border
                  border-[#CFE2FA]
                  bg-[#EFF7FF]
                  px-4
                  py-3.5
                ">

                  <div className="
                    flex
                    h-7
                    w-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-[#2F80ED]
                    text-white
                  ">
                    <CheckCircle2 size={14} />
                  </div>


                  <p className="
                    text-[11px]
                    font-semibold
                    leading-5
                    text-[#475569]
                  ">
                    Your hotel details will be submitted
                    before continuing to checkout.
                  </p>

                </div>


          {/* =================================================
    CHECKOUT ACTIONS
================================================= */}

<div className="mt-6">

  <SubmitButton
    loading={loading}
  />

</div>

<div className="mt-3">

  <BackToPlansButton
    navigate={navigate}
    fullWidth
  />

</div>


                {/* SECURITY */}

                <div className="
                  mt-5
                  flex
                  items-start
                  gap-2.5
                  border-t
                  border-[#E7E9EF]
                  pt-4
                ">

                  <ShieldCheck
                    size={15}
                    className="
                      mt-0.5
                      shrink-0
                      text-[#087A58]
                    "
                  />

                  <p className="
                    text-[11px]
                    font-medium
                    leading-5
                    text-[#64748B]
                  ">
                    Your information is securely
                    submitted for admin review.
                  </p>

                </div>

              </div>

            </div>

          </aside>

        </form>

      </main>

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
    <div className="relative w-full">
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
            className="
              pointer-events-none
              absolute
              left-3.5
              top-1/2
              z-10
              -translate-y-1/2
              text-[#71859A]
            "
          />
        )}

        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          className="
            w-full
            rounded-xl
            border
            border-[#D6E1EF]
            bg-[#F8FBFF]
            px-3.5
            py-3.5
            pl-11
            pr-4
            text-left
            text-[14px]
            font-semibold
            text-[#17324D]
            outline-none
            transition-all
            hover:border-[#B8CCE3]
            focus:border-[#3B8EF3]
            focus:bg-white
            focus:ring-4
            focus:ring-[#3B8EF3]/10
          "
        >
          {value || placeholder}
        </button>

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
        overflow-hidden
        rounded-[22px]
        border
        border-[#DCE7F5]
        bg-white
        p-4
        shadow-[0_12px_35px_rgba(31,78,121,0.07)]
        sm:p-5
        lg:p-6
        xl:p-7
      "
      style={{ animation: `fadeUp 0.5s ease-out ${delay} both` }}
    >
      <div className="mb-6 flex min-w-0 items-start gap-3 sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D5E6FF] bg-[#EAF3FF] text-[#1769D2]">
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-[19px] font-bold leading-6 tracking-[-0.02em] text-[#17324D]">{title}</h2>
          {description && (
            <p className="mt-1.5 break-words text-[14px] font-medium leading-5 text-[#647B91]">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
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
}) => {
  return (
    <div className="min-w-0 w-full">
      <label className="mb-2 block text-[13px] font-bold leading-5 text-[#243B53]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <div className="relative w-full">
        {Icon && (
          <Icon
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71859A]"
          />
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`
            w-full min-w-0 rounded-xl border border-[#D6E1EF] bg-[#F8FBFF]
            px-3.5 py-3.5 text-[14px] font-semibold leading-5 text-[#17324D]
            outline-none transition-all duration-200 placeholder:text-[#8A9AAF]
            hover:border-[#B8CCE3] focus:border-[#3B8EF3] focus:bg-white
            focus:ring-4 focus:ring-[#3B8EF3]/10 ${Icon ? "pl-11" : ""}
          `}
        />
      </div>
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
        inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border
        border-[#D6E1EF] bg-white px-5 py-3 text-[14px] font-extrabold text-[#36516B]
        shadow-[0_4px_12px_rgba(31,78,121,0.05)] transition-all duration-200
        hover:border-[#AFCDF0] hover:bg-[#F4F9FF] hover:text-[#1769D2] active:scale-[0.98]
        ${fullWidth ? "w-full" : "w-full sm:w-auto"}
      `}
    >
      <ArrowLeft size={17} />
      Back to Plans
    </button>
  );
};


// ============================================================
// SUBMIT BUTTON
// ============================================================

const SubmitButton = ({ loading }) => {
  return (
    <button
      type="submit"
      disabled={loading}
      className="
        flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl
        bg-[linear-gradient(135deg,#3B8EF3_0%,#1769D2_100%)] px-5 py-3.5
        text-[15px] font-extrabold text-white shadow-[0_10px_22px_rgba(47,128,237,0.22)]
        transition-all duration-200 hover:-translate-y-0.5
        hover:shadow-[0_14px_28px_rgba(47,128,237,0.28)] active:translate-y-0
        disabled:cursor-not-allowed disabled:opacity-60
      "
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          Submitting...
        </>
      ) : (
        <>
          Continue to Checkout
          <ArrowRight size={18} />
        </>
      )}
    </button>
  );
};

export default SaaSUserRegistration;