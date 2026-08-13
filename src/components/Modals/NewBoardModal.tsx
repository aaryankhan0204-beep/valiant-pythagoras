import React, { useState } from 'react';
import { Plus, X, Trash2, Layers, Sparkles } from 'lucide-react';
import type { BoardState, Scenario, Criteria } from '../../types/decision';

interface NewBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBoard: (newBoard: BoardState) => void;
}

export const NewBoardModal: React.FC<NewBoardModalProps> = ({
  isOpen,
  onClose,
  onCreateBoard
}) => {
  const [title, setTitle] = useState('');
  const [decisionPrompt, setDecisionPrompt] = useState('');
  
  // Custom User Scenarios
  const [scenarios, setScenarios] = useState<Scenario[]>([
    { id: 'scen-1', title: 'Option A', description: 'First evaluated choice', colorHex: '#0f172a', badgeTag: 'Option A' },
    { id: 'scen-2', title: 'Option B', description: 'Second evaluated choice', colorHex: '#059669', badgeTag: 'Option B' }
  ]);

  // Custom User Evaluation Criteria (Starts empty unless user adds!)
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [newCriterionName, setNewCriterionName] = useState('');
  const [newCriterionWeight, setNewCriterionWeight] = useState(3);

  const handleAddScenario = () => {
    if (scenarios.length >= 6) return;
    const colors = ['#0f172a', '#059669', '#7c3aed', '#d97706', '#db2777', '#0284c7'];
    const idx = scenarios.length + 1;
    setScenarios([
      ...scenarios,
      {
        id: `scen-${Date.now()}`,
        title: `Option ${String.fromCharCode(64 + idx)}`,
        description: `Evaluated choice #${idx}`,
        colorHex: colors[idx % colors.length],
        badgeTag: `Option ${String.fromCharCode(64 + idx)}`
      }
    ]);
  };

  const handleRemoveScenario = (id: string) => {
    if (scenarios.length <= 2) return;
    setScenarios(scenarios.filter((s) => s.id !== id));
  };

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCriterionName.trim()) return;

    const newCrit: Criteria = {
      id: `crit-${Date.now()}`,
      name: newCriterionName.trim(),
      description: 'Custom evaluation factor',
      weight: newCriterionWeight
    };

    setCriteria([...criteria, newCrit]);
    setNewCriterionName('');
    setNewCriterionWeight(3);
  };

  const handleRemoveCriterion = (id: string) => {
    setCriteria(criteria.filter((c) => c.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !decisionPrompt.trim()) return;

    const newBoard: BoardState = {
      id: `board-${Date.now()}`,
      title: title.trim(),
      decisionPrompt: decisionPrompt.trim(),
      preset: 'custom',
      scenarios,
      criteria,
      cards: [],
      connectors: [],
      shapes: [],
      comments: [],
      votes: [],
      isAnonymousAllowed: true,
      isVotingMode: false,
      realtimeUsers: [
        { id: 'user-host', name: 'Host User', avatar: '', color: '#0f172a' }
      ]
    };

    onCreateBoard(newBoard);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Translucent Dark Frosted Glass Container Card */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative text-left text-white max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-white text-slate-900 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-luxury font-bold text-xl text-white">Create New Decision Board</h3>
              <p className="text-xs text-slate-400">Configure custom options & evaluation criteria</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Board Title */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-white mb-1">
              Board Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 Cloud Architecture Selection"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl bg-slate-800/90 border border-slate-600 px-3.5 py-2.5 text-xs font-bold text-white placeholder-slate-400"
            />
          </div>

          {/* Core Decision Prompt */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-white mb-1">
              Decision Prompt / Core Question
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Which cloud infrastructure best satisfies security and cost goals?"
              value={decisionPrompt}
              onChange={(e) => setDecisionPrompt(e.target.value)}
              className="w-full rounded-xl bg-slate-800/90 border border-slate-600 px-3.5 py-2.5 text-xs font-bold text-white placeholder-slate-400"
            />
          </div>

          {/* Custom Option Labels */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Decision Option Choices ({scenarios.length})</span>
              </label>

              <button
                type="button"
                onClick={handleAddScenario}
                disabled={scenarios.length >= 6}
                className="bg-white hover:bg-slate-200 text-slate-900 px-3 py-1 rounded-lg text-xs font-extrabold flex items-center space-x-1 disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Choice</span>
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {scenarios.map((scen) => (
                <div
                  key={scen.id}
                  className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center space-x-2"
                >
                  <input
                    type="color"
                    value={scen.colorHex}
                    onChange={(e) => {
                      const val = e.target.value;
                      setScenarios(scenarios.map((s) => s.id === scen.id ? { ...s, colorHex: val } : s));
                    }}
                    className="w-7 h-7 rounded-lg border border-white/20 cursor-pointer shrink-0"
                  />

                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      value={scen.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScenarios(scenarios.map((s) => s.id === scen.id ? { ...s, title: val, badgeTag: val } : s));
                      }}
                      placeholder="Option Title"
                      className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-1.5 text-xs font-extrabold text-white"
                    />

                    <input
                      type="text"
                      value={scen.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setScenarios(scenarios.map((s) => s.id === scen.id ? { ...s, description: val } : s));
                      }}
                      placeholder="Short Description"
                      className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-1.5 text-xs font-bold text-white"
                    />
                  </div>

                  {scenarios.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveScenario(scen.id)}
                      className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom User Evaluation Criteria Section */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-white mb-2">
              Evaluation Criteria ({criteria.length})
            </label>

            <div className="flex items-center space-x-2 mb-3">
              <input
                type="text"
                placeholder="Add custom criterion (e.g. Implementation Speed)..."
                value={newCriterionName}
                onChange={(e) => setNewCriterionName(e.target.value)}
                className="flex-1 rounded-xl bg-slate-800/90 border border-slate-600 px-3.5 py-2 text-xs font-extrabold text-white placeholder-slate-400"
              />

              <select
                value={newCriterionWeight}
                onChange={(e) => setNewCriterionWeight(Number(e.target.value))}
                className="rounded-xl bg-slate-800/90 border border-slate-600 px-3 py-2 text-xs font-extrabold text-white"
              >
                <option value={1}>Weight: 1 (Low)</option>
                <option value={3}>Weight: 3 (Medium)</option>
                <option value={5}>Weight: 5 (Critical)</option>
              </select>

              <button
                type="button"
                onClick={handleAddCriterion}
                className="bg-white hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-xl text-xs font-extrabold"
              >
                Add Factor
              </button>
            </div>

            {/* List of Added Criteria */}
            {criteria.length === 0 ? (
              <p className="text-xs italic text-slate-400 p-3 rounded-xl bg-slate-800/40 border border-dashed border-slate-700 text-center font-medium">
                No predefined criteria added yet. Add custom criteria above!
              </p>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto">
                {criteria.map((crit) => (
                  <div
                    key={crit.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs"
                  >
                    <span className="font-extrabold text-white">{crit.name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-slate-700 text-[10px] font-bold text-white">
                        Weight: {crit.weight}x
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(crit.id)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              className="bg-white hover:bg-slate-200 text-slate-900 px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md tracking-wider uppercase"
            >
              Create Board
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
