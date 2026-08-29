import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DecisionCanvas } from './components/Canvas/DecisionCanvas';
import { AiAnalystPanel } from './components/AI/AiAnalystPanel';
import { DecisionModeModal } from './components/Voting/DecisionModeModal';
import { CoinFlipModal } from './components/Voting/CoinFlipModal';
import { TiebreakerGame } from './components/Minigame/TiebreakerGame';
import { EvidenceModal } from './components/Modals/EvidenceModal';
import { ShareModal } from './components/Modals/ShareModal';
import { ScenarioSettingsModal } from './components/Modals/ScenarioSettingsModal';
import { NewBoardModal } from './components/Modals/NewBoardModal';

import { ErrorBoundary } from './components/ErrorBoundary';
import type { BoardState, EvidenceItem, RealtimeUser, Scenario } from './types/decision';
import { 
  RealtimeManager, 
  getRoomIdFromUrl, 
  setRoomIdUrl, 
  loadStoredBoard, 
  saveStoredBoard,
  sanitizeBoardState
} from './services/realtime';
import { RealtimeManagerLocal } from './services/realtimeLocal';
import { ensureAnonymousAuth } from './services/firebase';

// Auto-detect: use local WebSocket server when running on localhost,
// Firebase when deployed to production.
const USE_LOCAL_SERVER = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

type AnyRealtimeManager = RealtimeManager | RealtimeManagerLocal;


