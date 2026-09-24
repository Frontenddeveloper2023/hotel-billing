import "dotenv/config";

import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import './cron/overstayCron.js';
import "./cron/subscriptionExpiryCron.js";

import {
    log,
    startLogCleanupScheduler
} from "./util/logger.js";

import {
    seedAdminUser
} from "./util/seedAdmin.js";

import userLoginRoutes from "./routers/usersLoginRoutes.js";
import settingsRoute from "./routers/settingsRoutes.js";
import customersRoute from "./routers/customersRoutes.js";
import roomRoutes from "./routers/roomRoutes.js";
import userRoutes from "./routers/userRoute.js";
import foodRoutes from "./routers/foodRoutes.js";
import roomServiceRoutes from "./routers/roomServiceRoutes.js"
import roomServiceListControleRoute from "./routers/roomServiceListControleRoute.js"
import foodServiceRoute from "./routers/foodServiceRoutes.js"
import checkoutBillRoutes from "./routers/checkoutBillRoutes.js";
import invoiceRoute from "./routers/invoiceRoutes.js"
import bookingRoutes from "./routers/bookingRoutes.js";

import hotelsRoute from "./routers/hotelRoutes.js"
import branchesRoute from "./routers/branchRoutes.js"
import plansRoute from "./routers/planRoutes.js"
import subscriptionsRoute from "./routers/subscriptionRoutes.js"
import hotelRegistrationRoutes from "./routers/hotelRegistrationRoutes.js";
import saasNotificationRoutes from "./routers/saasNotificationRoutes.js";
import dashboardRoutes from "./routers/dashboardRoutes.js";
import reportsRoutes from "./routers/reportsRoutes.js";
import customersManagementRoutes from "./routers/customersManagementRoutes.js";


// ----------------------------------
// PATH SETUP
// ----------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ----------------------------------
// EXPRESS APP
// ----------------------------------

const app = express();


// ----------------------------------
// CORS
// ----------------------------------

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://webscape.co.in",
];

app.use(
    cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        credentials: true,
    })
);


// ----------------------------------
// BODY PARSERS
// ----------------------------------

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true,
    })
);

app.use(cookieParser());


// ----------------------------------
// API BASE NAME
// ----------------------------------

const baseName =
    process.env.BASE_NAME || "hotel-billing-system-backend";


// ----------------------------------
// STATIC UPLOADS (FIXED ROUTE)
// ----------------------------------
// This now correctly maps static files to:
// https://webscape.co.in/hotel-billing-system-backend/uploads/foods/...
// ----------------------------------

app.use(
    `/${baseName}/uploads`,
    express.static(
        path.join(__dirname, "uploads")
    )
);


// ----------------------------------
// DATABASE CONNECTION
// ----------------------------------

connectDB()
    .then(() => {
        seedAdminUser();
    })
    .catch((error) => {
        console.error(
            "Database connection failed:",
            error
        );
    });


// ----------------------------------
// PORT
// ----------------------------------

const PORT = process.env.PORT || 5000;


// ----------------------------------
// API ROUTER
// ----------------------------------

const apiRouter = express.Router();


// ----------------------------------
// HEALTH CHECK
// ----------------------------------

apiRouter.get("/test", (req, res) => {
    res.status(200).json({
        status: "success",
        message: "API is running",
        timestamp: new Date(),
    });
});


// ----------------------------------
// USER LOGIN ROUTES
// ----------------------------------

apiRouter.use(
    "/users",
    userLoginRoutes
);


// ----------------------------------
// SETTINGS ROUTES
// ----------------------------------

apiRouter.use(
    "/settings",
    settingsRoute
);


// ----------------------------------
// CUSTOMER ROUTES
// ----------------------------------

apiRouter.use(
    "/customers",
    customersRoute
);


// ----------------------------------
// ROOM ROUTES
// ----------------------------------

apiRouter.use(
    "/rooms",
    roomRoutes
);


// ----------------------------------
// USER ACCESS ROUTES
// ----------------------------------

apiRouter.use(
    "/users-access",
    userRoutes
);


// ----------------------------------
// FOOD ROUTES
// ----------------------------------

apiRouter.use(
    "/foods-management",
    foodRoutes
);

apiRouter.use(
    "/room-services",
    roomServiceRoutes
);


apiRouter.use(
    "/room-services-List-controle",
    roomServiceListControleRoute
);


apiRouter.use(
    "/food-services",
    foodServiceRoute
);


apiRouter.use(
    "/checkout-bills",
    checkoutBillRoutes
);

apiRouter.use(
    "/invoice-management",
    invoiceRoute
);

apiRouter.use("/bookings", bookingRoutes);

apiRouter.use("/dashboard", dashboardRoutes);
apiRouter.use("/reports",   reportsRoutes);
apiRouter.use("/customers", customersManagementRoutes);


apiRouter.use("/hotels", hotelsRoute);
apiRouter.use("/branches", branchesRoute);
apiRouter.use("/plans", plansRoute);
apiRouter.use("/subscriptions", subscriptionsRoute);

apiRouter.use(
  "/hotel-registrations",
  hotelRegistrationRoutes
);


apiRouter.use(
  "/saas-notifications",
  saasNotificationRoutes
);

// ----------------------------------
// MOUNT API ROUTER
// ----------------------------------

app.use(
    `/${baseName}/api`,
    apiRouter
);


// ----------------------------------
// 404 HANDLER
// ----------------------------------

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.originalUrl,
    });
});


// ----------------------------------
// ERROR HANDLER
// ----------------------------------

app.use((error, req, res, next) => {
    console.error("Server Error:", error);

    res.status(
        error.status || 500
    ).json({
        success: false,
        message:
            error.message ||
            "Internal server error",
    });
});


// ----------------------------------
// START SERVER
// ----------------------------------

app.listen(PORT, () => {
    startLogCleanupScheduler();

    log(
        `[Server] Server started and listening on port ${PORT}`
    );

    console.log(
        `Server running on port ${PORT}`
    );

    console.log(
        `Uploads folder: ${path.join(
            __dirname,
            "uploads"
        )}`
    );
});