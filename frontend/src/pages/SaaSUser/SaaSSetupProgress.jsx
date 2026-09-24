import React from "react";
import {
  Check,
  Building2,
  CreditCard,
  ShieldCheck,
  ClipboardCheck,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Choose Plan",
    subtitle: "Active Step",
    icon: Check,
  },
  {
    number: "02",
    title: "Hotel Details",
    subtitle: "Properties & Rooms",
    icon: Building2,
  },
  {
    number: "03",
    title: "Checkout",
    subtitle: "Review Order",
    icon: CreditCard,
  },
  {
    number: "04",
    title: "Payment",
    subtitle: "Escrow Guarantee",
    icon: ShieldCheck,
  },
  {
    number: "05",
    title: "Application Status",
    subtitle: "Provisioning",
    icon: ClipboardCheck,
  },
];

const SaaSSetupProgress = ({ activeStep = 1 }) => {
  return (
    <div className="w-full bg-[#F4F3FF] border-b border-[#E7E5F2]">

      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-12">

        <div className="flex items-center w-full h-[58px] sm:h-[64px]">

          {steps.map((step, index) => {

            const isActive =
              activeStep === index + 1;

            const isCompleted =
              activeStep > index + 1;

            const isLast =
              index === steps.length - 1;

            /*
              Connector:
              completed path = green
              active path = purple
              upcoming = light gray
            */
            const connectorCompleted =
              activeStep > index + 2;

            const connectorActive =
              activeStep === index + 2;

            return (
              <React.Fragment key={step.number}>

                {/* ==============================
                    STEP
                ============================== */}

                <div className="flex items-center shrink-0">

                  {/* CIRCLE */}

                  <div
                    className={`
                      flex
                      items-center
                      justify-center
                      w-7
                      h-7
                      rounded-full
                      shrink-0
                      text-[9px]
                      font-bold
                      ${
                        isCompleted
                          ? "bg-[#087A58] text-white"
                          : isActive
                          ? "bg-[#4338CA] text-white"
                          : "bg-[#E9EBF7] text-[#8B91A1]"
                      }
                    `}
                  >
                    {isCompleted ? (
                      <Check
                        size={13}
                        strokeWidth={3}
                      />
                    ) : (
                      step.number
                    )}
                  </div>

                  {/* TEXT */}

                  <div className="ml-2">

                    {/* STEP LABEL */}

                    <p
                      className={`
                        text-[7px]
                        sm:text-[8px]
                        font-bold
                        uppercase
                        tracking-[0.05em]
                        leading-[9px]
                        whitespace-nowrap
                        ${
                          isCompleted
                            ? "text-[#087A58]"
                            : isActive
                            ? "text-[#4338CA]"
                            : "text-[#8B91A1]"
                        }
                      `}
                    >
                      {isActive
                        ? "ACTIVE STEP"
                        : `STEP ${step.number}`}
                    </p>

                    {/* TITLE */}

                    <p
                      className={`
                        text-[9px]
                        sm:text-[10px]
                        font-semibold
                        leading-[12px]
                        whitespace-nowrap
                        ${
                          isCompleted || isActive
                            ? "text-[#111827]"
                            : "text-[#7D8392]"
                        }
                      `}
                    >
                      {step.title}
                    </p>

                    {/* SUBTITLE */}

                    {isActive ? (
                      <div className="flex items-center gap-1">

                        <span className="w-1 h-1 rounded-full bg-[#087A58]" />

                        <span className="text-[7px] sm:text-[8px] font-medium leading-[9px] text-[#087A58] whitespace-nowrap">
                          Active Step
                        </span>

                      </div>
                    ) : (
                      <p
                        className={`
                          text-[7px]
                          sm:text-[8px]
                          leading-[9px]
                          whitespace-nowrap
                          ${
                            isCompleted
                              ? "text-[#69728A]"
                              : "text-[#969BAB]"
                          }
                        `}
                      >
                        {step.subtitle}
                      </p>
                    )}

                  </div>

                </div>

                {/* ==============================
                    CONNECTOR
                ============================== */}

                {!isLast && (
                  <div className="flex-1 mx-3 sm:mx-5 lg:mx-8">

                    <div
                      className={`
                        h-[2px]
                        w-full
                        rounded-full
                        ${
                          connectorCompleted
                            ? "bg-[#087A58]"
                            : connectorActive
                            ? "bg-[#4338CA]"
                            : "bg-[#D9DBEA]"
                        }
                      `}
                    />

                  </div>
                )}

              </React.Fragment>
            );
          })}

        </div>

      </div>

    </div>
  );
};

export default SaaSSetupProgress;