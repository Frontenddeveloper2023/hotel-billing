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



  const HoverText = ({ children, className = "" }) => {
  return (
    <span className={className}>
      {children.split("").map((char, index) => (
        <span
          key={index}
          className="
            inline-block
            transition-all
            duration-300
            ease-out
            hover:-translate-y-2
            hover:scale-110
            hover:text-[#0B2447]
            hover:drop-shadow-[0_0_10px_rgba(200,255,61,0.55)]
          "
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
};


  return (
    <div className="min-h-screen bg-white text-[#111111]">
      {/* =========================================================
          HEADER
      ========================================================= */}
      <header className="absolute left-0 right-0 top-0 z-50">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 sm:px-8 lg:px-10">
          {/* LOGO */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B2447] text-white">
              <Hotel size={18} strokeWidth={2.2} />
            </div>

            <span className="text-[16px] font-bold tracking-[-0.025em] text-white sm:text-[17px]">
              StayPilot
            </span>
          </div>
          

          {/* REGISTER BUTTON */}
         <div className="flex items-center gap-3">
 <button
  type="button"
  onClick={() => navigate("/saas-user/application-status")}
  className="
    inline-flex
    items-center
    justify-center
    rounded-lg
    bg-[#EAF3FF]
    px-5
    py-2.5
    text-sm
    font-bold
    text-[#1877F2]
    cursor-pointer
    border
    border-[#CFE2FF]
    transition-all
    duration-200
    hover:-translate-y-0.5
    hover:bg-[#DCEBFF]
    hover:border-[#B9D5FF]
    hover:shadow-[0_6px_16px_rgba(24,119,242,0.12)]
  "
>
  View Application Status
</button>

  <button
    type="button"
    onClick={handleRegisterHotel}
    className="
      inline-flex
      items-center
      justify-center
      rounded-lg
      bg-[#0B2447]
      px-5
      py-2.5
      cursor-pointer
      text-sm
      font-bold
      text-white
      transition-all
      duration-200
      hover:-translate-y-0.5
      hover:bg-[#12345F]
      hover:shadow-md
    "
  >
    Register Your Hotel
  </button>
</div>


       
             
           
        </div>
      </header>

      {/* =========================================================
          HERO
      ========================================================= */}
      <main>
        <section
          id="platform"
          className="relative min-h-screen overflow-hidden"
        >
          {/* HOTEL BACKGROUND IMAGE */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=85')",
            }}
          />

          {/* DARK OVERLAY */}
          <div className="absolute inset-0 bg-black/6" />

          {/* GRADIENT OVERLAY */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/55 to-black/75" />

          {/* =====================================================
              HERO CONTENT
          ===================================================== */}
          <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1240px] flex-col items-center px-5 pb-12 pt-[105px] sm:px-8 sm:pt-[115px] lg:px-10 lg:pt-[125px]">
            {/* SMALL LABEL */}
           

            {/* MAIN TITLE */}
           <h1
  className="
    max-w-[900px]
    cursor-pointer
    text-center
    text-[34px]
    font-bold
    leading-[1.04]
    tracking-[-0.055em]
    text-white
    sm:text-[48px]
    lg:text-[60px]
  "
>
  <HoverText>
    Register Your Hotel
  </HoverText>

  <br />

  <HoverText className="text-white/75">
    To Handle Reservations And Billing in One Place
  </HoverText>
</h1>

            {/* DESCRIPTION */}
            <p
              className="
                mt-5
                max-w-[680px]
                text-center
                text-[13px]
                leading-6
                text-white/80
                sm:text-[15px]
              "
            >
              Set up your hotel quickly and manage rooms,
              properties, reception, billing and guest services from one
              platform.
            </p>

            {/* =====================================================
                REGISTRATION PANEL
            ===================================================== */}
            <div
              id="registration"
              className="
                mt-9
                w-full
                max-w-[1100px]
                rounded-[20px]
                border
                border-white/20
                bg-[#F5F5F5]
                p-3
                shadow-[0_25px_70px_rgba(0,0,0,0.30)]
                sm:p-4
              "
            >
              {/* PANEL HEADER */}
              <div className="flex items-center justify-between border-b border-[#DDDDDD] px-3 pb-4 sm:px-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#777777]">
                    Hotel Registration
                  </p>

                  <h2 className="mt-1 text-[17px] font-bold tracking-[-0.02em] text-[#171717] sm:text-[19px]">
                    Complete your hotel setup
                  </h2>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <span className="h-2 w-2 rounded-full bg-[#0B2447]" />

                  <span className="text-[10px] font-semibold text-[#666666]">
                    5 Steps
                  </span>
                </div>
              </div>

              {/* ===================================================
                  STEPS
              =================================================== */}
            <div className="px-0 py-6 sm:px-2 sm:py-7">
  <div className="relative">
    {/* FLOW CONNECTOR - DESKTOP */}
    <div className="pointer-events-none absolute left-[10%] right-[10%] top-[31px] hidden h-[2px] bg-[#DCDCDC] lg:block" />

    <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3">
      {registrationSteps.map((step, index) => {
        const StepIcon = step.icon;
        const isFirst = index === 0;

        return (
          <div
            key={step.number}
            className={`
              group
              relative
              flex
              min-h-[112px]
              items-center
              gap-3
              rounded-[14px]
              border
              bg-white
              px-4
              py-4
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:shadow-[0_6px_18px_rgba(0,0,0,0.08)]
              ${
                isFirst
                  ? "border-[#12345F] shadow-[0_4px_14px_rgba(184,245,47,0.18)]"
                  : "border-[#DCDCDC] hover:border-[#BDBDBD]"
              }
            `}
          >
            {/* STEP NUMBER / ICON */}
            <div
              className={`
                relative
                z-10
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-full
                border-2
                font-bold
                ${
                  isFirst
                    ? "border-[#0B2447] bg-[#0B2447] text-orange-500"
                    : "border-[#E1E1E1] bg-[#F3F3F3] text-orange-500"
                }
              `}
            >
              {isFirst ? (
                <StepIcon
                  size={19}
                  strokeWidth={2.8}
                />
              ) : (
                <span className="text-[12px] text-orange-500">
                  {step.number}
                </span>
              )}
            </div>

            {/* TEXT */}
            <div className="min-w-0">
              <p
                className={`
                  text-[15px]
                  font-bold
                  leading-5
                  tracking-[-0.01em]
                  ${
                    isFirst
                      ? "text-[#111111]"
                      : "text-[#171717]"
                  }
                `}
              >
                {step.title}
              </p>

              <p className="mt-1.5 text-[12px] font-medium leading-5 text-[#555555]">
                {step.subtitle}
              </p>
            </div>

            {/* ACTIVE INDICATOR */}
            {isFirst && (
              <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[#0B2447]" />
            )}
          </div>
        );
      })}
    </div>
  </div>
</div>

              {/* ===================================================
                  FLOW DESCRIPTION
              =================================================== */}
              <div className="mx-0 rounded-[12px] border border-[#E5E5E5] bg-white px-4 py-4 sm:mx-2 sm:px-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-[#111111]">
                      Simple hotel onboarding
                    </p>

                    <p className="mt-1 max-w-[700px] text-[10px] leading-4 text-[#707070] sm:text-[11px]">
                      Choose your plan, enter your hotel details, review your
                      order, complete payment and track your application
                      status.
                    </p>
                  </div>

                  <div className="hidden shrink-0 text-[10px] font-semibold text-[#777777] xl:block">
                    Choose Plan → Hotel Details → Checkout → Payment →
                    Application Status
                  </div>
                </div>
              </div>

              {/* ===================================================
                  MAIN CTA
              =================================================== */}
              <div className="flex justify-center px-1 py-5 sm:px-3 sm:py-6">
                <button
                  type="button"
                  onClick={handleRegisterHotel}
                  className="
                    group
                    flex
                    min-h-[48px]
                    w-full
                    max-w-[280px]
                    cursor-pointer
                    items-center
                    justify-center
                    gap-3
                    rounded-xl
                    bg-[#0B2447]
                    px-7
                    py-3
                    text-[13px]
                    font-bold
                    text-white
                    transition
                    hover:bg-[#111111]
                    sm:w-auto
                    sm:min-w-[260px]
                  "
                >
                  Start Hotel Registration

                  <span
                    className="
                      flex
                      h-7
                      w-7
                      items-center
                      justify-center
                      rounded-full
                      bg-[#0B2447]
                      text-[#111111]
                      transition
                      group-hover:bg-white
                    "
                  >
                    <ArrowRight size={15} strokeWidth={2.5} />
                  </span>
                </button>
              </div>
            </div>

            {/* =====================================================
                BOTTOM FEATURES
            ===================================================== */}
            <div className="mt-6 flex max-w-[900px] flex-wrap items-center justify-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/75">
                <Check size={12} className="text-[#0B2447]" />
                Flexible subscription plans
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/75">
                <Check size={12} className="text-[#0B2447]" />
                Secure payment
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/75">
                <Check size={12} className="text-[#0B2447]" />
                Application tracking
              </div>
            </div>
          
          </div>
        </section>
      </main>
    </div>
  );
};

export default SaaSHome;