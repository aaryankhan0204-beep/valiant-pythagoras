/**
 * Local Development Sync Server
 * Emulates Firebase Realtime Database pub/sub for debugging realtime collaboration.
 *
 * Usage:  node server.js
 * Port:   3001 (WebSocket on same port as HTTP)
 *
 * Message protocol (JSON over WebSocket):
 *   Client -> Server:
 *     { type: 'JOIN',         roomId, userId, userName, userColor }
 *     { type: 'BOARD_UPDATE', roomId, userId, board }
 *     { type: 'CURSOR_MOVE',  roomId, userId, x, y }
 *     { type: 'PING' }
 *
 *   Server -> Client:
 *     { type: 'BOARD_STATE',    board }
 *     { type: 'USERS_UPDATE',   users }
 *     { type: 'CURSOR_UPDATE',  userId, userName, userColor, x, y }
 *     { type: 'PONG' }
 *     { type: 'ERROR',          message }
 */

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'server-data.json');
const PORT = 3001;

// ── Persistent storage ───────────────────────────────────────────────────────
function loadData() {
  if (existsSync(DATA_FILE)) {
    try { return JSON.parse(readFileSync(DATA_FILE, 'utf-8')); }
    catch { console.warn('[server] Could not parse server-data.json, starting fresh'); }
  }
  return {};
}

function saveData(data) {
  try { writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
  catch (e) { console.warn('[server] Could not write server-data.json:', e.message); }
}

// In-memory room state: rooms[roomId] = { board, users: Map<userId, {id,name,color,ws}> }
const rooms = {};
const boardStore = loadData();

function getRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = { board: boardStore[roomId] || null, users: new Map() };
  }
  return rooms[roomId];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function send(ws, obj) {
  if (ws.readyState === 1 /* OPEN */) ws.send(JSON.stringify(obj));
}

function broadcastToRoom(roomId, obj, exceptUserId = null) {
  const room = rooms[roomId];
  if (!room) return;
  for (const [uid, u] of room.users) {
    if (uid !== exceptUserId) send(u.ws, obj);
  }
}

function broadcastUsersUpdate(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  const users = Array.from(room.users.values()).map(u => ({
    id: u.id, name: u.name, color: u.color, avatar: ''
  }));
  for (const u of room.users.values()) send(u.ws, { type: 'USERS_UPDATE', users });
}

// ── HTTP + WebSocket server ──────────────────────────────────────────────────
const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Valiant local sync server OK\n');
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  let currentUserId = null;
  let currentRoomId = null;

  console.log('[server] New WS connection');

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch { send(ws, { type: 'ERROR', message: 'Invalid JSON' }); return; }

    const { type, roomId, userId } = msg;

    // JOIN
    if (type === 'JOIN') {
      currentRoomId = roomId;
      currentUserId = userId;
      const room = getRoom(roomId);
      room.users.set(userId, { id: userId, name: msg.userName || 'Collaborator', color: msg.userColor || '#4f46e5', ws });

      console.log(`[server] ${userId} (${msg.userName}) joined room "${roomId}" — ${room.users.size} user(s) in room`);

      // Send existing board to joining user immediately
      if (room.board) {
        send(ws, { type: 'BOARD_STATE', board: room.board });
        console.log(`[server]   -> sent existing board (cards: ${room.board.cards?.length ?? 0})`);
      } else {
        console.log(`[server]   -> room has no board yet`);
      }
      broadcastUsersUpdate(roomId);
      return;
    }

    // BOARD_UPDATE — persist + broadcast to all OTHER users in the room
    if (type === 'BOARD_UPDATE') {
      const room = getRoom(roomId);
      room.board = msg.board;
      boardStore[roomId] = msg.board;
      saveData(boardStore);

      console.log(`[server] Board update from ${userId} in room "${roomId}" (cards: ${msg.board?.cards?.length ?? 0}) -> broadcasting to ${room.users.size - 1} other(s)`);

      broadcastToRoom(roomId, { type: 'BOARD_STATE', board: msg.board }, userId);
      return;
    }

    // CURSOR_MOVE — relay to everyone else (no persistence needed)
    if (type === 'CURSOR_MOVE') {
      const room = rooms[roomId];
      if (!room) return;
      const user = room.users.get(userId);
      broadcastToRoom(roomId, {
        type: 'CURSOR_UPDATE',
        userId,
        userName: user?.name || 'Collaborator',
        userColor: user?.color || '#4f46e5',
        x: msg.x,
        y: msg.y
      }, userId);
      return;
    }

    // PING/PONG keepalive
    if (type === 'PING') { send(ws, { type: 'PONG' }); return; }
  });

  ws.on('close', () => {
    if (currentRoomId && currentUserId) {
      const room = rooms[currentRoomId];
      if (room) {
        room.users.delete(currentUserId);
        console.log(`[server] ${currentUserId} left room "${currentRoomId}" — ${room.users.size} user(s) remaining`);
        broadcastUsersUpdate(currentRoomId);
      }
    }
  });

  ws.on('error', (err) => console.warn('[server] WS error:', err.message));
});

httpServer.listen(PORT, () => {
  console.log(`\n✅  Valiant local sync server  ws://localhost:${PORT}`);
  console.log(`    Boards persisted to: ${DATA_FILE}`);
  console.log('    Open two tabs to the same ?room= URL to test sync.\n');
});

