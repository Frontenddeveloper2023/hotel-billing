import React from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";

export default function RoomFilters({
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  bedFilter,
  setBedFilter,
  search,
  setSearch,
  roomTypes = [],
  bedTypes = [],
  resetFilters,
}) {
  const hasFilters = statusFilter !== "all" || typeFilter !== "all" || bedFilter !== "all" || search.trim() !== "";

  const activeFilterCount = [statusFilter !== "all", typeFilter !== "all", bedFilter !== "all", search.trim() !== ""].filter(Boolean).length;

  const selectClass =
    "w-full sm:flex-1 h-11 px-3 border border-[#dbe6f5] rounded-xl text-sm text-[#0e2a4a] bg-[#f6f9fe] outline-none transition focus:bg-white focus:border-[#3b82f0] focus:ring-2 focus:ring-[#3b82f0]/20";

  return (
    <div className="w-full min-w-0 rounded-2xl sm:rounded-3xl bg-white shadow-[0_10px_30px_rgba(6,20,52,0.10)] sm:shadow-[0_14px_36px_rgba(6,20,52,0.14)] p-3 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 sm:gap-4">

        {/* HEADER: Title & Active Filter Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white shadow-sm shadow-blue-500/20">
              <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-[#0e2a4a]">Room Filters</h3>
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-50 px-1 text-[10px] font-extrabold text-blue-600 ring-1 ring-blue-200">
                  {activeFilterCount}
                </span>
              )}
            </div>
          </div>

          {/* Quick Clear on Mobile */}
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 active:scale-95 sm:hidden"
            >
              <X className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* CONTROLS */}
        <div className="w-full lg:flex-1 lg:max-w-4xl flex flex-col sm:flex-row lg:items-center gap-2 sm:gap-2.5">
          {/* SEARCH INPUT */}
          <div className="relative w-full sm:flex-1 lg:max-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500" />

            <input
              id="room-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search room number..."
              autoComplete="off"
              className="staylio-search-input !h-9 sm:!h-11 !pl-9 !pr-8 !text-xs sm:!text-sm [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-slate-100 hover:text-gray-700 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* SELECT DROPDOWNS: Responsive 2-column grid on mobile, row on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-1 lg:flex-none items-center gap-2 sm:gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 sm:h-11 w-full rounded-xl border border-[#dbe6f5] bg-[#f6f9fe] px-2.5 text-xs sm:text-sm font-semibold text-[#0e2a4a] outline-none transition focus:border-[#3b82f0] focus:bg-white focus:ring-2 focus:ring-[#3b82f0]/20 lg:w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="booked">Booked</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 sm:h-11 w-full rounded-xl border border-[#dbe6f5] bg-[#f6f9fe] px-2.5 text-xs sm:text-sm font-semibold text-[#0e2a4a] outline-none transition focus:border-[#3b82f0] focus:bg-white focus:ring-2 focus:ring-[#3b82f0]/20 lg:w-[160px]"
            >
              <option value="all">All Types</option>
              {roomTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              value={bedFilter}
              onChange={(e) => setBedFilter(e.target.value)}
              className="col-span-2 sm:col-span-1 h-9 sm:h-11 w-full rounded-xl border border-[#dbe6f5] bg-[#f6f9fe] px-2.5 text-xs sm:text-sm font-semibold text-[#0e2a4a] outline-none transition focus:border-[#3b82f0] focus:bg-white focus:ring-2 focus:ring-[#3b82f0]/20 lg:w-[150px]"
            >
              <option value="all">All Beds</option>
              {bedTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* DESKTOP CLEAR BUTTON */}
          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="hidden sm:inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3.5 text-xs font-bold text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}