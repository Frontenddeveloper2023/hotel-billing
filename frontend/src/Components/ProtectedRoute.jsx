import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  // Show a loading spinner or placeholder while checking session status
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-sm font-semibold text-black">Loading session...</div>
      </div>
    );
  }

  // If authenticated, render the nested child routes (like Layout & Dashboard); else redirect to the appropriate portal login
  const redirectTarget = 
    (sessionStorage.getItem("hotelPortal") || localStorage.getItem("cachedHotelUser"))
      ? "/hotel-login"
      : (localStorage.getItem("cachedAdminUser") ? "/login" : "/hotel-login");

  return isAuthenticated ? <Outlet /> : <Navigate to={redirectTarget} replace />;
}