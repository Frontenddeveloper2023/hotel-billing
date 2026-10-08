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
              hover:-translate-y-1
              hover:scale-110
              hover:text-[#0B2447]
              hover:drop-shadow-[0_0_10px_rgba(200,255,61,0.55)]
              sm:hover:-translate-y-2
            "
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </span>
    );
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white text-[#111111]">
      {/* =========================================================
          HEADER
      ========================================================= */}

      <header className="absolute left-0 right-0 top-0 z-50">
        <div
          className="
            mx-auto
            flex
            h-[64px]
            w-full
            max-w-[1240px]
            items-center
            justify-between
            gap-3
            px-3
            sm:h-[72px]
            sm:px-6
            md:px-8
            lg:px-10
          "
        >
          {/* LOGO */}
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <div
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-[#0B2447]
                text-white
                sm:h-9
                sm:w-9
                sm:rounded-xl
              "
            >
              <Hotel
                size={16}
                strokeWidth={2.2}
                className="sm:h-[18px] sm:w-[18px]"
              />
            </div>

            <span
              className="
                truncate
                text-[14px]
                font-bold
                tracking-[-0.025em]
                text-white
                sm:text-[16px]
                md:text-[17px]
              "
            >
              StayPilot
            </span>
          </div>

          {/* HEADER BUTTONS */}
          <div
            className="
              flex
              min-w-0
              items-center
              gap-1.5
              sm:gap-2
              md:gap-3
            "
          >
            <button
              type="button"
              onClick={() =>
                navigate("/saas-user/application-status")
              }
              className="
                inline-flex
                min-h-[36px]
                max-w-[170px]
                cursor-pointer
                items-center
                justify-center
                rounded-lg
                border
                border-[#CFE2FF]
                bg-[#EAF3FF]
                px-2.5
                py-2
                text-[10px]
                font-bold
                leading-tight
                text-[#1877F2]
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:border-[#B9D5FF]
                hover:bg-[#DCEBFF]
                hover:shadow-[0_6px_16px_rgba(24,119,242,0.12)]
                sm:max-w-none
                sm:px-4
                sm:text-xs
                md:px-5
                md:py-2.5
                md:text-sm
              "
            >
              <span className="hidden xs:inline">
                View Application Status
              </span>

              <span className="xs:hidden">
                Application Status
              </span>
            </button>

            <button
              type="button"
              onClick={handleRegisterHotel}
              className="
                inline-flex
                min-h-[36px]
                max-w-[145px]
                cursor-pointer
                items-center
                justify-center
                rounded-lg
                bg-[#0B2447]
                px-2.5
                py-2
                text-[10px]
                font-bold
                leading-tight
                text-white
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:bg-[#12345F]
                hover:shadow-md
                sm:max-w-none
                sm:px-4
                sm:text-xs
                md:px-5
                md:py-2.5
                md:text-sm
              "
            >
              <span className="hidden sm:inline">
                Register Your Hotel
              </span>

              <span className="sm:hidden">
                Register Hotel
              </span>
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
          className="
            relative
            min-h-screen
            w-full
            overflow-hidden
          "
        >
          {/* HOTEL BACKGROUND IMAGE */}
          <div
            className="
              absolute
              inset-0
              bg-cover
              bg-center
              bg-no-repeat
            "
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=85')",
            }}
          />

          {/* DARK OVERLAY */}
          <div className="absolute inset-0 bg-black/10" />

          {/* GRADIENT OVERLAY */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/55 to-black/75" />

          {/* =====================================================
              HERO CONTENT
          ===================================================== */}

          <div
            className="
              relative
              z-10
              mx-auto
              flex
              min-h-screen
              w-full
              max-w-[1240px]
              flex-col
              items-center
              px-3
              pb-8
              pt-[88px]
              sm:px-6
              sm:pb-10
              sm:pt-[105px]
              md:px-8
              md:pt-[115px]
              lg:px-10
              lg:pb-12
              lg:pt-[125px]
            "
          >
            {/* MAIN TITLE */}
            <h1
              className="
                w-full
                max-w-[900px]
                cursor-pointer
                text-center
                text-[30px]
                font-bold
                leading-[1.08]
                tracking-[-0.055em]
                text-white
                sm:text-[40px]
                md:text-[48px]
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
                mt-4
                w-full
                max-w-[680px]
                px-2
                text-center
                text-[12px]
                leading-5
                text-white/80
                sm:mt-5
                sm:px-0
                sm:text-[14px]
                sm:leading-6
                md:text-[15px]
              "
            >
              Set up your hotel quickly and manage rooms,
              properties, reception, billing and guest services
              from one platform.
            </p>

            {/* =====================================================
                REGISTRATION PANEL
            ===================================================== */}

            <div
              id="registration"
              className="
                mt-7
                w-full
                max-w-[1100px]
                overflow-hidden
                rounded-2xl
                border
                border-white/20
                bg-[#F5F5F5]
                p-2.5
                shadow-[0_25px_70px_rgba(0,0,0,0.30)]
                sm:mt-9
                sm:rounded-[20px]
                sm:p-3
                md:p-4
              "
            >
              {/* PANEL HEADER */}
              <div
                className="
                  flex
                  min-w-0
                  items-center
                  justify-between
                  gap-3
                  border-b
                  border-[#DDDDDD]
                  px-2
                  pb-3
                  sm:px-4
                  sm:pb-4
                  md:px-5
                "
              >
                <div className="min-w-0">
                  <p
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.12em]
                      text-[#777777]
                      sm:text-[10px]
                    "
                  >
                    Hotel Registration
                  </p>

                  <h2
                    className="
                      mt-1
                      truncate
                      text-[15px]
                      font-bold
                      tracking-[-0.02em]
                      text-[#171717]
                      sm:text-[17px]
                      md:text-[19px]
                    "
                  >
                    Complete your hotel setup
                  </h2>
                </div>

                <div
                  className="
                    hidden
                    shrink-0
                    items-center
                    gap-2
                    sm:flex
                  "
                >
                  <span className="h-2 w-2 rounded-full bg-[#0B2447]" />

                  <span className="text-[10px] font-semibold text-[#666666]">
                    5 Steps
                  </span>
                </div>
              </div>

              {/* ===================================================
                  STEPS
              =================================================== */}

              <div className="px-0 py-4 sm:px-2 sm:py-6 md:py-7">
                <div className="relative">
                  {/* FLOW CONNECTOR - DESKTOP */}
                  <div
                    className="
                      pointer-events-none
                      absolute
                      left-[10%]
                      right-[10%]
                      top-[31px]
                      hidden
                      h-[2px]
                      bg-[#DCDCDC]
                      lg:block
                    "
                  />

                  <div
                    className="
                      relative
                      grid
                      grid-cols-1
                      gap-2.5
                      sm:grid-cols-2
                      sm:gap-3
                      lg:grid-cols-5
                    "
                  >
                    {registrationSteps.map(
                      (step, index) => {
                        const StepIcon = step.icon;
                        const isFirst = index === 0;

                        return (
                          <div
                            key={step.number}
                            className={`
                              group
                              relative
                              flex
                              min-h-[96px]
                              min-w-0
                              items-center
                              gap-3
                              rounded-xl
                              border
                              bg-white
                              px-3
                              py-3
                              transition-all
                              duration-200
                              hover:-translate-y-0.5
                              hover:shadow-[0_6px_18px_rgba(0,0,0,0.08)]
                              sm:min-h-[112px]
                              sm:rounded-[14px]
                              sm:px-4
                              sm:py-4
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
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                border-2
                                font-bold
                                sm:h-11
                                sm:w-11
                                ${
                                  isFirst
                                    ? "border-[#0B2447] bg-[#0B2447] text-orange-500"
                                    : "border-[#E1E1E1] bg-[#F3F3F3] text-orange-500"
                                }
                              `}
                            >
                              {isFirst ? (
                                <StepIcon
                                  size={17}
                                  strokeWidth={2.8}
                                  className="sm:h-[19px] sm:w-[19px]"
                                />
                              ) : (
                                <span className="text-[11px] text-orange-500 sm:text-[12px]">
                                  {step.number}
                                </span>
                              )}
                            </div>

                            {/* TEXT */}
                            <div className="min-w-0 flex-1">
                              <p
                                className={`
                                  break-words
                                  text-[13px]
                                  font-bold
                                  leading-5
                                  tracking-[-0.01em]
                                  sm:text-[15px]
                                  ${
                                    isFirst
                                      ? "text-[#111111]"
                                      : "text-[#171717]"
                                  }
                                `}
                              >
                                {step.title}
                              </p>

                              <p
                                className="
                                  mt-1
                                  text-[10px]
                                  font-medium
                                  leading-4
                                  text-[#555555]
                                  sm:mt-1.5
                                  sm:text-[12px]
                                  sm:leading-5
                                "
                              >
                                {step.subtitle}
                              </p>
                            </div>

                            {/* ACTIVE INDICATOR */}
                            {isFirst && (
                              <span
                                className="
                                  absolute
                                  right-2.5
                                  top-2.5
                                  h-2
                                  w-2
                                  rounded-full
                                  bg-[#0B2447]
                                  sm:right-3
                                  sm:top-3
                                  sm:h-2.5
                                  sm:w-2.5
                                "
                              />
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </div>

              {/* ===================================================
                  FLOW DESCRIPTION
              =================================================== */}

              <div
                className="
                  mx-0
                  rounded-xl
                  border
                  border-[#E5E5E5]
                  bg-white
                  px-3
                  py-3
                  sm:mx-2
                  sm:px-5
                  sm:py-4
                "
              >
                <div
                  className="
                    flex
                    flex-col
                    gap-3
                    lg:flex-row
                    lg:items-center
                    lg:justify-between
                  "
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[#111111] sm:text-[11px]">
                      Simple hotel onboarding
                    </p>

                    <p
                      className="
                        mt-1
                        max-w-[700px]
                        text-[9px]
                        leading-4
                        text-[#707070]
                        sm:text-[11px]
                      "
                    >
                      Choose your plan, enter your hotel
                      details, review your order, complete
                      payment and track your application
                      status.
                    </p>
                  </div>

                  <div
                    className="
                      hidden
                      shrink-0
                      text-[10px]
                      font-semibold
                      text-[#777777]
                      xl:block
                    "
                  >
                    Choose Plan → Hotel Details → Checkout →
                    Payment → Application Status
                  </div>
                </div>
              </div>

              {/* ===================================================
                  MAIN CTA
              =================================================== */}

              <div
                className="
                  flex
                  justify-center
                  px-1
                  py-4
                  sm:px-3
                  sm:py-6
                "
              >
                <button
                  type="button"
                  onClick={handleRegisterHotel}
                  className="
                    group
                    flex
                    min-h-[46px]
                    w-full
                    max-w-[300px]
                    cursor-pointer
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#0B2447]
                    px-5
                    py-3
                    text-[12px]
                    font-bold
                    text-white
                    transition
                    hover:bg-[#111111]
                    sm:min-h-[48px]
                    sm:max-w-[280px]
                    sm:gap-3
                    sm:px-7
                    sm:text-[13px]
                  "
                >
                  <span className="truncate">
                    Start Hotel Registration
                  </span>

                  <span
                    className="
                      flex
                      h-7
                      w-7
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-white
                      text-[#111111]
                      transition
                      group-hover:bg-white
                    "
                  >
                    <ArrowRight
                      size={14}
                      strokeWidth={2.5}
                    />
                  </span>
                </button>
              </div>
            </div>

            {/* =====================================================
                BOTTOM FEATURES
            ===================================================== */}

            <div
              className="
                mt-5
                flex
                w-full
                max-w-[900px]
                flex-wrap
                items-center
                justify-center
                gap-x-4
                gap-y-2.5
                px-2
                sm:mt-6
                sm:gap-x-6
                sm:gap-y-3
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-1
                  text-[9px]
                  font-medium
                  text-white/75
                  sm:gap-1.5
                  sm:text-[10px]
                "
              >
                <Check
                  size={11}
                  className="shrink-0 text-[#0B2447]"
                />
                Flexible subscription plans
              </div>

              <div
                className="
                  flex
                  items-center
                  gap-1
                  text-[9px]
                  font-medium
                  text-white/75
                  sm:gap-1.5
                  sm:text-[10px]
                "
              >
                <Check
                  size={11}
                  className="shrink-0 text-[#0B2447]"
                />
                Secure payment
              </div>

              <div
                className="
                  flex
                  items-center
                  gap-1
                  text-[9px]
                  font-medium
                  text-white/75
                  sm:gap-1.5
                  sm:text-[10px]
                "
              >
                <Check
                  size={11}
                  className="shrink-0 text-[#0B2447]"
                />
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