import React, {
  lazy,
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import LazyFallback from "./Components/LazyFallback";
import { useAuth } from "./Context/AuthContext";
import { getRegistrationStatus } from "./service/hotelRegistrationApi";

import "./App.css";

import CustomerManagement
  from "./pages/Customers/CustomerManagement";

import InvoicesManagement
  from "./pages/InvoicesManage/InvoicesManagement";
import SaaSHome from "./pages/SaaSUser/SaasUserHome";


// =====================================================
// LAZY COMPONENTS
// =====================================================

const HotelManagement = lazy(() =>
  import(
    "./pages/HotelManagement/HotelManagement"
  )
);

const FoodManagement = lazy(() =>
  import(
    "./pages/FoodManagement/FoodManagement"
  )
);

const Login = lazy(() =>
  import("./pages/Login/Login")
);

const HotelLogin = lazy(() =>
  import("./pages/HotelLogin/HotelLogin")
);

const Layout = lazy(() =>
  import("./Components/Layout")
);

const Dashboard = lazy(() =>
  import("./pages/Dashboard/Dashboard")
);

const Settings = lazy(() =>
  import("./pages/Settings/Settings")
);

const User = lazy(() =>
  import("./pages/UserManagement/User")
);

const Reports = lazy(() =>
  import("./pages/ReportsPage/Reports")
);

const ServiceManagement = lazy(() =>
  import(
    "./pages/ServiceManagement/ServiceManagement"
  )
);

const BranchManagement = lazy(() =>
  import(
    "./pages/BranchManagement/BranchManagement"
  )
);

const PlanUpgrade = lazy(() =>
  import(
    "./pages/HotelLogin/PlanUpgrade"
  )
);


// =====================================================
// SaaS USER PAGES
// =====================================================

const SaaSUserChoosePlan = lazy(() =>
  import(
    "./pages/SaaSUser/SaaSUserChoosePlan"
  )
);

const SaaSUserRegistration = lazy(() =>
  import(
    "./pages/SaaSUser/SaaSUserRegistration"
  )
);

const SaaSUserCheckout = lazy(() =>
  import(
    "./pages/SaaSUser/SaaSUserCheckout"
  )
);

const SaaSUserApplicationStatus = lazy(() =>
  import(
    "./pages/SaaSUser/SaaSUserApplicationStatus"
  )
);


// =====================================================
// SaaS ADMIN PAGES
// =====================================================

const SaaSAdminDashboard = lazy(() =>
  import(
    "./pages/SaaSAdmin/SaaSAdminDashboard"
  )
);

const SaaSAdminHotels = lazy(() =>
  import(
    "./pages/SaaSAdmin/SaaSAdminHotels"
  )
);

const SaaSAdminPlans = lazy(() =>
  import(
    "./pages/SaaSAdmin/SaaSAdminPlans"
  )
);

const SaaSAdminNotifications = lazy(() =>
  import(
    "./pages/SaaSAdmin/SaaSAdminNotifications"
  )
);

const SaaSAdminSubscriptions = lazy(() =>
  import(
    "./pages/SaaSAdmin/SaaSAdminSubscriptions"
  )
);

const SaaSAdminHotelBills = lazy(() =>
  import(
    "./pages/SaaSAdmin/SaasAdminHotelBills"
  )
);


// =====================================================
// HOTEL LOGIN GUARD
// Prevents pending/rejected hotels from bypassing the
// disabled button by manually navigating to /hotel-login
// =====================================================

// const HotelLoginGuard = ({ children }) => {
//   const navigate = useNavigate();
//   const [checking, setChecking] = useState(true);

//   useEffect(() => {
//     let cancelled = false;

//     const check = async () => {
//       // If user is already logged in as hotelOwner, allow through
//       const registrationId =
//         sessionStorage.getItem("saasRegistrationId") ||
//         localStorage.getItem("saasRegistrationId");

//       // No pending registration in storage → fresh login, allow through
//       if (!registrationId) {
//         if (!cancelled) setChecking(false);
//         return;
//       }

//       try {
//         const res = await getRegistrationStatus(registrationId);
//         const status =
//           res?.data?.status ||
//           res?.data?.registration?.status ||
//           res?.status;

//         if (cancelled) return;

//         if (status === "approved") {
//           // Approved → allow through
//           setChecking(false);
//         } else {
//           // Pending or rejected → redirect to application status with message
//           navigate("/saas-user/application-status", {
//             replace: true,
//             state: {
//               registrationId,
//               blockedMessage:
//                 status === "rejected"
//                   ? "Your hotel application has been rejected. You cannot log in at this time."
//                   : "Your hotel application is still under review. Login will be available once the admin approves your application.",
//             },
//           });
//         }
//       } catch {
//         // If API fails, allow through (don't block on network error)
//         if (!cancelled) setChecking(false);
//       }
//     };

//     check();
//     return () => { cancelled = true; };
//   }, [navigate]);

//   if (checking) return <LazyFallback />;
//   return children;
// };



const PermissionRoute = ({
  permission,
  children,
}) => {

const {
  adminUser,
  hotelUser,
  adminLoading,
  hotelLoading,
} = useAuth();


const isAdminRoute = [
  "saasAdmin",
  "hotels",
  "plans",
  "hotelRegistrations",
  "subscriptions",
].includes(permission);

const currentUser = isAdminRoute
  ? adminUser
  : hotelUser;

const loading = isAdminRoute
  ? adminLoading
  : hotelLoading;

const isAuthenticated = Boolean(currentUser);


  // -------------------------------------------------
  // LOADING
  // -------------------------------------------------

  if (loading) {
    return <LazyFallback />;
  }


  // -------------------------------------------------
  // NOT LOGGED IN
  // -------------------------------------------------

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const adminPermissions = [
    "saasAdmin",
    "hotels",
    "plans",
    "hotelRegistrations",
    "subscriptions"
  ];


  // -------------------------------------------------
  // ADMIN
  // -------------------------------------------------

if (currentUser?.role === "admin") {
      if (!isAdminRoute) {
      return <Navigate to="/saas-admin/dashboard" replace />;
    }
    return children;
  }


  // -------------------------------------------------
  // NON-ADMIN trying to access ADMIN routes
  // -------------------------------------------------

  if (isAdminRoute) {
    return <Navigate to="/hotel/dashboard" replace />;
  }


  // -------------------------------------------------
  // HOTEL OWNER – full access to all hotel pages
  // -------------------------------------------------

if (currentUser?.role === "hotelOwner") {
      return children;
  }


  // -------------------------------------------------
  // USER PERMISSION
  // -------------------------------------------------

  const allowed =
currentUser?.permission?.[permission] === true;

  // -------------------------------------------------
  // ALLOWED
  // -------------------------------------------------

  if (allowed) {
    return children;
  }


  // -------------------------------------------------
  // FORBIDDEN
  // -------------------------------------------------

  return (
    <Navigate
      to={
currentUser?.role === "admin"
          ? "/saas-admin/dashboard"
          : "/hotel/dashboard"
      }
      replace
    />
  );
};


// =====================================================
// APP
// =====================================================

function App() {

const {
  adminUser,
  hotelUser,
  adminLoading,
  hotelLoading,
} = useAuth();

const isAuthenticated =
  Boolean(adminUser || hotelUser);

const loading =
  adminLoading || hotelLoading;


  // -------------------------------------------------
  // AUTH LOADING
  // -------------------------------------------------

  if (loading) {
    return <LazyFallback />;
  }


  // -------------------------------------------------
  // ROLE BASED DEFAULT ROUTE
  // -------------------------------------------------

const defaultAuthenticatedRoute =
  adminUser
    ? "/saas-admin/dashboard"
    : "/hotel/dashboard";


  return (
    <Suspense
      fallback={
        <LazyFallback />
      }
    >

      <Routes>


        {/* =================================================
            PUBLIC LOGIN
        ================================================= */}

        <Route
  path="/login"
element={
  adminUser ? (
    <Navigate
      to="/saas-admin/dashboard"
      replace
    />
  ) : (
    <Login />
  )
}
/>

<Route
  path="/hotel-login"
  element={
    
      <HotelLogin />
  
  }
/>


        {/* =================================================
            PUBLIC SaaS USER FLOW
        ================================================= */}


        {/* -----------------------------------------------
            CHOOSE PLAN
        ------------------------------------------------ */}

        <Route
          path="/saas-user/choose-plan"
          element={
            <SaaSUserChoosePlan />
          }
        />


        {/* -----------------------------------------------
            HOTEL REGISTRATION
        ------------------------------------------------ */}

        <Route
          path="/saas-user/registration"
          element={
            <SaaSUserRegistration />
          }
        />


        {/* -----------------------------------------------
            CHECKOUT
        ------------------------------------------------ */}

        <Route
          path="/saas-user/checkout"
          element={
            <SaaSUserCheckout />
          }
        />



        <Route
          path="/saas-user/home-page"
          element={
            <SaaSHome/>
          }
        />



        {/* -----------------------------------------------
            APPLICATION STATUS
        ------------------------------------------------ */}

        <Route
          path="/saas-user/application-status"
          element={
            <SaaSUserApplicationStatus />
          }
        />


        {/* =================================================
            MAIN HOTEL MANAGEMENT LAYOUT
        ================================================= */}

        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Layout />
            ) : (
              <Navigate
                to="/login"
                replace
              />
            )
          }
        >


          {/* =================================================
              ROOT
          ================================================= */}

          <Route
            index
            element={
              <Navigate
                to={defaultAuthenticatedRoute}
                replace
              />
            }
          />


        {/* =================================================
            SaaS ADMIN
        ================================================= */}


        {/* -----------------------------------------------
            SaaS ADMIN DASHBOARD
        ------------------------------------------------ */}

        <Route
          path="saas-admin/dashboard"
          element={
            <PermissionRoute
              permission="saasAdmin"
            >
              <SaaSAdminDashboard />
            </PermissionRoute>
          }
        />


        {/* -----------------------------------------------
            SaaS ADMIN HOTELS
        ------------------------------------------------ */}

        <Route
          path="saas-admin/hotels"
          element={
            <PermissionRoute
              permission="hotels"
            >
              <SaaSAdminHotels />
            </PermissionRoute>
          }
        />


        {/* -----------------------------------------------
            SaaS ADMIN PLANS
        ------------------------------------------------ */}

        <Route
          path="saas-admin/plans"
          element={
            <PermissionRoute
              permission="plans"
            >
              <SaaSAdminPlans />
            </PermissionRoute>
          }
        />


        {/* -----------------------------------------------
            SaaS ADMIN NOTIFICATIONS
        ------------------------------------------------ */}

        <Route
          path="saas-admin/notifications"
          element={
            <PermissionRoute
              permission="hotelRegistrations"
            >
              <SaaSAdminNotifications />
            </PermissionRoute>
          }
        />


        {/* -----------------------------------------------
            SaaS ADMIN SUBSCRIPTIONS
        ------------------------------------------------ */}

        <Route
          path="saas-admin/subscriptions"
          element={
            <PermissionRoute
              permission="subscriptions"
            >
              <SaaSAdminSubscriptions />
            </PermissionRoute>
          }
        />


        {/* -----------------------------------------------
            SaaS ADMIN HOTEL BILLS
        ------------------------------------------------ */}

        <Route
          path="saas-admin/hotel-bills"
          element={
            <PermissionRoute
              permission="hotels"
            >
              <SaaSAdminHotelBills />
            </PermissionRoute>
          }
        />



          {/* =================================================
              HOTEL OWNER DASHBOARD
          ================================================= */}

          <Route
            path="hotel/dashboard"
            element={
              <PermissionRoute
                permission="dashboard"
              >
                <Dashboard />
              </PermissionRoute>
            }
          />


          {/* =================================================
              NORMAL DASHBOARD
          ================================================= */}

          <Route
            path="dashboard"
            element={
              adminUser?.role === "admin" ? (
    
                <Navigate
                  to="/saas-admin/dashboard"
                  replace
                />
              ) : (
                <Navigate
                  to="/hotel/dashboard"
                  replace
                />
              )
            }
          />


          {/* =================================================
              ROOMS BOOKING
          ================================================= */}

          <Route
            path="rooms-booking"
            element={
              <PermissionRoute
                permission="roomsBooking"
              >
                <HotelManagement />
              </PermissionRoute>
            }
          />


          {/* =================================================
              FOOD MANAGEMENT
          ================================================= */}

          <Route
            path="food-management"
            element={
              <PermissionRoute
                permission="foodManagement"
              >
                <FoodManagement />
              </PermissionRoute>
            }
          />


          {/* =================================================
              SERVICE MANAGEMENT
          ================================================= */}

          <Route
            path="service-management"
            element={
              <PermissionRoute
                permission="serviceManagement"
              >
                <ServiceManagement />
              </PermissionRoute>
            }
          />


          {/* =================================================
              CUSTOMER
          ================================================= */}

          <Route
            path="customer"
            element={
              <PermissionRoute
                permission="customer"
              >
                <CustomerManagement />
              </PermissionRoute>
            }
          />


          {/* =================================================
              INVOICE MANAGEMENT
          ================================================= */}

          <Route
            path="invoice-management"
            element={
              <PermissionRoute
                permission="invoice"
              >
                <InvoicesManagement />
              </PermissionRoute>
            }
          />


          {/* =================================================
              BRANCHES
          ================================================= */}

          <Route
            path="branches"
            element={
              <PermissionRoute
                permission="settings"
              >
                <BranchManagement />
              </PermissionRoute>
            }
          />


          {/* =================================================
              SETTINGS
          ================================================= */}

          <Route
            path="settings"
            element={
              <PermissionRoute
                permission="settings"
              >
                <Settings />
              </PermissionRoute>
            }
          />


          {/* =================================================
              USERS
          ================================================= */}

          <Route
            path="users"
            element={
              <PermissionRoute
                permission="users"
              >
                <User />
              </PermissionRoute>
            }
          />


          {/* =================================================
              REPORTS
          ================================================= */}

          <Route
            path="reports"
            element={
              <PermissionRoute
                permission="reports"
              >
                <Reports />
              </PermissionRoute>
            }
          />


          {/* =================================================
              PLAN UPGRADE
          ================================================= */}

          <Route
            path="plan-upgrade"
            element={
              <PermissionRoute
                permission="upgradePlan"
              >
                <PlanUpgrade />
              </PermissionRoute>
            }
          />


        </Route>


        {/* =================================================
            UNKNOWN ROUTE
        ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to={
                isAuthenticated
                  ? defaultAuthenticatedRoute
                  : "/saas-user/choose-plan"
              }
              replace
            />
          }
        />


      </Routes>

    </Suspense>
  );
}


export default App;