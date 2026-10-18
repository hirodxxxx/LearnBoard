const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Ensure recordings directory exists
const recordingsDir = path.join(__dirname, 'lich-su-hoc-tap');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

// Global state
let publicTunnelUrl = process.env.TUNNEL_URL || '';
let currentDefaultRoomId = 'lop-hoc-1';

// Endpoint for getting and setting tunnel info & default room
app.get('/api/tunnel-info', (req, res) => {
  res.json({
    tunnelUrl: publicTunnelUrl,
    roomId: currentDefaultRoomId
  });
});

app.post('/api/tunnel-info', (req, res) => {
  if (req.body && req.body.tunnelUrl) {
    publicTunnelUrl = req.body.tunnelUrl;
    console.log(`[+] Tunnel URL updated: ${publicTunnelUrl}`);
    io.emit('tunnel-url-updated', {
      tunnelUrl: publicTunnelUrl,
      roomId: currentDefaultRoomId
    });
  }
  res.json({ success: true, tunnelUrl: publicTunnelUrl, roomId: currentDefaultRoomId });
});

// Update default room ID from teacher
app.post('/api/update-room-id', (req, res) => {
  if (req.body && req.body.roomId) {
    currentDefaultRoomId = req.body.roomId.trim();
    console.log(`[+] Room ID updated by host: ${currentDefaultRoomId}`);
    io.emit('room-id-updated', { roomId: currentDefaultRoomId });
  }
  res.json({ success: true, roomId: currentDefaultRoomId });
});

// Endpoint to save recorded session directly into lich-su-hoc-tap
app.post('/api/save-recording', (req, res) => {
  const fileName =
    req.query.name ||
    req.headers['x-file-name'] ||
    `record_${Date.now()}.webm`;
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const targetFilePath = path.join(recordingsDir, sanitizedFileName);

  console.log(`[REC] Receiving recording upload: ${sanitizedFileName}`);
  const writeStream = fs.createWriteStream(targetFilePath);

  req.pipe(writeStream);

  writeStream.on('finish', () => {
    let size = 0;
    try {
      size = fs.statSync(targetFilePath).size;
    } catch (e) {}
    console.log(`[REC] Saved session recording: ${sanitizedFileName} (${size} bytes)`);
    res.json({ success: true, fileName: sanitizedFileName, path: targetFilePath, size });
  });

  writeStream.on('error', (err) => {
    console.error('[REC] Error saving recording:', err);
    res.status(500).json({ error: err.message });
  });
});


// Serve frontend build if exists
const distPath = path.join(__dirname, 'client', 'dist');
app.use(express.static(distPath));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 5e7 // 50MB
});

// Room state storage
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      users: new Map(),
      elements: []
    });
  }
  return rooms.get(roomId);
}

