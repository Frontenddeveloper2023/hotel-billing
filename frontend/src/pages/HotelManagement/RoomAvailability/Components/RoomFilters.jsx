import React from "react";
import {
    Filter,
    Search,
    X,
} from "lucide-react";

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
    const hasFilters =
        statusFilter !== "all" ||
        typeFilter !== "all" ||
        bedFilter !== "all" ||
        search.trim() !== "";

    const activeFilterCount = [
        statusFilter !== "all",
        typeFilter !== "all",
        bedFilter !== "all",
        search.trim() !== "",
    ].filter(Boolean).length;

    const inputClass = `
        w-full
        h-11
        px-3
        border
        border-slate-200
        rounded-xl
        text-sm
        text-slate-800
        bg-gray-100
        outline-none
        transition-all
        duration-150
        border-slate-300
        focus:border-[var(--teal,#08838d)]
        focus:ring-2
        focus:ring-[var(--teal,#08838d)]/10
    `;

    return (
        <div
            className="
                w-full
                min-w-0
                bg-white
                border
                border-slate-200
                rounded-2xl
                p-4
                sm:p-5
            "
        >
            {/* ================= HEADER ================= */}
     <div className="w-full">
    {/* HEADER */}
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">

        {/* LEFT: TITLE */}
        <div className="flex items-center gap-2.5 shrink-0">
            <div
                className="
                    w-9
                    h-9
                    shrink-0
                    rounded-xl
                    bg-slate-100
                    flex
                    items-center
                    justify-center
                "
            >
                <Filter className="w-4 h-4 text-slate-600" />
            </div>

            <div>
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                        Room Filters
                    </h3>

                    {activeFilterCount > 0 && (
                        <span
                            className="
                                inline-flex
                                items-center
                                justify-center
                                min-w-5
                                h-5
                                px-1.5
                                rounded-full
                                bg-[var(--teal,#08838d)]
                                text-white
                                text-[10px]
                                font-bold
                            "
                        >
                            {activeFilterCount}
                        </span>
                    )}
                </div>

                <p className="text-[11px] text-slate-400 mt-0.5">
                    Find rooms quickly
                </p>
            </div>
        </div>

        {/* RIGHT: ALL FILTERS */}
        <div
            className="
                w-full
                lg:flex-1
                lg:max-w-4xl
                flex
                flex-col
                sm:flex-row
                lg:items-center
                gap-2.5
            "
        >
            {/* SEARCH */}
            <div className="relative w-full sm:flex-1 lg:max-w-[260px]">
                <Search
                    className="
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        w-4
                        h-4
                        text-slate-400
                        pointer-events-none
                    "
                />

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
                        pr-3
                        border
                        border-slate-200
                        rounded-xl
                        text-sm
                        text-slate-800
                        bg-white
                        outline-none
                        transition
                        hover:border-slate-300
                        focus:border-[var(--teal,#08838d)]
                        focus:ring-2
                        focus:ring-[var(--teal,#08838d)]/10
                    "
                />

                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="
                            absolute
                            right-2.5
                            top-1/2
                            -translate-y-1/2
                            w-7
                            h-7
                            rounded-lg
                            flex
                            items-center
                            justify-center
                            text-slate-400
                            hover:bg-slate-100
                        "
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* STATUS */}
            <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="
                    w-full
                    sm:flex-1
                    lg:w-[150px]
                    lg:flex-none
                    h-11
                    px-3
                    border
                    border-slate-200
                    rounded-xl
                    text-sm
                    bg-white
                    outline-none
                    focus:border-[var(--teal,#08838d)]
                    focus:ring-2
                    focus:ring-[var(--teal,#08838d)]/10
                "
            >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="booked">Booked</option>
            </select>

            {/* ROOM TYPE */}
            <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="
                    w-full
                    sm:flex-1
                    lg:w-[170px]
                    lg:flex-none
                    h-11
                    px-3
                    border
                    border-slate-200
                    rounded-xl
                    text-sm
                    bg-white
                    outline-none
                    focus:border-[var(--teal,#08838d)]
                    focus:ring-2
                    focus:ring-[var(--teal,#08838d)]/10
                "
            >
                <option value="all">All Room Types</option>

                {roomTypes.map((type) => (
                    <option key={type} value={type}>
                        {type}
                    </option>
                ))}
            </select>

            {/* BED TYPE */}
            <select
                value={bedFilter}
                onChange={(e) => setBedFilter(e.target.value)}
                className="
                    w-full
                    sm:flex-1
                    lg:w-[160px]
                    lg:flex-none
                    h-11
                    px-3
                    border
                    border-slate-200
                    rounded-xl
                    text-sm
                    bg-white
                    outline-none
                    focus:border-[var(--teal,#08838d)]
                    focus:ring-2
                    focus:ring-[var(--teal,#08838d)]/10
                "
            >
                <option value="all">All Bed Types</option>

                {bedTypes.map((type) => (
                    <option key={type} value={type}>
                        {type}
                    </option>
                ))}
            </select>

            {/* CLEAR */}
            {hasFilters && (
                <button
                    type="button"
                    onClick={resetFilters}
                    className="
                        w-full
                        sm:w-auto
                        shrink-0
                        h-11
                        inline-flex
                        items-center
                        justify-center
                        gap-1.5
                        px-4
                        rounded-xl
                        text-xs
                        font-semibold
                        text-red-600
                        bg-red-50
                        border
                        border-red-100
                        hover:bg-red-100
                        transition
                        focus:outline-none
                        focus:ring-2
                        focus:ring-red-200
                    "
                >
                    <X className="w-3.5 h-3.5" />
                    Clear
                </button>
            )}
        </div>
    </div>
</div>




            {/* ================= ACTIVE FILTER INFO ================= */}
            {hasFilters && (
                <div
                    className="
                        mt-4
                        pt-3
                        border-t
                        border-slate-100
                        flex
                        items-center
                        gap-2
                    "
                >
                    <span
                        className="
                            w-2
                            h-2
                            rounded-full
                            bg-[var(--teal,#08838d)]
                            shrink-0
                        "
                    />

                    <p className="text-[11px] sm:text-xs text-slate-500">
                        Filters are active. Showing matching rooms.
                    </p>
                </div>
            )}
        </div>
    );
}