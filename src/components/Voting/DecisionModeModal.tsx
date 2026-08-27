import React, { useState, useEffect } from 'react';
import { Vote, Trophy, CheckCircle2, Award, Plus, Trash2, X, Dices, Clock, Flame, Users, Sparkles } from 'lucide-react';
import type { BoardState, UserVote, Criteria, Scenario } from '../../types/decision';

interface DecisionModeModalProps {
  board: BoardState;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBoard: (newBoard: BoardState) => void;
  currentUserId: string;
  currentUserName: string;
  onTriggerCoinFlip: (tiedScenarios: Scenario[]) => void;
  onTriggerRandomWheel: (tiedScenarios: Scenario[]) => void;
}

export const DecisionModeModal: React.FC<DecisionModeModalProps> = ({
  board,
  isOpen,
  onClose,
  onUpdateBoard,
  currentUserId,
  currentUserName,
  onTriggerCoinFlip,
  onTriggerRandomWheel
}) => {
  const [userName, setUserName] = useState(currentUserName || 'Collaborator');
  const [selectedTopChoice, setSelectedTopChoice] = useState<string>(board.scenarios[0]?.id || '');
  const [scoresMap, setScoresMap] = useState<{ [critId: string]: { [scenId: string]: number } }>({});
  const [explanation, setExplanation] = useState('');

  // Custom Criteria addition
  const [showAddCriteria, setShowAddCriteria] = useState(false);
  const [newCritName, setNewCritName] = useState('');
  const [newCritWeight, setNewCritWeight] = useState(5);
  const [criteriaList, setCriteriaList] = useState<Criteria[]>(board.criteria || []);

  // 2-Minute Timer State (120 seconds max)
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [hasVoted, setHasVoted] = useState<boolean>(false);

  useEffect(() => {
    if (currentUserName) setUserName(currentUserName);
  }, [currentUserName]);

  useEffect(() => {
    if (board.criteria) setCriteriaList(board.criteria);
  }, [board.criteria]);

  // Check if current user has already cast a vote in board.votes
  useEffect(() => {
    const existing = board.votes.find((v) => v.userId === currentUserId || v.userName === userName);
    if (existing) {
      setHasVoted(true);
      if (existing.scenarioRankings[0]) setSelectedTopChoice(existing.scenarioRankings[0]);
      if (existing.criteriaRatings) setScoresMap(existing.criteriaRatings);
      if (existing.explanation) setExplanation(existing.explanation);
    }
  }, [board.votes, currentUserId, userName]);

  // Countdown timer logic
  useEffect(() => {
    if (!isOpen || !board.votingSession || board.votingSession.status !== 'voting') {
      return;
    }

    const updateTimer = () => {
      const endsAt = board.votingSession?.endsAt || Date.now() + 120000;
      const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0 && board.votingSession?.status === 'voting') {
        handleConcludeVoting();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen, board.votingSession]);

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

    const newVote: UserVote = {
      userId: currentUserId || 'user-' + Date.now(),
      userName: userName.trim(),
      scenarioRankings: [selectedTopChoice],
      criteriaRatings: scoresMap,
      explanation: explanation.trim()
    };

    // Replace previous vote from same user or append
    const otherVotes = board.votes.filter((v) => v.userId !== currentUserId && v.userName !== userName.trim());
    const updatedVotes = [...otherVotes, newVote];

    onUpdateBoard({
      ...board,
      votes: updatedVotes,
      criteria: criteriaList
    });

    setHasVoted(true);
  };

  // Conclude voting manually or automatically when timer hits 0
  const handleConcludeVoting = () => {
    const currentVotes = board.votes;
    
    // Tally points for each scenario
    const totals: { [scenId: string]: number } = {};
    board.scenarios.forEach((s) => (totals[s.id] = 0));

    currentVotes.forEach((v) => {
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

    // Find highest score
    let maxScore = -1;
    Object.keys(totals).forEach((sId) => {
      if (totals[sId] > maxScore) {
        maxScore = totals[sId];
      }
    });

    // Find tied scenarios with maxScore
    const tiedScenarios = board.scenarios.filter((s) => (totals[s.id] || 0) === maxScore);

    let winningScen = tiedScenarios[0] || board.scenarios[0];

    const isTie = tiedScenarios.length > 1;

    const updatedBoard: BoardState = {
      ...board,
      votes: currentVotes,
      criteria: criteriaList,
      votingSession: {
        ...(board.votingSession || {
          active: true,
          startTime: Date.now(),
          endsAt: Date.now(),
          initiatedBy: userName
        }),
        active: true,
        status: 'completed'
      },
      analysis: {
        winningScenarioId: winningScen.id,
        winningScenarioTitle: winningScen ? winningScen.title : 'Option Choice',
        confidenceScore: isTie ? 75 : 92,
        voteBreakdown: board.scenarios.map((s) => ({
          scenarioId: s.id,
          totalPoints: totals[s.id] || 0,
          percentage: Math.round(((totals[s.id] || 0) / Math.max(1, maxScore)) * 100)
        })),
        agreements: [
          isTie ? `${tiedScenarios.length}-Way Tie Detected across top choices` : 'Clear consensus winner determined across team votes',
          `Evaluated by ${currentVotes.length} team members`
        ],
        disagreements: [],
        unresolvedAssumptions: [],
        strongestArguments: [],
        aiSummary: isTie 
          ? `TIE! ${tiedScenarios.length} options scored ${maxScore} pts. Tiebreaker required.`
          : `Consensus Score: ${maxScore} pts. Leading preference choice evaluated by ${currentVotes.length} team members.`,
        timestamp: new Date().toLocaleTimeString()
      }
    };

    onUpdateBoard(updatedBoard);

    // If there is a tie, automatically trigger appropriate tiebreaker mode!
    if (isTie) {
      if (tiedScenarios.length === 2) {
        onTriggerCoinFlip(tiedScenarios);
      } else {
        onTriggerRandomWheel(tiedScenarios);
      }
    }
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const timerPercentage = Math.max(0, Math.min(100, (timeLeft / 120) * 100));

  const totalOnlineCount = Math.max(1, board.realtimeUsers?.length || 1);
  const votedUsersCount = board.votes.length;

  const isCompleted = board.votingSession?.status === 'completed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 w-full max-w-3xl rounded-3xl p-6 shadow-2xl relative text-left text-white max-h-[92vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
              <Vote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-luxury font-bold text-xl text-white">Live Group Consensus Vote</h3>
              <p className="text-xs text-slate-400">
                {board.votingSession?.initiatedBy 
                  ? `Session initiated by ${board.votingSession.initiatedBy}` 
                  : 'Real-time synchronized team evaluation'}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-MINUTE LIVE TIMER & PRESENCE BANNER */}
        {!isCompleted && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-amber-400">
                <Clock className="w-5 h-5 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider">Group Vote Countdown</span>
              </div>
              <div className="font-mono text-lg font-black text-amber-400 bg-amber-950/70 border border-amber-800/80 px-3 py-1 rounded-xl">
                {formattedTime}
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-700 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  timeLeft < 30 ? 'bg-rose-500' : timeLeft < 60 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${timerPercentage}%` }}
              />
            </div>

            {/* Voted Count vs Online Participants */}
            <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
              <div className="flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-sky-400" />
                <span>
                  Voted: <strong className="text-white">{votedUsersCount}</strong> / {totalOnlineCount} active team members
                </span>
              </div>
              
              <button
                type="button"
                onClick={handleConcludeVoting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1 shadow-sm transition-all"
              >
                <Flame className="w-3.5 h-3.5 text-amber-300" />
                <span>Conclude & Get Result Now</span>
              </button>
            </div>
          </div>
        )}

        {/* RESULTS & WINNER BANNER (When Voting Concluded) */}
        {board.analysis && (
          <div className="mb-6 p-4.5 rounded-2xl bg-emerald-950/70 border border-emerald-700 text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Trophy className="w-8 h-8 text-amber-400 shrink-0 animate-bounce" />
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                  Official Consensus Winner
                </span>
                <h4 className="font-extrabold text-lg text-white">{board.analysis.winningScenarioTitle}</h4>
                <p className="text-xs opacity-90">{board.analysis.aiSummary}</p>
                {board.votingSession?.tiebreaker && (
                  <p className="text-[11px] font-bold text-amber-300 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Resolved via {board.votingSession.tiebreaker.type === 'coinflip' ? '3D Coin Flip' : 'Random Selector Wheel'}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => {
                  const tiedCount = board.scenarios.length;
                  if (tiedCount === 2) {
                    onTriggerCoinFlip(board.scenarios);
                  } else {
                    onTriggerRandomWheel(board.scenarios);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center space-x-1.5 border border-slate-600 shadow-sm"
              >
                <Dices className="w-4 h-4 text-amber-400" />
                <span>Tiebreaker Duel</span>
              </button>
            </div>
          </div>
        )}

        {/* VOTING FORM */}
        <form onSubmit={handleSubmitVote} className="space-y-6">
          
          {/* Voter Name Input */}
          <div className="flex items-center justify-between gap-3 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-300 mb-1">Your Name / Identifier</label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-600 px-3 py-1.5 text-xs font-semibold text-white"
              />
            </div>
            {hasVoted && (
              <span className="bg-emerald-900/80 border border-emerald-600 text-emerald-300 font-bold px-3 py-1 rounded-xl text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Vote Recorded</span>
              </span>
            )}
          </div>

          {/* QUESTION 1: CHOOSE YOUR PREFERRED TOP OPTION CHOICE */}
          <div>
            <label className="block text-xs font-extrabold text-white mb-2 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-sky-400" />
              <span>1. Select Your Top Preferred Option Choice</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {board.scenarios.map((scen) => (
                <label
                  key={scen.id}
                  onClick={() => setSelectedTopChoice(scen.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center space-x-3 ${
                    selectedTopChoice === scen.id
                      ? 'bg-sky-950/80 border-sky-500 ring-2 ring-sky-500/40 shadow-sm'
                      : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-700/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Dismiss Window
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="submit"
                className="bg-white hover:bg-slate-200 text-slate-900 px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-md uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-900" />
                <span>{hasVoted ? 'Update My Vote' : 'Submit Official Vote'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
