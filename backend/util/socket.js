import { Server } from "socket.io";

let ioInstance = null;

/**
 * Initialize Socket.io with the HTTP server instance.
 * Attaches both default "/socket.io" and baseName-prefixed "/<BASE_NAME>/socket.io"
 * so that both local Vite dev server and live reverse proxies (cPanel/Nginx) connect seamlessly.
 */
export const initSocket = (httpServer, allowedOrigins) => {
    const baseName = process.env.BASE_NAME || "hotel-billing-system-backend";

    ioInstance = new Server(httpServer, {
        path: `/${baseName}/socket.io`,
        cors: {
            origin: function (origin, callback) {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(null, true); // Allow connection in local & cross-origin environments
                }
            },
            credentials: true,
        },
    });

    ioInstance.on("connection", (socket) => {
        console.log(`[Socket.io] Client connected: ${socket.id}`);

        // Join tenant room (hotel, branch, or specific user)
        socket.on("joinTenant", ({ hotelId, branchId, userId }) => {
            const hId = hotelId ? String(hotelId) : null;
            const bId = branchId ? String(branchId) : null;
            const uId = userId ? String(userId) : null;

            if (hId) {
                const roomName = bId ? `hotel_${hId}_branch_${bId}` : `hotel_${hId}`;
                socket.join(roomName);
                socket.join(`hotel_${hId}`); // Also join general hotel room
                console.log(`[Socket.io] Socket ${socket.id} joined rooms: [${roomName}, hotel_${hId}]`);
            }

            if (uId) {
                socket.join(`user_${uId}`);
                console.log(`[Socket.io] Socket ${socket.id} joined personal room: user_${uId}`);
            }
        });

        socket.on("leaveTenant", ({ hotelId, branchId, userId }) => {
            const hId = hotelId ? String(hotelId) : null;
            const bId = branchId ? String(branchId) : null;
            const uId = userId ? String(userId) : null;

            if (hId) {
                const roomName = bId ? `hotel_${hId}_branch_${bId}` : `hotel_${hId}`;
                socket.leave(roomName);
                socket.leave(`hotel_${hId}`);
                console.log(`[Socket.io] Socket ${socket.id} left room: ${roomName}`);
            }

            if (uId) {
                socket.leave(`user_${uId}`);
            }
        });

        socket.on("disconnect", () => {
            console.log(`[Socket.io] Client disconnected: ${socket.id}`);
        });
    });

    return ioInstance;
};

/**
 * Get the initialized Socket.io instance
 */
export const getIO = () => {
    return ioInstance;
};

/**
 * Broadcast an event to a tenant (hotel or hotel+branch)
 */
export const emitTenantEvent = (hotelId, branchId, eventName, data = {}) => {
    if (!ioInstance) return;

    const hId = hotelId ? String(hotelId) : null;
    const bId = branchId ? String(branchId) : null;

    if (hId && bId) {
        // Emit to specific branch room AND entire hotel room
        ioInstance.to(`hotel_${hId}_branch_${bId}`).emit(eventName, data);
        ioInstance.to(`hotel_${hId}`).emit(eventName, data);
    } else if (hId) {
        ioInstance.to(`hotel_${hId}`).emit(eventName, data);
    } else {
        // Fallback: emit to all
        ioInstance.emit(eventName, data);
    }
};

/**
 * Broadcast an event directly to a specific user (e.g. When receptionist is blocked)
 */
export const emitUserEvent = (userId, eventName, data = {}) => {
    if (!ioInstance || !userId) return;
    const uId = String(userId);
    ioInstance.to(`user_${uId}`).emit(eventName, data);
};
