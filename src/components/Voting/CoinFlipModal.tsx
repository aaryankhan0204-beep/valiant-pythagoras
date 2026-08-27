import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Coins, X, Trophy, Sparkles, RefreshCw } from 'lucide-react';
import type { Scenario } from '../../types/decision';

interface CoinFlipModalProps {
  scenarios: Scenario[]; // The 2 tied scenarios
  isOpen: boolean;
  onClose: () => void;
  onSelectWinner: (winnerId: string) => void;
  initialWinnerId?: string; // If already determined by consensus host
}

export const CoinFlipModal: React.FC<CoinFlipModalProps> = ({
  scenarios,
  isOpen,
  onClose,
  onSelectWinner,
  initialWinnerId
}) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<Scenario | null>(null);

  const optionA = scenarios[0];
  const optionB = scenarios[1] || scenarios[0];

  useEffect(() => {
    if (isOpen && initialWinnerId) {
      const predefinedWinner = scenarios.find((s) => s.id === initialWinnerId) || optionA;
      setWinner(predefinedWinner);
    } else {
      setWinner(null);
      setRotation(0);
    }
  }, [isOpen, initialWinnerId, scenarios]);

  if (!isOpen || !optionA) return null;

  const handleFlipCoin = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setWinner(null);

    // Pick random winner between the 2 tied scenarios
    const winnerIndex = Math.random() < 0.5 ? 0 : 1;
    const selectedWinner = scenarios[winnerIndex] || optionA;

    // Number of full 3D flips (e.g. 10 to 14 flips = 3600 to 5040 deg)
    // Heads (optionA) = 360 * flips, Tails (optionB) = 360 * flips + 180
    const fullFlips = 10 + Math.floor(Math.random() * 4);
    const targetDeg = winnerIndex === 0 ? fullFlips * 360 : fullFlips * 360 + 180;

    setRotation(targetDeg);

    setTimeout(() => {
      setIsFlipping(false);
      setWinner(selectedWinner);
      onSelectWinner(selectedWinner.id);

      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch (err) {
        console.warn('Confetti error:', err);
      }
    }, 3200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <div className="bg-slate-900/95 border border-amber-500/40 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.25)] relative text-center text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/80 mb-6">
          <div className="flex items-center space-x-3 text-left">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold shadow-md">
              <Coins className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-serif-luxury font-bold text-lg text-white">Tiebreaker Coin Flip</h3>
              <p className="text-xs text-slate-400">2-Way Tie Detected! Flip coin to decide the winner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Both Tied Options Badges */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className={`p-3 rounded-2xl border text-left transition-all ${
            winner?.id === optionA.id 
              ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500/50 shadow-lg' 
              : 'bg-slate-800/80 border-slate-700'
          }`}>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded text-white inline-block mb-1 bg-amber-600">
              HEADS
            </span>
            <h4 className="font-bold text-xs truncate text-white">{optionA.title}</h4>
          </div>

          <div className={`p-3 rounded-2xl border text-left transition-all ${
            winner?.id === optionB.id 
              ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/50 shadow-lg' 
              : 'bg-slate-800/80 border-slate-700'
          }`}>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded text-white inline-block mb-1 bg-indigo-600">
              TAILS
            </span>
            <h4 className="font-bold text-xs truncate text-white">{optionB.title}</h4>
          </div>
        </div>

        {/* 3D Coin Graphic Stage */}
        <div className="relative w-40 h-40 mx-auto my-6 [perspective:1000px]">
          <div
            className="w-full h-full relative rounded-full shadow-2xl transition-transform duration-[3200ms] [transform-style:preserve-3d]"
            style={{
              transform: `rotateY(${rotation}deg)`,
              transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)'
            }}
          >
            {/* Front Side - HEADS */}
            <div className="absolute inset-0 rounded-full border-4 border-amber-400/80 bg-gradient-to-tr from-amber-600 via-amber-400 to-yellow-200 flex flex-col items-center justify-center p-4 text-slate-950 font-black shadow-inner [backface-visibility:hidden]">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-950">HEADS</span>
              <p className="text-xs font-bold line-clamp-2 text-center text-slate-900 mt-1">{optionA.title}</p>
              <Coins className="w-8 h-8 mt-2 text-amber-900/60" />
            </div>

            {/* Back Side - TAILS */}
            <div 
              className="absolute inset-0 rounded-full border-4 border-indigo-400/80 bg-gradient-to-tr from-indigo-700 via-indigo-500 to-purple-300 flex flex-col items-center justify-center p-4 text-white font-black shadow-inner [backface-visibility:hidden]"
              style={{ transform: 'rotateY(180deg)' }}
            >
              <span className="text-[11px] font-black uppercase tracking-widest text-indigo-100">TAILS</span>
              <p className="text-xs font-bold line-clamp-2 text-center text-white mt-1">{optionB.title}</p>
              <Sparkles className="w-8 h-8 mt-2 text-indigo-200/60" />
            </div>
          </div>
        </div>

        {/* Winner Highlight Result Banner */}
        {winner && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 my-6 animate-in zoom-in duration-300 text-center">
            <Trophy className="w-7 h-7 text-amber-400 mx-auto mb-1 animate-bounce" />
            <h4 className="font-extrabold text-white text-base">Coin Flip Winner: {winner.title}</h4>
            <p className="text-xs text-amber-300/90 mt-1">
              Tiebreaker resolved officially in favor of Option {winner.badgeTag || winner.title}
            </p>
          </div>
        )}

        {/* Flip Coin Action Button */}
        <div className="flex justify-center space-x-3 mt-6">
          <button
            onClick={handleFlipCoin}
            disabled={isFlipping}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFlipping ? 'animate-spin' : ''}`} />
            <span>{isFlipping ? 'Flipping Coin...' : winner ? 'Re-Flip Coin' : 'Flip Coin Now'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
