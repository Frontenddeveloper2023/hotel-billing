import "dotenv/config";
import nodemailer from "nodemailer";
import { log } from "./logger.js";
import Settings from "../models/settings.js";
import Hotels from "../models/hotels.js";
import User from "../models/users.js";
import Subscription from "../models/subscription.js";
import Plans from "../models/plans.js";
import { generateRenewalToken } from "./renewalToken.js";

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "webscape.co.in",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER ,
      pass: process.env.SMTP_PASS 
    },
  });
};

const transporter = new Proxy(
  {},
  {
    get(_target, prop) {
      const activeTransporter = getTransporter();
      const val = activeTransporter[prop];
      return typeof val === "function" ? val.bind(activeTransporter) : val;
    },
  }
);

const getBaseUrl = () => {
  const envUrl =
    process.env.BACKEND_URL ||
    process.env.API_BASE_URL ||
    process.env.SERVER_URL;

  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  // Derive origin from CLIENT_URL or FRONTEND_URL if backend URL is not explicitly configured
  const envFrontend = process.env.CLIENT_URL || process.env.FRONTEND_URL;
  if (envFrontend && envFrontend.trim()) {
    try {
      return new URL(envFrontend.trim()).origin;
    } catch {
      // ignore
    }
  }

  return "https://jayam.co.in";
};

const getFrontendUrl = () => {
  // Always take URL safely from backend .env (CLIENT_URL or FRONTEND_URL)
  let envFrontend = (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    process.env.VITE_CLIENT_URL ||
    process.env.VITE_FRONTEND_URL ||
    ""
  ).trim().replace(/\/+$/, "");

  if (envFrontend) {
    return envFrontend.replace(/\/hotel-billing-system\/hotel-billing-system/g, "/hotel-billing-system");
  }

  // Fallback: derive from backend / domain base URL configured in .env
  const base = getBaseUrl();
  const fallback = base ? `${base}/hotel-billing-system` : "https://jayam.co.in/hotel-billing-system";
  return fallback.replace(/\/hotel-billing-system\/hotel-billing-system/g, "/hotel-billing-system");
};


const getBackendApiUrl = () => {
  const base = getBaseUrl();
  const baseName = (process.env.BASE_NAME || "hotel-billing-system-backend").trim().replace(/^\/+|\/+$/g, "");
  return base ? `${base}/${baseName}/api` : `/${baseName}/api`;
};




/**
 * Fetch hotel name configured in the Settings page (companyName).
 * If not found in Settings, fall back to Hotels collection or provided fallback name.
 */
export const getHotelNameFromSettings = async ({ hotelId, hotelName }) => {
  try {
    if (hotelId) {
      const setting = await Settings.findOne({ hotelId })
        .sort({ updatedAt: -1 })
        .select("companyName")
        .lean();

      if (setting?.companyName && setting.companyName.trim()) {
        return setting.companyName.trim();
      }

      const hotel = await Hotels.findById(hotelId)
        .select("hotelName")
        .lean();

      if (hotel?.hotelName && hotel.hotelName.trim()) {
        return hotel.hotelName.trim();
      }
    }

    if (hotelName && hotelName.trim()) {
      const hotel = await Hotels.findOne({
        hotelName: hotelName.trim(),
      })
        .select("_id")
        .lean();

      if (hotel?._id) {
        const setting = await Settings.findOne({
          hotelId: hotel._id,
        })
          .sort({ updatedAt: -1 })
          .select("companyName")
          .lean();

        if (setting?.companyName && setting.companyName.trim()) {
          return setting.companyName.trim();
        }
      }

      return hotelName.trim();
    }
  } catch (err) {
    log.error(
      `[EMAIL] Error getting hotel name from settings: ${err.message}`
    );
  }

  return hotelName?.trim() || "Hotel";
};

