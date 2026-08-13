import React, { useState } from 'react';
import { Share2, Copy, Check, Users, X, Link, User } from 'lucide-react';
import type { RealtimeUser } from '../../types/decision';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardTitle: string;
  activeUsers: RealtimeUser[];
  currentUser: RealtimeUser;
  onUpdateCurrentUser: (user: RealtimeUser) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  boardId,
  boardTitle,
  activeUsers,
  currentUser,
  onUpdateCurrentUser
}) => {
  const [copied, setCopied] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.name);

  if (!isOpen) return null;

  const currentPath = window.location.pathname.endsWith('/') 
    ? window.location.pathname 
    : `${window.location.pathname}/`;
  const roomUrl = `${window.location.origin}${currentPath}?room=${boardId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    onUpdateCurrentUser({
      ...currentUser,
      name: nameInput.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Translucent Dark Frosted Glass Container Card */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-left text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
              <Share2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-serif-luxury font-bold text-base text-white">Share & Collaborate</h3>
              <p className="text-xs text-slate-400">Room: {boardTitle || boardId}</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          
          {/* One-Click Copy Room Link */}
          <div>
            <label className="block text-xs font-bold text-white mb-1 flex items-center gap-1">
              <Link className="w-3.5 h-3.5 text-indigo-400" />
              <span>Realtime Room Share URL</span>
            </label>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={roomUrl}
                className="flex-1 rounded-xl bg-slate-800/90 border border-slate-600 px-3 py-2 text-xs font-mono font-bold text-white"
              />
              <button
                onClick={handleCopy}
                className="bg-white hover:bg-slate-200 text-slate-900 px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1 shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* User Display Name Config */}
          <form onSubmit={handleSaveName} className="space-y-2 pt-2 border-t border-slate-700/80">
            <label className="block text-xs font-bold text-white flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Your Collaborator Name</span>
            </label>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="flex-1 rounded-xl bg-slate-800/90 border border-slate-600 px-3 py-2 text-xs font-bold text-white"
              />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-3 py-2 rounded-xl text-xs font-bold"
              >
                Save
              </button>
            </div>
          </form>

          {/* Active Collaborators Counter */}
          <div className="pt-2 border-t border-slate-700/80">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Active Collaborators</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-800">
                🟢 {activeUsers.length} Online
              </span>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {activeUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center space-x-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs"
                >
                  <div
                    className="w-5 h-5 rounded-full font-bold text-white text-[10px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: u.color || '#4f46e5' }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-white truncate">{u.name}</span>
                  {u.id === currentUser.id && (
                    <span className="ml-auto text-[10px] text-slate-400 font-mono">(You)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
