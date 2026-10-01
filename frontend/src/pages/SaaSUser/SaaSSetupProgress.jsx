import React from "react";
import {
  Check,
  Building2,
  CreditCard,
  ShieldCheck,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";

const defaultSteps = [
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

const upgradeSteps = [
  {
    number: "01",
    title: "Choose Plan",
    subtitle: "Select Higher Tier",
    icon: Check,
  },
  {
    number: "02",
    title: "Hotel Account",
    subtitle: "Verified & Linked",
    icon: Building2,
  },
  {
    number: "03",
    title: "Checkout & Pay",
    subtitle: "Review & Confirm",
    icon: CreditCard,
  },
  {
    number: "04",
    title: "Instant Activation",
    subtitle: "No Approval Needed",
    icon: ShieldCheck,
  },
];

// ============================================================
// Compact breadcrumb-style progress indicator:
// (✓) Step  >  (●) Step  >  (3) Step
// Mirrors a lightweight checkout-flow breadcrumb: a filled green
// check for completed steps, a filled blue circle for the active
// step, and a plain numbered outline circle for upcoming steps,
// each joined by a light chevron separator.
// ============================================================

const SaaSSetupProgress = ({ activeStep = 1, isUpgrade = false }) => {
  const steps = isUpgrade ? upgradeSteps : defaultSteps;

  return (
    <div className="w-full border-b border-[#ECEDF1] bg-white">
      
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[52px] w-full items-center justify-center overflow-x-auto py-2.5 sm:min-h-[58px]">
          <div className="flex min-w-max items-center gap-1.5 sm:gap-2.5">
            {steps.map((step, index) => {
              const stepNumber = index + 1;
              const isActive = activeStep === stepNumber;
              const isCompleted = activeStep > stepNumber;
              const isLast = index === steps.length - 1;

              return (
                <React.Fragment key={step.number}>
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    {/* STEP MARKER */}
                    <span
                      className={`
                        flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full
                        text-[9px] font-bold sm:h-[22px] sm:w-[22px] sm:text-[10px]
                        ${
                          isCompleted
                            ? "bg-[#17B26A] text-white"
                            : isActive
                              ? "bg-[#2F6FED] text-white"
                              : "border border-[#D0D5DD] bg-white text-[#98A2B3]"
                        }
                      `}
                    >
                      {isCompleted ? <Check size={12} strokeWidth={3} /> : stepNumber}
                    </span>

                    {/* STEP LABEL */}
                    <span
                      className={`
                        whitespace-nowrap text-[12px] leading-none sm:text-[13.5px]
                        ${
                          isActive
                            ? "font-semibold text-[#2F6FED]"
                            : isCompleted
                              ? "font-medium text-[#101828]"
                              : "font-medium text-[#98A2B3]"
                        }
                      `}
                    >
                      {step.title}
                    </span>
                  </div>

                  {!isLast && (
                    <ChevronRight size={15} className="shrink-0 text-[#D0D5DD]" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaaSSetupProgress;