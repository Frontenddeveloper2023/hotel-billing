import React, { useState, Suspense } from "react";
import {
  Outlet,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../Context/AuthContext";

import {
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  UserShield,
  BedDouble,
  FileText,
  UtensilsCrossed,
  Wrench,
  Receipt,
  Users,
  SlidersHorizontal,
  Building2,
  ClipboardList,
  CreditCard,
  Bell,
} from "lucide-react";

import logoImg from "../../public/logo.png";

export default function Layout() {
  const { logoutUser, userData } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // =====================================================
  // ROLE
  // =====================================================

  const isMainAdmin = userData?.role === "admin";

  // =====================================================
  // MAIN ADMIN NAVIGATION
  // =====================================================

  const adminNavigation = [
    {
      name: "Dashboard",
      href: "/saas-admin/dashboard",
      permissionKey: "saasAdmin",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      name: "Hotels",
      href: "/saas-admin/hotels",
      permissionKey: "hotels",
      icon: <Building2 className="w-5 h-5" />,
    },
    
    {
      name: "Plans",
      href: "/saas-admin/plans",
      permissionKey: "plans",
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      name: "Subscriptions",
      href: "/saas-admin/subscriptions",
      permissionKey: "subscriptions",
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      name: "Notifications",
      href: "/saas-admin/notifications",
      permissionKey: "hotelRegistrations",
      icon: <Bell className="w-5 h-5" />,
    },
  ];

  // =====================================================
  // HOTEL USER NAVIGATION
  // =====================================================

  const hotelNavigation = [
    {
      name: "Dashboard",
      href: "/hotel/dashboard",
      permissionKey: "dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      name: "Rooms Booking",
      href: "/rooms-booking",
      permissionKey: "roomsBooking",
      icon: <BedDouble className="w-5 h-5" />,
    },
    {
      name: "Food Management",
      href: "/food-management",
      permissionKey: "foodManagement",
      icon: <UtensilsCrossed className="w-5 h-5" />,
    },
    {
      name: "Service Management",
      href: "/service-management",
      permissionKey: "serviceManagement",
      icon: <Wrench className="w-5 h-5" />,
    },
    {
      name: "Reports",
      href: "/reports",
      permissionKey: "reports",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      name: "Customer",
      href: "/customer",
      permissionKey: "customer",
      icon: <Users className="w-5 h-5" />,
    },
    {
      name: "Invoice Management",
      href: "/invoice-management",
      permissionKey: "invoice",
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      name: "Branches",
      href: "/branches",
      permissionKey: "settings",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      name: "Settings",
      href: "/settings",
      permissionKey: "settings",
      icon: <SlidersHorizontal className="w-5 h-5" />,
    },
    {
      name: "Users",
      href: "/users",
      permissionKey: "users",
      icon: <UserShield className="w-5 h-5" />,
    },
  ];

  // =====================================================
  // SELECT SIDEBAR
  // =====================================================

  const navigation = isMainAdmin
    ? adminNavigation
    : hotelNavigation;

  // =====================================================
  // PERMISSION
  // =====================================================

  const hasPermission = (permissionKey) => {
    // Main Admin has SaaS-level access.
    if (isMainAdmin) {
      return true;
    }

    return userData?.permission?.[permissionKey] === true;
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/login", { replace: true });
    }
  };

  // =====================================================
  // NAVIGATION CLICK
  // =====================================================

  const handleNavClick = (e, item, isMobile) => {
    if (
      item.permissionKey &&
      !hasPermission(item.permissionKey)
    ) {
      e.preventDefault();

      alert("You don't have access to this section.");

      return;
    }

    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // =====================================================
  // ACTIVE CHECK
  // =====================================================

  const isItemActive = (item) => {
    if (location.pathname === item.href) {
      return true;
    }

    return location.pathname.startsWith(`${item.href}/`);
  };

  // =====================================================
  // RENDER NAV ITEM
  // =====================================================

  const renderNavItem = (
    item,
    isMobile = false
  ) => {
    const allowed = hasPermission(
      item.permissionKey
    );

    if (!allowed) {
      return null;
    }

    // Sub-branches cannot access or manage branches
    if (item.href === "/branches" && userData?.isMainBranch === false) {
      return null;
    }

    const isActive = isItemActive(item);

    return (
      <Link
        key={item.name}
        to={item.href}
        onClick={(e) =>
          handleNavClick(e, item, isMobile)
        }
        className={`group flex items-center gap-3 px-3.5 sm:px-4 h-11 rounded-xl text-[13px] sm:text-sm font-medium font-['Inter'] transition-all duration-200 relative ${
          isActive
            ? "bg-[#5146e5] text-white"
            : "text-slate-600 hover:bg-[#f4f2ff] hover:text-indigo-700"
        }`}
      >
        {isActive && (
          <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-indigo-500 to-indigo-500" />
        )}

        <span
          className={`shrink-0 transition-colors ${
            isActive
              ? "text-white"
              : "text-slate-500 group-hover:text-indigo-600"
          }`}
        >
          {item.icon}
        </span>

        <span className="truncate">
          {item.name}
        </span>
      </Link>
    );
  };

  // =====================================================
  // HEADER TITLE
  // =====================================================

  const getHeaderTitle = () => {
    if (isMainAdmin) {
      return `${userData?.name || "Admin"} Admin`;
    }

    return (
      userData?.hotelName ||
      userData?.name ||
      "Hotel"
    );
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="h-screen bg-[#f8f7ff] flex overflow-hidden font-['Inter']">

      {/* =================================================
          DESKTOP SIDEBAR
      ================================================= */}

      <aside className="hidden md:flex md:w-60 lg:w-64 md:flex-col bg-white border-r border-[#e7e4f4] shrink-0">

        {/* BRAND */}
        <div className="h-16 flex items-center gap-2.5 px-5 lg:px-6 border-b border-[#eeeaf8]">
          <img
            src={logoImg}
            alt="SS Residency Logo"
            className="w-9 h-9 lg:w-10 lg:h-10 object-contain shrink-0"
          />

          <span className="text-lg lg:text-xl font-semibold tracking-tight text-[#172033] font-['Inter'] truncate">
            {isMainAdmin
              ? "SaaS Admin"
              : "SS Residency"}
          </span>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) =>
            renderNavItem(item, false)
          )}
        </nav>

        {/* LOGOUT */}
        <div className="p-3 border-t border-[#eeeaf8]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3.5 lg:px-4 h-11 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* =================================================
          MOBILE OVERLAY
      ================================================= */}

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =================================================
          MOBILE SIDEBAR
      ================================================= */}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[78vw] max-w-64 bg-white border-r border-[#e7e4f4] flex flex-col transition-transform duration-300 md:hidden ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* MOBILE BRAND */}
        <div className="h-16 flex items-center justify-between px-4 sm:px-5 border-b border-[#eeeaf8]">

          <div className="flex items-center gap-2 min-w-0">
            <img
              src={logoImg}
              alt="SS Residency Logo"
              className="w-9 h-9 object-contain shrink-0"
            />

            <span className="text-lg font-semibold tracking-tight text-[#172033] font-['Inter'] truncate">
              {isMainAdmin
                ? "SaaS Admin"
                : "SS Residency"}
            </span>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* MOBILE NAVIGATION */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) =>
            renderNavItem(item, true)
          )}
        </nav>

        {/* MOBILE LOGOUT */}
        <div className="p-3 border-t border-[#eeeaf8]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3.5 h-11 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* =================================================
          MAIN CONTAINER
      ================================================= */}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* HEADER */}
        <header className="h-16 bg-white border-b border-[#eeeaf8] flex items-center justify-between px-4 sm:px-6 shrink-0">

          <div className="flex items-center gap-3 sm:gap-4 min-w-0">

            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 md:hidden focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <h2 className="text-base lg:text-lg font-semibold text-[#172033] font-['Inter'] truncate">
              {getHeaderTitle()}
            </h2>

            {userData?.branchName && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-[#f5f3ff] border border-[#e7e4f4] rounded-xl text-xs font-medium text-slate-600">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                {userData.branchName}
                {userData?.isMainBranch ? " (Main Branch)" : ""}
              </span>
            )}
          </div>
        </header>

        {/* CONTENT */}
        <main className="flex-1 p-3 sm:p-4 lg:p-5 bg-[#f8f7ff] flex flex-col overflow-y-auto">

          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600" />
                  Loading page...
                </div>
              </div>
            }
          >
            <Outlet />
          </Suspense>

        </main>

        {/* FOOTER */}
        <footer className="mt-auto pt-2 pb-2 text-center text-[11px] sm:text-xs text-slate-500 px-4 bg-[#f8f7ff]">
          <p>
            © {new Date().getFullYear()} Developed by{" "}
            <a
              href="https://jayamwebsolutions.com/"
              className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
              title="Jayam Web Solutions"
              target="_blank"
              rel="noreferrer"
            >
              Jayam Web Solutions
            </a>
            . All rights reserved.
          </p>
        </footer>

      </div>
    </div>
  );
}