io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUser = null;

  // Send current tunnel info & room to new connection
  socket.emit('tunnel-url-updated', {
    tunnelUrl: publicTunnelUrl,
    roomId: currentDefaultRoomId
  });

  // Host updates room ID
  socket.on('set-room-id', ({ roomId }) => {
    if (roomId && roomId.trim()) {
      currentDefaultRoomId = roomId.trim();
      io.emit('room-id-updated', { roomId: currentDefaultRoomId });
    }
  });

  // User joins a classroom
  socket.on('join-room', ({ roomId = currentDefaultRoomId, userName = 'Thành viên', role = 'teacher' }) => {
    currentRoomId = roomId;
    currentUser = { id: socket.id, name: userName, role };

    socket.join(roomId);
    const room = getOrCreateRoom(roomId);
    room.users.set(socket.id, currentUser);

    console.log(`[+] ${userName} (${role}) joined room: ${roomId}`);

    const existingUsers = Array.from(room.users.entries())
      .filter(([id]) => id !== socket.id)
      .map(([id, user]) => ({ id, name: user.name, role: user.role }));

    socket.emit('room-joined', {
      selfId: socket.id,
      users: existingUsers,
      elements: room.elements,
      tunnelUrl: publicTunnelUrl,
      roomId: currentDefaultRoomId
    });

    socket.to(roomId).emit('user-joined', {
      id: socket.id,
      name: userName,
      role
    });
  });

  // WebRTC Signaling
  socket.on('webrtc-signal', ({ targetId, signal }) => {
    io.to(targetId).emit('webrtc-signal', {
      senderId: socket.id,
      senderName: currentUser ? currentUser.name : (currentUser?.role === 'teacher' ? 'Người dạy' : 'Học sinh'),
      senderRole: currentUser ? currentUser.role : '',
      signal
    });
  });

  // Stream recording chunks directly to disk in real-time
  socket.on('record-chunk-append', ({ fileName, chunk }) => {
    if (!fileName || !chunk) return;
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const targetFilePath = path.join(recordingsDir, sanitizedFileName);
    fs.appendFile(targetFilePath, Buffer.from(chunk), (err) => {
      if (err) console.error('[REC] Error appending chunk:', err);
    });
  });

  // Screen Share Status Notification
  socket.on('screen-share-status', ({ isSharing, userName }) => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('screen-share-status', {
      senderId: socket.id,
      senderName: userName || (currentUser ? currentUser.name : 'Người dạy'),
      isSharing
    });
  });

  // Real-time Drawing Stroke
  socket.on('draw-stroke-start', (data) => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('draw-stroke-start', {
      ...data,
      senderId: socket.id
    });
  });

  socket.on('draw-stroke-move', (data) => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('draw-stroke-move', {
      ...data,
      senderId: socket.id
    });
  });

  socket.on('draw-stroke-end', (element) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    if (element) {
      room.elements.push(element);
    }
    socket.to(currentRoomId).emit('draw-stroke-end', {
      element,
      senderId: socket.id
    });
  });

  // Laser Pointer & Cursor Sync
  socket.on('cursor-move', (data) => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('cursor-move', {
      ...data,
      senderId: socket.id,
      userName: currentUser ? currentUser.name : 'Người học'
    });
  });

  // Update / Drag / Resize Element
  socket.on('update-element', (updatedElement) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    const index = room.elements.findIndex((el) => el.id === updatedElement.id);
    if (index !== -1) {
      room.elements[index] = { ...room.elements[index], ...updatedElement };
      socket.to(currentRoomId).emit('update-element', room.elements[index]);
    }
  });

  // Delete Element
  socket.on('delete-element', ({ id }) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    room.elements = room.elements.filter((el) => el.id !== id);
    socket.to(currentRoomId).emit('delete-element', { id });
  });

  // Undo
  socket.on('board-undo', () => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    if (room.elements.length > 0) {
      room.elements.pop();
      io.to(currentRoomId).emit('board-sync-all', room.elements);
    }
  });

  // Clear Board
  socket.on('board-clear', () => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    room.elements = [];
    io.to(currentRoomId).emit('board-sync-all', []);
  });

  // Reactions
  socket.on('send-reaction', ({ type, label }) => {
    if (!currentRoomId) return;
    io.to(currentRoomId).emit('receive-reaction', {
      senderName: currentUser ? currentUser.name : 'Người dạy',
      type,
      label
    });
  });

  // Chat message
  socket.on('send-chat', (message) => {
    if (!currentRoomId) return;
    io.to(currentRoomId).emit('receive-chat', {
      senderId: socket.id,
      senderName: currentUser ? currentUser.name : 'Thành viên',
      role: currentUser ? currentUser.role : 'student',
      text: message,
      timestamp: Date.now()
    });
  });

  // Teacher Ends Class
  socket.on('teacher-ended-class', () => {
    if (!currentRoomId) return;
    console.log(`[Class] Teacher ended class in room: ${currentRoomId}`);
    io.to(currentRoomId).emit('class-ended');
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (currentRoomId && rooms.has(currentRoomId)) {
      const room = rooms.get(currentRoomId);
      const wasTeacher = currentUser && currentUser.role === 'teacher';
      room.users.delete(socket.id);
      socket.to(currentRoomId).emit('user-left', { id: socket.id });

      // If teacher disconnected, notify students
      if (wasTeacher) {
        console.log(`[Class] Teacher disconnected from room: ${currentRoomId}`);
        socket.to(currentRoomId).emit('class-ended');
      }

      if (room.users.size === 0) {
        setTimeout(() => {
          if (rooms.has(currentRoomId) && rooms.get(currentRoomId).users.size === 0) {
            rooms.delete(currentRoomId);
          }
        }, 2 * 60 * 60 * 1000);
      }
    }
    console.log(`[-] Socket disconnected: ${socket.id}`);
  });
});

// Fallback to index.html for SPA routing
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>LearnBoard Server</title><meta charset="utf-8"></head>
          <body style="font-family:sans-serif;text-align:center;padding:50px;background:#1b382b;color:#fff;">
            <h1>LearnBoard Server is Running!</h1>
            <p>Vui lòng build client bằng lệnh <code>npm run build</code> hoặc chạy <code>npm run dev</code> để phát triển.</p>
          </body>
        </html>
      `);
    }
  });
});

const PORT = process.env.PORT || 5000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[!] Cổng ${PORT} đang bị một tiến trình khác chiếm giữ.`);
  } else {
    console.error('[!] Lỗi Server:', err.message);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`  LEARNBOARD SERVER RUNNING`);
  console.log(`  Local URL:   http://localhost:${PORT}`);
  console.log(`  Recordings:  ${recordingsDir}`);
  console.log(`===============================================`);
});