// ============================================================
// 1. OTP VERIFICATION EMAIL
// ============================================================
const sendOTP = async (to, otp) => {
  try {
    await transporter.sendMail({
      from: `"StayLio" <${process.env.SMTP_USER}>`,
      to,
      subject: "Your StayLio Verification Code",

      text: `Hello,

Your StayLio verification code is ${otp}.

This code is valid for 5 minutes. Please do not share this code with anyone.

Thank you,
StayLio Team`,

      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
  <title>StayLio - Verify Your Email</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#ffffff;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
    -webkit-font-smoothing:antialiased;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="background:#ffffff;"
>
  <tr>
    <td
      align="center"
      style="padding:40px 20px;"
    >

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="
          max-width:560px;
          width:100%;
        "
      >

        <!-- BRAND -->
        <tr>
          <td style="padding-bottom:34px;">

            <div
              style="
                font-size:24px;
                line-height:30px;
                font-weight:700;
                color:#111827;
                letter-spacing:-0.5px;
              "
            >
              StayLio
            </div>

            <div
              style="
                margin-top:4px;
                font-size:12px;
                line-height:18px;
                font-weight:500;
                color:#6B7280;
              "
            >
              Hotel Management Platform
            </div>

          </td>
        </tr>


        <!-- HEADING -->
        <tr>
          <td>

            <div
              style="
                font-size:26px;
                line-height:34px;
                font-weight:700;
                color:#111827;
                letter-spacing:-0.6px;
                margin-bottom:12px;
              "
            >
              Thank you for signing up
            </div>

            <div
              style="
                font-size:15px;
                line-height:23px;
                font-weight:400;
                color:#4B5563;
                margin-bottom:24px;
              "
            >
              Enter this code to confirm your email
              
            </div>

          </td>
        </tr>


        <!-- OTP -->
        <tr>
          <td>

            <div
              style="
                font-size:30px;
                line-height:38px;
                font-weight:700;
                letter-spacing:5px;
                color:#64745F;
                margin-bottom:26px;
              "
            >
              ${otp}
            </div>

          </td>
        </tr>


        <!-- SECURITY BOX -->
        <tr>
          <td>

            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              border="0"
              style="
                border:1px solid #E5E7EB;
                background:#FFFFFF;
              "
            >
              <tr>

                <td style="padding:18px 16px;">

                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                  >
                    <tr>

                      <td
                        width="28"
                        valign="top"
                        style="padding-right:8px;"
                      >
                        <div
                          style="
                            font-size:16px;
                            line-height:20px;
                            color:#374151;
                          "
                        >
                          ◆
                        </div>
                      </td>

                      <td valign="top">

                        <div
                          style="
                            font-size:14px;
                            line-height:20px;
                            font-weight:700;
                            color:#111827;
                            margin-bottom:8px;
                          "
                        >
                          Your account security is important
                        </div>

                        <div
                          style="
                            font-size:13px;
                            line-height:20px;
                            color:#6B7280;
                          "
                        >
                          This verification code is valid for
                          <strong style="color:#374151;">
                            5 minutes
                          </strong>.
                          If you did not request this code,
                          you can safely ignore this email.
                        </div>

                      </td>

                    </tr>
                  </table>

                </td>

              </tr>
            </table>

          </td>
        </tr>


       


        <!-- EXPIRY -->
        <tr>
          <td style="padding-top:24px;">

            <div
              style="
                font-size:12px;
                line-height:19px;
                color:#9CA3AF;
              "
            >
              This verification code will expire in 5 minutes.
            </div>

          </td>
        </tr>


        <!-- FOOTER -->
        <tr>
          <td style="padding-top:40px;">

            <div
              style="
                border-top:1px solid #F0F0F0;
                padding-top:18px;
                font-size:12px;
                line-height:19px;
                color:#9CA3AF;
              "
            >
              <strong style="color:#6B7280;">
                StayLio
              </strong>
              · Hotel Management Platform
              <br>
              This is an automated email. Please do not reply.
            </div>

          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>
`,
    });

    log(`OTP sent to ${to}`);
  } catch (error) {
    console.error("Error sending OTP:", error);
    log(`Error sending OTP to ${to}: ${error.message}`);
    throw error;
  }
};


// ============================================================
// 2. ADMIN MANUAL EMAIL
// ============================================================
const sendAdminEmail = async ({
  to,
  recipientName,
  subject,
  message,
}) => {
  try {
    await transporter.sendMail({
      from: `"StayLio" <${process.env.SMTP_USER}>`,
      to,
      subject,

      text: `Hello ${recipientName || "Valued Hotel Partner"
        },

${message}

Thank you,
StayLio Team`,

      html: `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
  <title>${subject}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#ffffff;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
>
  <tr>

    <td
      align="center"
      style="padding:40px 20px;"
    >

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        style="max-width:560px;width:100%;"
      >

        <!-- BRAND -->
        <tr>
          <td style="padding-bottom:34px;">

            <div
              style="
                font-size:24px;
                line-height:30px;
                font-weight:700;
                color:#111827;
              "
            >
              StayLio
            </div>

            <div
              style="
                margin-top:4px;
                font-size:12px;
                color:#6B7280;
              "
            >
              Hotel Management Platform
            </div>

          </td>
        </tr>


        <!-- TITLE -->
        <tr>
          <td>

            <div
              style="
                font-size:26px;
                line-height:34px;
                font-weight:700;
                color:#111827;
                margin-bottom:14px;
              "
            >
              ${subject}
            </div>

            <div
              style="
                font-size:15px;
                line-height:23px;
                color:#4B5563;
                margin-bottom:22px;
              "
            >
              Hello
              <strong style="color:#111827;">
                ${recipientName || "Valued Hotel Partner"}
              </strong>,
            </div>

          </td>
        </tr>


        <!-- MESSAGE BOX -->
        <tr>
          <td>

            <div
              style="
                border:1px solid #E5E7EB;
                padding:18px 16px;
                font-size:14px;
                line-height:23px;
                color:#4B5563;
                white-space:pre-line;
              "
            >
              ${message}
            </div>

          </td>
        </tr>


        <!-- INFO -->
        <tr>
          <td style="padding-top:24px;">

            <div
              style="
                font-size:12px;
                line-height:19px;
                color:#9CA3AF;
              "
            >
              This message was sent by the StayLio
              administration team.
            </div>

          </td>
        </tr>


        <!-- FOOTER -->
        <tr>
          <td style="padding-top:40px;">

            <div
              style="
                border-top:1px solid #F0F0F0;
                padding-top:18px;
                font-size:12px;
                line-height:19px;
                color:#9CA3AF;
              "
            >
              <strong style="color:#6B7280;">
                StayLio
              </strong>
              · Hotel Management Platform
              <br>
              This is an automated email. Please do not reply.
            </div>

          </td>
        </tr>

      </table>

    </td>

  </tr>
</table>

</body>
</html>
`,
    });

    log.info(
      `[EMAIL] Admin email sent successfully to ${to}`
    );

    return {
      success: true,
      message: "Email sent successfully.",
    };
  } catch (error) {
    console.error(
      "[EMAIL] Admin email failed:",
      error
    );

    log.error(
      `[EMAIL] Failed to send admin email to ${to}: ${error.message}`
    );

    throw error;
  }
};


// ============================================================
// 3A. RENDER SUBSCRIPTION EXPIRY REMINDER TEMPLATE
// ============================================================
const renderSubscriptionReminderTemplate = ({
  resolvedHotelName,
  resolvedPlanName,
  cycleLabel = "Monthly",
  formattedDate,
  daysRemaining,
  formattedBasePrice,
  formattedCredit,
  remainingDays,
  formattedAmount,
  taxAmount = 0,
  quickRenewUrl,
  upgradeUrl = "",
  urgencyText,
  urgencyColor = "#0875D1",
  subject,
}) => {
  const text = `Hello ${resolvedHotelName},

${urgencyText}

Hotel Name: ${resolvedHotelName}
Plan: ${resolvedPlanName} (${cycleLabel})
Plan Price: ${formattedBasePrice}
Expiry Date: ${formattedDate}
Days Left: ${daysRemaining} day${daysRemaining > 1 ? "s" : ""}
Unused Days Credit: -${formattedCredit}
Adjusted Amount to Pay: ${formattedAmount}${taxAmount > 0 ? " (incl. 18% GST)" : ""}

Please renew your plan now so all hotel rooms and billing keep working without interruption.

Pay & Renew Now: ${quickRenewUrl}

Thank you,
StayLio Team`;

  const html = `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
  <title>${subject}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#ffffff;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
>
<tr>

<td
  align="center"
  style="padding:40px 20px;"
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="max-width:560px;width:100%;"
>

<!-- BRAND -->
<tr>
<td style="padding-bottom:34px;">

  <div
    style="
      font-size:24px;
      line-height:30px;
      font-weight:700;
      color:#111827;
    "
  >
    StayLio
  </div>

  <div
    style="
      margin-top:4px;
      font-size:12px;
      color:#6B7280;
    "
  >
    Hotel Management Platform
  </div>

</td>
</tr>


<!-- TITLE -->
<tr>
<td>

  <div
    style="
      font-size:26px;
      line-height:34px;
      font-weight:700;
      color:#111827;
      margin-bottom:12px;
    "
  >
    Subscription Reminder
  </div>

  <div
    style="
      font-size:15px;
      line-height:23px;
      color:#4B5563;
      margin-bottom:8px;
    "
  >
    Hello
    <strong style="color:#111827;">
      ${resolvedHotelName}
    </strong>
    ,
  </div>

  <div
    style="
      font-size:15px;
      line-height:23px;
      color:#4B5563;
      margin-bottom:26px;
    "
  >
    ${urgencyText} Here are your current plan details.
  </div>

</td>
</tr>


<!-- DETAILS -->
<tr>
<td>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    border:1px solid #E5E7EB;
    background:#FFFFFF;
  "
>

<tr>
<td style="padding:18px 16px;">

  <div
    style="
      font-size:12px;
      line-height:18px;
      font-weight:700;
      color:#6B7280;
      text-transform:uppercase;
      letter-spacing:.5px;
      margin-bottom:14px;
    "
  >
    Subscription details
  </div>


  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
  >

    <tr>

      <td
        style="
          font-size:13px;
          color:#6B7280;
          padding:7px 0;
        "
      >
        Hotel Name
      </td>

      <td
        align="right"
        style="
          font-size:14px;
          font-weight:600;
          color:#111827;
          padding:7px 0;
        "
      >
        ${resolvedHotelName}
      </td>

    </tr>


    <tr>

      <td
        style="
          border-top:1px solid #F0F0F0;
          font-size:13px;
          color:#6B7280;
          padding:10px 0 7px;
        "
      >
        Current Plan
      </td>

      <td
        align="right"
        style="
          border-top:1px solid #F0F0F0;
          font-size:14px;
          font-weight:600;
          color:#111827;
          padding:10px 0 7px;
        "
      >
        ${resolvedPlanName} (${cycleLabel})
      </td>

    </tr>


    <tr>

      <td
        style="
          border-top:1px solid #F0F0F0;
          font-size:13px;
          color:#6B7280;
          padding:10px 0 7px;
        "
      >
        Plan Price
      </td>

      <td
        align="right"
        style="
          border-top:1px solid #F0F0F0;
          font-size:14px;
          font-weight:600;
          color:#111827;
          padding:10px 0 7px;
        "
      >
        ${formattedBasePrice}
      </td>

    </tr>


    <tr>

      <td
        style="
          border-top:1px solid #F0F0F0;
          font-size:13px;
          color:#6B7280;
          padding:10px 0 7px;
        "
      >
        Expiry Date
      </td>

      <td
        align="right"
        style="
          border-top:1px solid #F0F0F0;
          font-size:14px;
          font-weight:600;
          color:#0875D1;
          padding:10px 0 7px;
        "
      >
        ${formattedDate}
      </td>

    </tr>


    <tr>

      <td
        style="
          border-top:1px solid #F0F0F0;
          font-size:13px;
          color:#6B7280;
          padding:10px 0 7px;
        "
      >
        Days Left
      </td>

      <td
        align="right"
        style="
          border-top:1px solid #F0F0F0;
          font-size:14px;
          font-weight:700;
          color:${urgencyColor};
          padding:10px 0 7px;
        "
      >
        ${daysRemaining}
        Day${daysRemaining > 1 ? "s" : ""}
      </td>

    </tr>


    <tr>

      <td
        style="
          border-top:1px solid #F0F0F0;
          font-size:13px;
          color:#059669;
          padding:10px 0 7px;
        "
      >
        Unused Days Credit (${remainingDays} days)
      </td>

      <td
        align="right"
        style="
          border-top:1px solid #F0F0F0;
          font-size:14px;
          font-weight:700;
          color:#059669;
          padding:10px 0 7px;
        "
      >
        -${formattedCredit}
      </td>

    </tr>


    <tr>

      <td
        style="
          border-top:1px solid #F0F0F0;
          font-size:13px;
          color:#111827;
          font-weight:600;
          padding:10px 0 7px;
        "
      >
        Adjusted Amount to Pay
      </td>

      <td
        align="right"
        style="
          border-top:1px solid #F0F0F0;
          font-size:16px;
          font-weight:700;
          color:#16A34A;
          padding:10px 0 7px;
        "
      >
        ${formattedAmount}
        ${taxAmount > 0 ? '<div style="font-size:11px;font-weight:normal;color:#6B7280;">(incl. 18% GST)</div>' : ''}
      </td>

    </tr>

  </table>

</td>
</tr>

</table>

</td>
</tr>



<!-- MESSAGE -->
<tr>
<td style="padding-top:24px;">

  <div
    style="
      font-size:14px;
      line-height:22px;
      color:#4B5563;
    "
  >
    To keep your room bookings, check-in,
    and billing working without interruption,
    please renew your plan.
  </div>

</td>
</tr>


<!-- BUTTONS SECTION -->
<tr>
<td align="center" style="padding-top:28px;padding-bottom:12px;">

  <!-- Primary CTA: 1-Click Direct Cashfree Pay & Renew -->
  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;width:100%;max-width:420px;">
    <tr>
      <td align="center" bgcolor="#2563EB" style="border-radius:10px;background-color:#2563EB;box-shadow:0 4px 14px rgba(37,99,235,0.30);">
        <a
          href="${quickRenewUrl}"
          target="_blank"
          style="
            display:block;
            padding:16px 28px;
            font-family:Arial,Helvetica,sans-serif;
            font-size:16px;
            font-weight:700;
            color:#FFFFFF !important;
            text-decoration:none;
            background-color:#2563EB;
            border-radius:10px;
            letter-spacing:0.3px;
            text-align:center;
            -webkit-text-size-adjust:none;
          "
        >
          💳 Pay &amp; Renew Now (${formattedAmount} - ${resolvedPlanName}) &rarr;
        </a>
      </td>
    </tr>
  </table>

  <!-- Direct Plain-Text Renewal Link -->
  <div style="margin-top:14px;margin-bottom:6px;font-size:12px;line-height:18px;color:#6B7280;text-align:center;">
    Can't click the button? Copy and paste this renewal link into your browser:<br>
    <a href="${quickRenewUrl}" target="_blank" style="color:#2563EB;word-break:break-all;font-size:12px;text-decoration:underline;font-weight:600;">${quickRenewUrl}</a>
  </div>

  

  <!-- Optional Secondary CTA: Choose / Upgrade Different Plan (Uncomment to enable in future)
  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:14px auto 0 auto;width:100%;max-width:420px;">
    <tr>
      <td align="center" bgcolor="#0D9488" style="border-radius:10px;background-color:#0D9488;box-shadow:0 3px 10px rgba(13,148,136,0.25);">
        <a
          href="${upgradeUrl}"
          target="_blank"
          style="
            display:block;
            padding:14px 28px;
            font-family:Arial,Helvetica,sans-serif;
            font-size:15px;
            font-weight:700;
            color:#FFFFFF !important;
            text-decoration:none;
            background-color:#0D9488;
            border-radius:10px;
            letter-spacing:0.3px;
            text-align:center;
            -webkit-text-size-adjust:none;
          "
        >
          🚀 Choose / Upgrade Different Plan &rarr;
        </a>
      </td>
    </tr>
  </table>
  -->

  <!-- Trust & Security Details Note -->
  <div style="margin-top:16px;padding:12px 16px;background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;max-width:420px;text-align:center;">
    <div style="font-size:12px;font-weight:600;color:#1F2937;margin-bottom:4px;">
      🔒 100% Secure Checkout powered by Cashfree Payments
    </div>
    <div style="font-size:11px;color:#6B7280;line-height:16px;">
      Pay <strong>${formattedAmount}</strong> (${formattedBasePrice} - ${formattedCredit} credit for ${remainingDays} remaining days) securely via UPI (GPay, PhonePe, Paytm), Cards &amp; NetBanking. Instantly returns to your <strong>Hotel Login</strong> portal.
    </div>
  </div>
</td>
</tr>



<!-- FOOTER -->
<tr>
<td style="padding-top:40px;">

  <div
    style="
      border-top:1px solid #F0F0F0;
      padding-top:18px;
      font-size:12px;
      line-height:19px;
      color:#9CA3AF;
    "
  >
    <strong style="color:#6B7280;">
      StayLio
    </strong>
    · Hotel Management Platform
    <br>
    If you have already renewed,
    you can safely ignore this email.
  </div>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;

  return { subject, text, html };
};

// ============================================================
// 3B. SUBSCRIPTION EXPIRY REMINDER
// ============================================================
const sendSubscriptionExpiryReminder = async ({
  to,
  hotelName,
  planName,
  endDate,
  daysRemaining,
  hotelId,
  planId,
  billingCycle,
}) => {
  try {
    const resolvedHotelName =
      await getHotelNameFromSettings({
        hotelId,
        hotelName,
      });

    const formattedDate =
      new Date(endDate).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        }
      );

    const frontendBaseUrl =
      getFrontendUrl();

    const upgradeUrl = hotelId
      ? `${frontendBaseUrl}/plan-upgrade?hotelId=${hotelId}`
      : `${frontendBaseUrl}/plan-upgrade`;

    const loginUrl = `${frontendBaseUrl}/hotel-login`;

    // Resolve planId and billingCycle for 1-click renewal token
    let resolvedPlanId = planId;
    let resolvedBillingCycle = billingCycle || "monthly";
    if (resolvedBillingCycle === "trial" || resolvedBillingCycle === "custom") {
      resolvedBillingCycle = "monthly";
    }
    if (!resolvedPlanId && hotelId) {
      const latestSub = await Subscription.findOne({ hotelId })
        .sort({ createdAt: -1 })
        .select("planId billingCycle")
        .lean();
      if (latestSub?.planId) {
        resolvedPlanId = latestSub.planId;
        if (latestSub.billingCycle && latestSub.billingCycle !== "trial" && latestSub.billingCycle !== "custom") {
          resolvedBillingCycle = latestSub.billingCycle;
        }
      }
    }

    let planDoc = null;
    if (resolvedPlanId) {
      planDoc = await Plans.findById(resolvedPlanId).lean();
    }
    if (!planDoc) {
      planDoc = await Plans.findOne().sort({ price: 1 }).lean();
      if (planDoc?._id) {
        resolvedPlanId = planDoc._id;
      }
    }

    const resolvedPlanName = planDoc?.planName || planName || "Subscription Plan";
    const cycle = resolvedBillingCycle || "monthly";
    const cycleLabel = cycle.charAt(0).toUpperCase() + cycle.slice(1);

    // Calculate plan amount
    let basePrice =
      planDoc?.pricing?.[cycle] ??
      planDoc?.pricing?.monthly ??
      planDoc?.price ??
      999;
    if (basePrice <= 0) {
      basePrice = 999;
    }

    // Determine cycle duration days
    let totalDays = 30;
    if (cycle === "quarterly") totalDays = 90;
    else if (cycle === "halfYearly") totalDays = 180;
    else if (cycle === "yearly") totalDays = 365;
    else if (planDoc?.validityDays) totalDays = planDoc.validityDays;

    const remainingDays = Math.max(0, Number(daysRemaining) || 0);
    const perDayCost = Number((basePrice / totalDays).toFixed(2));
    const unusedCredit = Number(Math.min(basePrice, perDayCost * remainingDays).toFixed(2));
    const discountedPrice = Math.max(1, Number((basePrice - unusedCredit).toFixed(2)));

    let taxEnabled = false;
    if (hotelId) {
      const hotelDoc = await Hotels.findById(hotelId).select("taxEnabled").lean();
      taxEnabled = Boolean(hotelDoc?.taxEnabled);
    }
    const taxRate = taxEnabled ? 0.18 : 0;
    const taxAmount = Number((discountedPrice * taxRate).toFixed(2));
    const totalPayableAmount = Number((discountedPrice + taxAmount).toFixed(2));
    const formattedAmount = `₹${totalPayableAmount.toLocaleString("en-IN")}`;
    const formattedBasePrice = `₹${basePrice.toLocaleString("en-IN")}`;
    const formattedCredit = `₹${unusedCredit.toLocaleString("en-IN")}`;

    let quickRenewUrl = upgradeUrl;
    if (hotelId && resolvedPlanId) {
      // Cascading validity:
      // - 7-day reminder valid for 4 days (until 3-day reminder is sent)
      // - 3-day reminder valid for 2 days (until 1-day reminder is sent)
      // - 1-day reminder valid for 1 day (until expiry)
      let reminderStage = "7d";
      let expiresInDays = 4;
      if (daysRemaining <= 1) {
        reminderStage = "1d";
        expiresInDays = 1;
      } else if (daysRemaining <= 3) {
        reminderStage = "3d";
        expiresInDays = 2;
      } else {
        reminderStage = "7d";
        expiresInDays = Math.max(1, daysRemaining - 3);
      }

      const renewToken = generateRenewalToken({
        hotelId: String(hotelId),
        planId: String(resolvedPlanId),
        billingCycle: resolvedBillingCycle,
        reminderStage,
        expiresInDays,
      });
      quickRenewUrl = `${getBackendApiUrl()}/payments/quick-renew?token=${renewToken}`;
    }

    let subject =
      `Subscription Reminder: Plan expiring soon for ${resolvedHotelName}`;

    let urgencyColor = "#D97706";

    let urgencyText =
      `Your subscription will expire in ${daysRemaining} day${daysRemaining > 1 ? "s" : ""
      }.`;

    if (daysRemaining <= 1) {
      subject =
        `Subscription Reminder: 1 day left for ${resolvedHotelName}`;

      urgencyColor = "#B42318";

      urgencyText =
        "Your subscription expires tomorrow. Please renew today to keep your hotel system running smoothly.";

    } else if (daysRemaining <= 3) {
      subject =
        `Subscription Reminder: ${daysRemaining} days left for ${resolvedHotelName}`;

      urgencyColor = "#C2410C";

      urgencyText =
        `Your subscription will expire in ${daysRemaining} days. Please renew soon to avoid any stoppage.`;

    } else if (daysRemaining <= 7) {
      subject =
        `Subscription Reminder: ${daysRemaining} days left for ${resolvedHotelName}`;

      urgencyColor = "#0875D1";

      urgencyText =
        `Your subscription will expire in ${daysRemaining} days.`;
    }

    const templateIdentifier = `reminder-${daysRemaining}d`;
    log.info(
      `[EMAIL-DISPATCH] Starting reminder email dispatch | Function: sendSubscriptionExpiryReminder | Template: ${templateIdentifier} | Recipient: ${to} | Hotel: ${resolvedHotelName} (hotelId: ${hotelId || "N/A"}) | Plan: ${resolvedPlanName} (${cycleLabel}) | DaysLeft: ${daysRemaining} | Payable: ${formattedAmount} | QuickRenewUrl: ${quickRenewUrl}`
    );

    const emailContent = renderSubscriptionReminderTemplate({
      resolvedHotelName,
      resolvedPlanName,
      cycleLabel,
      formattedDate,
      daysRemaining,
      formattedBasePrice,
      formattedCredit,
      remainingDays,
      formattedAmount,
      taxAmount,
      quickRenewUrl,
      upgradeUrl,
      urgencyText,
      urgencyColor,
      subject,
    });

    await transporter.sendMail({
      from: `"StayLio" <${process.env.SMTP_USER}>`,
      to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    log.info(
      `[EMAIL-DISPATCH-SUCCESS] Expiry reminder sent | Function: sendSubscriptionExpiryReminder | Template: ${templateIdentifier} | Recipient: ${to} | Hotel: ${resolvedHotelName} (hotelId: ${hotelId || "N/A"}) | DaysLeft: ${daysRemaining}`
    );
  } catch (error) {
    console.error(
      "Error sending subscription expiry reminder:",
      error
    );

    log.error(
      `[EMAIL-DISPATCH-FAILED] Failed to send expiry reminder | Function: sendSubscriptionExpiryReminder | Template: ${templateIdentifier || "reminder-unknown"} | Recipient: ${to}: ${error.message}`
    );

    throw error;
  }
};


// ============================================================
// 4. SUBSCRIPTION EXPIRED NOTIFICATION
// ============================================================
const sendSubscriptionExpiredNotification = async ({
  to,
  hotelName,
  planName,
  endDate,
  hotelId,
  planId,
  billingCycle,
}) => {
  try {
    const resolvedHotelName =
      await getHotelNameFromSettings({
        hotelId,
        hotelName,
      });

    const formattedDate =
      new Date(endDate).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        }
      );

    const frontendBaseUrl =
      getFrontendUrl();

    const upgradeUrl = hotelId
      ? `${frontendBaseUrl}/plan-upgrade?hotelId=${hotelId}`
      : `${frontendBaseUrl}/plan-upgrade`;

    const loginUrl = `${frontendBaseUrl}/hotel-login`;

    // Resolve planId and billingCycle for 1-click renewal token
    let resolvedPlanId = planId;
    let resolvedBillingCycle = billingCycle || "monthly";
    if (resolvedBillingCycle === "trial" || resolvedBillingCycle === "custom") {
      resolvedBillingCycle = "monthly";
    }
    if (!resolvedPlanId && hotelId) {
      const latestSub = await Subscription.findOne({ hotelId })
        .sort({ createdAt: -1 })
        .select("planId billingCycle")
        .lean();
      if (latestSub?.planId) {
        resolvedPlanId = latestSub.planId;
        if (latestSub.billingCycle && latestSub.billingCycle !== "trial" && latestSub.billingCycle !== "custom") {
          resolvedBillingCycle = latestSub.billingCycle;
        }
      }
    }

    let planDoc = null;
    if (resolvedPlanId) {
      planDoc = await Plans.findById(resolvedPlanId).lean();
    }
    if (!planDoc) {
      planDoc = await Plans.findOne().sort({ price: 1 }).lean();
      if (planDoc?._id) {
        resolvedPlanId = planDoc._id;
      }
    }

    const resolvedPlanName = planDoc?.planName || planName || "Subscription Plan";
    const cycle = resolvedBillingCycle || "monthly";
    const cycleLabel = cycle.charAt(0).toUpperCase() + cycle.slice(1);

    // Calculate plan amount
    let basePrice =
      planDoc?.pricing?.[cycle] ??
      planDoc?.pricing?.monthly ??
      planDoc?.price ??
      999;
    if (basePrice <= 0) {
      basePrice = 999;
    }

    let taxEnabled = false;
    if (hotelId) {
      const hotelDoc = await Hotels.findById(hotelId).select("taxEnabled").lean();
      taxEnabled = Boolean(hotelDoc?.taxEnabled);
    }
    const taxRate = taxEnabled ? 0.18 : 0;
    const taxAmount = Number((basePrice * taxRate).toFixed(2));
    const totalPayableAmount = Number((basePrice + taxAmount).toFixed(2));
    const formattedAmount = `₹${totalPayableAmount.toLocaleString("en-IN")}`;

    let quickRenewUrl = upgradeUrl;
    if (hotelId && resolvedPlanId) {
      const renewToken = generateRenewalToken({
        hotelId: String(hotelId),
        planId: String(resolvedPlanId),
        billingCycle: resolvedBillingCycle,
        reminderStage: "expired",
        expiresInDays: 10,
      });
      quickRenewUrl = `${getBackendApiUrl()}/payments/quick-renew?token=${renewToken}`;
    }

    const templateIdentifier = "subscription-expired";
    log.info(
      `[EMAIL-DISPATCH] Starting expired email dispatch | Function: sendSubscriptionExpiredNotification | Template: ${templateIdentifier} | Recipient: ${to} | Hotel: ${resolvedHotelName} (hotelId: ${hotelId || "N/A"}) | Plan: ${resolvedPlanName} (${cycleLabel}) | QuickRenewUrl: ${quickRenewUrl}`
    );

    await transporter.sendMail({
      from: `"StayLio" <${process.env.SMTP_USER}>`,
      to,
      subject:
        `Subscription Expired for ${resolvedHotelName}`,

      text: `Hello ${resolvedHotelName},

Your hotel subscription plan expired on ${formattedDate}.

Hotel Name: ${resolvedHotelName}
Plan: ${resolvedPlanName} (${cycleLabel})
Expired On: ${formattedDate}
Plan Amount to Pay: ${formattedAmount}${taxAmount > 0 ? " (incl. 18% GST)" : ""}

Your account features are currently paused. Please renew your plan now to continue using all hotel features.

Pay & Renew Now: ${quickRenewUrl}

Thank you,
StayLio Team`,

      html: `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
  <title>Subscription Expired</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#ffffff;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
>
<tr>

<td
  align="center"
  style="padding:40px 20px;"
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="max-width:560px;width:100%;"
>

<!-- BRAND -->
<tr>
<td style="padding-bottom:34px;">

  <div
    style="
      font-size:24px;
      line-height:30px;
      font-weight:700;
      color:#111827;
    "
  >
    StayLio
  </div>

  <div
    style="
      margin-top:4px;
      font-size:12px;
      color:#6B7280;
    "
  >
    Hotel Management Platform
  </div>

</td>
</tr>


<!-- TITLE -->
<tr>
<td>

  <div
    style="
      font-size:26px;
      line-height:34px;
      font-weight:700;
      color:#111827;
      margin-bottom:12px;
    "
  >
    Your plan has expired
  </div>

  <div
    style="
      font-size:15px;
      line-height:23px;
      color:#4B5563;
      margin-bottom:8px;
    "
  >
    Hello
    <strong style="color:#111827;">
      ${resolvedHotelName}
    </strong>,
  </div>

  <div
    style="
      font-size:15px;
      line-height:23px;
      color:#4B5563;
      margin-bottom:26px;
    "
  >
    Your subscription plan expired on
    <strong style="color:#111827;">
      ${formattedDate}
    </strong>.
    Your hotel features are temporarily paused.
  </div>

</td>
</tr>


<!-- DETAILS -->
<tr>
<td>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    border:1px solid #E5E7EB;
    background:#FFFFFF;
  "
>

<tr>
<td style="padding:18px 16px;">

  <div
    style="
      font-size:12px;
      line-height:18px;
      font-weight:700;
      color:#6B7280;
      text-transform:uppercase;
      letter-spacing:.5px;
      margin-bottom:14px;
    "
  >
    Previous subscription
  </div>


  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
  >

    <tr>

      <td
        style="
          font-size:13px;
          color:#6B7280;
          padding:7px 0;
        "
      >
        Hotel Name
      </td>

      <td
        align="right"
        style="
          font-size:14px;
          font-weight:600;
          color:#111827;
          padding:7px 0;
        "
      >
        ${resolvedHotelName}
      </td>

    </tr>


    <tr>

      <td
        style="
          border-top:1px solid #F0F0F0;
          font-size:13px;
          color:#6B7280;
          padding:10px 0 7px;
        "
      >
        Previous Plan
      </td>

      <td
        align="right"
        style="
          border-top:1px solid #F0F0F0;
          font-size:14px;
          font-weight:600;
          color:#111827;
          padding:10px 0 7px;
        "
      >
        ${resolvedPlanName} (${cycleLabel})
      </td>

    </tr>


    <tr>

      <td
        style="
          border-top:1px solid #F0F0F0;
          font-size:13px;
          color:#6B7280;
          padding:10px 0 7px;
        "
      >
        Expired Date
      </td>

      <td
        align="right"
        style="
          border-top:1px solid #F0F0F0;
          font-size:14px;
          font-weight:700;
          color:#B42318;
          padding:10px 0 7px;
        "
      >
        ${formattedDate}
      </td>

    </tr>


    <tr>

      <td
        style="
          border-top:1px solid #F0F0F0;
          font-size:13px;
          color:#6B7280;
          padding:10px 0 7px;
        "
      >
        Plan Amount to Pay
      </td>

      <td
        align="right"
        style="
          border-top:1px solid #F0F0F0;
          font-size:16px;
          font-weight:700;
          color:#16A34A;
          padding:10px 0 7px;
        "
      >
        ${formattedAmount}
        ${taxAmount > 0 ? '<div style="font-size:11px;font-weight:normal;color:#6B7280;">(incl. 18% GST)</div>' : ''}
      </td>

    </tr>

  </table>

</td>
</tr>

</table>

</td>
</tr>


<!-- MESSAGE -->
<tr>
<td style="padding-top:24px;">

  <div
    style="
      font-size:14px;
      line-height:22px;
      color:#4B5563;
    "
  >
    Your hotel data, guest records, and invoices
    remain safely stored. Renew your plan now to restart
    your hotel service.
  </div>

</td>
</tr>


<!-- BUTTONS SECTION -->
<tr>
<td align="center" style="padding-top:28px;padding-bottom:12px;">

  <!-- Primary CTA: 1-Click Direct Cashfree Pay & Renew -->
  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;width:100%;max-width:420px;">
    <tr>
      <td align="center" bgcolor="#2563EB" style="border-radius:10px;background-color:#2563EB;box-shadow:0 4px 14px rgba(37,99,235,0.30);">
        <a
          href="${quickRenewUrl}"
          target="_blank"
          style="
            display:block;
            padding:16px 28px;
            font-family:Arial,Helvetica,sans-serif;
            font-size:16px;
            font-weight:700;
            color:#FFFFFF !important;
            text-decoration:none;
            background-color:#2563EB;
            border-radius:10px;
            letter-spacing:0.3px;
            text-align:center;
            -webkit-text-size-adjust:none;
          "
        >
          💳 Pay &amp; Renew Now (${formattedAmount} - ${resolvedPlanName}) &rarr;
        </a>
      </td>
    </tr>
  </table>

  <!-- Direct Plain-Text Renewal Link -->
  <div style="margin-top:14px;margin-bottom:6px;font-size:12px;line-height:18px;color:#6B7280;text-align:center;">
    Can't click the button? Copy and paste this renewal link into your browser:<br>
    <a href="${quickRenewUrl}" target="_blank" style="color:#2563EB;word-break:break-all;font-size:12px;text-decoration:underline;font-weight:600;">${quickRenewUrl}</a>
  </div>

  <!-- Optional Secondary CTA: Choose / Upgrade Plan (Uncomment to enable in future)
  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:14px auto 0 auto;width:100%;max-width:420px;">
    <tr>
      <td align="center" bgcolor="#0D9488" style="border-radius:10px;background-color:#0D9488;box-shadow:0 3px 10px rgba(13,148,136,0.25);">
        <a
          href="${upgradeUrl}"
          target="_blank"
          style="
            display:block;
            padding:14px 28px;
            font-family:Arial,Helvetica,sans-serif;
            font-size:15px;
            font-weight:700;
            color:#FFFFFF !important;
            text-decoration:none;
            background-color:#0D9488;
            border-radius:10px;
            letter-spacing:0.3px;
            text-align:center;
            -webkit-text-size-adjust:none;
          "
        >
          🚀 Choose / Upgrade Different Plan &rarr;
        </a>
      </td>
    </tr>
  </table>
  -->

  <!-- Trust & Security Details Note -->
  <div style="margin-top:16px;padding:12px 16px;background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;max-width:420px;text-align:center;">
    <div style="font-size:12px;font-weight:600;color:#1F2937;margin-bottom:4px;">
      🔒 100% Secure Checkout powered by Cashfree Payments
    </div>
    <div style="font-size:11px;color:#6B7280;line-height:16px;">
      Pay <strong>${formattedAmount}</strong> securely via UPI (GPay, PhonePe, Paytm), Cards &amp; NetBanking. Instantly returns to your <strong>Hotel Login</strong> upon payment.
    </div>
  </div>
</td>
</tr>


<!-- FOOTER -->
<tr>
<td style="padding-top:40px;">

  <div
    style="
      border-top:1px solid #F0F0F0;
      padding-top:18px;
      font-size:12px;
      line-height:19px;
      color:#9CA3AF;
    "
  >
    <strong style="color:#6B7280;">
      StayLio
    </strong>
    · Hotel Management Platform
    <br>
    Need help? Please contact your administrator.
  </div>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`,
    });

    log.info(
      `[EMAIL-DISPATCH-SUCCESS] Subscription expired notification sent | Function: sendSubscriptionExpiredNotification | Template: ${templateIdentifier} | Recipient: ${to} | Hotel: ${resolvedHotelName} (hotelId: ${hotelId || "N/A"})`
    );
  } catch (error) {
    console.error(
      "Error sending subscription expired notification:",
      error
    );

    log.error(
      `[EMAIL-DISPATCH-FAILED] Failed to send expiry notification | Function: sendSubscriptionExpiredNotification | Template: ${templateIdentifier || "subscription-expired"} | Recipient: ${to}: ${error.message}`
    );

    throw error;
  }
};


// ============================================================
// 5. SUBSCRIPTION CANCELLED / SUSPENDED NOTIFICATION
// ============================================================
const sendSubscriptionCancelledNotification = async ({
  to,
  hotelName,
  planName,
  reason,
  status = "cancelled",
  hotelId,
  planId,
  billingCycle,
}) => {
  try {
    const resolvedHotelName =
      await getHotelNameFromSettings({
        hotelId,
        hotelName,
      });

    const frontendBaseUrl =
      getFrontendUrl();

    const upgradeUrl = hotelId
      ? `${frontendBaseUrl}/plan-upgrade?hotelId=${hotelId}`
      : `${frontendBaseUrl}/plan-upgrade`;

    const loginUrl = `${frontendBaseUrl}/hotel-login`;

    // Resolve planId and billingCycle for 1-click renewal token
    let resolvedPlanId = planId;
    let resolvedBillingCycle = billingCycle || "monthly";
    if (resolvedBillingCycle === "trial") {
      resolvedBillingCycle = "monthly";
    }
    if (!resolvedPlanId && hotelId) {
      const latestSub = await Subscription.findOne({ hotelId })
        .sort({ createdAt: -1 })
        .select("planId billingCycle")
        .lean();
      if (latestSub?.planId) {
        resolvedPlanId = latestSub.planId;
        resolvedBillingCycle = latestSub.billingCycle || "monthly";
        if (resolvedBillingCycle === "trial") {
          resolvedBillingCycle = "monthly";
        }
      }
    }

    if (!resolvedPlanId) {
      const defaultPlan = await Plans.findOne().sort({ price: 1 }).lean();
      if (defaultPlan?._id) {
        resolvedPlanId = defaultPlan._id;
      }
    }

    let quickRenewUrl = upgradeUrl;
    if (hotelId && resolvedPlanId) {
      const renewToken = generateRenewalToken({
        hotelId: String(hotelId),
        planId: String(resolvedPlanId),
        billingCycle: resolvedBillingCycle,
        expiresInDays: 10,
      });
      quickRenewUrl = `${getBackendApiUrl()}/payments/quick-renew?token=${renewToken}`;
    }

    const isSuspended =
      status === "suspended";

    const statusTitle =
      isSuspended
        ? "Subscription Suspended"
        : "Subscription Cancelled";

    const statusWord =
      isSuspended
        ? "suspended"
        : "cancelled";

    const subject =
      `Subscription ${isSuspended
        ? "Suspended"
        : "Cancelled"
      } for ${resolvedHotelName}`;

    const defaultReason =
      isSuspended
        ? "Subscription temporarily paused by administrator."
        : "Subscription cancelled by system administrator.";

    const formattedReason =
      reason?.trim()
        ? reason.trim()
        : defaultReason;

    const templateIdentifier = `subscription-${status || "cancelled"}`;
    log.info(
      `[EMAIL-DISPATCH] Starting status email dispatch | Function: sendSubscriptionCancelledNotification | Template: ${templateIdentifier} | Recipient: ${to} | Hotel: ${resolvedHotelName} (hotelId: ${hotelId || "N/A"}) | Status: ${status} | QuickRenewUrl: ${quickRenewUrl}`
    );

    await transporter.sendMail({
      from: `"StayLio" <${process.env.SMTP_USER}>`,
      to,
      subject,

      text: `Hello ${resolvedHotelName},

Your hotel subscription has been ${statusWord} by the administrator.

Hotel Name: ${resolvedHotelName}
Plan: ${planName || "Current Plan"}
Status: ${statusWord}
Reason: ${formattedReason}

To restore your hotel operations, please renew and reactivate your subscription.

Pay & Reactivate Now: ${quickRenewUrl}

Thank you,
StayLio Team`,

      html: `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
  <title>${statusTitle}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#ffffff;
    font-family:Arial,Helvetica,sans-serif;
    color:#111827;
  "
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
>
<tr>

<td
  align="center"
  style="padding:40px 20px;"
>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="max-width:560px;width:100%;"
>

<!-- BRAND -->
<tr>
<td style="padding-bottom:34px;">

  <div
    style="
      font-size:24px;
      line-height:30px;
      font-weight:700;
      color:#111827;
    "
  >
    StayLio
  </div>

  <div
    style="
      margin-top:4px;
      font-size:12px;
      color:#6B7280;
    "
  >
    Hotel Management Platform
  </div>

</td>
</tr>


<!-- TITLE -->
<tr>
<td>

  <div
    style="
      font-size:26px;
      line-height:34px;
      font-weight:700;
      color:#111827;
      margin-bottom:12px;
    "
  >
    ${statusTitle}
  </div>

  <div
    style="
      font-size:15px;
      line-height:23px;
      color:#4B5563;
      margin-bottom:8px;
    "
  >
    Hello
    <strong style="color:#111827;">
      ${resolvedHotelName}
    </strong>,
  </div>

  <div
    style="
      font-size:15px;
      line-height:23px;
      color:#4B5563;
      margin-bottom:26px;
    "
  >
    Your hotel subscription has been
    <strong style="color:#111827;">
      ${statusWord}
    </strong>
    by the administrator.
  </div>

</td>
</tr>


<!-- DETAILS -->
<tr>
<td>

<table
  width="100%"
  cellpadding="0"
  cellspacing="0"
  border="0"
  style="
    border:1px solid #E5E7EB;
    background:#FFFFFF;
  "
>

<tr>
<td style="padding:18px 16px;">

  <div
    style="
      font-size:12px;
      line-height:18px;
      font-weight:700;
      color:#6B7280;
      text-transform:uppercase;
      letter-spacing:.5px;
      margin-bottom:14px;
    "
  >
    Subscription details
  </div>


  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
  >

    <tr>

      <td
        style="
          font-size:13px;
          color:#6B7280;
          padding:7px 0;
        "
      >
        Hotel Name
      </td>

      <td
        align="right"
        style="
          font-size:14px;
          font-weight:600;
          color:#111827;
          padding:7px 0;
        "
      >
        ${resolvedHotelName}
      </td>

    </tr>


    <tr>

      <td
        style="
          border-top:1px solid #F0F0F0;
          font-size:13px;
          color:#6B7280;
          padding:10px 0 7px;
        "
      >
        Previous Plan
      </td>

      <td
        align="right"
        style="
          border-top:1px solid #F0F0F0;
          font-size:14px;
          font-weight:600;
          color:#111827;
          padding:10px 0 7px;
        "
      >
        ${planName || "Subscription Plan"}
      </td>

    </tr>


    <tr>

      <td
        style="
          border-top:1px solid #F0F0F0;
          font-size:13px;
          color:#6B7280;
          padding:10px 0 7px;
        "
      >
        Status
      </td>

      <td
        align="right"
        style="
          border-top:1px solid #F0F0F0;
          font-size:14px;
          font-weight:700;
          color:#B42318;
          padding:10px 0 7px;
          text-transform:capitalize;
        "
      >
        ${statusWord}
      </td>

    </tr>


    <tr>

      <td
        colspan="2"
        style="
          border-top:1px solid #F0F0F0;
          padding-top:14px;
        "
      >

        <div
          style="
            font-size:12px;
            line-height:18px;
            font-weight:700;
            color:#6B7280;
            margin-bottom:7px;
          "
        >
          Reason
        </div>

        <div
          style="
            font-size:13px;
            line-height:20px;
            color:#4B5563;
          "
        >
          ${formattedReason}
        </div>

      </td>

    </tr>

  </table>

</td>
</tr>

</table>

</td>
</tr>


<!-- MESSAGE -->
<tr>
<td style="padding-top:24px;">

  <div
    style="
      font-size:14px;
      line-height:22px;
      color:#4B5563;
    "
  >
    You can reactivate your account at any time
    by renewing your plan. Your records and data
    remain safely saved.
  </div>

</td>
</tr>



<!-- BUTTON -->
<tr>
<td align="center" style="padding-top:28px;padding-bottom:12px;">
  <table border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td align="center" bgcolor="#2563EB" style="border-radius:10px;">
        <a
          href="${quickRenewUrl}"
          target="_blank"
          style="
            display:inline-block;
            padding:14px 38px;
            font-family:Arial,Helvetica,sans-serif;
            font-size:15px;
            font-weight:700;
            color:#FFFFFF;
            text-decoration:none;
            background-color:#2563EB;
            border-radius:10px;
            letter-spacing:0.3px;
          "
        >
          ⚡ Pay &amp; Reactivate Subscription &rarr;
        </a>
      </td>
    </tr>
  </table>

  <!-- Direct Plain-Text Renewal Link -->
  <div style="margin-top:14px;margin-bottom:6px;font-size:12px;line-height:18px;color:#6B7280;text-align:center;">
    Can't click the button? Copy and paste this reactivation link into your browser:<br>
    <a href="${quickRenewUrl}" target="_blank" style="color:#2563EB;word-break:break-all;font-size:12px;text-decoration:underline;font-weight:600;">${quickRenewUrl}</a>
  </div>

  <!-- Optional Secondary CTA: Choose / Upgrade Plan (Uncomment to enable in future)
  <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:14px auto 0 auto;width:100%;max-width:420px;">
    <tr>
      <td align="center" bgcolor="#0D9488" style="border-radius:10px;background-color:#0D9488;box-shadow:0 3px 10px rgba(13,148,136,0.25);">
        <a
          href="${upgradeUrl}"
          target="_blank"
          style="
            display:block;
            padding:14px 28px;
            font-family:Arial,Helvetica,sans-serif;
            font-size:15px;
            font-weight:700;
            color:#FFFFFF !important;
            text-decoration:none;
            background-color:#0D9488;
            border-radius:10px;
            letter-spacing:0.3px;
            text-align:center;
            -webkit-text-size-adjust:none;
          "
        >
          🚀 Choose / Upgrade Different Plan &rarr;
        </a>
      </td>
    </tr>
  </table>
  -->
  <div style="margin-top:10px;font-size:12px;color:#9CA3AF;text-align:center;">
    Instant account reactivation powered by Cashfree (UPI, Cards &amp; NetBanking)
  </div>
</td>
</tr>


<!-- FOOTER -->
<tr>
<td style="padding-top:40px;">

  <div
    style="
      border-top:1px solid #F0F0F0;
      padding-top:18px;
      font-size:12px;
      line-height:19px;
      color:#9CA3AF;
    "
  >
    <strong style="color:#6B7280;">
      StayLio
    </strong>
    · Hotel Management Platform
    <br>
    If you have any questions,
    please contact your administrator.
  </div>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`,
    });

    log.info(
      `[EMAIL-DISPATCH-SUCCESS] Subscription ${status} notification sent | Function: sendSubscriptionCancelledNotification | Template: ${templateIdentifier} | Recipient: ${to} | Hotel: ${resolvedHotelName} (hotelId: ${hotelId || "N/A"})`
    );
  } catch (error) {
    console.error(
      "Error sending subscription cancelled notification:",
      error
    );

    log.error(
      `[EMAIL-DISPATCH-FAILED] Failed to send subscription cancelled notification | Function: sendSubscriptionCancelledNotification | Template: ${templateIdentifier || "subscription-status"} | Recipient: ${to}: ${error.message}`
    );

    throw error;
  }
};

// ============================================================
// 6. ADMIN FREE TRIAL NOTIFICATION EMAIL
// ============================================================
const sendAdminFreeTrialNotificationEmail = async ({
  hotel,
  trialDays = 14,
  startDate = new Date(),
  endDate,
}) => {
  try {
    // 1. Fetch Admin Emails
    const adminUsers = await User.find({ role: "admin" })
      .select("email name")
      .lean();

    const recipientEmails = adminUsers
      .map((u) => u.email)
      .filter(Boolean);

    // If no admin in DB, fallback to environment or default
    if (recipientEmails.length === 0) {
      if (process.env.ADMIN_EMAIL) {
        recipientEmails.push(process.env.ADMIN_EMAIL);
      } else if (process.env.SMTP_USER) {
        recipientEmails.push(process.env.SMTP_USER);
      }
    }

    if (recipientEmails.length === 0) {
      log.warn("[EMAIL] No admin recipient email found for free trial notification.");
      return;
    }

    const formatDate = (val) => {
      if (!val) return "";
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const startFormatted = formatDate(startDate);
    const endFormatted = formatDate(endDate);
    const adminHotelsUrl = `${getFrontendUrl()}/saas-admin/hotels`;

    const subject = `New Free Trial Activated: ${hotel.hotelName} (${trialDays} Days)`;

    for (const adminEmail of recipientEmails) {
      await transporter.sendMail({
        from: `"StayLio System" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject,
        text: `Hello Admin,

A new hotel has just activated a ${trialDays}-day Free Trial plan on StayLio.

Hotel Details:
- Hotel Name: ${hotel.hotelName}
- Owner Name: ${hotel.ownerName}
- Email: ${hotel.email}
- Phone: ${hotel.phone}
- Trial Duration: ${trialDays} Days
- Start Date: ${startFormatted}
- Expiry Date: ${endFormatted}
- Status: Active (Instantly Enabled - No Manual Approval Required)

Unlocked Features:
- Room Booking Management
- Food Service Management
- Room Service Management
- Invoice & Billing Management

View Hotel in SaaS Admin: ${adminHotelsUrl}

Best regards,
StayLio Automated System`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,Helvetica,sans-serif;color:#1E293B;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;padding:40px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#ffffff;border-radius:16px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.04);">
          <!-- HEADER -->
          <tr>
            <td style="padding:32px 32px 24px;background:linear-gradient(135deg, #0B2447 0%, #19376D 100%);color:#ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="display:inline-block;padding:4px 10px;background:rgba(16,185,129,0.25);border:1px solid rgba(16,185,129,0.4);border-radius:20px;font-size:11px;font-weight:700;color:#6EE7B7;text-transform:uppercase;letter-spacing:0.5px;">
                      Free Trial Plan
                    </span>
                    <h1 style="margin:12px 0 6px;font-size:22px;font-weight:800;color:#ffffff;line-height:28px;">
                      New Free Trial Activated
                    </h1>
                    <p style="margin:0;font-size:13px;color:#94A3B8;">
                      A new hotel partner just signed up for a ${trialDays}-day free trial.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:28px 32px;">
              <!-- HOTEL DETAILS CARD -->
              <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin-bottom:24px;">
                <h3 style="margin:0 0 14px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#475569;">
                  Hotel Information
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;line-height:22px;">
                  <tr>
                    <td style="color:#64748B;padding:4px 0;width:130px;">Hotel Name:</td>
                    <td style="font-weight:700;color:#0F172A;padding:4px 0;">${hotel.hotelName}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748B;padding:4px 0;">Owner Name:</td>
                    <td style="font-weight:600;color:#0F172A;padding:4px 0;">${hotel.ownerName}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748B;padding:4px 0;">Email:</td>
                    <td style="font-weight:600;color:#0F172A;padding:4px 0;">
                      <a href="mailto:${hotel.email}" style="color:#2563EB;text-decoration:none;">${hotel.email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="color:#64748B;padding:4px 0;">Phone:</td>
                    <td style="font-weight:600;color:#0F172A;padding:4px 0;">${hotel.phone}</td>
                  </tr>
                  ${hotel.address?.city
            ? `<tr>
                    <td style="color:#64748B;padding:4px 0;">Location:</td>
                    <td style="font-weight:600;color:#0F172A;padding:4px 0;">${[hotel.address.city, hotel.address.state].filter(Boolean).join(", ")}</td>
                  </tr>`
            : ""
          }
                </table>
              </div>

              <!-- TRIAL TIMELINE CARD -->
              <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:20px;margin-bottom:24px;">
                <h3 style="margin:0 0 14px;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;color:#065F46;">
                  Trial Period & Status
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;line-height:22px;">
                  <tr>
                    <td style="color:#047857;padding:4px 0;width:130px;">Duration:</td>
                    <td style="font-weight:800;color:#065F46;padding:4px 0;">${trialDays} Days</td>
                  </tr>
                  <tr>
                    <td style="color:#047857;padding:4px 0;">Start Date:</td>
                    <td style="font-weight:700;color:#065F46;padding:4px 0;">${startFormatted}</td>
                  </tr>
                  <tr>
                    <td style="color:#047857;padding:4px 0;">Expiry Date:</td>
                    <td style="font-weight:700;color:#065F46;padding:4px 0;">${endFormatted}</td>
                  </tr>
                  <tr>
                    <td style="color:#047857;padding:4px 0;">Activation:</td>
                    <td style="font-weight:700;color:#059669;padding:4px 0;">Instant (No Admin Review Required)</td>
                  </tr>
                </table>
              </div>

              <!-- UNLOCKED FEATURES NOTE -->
              <p style="margin:0 0 24px;font-size:12px;line-height:18px;color:#64748B;">
                <strong>Features Unlocked:</strong> Food Service, Room Service, Room Booking & Management, Billing & Invoicing.
              </p>

              <!-- ACTION BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${adminHotelsUrl}" target="_blank" style="display:inline-block;padding:12px 28px;background:#2563EB;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
                      View in SaaS Admin Hotels &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 32px;background:#F1F5F9;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B;text-align:center;">
              StayLio Hotel SaaS System · Automated Admin Notification
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
      });

      log.info(`[EMAIL] Free trial notification email successfully sent to admin ${adminEmail} for hotel ${hotel.hotelName}.`);
    }
  } catch (error) {
    log.error(`[EMAIL] Failed to send admin free trial notification email: ${error.message}`);
  }
};

// ============================================================
// 8. HOTEL BLOCKED / CANCELLED BY ADMIN EMAIL (NO REFUND)
// ============================================================
const sendHotelBlockedEmail = async ({
  to,
  hotelName,
  ownerName,
  reason = "",
  details = "",
}) => {
  try {
    await transporter.sendMail({
      from: `"StayLio Administration" <${process.env.SMTP_USER}>`,
      to,
      subject: `Account Notice: Hotel Account Suspended - ${hotelName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Hotel Account Suspended</title>
</head>
<body style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#F8FAFC;margin:0;padding:24px 12px;color:#0F172A;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="600" border="0" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #E2E8F0;">
          <!-- HEADER -->
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,#0F172A 0%,#334155 100%);color:#ffffff;">
              <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">StayLio Platform Administration</h1>
              <p style="margin:6px 0 0;font-size:13px;color:#CBD5E1;font-weight:500;">Account Status Notice</p>
            </td>
          </tr>
          <!-- BODY -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#1E293B;">
                Dear <strong>${ownerName || "Hotel Owner"}</strong>,
              </p>
              <p style="margin:0 0 20px;font-size:14px;line-height:22px;color:#475569;">
                This email is to notify you that your hotel account for <strong>${hotelName}</strong> has been <strong>suspended / blocked</strong> by the platform administrator.
              </p>

              <!-- NOTICE CARD -->
              <div style="background:#F1F5F9;border:1px solid #CBD5E1;border-radius:12px;padding:20px;margin-bottom:24px;">
                <h3 style="margin:0 0 14px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#334155;">
                  Suspension Summary
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;line-height:22px;">
                  <tr>
                    <td style="color:#64748B;padding:4px 0;width:140px;">Hotel Name:</td>
                    <td style="font-weight:600;color:#0F172A;padding:4px 0;">${hotelName}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748B;padding:4px 0;">Status:</td>
                    <td style="font-weight:700;color:#DC2626;padding:4px 0;">Blocked by Administrator</td>
                  </tr>
                  ${reason ? `<tr>
                    <td style="color:#64748B;padding:4px 0;">Reason:</td>
                    <td style="font-weight:600;color:#0F172A;padding:4px 0;">${reason}</td>
                  </tr>` : ""}
                  ${details ? `<tr>
                    <td style="color:#64748B;padding:4px 0;">Details:</td>
                    <td style="font-weight:600;color:#0F172A;padding:4px 0;">${details}</td>
                  </tr>` : ""}
                </table>
              </div>

              <p style="margin:0 0 12px;font-size:13px;line-height:20px;color:#475569;">
                All active user sessions for this hotel have been terminated. Future login attempts to the hotel management portal will remain blocked until further notice.
              </p>
              <p style="margin:0;font-size:13px;line-height:20px;color:#64748B;">
                If you believe this suspension was made in error or wish to appeal, please contact the StayLio administration team.
              </p>
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="padding:20px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B;text-align:center;">
              StayLio Hotel Operations · Platform Administration
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
    });
    log.info(`[EMAIL] Hotel blocked notification email successfully sent to ${to} for hotel ${hotelName}.`);
  } catch (err) {
    log.error(`[EMAIL] Failed to send hotel blocked email: ${err.message}`);
  }
};

// ============================================================
// EXPORTS
// ============================================================
export {
  sendOTP,
  sendSubscriptionExpiryReminder,
  renderSubscriptionReminderTemplate,
  sendSubscriptionExpiredNotification,
  sendSubscriptionCancelledNotification,
  sendAdminEmail,
  sendAdminFreeTrialNotificationEmail,
  sendHotelBlockedEmail,
  getBaseUrl,
  getFrontendUrl,
  getBackendApiUrl,
};