import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Share2, 
  Plus,
  Sparkles,
  Key
} from 'lucide-react';
import type { BoardState, RealtimeUser } from '../types/decision';
import { ShareModal } from './Modals/ShareModal';

interface NavbarProps {
  currentBoard: BoardState;
  onOpenNewBoard: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
  theme: 'blackboard' | 'whiteboard';
  currentView: 'overview' | 'workspace';
  onNavigateView: (view: 'overview' | 'workspace') => void;
  onOpenVoting?: () => void;
  onOpenApiKeyModal?: () => void;
  onToggleAiPanel?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentBoard,
  onOpenNewBoard,
  onOpenSettings,
  onToggleTheme,
  theme,
  currentView,
  onNavigateView,
  onOpenVoting,
  onOpenApiKeyModal,
  onToggleAiPanel
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<RealtimeUser>({
    id: 'user-host',
    name: 'Host User',
    avatar: '',
    color: '#0f172a'
  });

  const activeUsers = currentBoard.realtimeUsers || [currentUser];

  return (
    <>
      {/* Functional Dark Obsidian Luxury Top Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 luxury-header bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between select-none shadow-lg">
        
        {/* Left Section: Brand Logo */}
        <div 
          onClick={() => onNavigateView('overview')}
          className="flex items-center space-x-2 cursor-pointer group"
        >
          <span className="font-serif-luxury font-bold text-xl tracking-[0.2em] uppercase text-white">
            Valiant
          </span>
        </div>

        {/* Center Section: Spaced Uppercase Navigation Menu Links */}
        <nav className="hidden md:flex items-center space-x-8 text-[11px] tracking-[0.2em] font-extrabold uppercase text-white">
          <button
            onClick={() => onNavigateView('overview')}
            className={`hover:opacity-100 transition-all text-white ${
              currentView === 'overview' ? 'border-b-2 border-white pb-0.5 opacity-100 font-extrabold' : 'opacity-70'
            }`}
          >
            Overview
          </button>
          
          <button
            onClick={() => onNavigateView('workspace')}
            className={`hover:opacity-100 transition-all text-white ${
              currentView === 'workspace' ? 'border-b-2 border-white pb-0.5 opacity-100 font-extrabold' : 'opacity-70'
            }`}
          >
            Workspace
          </button>

          <button
            onClick={onOpenSettings}
            className="hover:opacity-100 transition-all text-white opacity-70"
          >
            Presets
          </button>

          {/* Consensus Mode - ACCESSIBLE ONLY FROM WORKSPACE */}
          {currentView === 'workspace' && onOpenVoting && (
            <button
              onClick={onOpenVoting}
              className="hover:opacity-100 transition-all text-white opacity-70 flex items-center gap-1"
            >
              <span>Consensus</span>
            </button>
          )}
        </nav>

        {/* Right Section: Actions & Share Button */}
        <div className="flex items-center space-x-3">
          
          {/* Gemini AI Analyst Toggle Button */}
          {onToggleAiPanel && (
            <button
              onClick={onToggleAiPanel}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center space-x-1.5 shadow-sm transition-all"
              title="Open Gemini AI Research Analyst Panel"
            >
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
              <span className="hidden sm:inline text-[10px] tracking-[0.15em] uppercase text-white">Gemini AI</span>
            </button>
          )}

          {/* API Key Modal Button */}
          {onOpenApiKeyModal && (
            <button
              onClick={onOpenApiKeyModal}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700"
              title="Configure Gemini API Key"
            >
              <Key className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenNewBoard}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center space-x-1 border border-slate-700"
            title="Create New Board"
          >
            <Plus className="w-4 h-4 text-white" />
            <span className="hidden sm:inline text-[10px] tracking-[0.15em] uppercase text-white font-extrabold">New Board</span>
          </button>

          {/* Active Collaborators */}
          <div className="hidden sm:flex items-center -space-x-2">
            {activeUsers.slice(0, 3).map((u) => (
              <div
                key={u.id}
                className="w-7 h-7 rounded-full border-2 border-slate-900 font-bold text-white text-[10px] flex items-center justify-center bg-indigo-600 shadow-sm"
                title={u.name}
              >
                {u.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>

          {/* Theme Toggle Button with CRISP WHITE MOON ICON */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700"
            title={`Switch to ${theme === 'whiteboard' ? 'Dark Blackboard' : 'Light Whiteboard'} Theme`}
          >
            {theme === 'whiteboard' ? (
              <Moon className="w-4 h-4 text-white fill-white" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Share Pill Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="bg-white hover:bg-slate-200 text-slate-900 text-[10px] tracking-[0.2em] font-extrabold uppercase px-4 py-2 rounded-lg shadow-md transition-all flex items-center space-x-1.5"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-900" />
            <span>Share</span>
          </button>

        </div>

      </header>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        boardId={currentBoard.id}
        boardTitle={currentBoard.title}
        activeUsers={activeUsers}
        currentUser={currentUser}
        onUpdateCurrentUser={(updatedUser) => setCurrentUser(updatedUser)}
      />
    </>
  );
};
