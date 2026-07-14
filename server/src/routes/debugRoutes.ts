
import express from 'express';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/sockets', protect, (req, res) => {
    // Access 'io' from app settings
    const io = req.app.get('io');

    if (!io) {
        return res.status(500).json({ message: 'Socket.io instance not found' });
    }

    const start = Date.now();

    // Get all rooms and sockets
    // io.sockets.adapter.rooms is a Map<RoomId, Set<SocketId>>
    const roomsMap = io.sockets.adapter.rooms;
    const sidsMap = io.sockets.adapter.sids;

    const rooms: Record<string, string[]> = {};

    // Filter out rooms that are just socket IDs (default rooms)
    roomsMap.forEach((socketIds: Set<string>, roomId: string) => {
        if (!sidsMap.has(roomId)) {
            rooms[roomId] = includedSockets(socketIds);
        }
    });

    function includedSockets(set: Set<string>) {
        return Array.from(set);
    }

    res.json({
        total_connections: io.engine.clientsCount,
        rooms,
        uptime: process.uptime(),
        processing_time: Date.now() - start
    });
});

export default router;
