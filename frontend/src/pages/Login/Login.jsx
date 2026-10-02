import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import Spinner from "../../Components/Spinner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import {
    sendOTPForLogin,
 verifyOTPForLogin,
} from "../../service/usersService";







import adminLoginDummy from "../../../public/image/staylio_brand_hero.jpg"







import logo from "../../../public/logo.png"



// =====================================================



// BUTTON STYLES (Staylio Azure Blue Theme)



// =====================================================







const btnBase =



    "w-full h-12 flex items-center justify-center gap-2 text-white text-sm sm:text-base font-bold rounded-xl transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1877F2]";







const btnActive =



    "bg-gradient-to-r from-[#1877F2] to-[#2563EB] hover:from-[#156ce0] hover:to-[#1d4ed8] hover:shadow-[0_12px_28px_rgba(24,119,242,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]";







const btnLoading =



    "bg-[#1877F2] opacity-80 cursor-not-allowed";







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



    const [digits, setDigits] = useState(["", "", "", "", "", ""]);



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



            setDigits(["", "", "", "", "", ""]);







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



            setError("Please enter all 6 digits of the security code.");



            return;



        }







        setLoadingVerify(true);



        setError("");







        try {



            const normalizedEmail = email.trim().toLowerCase();







            // -------------------------------------------------



            // VERIFY OTP



            // -------------------------------------------------







            const data = await verifyOTPForLogin(normalizedEmail, otpCode);







            // -------------------------------------------------



            // CHECK RESPONSE



            // -------------------------------------------------







            if (!data?.user) {



                throw new Error("Login information was not returned by the server.");



            }







            const loggedInUser = data.user;



            // -------------------------------------------------

            // RESTRICT TO ADMINS ONLY

            // -------------------------------------------------

            if (loggedInUser?.role !== "admin") {

                throw new Error("Access Denied: This portal is strictly for administrators. Please use the designated Hotel Login portal to access your account.");

            }



            console.log("[Login] Login successful:", loggedInUser);

            console.log("[Login] Role:", loggedInUser.role);

            console.log("[Login] Hotel ID:", loggedInUser.hotelId);

            console.log("[Login] Branch ID:", loggedInUser.branchId);







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



            console.log("[Login] Redirecting admin to dashboard");

            navigate("/saas-admin/dashboard");



        } catch (err) {



            console.error("[Login] OTP verification failed:", err);



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



            const normalizedEmail = email.trim().toLowerCase();



            await sendOTPForLogin(normalizedEmail);







            // Reset timer



            setSecondsLeft(60);







            // Clear OTP



            setDigits(["", "", "", "", "", ""]);







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



        const char = value.replace(/\D/g, "").slice(-1);



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



        if (e.key === "Backspace" && !digits[index] && index > 0) {



            digitRefs.current[index - 1]?.focus();



        }







        // Left arrow



        if (e.key === "ArrowLeft" && index > 0) {



            digitRefs.current[index - 1]?.focus();



        }







        // Right arrow



        if (e.key === "ArrowRight" && index < 5) {



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







        if (!pasted) return;







        const next = ["", "", "", "", "", ""];



        pasted.split("").forEach((ch, i) => {



            next[i] = ch;



        });







        setDigits(next);



        setError("");







        const focusIndex = Math.min(pasted.length, 5);



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



        setDigits(["", "", "", "", "", ""]);



    };







    // =================================================



    // RENDER



    // =================================================
    return (
        <>
            <Helmet>
                <title>
                    {verified
                        ? "Welcome - StayLio Admin"
                        : otpSent
                        ? "Verify Admin Access - StayLio"
                        : "Admin Login - StayLio"}
                </title>

                <meta
                    name="description"
                    content="Secure administrator access to the StayLio hotel management platform."
                />
            </Helmet>

            <main className="min-h-screen w-full bg-slate-100 p-3 font-sans sm:p-5 lg:p-6">
                <section className="mx-auto flex min-h-[calc(100vh-24px)] w-full max-w-[1180px] overflow-hidden rounded-2xl bg-white shadow-[0_18px_55px_rgba(15,23,42,0.12)] sm:min-h-[calc(100vh-40px)] lg:min-h-[calc(100vh-48px)]">
                    {/* LEFT IMAGE PANEL */}
                    <div className="relative hidden w-[46%] overflow-hidden bg-[#0B39C8] lg:block">
                        <img
                            src={adminLoginDummy}
                            alt="StayLio hotel management"
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="eager"
                            decoding="async"
                        />

                        <div className="absolute inset-0 bg-gradient-to-br from-[#1227C8]/85 via-[#1835D8]/65 to-[#08A6E8]/35" />

                        <div className="relative z-10 flex h-full flex-col justify-between p-8 xl:p-10">
                            <div>
                                <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
                                    StayLio Admin
                                </div>

                                <h1 className="mt-7 max-w-[390px] text-3xl font-bold leading-[1.08] tracking-tight text-white xl:text-[42px]">
                                    Manage every hotel
                                    <span className="block text-blue-100">
                                 
                                     All in one place
                                    </span>
                                </h1>

                                <p className="mt-5 max-w-[380px] text-sm leading-6 text-blue-50/85 xl:text-[15px]">
                                    Approve hotels, manage subscription plans, monitor accounts and oversee your entire hotel platform from one centralized Plateform.
                                </p>
                            </div>

                            <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-sm text-white">
                                    +
                                </div>

                                <div>
                                    <p className="text-xs font-semibold text-white">
                                        Secure administrator access
                                    </p>
                                    <p className="mt-0.5 text-[10px] text-blue-100/75">
                                        Protected with email OTP verification.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT LOGIN PANEL */}
                    <div className="flex w-full items-center justify-center bg-white px-6 py-8 sm:px-10 lg:w-[54%] lg:px-14 xl:px-20">
                        <div className="w-full max-w-[410px]">
                            {/* MOBILE BRAND */}
                            <div className="mb-8 flex items-center justify-between lg:hidden">
                                <div className="flex items-center gap-2.5">
                                    <img
                                        src={logo}
                                        alt="StayLio"
                                        className="h-9 w-auto object-contain"
                                    />

                                    <div>
                                        <p className="text-base font-bold text-slate-900">
                                            StayLio
                                        </p>
                                        <p className="text-[10px] text-[#1877F2]">
                                            Admin Portal
                                        </p>
                                    </div>
                                </div>

                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-[#1877F2]">
                                    Admin
                                </span>
                            </div>

                            {/* VERIFIED */}
                            {verified ? (
                                <div className="py-10 text-center" role="status">
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1877F2] text-2xl font-bold text-white shadow-[0_10px_25px_rgba(24,119,242,0.25)]">
                                        OK
                                    </div>

                                    <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
                                        Welcome, Administrator
                                    </h2>

                                    <p className="mx-auto mt-2 max-w-[320px] text-sm leading-6 text-slate-500">
                                        Your access has been verified. Opening
                                        the StayLio administration dashboard.
                                    </p>

                                    <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-[#1877F2]">
                                        <Spinner />
                                        <span>Opening dashboard...</span>
                                    </div>
                                </div>
                            ) : !otpSent ? (
                                /* EMAIL STEP */
                              <div>
    <div className="mb-9">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1877F2]">
            Hotel Management
        </p>

        <h2 className="mt-2.5 text-[28px] font-bold tracking-tight text-slate-900 sm:text-[30px]">
            Get Started Now
        </h2>

        <p className="mt-3 max-w-[390px] text-sm leading-6 text-slate-500 sm:text-[15px]">
            Sign in to your administrator account to manage your hotel
            operations securely.
        </p>
    </div>

    <form className="space-y-7" onSubmit={sendOtp}>
        <div>
            <label
                htmlFor="email"
                className="mb-2 block text-xs font-semibold text-slate-700 sm:text-sm"
            >
                Email address
            </label>

            <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                    setError("");
                    setEmail(e.target.value);
                }}
                placeholder="admin@yourhotel.com"
                autoComplete="email"
                required
                disabled={loadingSend}
                className="
                    h-12
                    w-full
                    rounded-lg
                    border
                    border-slate-300
                    bg-white
                    px-4
                    text-sm
                    font-medium
                    text-slate-800
                    outline-none
                    transition-all
                    duration-200
                    placeholder:text-slate-400
                    hover:border-slate-400
                    focus:border-[#1877F2]
                    focus:ring-4
                    focus:ring-[#1877F2]/10
                    disabled:cursor-not-allowed
                    disabled:bg-slate-50
                "
            />
        </div>

        {error && (
            <div
                className="
                    flex
                    items-start
                    gap-2.5
                    rounded-lg
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                "
                role="alert"
            >
                <span
                    className="
                        mt-0.5
                        flex
                        h-5
                        w-5
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-red-100
                        text-xs
                        font-bold
                        text-red-600
                    "
                >
                    !
                </span>

                <p className="text-sm leading-5 text-red-700">
                    {error}
                </p>
            </div>
        )}

        <button
            type="submit"
            disabled={loadingSend}
            className="
                flex
                h-12
                w-full
                items-center
                justify-center
                gap-2
                rounded-lg
                bg-gradient-to-r
                from-[#2638D8]
                to-[#4A27D8]
                text-sm
                font-bold
                text-white
                shadow-[0_8px_22px_rgba(55,48,220,0.22)]
                transition-all
                duration-200
                hover:from-[#1F31C8]
                hover:to-[#3F21C8]
                hover:-translate-y-[1px]
                hover:shadow-[0_12px_26px_rgba(55,48,220,0.28)]
                active:translate-y-0
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-70
            "
        >
            {loadingSend ? (
                <>
                    <Spinner />
                    <span>Sending code...</span>
                </>
            ) : (
                <span>Continue</span>
            )}
        </button>
    </form>

    <div className="mt-9 border-t border-slate-100 pt-6 text-center">
        <p className="text-xs leading-5 text-slate-400 sm:text-sm">
            Secure administrator login powered by StayLio.
        </p>
    </div>
</div>
                            ) : (
                                /* OTP STEP */
                                <div>
    <div className="mb-9">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1877F2]">
            Security Verification
        </p>

        <h2 className="mt-2.5 text-[28px] font-bold tracking-tight text-slate-900 sm:text-[30px]">
            Verify your access
        </h2>

        <p className="mt-3 max-w-[390px] text-sm leading-6 text-slate-500 sm:text-[15px]">
            Enter the 6-digit code sent to your registered administrator
            email.
        </p>
    </div>

    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Verification code sent to
        </p>

        <p className="mt-1.5 truncate text-sm font-semibold text-slate-700">
            {email}
        </p>
    </div>

    <button
        type="button"
        onClick={changeEmail}
        disabled={loadingVerify}
        className="
            mt-2.5
            text-xs
            font-semibold
            text-[#1877F2]
            transition-colors
            hover:text-[#125FCC]
            hover:underline
            disabled:cursor-not-allowed
            disabled:opacity-50
        "
    >
        Change email
    </button>

    <form
        className="mt-7 space-y-6"
        onSubmit={verifyOtp}
    >
        <div>
            <label className="mb-2.5 block text-xs font-semibold text-slate-700 sm:text-sm">
                Verification code
            </label>

            <div
                className="grid grid-cols-6 gap-2.5 sm:gap-3"
                onPaste={handleDigitPaste}
            >
                {digits.map((d, i) => (
                    <input
                        key={i}
                        ref={(el) => {
                            digitRefs.current[i] = el;
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
                        disabled={loadingVerify}
                        aria-label={`Verification digit ${i + 1}`}
                        className="
                            h-12
                            w-full
                            rounded-lg
                            border
                            border-slate-300
                            bg-white
                            text-center
                            text-xl
                            font-bold
                            text-slate-800
                            outline-none
                            transition-all
                            duration-200
                            hover:border-slate-400
                            focus:border-[#1877F2]
                            focus:ring-4
                            focus:ring-[#1877F2]/10
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                            sm:h-13
                        "
                    />
                ))}
            </div>
        </div>

        {error && (
            <div
                className="
                    flex
                    items-start
                    gap-2.5
                    rounded-lg
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                "
                role="alert"
            >
                <span
                    className="
                        mt-0.5
                        flex
                        h-5
                        w-5
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-red-100
                        text-xs
                        font-bold
                        text-red-600
                    "
                >
                    !
                </span>

                <p className="text-sm leading-5 text-red-700">
                    {error}
                </p>
            </div>
        )}

        <button
            type="submit"
            disabled={loadingVerify}
            className="
                flex
                h-12
                w-full
                items-center
                justify-center
                gap-2
                rounded-lg
                bg-gradient-to-r
                from-[#2638D8]
                to-[#4A27D8]
                text-sm
                font-bold
                text-white
                shadow-[0_8px_22px_rgba(55,48,220,0.22)]
                transition-all
                duration-200
                hover:-translate-y-[1px]
                hover:from-[#1F31C8]
                hover:to-[#3F21C8]
                hover:shadow-[0_12px_26px_rgba(55,48,220,0.28)]
                active:translate-y-0
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-70
            "
        >
            {loadingVerify ? (
                <>
                    <Spinner />
                    <span>Verifying...</span>
                </>
            ) : (
                <span>Verify and Login</span>
            )}
        </button>

        <div className="text-center text-xs text-slate-500 sm:text-sm">
            {secondsLeft > 0 ? (
                <>
                    Resend available in{" "}
                    <span className="font-semibold text-slate-700">
                        {formatTime(secondsLeft)}
                    </span>
                </>
            ) : loadingResend ? (
                <span className="font-semibold text-[#1877F2]">
                    Sending a new code...
                </span>
            ) : (
                <>
                    Did not receive the code?{" "}
                    <button
                        type="button"
                        onClick={resendOtp}
                        className="font-semibold text-[#1877F2] transition-colors hover:text-[#125FCC] hover:underline"
                    >
                        Resend code
                    </button>
                </>
            )}
        </div>
    </form>

    <div className="mt-9 border-t border-slate-100 pt-6 text-center">
        <p className="text-xs leading-5 text-slate-400 sm:text-sm">
            Your administrator account is protected with secure
            OTP verification.
        </p>
    </div>
</div>
                            )}

                            <p className="mt-6 text-center text-[9px] text-slate-400">
                                © {new Date().getFullYear()} StayLio. All rights reserved.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
};

export default Login;
