import type { BoardState, RealtimeUser } from '../types/decision';
import { INITIAL_DECISION } from '../data/initialState';

export interface RealtimeMessage {
  type: 'STATE_UPDATE' | 'CURSOR_MOVE' | 'USER_JOIN' | 'USER_LEAVE' | 'REQUEST_STATE';
  senderId: string;
  senderName: string;
  senderColor?: string;
  roomId: string;
  payload?: any;
  timestamp: number;
}

export class RealtimeManager {
  private roomId: string;
  private currentUser: RealtimeUser;
  private channel: BroadcastChannel | null = null;
  private onStateUpdateCallback: ((board: BoardState) => void) | null = null;
  private onRequestStateCallback: (() => BoardState | null) | null = null;
  private onUsersUpdateCallback: ((users: RealtimeUser[]) => void) | null = null;
  private activeUsersMap = new Map<string, RealtimeUser>();

  constructor(roomId: string, currentUser: RealtimeUser) {
    this.roomId = roomId;
    this.currentUser = currentUser;

    this.activeUsersMap.set(currentUser.id, currentUser);

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(`decision_room_${roomId}`);
        this.channel.onmessage = this.handleMessage.bind(this);
      } catch (err) {
        console.warn('BroadcastChannel not supported or disabled:', err);
      }
    }
  }

  public onStateUpdate(callback: (board: BoardState) => void) {
    this.onStateUpdateCallback = callback;
  }

  public onRequestState(callback: () => BoardState | null) {
    this.onRequestStateCallback = callback;
  }

  public onUsersUpdate(callback: (users: RealtimeUser[]) => void) {
    this.onUsersUpdateCallback = callback;
  }

  public broadcastState(boardState: BoardState) {
    if (!this.channel) return;
    const msg: RealtimeMessage = {
      type: 'STATE_UPDATE',
      senderId: this.currentUser.id,
      senderName: this.currentUser.name,
      senderColor: this.currentUser.color,
      roomId: this.roomId,
      payload: boardState,
      timestamp: Date.now()
    };
    this.channel.postMessage(msg);
  }

  public broadcastCursor(x: number, y: number) {
    if (!this.channel) return;
    const msg: RealtimeMessage = {
      type: 'CURSOR_MOVE',
      senderId: this.currentUser.id,
      senderName: this.currentUser.name,
      senderColor: this.currentUser.color,
      roomId: this.roomId,
      payload: { x, y },
      timestamp: Date.now()
    };
    this.channel.postMessage(msg);
  }

  public announcePresence() {
    if (!this.channel) return;
    const msg: RealtimeMessage = {
      type: 'USER_JOIN',
      senderId: this.currentUser.id,
      senderName: this.currentUser.name,
      senderColor: this.currentUser.color,
      roomId: this.roomId,
      payload: this.currentUser,
      timestamp: Date.now()
    };
    this.channel.postMessage(msg);

    // Request state from existing active users in room
    const requestMsg: RealtimeMessage = {
      type: 'REQUEST_STATE',
      senderId: this.currentUser.id,
      senderName: this.currentUser.name,
      roomId: this.roomId,
      timestamp: Date.now()
    };
    this.channel.postMessage(requestMsg);
  }

  private handleMessage(event: MessageEvent<RealtimeMessage>) {
    const msg = event.data;
    if (!msg || msg.roomId !== this.roomId || msg.senderId === this.currentUser.id) {
      return;
    }

    if (msg.type === 'USER_JOIN' || msg.type === 'CURSOR_MOVE' || msg.type === 'STATE_UPDATE') {
      const existing = this.activeUsersMap.get(msg.senderId) || {
        id: msg.senderId,
        name: msg.senderName,
        avatar: '',
        color: msg.senderColor || '#0284c7'
      };

      if (msg.type === 'CURSOR_MOVE' && msg.payload) {
        existing.cursor = { x: msg.payload.x, y: msg.payload.y };
      }

      this.activeUsersMap.set(msg.senderId, existing);
      if (this.onUsersUpdateCallback) {
        this.onUsersUpdateCallback(Array.from(this.activeUsersMap.values()));
      }
    }

    if (msg.type === 'USER_JOIN' || msg.type === 'REQUEST_STATE') {
      // Respond to joiner with current board state if callback provided
      if (this.onRequestStateCallback) {
        const currentBoard = this.onRequestStateCallback();
        if (currentBoard) {
          this.broadcastState(currentBoard);
        }
      }
    }

    if (msg.type === 'STATE_UPDATE' && msg.payload && this.onStateUpdateCallback) {
      this.onStateUpdateCallback(msg.payload as BoardState);
    }
  }

  public updateCurrentUser(user: RealtimeUser) {
    this.currentUser = user;
    this.activeUsersMap.set(user.id, user);
    this.announcePresence();
    if (this.onUsersUpdateCallback) {
      this.onUsersUpdateCallback(Array.from(this.activeUsersMap.values()));
    }
  }

  public destroy() {
    if (this.channel) {
      const msg: RealtimeMessage = {
        type: 'USER_LEAVE',
        senderId: this.currentUser.id,
        senderName: this.currentUser.name,
        roomId: this.roomId,
        timestamp: Date.now()
      };
      this.channel.postMessage(msg);
      this.channel.close();
      this.channel = null;
    }
  }
}

export const getRoomIdFromUrl = (): string => {
  if (typeof window === 'undefined') return 'board-new-starter';
  const params = new URLSearchParams(window.location.search);
  return params.get('room') || 'board-new-starter';
};

export const setRoomIdUrl = (roomId: string) => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  window.history.pushState({}, '', url.toString());
};

export const loadStoredBoard = (roomId: string): BoardState => {
  if (typeof window === 'undefined') return { ...INITIAL_DECISION, id: roomId };
  try {
    const key = `valiant_board_${roomId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...parsed, id: roomId };
      }
    }
  } catch (err) {
    console.warn('Error reading stored board from localStorage:', err);
  }
  return { ...INITIAL_DECISION, id: roomId };
};

export const saveStoredBoard = (board: BoardState) => {
  if (typeof window === 'undefined' || !board.id) return;
  try {
    const key = `valiant_board_${board.id}`;
    localStorage.setItem(key, JSON.stringify(board));
  } catch (err) {
    console.warn('Error saving board to localStorage:', err);
  }
};