export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'overview' | 'workspace'>('workspace');
  const [roomId, setRoomId] = useState<string>(() => getRoomIdFromUrl());
  const [board, setBoard] = useState<BoardState>(() => loadStoredBoard(getRoomIdFromUrl()));
  const [theme, setTheme] = useState<'blackboard' | 'whiteboard'>('whiteboard');
  const apiKey = null;

  // Modals State
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isVotingOpen, setIsVotingOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isScenarioSettingsOpen, setIsScenarioSettingsOpen] = useState(false);
  const [isNewBoardOpen, setIsNewBoardOpen] = useState(false);
  const [isTiebreakerOpen, setIsTiebreakerOpen] = useState(false);
  const [isCoinFlipOpen, setIsCoinFlipOpen] = useState(false);
  const [tiedScenariosForTiebreaker, setTiedScenariosForTiebreaker] = useState<Scenario[]>([]);
  const [activeEvidence, setActiveEvidence] = useState<EvidenceItem | null>(null);

  const [currentUser, setCurrentUser] = useState<RealtimeUser>(() => {
    const randomId = 'user-' + Math.random().toString(36).substring(2, 7);
    const colors = ['#0284c7', '#059669', '#7c3aed', '#db2777', '#ea580c'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    return {
      id: randomId,
      name: `Collaborator ${randomId.slice(-3).toUpperCase()}`,
      avatar: '',
      color: randomColor
    };
  });

  const realtimeManagerRef = useRef<AnyRealtimeManager | null>(null);
  const boardRef = useRef<BoardState>(board);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // Single async setup: authenticate FIRST, then create the realtime manager.
  // This is critical for Firebase — writes that fire before anonymous auth
  // completes are silently rejected by Firebase security rules (auth != null).
  // The old approach used two separate effects that raced each other.
  useEffect(() => {
    let cancelled = false;
    let manager: AnyRealtimeManager | null = null;

    const setup = async () => {
      setRoomIdUrl(roomId);
      setBoard(loadStoredBoard(roomId));

      // Resolve the user to use for this session.
      // For the local server, skip Firebase auth entirely.
      let sessionUser = currentUser;

      if (!USE_LOCAL_SERVER) {
        try {
          const fbUser = await ensureAnonymousAuth();
          if (fbUser?.uid && !cancelled) {
            sessionUser = { ...currentUser, id: fbUser.uid };
            setCurrentUser(sessionUser);
            console.log('[App] Firebase auth OK — uid:', fbUser.uid);
          }
        } catch (err) {
          console.warn('[App] Firebase auth failed, proceeding as unauthenticated:', err);
        }
      }

      if (cancelled) return;

      console.log(`[App] Starting ${USE_LOCAL_SERVER ? 'LOCAL WebSocket' : 'Firebase'} sync for room "${roomId}"`);

      manager = USE_LOCAL_SERVER
        ? new RealtimeManagerLocal(roomId, sessionUser)
        : new RealtimeManager(roomId, sessionUser);

      realtimeManagerRef.current = manager;

      manager.onRequestState(() => boardRef.current);

      manager.onStateUpdate((remoteBoard) => {
        if (cancelled) return;
        const sanitized = sanitizeBoardState(remoteBoard, roomId);
        setBoard(sanitized);
        saveStoredBoard(sanitized);
      });

      // onUsersUpdate may receive a full presence list OR a single cursor-only entry.
      // Handle both cases without clobbering the existing user list.
      manager.onUsersUpdate((incoming) => {
        if (cancelled) return;
        setBoard((prev) => {
          const prevUsers = prev.realtimeUsers || [];
          if (incoming.length === 1 && incoming[0].cursor !== undefined) {
            // Cursor-only update — patch that one user's position
            const updated = incoming[0];
            const merged = prevUsers.map(u =>
              u.id === updated.id ? { ...u, cursor: updated.cursor } : u
            );
            if (!merged.some(u => u.id === updated.id)) merged.push(updated);
            return { ...prev, realtimeUsers: merged };
          }
          // Full user list replacement
          return { ...prev, realtimeUsers: incoming };
        });
      });

      manager.announcePresence();
    };

    setup();

    return () => {
      cancelled = true;
      manager?.destroy();
      realtimeManagerRef.current = null;
    };
  }, [roomId]);



  // Re-announce presence when tab becomes visible after being hidden.
  // In production, Firebase connections can go stale after the tab is backgrounded
  // for a long time. Re-announcing refreshes the presence entry and re-triggers
  // the onDisconnect handlers, restoring live sync.
  useEffect(() => {
    let hiddenAt = 0;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else {
        const hiddenDuration = Date.now() - hiddenAt;
        // Only re-announce if the tab was hidden for more than 30 seconds
        if (hiddenDuration > 30000 && realtimeManagerRef.current) {
          realtimeManagerRef.current.announcePresence();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Auto-open voting modal on all connected screens when voting session starts
  useEffect(() => {
    if (board.votingSession?.active && board.votingSession?.status === 'voting') {
      setIsVotingOpen(true);
    }
  }, [board.votingSession?.active, board.votingSession?.startTime, board.votingSession?.status]);

  // Broadcast board state changes to Firebase and all collaborators.
  // Called only by user-triggered actions (canvas gestures, modal submissions, voting).
  // There is no feedback loop risk: onStateUpdate calls setBoard directly,
  // not through this function, so remote updates never re-trigger a broadcast.
  const handleUpdateBoard = (newBoard: BoardState) => {
    const sanitized = sanitizeBoardState(newBoard, roomId);
    setBoard(sanitized);
    saveStoredBoard(sanitized);
    if (realtimeManagerRef.current) {
      realtimeManagerRef.current.broadcastState(sanitized);
    }
  };


  // Local-only state update (for high-frequency drag events before mouseup)
  const handleUpdateBoardLocal = (newBoard: BoardState) => {
    const sanitized = sanitizeBoardState(newBoard, roomId);
    setBoard(sanitized);
  };

  const handleOpenOrStartVoting = () => {
    if (!board.votingSession || !board.votingSession.active || board.votingSession.status === 'completed') {
      // Start fresh 2-minute consensus voting session for everyone
      const newBoard: BoardState = {
        ...board,
        votingSession: {
          active: true,
          status: 'voting',
          startTime: Date.now(),
          endsAt: Date.now() + 120000,
          initiatedBy: currentUser.name
        }
      };
      handleUpdateBoard(newBoard);
    }
    setIsVotingOpen(true);
  };

  const handleTriggerCoinFlip = (tiedScenarios: Scenario[]) => {
    setTiedScenariosForTiebreaker(tiedScenarios);
    setIsCoinFlipOpen(true);
  };

  const handleTriggerRandomWheel = (tiedScenarios: Scenario[]) => {
    setTiedScenariosForTiebreaker(tiedScenarios);
    setIsTiebreakerOpen(true);
  };

  const handleSelectCoinFlipWinner = (winnerId: string) => {
    const winner = board.scenarios.find((s) => s.id === winnerId);
    if (winner) {
      const updatedBoard: BoardState = {
        ...board,
        votingSession: {
          ...(board.votingSession || {
            active: true,
            status: 'completed',
            startTime: Date.now(),
            endsAt: Date.now(),
            initiatedBy: currentUser.name
          }),
          status: 'completed',
          tiebreaker: {
            type: 'coinflip',
            winnerId: winner.id,
            tiedScenarioIds: (tiedScenariosForTiebreaker.length ? tiedScenariosForTiebreaker : board.scenarios).map((s) => s.id),
            timestamp: Date.now()
          }
        },
        analysis: {
          ...(board.analysis || {
            winningScenarioId: winner.id,
            winningScenarioTitle: winner.title,
            confidenceScore: 90,
            voteBreakdown: [],
            agreements: [],
            disagreements: [],
            unresolvedAssumptions: [],
            strongestArguments: [],
            aiSummary: '',
            timestamp: new Date().toLocaleTimeString()
          }),
          winningScenarioId: winner.id,
          winningScenarioTitle: winner.title,
          aiSummary: `Winner: ${winner.title} (Resolved via 3D Coin Flip Tiebreaker)`
        }
      };
      handleUpdateBoard(updatedBoard);
    }
  };

  const handleSelectRandomWheelWinner = (winnerId: string) => {
    const winner = board.scenarios.find((s) => s.id === winnerId);
    if (winner) {
      const updatedBoard: BoardState = {
        ...board,
        votingSession: {
          ...(board.votingSession || {
            active: true,
            status: 'completed',
            startTime: Date.now(),
            endsAt: Date.now(),
            initiatedBy: currentUser.name
          }),
          status: 'completed',
          tiebreaker: {
            type: 'randomSelector',
            winnerId: winner.id,
            tiedScenarioIds: (tiedScenariosForTiebreaker.length ? tiedScenariosForTiebreaker : board.scenarios).map((s) => s.id),
            timestamp: Date.now()
          }
        },
        analysis: {
          ...(board.analysis || {
            winningScenarioId: winner.id,
            winningScenarioTitle: winner.title,
            confidenceScore: 90,
            voteBreakdown: [],
            agreements: [],
            disagreements: [],
            unresolvedAssumptions: [],
            strongestArguments: [],
            aiSummary: '',
            timestamp: new Date().toLocaleTimeString()
          }),
          winningScenarioId: winner.id,
          winningScenarioTitle: winner.title,
          aiSummary: `Winner: ${winner.title} (Resolved via Random Wheel Selector Tiebreaker)`
        }
      };
      handleUpdateBoard(updatedBoard);
    }
  };

  const handleUpdateCurrentUser = (updatedUser: RealtimeUser) => {
    setCurrentUser(updatedUser);
    if (realtimeManagerRef.current) {
      realtimeManagerRef.current.updateCurrentUser(updatedUser);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'blackboard' ? 'whiteboard' : 'blackboard'));
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col font-sans bg-[#faf8f5]">
      
      {/* Top Navbar */}
      <Navbar
        currentBoard={board}
        onOpenNewBoard={() => setIsNewBoardOpen(true)}
        onOpenSettings={() => setIsScenarioSettingsOpen(true)}
        onToggleTheme={toggleTheme}
        theme={theme}
        currentView={currentView}
        onNavigateView={(view) => setCurrentView(view)}
        onOpenVoting={handleOpenOrStartVoting}
        onToggleAiPanel={() => setIsAiPanelOpen(!isAiPanelOpen)}
      />

      {/* Main View Area */}
      <main className="flex-1 relative pt-16">
        {currentView === 'overview' ? (
          <LandingPage
            onLaunchWorkspace={() => setCurrentView('workspace')}
            board={board}
          />
        ) : (
          <DecisionCanvas
            board={board}
            onUpdateBoard={handleUpdateBoard}
            onUpdateBoardLocal={handleUpdateBoardLocal}
            onOpenEvidence={(ev) => setActiveEvidence(ev)}
            theme={theme}
            onOpenAiAnalyst={() => setIsAiPanelOpen(true)}
            currentUserId={currentUser.id}
            onCursorMove={(x, y) => {
              if (realtimeManagerRef.current) {
                realtimeManagerRef.current.broadcastCursor(x, y);
              }
            }}
          />
        )}

        {/* AI Research Analyst Panel */}
        <AiAnalystPanel
          board={board}
          isOpen={isAiPanelOpen && currentView === 'workspace'}
          onClose={() => setIsAiPanelOpen(false)}
          apiKey={apiKey}
        />
      </main>

      {/* Modals */}
      <NewBoardModal
        isOpen={isNewBoardOpen}
        onClose={() => setIsNewBoardOpen(false)}
        onCreateBoard={(newBoard) => {
          setRoomId(newBoard.id);
          setBoard(newBoard);
          saveStoredBoard(newBoard);
          setCurrentView('workspace');
        }}
      />

      <DecisionModeModal
        board={board}
        isOpen={isVotingOpen}
        onClose={() => setIsVotingOpen(false)}
        onUpdateBoard={handleUpdateBoard}
        currentUserId={currentUser.id}
        currentUserName={currentUser.name}
        onTriggerCoinFlip={handleTriggerCoinFlip}
        onTriggerRandomWheel={handleTriggerRandomWheel}
      />

      {/* 2-Option Coin Flip Tiebreaker */}
      <CoinFlipModal
        scenarios={tiedScenariosForTiebreaker.length >= 2 ? tiedScenariosForTiebreaker.slice(0, 2) : board.scenarios.slice(0, 2)}
        isOpen={isCoinFlipOpen}
        onClose={() => setIsCoinFlipOpen(false)}
        onSelectWinner={handleSelectCoinFlipWinner}
        initialWinnerId={board.votingSession?.tiebreaker?.winnerId}
      />

      {/* 3+ Option Random Wheel Selector Tiebreaker */}
      <TiebreakerGame
        scenarios={tiedScenariosForTiebreaker.length >= 3 ? tiedScenariosForTiebreaker : board.scenarios}
        isOpen={isTiebreakerOpen}
        onClose={() => setIsTiebreakerOpen(false)}
        onSelectWinner={handleSelectRandomWheelWinner}
      />

      <EvidenceModal
        evidence={activeEvidence}
        onClose={() => setActiveEvidence(null)}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        boardId={board.id}
        boardTitle={board.title}
        activeUsers={board.realtimeUsers || [currentUser]}
        currentUser={currentUser}
        onUpdateCurrentUser={handleUpdateCurrentUser}
      />

      <ScenarioSettingsModal
        board={board}
        isOpen={isScenarioSettingsOpen}
        onClose={() => setIsScenarioSettingsOpen(false)}
        onUpdateBoard={handleUpdateBoard}
      />

    </div>
    </ErrorBoundary>
  );
};

export default App;
