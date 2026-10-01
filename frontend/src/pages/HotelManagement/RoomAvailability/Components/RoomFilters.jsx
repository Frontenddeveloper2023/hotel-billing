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
    <div className="w-full min-w-0 rounded-3xl bg-white shadow-[0_14px_36px_rgba(6,20,52,0.14)] p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        {/* TITLE */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] flex items-center justify-center text-white shadow-sm shadow-blue-500/25">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#0e2a4a]">Room Filters</h3>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#2568e0] text-white text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#8fa2ba] mt-0.5">Find rooms quickly</p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="w-full lg:flex-1 lg:max-w-4xl flex flex-col sm:flex-row lg:items-center gap-2.5">
         <div className="relative w-full sm:flex-1 lg:max-w-[260px]">
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa2ba] pointer-events-none" />

    <input
        id="room-search"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search room number..."
        autoComplete="off"
        className="
            w-full
            h-11
            pl-10
            pr-9
            border
            border-[#dbe6f5]
            rounded-xl
            text-sm
            text-[#0e2a4a]
            bg-[#f6f9fe]
            outline-none
            transition
            focus:bg-white
            focus:border-[#3b82f0]
            focus:ring-2
            focus:ring-[#3b82f0]/20

            [&::-webkit-search-cancel-button]:appearance-none
            [&::-webkit-search-decoration]:appearance-none
        "
    />

    {search && (
        <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#8fa2ba] hover:bg-slate-100 transition"
        >
            <X className="w-4 h-4" />
        </button>
    )}
</div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${selectClass} lg:w-[150px] lg:flex-none`}>
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="booked">Booked</option>
          </select>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`${selectClass} lg:w-[170px] lg:flex-none`}>
            <option value="all">All Room Types</option>
            {roomTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>

          <select value={bedFilter} onChange={(e) => setBedFilter(e.target.value)} className={`${selectClass} lg:w-[160px] lg:flex-none`}>
            <option value="all">All Bed Types</option>
            {bedTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>

          {hasFilters && (
            <button type="button" onClick={resetFilters}
              className="w-full sm:w-auto shrink-0 h-11 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition focus:outline-none focus:ring-2 focus:ring-red-200">
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {hasFilters && (
        <div className="mt-4 pt-3 border-t border-[#eef3fa] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#2568e0] shrink-0" />
          <p className="text-[11px] sm:text-xs text-[#6b7f99]">Filters are active. Showing matching rooms.</p>
        </div>
      )}
    </div>
  );
}