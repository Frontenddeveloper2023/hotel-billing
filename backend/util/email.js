import nodemailer from "nodemailer";

import { log } from "./logger.js";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendOTP = async (to, otp) => {
    try {
        await transporter.sendMail({
            from: `"SS Residency" <${process.env.SMTP_USER}>`,
            to,
            subject: 'Your SS Residency Verification Code',

            text: `Your SS Residency verification code is ${otp}. This code is valid for 10 minutes.`,

            html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SS Residency - OTP Verification</title>
</head>

<body style="
    margin: 0;
    padding: 0;
    background-color: #f3f9fa;
    font-family: Arial, Helvetica, sans-serif;
    color: #111827;
">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color: #f3f9fa; padding: 40px 15px;">

    <tr>
        <td align="center">

            <!-- Main Container -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="
                    max-width: 520px;
                    background-color: #ffffff;
                    border: 1px solid #d5e1e4;
                    border-radius: 12px;
                    overflow: hidden;
                ">

                <!-- Header -->
                <tr>
                    <td style="
                        padding: 30px 35px 20px;
                        text-align: left;
                    ">

                        <div style="
                            font-size: 24px;
                            font-weight: 700;
                            color: #065b62;
                            margin-bottom: 22px;
                        ">
                            SS Residency
                        </div>

                        <div style="
                            font-size: 24px;
                            font-weight: 700;
                            color: #111111;
                            margin-bottom: 10px;
                        ">
                            Verification Code
                        </div>

                        <div style="
                            font-size: 14px;
                            line-height: 22px;
                            color: #4b5563;
                        ">
                            Use the verification code below to sign in
                            to your SS Residency account.
                        </div>

                    </td>
                </tr>

                <!-- OTP Section -->
                <tr>
                    <td style="padding: 10px 35px 25px;">

                        <div style="
                            background-color: #f3f9fa;
                            border: 1px solid #d7e6e8;
                            border-radius: 8px;
                            padding: 25px 20px;
                            text-align: center;
                        ">

                            <div style="
                                font-size: 12px;
                                font-weight: 600;
                                color: #52666a;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                                margin-bottom: 12px;
                            ">
                                Your OTP
                            </div>

                            <div style="
                                font-size: 34px;
                                font-weight: 700;
                                letter-spacing: 8px;
                                color: #065b62;
                            ">
                                ${otp}
                            </div>

                        </div>

                    </td>
                </tr>

                <!-- Information -->
                <tr>
                    <td style="padding: 0 35px 25px;">

                        <p style="
                            margin: 0 0 10px;
                            font-size: 14px;
                            line-height: 21px;
                            color: #4b5563;
                        ">
                            This verification code is valid for
                            <strong style="color: #065b62;">5 minutes</strong>.
                        </p>

                        <p style="
                            margin: 0;
                            font-size: 13px;
                            line-height: 20px;
                            color: #6b7280;
                        ">
                            If you did not request this code, you can safely
                            ignore this email.
                        </p>

                    </td>
                </tr>

                <!-- Divider -->
                <tr>
                    <td style="padding: 0 35px;">
                        <div style="
                            height: 1px;
                            background-color: #e5eef0;
                        "></div>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="
                        padding: 22px 35px 28px;
                        text-align: center;
                    ">

                        <div style="
                            font-size: 12px;
                            color: #52666a;
                            margin-bottom: 8px;
                        ">
                            SS Residency Hotel Management • Secured Access
                        </div>

                        <div style="
                            font-size: 12px;
                            color: #718096;
                        ">
                            🔒 Your information is secure and encrypted
                        </div>

                    </td>
                </tr>

            </table>

            <!-- Bottom Text -->
            <div style="
                max-width: 520px;
                padding-top: 18px;
                text-align: center;
                font-size: 11px;
                line-height: 18px;
                color: #8a9a9d;
            ">
                This is an automated email. Please do not reply to this message.
            </div>

        </td>
    </tr>

</table>

</body>
</html>
            `
        });

        log(`OTP sent to ${to}`);

    } catch (error) {
        console.error('Error sending OTP:', error);
        log(`Error sending OTP to ${to}: ${error.message}`);
        throw error;
    }
};



// ============================================================
// ADMIN MANUAL EMAIL
// ============================================================
const sendAdminEmail = async ({
  to,
  recipientName,
  subject,
  message,
}) => {
  try {
    await transporter.sendMail({
      from: `"SS Residency SaaS" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: message,
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${subject}</title>
        </head>

        <body style="
          margin:0;
          padding:0;
          background:#f3f9fa;
          font-family:Arial,Helvetica,sans-serif;
          color:#111827;
        ">

          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="background:#f3f9fa;padding:40px 15px;"
          >
            <tr>
              <td align="center">

                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    max-width:560px;
                    background:#ffffff;
                    border:1px solid #d5e1e4;
                    border-radius:14px;
                    overflow:hidden;
                  "
                >

                  <!-- Header -->
                  <tr>
                    <td style="padding:32px 35px 20px;">
                      <div style="
                        font-size:24px;
                        font-weight:700;
                        color:#065b62;
                        margin-bottom:18px;
                      ">
                        SS Residency
                      </div>

                      <div style="
                        font-size:22px;
                        font-weight:700;
                        color:#111827;
                      ">
                        ${subject}
                      </div>
                    </td>
                  </tr>

                  <!-- Message -->
                  <tr>
                    <td style="padding:10px 35px 30px;">

                      <p style="
                        font-size:14px;
                        line-height:22px;
                        color:#4b5563;
                        margin:0 0 18px;
                      ">
                        Hello <strong>${recipientName || "there"}</strong>,
                      </p>

                      <div style="
                        font-size:14px;
                        line-height:24px;
                        color:#374151;
                        white-space:pre-line;
                      ">
                        ${message}
                      </div>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="
                      padding:22px 35px 28px;
                      text-align:center;
                      border-top:1px solid #e5eef0;
                      background:#fafbfc;
                    ">

                      <div style="
                        font-size:12px;
                        color:#52666a;
                        margin-bottom:6px;
                      ">
                        SS Residency Hotel Management System
                      </div>

                      <div style="
                        font-size:11px;
                        color:#94a3b8;
                      ">
                        This email was sent by the system administrator.
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
    console.error("[EMAIL] Admin email failed:", error);

    log.error(
      `[EMAIL] Failed to send admin email to ${to}: ${error.message}`
    );

    throw error;
  }
};


const getFrontendUrl = () => {
  return (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
};

// ============================================================
// SUBSCRIPTION EXPIRY REMINDER (7 Days, 3 Days, 1 Day)
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
    const formattedDate = new Date(endDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

    const frontendBaseUrl = getFrontendUrl();
    const upgradeUrl = hotelId
      ? `${frontendBaseUrl}/hotel-billing-system/saas-user/choose-plan?hotelId=${hotelId}`
      : `${frontendBaseUrl}/hotel-billing-system/saas-user/choose-plan`;

    let subject = "Your Hotel Billing Plan is Expiring Soon";
    let urgencyBadge = "Expiring Soon";
    let urgencyColor = "#d97706";
    let urgencyBg = "#fffbeb";
    let urgencyText = `Your subscription will expire in ${daysRemaining} day${daysRemaining > 1 ? "s" : ""}.`;

    if (daysRemaining <= 1) {
      subject = `Critical Warning: Your Hotel Billing Plan Expires Tomorrow (${hotelName})`;
      urgencyBadge = "Expires Tomorrow";
      urgencyColor = "#dc2626";
      urgencyBg = "#fef2f2";
      urgencyText = "Your subscription expires tomorrow! Upgrade or renew now to avoid system interruption.";
    } else if (daysRemaining <= 3) {
      subject = `Urgent Reminder: Your Hotel Billing Plan Expires in ${daysRemaining} Days (${hotelName})`;
      urgencyBadge = `${daysRemaining} Days Left`;
      urgencyColor = "#ea580c";
      urgencyBg = "#fff7ed";
      urgencyText = `Your subscription is expiring in only ${daysRemaining} days. Action is required.`;
    } else if (daysRemaining <= 7) {
      subject = `Notice: Your Hotel Billing Plan Expires in ${daysRemaining} Days (${hotelName})`;
      urgencyBadge = `${daysRemaining} Days Left`;
      urgencyColor = "#0284c7";
      urgencyBg = "#f0f9ff";
      urgencyText = `Your subscription is scheduled to expire in ${daysRemaining} days.`;
    }

    await transporter.sendMail({
      from: `"SS Residency SaaS" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: `Hello ${hotelName},\n\n${urgencyText}\n\nHotel: ${hotelName}\nPlan: ${planName || "Current Plan"}\nExpiry Date: ${formattedDate}\nDays Remaining: ${daysRemaining}\n\nPlease renew or upgrade your subscription now to ensure continuous room bookings, billing, and staff operations without interruption.\n\nRenew / Upgrade your plan here: ${upgradeUrl}\n\nThank you,\nSS Residency Team`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f3f9fa;font-family:Arial,Helvetica,sans-serif;color:#111827;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f9fa;padding:40px 15px;">
<tr>
<td align="center">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;background:#ffffff;border:1px solid #d5e1e4;border-radius:14px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.04);">

<tr>
<td style="padding:32px 35px 20px;">
  <div style="font-size:24px;font-weight:700;color:#065b62;margin-bottom:18px;">
    SS Residency
  </div>
  
  <div style="display:inline-block;background:${urgencyBg};border:1px solid ${urgencyColor}40;color:${urgencyColor};padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:14px;">
    ⚠️ ${urgencyBadge}
  </div>

  <div style="font-size:22px;font-weight:700;color:#111111;margin-bottom:10px;">
    Subscription Expiry Reminder
  </div>

  <p style="font-size:14px;line-height:22px;color:#4b5563;margin:0;">
    Hello <strong>${hotelName}</strong>,
  </p>
  <p style="font-size:14px;line-height:22px;color:#4b5563;margin-top:6px;">
    ${urgencyText} Please review your plan details below.
  </p>
</td>
</tr>

<tr>
<td style="padding:5px 35px 25px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
    <tr>
      <td style="padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:4px;">Hotel Name</td>
            <td align="right" style="font-size:14px;font-weight:700;color:#0f172a;padding-bottom:4px;">${hotelName}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:4px;padding-top:8px;border-top:1px solid #f1f5f9;">Current Plan</td>
            <td align="right" style="font-size:14px;font-weight:700;color:#065b62;padding-bottom:4px;padding-top:8px;border-top:1px solid #f1f5f9;">${planName || "Active Plan"}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:4px;padding-top:8px;border-top:1px solid #f1f5f9;">Expiry Date</td>
            <td align="right" style="font-size:14px;font-weight:700;color:${urgencyColor};padding-bottom:4px;padding-top:8px;border-top:1px solid #f1f5f9;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding-top:8px;border-top:1px solid #f1f5f9;">Time Remaining</td>
            <td align="right" style="font-size:14px;font-weight:700;color:${urgencyColor};padding-top:8px;border-top:1px solid #f1f5f9;">${daysRemaining} Day${daysRemaining > 1 ? "s" : ""}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</td>
</tr>

<tr>
<td style="padding:0 35px 30px;text-align:center;">
  <p style="font-size:14px;line-height:22px;color:#4b5563;margin:0 0 22px;text-align:left;">
    To avoid any disruption to your room bookings, check-in operations, food service, or invoice generation, please renew or upgrade your subscription now. Existing hotel details are automatically linked for instant checkout.
  </p>

  <a href="${upgradeUrl}" target="_blank" style="display:inline-block;background:#065b62;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;box-shadow:0 3px 10px rgba(6,91,98,0.25);">
    Renew or Upgrade Plan &rarr;
  </a>
</td>
</tr>

<tr>
<td style="padding:22px 35px 28px;text-align:center;border-top:1px solid #e5eef0;background:#fafbfc;">
  <div style="font-size:12px;color:#52666a;margin-bottom:6px;">
    SS Residency Hotel Management System
  </div>
  <div style="font-size:11px;color:#94a3b8;">
    This is an automated subscription alert. If you already upgraded, you can safely disregard this message.
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
      `[EMAIL] Expiry reminder sent to ${to} for ${hotelName}. Days remaining: ${daysRemaining}`
    );
  } catch (error) {
    console.error("Error sending subscription expiry reminder:", error);
    log.error(`[EMAIL] Failed to send expiry reminder to ${to}: ${error.message}`);
    throw error;
  }
};


// ============================================================
// SUBSCRIPTION EXPIRED NOTIFICATION (Immediately upon Expiry)
// ============================================================
const sendSubscriptionExpiredNotification = async ({
  to,
  hotelName,
  planName,
  endDate,
  hotelId,
}) => {
  try {
    const formattedDate = new Date(endDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

    const frontendBaseUrl = getFrontendUrl();
    const upgradeUrl = hotelId
      ? `${frontendBaseUrl}/hotel-billing-system/saas-user/choose-plan?hotelId=${hotelId}`
      : `${frontendBaseUrl}/hotel-billing-system/saas-user/choose-plan`;

    await transporter.sendMail({
      from: `"SS Residency SaaS" <${process.env.SMTP_USER}>`,
      to,
      subject: `Your Hotel Billing Subscription Has Expired - Action Required (${hotelName})`,
      text: `Hello ${hotelName},\n\nYour hotel management subscription has expired on ${formattedDate}.\n\nHotel: ${hotelName}\nPlan: ${planName || "Current Plan"}\nExpired On: ${formattedDate}\n\nYour active features and room booking capacity are paused until renewal. Please upgrade or renew your plan immediately to restore full access.\n\nUpgrade your plan here: ${upgradeUrl}\n\nThank you,\nSS Residency Team`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Subscription Expired</title>
</head>
<body style="margin:0;padding:0;background:#f3f9fa;font-family:Arial,Helvetica,sans-serif;color:#111827;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f9fa;padding:40px 15px;">
<tr>
<td align="center">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;background:#ffffff;border:1px solid #d5e1e4;border-radius:14px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.04);">

<tr>
<td style="padding:32px 35px 20px;">
  <div style="font-size:24px;font-weight:700;color:#065b62;margin-bottom:18px;">
    SS Residency
  </div>

  <div style="display:inline-block;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:14px;">
    🚫 Subscription Expired
  </div>

  <div style="font-size:22px;font-weight:700;color:#b91c1c;margin-bottom:10px;">
    Your Plan Subscription Has Expired
  </div>

  <p style="font-size:14px;line-height:22px;color:#4b5563;margin:0;">
    Hello <strong>${hotelName}</strong>,
  </p>
  <p style="font-size:14px;line-height:22px;color:#4b5563;margin-top:6px;">
    We are writing to notify you that your hotel management plan has reached its expiration date. System operations and room bookings are currently halted.
  </p>
</td>
</tr>

<tr>
<td style="padding:5px 35px 25px;">
  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:13px;color:#7f1d1d;padding-bottom:4px;">Hotel Name</td>
        <td align="right" style="font-size:14px;font-weight:700;color:#7f1d1d;padding-bottom:4px;">${hotelName}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#7f1d1d;padding-bottom:4px;padding-top:8px;border-top:1px solid #fee2e2;">Expired Plan</td>
        <td align="right" style="font-size:14px;font-weight:700;color:#7f1d1d;padding-bottom:4px;padding-top:8px;border-top:1px solid #fee2e2;">${planName || "Previous Plan"}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#7f1d1d;padding-top:8px;border-top:1px solid #fee2e2;">Expired On</td>
        <td align="right" style="font-size:14px;font-weight:700;color:#b91c1c;padding-top:8px;border-top:1px solid #fee2e2;">${formattedDate}</td>
      </tr>
    </table>
  </div>
</td>
</tr>

<tr>
<td style="padding:0 35px 30px;text-align:center;">
  <p style="font-size:14px;line-height:22px;color:#4b5563;margin:0 0 22px;text-align:left;">
    <strong>How to resume immediately:</strong> Click the button below to select a new plan. Your hotel details are already stored, so you can checkout and activate your upgraded plan in one click without admin waiting time.
  </p>

  <a href="${upgradeUrl}" target="_blank" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;box-shadow:0 3px 10px rgba(220,38,38,0.25);">
    Upgrade & Reactivate Plan Now &rarr;
  </a>
</td>
</tr>

<tr>
<td style="padding:22px 35px 28px;text-align:center;border-top:1px solid #e5eef0;background:#fafbfc;">
  <div style="font-size:12px;color:#52666a;margin-bottom:6px;">
    SS Residency Hotel Management
  </div>
  <div style="font-size:11px;color:#94a3b8;">
    Need help or have questions? Contact support or reply to this email.
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

    log.info(`[EMAIL] Subscription expired notification sent to ${to} for ${hotelName}`);
  } catch (error) {
    console.error("Error sending subscription expired notification:", error);
    log.error(`[EMAIL] Failed to send subscription expired notification to ${to}: ${error.message}`);
    throw error;
  }
};


// ============================================================
// SUBSCRIPTION CANCELLED / SUSPENDED NOTIFICATION (Immediate)
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
    const frontendBaseUrl = getFrontendUrl();
    const upgradeUrl = hotelId
      ? `${frontendBaseUrl}/hotel-billing-system/saas-user/choose-plan?hotelId=${hotelId}`
      : `${frontendBaseUrl}/hotel-billing-system/saas-user/choose-plan`;

    const statusTitle =
      status === "suspended"
        ? "Subscription Suspended"
        : "Subscription Cancelled";

    const subject = `Important: Your Hotel Subscription Has Been ${
      status === "suspended" ? "Suspended" : "Cancelled"
    } (${hotelName})`;

    const defaultReason =
      status === "suspended"
        ? "Subscription temporarily suspended by administrator."
        : "Subscription cancelled by system administrator.";

    const formattedReason = reason?.trim() ? reason.trim() : defaultReason;

    await transporter.sendMail({
      from: `"SS Residency SaaS" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: `Hello ${hotelName},\n\nYour hotel management subscription has been ${
        status === "suspended" ? "suspended" : "cancelled"
      } by the administrator.\n\nHotel: ${hotelName}\nPlan: ${planName || "Current Plan"}\nReason: ${formattedReason}\n\nTo restore your hotel management operations and room capacity, please choose a plan to reactivate your subscription.\n\nReactivate your subscription here: ${upgradeUrl}\n\nThank you,\nSS Residency Team`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${statusTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f3f9fa;font-family:Arial,Helvetica,sans-serif;color:#111827;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f9fa;padding:40px 15px;">
<tr>
<td align="center">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;background:#ffffff;border:1px solid #d5e1e4;border-radius:14px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,0.04);">

<tr>
<td style="padding:32px 35px 20px;">
  <div style="font-size:24px;font-weight:700;color:#065b62;margin-bottom:18px;">
    SS Residency
  </div>

  <div style="display:inline-block;background:#fff1f2;border:1px solid #fecdd3;color:#e11d48;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:14px;">
    ⚠️ ${statusTitle}
  </div>

  <div style="font-size:22px;font-weight:700;color:#be123c;margin-bottom:10px;">
    Notice: ${statusTitle}
  </div>

  <p style="font-size:14px;line-height:22px;color:#4b5563;margin:0;">
    Hello <strong>${hotelName}</strong>,
  </p>
  <p style="font-size:14px;line-height:22px;color:#4b5563;margin-top:6px;">
    This is an official notification that your hotel billing subscription has been <strong>${
      status === "suspended" ? "suspended" : "cancelled"
    }</strong> by an administrator.
  </p>
</td>
</tr>

<tr>
<td style="padding:5px 35px 25px;">
  <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:13px;color:#881337;padding-bottom:4px;">Hotel Name</td>
        <td align="right" style="font-size:14px;font-weight:700;color:#881337;padding-bottom:4px;">${hotelName}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#881337;padding-bottom:4px;padding-top:8px;border-top:1px solid #ffe4e6;">Previous Plan</td>
        <td align="right" style="font-size:14px;font-weight:700;color:#881337;padding-bottom:4px;padding-top:8px;border-top:1px solid #ffe4e6;">${planName || "Subscription Plan"}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#881337;padding-bottom:4px;padding-top:8px;border-top:1px solid #ffe4e6;">Status</td>
        <td align="right" style="font-size:14px;font-weight:700;color:#e11d48;padding-bottom:4px;padding-top:8px;border-top:1px solid #ffe4e6;text-transform:uppercase;">${status}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding-top:12px;border-top:1px solid #ffe4e6;">
          <div style="font-size:12px;font-weight:700;color:#881337;text-transform:uppercase;margin-bottom:4px;">Reason for Action:</div>
          <div style="font-size:14px;line-height:20px;color:#9f1239;background:#ffffff;padding:10px 14px;border-radius:6px;border:1px solid #fecdd3;">
            ${formattedReason}
          </div>
        </td>
      </tr>
    </table>
  </div>
</td>
</tr>

<tr>
<td style="padding:0 35px 30px;text-align:center;">
  <p style="font-size:14px;line-height:22px;color:#4b5563;margin:0 0 22px;text-align:left;">
    <strong>How to resolve this issue:</strong> You can reactivate your account immediately by choosing an active subscription plan. Your hotel profile and historical records remain intact.
  </p>

  <a href="${upgradeUrl}" target="_blank" style="display:inline-block;background:#065b62;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:8px;box-shadow:0 3px 10px rgba(6,91,98,0.25);">
    Choose Plan & Reactivate &rarr;
  </a>
</td>
</tr>

<tr>
<td style="padding:22px 35px 28px;text-align:center;border-top:1px solid #e5eef0;background:#fafbfc;">
  <div style="font-size:12px;color:#52666a;margin-bottom:6px;">
    SS Residency Hotel Management
  </div>
  <div style="font-size:11px;color:#94a3b8;">
    If you believe this action was made in error, please contact the administrator.
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

    log.info(`[EMAIL] Subscription cancelled notification sent to ${to} for ${hotelName}. Reason: ${formattedReason}`);
  } catch (error) {
    console.error("Error sending subscription cancelled notification:", error);
    log.error(`[EMAIL] Failed to send subscription cancelled notification to ${to}: ${error.message}`);
    throw error;
  }
};




export {
  sendOTP,
  sendSubscriptionExpiryReminder,
  sendSubscriptionExpiredNotification,
  sendSubscriptionCancelledNotification,
  sendAdminEmail,
};