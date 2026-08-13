import React, { useState } from 'react';
import { Key, X, Lock } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentApiKey: string | null;
  onSaveApiKey: (key: string | null) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  currentApiKey,
  onSaveApiKey
}) => {
  const [keyInput, setKeyInput] = useState(currentApiKey || '');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(keyInput.trim() ? keyInput.trim() : null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Translucent Dark Frosted Glass Container Card */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-left text-white">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-md">
              <Key className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-serif-luxury font-bold text-base text-white">Gemini API Key</h3>
              <p className="text-xs text-slate-400">Custom Google AI Analyst Integration</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Google Gemini API Key</span>
            </label>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full rounded-xl bg-slate-800/90 border border-slate-600 px-3.5 py-2.5 text-xs font-mono font-bold text-white placeholder-slate-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Key is stored locally in memory only and never transmitted to external servers.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-700/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-white hover:bg-slate-200 text-slate-900 px-5 py-2 rounded-xl text-xs font-extrabold shadow-md"
            >
              Save Key
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
