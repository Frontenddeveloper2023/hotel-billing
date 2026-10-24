import React, { memo, useEffect, useMemo, useState } from "react";

import {
    DoorOpen,
    Plus,
    Lock,
    ShieldAlert,
    Crown,
    Layers,
    CheckCircle2,
    Users,
    BedDouble,
} from "lucide-react";

import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "../../../Context/ToastContext";
import { useSubscription } from "../../../Context/SubscriptionContext";

import RoomFilters from "./Components/RoomFilters";
import RoomCard from "./Components/RoomCard";
import AddRoom from "./Components/AddRoom";
import EditRoom from "./Components/EditRoom";
import DeleteRoom from "./Components/DeleteRoom";

import {
    listRooms,
    createRoom,
    updateRoom,
    deleteRoom,
} from "../../../service/roomService";



// ======================================================
// STYLE + SHARED UI
// ======================================================

const styles = `
@keyframes ra-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes ra-pop{from{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}
@keyframes ra-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes rc-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.ra-in{opacity:0;animation:ra-up .5s cubic-bezier(.2,.7,.2,1) forwards}
.ra-pop{animation:ra-pop .3s cubic-bezier(.2,.8,.2,1)}
.ra-bar{transform-origin:left;animation:ra-grow .8s .2s cubic-bezier(.2,.7,.2,1) both}
.rc-in{opacity:0;animation:rc-in .45s cubic-bezier(.2,.7,.2,1) forwards}
@media (prefers-reduced-motion:reduce){.ra-in,.ra-bar,.rc-in{animation:none;opacity:1}.ra-pop{animation:none}}
`;

const delay = (i, step = 55) => ({ animationDelay: `${Math.min(i, 12) * step}ms` });
const card = "rounded-3xl bg-white shadow-[0_18px_45px_rgba(6,20,52,0.16)]";

