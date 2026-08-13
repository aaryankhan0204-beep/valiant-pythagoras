import React, { useState } from 'react';
import { Vote, Trophy, CheckCircle2, Award, Plus, Trash2, X, Dices } from 'lucide-react';
import type { BoardState, UserVote, Criteria } from '../../types/decision';

interface DecisionModeModalProps {
  board: BoardState;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBoard: (newBoard: BoardState) => void;
  onLaunchTiebreaker: () => void;
}

export const DecisionModeModal: React.FC<DecisionModeModalProps> = ({
  board,
  isOpen,
  onClose,
  onUpdateBoard,
  onLaunchTiebreaker
}) => {
  const [userName, setUserName] = useState('Member ' + Math.floor(Math.random() * 100));
  const [selectedTopChoice, setSelectedTopChoice] = useState<string>(board.scenarios[0]?.id || '');
  const [scoresMap, setScoresMap] = useState<{ [critId: string]: { [scenId: string]: number } }>({});
  const [explanation, setExplanation] = useState('');

  // User Custom Criteria addition inside voting screen
  const [showAddCriteria, setShowAddCriteria] = useState(false);
  const [newCritName, setNewCritName] = useState('');
  const [newCritWeight, setNewCritWeight] = useState(5);
  const [criteriaList, setCriteriaList] = useState<Criteria[]>(board.criteria || []);

  const handleScoreChange = (critId: string, scenId: string, val: number) => {
    setScoresMap((prev) => ({
      ...prev,
      [critId]: {
        ...(prev[critId] || {}),
        [scenId]: val
      }
    }));
  };

  const handleAddCriteria = () => {
    if (!newCritName.trim()) return;
    const newCrit: Criteria = {
      id: 'crit-' + Date.now(),
      name: newCritName.trim(),
      weight: newCritWeight,
      description: 'Added by voter'
    };
    const updatedCriteria = [...criteriaList, newCrit];
    setCriteriaList(updatedCriteria);
    onUpdateBoard({ ...board, criteria: updatedCriteria });
    setNewCritName('');
    setShowAddCriteria(false);
  };

  const handleDeleteCriteria = (critId: string) => {
    const updatedCriteria = criteriaList.filter((c) => c.id !== critId);
    setCriteriaList(updatedCriteria);
    onUpdateBoard({ ...board, criteria: updatedCriteria });
  };

  const handleSubmitVote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !selectedTopChoice) return;

    const formattedScores: { scenarioId: string; criteriaId: string; score: number }[] = [];
    Object.keys(scoresMap).forEach((critId) => {
      Object.keys(scoresMap[critId]).forEach((scenId) => {
        formattedScores.push({
          scenarioId: scenId,
          criteriaId: critId,
          score: scoresMap[critId][scenId]
        });
      });
    });

    const newVote: UserVote = {
      userId: 'user-' + Date.now(),
      userName: userName.trim(),
      scenarioRankings: [selectedTopChoice],
      criteriaRatings: scoresMap,
      explanation: explanation.trim()
    };

    const updatedVotes = [...board.votes, newVote];

    // Compute Math Consensus Winner Matrix
    const totals: { [scenId: string]: number } = {};
    board.scenarios.forEach((s) => (totals[s.id] = 0));

    updatedVotes.forEach((v) => {
      const topId = v.scenarioRankings[0];
      if (topId) totals[topId] = (totals[topId] || 0) + 15;
      
      if (v.criteriaRatings) {
        Object.keys(v.criteriaRatings).forEach((critId) => {
          Object.keys(v.criteriaRatings[critId]).forEach((scenId) => {
            const score = v.criteriaRatings[critId][scenId];
            const crit = criteriaList.find((c) => c.id === critId);
            const weight = crit ? crit.weight : 1;
            totals[scenId] = (totals[scenId] || 0) + score * weight;
          });
        });
      }
    });

    let winningScenId = board.scenarios[0]?.id;
    let maxScore = -1;
    Object.keys(totals).forEach((sId) => {
      if (totals[sId] > maxScore) {
        maxScore = totals[sId];
        winningScenId = sId;
      }
    });

    const winningScen = board.scenarios.find((s) => s.id === winningScenId);

    const updatedBoard: BoardState = {
      ...board,
      votes: updatedVotes,
      criteria: criteriaList,
      analysis: {
        winningScenarioId: winningScenId,
        winningScenarioTitle: winningScen ? winningScen.title : 'Option Choice',
        confidenceScore: 88,
        voteBreakdown: board.scenarios.map((s) => ({
          scenarioId: s.id,
          totalPoints: totals[s.id] || 0,
          percentage: Math.round(((totals[s.id] || 0) / Math.max(1, maxScore)) * 100)
        })),
        agreements: ['Highest weighted criteria score across team votes', 'Clear strategic preference'],
        disagreements: [],
        unresolvedAssumptions: [],
        strongestArguments: [],
        aiSummary: `Consensus Score: ${maxScore} pts. Leading preference choice evaluated by ${updatedVotes.length} team members.`,
        timestamp: new Date().toLocaleTimeString()
      }
    };

    onUpdateBoard(updatedBoard);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Translucent Dark Frosted Glass Container Card */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 w-full max-w-3xl rounded-3xl p-6 shadow-2xl relative text-left text-white max-h-[90vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-luxury font-bold text-xl text-white">Decision Voting & Consensus</h3>
              <p className="text-xs text-slate-400">Select your preferred option choice and rate evaluation criteria</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Analysis Winner Banner */}
        {board.analysis && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Trophy className="w-6 h-6 text-amber-400 shrink-0 animate-bounce" />
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Group Winner Consensus</span>
                <h4 className="font-bold text-base">{board.analysis.winningScenarioTitle}</h4>
                <p className="text-xs opacity-90">{board.analysis.aiSummary}</p>
              </div>
            </div>
            <button
              onClick={onLaunchTiebreaker}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center space-x-1 shrink-0 shadow-sm"
            >
              <Dices className="w-4 h-4" />
              <span>Tiebreaker Duel</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmitVote} className="space-y-6">
          
          {/* Voter Name Input */}
          <div>
            <label className="block text-xs font-bold text-white mb-1">Voter / Member Name</label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full rounded-xl bg-slate-800/90 border border-slate-600 px-3.5 py-2.5 text-xs font-semibold text-white"
            />
          </div>

          {/* QUESTION 1: CHOOSE YOUR PREFERRED TOP OPTION CHOICE */}
          <div>
            <label className="block text-xs font-extrabold text-white mb-2 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-sky-400" />
              <span>1. Select Your Top 1st Choice Preferred Option</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {board.scenarios.map((scen) => (
                <label
                  key={scen.id}
                  onClick={() => setSelectedTopChoice(scen.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center space-x-3 ${
                    selectedTopChoice === scen.id
                      ? 'bg-sky-950/80 border-sky-500 ring-2 ring-sky-500/40 shadow-sm'
                      : 'bg-slate-800/80 border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="topChoice"
                    checked={selectedTopChoice === scen.id}
                    onChange={() => setSelectedTopChoice(scen.id)}
                    className="w-4 h-4 text-sky-500 shrink-0"
                  />
                  <div>
                    <span
                      className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded text-white inline-block mb-1"
                      style={{ backgroundColor: scen.colorHex }}
                    >
                      {scen.badgeTag}
                    </span>
                    <h4 className="font-bold text-xs text-white leading-snug">{scen.title}</h4>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* QUESTION 2: EVALUATION CRITERIA MATRIX */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-extrabold text-white">
                2. Rate Option Choices on Evaluation Criteria (1-10 Scale)
              </label>

              <button
                type="button"
                onClick={() => setShowAddCriteria(!showAddCriteria)}
                className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Criteria</span>
              </button>
            </div>

            {/* Custom Criteria Add Sub-form */}
            {showAddCriteria && (
              <div className="p-3 mb-3 rounded-2xl bg-slate-800 border border-slate-700 space-y-2">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. Implementation Speed"
                    value={newCritName}
                    onChange={(e) => setNewCritName(e.target.value)}
                    className="flex-1 rounded-xl bg-slate-900 border border-slate-600 px-3 py-1.5 text-xs font-semibold text-white"
                  />
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newCritWeight}
                    onChange={(e) => setNewCritWeight(parseInt(e.target.value) || 5)}
                    className="w-16 rounded-xl bg-slate-900 border border-slate-600 px-2 py-1.5 text-xs font-bold text-center text-white"
                    title="Weight (1-10)"
                  />
                  <button
                    type="button"
                    onClick={handleAddCriteria}
                    className="bg-sky-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Criteria List Matrix */}
            <div className="space-y-4">
              {criteriaList.map((crit) => (
                <div key={crit.id} className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-white flex items-center gap-1">
                      {crit.name} <span className="text-[10px] text-slate-400 font-mono">(Weight: {crit.weight}/10)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCriteria(crit.id)}
                      className="text-slate-400 hover:text-rose-400 p-1"
                      title="Remove Criteria"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {board.scenarios.map((scen) => (
                      <div key={scen.id} className="flex items-center justify-between text-xs bg-slate-900 p-2 rounded-xl border border-slate-700">
                        <span className="font-semibold text-slate-200 truncate">{scen.title}</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={scoresMap[crit.id]?.[scen.id] || 5}
                          onChange={(e) => handleScoreChange(crit.id, scen.id, parseInt(e.target.value))}
                          className="w-24 accent-sky-500"
                        />
                        <span className="font-mono font-bold w-5 text-right text-sky-400">
                          {scoresMap[crit.id]?.[scen.id] || 5}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rationale Optional Input */}
          <div>
            <label className="block text-xs font-bold text-white mb-1">
              Rationale / Reason for Your Vote (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Explain why you picked this choice..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full rounded-xl bg-slate-800/90 border border-slate-600 px-3.5 py-2 text-xs font-semibold text-white resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-700/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-white hover:bg-slate-200 text-slate-900 px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-md uppercase tracking-wider"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-900" />
              <span className="text-slate-900 font-extrabold">Submit Official Vote</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
