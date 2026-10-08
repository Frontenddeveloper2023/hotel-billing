import nodemailer from "nodemailer";
import { log } from "./logger.js";
import Settings from "../models/settings.js";
import Hotels from "../models/hotels.js";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const getFrontendUrl = () => {
  // Auto-detect based on NODE_ENV from backend .env
  if (process.env.NODE_ENV === "production") {
    return "https://webscape.co.in/hotel-billing-system";
  }
  
  return "http://localhost:5173/hotel-billing-system";
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

      text: `Hello ${
        recipientName || "Valued Hotel Partner"
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
// 3. SUBSCRIPTION EXPIRY REMINDER
// ============================================================
const sendSubscriptionExpiryReminder = async ({
  to,
  hotelName,
  planName,
  endDate,
  daysRemaining,
  hotelId,
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
      ? `${frontendBaseUrl}/hotel-billing-system/plan-upgrade?hotelId=${hotelId}`
      : `${frontendBaseUrl}/hotel-billing-system/plan-upgrade`;

    let subject =
      `Subscription Reminder: Plan expiring soon for ${resolvedHotelName}`;

    let urgencyColor = "#D97706";

    let urgencyText =
      `Your subscription will expire in ${daysRemaining} day${
        daysRemaining > 1 ? "s" : ""
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

    await transporter.sendMail({
      from: `"StayLio" <${process.env.SMTP_USER}>`,
      to,
      subject,

      text: `Hello ${resolvedHotelName},

${urgencyText}

Hotel Name: ${resolvedHotelName}
Plan: ${planName || "Current Plan"}
Expiry Date: ${formattedDate}
Days Left: ${daysRemaining} day${
        daysRemaining > 1 ? "s" : ""
      }

Please renew or upgrade your plan now so all hotel rooms and billing keep working without interruption.

Renew or Upgrade here: ${upgradeUrl}

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
      line-height:18px;
      color:#6B7280;
    "
  >
    Hotel Management Platform
  </div>

</td>
</tr>


<!-- CONTENT -->
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
    ${urgencyText}
    Here are your current plan details.
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
        ${planName || "Active Plan"}
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
          font-weight:700;
          color:${urgencyColor};
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
    please renew or upgrade your plan.
  </div>

</td>
</tr>


<!-- BUTTON -->



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
`,
    });

    log.info(
      `[EMAIL] Expiry reminder sent to ${to} for ${resolvedHotelName}. Days remaining: ${daysRemaining}`
    );
  } catch (error) {
    console.error(
      "Error sending subscription expiry reminder:",
      error
    );

    log.error(
      `[EMAIL] Failed to send expiry reminder to ${to}: ${error.message}`
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
      ? `${frontendBaseUrl}/hotel-billing-system/plan-upgrade?hotelId=${hotelId}`
      : `${frontendBaseUrl}/hotel-billing-system/plan-upgrade`;

    await transporter.sendMail({
      from: `"StayLio" <${process.env.SMTP_USER}>`,
      to,
      subject:
        `Subscription Expired for ${resolvedHotelName}`,

      text: `Hello ${resolvedHotelName},

Your hotel subscription plan expired on ${formattedDate}.

Hotel Name: ${resolvedHotelName}
Plan: ${planName || "Current Plan"}
Expired On: ${formattedDate}

Your account features are currently paused. Please renew or upgrade your plan now to continue using all hotel features.

Upgrade or renew here: ${upgradeUrl}

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
    remain safely stored. Choose a plan to restart
    your hotel service.
  </div>

</td>
</tr>


<!-- BUTTON -->
<tr>
<td style="padding-top:26px;">

  <a
    href="${upgradeUrl}"
    target="_blank"
    style="
      color:#0875D1;
      text-decoration:underline;
      font-size:14px;
      line-height:20px;
      font-weight:600;
    "
  >
    Renew or choose a plan &rarr;
  </a>

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
      `[EMAIL] Subscription expired notification sent to ${to} for ${resolvedHotelName}`
    );
  } catch (error) {
    console.error(
      "Error sending subscription expired notification:",
      error
    );

    log.error(
      `[EMAIL] Failed to send expiry notification to ${to}: ${error.message}`
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
      ? `${frontendBaseUrl}/hotel-billing-system/plan-upgrade?hotelId=${hotelId}`
      : `${frontendBaseUrl}/hotel-billing-system/plan-upgrade`;

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
      `Subscription ${
        isSuspended
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

To restore your hotel operations, please choose a plan to restart your subscription.

Choose a plan here: ${upgradeUrl}

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
    by selecting a plan. Your records and data
    remain safely saved.
  </div>

</td>
</tr>


<!-- BUTTON -->
<tr>
<td style="padding-top:26px;">

  <a
    href="${upgradeUrl}"
    target="_blank"
    style="
      color:#0875D1;
      text-decoration:underline;
      font-size:14px;
      line-height:20px;
      font-weight:600;
    "
  >
    Choose a plan &amp; reactivate &rarr;
  </a>

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
      `[EMAIL] Subscription cancelled notification sent to ${to} for ${resolvedHotelName}. Reason: ${formattedReason}`
    );
  } catch (error) {
    console.error(
      "Error sending subscription cancelled notification:",
      error
    );

    log.error(
      `[EMAIL] Failed to send subscription cancelled notification to ${to}: ${error.message}`
    );

    throw error;
  }
};


// ============================================================
// EXPORTS
// ============================================================
export {
  sendOTP,
  sendSubscriptionExpiryReminder,
  sendSubscriptionExpiredNotification,
  sendSubscriptionCancelledNotification,
  sendAdminEmail,
};