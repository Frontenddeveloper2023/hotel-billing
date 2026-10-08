import React, { useState, Suspense } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import { useToast } from "../Context/ToastContext";
import {
  LayoutDashboard, LogOut, Menu, X, ShieldCheck as UserShield, BedDouble, FileText,
  UtensilsCrossed, Wrench, Receipt, Users, SlidersHorizontal, Building2, CreditCard, Bell,
  BarChart3,
} from "lucide-react";

import logo from "../../public/logo.png"

import { getSettings } from "../service/settingsService.js";
import SubscriptionAlertBanner from "./SubscriptionAlertBanner";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

const getLogoUrl = (logoPath) => {
  if (!logoPath) return "";
  if (
    logoPath.startsWith("blob:") ||
    logoPath.startsWith("http://") ||
    logoPath.startsWith("https://")
  ) {
    return logoPath;
  }
  const cleanBase = API_BASE_URL.replace(/\/+$/, "");
  const cleanPath = logoPath.replace(/^\/+/, "");
  return `${cleanBase}/${cleanPath}`;
};

const ic = "w-5 h-5";

export default function Layout() {
  const { logoutUser, adminUser, hotelUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(null);
  const toast = useToast();

  const isAdminRoute = location.pathname.startsWith("/saas-admin");
  const userData = isAdminRoute ? adminUser : hotelUser;
  const isMainAdmin = userData?.role === "admin";

  const adminNavigation = [
    { name: "Dashboard", href: "/saas-admin/dashboard", permissionKey: "saasAdmin", icon: <LayoutDashboard className={ic} /> },
    { name: "Hotels", href: "/saas-admin/hotels", permissionKey: "hotels", icon: <Building2 className={ic} /> },
    { name: "Hotel Bills", href: "/saas-admin/hotel-bills", permissionKey: "hotels", icon: <BarChart3 className={ic} /> },
    { name: "Plans", href: "/saas-admin/plans", permissionKey: "plans", icon: <CreditCard className={ic} /> },
    { name: "Subscriptions", href: "/saas-admin/subscriptions", permissionKey: "subscriptions", icon: <Receipt className={ic} /> },
    { name: "Notifications", href: "/saas-admin/notifications", permissionKey: "hotelRegistrations", icon: <Bell className={ic} /> },
  ];

  const hotelNavigation = [
    { name: "Dashboard", href: "/hotel/dashboard", permissionKey: "dashboard", icon: <LayoutDashboard className={ic} /> },
    { name: "Rooms Booking", href: "/rooms-booking", permissionKey: "roomsBooking", icon: <BedDouble className={ic} /> },
    { name: "Food Management", href: "/food-management", permissionKey: "foodManagement", icon: <UtensilsCrossed className={ic} /> },
    { name: "Service Management", href: "/service-management", permissionKey: "serviceManagement", icon: <Wrench className={ic} /> },
    { name: "Reports", href: "/reports", permissionKey: "reports", icon: <FileText className={ic} /> },
    { name: "Customer", href: "/customer", permissionKey: "customer", icon: <Users className={ic} /> },
    { name: "Invoice Management", href: "/invoice-management", permissionKey: "invoice", icon: <Receipt className={ic} /> },
    { name: "Branches", href: "/branches", permissionKey: "settings", icon: <Building2 className={ic} /> },
    { name: "Settings", href: "/settings", permissionKey: "settings", icon: <SlidersHorizontal className={ic} /> },
    { name: "Upgrade Plan", href: "/plan-upgrade", permissionKey: "upgradePlan", icon: <CreditCard className={ic} /> },
    { name: "Users", href: "/users", permissionKey: "users", icon: <UserShield className={ic} /> },
  ];

  const navigation = isMainAdmin ? adminNavigation : hotelNavigation;

  const hasPermission = (permissionKey) => {
    if (isMainAdmin) return true;
    if (userData?.role === "hotelOwner") return true;
    return userData?.permission?.[permissionKey] === true;
  };

  React.useEffect(() => {
    if (!isAdminRoute && userData) {
      const loadLogo = async () => {
        try {
          const res = await getSettings();
          if (res?.success && res.data?.companyLogo) {
            setCompanyLogo(getLogoUrl(res.data.companyLogo));
          }
        } catch (error) {
          console.warn("Could not load company logo", error);
        }
      };
      loadLogo();
    }
  }, [isAdminRoute, userData]);

  const handleLogout = async () => {
    const portal = isAdminRoute ? "admin" : (userData?.role === "receptionist" ? "staff" : "owner");
    const redirectUrl = isAdminRoute ? "/hotel-billing-system/login" : "/hotel-billing-system/hotel-login";

    try {
      await logoutUser(portal);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      sessionStorage.removeItem("hotelPortal");
      sessionStorage.removeItem("hotelToken");
      window.location.replace(redirectUrl);
    }
  };


  const handleNavClick = (e, item, isMobile) => {
    if (item.permissionKey && !hasPermission(item.permissionKey)) {
      e.preventDefault();
      toast.error("Access Restricted: You don't have permission to view this section.");
      return;
    }
    if (isMobile) setSidebarOpen(false);
  };

  const isItemActive = (item) => {
    if (location.pathname === item.href) return true;
    return location.pathname.startsWith(`${item.href}/`);
  };

  const renderNavItem = (item, isMobile = false) => {
    if (!hasPermission(item.permissionKey)) return null;
    if (item.href === "/branches" && userData?.isMainBranch === false) return null;

    const isActive = isItemActive(item);

    return (
      <Link
        key={item.name}
        to={item.href}
        onClick={(e) => handleNavClick(e, item, isMobile)}
        className={`group flex items-center gap-3 px-3.5 sm:px-4 h-11 rounded-xl text-[13px] sm:text-sm font-semibold transition-all duration-200 relative ${isActive
            ? "bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white shadow-lg shadow-blue-500/30"
            : "text-blue-100/70 hover:bg-white/10 hover:text-white hover:translate-x-0.5"
          }`}
      >
        <span className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-blue-200/70 group-hover:text-white"}`}>
          {item.icon}
        </span>
        <span className="truncate">{item.name}</span>
      </Link>
    );
  };


  const getHeaderTitle = () => {
    if (isMainAdmin) return `${userData?.name || "Admin"} Admin`;
    return userData?.hotelName || userData?.name || "Hotel";
  };

  const brand = isMainAdmin ? "SaaS Admin" : "StayLio";

  const logoutBtn = (extra = "") => (
    <button
      onClick={handleLogout}
      className={`flex w-full items-center gap-3 px-3.5 h-11 rounded-xl text-sm font-semibold text-blue-100/70 hover:bg-red-500/15 hover:text-red-300 transition-colors cursor-pointer ${extra}`}
    >
      <LogOut className={ic} />
      Sign Out
    </button>
  );

  return (
    <div className="h-screen flex overflow-hidden font-['Inter'] bg-[radial-gradient(ellipse_at_top,#2a5288_0%,#16345e_45%,#0f2447_100%)]">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col bg-white/[0.06] backdrop-blur-xl border-r border-white/10 shrink-0">
        <div className="h-16 flex items-center gap-2.5 px-5 lg:px-6 border-b border-white/10">
          <img src={companyLogo || logo} alt="StayLio" className="w-9 h-9 lg:w-10 lg:h-10 object-contain shrink-0 rounded" />
          <span className="text-lg lg:text-xl font-bold tracking-tight text-white truncate">{brand}</span>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto staylio-scrollbar">          {navigation.map((item) => renderNavItem(item, false))}
        </nav>
        <div className="p-3 border-t border-white/10">{logoutBtn()}</div>
      </aside>

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-[#0b1d3d]/60 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* MOBILE SIDEBAR */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[78vw] max-w-64 bg-[#132f57] border-r border-white/10 flex flex-col transition-transform duration-300 md:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="h-16 flex items-center justify-between px-4 sm:px-5 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <img src={companyLogo || logo} alt="SatylioLogo" className="w-9 h-9 object-contain shrink-0 rounded" />
            <span className="text-lg font-bold tracking-tight text-white truncate">{brand}</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5 text-blue-100" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto staylio-scrollbar">          {navigation.map((item) => renderNavItem(item, true))}
        </nav>
        <div className="p-3 border-t border-white/10">{logoutBtn()}</div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white/[0.06] backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 md:hidden focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <h2 className="text-base lg:text-lg font-bold text-white truncate">{getHeaderTitle()}</h2>
            {userData?.branchName && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/15 rounded-xl text-xs font-medium text-blue-50">
                <Building2 className="w-3.5 h-3.5 text-blue-200" />
                {userData.branchName}
                {userData?.isMainBranch ? " (Main Branch)" : ""}
              </span>
            )}
          </div>
        </header>

        <SubscriptionAlertBanner />

        <main className="flex-1 p-3 sm:p-4 lg:p-6 flex flex-col overflow-y-auto staylio-scrollbar">          <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-blue-100">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                Loading page...
              </div>
            </div>
          }
        >
          <Outlet />
        </Suspense>
        </main>

        <footer className="mt-auto py-2 text-center text-[11px] sm:text-xs text-blue-100/60 px-4">
          <p>
            © {new Date().getFullYear()} Developed by{" "}
            <a
              href="https://jayamwebsolutions.com/"
              className="font-semibold text-blue-200 hover:text-white hover:underline transition-colors"
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