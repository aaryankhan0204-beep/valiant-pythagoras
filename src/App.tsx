import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DecisionCanvas } from './components/Canvas/DecisionCanvas';
import { AiAnalystPanel } from './components/AI/AiAnalystPanel';
import { DecisionModeModal } from './components/Voting/DecisionModeModal';
import { PolygonPongGame } from './components/Minigame/PolygonPongGame';
import { EvidenceModal } from './components/Modals/EvidenceModal';
import { ShareModal } from './components/Modals/ShareModal';
import { ApiKeyModal } from './components/Modals/ApiKeyModal';
import { ScenarioSettingsModal } from './components/Modals/ScenarioSettingsModal';
import { NewBoardModal } from './components/Modals/NewBoardModal';

import type { BoardState, EvidenceItem, RealtimeUser } from './types/decision';
import { 
  RealtimeManager, 
  getRoomIdFromUrl, 
  setRoomIdUrl, 
  loadStoredBoard, 
  saveStoredBoard 
} from './services/realtime';
import { ensureAnonymousAuth } from './services/firebase';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'overview' | 'workspace'>('workspace');
  const [roomId, setRoomId] = useState<string>(() => getRoomIdFromUrl());
  const [board, setBoard] = useState<BoardState>(() => loadStoredBoard(getRoomIdFromUrl()));
  const [theme, setTheme] = useState<'blackboard' | 'whiteboard'>('whiteboard');
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Modals State
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isVotingOpen, setIsVotingOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [isScenarioSettingsOpen, setIsScenarioSettingsOpen] = useState(false);
  const [isNewBoardOpen, setIsNewBoardOpen] = useState(false);
  const [isTiebreakerOpen, setIsTiebreakerOpen] = useState(false);
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
      setBoard(remoteBoard);
      saveStoredBoard(remoteBoard);
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

  // Broadcast board state changes
  const handleUpdateBoard = (newBoard: BoardState) => {
    setBoard(newBoard);
    saveStoredBoard(newBoard);
    if (realtimeManagerRef.current) {
      realtimeManagerRef.current.broadcastState(newBoard);
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
        onOpenVoting={() => setIsVotingOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyOpen(true)}
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
        onLaunchTiebreaker={() => {
          setIsVotingOpen(false);
          setIsTiebreakerOpen(true);
        }}
      />

      <PolygonPongGame
        scenarios={board.scenarios}
        votes={board.votes}
        isOpen={isTiebreakerOpen}
        onClose={() => setIsTiebreakerOpen(false)}
        onSelectWinner={(winnerId) => {
          const winner = board.scenarios.find((s) => s.id === winnerId);
          if (winner) {
            handleUpdateBoard({
              ...board,
              tiebreakerResult: {
                scenarioId: winner.id,
                method: `${board.scenarios.length}-Sided Polygon Pong Arena`,
                date: new Date().toLocaleTimeString()
              }
            });
          }
        }}
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

      <ApiKeyModal
        isOpen={isApiKeyOpen}
        onClose={() => setIsApiKeyOpen(false)}
        currentApiKey={apiKey}
        onSaveApiKey={(key) => setApiKey(key)}
      />

      <ScenarioSettingsModal
        board={board}
        isOpen={isScenarioSettingsOpen}
        onClose={() => setIsScenarioSettingsOpen(false)}
        onUpdateBoard={handleUpdateBoard}
      />

    </div>
  );
};

export default App;
