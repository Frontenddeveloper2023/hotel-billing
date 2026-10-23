import { io } from "socket.io-client";

let socket = null;

/**
 * Get or initialize the singleton Socket.io client connection.
 * Automatically inspects VITE_BACKEND_URL:
 * - If live (e.g. https://jayam.co.in/hotel-billing-system-backend), uses path: "/hotel-billing-system-backend/socket.io"
 * - If local (e.g. http://localhost:5000), uses path: "/hotel-billing-system-backend/socket.io" (or "/socket.io")
 */
export const getSocket = () => {
    if (!socket) {
        const envUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
        let socketOrigin = envUrl;
        let socketPath = "/socket.io";

        try {
            const parsed = new URL(envUrl);
            socketOrigin = parsed.origin;
            const pathname = parsed.pathname.replace(/\/+$/, "");
            if (pathname && pathname !== "/") {
                socketPath = `${pathname}/socket.io`;
            }
        } catch {
            socketOrigin = envUrl;
        }

        console.log(`[Socket] Initializing connection to ${socketOrigin} with path ${socketPath}`);

        socket = io(socketOrigin, {
            path: socketPath,
            withCredentials: true,
            autoConnect: true,
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
        });

        socket.on("connect", () => {
            console.log("[Socket] Connected to server:", socket.id);
            // Re-join tenant room and user room if session active
            const activeHotelId = sessionStorage.getItem("socketHotelId");
            const activeBranchId = sessionStorage.getItem("socketBranchId");
            const activeUserId = sessionStorage.getItem("socketUserId");

            if (activeHotelId || activeUserId) {
                socket.emit("joinTenant", {
                    hotelId: activeHotelId,
                    branchId: activeBranchId,
                    userId: activeUserId,
                });
            }
        });

        socket.on("disconnect", (reason) => {
            console.log("[Socket] Disconnected:", reason);
        });

        socket.on("connect_error", (err) => {
            console.warn("[Socket] Connection error:", err.message);
        });
    }
    return socket;
};

/**
 * Join tenant room (hotel or hotel+branch or user) for real-time isolation.
 */
export const joinTenantRoom = (hotelId, branchId, userId) => {
    const s = getSocket();
    if (hotelId) {
        sessionStorage.setItem("socketHotelId", String(hotelId));
    }
    if (branchId) {
        sessionStorage.setItem("socketBranchId", String(branchId));
    }
    if (userId) {
        sessionStorage.setItem("socketUserId", String(userId));
    }

    s.emit("joinTenant", { hotelId, branchId, userId });
};

/**
 * Leave tenant room on logout or tenant switch.
 */
export const leaveTenantRoom = (hotelId, branchId, userId) => {
    sessionStorage.removeItem("socketHotelId");
    sessionStorage.removeItem("socketBranchId");
    sessionStorage.removeItem("socketUserId");

    if (socket) {
        socket.emit("leaveTenant", { hotelId, branchId, userId });
    }
};
