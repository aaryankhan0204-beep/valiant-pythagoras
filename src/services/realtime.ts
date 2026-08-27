import type { BoardState, RealtimeUser } from '../types/decision';
import { INITIAL_DECISION } from '../data/initialState';
import { db } from './firebase';
import { 
  ref, 
  set, 
  onValue, 
  onDisconnect, 
  remove 
} from 'firebase/database';
import type { Unsubscribe } from 'firebase/database';

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

  // Firebase Unsubscribe Listeners
  private firebaseUnsubscribers: Unsubscribe[] = [];
  private lastCursorSentTime = 0;
  private isDestroyed = false;
  // Dedup: track the last board state JSON fingerprint we pushed to Firebase
  // to avoid redundant writes that trigger the listener feedback loop.
  private lastBroadcastHash: string = '';


  constructor(roomId: string, currentUser: RealtimeUser) {
    this.roomId = roomId;
    this.currentUser = currentUser;

    this.activeUsersMap.set(currentUser.id, currentUser);

    // 1. Setup local BroadcastChannel fallback for same-device tabs
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(`decision_room_${roomId}`);
        this.channel.onmessage = this.handleBroadcastMessage.bind(this);
      } catch (err) {
        console.warn('BroadcastChannel not supported or disabled:', err);
      }
    }

    // 2. Setup Firebase Realtime Database cross-device sync listeners
    this.setupFirebaseListeners();
  }

  private setupFirebaseListeners() {
    if (!db) return;

    try {
      const roomBoardRef = ref(db, `rooms/${this.roomId}/boardState`);
      const roomUsersRef = ref(db, `rooms/${this.roomId}/users`);
      const roomCursorsRef = ref(db, `rooms/${this.roomId}/cursors`);

      // A. Listen for Board State changes from remote users
      const unsubBoard = onValue(roomBoardRef, (snapshot) => {
        if (this.isDestroyed) return;
        if (snapshot.exists()) {
          const rawRemoteBoard = snapshot.val();
          if (rawRemoteBoard && typeof rawRemoteBoard === 'object' && this.onStateUpdateCallback) {
            const sanitized = sanitizeBoardState(rawRemoteBoard, this.roomId);
            // Reset dedup hash: the next local write after receiving a remote update
            // must always go through, even if the fingerprint looks identical.
            this.lastBroadcastHash = '';
            this.onStateUpdateCallback(sanitized);
          }
        } else {
          // If no board exists in Firebase for this room yet, publish initial local board ONLY if it has cards
          if (this.onRequestStateCallback) {
            const localBoard = this.onRequestStateCallback();
            if (localBoard && Array.isArray(localBoard.cards) && localBoard.cards.length > 0) {
              set(roomBoardRef, localBoard).catch((err) => {
                console.warn('Firebase initial board publish failed:', err);
              });
            }
          }
        }
      });

      this.firebaseUnsubscribers.push(unsubBoard);

      // B. Listen for Active Users & Cursors from Firebase
      let currentFirebaseUsers: Record<string, RealtimeUser> = {};
      let currentFirebaseCursors: Record<string, { x: number; y: number }> = {};

      const updateMergedUsers = () => {
        const mergedMap = new Map<string, RealtimeUser>();
        // Add current local user
        mergedMap.set(this.currentUser.id, this.currentUser);

        // Add remote users from Firebase
        Object.entries(currentFirebaseUsers).forEach(([id, user]) => {
          if (user && id) {
            const cursor = currentFirebaseCursors[id];
            mergedMap.set(id, {
              ...user,
              cursor: cursor ? { x: cursor.x, y: cursor.y } : user.cursor
            });
          }
        });

        this.activeUsersMap = mergedMap;
        if (this.onUsersUpdateCallback) {
          this.onUsersUpdateCallback(Array.from(this.activeUsersMap.values()));
        }
      };

      const unsubUsers = onValue(roomUsersRef, (snapshot) => {
        if (this.isDestroyed) return;
        currentFirebaseUsers = snapshot.val() || {};
        updateMergedUsers();
      });
      this.firebaseUnsubscribers.push(unsubUsers);

      const unsubCursors = onValue(roomCursorsRef, (snapshot) => {
        if (this.isDestroyed) return;
        currentFirebaseCursors = snapshot.val() || {};
        updateMergedUsers();
      });
      this.firebaseUnsubscribers.push(unsubCursors);

    } catch (err) {
      console.warn('Firebase listeners error:', err);
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
    // Compute a lightweight fingerprint to detect redundant back-to-back writes.
    // Using full JSON.stringify would be expensive; this captures the key signals.
    const fingerprint = `${boardState.id}|${(boardState.cards || []).length}|${(boardState.connectors || []).length}|${boardState.cards?.[boardState.cards.length - 1]?.id ?? ''}|${boardState.cards?.[0]?.x ?? 0}`;

    const isDuplicate = fingerprint === this.lastBroadcastHash;
    this.lastBroadcastHash = fingerprint;

    // A. Broadcast to Firebase Realtime DB (skip if identical to last push)
    if (db && !isDuplicate) {
      const roomBoardRef = ref(db, `rooms/${this.roomId}/boardState`);
      set(roomBoardRef, boardState).catch((err) => {
        console.warn('Firebase set boardState failed:', err);
      });
    }

    // B. Fallback Broadcast to local tabs via BroadcastChannel
    if (this.channel) {
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
  }


  public broadcastCursor(x: number, y: number) {
    const now = Date.now();
    // Throttle cursor updates to Firebase (max once every 50ms)
    if (now - this.lastCursorSentTime > 50) {
      this.lastCursorSentTime = now;
      if (db) {
        const cursorRef = ref(db, `rooms/${this.roomId}/cursors/${this.currentUser.id}`);
        set(cursorRef, { x, y, timestamp: now }).catch(() => {});
      }
    }

    if (this.channel) {
      const msg: RealtimeMessage = {
        type: 'CURSOR_MOVE',
        senderId: this.currentUser.id,
        senderName: this.currentUser.name,
        senderColor: this.currentUser.color,
        roomId: this.roomId,
        payload: { x, y },
        timestamp: now
      };
      this.channel.postMessage(msg);
    }
  }

  public announcePresence() {
    // A. Firebase Presence
    if (db && this.currentUser.id) {
      const userRef = ref(db, `rooms/${this.roomId}/users/${this.currentUser.id}`);
      set(userRef, {
        id: this.currentUser.id,
        name: this.currentUser.name,
        avatar: this.currentUser.avatar || '',
        color: this.currentUser.color || '#0284c7'
      }).catch((err) => console.warn('Firebase presence announce error:', err));

      // Automatic cleanup on disconnect
      onDisconnect(userRef).remove();
      const cursorRef = ref(db, `rooms/${this.roomId}/cursors/${this.currentUser.id}`);
      onDisconnect(cursorRef).remove();
    }

    // B. Local BroadcastChannel presence announce
    if (this.channel) {
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

      const requestMsg: RealtimeMessage = {
        type: 'REQUEST_STATE',
        senderId: this.currentUser.id,
        senderName: this.currentUser.name,
        roomId: this.roomId,
        timestamp: Date.now()
      };
      this.channel.postMessage(requestMsg);
    }
  }

  private handleBroadcastMessage(event: MessageEvent<RealtimeMessage>) {
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
      if (this.onRequestStateCallback) {
        const currentBoard = this.onRequestStateCallback();
        if (currentBoard) {
          this.broadcastState(currentBoard);
        }
      }
    }

    if (msg.type === 'STATE_UPDATE' && msg.payload && this.onStateUpdateCallback) {
      const sanitized = sanitizeBoardState(msg.payload, this.roomId);
      this.onStateUpdateCallback(sanitized);
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
    this.isDestroyed = true;

    // 1. Unsubscribe Firebase listeners
    this.firebaseUnsubscribers.forEach((unsub) => unsub());
    this.firebaseUnsubscribers = [];

    // 2. Remove user presence & cursor from Firebase
    if (db && this.currentUser.id) {
      const userRef = ref(db, `rooms/${this.roomId}/users/${this.currentUser.id}`);
      const cursorRef = ref(db, `rooms/${this.roomId}/cursors/${this.currentUser.id}`);
      remove(userRef).catch(() => {});
      remove(cursorRef).catch(() => {});
    }

    // 3. Close BroadcastChannel
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

export const ensureArray = <T>(val: any): T[] => {
  if (!val) return [];
  if (Array.isArray(val)) return (val.filter(Boolean) as T[]);
  if (typeof val === 'object') return (Object.values(val) as T[]).filter(Boolean);
  return [];
};

export const sanitizeCard = (card: any): any => {
  if (!card || typeof card !== 'object') return card;
  return {
    ...card,
    penPoints: card.penPoints ? ensureArray(card.penPoints) : undefined
  };
};

export const sanitizeBoardState = (rawBoard: any, fallbackRoomId?: string): BoardState => {
  const fallback: BoardState = { ...INITIAL_DECISION, id: fallbackRoomId || 'board-new-starter' };
  if (!rawBoard || typeof rawBoard !== 'object') {
    return { ...fallback, id: fallbackRoomId || fallback.id };
  }

  const rawCards = ensureArray(rawBoard.cards);
  const sanitizedCards = rawCards.map(sanitizeCard);
  const rawScenarios = ensureArray(rawBoard.scenarios);

  return {
    ...fallback,
    ...rawBoard,
    id: rawBoard.id || fallbackRoomId || fallback.id,
    title: rawBoard.title || fallback.title,
    decisionPrompt: rawBoard.decisionPrompt || fallback.decisionPrompt,
    preset: rawBoard.preset || fallback.preset,
    scenarios: rawScenarios.length > 0 ? rawScenarios : fallback.scenarios,
    cards: 'cards' in rawBoard ? sanitizedCards : fallback.cards,
    connectors: ensureArray(rawBoard.connectors),
    shapes: ensureArray(rawBoard.shapes),
    comments: ensureArray(rawBoard.comments),
    votes: ensureArray(rawBoard.votes),
    criteria: ensureArray(rawBoard.criteria),
    realtimeUsers: ensureArray(rawBoard.realtimeUsers).length > 0 ? ensureArray(rawBoard.realtimeUsers) : fallback.realtimeUsers,
    votingSession: rawBoard.votingSession || fallback.votingSession
  };
};

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
  if (typeof window === 'undefined') return sanitizeBoardState(null, roomId);
  try {
    const key = `valiant_board_${roomId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return sanitizeBoardState(parsed, roomId);
    }
  } catch (err) {
    console.warn('Error reading stored board from localStorage:', err);
  }
  return sanitizeBoardState(null, roomId);
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