const SummaryCard = memo(({ title, value, icon: Icon, cls, loading, index, extra }) => (
    <div style={delay(index)} className={`ra-in ${card} p-5 hover:-translate-y-1 transition-transform duration-300`}>
        <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-wider text-[#6b7f99] uppercase">{title}</p>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cls}`}><Icon className="w-4 h-4" /></div>
        </div>
        <div className="mt-3">{loading ? <div className="h-8 w-16 bg-slate-100 rounded-lg animate-pulse" /> : value}</div>
        {extra}
    </div>
));

export default function RoomAvailability({ onNewBooking }) {
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // SUBSCRIPTION & PLAN LIMITS from unified SubscriptionContext
    const { subData, refresh: refreshSubscription } = useSubscription();
    const subscription = subData;
    const plan = subData?.planId && typeof subData.planId === "object" ? subData.planId : null;

    // MODALS
    const [showAddRoom, setShowAddRoom] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [deletingRoom, setDeletingRoom] = useState(null);

    // FILTERS
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [bedFilter, setBedFilter] = useState("all");
    const [search, setSearch] = useState("");

    // FETCH ROOMS FROM BACKEND API
    const fetchRooms = async () => {
        try {
            setLoading(true);
            setError("");
            const response = await listRooms();
            const roomData = response?.rooms || response?.data || response || [];
            setRooms(Array.isArray(roomData) ? roomData : []);
            return Array.isArray(roomData) ? roomData : [];
        } catch (err) {
            console.error("Failed to fetch rooms:", err);
            setError(err?.message || "Failed to load rooms from server.");
            return [];
        } finally {
            setLoading(false);
        }
    };

    // HANDLE STATUS CHANGE (e.g. manually changing occupied room to available)
    const handleStatusChange = async (roomId, newStatus) => {
        try {
            // Optimistic update
            setRooms((prev) =>
                prev.map((r) =>
                    (r._id === roomId || r.id === roomId)
                        ? { ...r, status: newStatus }
                        : r
                )
            );

            const res = await updateRoom(roomId, { status: newStatus });
            if (res?.success) {
                toast.success(`Room status changed to ${newStatus}!`);
            }
        } catch (err) {
            console.error("Failed to change room status:", err);
            toast.error(err?.message || "Failed to update room status.");
            // Re-fetch to restore correct state on error
            fetchRooms();
        }
    };

    // Load rooms on component mount & listen for real-time upgrade
    useEffect(() => {
        const loadInitialData = async () => {
            const fetchedRooms = await fetchRooms();
            
            // Check if we were redirected to automatically open the Add Room modal
            if (location.state?.autoOpenAddRoom && fetchedRooms.length === 0) {
                setShowAddRoom(true);
                // Clear the state so it doesn't auto-open on manual refresh
                navigate(".", { replace: true, state: {} });
            }
        };
        
        loadInitialData();

        const handleSubscriptionUpdated = () => {
            fetchRooms();
        };

        const handleHotelManagementUpdated = () => {
            fetchRooms();
        };

        window.addEventListener("subscriptionUpdated", handleSubscriptionUpdated);
        window.addEventListener("hotelManagementUpdated", handleHotelManagementUpdated);
        return () => {
            window.removeEventListener("subscriptionUpdated", handleSubscriptionUpdated);
            window.removeEventListener("hotelManagementUpdated", handleHotelManagementUpdated);
        };
    }, []);

    // REAL API HANDLERS PASSED TO MODAL COMPONENTS

    const handleCreateRoomAPI = async (roomData) => {
        try {
            if (isRoomLimitReached) {
                toast.warn(
                    `Room allocation limit reached! Your current ${planName} plan allows a maximum of ${roomLimit} room(s). If you want to add more rooms, please upgrade your plan.`,
                    6000
                );
                throw new Error(
                    `Your current plan allows a maximum of ${roomLimit} room(s). Please upgrade your plan to add more rooms.`
                );
            }

            await createRoom(roomData);
            toast.success("Room added successfully!");
            setShowAddRoom(false);
            await fetchRooms();
            refreshSubscription();
        } catch (err) {
            console.error("Failed to create room:", err);
            throw err;
        }
    };

    const handleUpdateRoomAPI = async (id, updatedData) => {
        try {
            await updateRoom(id, updatedData);
            toast.success("Room updated successfully!");
            setEditingRoom(null);
            await fetchRooms();
        } catch (err) {
            console.error("Failed to update room:", err);
            throw err;
        }
    };

    const handleDeleteRoomAPI = async (id) => {
        try {
            await deleteRoom(id);
            toast.success("Room deleted successfully!");
            setDeletingRoom(null);
            await fetchRooms();
            refreshSubscription();
        } catch (err) {
            console.error("Failed to delete room:", err);
            throw err;
        }
    };

    // ROOM TYPES / BED TYPES
    const roomTypes = useMemo(() => [...new Set(rooms.map((room) => room.roomType).filter(Boolean))], [rooms]);
    const bedTypes = useMemo(() => [...new Set(rooms.map((room) => room.bedType).filter(Boolean))], [rooms]);

    // FILTER ROOMS
    const filteredRooms = useMemo(() => {
        const searchValue = search.toLowerCase().trim();

        return rooms.filter((room) => {
            const status = String(room.status || "").toLowerCase();
            const statusMatch = statusFilter === "all" || status === statusFilter;
            const typeMatch = typeFilter === "all" || room.roomType === typeFilter;
            const bedMatch = bedFilter === "all" || room.bedType === bedFilter;
            const searchMatch = String(room.roomNumber || "").toLowerCase().includes(searchValue);

            return statusMatch && typeMatch && bedMatch && searchMatch;
        });
    }, [rooms, statusFilter, typeFilter, bedFilter, search]);

    // ROOM COUNTS
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((room) => String(room.status || "").toLowerCase() === "available").length;
    const occupiedRooms = rooms.filter((room) => String(room.status || "").toLowerCase() === "booked").length;

    // PLAN LIMITS & ALLOCATION
    const roomLimit = Number(subscription?.limits?.rooms ?? subscription?.planId?.limits?.rooms ?? plan?.limits?.rooms ?? 0);
    const planName = plan?.planName || subscription?.planId?.planName || "Current Plan";
    const isRoomLimitReached = roomLimit > 0 && totalRooms >= roomLimit;
    const roomsRemaining = roomLimit > 0 ? Math.max(0, roomLimit - totalRooms) : null;

    const handleAddRoomClick = () => {
        if (isRoomLimitReached) {
            toast.warn(
                `Your plan room allocation limit has been reached! Your current ${planName} plan allows a maximum of ${roomLimit} room${roomLimit === 1 ? "" : "s"} per branch (${totalRooms}/${roomLimit} used). If you want to add more rooms, please upgrade your subscription plan.`,
                6500
            );
            return;
        }

        setShowAddRoom(true);
    };

    const resetFilters = () => {
        setStatusFilter("all");
        setTypeFilter("all");
        setBedFilter("all");
        setSearch("");
    };

    const usagePct = roomLimit > 0 ? Math.min(100, Math.round((totalRooms / roomLimit) * 100)) : 0;

    // RENDER
    return (
        <div className="space-y-5 sm:space-y-6 pt-2 font-['Inter']">
            <style>{styles}</style>

            {/* HEADER */}
            <div className="ra-in flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-extrabold tracking-tight text-white leading-tight">
                        Room Availability
                    </h1>
                </div>
            </div>

            {/* ERROR */}
            {error && (
                <div className="ra-pop bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-600">{error}</div>
            )}

            {/* SUMMARY (All 3 Cards in the Same Row - Centered Numbers, Medium Sized) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
                {/* CARD 1: Total Rooms */}
                <div style={delay(1)} className={`ra-in ${card} flex flex-col justify-between p-2.5 sm:p-4 hover:-translate-y-0.5 transition-transform duration-300 text-center`}>
                    <div>
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#6b7f99] leading-tight">
                            Total
                        </p>
                    </div>

                    <div className="my-1 sm:my-2 flex justify-center">
                        {loading ? (
                            <div className="h-6 w-10 bg-slate-100 rounded animate-pulse" />
                        ) : (
                            <div className="flex items-baseline justify-center gap-1">
                                <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-[#0e2a4a]">
                                    {totalRooms}
                                </p>
                                {roomLimit > 0 && (
                                    <span className="text-[10px] sm:text-xs font-bold text-[#6b7f99] whitespace-nowrap">
                                        / {roomLimit}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {roomLimit > 0 && !loading ? (
                        <div>
                            <div className="h-1 w-full overflow-hidden rounded-full bg-[#e8f0fb] sm:h-1.5">
                                <div
                                    className={`ra-bar h-full rounded-full ${isRoomLimitReached ? "bg-amber-500" : "bg-gradient-to-r from-[#5b9bf5] to-[#2568e0]"}`}
                                    style={{ width: `${usagePct}%` }}
                                />
                            </div>
                            <p className="mt-1 text-[9px] sm:text-[11px] font-semibold text-[#6b7f99] whitespace-nowrap leading-none">
                                {isRoomLimitReached ? "Full" : `${roomsRemaining} left`}
                            </p>
                        </div>
                    ) : (
                        <p className="text-[9px] sm:text-[11px] font-medium text-[#6b7f99] whitespace-nowrap leading-none">
                            All Rooms
                        </p>
                    )}
                </div>

                {/* CARD 2: Available Rooms */}
                <div style={delay(2)} className={`ra-in ${card} flex flex-col justify-between p-2.5 sm:p-4 hover:-translate-y-0.5 transition-transform duration-300 text-center`}>
                    <div>
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 leading-tight">
                            Available
                        </p>
                    </div>

                    <div className="my-1 sm:my-2 flex justify-center">
                        {loading ? (
                            <div className="h-6 w-10 bg-emerald-50 rounded animate-pulse" />
                        ) : (
                            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-emerald-600">
                                {availableRooms}
                            </p>
                        )}
                    </div>

                    <p className="text-[9px] sm:text-[11px] font-semibold text-emerald-700 whitespace-nowrap leading-none">
                        Ready
                    </p>
                </div>

                {/* CARD 3: Occupied Rooms */}
                <div style={delay(3)} className={`ra-in ${card} flex flex-col justify-between p-2.5 sm:p-4 hover:-translate-y-0.5 transition-transform duration-300 text-center`}>
                    <div>
                        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700 leading-tight">
                            Occupied
                        </p>
                    </div>

                    <div className="my-1 sm:my-2 flex justify-center">
                        {loading ? (
                            <div className="h-6 w-10 bg-amber-50 rounded animate-pulse" />
                        ) : (
                            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-amber-600">
                                {occupiedRooms}
                            </p>
                        )}
                    </div>

                    <p className="text-[9px] sm:text-[11px] font-semibold text-amber-700 whitespace-nowrap leading-none">
                        Booked
                    </p>
                </div>
            </div>

            {/* ROOM LIMIT REACHED BANNER */}
            {isRoomLimitReached && (
                <div className="ra-pop flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                    <div className="flex items-start sm:items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-950">
                                Room Allocation Limit Reached ({totalRooms}/{roomLimit} Rooms)
                            </p>
                            <p className="text-xs text-amber-800 mt-0.5">
                                Your current <span className="font-semibold">{planName}</span> plan allows a maximum of {roomLimit} room{roomLimit === 1 ? "" : "s"}. If you want to add more rooms, please upgrade your plan.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate("/plan-upgrade")}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shrink-0 transition-colors shadow-sm cursor-pointer"
                    >
                        <Crown className="w-3.5 h-3.5" />
                        Upgrade Plan
                    </button>
                </div>
            )}

            {/* FILTERS */}
            <RoomFilters
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                bedFilter={bedFilter}
                setBedFilter={setBedFilter}
                search={search}
                setSearch={setSearch}
                roomTypes={roomTypes}
                bedTypes={bedTypes}
                resetFilters={resetFilters}
            />

            {/* ROOMS */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-white">Rooms</h2>
                        <p className="text-xs text-white/80 mt-0.5">
                            {loading ? "Loading rooms..." : `${filteredRooms.length} rooms shown`}
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <button
                            type="button"
                            onClick={handleAddRoomClick}
                            title={
                                isRoomLimitReached
                                    ? `Plan room allocation limit reached (${totalRooms}/${roomLimit} rooms). Click to learn how to upgrade.`
                                    : "Add Room"
                            }
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer transition-all shadow-sm ${
                                isRoomLimitReached
                                    ? "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-400"
                                    : "border border-white/30 bg-white/95 backdrop-blur-md text-[#0e2a4a] hover:bg-white hover:border-[#a8cbff]"
                            }`}
                        >
                            {isRoomLimitReached ? <Lock className="w-4 h-4 text-amber-600" /> : <DoorOpen className="w-4 h-4" />}
                            Add Room
                            {isRoomLimitReached && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 uppercase tracking-tight">
                                    Quota Full
                                </span>
                            )}
                        </button>

                        {onNewBooking && (
                            <button
                                type="button"
                                onClick={onNewBooking}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] hover:brightness-110 text-white text-xs sm:text-sm font-bold cursor-pointer transition shadow-md shadow-blue-500/25"
                            >
                                <Plus className="w-4 h-4" />
                                New Booking
                            </button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="h-[300px] rounded-3xl bg-white/70 animate-pulse" />)}
                    </div>
                ) : filteredRooms.length === 0 ? (
                    <div className={`${card} py-16 text-center border border-dashed border-[#dbe6f5]`}>
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#eaf3ff] text-[#2568e0] flex items-center justify-center"><BedDouble size={26} /></div>
                        <p className="mt-4 font-semibold text-[#0e2a4a]">No rooms found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredRooms.map((room, i) => (
                            <RoomCard
                                key={room._id || room.id}
                                room={room}
                                index={i}
                                onEdit={setEditingRoom}
                                onDelete={setDeletingRoom}
                                onStatusChange={handleStatusChange}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ADD ROOM MODAL */}
            <AddRoom
                open={showAddRoom}
                onClose={() => setShowAddRoom(false)}
                onSuccess={async () => {
                    await fetchRooms();
                    refreshSubscription();
                }}
                createRoom={handleCreateRoomAPI}
                roomLimit={roomLimit}
                totalRooms={totalRooms}
                isRoomLimitReached={isRoomLimitReached}
                planName={planName}
            />

            {/* EDIT ROOM MODAL */}
            <EditRoom
                room={editingRoom}
                onClose={() => setEditingRoom(null)}
                onSuccess={fetchRooms}
                updateRoom={handleUpdateRoomAPI}
                rooms={rooms}
            />

            {/* DELETE ROOM MODAL */}
            <DeleteRoom
                room={deletingRoom}
                onClose={() => setDeletingRoom(null)}
                onSuccess={fetchRooms}
                deleteRoom={handleDeleteRoomAPI}
            />
        </div>
    );
}