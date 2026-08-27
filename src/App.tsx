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
import { ensureAnonymousAuth } from './services/firebase';

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

  const realtimeManagerRef = useRef<RealtimeManager | null>(null);
  const isSelfUpdateRef = useRef<boolean>(false);
  const boardRef = useRef<BoardState>(board);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // Authenticate user with Firebase
  useEffect(() => {
    ensureAnonymousAuth()
      .then((fbUser) => {
        if (fbUser && fbUser.uid) {
          const updatedUser: RealtimeUser = {
            ...currentUser,
            id: fbUser.uid
          };
          setCurrentUser(updatedUser);
          if (realtimeManagerRef.current) {
            realtimeManagerRef.current.updateCurrentUser(updatedUser);
          }
        }
      })
      .catch((err) => console.warn('Firebase auth initialization warning:', err));
  }, []);

  // Initialize Realtime Sync Manager for Room
  useEffect(() => {
    setRoomIdUrl(roomId);
    const initialBoard = loadStoredBoard(roomId);
    setBoard(initialBoard);

    const manager = new RealtimeManager(roomId, currentUser);
    realtimeManagerRef.current = manager;

    manager.onRequestState(() => boardRef.current);

    manager.onStateUpdate((remoteBoard) => {
      isSelfUpdateRef.current = true;
      const sanitized = sanitizeBoardState(remoteBoard, roomId);
      setBoard(sanitized);
      saveStoredBoard(sanitized);
      setTimeout(() => {
        isSelfUpdateRef.current = false;
      }, 50);
    });

    manager.onUsersUpdate((users) => {
      setBoard((prev) => ({
        ...prev,
        realtimeUsers: users
      }));
    });

    manager.announcePresence();

    return () => {
      manager.destroy();
    };
  }, [roomId]);

  // Auto-open voting modal on all connected screens when voting session starts
  useEffect(() => {
    if (board.votingSession?.active && board.votingSession?.status === 'voting') {
      setIsVotingOpen(true);
    }
  }, [board.votingSession?.active, board.votingSession?.startTime, board.votingSession?.status]);

  // Broadcast board state changes
  const handleUpdateBoard = (newBoard: BoardState) => {
    const sanitized = sanitizeBoardState(newBoard, roomId);
    setBoard(sanitized);
    saveStoredBoard(sanitized);
    if (realtimeManagerRef.current) {
      realtimeManagerRef.current.broadcastState(sanitized);
    }
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
