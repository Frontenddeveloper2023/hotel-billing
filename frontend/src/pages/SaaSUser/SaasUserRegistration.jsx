import React, { useState } from "react";

import SaaSSetupProgress from "./SaaSSetupProgress";

import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
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


// ============================================================
// COMPONENT
// ============================================================

const SaaSUserRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();

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


  // ==========================================================
  // FORM
  // ==========================================================

  const [form, setForm] = useState({
    hotelName: "",
    ownerName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
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
      <div className="min-h-screen bg-[#F7F6FC]">

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
                hover:border-[#4338CA]
                hover:bg-[#F5F3FF]
                hover:text-[#4338CA]
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
              bg-[#EEEEFF]
              text-[#4338CA]
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
                bg-[#4338CA]
                px-6
                py-3
                text-sm
                font-bold
                text-white
                transition-all
                duration-200
                hover:bg-[#3730A3]
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
    <div className="
      min-h-screen
      bg-[#F7F6FC]
      text-[#172033]
    ">

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
  <div>

    {/* BADGE */}
    <div
      className="
        inline-flex
        items-center
        gap-2
        rounded-full
        bg-[#EAE9FF]
        px-3
        py-1
        text-[10px]
        font-bold
        uppercase
        tracking-[0.08em]
        text-[#4338CA]
      "
    >
      <span
        className="
          h-1.5
          w-1.5
          rounded-full
          bg-[#4338CA]
        "
      />

      <span>
        Hospitality Enterprise Entity Provisioning
      </span>
    </div>


    {/* TITLE */}
    <h1
      className="
        mt-3
        text-[25px]
        font-bold
        leading-[1.1]
        tracking-[-0.045em]
        text-[#111827]
        sm:text-[38px]
      "
    >
      Register Your Hotel
    </h1>


    {/* DESCRIPTION */}
    <p
      className="
        mt-2
        max-w-2xl
        text-[13px]
        font-medium
        leading-6
        text-[#475569]
        sm:text-[14px]
      "
    >
      Create your hotel management account and submit
      your hotel details for platform onboarding.
    </p>

  </div>


  {/* SECURITY */}
  <div
    className="
      flex
      w-fit
      items-center
      gap-3
      rounded-xl
      border
      border-[#E1E4EB]
      bg-white
      px-4
      py-3
    "
  >

    <div
      className="
        flex
        h-10
        w-10
        items-center
        justify-center
        rounded-lg
        bg-[#E8FAF3]
        text-[#087A58]
      "
    >
      <ShieldCheck size={19} />
    </div>


    <div>

      <p
        className="
          text-[11px]
          font-extrabold
          leading-4
          text-[#1E293B]
        "
      >
        Secure Registration
      </p>

      <p
        className="
          mt-0.5
          text-[11px]
          font-medium
          leading-4
          text-[#64748B]
        "
      >
        Your information is protected
      </p>

    </div>

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
            grid-cols-1
            gap-6
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
                  className="shrink-0 text-[#4338CA]"
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

                <InputField
                  label="Street / Address"
                  name="street"
                  value={form.street}
                  onChange={handleChange}
                  placeholder="Building, street, area"
                  icon={MapPin}
                />


                <div className="
                  grid
                  grid-cols-1
                  gap-5
                  sm:grid-cols-2
                ">

                  <InputField
                    label="City"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Enter city"
                    required
                    icon={Landmark}
                  />


                  <InputField
                    label="State"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="Enter state"
                    required
                    icon={MapPinned}
                  />

                </div>


                <div className="
                  grid
                  grid-cols-1
                  gap-5
                  sm:grid-cols-2
                ">

                  <InputField
                    label="Country"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    placeholder="Enter country"
                    required
                    icon={Globe2}
                  />


                  <InputField
                    label="Pincode"
                    name="pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    placeholder="Enter pincode"
                    required
                    icon={MapPin}
                  />

                </div>


                {/* LOCATION MATCH */}

                <div className="
                  flex
                  flex-col
                  gap-3
                  rounded-xl
                  border
                  border-[#E3E5F2]
                  bg-[#F5F5FF]
                  p-4
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                ">

                  <div className="
                    flex
                    items-center
                    gap-3
                  ">

                    <div className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-[#4338CA]
                      text-white
                    ">
                      <MapPinned size={16} />
                    </div>


                    <div>

                      <p className="
                        text-[12px]
                        font-extrabold
                        text-[#1E293B]
                      ">
                        Address Location
                      </p>

                      <p className="
                        mt-0.5
                        text-[11px]
                        font-medium
                        leading-5
                        text-[#64748B]
                      ">
                        Your hotel address will be
                        used for platform setup.
                      </p>

                    </div>

                  </div>


                 <span
  className="
    inline-flex
    w-fit
    items-center
    gap-1.5
    rounded-full
    bg-[#DDF7EC]
    px-3
    py-1.5
    text-[10px]
    font-bold
    text-[#087A58]
  "
>
  <span
    className="
      h-1.5
      w-1.5
      rounded-full
      bg-[#087A58]
    "
  />

  Ready to Verify
</span>

                </div>

              </div>

            </SectionCard>


            {/* =================================================
                TAX
            ================================================= */}


 

<SectionCard
  icon={FileText}
  title="Tax Information"
  description="Add your hotel tax information for billing."
  delay="0.20s"
>
  <div className="space-y-5">

    <div className="max-w-xl">

      <InputField
        label="GST Number"
        name="gstNumber"
        value={form.gstNumber}
        onChange={handleChange}
        placeholder="Enter GST number"
        icon={ReceiptText}
      />

    </div>

    {/* TAX TOGGLE */}

    <label
      className="
        flex
        cursor-pointer
        items-center
        justify-between
        gap-5
        rounded-xl
        border
        border-[#E2E4EC]
        bg-[#FAFAFD]
        px-4
        py-4
        transition-all
        duration-200
        hover:border-[#C9C5F4]
        hover:bg-[#F8F7FF]
      "
    >

      <div className="flex items-start gap-3">

        <div
          className="
            mt-0.5
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-[#EEEEFF]
            text-[#4338CA]
          "
        >
          <ReceiptText size={16} />
        </div>

        <div>

          <p
            className="
              text-[13px]
              font-extrabold
              leading-5
              text-[#1E293B]
            "
          >
            Enable tax calculation
          </p>

          <p
            className="
              mt-1
              text-[11px]
              font-medium
              leading-5
              text-[#64748B]
            "
          >
            Detailed tax settings can be configured after activation.
          </p>

        </div>

      </div>

    {/* SWITCH */}

<div className="relative shrink-0">
  <button
    type="button"
    role="switch"
    aria-checked={form.taxEnabled}
    onClick={() =>
      setForm((prev) => ({
        ...prev,
        taxEnabled: !prev.taxEnabled,
      }))
    }
    className={`
      relative
      cursor-pointer
      flex
      h-6
      w-11
      items-center
      rounded-full
      p-1
      transition-all
      duration-200
      focus:outline-none
      focus:ring-2
      focus:ring-[#4338CA]/30
      ${
        form.taxEnabled
          ? "bg-[#4338CA]"
          : "bg-[#D7DAE4]"
      }
    `}
  >
    <span
      className={`
        block
        h-4
        w-4
        rounded-full
        bg-white
        shadow-sm
        transition-transform
        duration-200
        ${
          form.taxEnabled
            ? "translate-x-5"
            : "translate-x-0"
        }
      `}
    />
  </button>
</div>

    </label>

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
                border-[#DDE1EA]
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

              <div className="
                border-b
                border-[#E0E2EC]
                bg-[#EAE9FF]
                px-5
                py-6
                sm:px-6
              ">

                <div className="
                  flex
                  items-start
                  justify-between
                  gap-4
                ">

                  <div>

                    <p className="
                      text-[10px]
                      font-extrabold
                      uppercase
                      tracking-[0.12em]
                      text-[#475569]
                    ">
                      Selected Plan Summary
                    </p>


                    <h2 className="
                      mt-2
                      text-[23px]
                      font-bold
                      leading-tight
                      tracking-[-0.035em]
                      text-[#111827]
                    ">
                      {selectedPlan.planName}
                    </h2>

                  </div>


                  <span className="
                    inline-flex
                    shrink-0
                    items-center
                    gap-1.5
                    rounded-full
                    bg-[#BDF5DE]
                    px-3
                    py-1.5
                    text-[10px]
                    font-extrabold
                    text-[#087A58]
                  ">

                    <span
                      className="
                        h-1.5
                        w-1.5
                        rounded-full
                        bg-[#087A58]
                      "
                      style={{
                        animation:
                          "softPulse 1.8s ease-in-out infinite",
                      }}
                    />

                    Active Tier

                  </span>

                </div>


                {/* PRICE */}

                <div className="
                  mt-5
                  flex
                  items-end
                  gap-1
                ">

                  <span className="
                    text-[32px]
                    font-extrabold
                    leading-none
                    tracking-[-0.05em]
                    text-[#4338CA]
                    sm:text-[36px]
                  ">
                    {formatCurrency(
                      currentPrice
                    )}
                  </span>

                  <span className="
                    pb-1
                    text-[11px]
                    font-bold
                    text-[#475569]
                  ">
                    / {getBillingLabel(
                      form.billingCycle
                    )}
                  </span>

                </div>


                <p className="
                  mt-2
                  text-[11px]
                  font-semibold
                  leading-5
                  text-[#475569]
                ">
                  Billed{" "}
                  {getBillingLabel(
                    form.billingCycle
                  )}{" "}
                  • Subscription billing
                </p>

              </div>


              {/* =================================================
                  PLAN BODY
              ================================================= */}

              <div className="p-5 sm:p-6">


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
                        text-[#4338CA]
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
                        border-[#D9DDE7]
                        bg-[#FAFAFD]
                        py-3
                        pl-10
                        pr-4
                        text-[13px]
                        font-bold
                        text-[#1E293B]
                        outline-none
                        transition-all
                        duration-200
                        focus:border-[#4338CA]
                        focus:bg-white
                        focus:ring-2
                        focus:ring-[#4338CA]/10
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

                    <p className="
                      text-[10px]
                      font-extrabold
                      uppercase
                      tracking-[0.1em]
                      text-[#475569]
                    ">
                      Allocated Operational Quotas
                    </p>


                <div
  className="
    mt-3
    grid
    grid-cols-3
    gap-2
    rounded-xl
    bg-[#F0EFFF]
    p-3
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
                    border-[#E0E2F0]
                    bg-[#FAFAFD]
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
                  border-[#DDE0F6]
                  bg-[#F2F1FF]
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
                    bg-[#4338CA]
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
        rounded-[20px]
        border
        border-[#E0E3EA]
        bg-white
        p-5
        sm:p-6
        lg:p-7
      "
      style={{
        animation:
          `fadeUp 0.5s ease-out ${delay} both`,
      }}
    >

      {/* HEADER */}

      <div className="
        mb-6
        flex
        items-start
        gap-3
      ">

        <div className="
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-xl
          bg-[#EEEEFF]
          text-[#4338CA]
        ">
          <Icon size={19} />
        </div>


        <div>

          <h2 className="
            text-[17px]
            font-bold
            leading-6
            tracking-[-0.02em]
            text-[#172033]
          ">
            {title}
          </h2>


          {description && (
            <p className="
              mt-1
              text-[12px]
              font-medium
              leading-5
              text-[#475569]
              sm:text-[13px]
            ">
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
    <div>

      <label className="
        mb-2
        block
        text-[12px]
        font-bold
        leading-5
        text-[#1E293B]
      ">

        {label}

        {required && (
          <span className="
            ml-1
            text-red-600
          ">
            *
          </span>
        )}

      </label>


      <div className="relative">

        {Icon && (
          <Icon
            size={16}
            className="
              absolute
              left-3.5
              top-1/2
              -translate-y-1/2
              text-[#64748B]
            "
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
            w-full
            rounded-xl
            border
            border-[#D9DDE7]
            bg-[#F5F6FA]
            px-3.5
            py-3
            text-[13px]
            font-semibold
            leading-5
            text-[#172033]
            outline-none
            transition-all
            duration-200
            placeholder:text-[#64748B]
            focus:border-[#4338CA]
            focus:bg-white
            focus:ring-2
            focus:ring-[#4338CA]/10
            ${Icon ? "pl-10" : ""}
          `}
        />

      </div>

    </div>
  );
};


// ============================================================
// QUOTA
// ============================================================

const Quota = ({
  value,
  label,
}) => {
  const displayValue =
    Number(value || 0) === 0
      ? "Unlimited"
      : value;

  return (
    <div className="
      min-w-0
      text-center
    ">

      <p className="
        truncate
        text-[17px]
        font-extrabold
        leading-5
        text-[#3730A3]
      ">
        {displayValue}
      </p>


      <p className="
        mt-1
        text-[10px]
        font-bold
        leading-4
        text-[#475569]
      ">
        {label}
      </p>

    </div>
  );
};


// ============================================================
// FEATURE ROW
// ============================================================

const FeatureRow = ({
  label,
  enabled,
}) => {
  return (
    <div className="
      flex
      items-center
      gap-3
    ">

      {enabled ? (
        <span className="
          flex
          h-6
          w-6
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-[#DDF7EC]
          text-[#087A58]
        ">

          <CheckCircle2
            size={14}
            strokeWidth={2.7}
          />

        </span>
      ) : (
        <span className="
          flex
          h-6
          w-6
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-[#F0F1F4]
          text-[#A0A6B4]
        ">
          ×
        </span>
      )}


      <span
        className={`
          text-[12px]
          font-semibold
          leading-5
          ${
            enabled
              ? "text-[#334155]"
              : "text-[#94A3B8] line-through"
          }
        `}
      >
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

const BackToPlansButton = ({
  navigate,
  fullWidth = false,
}) => {
  return (
    <button
      type="button"
      onClick={() =>
        navigate(
          "/saas-user/choose-plan"
        )
      }
      className={`
        inline-flex
        items-center
        justify-center
        gap-2
        rounded-xl
        border
        border-[#D9DDE7]
        bg-white
        px-5
        py-3
        text-[13px]
        font-extrabold
        text-[#334155]
        transition-all
        duration-200
        hover:border-[#4338CA]
        hover:bg-[#F5F3FF]
        hover:text-[#4338CA]
        active:scale-[0.98]
        ${
          fullWidth
            ? "w-full"
            : "w-full sm:w-auto"
        }
      `}
    >

      <ArrowLeft size={16} />

      Back to Plans

    </button>
  );
};


// ============================================================
// SUBMIT BUTTON
// ============================================================

const SubmitButton = ({
  loading,
}) => {
  return (
    <button
      type="submit"
      disabled={loading}
      className="
        flex
        w-full
        items-center
        justify-center
        gap-2
        rounded-xl
        bg-[#4338CA]
        px-5
        py-3.5
        text-[13px]
        font-extrabold
        text-white
        transition-all
        duration-200
        hover:bg-[#3730A3]
        active:scale-[0.99]
        disabled:cursor-not-allowed
        disabled:opacity-60
      "
    >

      {loading ? (
        <>
          <Loader2
            size={17}
            className="animate-spin"
          />

          Submitting...
        </>
      ) : (
        <>
          Continue to Checkout

          <ArrowRight size={17} />
        </>
      )}

    </button>
  );
};


export default SaaSUserRegistration;