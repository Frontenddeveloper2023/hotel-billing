import React, {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    DoorOpen,
    Plus,
} from "lucide-react";

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

export default function RoomAvailability({
    onNewBooking,
}) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // =====================================================
    // MODALS
    // =====================================================

    const [showAddRoom, setShowAddRoom] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [deletingRoom, setDeletingRoom] = useState(null);

    // =====================================================
    // FILTERS
    // =====================================================

    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [bedFilter, setBedFilter] = useState("all");
    const [search, setSearch] = useState("");

    // =====================================================
    // FETCH ROOMS FROM BACKEND API
    // =====================================================

    const fetchRooms = async () => {
        try {
            setLoading(true);
            setError("");
            const response = await listRooms();
            // Handle different possible API response structures (array or wrapped object)
            const roomData = response?.rooms || response?.data || response || [];
            setRooms(Array.isArray(roomData) ? roomData : []);
        } catch (err) {
            console.error("Failed to fetch rooms:", err);
            setError(err?.message || "Failed to load rooms from server.");
        } finally {
            setLoading(false);
        }
    };

    // Load rooms on component mount
    useEffect(() => {
        fetchRooms();
    }, []);

    // =====================================================
    // REAL API HANDLERS PASSED TO MODAL COMPONENTS
    // =====================================================

    // Create room API call
    const handleCreateRoomAPI = async (roomData) => {
        try {
            await createRoom(roomData);
            setShowAddRoom(false);
            await fetchRooms(); // Refresh room list from server
        } catch (err) {
            console.error("Failed to create room:", err);
            throw err; // Let modal handle/display the error if needed
        }
    };

    // Update room API call
    const handleUpdateRoomAPI = async (id, updatedData) => {
        try {
            await updateRoom(id, updatedData);
            setEditingRoom(null);
            await fetchRooms(); // Refresh room list from server
        } catch (err) {
            console.error("Failed to update room:", err);
            throw err;
        }
    };

    // Delete room API call
    const handleDeleteRoomAPI = async (id) => {
        try {
            await deleteRoom(id);
            setDeletingRoom(null);
            await fetchRooms(); // Refresh room list from server
        } catch (err) {
            console.error("Failed to delete room:", err);
            throw err;
        }
    };

    // =====================================================
    // ROOM TYPES
    // =====================================================

    const roomTypes = useMemo(() => {
        return [
            ...new Set(
                rooms
                    .map((room) => room.roomType)
                    .filter(Boolean)
            ),
        ];
    }, [rooms]);

    // =====================================================
    // BED TYPES
    // =====================================================

    const bedTypes = useMemo(() => {
        return [
            ...new Set(
                rooms
                    .map((room) => room.bedType)
                    .filter(Boolean)
            ),
        ];
    }, [rooms]);

    // =====================================================
    // FILTER ROOMS
    // =====================================================

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

    // =====================================================
    // ROOM COUNTS
    // =====================================================

    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(
        (room) => String(room.status || "").toLowerCase() === "available"
    ).length;
    const occupiedRooms = rooms.filter(
        (room) => String(room.status || "").toLowerCase() === "booked"
    ).length;

    // =====================================================
    // RESET FILTERS
    // =====================================================

    const resetFilters = () => {
        setStatusFilter("all");
        setTypeFilter("all");
        setBedFilter("all");
        setSearch("");
    };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="space-y-6 pt-5 bg-white">

            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Room Availability
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage hotel rooms and check room availability dynamically.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={() => setShowAddRoom(true)}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-bold cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                        <DoorOpen className="w-4 h-4" />
                        Add Room
                    </button>

                    {onNewBooking && (
                        <button
                            type="button"
                            onClick={onNewBooking}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--teal-dark,#065b62)] text-white text-sm font-bold cursor-pointer hover:bg-[var(--teal,#08838d)] transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            New Booking
                        </button>
                    )}
                </div>
            </div>

            {/* ERROR */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* SUMMARY */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  {/* Total Rooms Card */}
  <div className="bg-slate-300 border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-bold tracking-wider text-black  uppercase">Total Rooms</p>
      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
    </div>
    <p className="text-2xl text-slate-900 font-extrabold mt-3 tracking-tight">{loading ? "..." : totalRooms}</p>
  </div>

  {/* Available Rooms Card */}
  <div className="bg-slate-300 border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-bold tracking-wider text-black uppercase">Available</p>
      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
    <p className="text-2xl text-emerald-700 font-extrabold mt-3 tracking-tight">{loading ? "..." : availableRooms}</p>
  </div>

  {/* Occupied Rooms Card */}
  <div className="bg-slate-300 border border-slate-200/80 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-bold tracking-wider text-black uppercase">Occupied</p>
      <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    </div>
    <p className="text-2xl text-amber-700 font-extrabold mt-3 tracking-tight">{loading ? "..." : occupiedRooms}</p>
  </div>
</div>

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
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-sm font-bold">Rooms</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            {loading ? "Loading rooms..." : `${filteredRooms.length} rooms shown`}
                        </p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-16 text-sm text-slate-500">
                        Loading rooms...
                    </div>
                ) : filteredRooms.length === 0 ? (
                    <div className="bg-white border border-dashed border-slate-300 rounded-xl py-16 text-center">
                        <p className="font-semibold text-slate-700">No rooms found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredRooms.map((room) => (
                            <RoomCard
                                key={room._id || room.id}
                                room={room}
                                onEdit={setEditingRoom}
                                onDelete={setDeletingRoom}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ADD ROOM MODAL */}
            <AddRoom
                open={showAddRoom}
                onClose={() => setShowAddRoom(false)}
                onSuccess={fetchRooms}
                createRoom={handleCreateRoomAPI}
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