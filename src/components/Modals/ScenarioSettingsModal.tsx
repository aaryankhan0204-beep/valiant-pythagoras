import React, { useState } from 'react';
import { Settings, X, Plus, Trash2, Layers } from 'lucide-react';
import type { BoardState, Scenario } from '../../types/decision';

interface ScenarioSettingsModalProps {
  board: BoardState;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBoard: (newBoard: BoardState) => void;
}

export const ScenarioSettingsModal: React.FC<ScenarioSettingsModalProps> = ({
  board,
  isOpen,
  onClose,
  onUpdateBoard
}) => {
  const [boardTitle, setBoardTitle] = useState(board.title);
  const [decisionPrompt, setDecisionPrompt] = useState(board.decisionPrompt);
  const [scenarios, setScenarios] = useState<Scenario[]>(board.scenarios);

  const handleScenarioChange = (id: string, field: keyof Scenario, val: string) => {
    setScenarios(
      scenarios.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const handleAddScenario = () => {
    if (scenarios.length >= 8) return;
    const colorPalette = ['#0f172a', '#059669', '#7c3aed', '#d97706', '#db2777', '#0284c7'];
    const idx = scenarios.length + 1;
    const newScen: Scenario = {
      id: 'scen-' + Date.now(),
      title: `Option ${String.fromCharCode(64 + idx)}`,
      description: `Evaluated choice #${idx}`,
      colorHex: colorPalette[idx % colorPalette.length],
      badgeTag: `Option ${idx}`
    };
    setScenarios([...scenarios, newScen]);
  };

  const handleDeleteScenario = (id: string) => {
    if (scenarios.length <= 2) return;
    setScenarios(scenarios.filter((s) => s.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBoard({
      ...board,
      title: boardTitle.trim() || board.title,
      decisionPrompt: decisionPrompt.trim() || board.decisionPrompt,
      scenarios
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Translucent Dark Frosted Glass Container Card */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 w-full max-w-xl rounded-3xl p-6 shadow-2xl relative text-left text-white max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-white text-slate-900 flex items-center justify-center font-bold">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-luxury font-bold text-lg text-white">Board & Scenario Presets</h3>
              <p className="text-xs text-slate-400">Manage decision prompt and option choices</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Decision Board Title */}
          <div>
            <label className="block text-xs font-bold text-white mb-1">
              Board Title
            </label>
            <input
              type="text"
              required
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              className="w-full rounded-xl bg-slate-800/90 border border-slate-600 px-3.5 py-2 text-xs font-semibold text-white"
            />
          </div>

          {/* Decision Prompt */}
          <div>
            <label className="block text-xs font-bold text-white mb-1">
              Decision Prompt / Core Question
            </label>
            <input
              type="text"
              required
              value={decisionPrompt}
              onChange={(e) => setDecisionPrompt(e.target.value)}
              className="w-full rounded-xl bg-slate-800/90 border border-slate-600 px-3.5 py-2 text-xs font-semibold text-white"
            />
          </div>

          {/* Scenario Options Configuration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-white flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Decision Option Choices ({scenarios.length})</span>
              </label>

              <button
                type="button"
                onClick={handleAddScenario}
                disabled={scenarios.length >= 8}
                className="bg-white text-slate-900 hover:bg-slate-200 px-3 py-1 rounded-xl text-xs font-bold flex items-center space-x-1 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Choice</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {scenarios.map((scen) => (
                <div
                  key={scen.id}
                  className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center space-x-2"
                >
                  <input
                    type="color"
                    value={scen.colorHex}
                    onChange={(e) => handleScenarioChange(scen.id, 'colorHex', e.target.value)}
                    className="w-7 h-7 rounded-lg border border-white/20 cursor-pointer shrink-0"
                    title="Change Option Color"
                  />

                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={scen.title}
                      onChange={(e) => handleScenarioChange(scen.id, 'title', e.target.value)}
                      placeholder="Option Title"
                      className="w-full rounded-xl bg-slate-900 border border-slate-600 px-2.5 py-1.5 text-xs font-bold text-white"
                    />

                    <input
                      type="text"
                      value={scen.description}
                      onChange={(e) => handleScenarioChange(scen.id, 'description', e.target.value)}
                      placeholder="Short Description"
                      className="w-full rounded-xl bg-slate-900 border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-white"
                    />
                  </div>

                  {scenarios.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteScenario(scen.id)}
                      className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg"
                      title="Remove Choice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
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
              className="bg-white text-slate-900 hover:bg-slate-200 px-6 py-2 rounded-xl text-xs font-bold shadow-md"
            >
              Save Settings
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
