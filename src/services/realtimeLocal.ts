/**
 * RealtimeManagerLocal
 * Drop-in replacement for RealtimeManager (Firebase) that uses a local
 * WebSocket server (server.js) for debugging realtime sync.
 *
 * Auto-selected by App.tsx when running on localhost.
 */

import type { BoardState, RealtimeUser } from '../types/decision';
import { sanitizeBoardState } from './realtime';

const WS_URL = 'ws://localhost:3001';
const RECONNECT_DELAY_MS = 2000;
const PING_INTERVAL_MS = 25000;
const CURSOR_THROTTLE_MS = 50;

export class RealtimeManagerLocal {
  private roomId: string;
  private currentUser: RealtimeUser;

  private ws: WebSocket | null = null;
  private isDestroyed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private lastCursorSent = 0;

  private onStateUpdateCb: ((board: BoardState) => void) | null = null;
  private onUsersUpdateCb: ((users: RealtimeUser[]) => void) | null = null;


  constructor(roomId: string, currentUser: RealtimeUser) {
    this.roomId = roomId;
    this.currentUser = currentUser;
    this.connect();
  }

  // ── Connection management ────────────────────────────────────────────────

  private connect() {
    if (this.isDestroyed) return;

    console.log(`[local-sync] Connecting to ${WS_URL} …`);
    try {
      this.ws = new WebSocket(WS_URL);
    } catch (e) {
      console.error('[local-sync] Could not create WebSocket:', e);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[local-sync] Connected ✅ — joining room', this.roomId);
      this.send({ type: 'JOIN', roomId: this.roomId, userId: this.currentUser.id, userName: this.currentUser.name, userColor: this.currentUser.color });
      this.startPing();
    };

    this.ws.onmessage = (event) => {
      let msg: any;
      try { msg = JSON.parse(event.data); }
      catch { return; }

      if (msg.type === 'BOARD_STATE' && this.onStateUpdateCb) {
        console.log('[local-sync] Received BOARD_STATE (cards:', msg.board?.cards?.length ?? 0, ')');
        const sanitized = sanitizeBoardState(msg.board, this.roomId);
        this.onStateUpdateCb(sanitized);
      }

      if (msg.type === 'USERS_UPDATE' && this.onUsersUpdateCb) {
        const users: RealtimeUser[] = (msg.users || []).map((u: any) => ({
          id: u.id, name: u.name, color: u.color, avatar: u.avatar || ''
        }));
        // Always include self
        const hasSelf = users.some(u => u.id === this.currentUser.id);
        if (!hasSelf) users.unshift(this.currentUser);
        this.onUsersUpdateCb(users);
      }

      if (msg.type === 'CURSOR_UPDATE') {
        if (this.onUsersUpdateCb) {
          // Merge cursor into users — fire a lightweight update
          this.onUsersUpdateCb([{
            id: msg.userId,
            name: msg.userName,
            color: msg.userColor,
            avatar: '',
            cursor: { x: msg.x, y: msg.y }
          }]);
        }
      }

      if (msg.type === 'ERROR') {
        console.warn('[local-sync] Server error:', msg.message);
      }
    };

    this.ws.onclose = (event) => {
      console.warn('[local-sync] Disconnected (code:', event.code, '). Reconnecting in', RECONNECT_DELAY_MS, 'ms …');
      this.stopPing();
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('[local-sync] WebSocket error:', err);
    };
  }

  private scheduleReconnect() {
    if (this.isDestroyed) return;
    this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS);
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      this.send({ type: 'PING' });
    }, PING_INTERVAL_MS);
  }

  private stopPing() {
    if (this.pingTimer !== null) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  private send(obj: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  // ── Public API (mirrors RealtimeManager) ────────────────────────────────

  public onStateUpdate(cb: (board: BoardState) => void) { this.onStateUpdateCb = cb; }
  public onUsersUpdate(cb: (users: RealtimeUser[]) => void) { this.onUsersUpdateCb = cb; }
  // Local server always sends board on JOIN so request-state is not needed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onRequestState(_cb: () => BoardState | null) { /* no-op */ }

  public broadcastState(board: BoardState) {
    console.log('[local-sync] Broadcasting board (cards:', board.cards?.length ?? 0, ')');
    this.send({ type: 'BOARD_UPDATE', roomId: this.roomId, userId: this.currentUser.id, board });
  }

  public broadcastCursor(x: number, y: number) {
    const now = Date.now();
    if (now - this.lastCursorSent < CURSOR_THROTTLE_MS) return;
    this.lastCursorSent = now;
    this.send({ type: 'CURSOR_MOVE', roomId: this.roomId, userId: this.currentUser.id, x, y });
  }

  public announcePresence() {
    // Re-join to refresh presence (e.g. after tab wake)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'JOIN', roomId: this.roomId, userId: this.currentUser.id, userName: this.currentUser.name, userColor: this.currentUser.color });
    }
  }

  public updateCurrentUser(user: RealtimeUser) {
    this.currentUser = user;
    this.announcePresence();
  }

  public destroy() {
    this.isDestroyed = true;
    this.stopPing();
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
  }
}

