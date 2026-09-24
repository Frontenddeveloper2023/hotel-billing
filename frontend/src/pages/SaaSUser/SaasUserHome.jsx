import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Hotel,
  Check,
  Building2,
  CreditCard,
  ShieldCheck,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";

const registrationSteps = [
  {
    number: "01",
    title: "Choose Plan",
    subtitle: "Select your subscription plan",
    icon: Check,
  },
  {
    number: "02",
    title: "Hotel Details",
    subtitle: "Add properties & rooms",
    icon: Building2,
  },
  {
    number: "03",
    title: "Checkout",
    subtitle: "Review your order",
    icon: CreditCard,
  },
  {
    number: "04",
    title: "Payment",
    subtitle: "Complete escrow payment",
    icon: ShieldCheck,
  },
  {
    number: "05",
    title: "Application Status",
    subtitle: "Track your registration",
    icon: ClipboardCheck,
  },
];

const SaaSHome = () => {
  const navigate = useNavigate();

  const handleRegisterHotel = () => {
    navigate("/saas-user/choose-plan");
  };

  return (
    <div className="min-h-screen bg-white">

      {/* =========================================================
          HEADER
      ========================================================= */}

      <header className="absolute left-0 right-0 top-0 z-50">

        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12">

          {/* LOGO */}

          <div className="flex items-center gap-2.5">

            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4338CA] text-white">

              <Hotel size={19} />

            </div>

            <span className="text-[17px] font-bold tracking-[-0.02em] text-white">
              StayPilot
            </span>

          </div>


          {/* NAVIGATION */}
{/* 
          <nav className="hidden items-center gap-8 md:flex">

            <a
              href="#platform"
              className="text-sm font-medium text-white/90 transition hover:text-white"
            >
              Platform
            </a>

            <a
              href="#registration"
              className="text-sm font-medium text-white/90 transition hover:text-white"
            >
              Hotel Registration
            </a>

            <a
              href="#how-it-works"
              className="text-sm font-medium text-white/90 transition hover:text-white"
            >
              How It Works
            </a>

          </nav> */}


          {/* REGISTER BUTTON */}

          <button
            type="button"
            onClick={handleRegisterHotel}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#4338CA] transition hover:bg-[#F3F2FF]"
          >
            Register Your Hotel
          </button>

        </div>

      </header>


      {/* =========================================================
          HERO
      ========================================================= */}

      <section
        id="platform"
        className="relative min-h-screen overflow-hidden bg-[#172554]"
      >

        {/* HOTEL BACKGROUND */}

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=85')",
          }}
        />

        {/* DARK OVERLAY */}

        <div className="absolute inset-0 bg-gradient-to-b from-[#07152F]/65 via-[#10264B]/50 to-[#07152F]/75" />

        {/* EXTRA BLUE/PURPLE TINT */}

        <div className="absolute inset-0 bg-[#172554]/20" />


        {/* =======================================================
            HERO CONTENT
        ======================================================= */}

        <div className="relative z-10 mx-auto flex min-h-screen max-w-[1400px] flex-col items-center px-5 pb-12 pt-[120px] sm:px-8 lg:px-12">

          {/* SMALL LABEL */}

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-md">

            <span className="h-2 w-2 rounded-full bg-emerald-400" />

            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              Hospitality Management Platform
            </span>

          </div>


          {/* MAIN TITLE */}

          <h1 className="max-w-[900px] text-center text-[30px] font-bold leading-[1.02] tracking-[-0.045em] text-white sm:text-[48px] lg:text-[62px]">

            Register Your Hotel
            <br />

            <span className="text-[#E8E7FF]">
              To Handle Reservations And Billing in One Place
            </span>

          </h1>


          {/* DESCRIPTION */}

          <p className="mt-5 max-w-[650px] text-center text-sm leading-6 text-white/85 sm:text-base">

            Set up your hotel on HospitalityOS and manage
            rooms, properties, reception, billing and guest
            services from one platform.

          </p>


          {/* =======================================================
              WHITE REGISTRATION PANEL
          ======================================================= */}

          <div
            id="registration"
            className="mt-9 w-full max-w-[1040px] rounded-[22px] bg-white p-3 shadow-[0_25px_70px_rgba(0,0,0,0.25)] sm:p-4"
          >

            {/* PANEL HEADER */}

            <div className="flex items-center justify-between border-b border-[#ECEAF3] px-3 pb-3 sm:px-5">

              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#69728A]">
                  Hotel Registration
                </p>

                <h2 className="mt-1 text-base font-bold text-[#101936] sm:text-lg">
                  Complete your hotel setup
                </h2>

              </div>


              <div className="hidden items-center gap-2 sm:flex">

                <span className="h-2 w-2 rounded-full bg-[#087A58]" />

                <span className="text-[10px] font-semibold text-[#59647C]">
                  5 Steps
                </span>

              </div>

            </div>


            {/* =====================================================
                STEPS
            ===================================================== */}

            <div className="px-2 py-5 sm:px-5">

              <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-0">

                {registrationSteps.map((step, index) => {

                  const StepIcon = step.icon;

                  const isFirst = index === 0;

                  const isLast =
                    index === registrationSteps.length - 1;

                  return (
                    <React.Fragment key={step.number}>

                      {/* STEP */}

                      <div className="flex flex-1 items-center">

                        <div
                          className={`
                            flex
                            w-full
                            items-center
                            gap-3
                            rounded-xl
                            border
                            px-3
                            py-3
                            transition
                            ${
                              isFirst
                                ? "border-[#D9D5FF] bg-[#F5F3FF]"
                                : "border-[#ECEAF3] bg-white"
                            }
                          `}
                        >

                          {/* ICON */}

                          <div
                            className={`
                              flex
                              h-9
                              w-9
                              shrink-0
                              items-center
                              justify-center
                              rounded-full
                              ${
                                isFirst
                                  ? "bg-[#4338CA] text-white"
                                  : "bg-[#EEF0FF] text-[#4338CA]"
                              }
                            `}
                          >

                            {isFirst ? (
                              <StepIcon
                                size={16}
                                strokeWidth={2.5}
                              />
                            ) : (
                              <span className="text-[10px] font-bold">
                                {step.number}
                              </span>
                            )}

                          </div>


                          {/* TEXT */}

                          <div className="min-w-0">

                            <p
                              className={`
                                text-[13px]
                                font-bold
                                leading-4
                                ${
                                  isFirst
                                    ? "text-[#4338CA]"
                                    : "text-[#111827]"
                                }
                              `}
                            >
                              {step.title}
                            </p>

                            <p className="mt-0.5 text-[8px] leading-3 text-[#69728A] sm:text-[9px]">
                              {step.subtitle}
                            </p>

                          </div>

                        </div>

                      </div>


                      {/* CONNECTOR */}

                      {!isLast && (
                        <div className="hidden items-center px-1 md:flex">

                          <div className="h-px w-5 bg-[#D9DBE8] lg:w-7" />

                        </div>
                      )}

                    </React.Fragment>
                  );
                })}

              </div>

            </div>


            {/* =====================================================
                FLOW DESCRIPTION
            ===================================================== */}

            <div className="mx-2 rounded-xl bg-[#F7F6FF] px-4 py-3 sm:mx-5">

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-[10px] font-bold text-[#4338CA]">
                    Simple hotel onboarding
                  </p>

                  <p className="mt-0.5 text-[9px] leading-4 text-[#59647C]">
                    Choose your plan, enter your hotel details,
                    review your order, complete payment and track
                    your application status.
                  </p>

                </div>

                <div className="hidden shrink-0 text-[9px] font-semibold text-[#69728A] lg:block">
                  Choose Plan → Hotel Details → Checkout → Payment → Application Status
                </div>

              </div>

            </div>


            {/* =====================================================
                MAIN CTA
            ===================================================== */}

            <div className="flex justify-center px-2 py-4 sm:px-5 sm:py-5">

              <button
                type="button"
                onClick={handleRegisterHotel}
                className="group           cursor-pointer
 flex min-w-[230px] items-center justify-center gap-3 rounded-full bg-[#111827] px-7 py-3 text-sm font-bold text-white transition hover:bg-[#4338CA]"
              >

                Start Hotel Registration

                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/20">

                  <ArrowRight size={14} />

                </span>

              </button>

            </div>

          </div>


          {/* SMALL BOTTOM TEXT */}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">

            <div className="flex items-center gap-1.5 text-[9px] font-medium text-white/75">

              <Check
                size={12}
                className="text-emerald-400"
              />

              Flexible subscription plans

            </div>

            <div className="flex items-center gap-1.5 text-[9px] font-medium text-white/75">

              <Check
                size={12}
                className="text-emerald-400"
              />

              Secure payment

            </div>

            <div className="flex items-center gap-1.5 text-[9px] font-medium text-white/75">

              <Check
                size={12}
                className="text-emerald-400"
              />

              Application tracking

            </div>

          </div>

        </div>

      </section>


  

    </div>
  );
};

export default SaaSHome;