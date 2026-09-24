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




const sendSubscriptionExpiryReminder = async ({
  to,
  hotelName,
  planName,
  endDate,
  daysRemaining,
}) => {
  try {
    const formattedDate = new Date(endDate).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }
    );

    await transporter.sendMail({
      from: `"SS Residency" <${process.env.SMTP_USER}>`,

      to,

      subject:
        daysRemaining === 7
          ? "Your Hotel Billing Plan Expires in 7 Days"
          : "Your Hotel Billing Plan Expires Tomorrow",

      text: `
Hello,

Your ${hotelName} subscription is expiring ${daysRemaining === 7 ? "in 7 days" : "tomorrow"}.

Hotel: ${hotelName}
Plan: ${planName || "Current Plan"}
Expiry Date: ${formattedDate}

Please renew your subscription before the expiry date to continue using your hotel management system without interruption.

Thank you,
SS Residency
      `,

      html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Subscription Expiry Reminder</title>
</head>

<body style="
margin:0;
padding:0;
background:#f3f9fa;
font-family:Arial,Helvetica,sans-serif;
color:#111827;
">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="background:#f3f9fa;padding:40px 15px;">

<tr>
<td align="center">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="
max-width:520px;
background:#ffffff;
border:1px solid #d5e1e4;
border-radius:12px;
overflow:hidden;
">

<tr>
<td style="padding:30px 35px 20px;">

<div style="
font-size:24px;
font-weight:700;
color:#065b62;
margin-bottom:22px;
">
SS Residency
</div>

<div style="
font-size:23px;
font-weight:700;
color:#111111;
margin-bottom:10px;
">
Subscription Expiry Reminder
</div>

<p style="
font-size:14px;
line-height:22px;
color:#4b5563;
margin:0;
">
Hello,
</p>

<p style="
font-size:14px;
line-height:22px;
color:#4b5563;
">
Your hotel management subscription is
<strong style="color:#065b62;">
${daysRemaining === 7 ? "expiring in 7 days" : "expiring tomorrow"}
</strong>.
</p>

</td>
</tr>

<tr>
<td style="padding:10px 35px 25px;">

<table width="100%" cellpadding="0" cellspacing="0"
style="
background:#f3f9fa;
border:1px solid #d7e6e8;
border-radius:8px;
">

<tr>
<td style="padding:18px 20px;">

<p style="
margin:0 0 10px;
font-size:13px;
color:#6b7280;
">
Hotel
</p>

<p style="
margin:0 0 15px;
font-size:16px;
font-weight:700;
color:#111827;
">
${hotelName}
</p>

<p style="
margin:0 0 10px;
font-size:13px;
color:#6b7280;
">
Plan
</p>

<p style="
margin:0 0 15px;
font-size:15px;
font-weight:600;
color:#111827;
">
${planName || "Current Plan"}
</p>

<p style="
margin:0 0 10px;
font-size:13px;
color:#6b7280;
">
Expiry Date
</p>

<p style="
margin:0;
font-size:15px;
font-weight:700;
color:#b45309;
">
${formattedDate}
</p>

</td>
</tr>

</table>

</td>
</tr>

<tr>
<td style="padding:0 35px 25px;">

<p style="
margin:0;
font-size:14px;
line-height:22px;
color:#4b5563;
">
Please renew your subscription before the expiry date to
continue using your hotel management system without
interruption.
</p>

</td>
</tr>

<tr>
<td style="
padding:22px 35px 28px;
text-align:center;
border-top:1px solid #e5eef0;
">

<div style="
font-size:12px;
color:#52666a;
margin-bottom:8px;
">
SS Residency Hotel Management
</div>

<div style="
font-size:11px;
color:#718096;
">
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
      `Subscription expiry reminder sent to ${to} for ${hotelName}. Days remaining: ${daysRemaining}`
    );
  } catch (error) {
    console.error(
      "Error sending subscription expiry reminder:",
      error
    );

    log.error(
      `Error sending subscription expiry reminder to ${to}: ${error.message}`
    );

    throw error;
  }
};


const sendSubscriptionExpiredNotification = async ({
  to,
  hotelName,
  planName,
  endDate,
}) => {
  try {
    const formattedDate = new Date(endDate).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }
    );

    await transporter.sendMail({
      from: `"SS Residency" <${process.env.SMTP_USER}>`,

      to,

      subject: "Your Hotel Billing Plan Has Expired",

      text: `
Hello,

Your ${hotelName} subscription has expired.

Hotel: ${hotelName}
Plan: ${planName || "Current Plan"}
Expiry Date: ${formattedDate}

Your subscription is no longer active. Please renew your plan to continue using the hotel management system.

Thank you,
SS Residency
      `,

      html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Subscription Expired</title>
</head>

<body style="
margin:0;
padding:0;
background:#f3f9fa;
font-family:Arial,Helvetica,sans-serif;
color:#111827;
">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="background:#f3f9fa;padding:40px 15px;">

<tr>
<td align="center">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="
max-width:520px;
background:#ffffff;
border:1px solid #d5e1e4;
border-radius:12px;
overflow:hidden;
">

<tr>
<td style="padding:30px 35px 20px;">

<div style="
font-size:24px;
font-weight:700;
color:#065b62;
margin-bottom:22px;
">
SS Residency
</div>

<div style="
font-size:23px;
font-weight:700;
color:#b91c1c;
margin-bottom:10px;
">
Subscription Expired
</div>

<p style="
font-size:14px;
line-height:22px;
color:#4b5563;
">
Your hotel management subscription has expired.
</p>

</td>
</tr>

<tr>
<td style="padding:10px 35px 25px;">

<div style="
background:#fef2f2;
border:1px solid #fecaca;
border-radius:8px;
padding:20px;
">

<p style="
margin:0 0 12px;
font-size:14px;
color:#4b5563;
">
<strong>Hotel:</strong> ${hotelName}
</p>

<p style="
margin:0 0 12px;
font-size:14px;
color:#4b5563;
">
<strong>Plan:</strong> ${planName || "Current Plan"}
</p>

<p style="
margin:0;
font-size:14px;
color:#4b5563;
">
<strong>Expired On:</strong> ${formattedDate}
</p>

</div>

</td>
</tr>

<tr>
<td style="padding:0 35px 30px;">

<p style="
margin:0;
font-size:14px;
line-height:22px;
color:#4b5563;
">
Please renew your subscription to continue using your
hotel management system.
</p>

</td>
</tr>

<tr>
<td style="
padding:22px 35px 28px;
text-align:center;
border-top:1px solid #e5eef0;
">

<div style="
font-size:12px;
color:#52666a;
">
SS Residency Hotel Management
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
      `Subscription expired notification sent to ${to} for ${hotelName}`
    );
  } catch (error) {
    console.error(
      "Error sending subscription expired notification:",
      error
    );

    log.error(
      `Error sending subscription expired notification to ${to}: ${error.message}`
    );

    throw error;
  }
};


export {
  sendOTP,
  sendSubscriptionExpiryReminder,
  sendSubscriptionExpiredNotification,
};