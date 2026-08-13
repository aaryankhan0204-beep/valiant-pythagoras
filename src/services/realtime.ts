import type { BoardState, RealtimeUser } from '../types/decision';

export interface RealtimeMessage {
  type: 'STATE_UPDATE' | 'CURSOR_MOVE' | 'USER_JOIN' | 'USER_LEAVE';
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
