import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import Spinner from "../../Components/Spinner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import {
    sendOTPForLogin,
    verifyOTPForLogin,
} from "../../service/usersService";

// =====================================================
// BUTTON STYLES
// =====================================================

const btnBase =
    "w-full h-11 flex items-center justify-center gap-2 mt-2 text-white text-sm font-semibold rounded-md transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#08838d]";

const btnActive =
    "bg-[var(--teal,#08838d)] hover:bg-[var(--teal-dark,#065b62)] hover:-translate-y-[1px] active:translate-y-0";

const btnLoading =
    "bg-[var(--teal,#08838d)] opacity-75 cursor-not-allowed";

// =====================================================
// FORMAT TIMER
// =====================================================

const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
        s % 60
    ).padStart(2, "0")}`;

// =====================================================
// FRIENDLY ERROR MESSAGE
// =====================================================

const getFriendlyErrorMessage = (err, fallbackMessage) => {
    const rawMessage =
        err?.response?.data?.message ||
        err?.message ||
        "";

    const lowerMsg = rawMessage.toLowerCase();

    // User not found
    if (
        lowerMsg.includes("user not found") ||
        lowerMsg.includes("no approved hotel owner account") ||
        lowerMsg.includes("account with this email")
    ) {
        return "We couldn't find an account with this email address.";
    }

    // Inactive user
    if (
        lowerMsg.includes("user is inactive") ||
        lowerMsg.includes("account is inactive")
    ) {
        return "This account is currently inactive. Please contact the administrator.";
    }

    // Hotel not found
    if (
        lowerMsg.includes("hotel account was not found") ||
        lowerMsg.includes("not connected to a hotel")
    ) {
        return "Your hotel account could not be found. Please contact the administrator.";
    }

    // Hotel inactive
    if (
        lowerMsg.includes("hotel account is not active") ||
        lowerMsg.includes("hotel is inactive")
    ) {
        return "Your hotel account is not active. Please contact the administrator.";
    }

    // Subscription
    if (
        lowerMsg.includes("subscription is inactive") ||
        lowerMsg.includes("subscription is expired")
    ) {
        return "Your subscription is inactive or expired. Please contact the administrator.";
    }

    // OTP expired
    if (lowerMsg.includes("otp has expired")) {
        return "Your security code has expired. Please request a new one.";
    }

    // Invalid OTP
    if (lowerMsg.includes("invalid otp")) {
        return "The OTP code you entered is incorrect. Please check and try again.";
    }

    // Generic expired
    if (lowerMsg.includes("expired")) {
        return "Your security code has expired. Please request a new one.";
    }

    return rawMessage || fallbackMessage;
};

// =====================================================
// LOGIN COMPONENT
// =====================================================

const Login = () => {
    const { loginUser } = useAuth();

    const navigate = useNavigate();

    // -------------------------------------------------
    // STATE
    // -------------------------------------------------

    const [email, setEmail] = useState("");

    const [digits, setDigits] = useState([
        "",
        "",
        "",
        "",
        "",
        "",
    ]);

    const [otpSent, setOtpSent] = useState(false);

    const [verified, setVerified] = useState(false);

    const [error, setError] = useState("");

    const [secondsLeft, setSecondsLeft] = useState(60);

    const [loadingSend, setLoadingSend] = useState(false);

    const [loadingVerify, setLoadingVerify] = useState(false);

    const [loadingResend, setLoadingResend] = useState(false);

    const digitRefs = useRef([]);

    // =================================================
    // COUNTDOWN TIMER
    // =================================================

    useEffect(() => {
        if (!otpSent || secondsLeft === 0) {
            return undefined;
        }

        const timer = window.setInterval(() => {
            setSecondsLeft((s) => s - 1);
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [otpSent, secondsLeft]);

    // =================================================
    // SEND OTP
    // =================================================

    const sendOtp = async (event) => {
        event.preventDefault();

        const normalizedEmail = email.trim().toLowerCase();

        // -------------------------------------------------
        // EMAIL VALIDATION
        // -------------------------------------------------

        if (!normalizedEmail || !normalizedEmail.includes("@")) {
            setError("Please enter a valid email address.");
            return;
        }

        setLoadingSend(true);
        setError("");

        try {
            await sendOTPForLogin(normalizedEmail);

            // Show OTP screen
            setOtpSent(true);

            // Start frontend resend timer
            setSecondsLeft(60);

            // Clear previous OTP
            setDigits([
                "",
                "",
                "",
                "",
                "",
                "",
            ]);

            // Focus first OTP box
            setTimeout(() => {
                digitRefs.current[0]?.focus();
            }, 100);

        } catch (err) {
            setError(
                getFriendlyErrorMessage(
                    err,
                    "Failed to send verification code. Please check your email and try again."
                )
            );
        } finally {
            setLoadingSend(false);
        }
    };

    // =================================================
    // VERIFY OTP
    // =================================================

    const verifyOtp = async (event) => {
        event.preventDefault();

        const otpCode = digits.join("");

        // -------------------------------------------------
        // OTP VALIDATION
        // -------------------------------------------------

        if (otpCode.length !== 6) {
            setError(
                "Please enter all 6 digits of the security code."
            );
            return;
        }

        setLoadingVerify(true);
        setError("");

        try {
            const normalizedEmail =
                email.trim().toLowerCase();

            // -------------------------------------------------
            // VERIFY OTP
            // -------------------------------------------------

            const data = await verifyOTPForLogin(
                normalizedEmail,
                otpCode
            );

            // -------------------------------------------------
            // CHECK RESPONSE
            // -------------------------------------------------

            if (!data?.user) {
                throw new Error(
                    "Login information was not returned by the server."
                );
            }

            const loggedInUser = data.user;

            console.log(
                "[Login] Login successful:",
                loggedInUser
            );

            console.log(
                "[Login] Role:",
                loggedInUser.role
            );

            console.log(
                "[Login] Hotel ID:",
                loggedInUser.hotelId
            );

            console.log(
                "[Login] Branch ID:",
                loggedInUser.branchId
            );

            // -------------------------------------------------
            // UPDATE AUTH CONTEXT
            // -------------------------------------------------

            await loginUser(loggedInUser);

            // -------------------------------------------------
            // SHOW SUCCESS
            // -------------------------------------------------

            setVerified(true);

            // -------------------------------------------------
            // ROLE-BASED REDIRECT
            // -------------------------------------------------

            if (loggedInUser.role === "hotelOwner") {

                console.log(
                    "[Login] Redirecting hotel owner to hotel dashboard"
                );

                navigate("/hotel/dashboard");

            } else {

                console.log(
                    "[Login] Redirecting staff/admin to dashboard"
                );

                navigate("/dashboard");
            }

        } catch (err) {
            console.error(
                "[Login] OTP verification failed:",
                err
            );

            setError(
                getFriendlyErrorMessage(
                    err,
                    "The security code you entered is incorrect or has expired. Please try again."
                )
            );
        } finally {
            setLoadingVerify(false);
        }
    };

    // =================================================
    // RESEND OTP
    // =================================================

    const resendOtp = async () => {
        setLoadingResend(true);

        setError("");

        try {
            const normalizedEmail =
                email.trim().toLowerCase();

            await sendOTPForLogin(normalizedEmail);

            // Reset timer
            setSecondsLeft(60);

            // Clear OTP
            setDigits([
                "",
                "",
                "",
                "",
                "",
                "",
            ]);

            // Focus first box
            setTimeout(() => {
                digitRefs.current[0]?.focus();
            }, 100);

        } catch (err) {
            setError(
                getFriendlyErrorMessage(
                    err,
                    "Failed to resend security code. Please try again."
                )
            );
        } finally {
            setLoadingResend(false);
        }
    };

    // =================================================
    // OTP DIGIT CHANGE
    // =================================================

    const handleDigit = (index, value) => {
        const char = value
            .replace(/\D/g, "")
            .slice(-1);

        const next = [...digits];

        next[index] = char;

        setDigits(next);

        setError("");

        // Move to next box
        if (char && index < 5) {
            digitRefs.current[index + 1]?.focus();
        }
    };

    // =================================================
    // OTP KEYBOARD HANDLER
    // =================================================

    const handleDigitKeyDown = (index, e) => {

        // Backspace
        if (
            e.key === "Backspace" &&
            !digits[index] &&
            index > 0
        ) {
            digitRefs.current[index - 1]?.focus();
        }

        // Left arrow
        if (
            e.key === "ArrowLeft" &&
            index > 0
        ) {
            digitRefs.current[index - 1]?.focus();
        }

        // Right arrow
        if (
            e.key === "ArrowRight" &&
            index < 5
        ) {
            digitRefs.current[index + 1]?.focus();
        }
    };

    // =================================================
    // OTP PASTE
    // =================================================

    const handleDigitPaste = (e) => {
        const pasted = e.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 6);

        if (!pasted) {
            return;
        }

        const next = [
            "",
            "",
            "",
            "",
            "",
            "",
        ];

        pasted
            .split("")
            .forEach((ch, i) => {
                next[i] = ch;
            });

        setDigits(next);

        setError("");

        const focusIndex = Math.min(
            pasted.length,
            5
        );

        digitRefs.current[focusIndex]?.focus();

        e.preventDefault();
    };

    // =================================================
    // CHANGE EMAIL
    // =================================================

    const changeEmail = () => {
        setOtpSent(false);

        setVerified(false);

        setError("");

        setDigits([
            "",
            "",
            "",
            "",
            "",
            "",
        ]);
    };

    // =================================================
    // RENDER
    // =================================================

    return (
        <>
            <Helmet>
                <title>
                    {verified
                        ? "Welcome — SS Residency"
                        : otpSent
                        ? "Verify Your Email — SS Residency"
                        : "Sign In — SS Residency Hotel Management"}
                </title>

                <meta
                    name="description"
                    content={
                        otpSent
                            ? "Enter the 6-digit security code sent to your email to access the SS Residency hotel management portal."
                            : "Sign in to the SS Residency Hotel Management portal securely with OTP verification."
                    }
                />
            </Helmet>

            <main className="grid min-h-screen place-items-center p-4 sm:p-6 bg-gradient-to-br from-[#f6f9fb] to-[#eef8f8]">

                <section
                    className="w-full max-w-[420px] p-6 sm:p-9 border border-[var(--line,#d8e2e7)] rounded-xl bg-[var(--surface,#ffffff)] shadow-[0_18px_50px_rgba(28,67,76,0.08)]"
                    aria-labelledby="login-title"
                >

                    {/* =================================================
                        BRAND
                    ================================================= */}

                    <div className="mb-5">

                        <div
                            className="text-[var(--teal-dark,#065b62)] text-2xl font-bold tracking-tight"
                            aria-label="SS Residency"
                        >
                            SS Residency
                        </div>

                    </div>

                    {/* =================================================
                        SUCCESS
                    ================================================= */}

                    {verified ? (

                        <div
                            className="py-6 text-center"
                            role="status"
                        >

                            <span
                                className="grid w-12 h-12 mx-auto mb-4 place-items-center rounded-full bg-[var(--teal-soft,#eaf6f7)] text-[var(--teal-dark,#065b62)] text-2xl font-bold"
                                aria-hidden="true"
                            >
                                ✓
                            </span>

                            <h2 className="mb-1 text-xl font-semibold text-[var(--ink,#121921)]">
                                Login successful
                            </h2>

                            <p className="text-[var(--muted,#4a5965)] text-sm">
                                Redirecting you to your dashboard...
                            </p>

                        </div>

                    ) : !otpSent ? (

                        /* =================================================
                           STEP 1 - EMAIL
                        ================================================= */

                        <>
                            <div className="mb-6 space-y-1">

                                <h1
                                    id="login-title"
                                    className="text-2xl font-bold text-[var(--ink,#121921)] tracking-tight"
                                >
                                    Sign in to your account
                                </h1>

                                <p className="text-sm text-[var(--muted,#4a5965)]">
                                    Enter your registered email to receive a verification code.
                                </p>

                            </div>

                            <form
                                className="space-y-4"
                                onSubmit={sendOtp}
                            >

                                <div className="space-y-1.5">

                                    <label
                                        htmlFor="email"
                                        className="block text-xs font-semibold text-[#2d3748]"
                                    >
                                        Email Address
                                    </label>

                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setError("");
                                            setEmail(
                                                e.target.value
                                            );
                                        }}
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                        required
                                        disabled={loadingSend}
                                        className="w-full h-11 px-3.5 disabled:opacity-60 disabled:cursor-not-allowed"
                                    />

                                </div>

                                {/* ERROR */}

                                {error && (
                                    <div
                                        className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-100"
                                        role="alert"
                                    >

                                        <svg
                                            className="w-3.5 h-3.5 shrink-0 text-[var(--danger,#d92d20)]"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-.75 5a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0V7zm.75 8.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
                                            />
                                        </svg>

                                        <p className="text-xs font-medium text-[var(--danger,#d92d20)]">
                                            {error}
                                        </p>

                                    </div>
                                )}

                                {/* SEND OTP */}

                                <button
                                    type="submit"
                                    disabled={loadingSend}
                                    className={`${btnBase} ${
                                        loadingSend
                                            ? btnLoading
                                            : btnActive
                                    }`}
                                >

                                    {loadingSend ? (
                                        <>
                                            <Spinner />
                                            <span>
                                                Sending code…
                                            </span>
                                        </>
                                    ) : (
                                        "Continue"
                                    )}

                                </button>

                            </form>
                        </>

                    ) : (

                        /* =================================================
                           STEP 2 - OTP
                        ================================================= */

                        <>
                            <div className="mb-6 space-y-1">

                                <h1
                                    id="login-title"
                                    className="text-2xl font-bold text-[var(--ink,#121921)] tracking-tight"
                                >
                                    Verify your email
                                </h1>

                                <p className="text-sm text-[var(--muted,#4a5965)]">
                                    Enter the 6-digit security code sent to your email address.
                                </p>

                            </div>

                            {/* EMAIL INFO */}

                            <div className="flex items-center justify-between gap-3 mb-4 px-3 py-2.5 border border-[#b6e2e5] rounded-md bg-[var(--teal-soft,#eaf6f7)] text-xs">

                                <div className="flex items-center gap-2 min-w-0">

                                    <svg
                                        className="w-4 h-4 shrink-0 text-[var(--teal,#08838d)]"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <rect
                                            x="2"
                                            y="4"
                                            width="20"
                                            height="16"
                                            rx="2"
                                        />

                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                    </svg>

                                    <div className="min-w-0">

                                        <span className="block text-[var(--muted,#4a5965)]">
                                            Code sent to
                                        </span>

                                        <strong className="block truncate text-[var(--ink,#121921)] font-semibold">
                                            {email}
                                        </strong>

                                    </div>

                                </div>

                                <button
                                    id="btn-back"
                                    type="button"
                                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded border border-[#b6e2e5] bg-white text-[var(--teal-dark,#065b62)] text-xs font-semibold hover:bg-[var(--teal-soft,#eaf6f7)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08838d] whitespace-nowrap"
                                    onClick={changeEmail}
                                >

                                    <svg
                                        className="w-3 h-3"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />

                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>

                                    Change email

                                </button>

                            </div>

                            <form
                                className="space-y-4"
                                onSubmit={verifyOtp}
                            >

                                <div className="space-y-2">

                                    <label className="block text-xs font-semibold text-[#2d3748]">
                                        Enter 6-digit security code
                                    </label>

                                    {/* OTP BOXES */}

                                    <div
                                        className="flex gap-2"
                                        onPaste={handleDigitPaste}
                                    >

                                        {digits.map(
                                            (d, i) => (
                                                <input
                                                    key={i}
                                                    ref={(el) => {
                                                        digitRefs.current[i] =
                                                            el;
                                                    }}
                                                    id={`otp-${i}`}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={d}
                                                    onChange={(e) =>
                                                        handleDigit(
                                                            i,
                                                            e.target.value
                                                        )
                                                    }
                                                    onKeyDown={(e) =>
                                                        handleDigitKeyDown(
                                                            i,
                                                            e
                                                        )
                                                    }
                                                    disabled={
                                                        loadingVerify
                                                    }
                                                    className="w-full h-12 text-center text-xl font-semibold tabular-nums rounded-md border-2 border-[var(--line,#d8e2e7)] bg-white text-[var(--ink,#121921)] outline-none transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                                                    aria-label={`Digit ${
                                                        i + 1
                                                    }`}
                                                />
                                            )
                                        )}

                                    </div>

                                </div>

                                {/* ERROR */}

                                {error && (
                                    <div
                                        className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-100"
                                        role="alert"
                                    >

                                        <svg
                                            className="w-3.5 h-3.5 shrink-0 text-[var(--danger,#d92d20)]"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                clipRule="evenodd"
                                                d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm-.75 5a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0V7zm.75 8.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
                                            />
                                        </svg>

                                        <p className="text-xs font-medium text-[var(--danger,#d92d20)]">
                                            {error}
                                        </p>

                                    </div>
                                )}

                                {/* VERIFY BUTTON */}

                                <button
                                    type="submit"
                                    disabled={loadingVerify}
                                    className={`${btnBase} ${
                                        loadingVerify
                                            ? btnLoading
                                            : btnActive
                                    }`}
                                >

                                    {loadingVerify ? (
                                        <>
                                            <Spinner />
                                            <span>
                                                Verifying…
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                className="w-4 h-4 shrink-0"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                aria-hidden="true"
                                            >
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />

                                                <path d="m9 12 2 2 4-4" />
                                            </svg>

                                            <span>
                                                Verify & Login
                                            </span>
                                        </>
                                    )}

                                </button>

                                {/* RESEND */}

                                <p className="pt-1 text-center text-xs text-[var(--muted,#4a5965)]">

                                    Didn't receive code?{" "}

                                    {secondsLeft > 0 ? (

                                        <span className="font-semibold text-[var(--ink,#121921)]">
                                            Resend in{" "}
                                            {formatTime(
                                                secondsLeft
                                            )}
                                        </span>

                                    ) : loadingResend ? (

                                        <span className="font-semibold text-[var(--teal-dark,#065b62)]">
                                            Resending…
                                        </span>

                                    ) : (

                                        <button
                                            type="button"
                                            className="font-semibold text-[var(--teal-dark,#065b62)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08838d]"
                                            onClick={
                                                resendOtp
                                            }
                                        >
                                            Resend
                                        </button>

                                    )}

                                </p>

                            </form>
                        </>
                    )}

                    {/* =================================================
                        FOOTER
                    ================================================= */}

                    <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-center">

                        <p className="text-[11px] text-[var(--muted,#4a5965)]">
                            SS Residency Hotel Management • Secured Access
                        </p>

                        <p className="flex items-center justify-center gap-1 text-[11px] text-[var(--muted,#4a5965)]">

                            <svg
                                className="w-3 h-3 shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <rect
                                    x="3"
                                    y="11"
                                    width="18"
                                    height="11"
                                    rx="2"
                                />

                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>

                            Your information is secure and encrypted

                        </p>

                        <footer className="py-4 px-4 text-center text-xs text-slate-500 mt-auto">

                            <p>
                                ©{" "}
                                {new Date().getFullYear()}{" "}
                                Developed by{" "}

                                <a
                                    href="https://jayamwebsolutions.com/"
                                    className="font-semibold text-[var(--teal,#08838d)] hover:underline transition-colors"
                                    title="Visit Jayam Web Solutions"
                                >
                                    Jayam Web Solutions
                                </a>

                                . All rights reserved.
                            </p>

                        </footer>

                    </div>

                </section>

            </main>
        </>
    );
};

export default Login;