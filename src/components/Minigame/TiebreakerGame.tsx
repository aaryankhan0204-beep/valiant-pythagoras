import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Dices, X, Sparkles, Trophy } from 'lucide-react';
import type { Scenario } from '../../types/decision';

interface TiebreakerGameProps {
  scenarios: Scenario[];
  isOpen: boolean;
  onClose: () => void;
  onSelectWinner: (scenarioId: string) => void;
}

export const TiebreakerGame: React.FC<TiebreakerGameProps> = ({
  scenarios,
  isOpen,
  onClose,
  onSelectWinner
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegree, setRotationDegree] = useState(0);
  const [selectedWinner, setSelectedWinner] = useState<Scenario | null>(null);

  if (!isOpen) return null;

  const handleSpinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSelectedWinner(null);

    // Random extra spins (5 to 8 full turns + random offset)
    const extraSpins = 360 * (5 + Math.floor(Math.random() * 3));
    const winnerIndex = Math.floor(Math.random() * scenarios.length);
    const segmentAngle = 360 / scenarios.length;
    const targetAngle = extraSpins + (scenarios.length - winnerIndex - 0.5) * segmentAngle;

    setRotationDegree(targetAngle);

    setTimeout(() => {
      setIsSpinning(false);
      const winner = scenarios[winnerIndex];
      setSelectedWinner(winner);
      onSelectWinner(winner.id);
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.5 }
        });
      } catch (err) {}
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-purple-500/40 shadow-2xl relative text-center">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center space-x-2 text-left">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Dices className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Liquid Glass Tiebreaker Wheel</h3>
              <p className="text-xs text-slate-400">Randomized strategic duel resolution</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wheel Display Container */}
        <div className="relative w-64 h-64 mx-auto my-6 flex items-center justify-center">
          {/* Wheel Pointer Indicator */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-cyan-400 filter drop-shadow-[0_0_8px_rgba(0,242,254,0.8)]" />

          {/* Rotating Wheel Graphic */}
          <div
            className="w-full h-full rounded-full border-4 border-white/20 shadow-liquid-glow relative overflow-hidden transition-transform duration-[4000ms] cubic-bezier(0.15, 0.9, 0.2, 1)"
            style={{ transform: `rotate(${rotationDegree}deg)` }}
          >
            {scenarios.map((scen, idx) => {
              const count = scenarios.length;
              const angle = (360 / count) * idx;
              return (
                <div
                  key={scen.id}
                  className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white uppercase tracking-wider"
                  style={{
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: '50% 50%',
                    backgroundColor: `${scen.colorHex}25`,
                    borderRight: '1px solid rgba(255,255,255,0.15)'
                  }}
                >
                  <span className="translate-y-[-75px] rotate-90 px-2 py-1 rounded bg-black/60 border border-white/20">
                    {scen.title.slice(0, 14)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Winner Highlight Box */}
        {selectedWinner && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 mb-6 animate-in zoom-in duration-300">
            <Trophy className="w-6 h-6 text-amber-400 mx-auto mb-1 animate-bounce" />
            <h4 className="font-bold text-white text-base">Winner: {selectedWinner.title}</h4>
            <p className="text-xs text-slate-300 mt-1">Tiebreaker resolved in favor of Option {selectedWinner.badgeTag}</p>
          </div>
        )}

        {/* Spin Action Buttons */}
        <div className="flex justify-center space-x-3">
          <button
            onClick={handleSpinWheel}
            disabled={isSpinning}
            className="liquid-btn-primary px-8 py-3 rounded-2xl text-xs font-bold flex items-center space-x-2"
          >
            <Sparkles className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
            <span>{isSpinning ? 'Spinning...' : 'Spin Tiebreaker Wheel'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
