import React, {
  lazy,
  Suspense,
} from "react";

import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LazyFallback from "./Components/LazyFallback";
import { useAuth } from "./Context/AuthContext";

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


// =====================================================
// PERMISSION ROUTE
// =====================================================

const PermissionRoute = ({
  permission,
  children,
}) => {

  const {
    isAuthenticated,
    userData,
    loading,
  } = useAuth();


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


  // -------------------------------------------------
  // ADMIN
  // -------------------------------------------------

  if (userData?.role === "admin") {
    return children;
  }


  // -------------------------------------------------
  // USER PERMISSION
  // -------------------------------------------------

  const allowed =
    userData?.permission?.[permission] === true;


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
        userData?.role === "admin"
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
    isAuthenticated,
    userData,
    loading,
  } = useAuth();


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
  userData?.role === "admin"
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
            !isAuthenticated ? (
              <Login />
            ) : (
              <Navigate
                to={defaultAuthenticatedRoute}
                replace
              />
            )
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
              userData?.role === "admin" ? (
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