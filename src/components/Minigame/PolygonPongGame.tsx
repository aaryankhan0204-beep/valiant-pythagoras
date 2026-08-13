import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Play, RotateCcw, X, Trophy, Dices } from 'lucide-react';
import type { Scenario, UserVote } from '../../types/decision';

interface PolygonPongGameProps {
  scenarios: Scenario[];
  votes: UserVote[];
  isOpen: boolean;
  onClose: () => void;
  onSelectWinner: (scenarioId: string) => void;
}

interface SideState {
  scenario: Scenario;
  voters: string[];
  lives: number;
  maxLives: number;
  paddlePos: number; // 0.1 to 0.9 along edge
  paddleWidth: number;
  isEliminated: boolean;
  color: string;
}

export const PolygonPongGame: React.FC<PolygonPongGameProps> = ({
  scenarios,
  votes,
  isOpen,
  onClose,
  onSelectWinner
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [sides, setSides] = useState<SideState[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [winner, setWinner] = useState<Scenario | null>(null);
  const [matchLog, setMatchLog] = useState<string[]>([]);

  // Animation Loop Refs
  const animationRef = useRef<number | null>(null);
  const gameStateRef = useRef({
    isPlaying: false,
    ball: { x: 200, y: 200, vx: 3.5, vy: 2.5, radius: 8 },
    sidesData: [] as SideState[],
    winnerScenario: null as Scenario | null,
    playerPaddleMove: 0 // -1 left, 0 stationary, 1 right
  });

  // Keyboard Paddle Movement Listeners (ArrowLeft / ArrowRight / A / D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        gameStateRef.current.playerPaddleMove = -1;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        gameStateRef.current.playerPaddleMove = 1;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'a' ||
        e.key === 'A' ||
        e.key === 'd' ||
        e.key === 'D'
      ) {
        gameStateRef.current.playerPaddleMove = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Initialize Game Arena
  useEffect(() => {
    if (!isOpen || scenarios.length === 0) return;

    const colorPalette = ['#0284c7', '#059669', '#7c3aed', '#d97706', '#db2777', '#0284c7'];

    const initializedSides: SideState[] = scenarios.map((scen, idx) => {
      const optionVoters = votes
        .filter((v) => v.scenarioRankings[0] === scen.id)
        .map((v) => v.userName);

      return {
        scenario: scen,
        voters: optionVoters.length > 0 ? optionVoters : ['Voter'],
        lives: 3,
        maxLives: 3,
        paddlePos: 0.5,
        paddleWidth: 0.35,
        isEliminated: false,
        color: colorPalette[idx % colorPalette.length]
      };
    });

    setSides(initializedSides);
    setWinner(null);
    setIsPlaying(false);
    setMatchLog([`Tactical Ping-Pong Arena initialized for ${initializedSides.length} decision options.`]);

    gameStateRef.current = {
      isPlaying: false,
      ball: { 
        x: 180, 
        y: 180, 
        vx: (Math.random() > 0.5 ? 1 : -1) * (3.5 + Math.random()), 
        vy: (Math.random() > 0.5 ? 1 : -1) * (2.5 + Math.random()), 
        radius: 8 
      },
      sidesData: initializedSides,
      winnerScenario: null,
      playerPaddleMove: 0
    };

    requestAnimationFrame(drawCanvas);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isOpen, scenarios, votes]);

  // Main Physics Canvas Render Loop
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 45;

    ctx.clearRect(0, 0, width, height);

    const currentSides = gameStateRef.current.sidesData;
    const numSides = Math.max(currentSides.length, 2);

    // Compute polygon vertices
    const vertices: { x: number; y: number }[] = [];
    for (let i = 0; i < numSides; i++) {
      const angle = (2 * Math.PI * i) / numSides - Math.PI / 2;
      vertices.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    }

    // 1. Draw Polygon Arena & Defending Paddles
    for (let i = 0; i < numSides; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % numSides];
      const side = currentSides[i];

      // Draw Arena Wall Line
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = side?.isEliminated ? 2 : 4;
      ctx.strokeStyle = side?.isEliminated ? '#ef4444' : side?.color || '#0284c7';
      ctx.stroke();

      // Update & Draw Paddle
      if (side && !side.isEliminated && gameStateRef.current.isPlaying) {
        if (i === 0 && gameStateRef.current.playerPaddleMove !== 0) {
          // Interactive keyboard control for Option 1 paddle
          side.paddlePos += gameStateRef.current.playerPaddleMove * 0.03;
        } else {
          // AI Bot Oscillations
          side.paddlePos += (Math.random() - 0.5) * 0.04;
        }
        side.paddlePos = Math.max(0.2, Math.min(0.8, side.paddlePos));

        const padStart = side.paddlePos - side.paddleWidth / 2;
        const padEnd = side.paddlePos + side.paddleWidth / 2;

        const padP1 = {
          x: p1.x + (p2.x - p1.x) * padStart,
          y: p1.y + (p2.y - p1.y) * padStart
        };
        const padP2 = {
          x: p1.x + (p2.x - p1.x) * padEnd,
          y: p1.y + (p2.y - p1.y) * padEnd
        };

        ctx.beginPath();
        ctx.moveTo(padP1.x, padP1.y);
        ctx.lineTo(padP2.x, padP2.y);
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#ffffff';
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Draw Option Label
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const labelOffsetX = (midX - centerX) * 0.25;
      const labelOffsetY = (midY - centerY) * 0.25;

      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = side?.isEliminated ? '#ef4444' : side?.color || '#0284c7';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${side?.scenario.title.slice(0, 14)} (${side?.lives} HP)`,
        midX + labelOffsetX,
        midY + labelOffsetY
      );
    }

    // 2. Physics Movement & Wall Collisions
    if (gameStateRef.current.isPlaying) {
      const ball = gameStateRef.current.ball;
      ball.x += ball.vx;
      ball.y += ball.vy;

      for (let i = 0; i < numSides; i++) {
        const p1 = vertices[i];
        const p2 = vertices[(i + 1) % numSides];
        const side = currentSides[i];

        const dist = distToSegment({ x: ball.x, y: ball.y }, p1, p2);

        if (dist < ball.radius + 2) {
          // Reflect ball vector
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const nx = -dy / Math.hypot(dx, dy);
          const ny = dx / Math.hypot(dx, dy);

          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = ball.vx - 2 * dot * nx;
          ball.vy = ball.vy - 2 * dot * ny;

          ball.x += nx * 5;
          ball.y += ny * 5;

          if (side && !side.isEliminated) {
            const t = ((ball.x - p1.x) * dx + (ball.y - p1.y) * dy) / (dx * dx + dy * dy);
            const padStart = side.paddlePos - side.paddleWidth / 2;
            const padEnd = side.paddlePos + side.paddleWidth / 2;

            if (t >= padStart && t <= padEnd) {
              // Paddle Deflected Hit!
            } else {
              // Missed! Deduct 1 HP
              side.lives -= 1;
              setMatchLog((prev) => [
                `💥 ${side.scenario.title} missed deflection! (${side.lives} HP left)`,
                ...prev
              ]);

              if (side.lives <= 0) {
                side.isEliminated = true;
                setMatchLog((prev) => [`🚨 ELIMINATED: ${side.scenario.title}!`, ...prev]);
              }

              const activeSides = currentSides.filter((s) => !s.isEliminated);
              if (activeSides.length <= 1) {
                gameStateRef.current.isPlaying = false;
                setIsPlaying(false);
                const finalWinner = activeSides[0]?.scenario || currentSides[0].scenario;
                gameStateRef.current.winnerScenario = finalWinner;
                setWinner(finalWinner);
                onSelectWinner(finalWinner.id);

                setMatchLog((prev) => [`🏆 WINNER DECLARED: ${finalWinner.title}!`, ...prev]);

                try {
                  confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
                } catch (e) {}
              }
            }
          }
        }
      }

      if (Math.hypot(ball.x - centerX, ball.y - centerY) > radius + 35) {
        ball.x = centerX;
        ball.y = centerY;
      }
    }

    // 3. Render Ball
    const ball = gameStateRef.current.ball;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    if (gameStateRef.current.isPlaying) {
      animationRef.current = requestAnimationFrame(drawCanvas);
    }
  };

  const handleStartMatch = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    gameStateRef.current.isPlaying = true;
    animationRef.current = requestAnimationFrame(drawCanvas);
  };

  const handleResetMatch = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsPlaying(false);
    gameStateRef.current.isPlaying = false;

    const resetSides = sides.map((s) => ({
      ...s,
      lives: 3,
      isEliminated: false,
      paddlePos: 0.5
    }));

    setSides(resetSides);
    gameStateRef.current.sidesData = resetSides;
    gameStateRef.current.ball = {
      x: 180,
      y: 180,
      vx: (Math.random() > 0.5 ? 1 : -1) * 3.5,
      vy: (Math.random() > 0.5 ? 1 : -1) * 2.5,
      radius: 8
    };
    setWinner(null);
    setMatchLog(['Arena reset. Ready to launch duel. Use ← → arrow keys to control Option 1 paddle!']);
    requestAnimationFrame(drawCanvas);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 border shadow-2xl relative text-left">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-sky-100 dark:bg-sky-900/50 text-sky-600 flex items-center justify-center">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Polygon Ping-Pong Tiebreaker</h3>
              <p className="text-xs text-slate-500">{scenarios.length}-Sided Polygon Tactical Elimination Duel</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Arena Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          {/* Canvas Polygon Arena */}
          <div className="md:col-span-2 flex justify-center">
            <canvas
              ref={canvasRef}
              width={360}
              height={360}
              className="rounded-2xl bg-slate-900 border border-slate-700 shadow-inner"
            />
          </div>

          {/* Scenario Defenders & HP List */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Scenario Defenders</span>
            <div className="space-y-2">
              {sides.map((side) => (
                <div
                  key={side.scenario.id}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    side.isEliminated
                      ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-800'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="truncate">
                    <span className="font-bold block truncate">{side.scenario.title}</span>
                    <span className="text-[10px] text-slate-500">Voters: {side.voters.join(', ')}</span>
                  </div>
                  <span className="font-mono font-bold text-sky-600 shrink-0 ml-2">
                    {side.isEliminated ? 'OUT' : `${side.lives} HP`}
                  </span>
                </div>
              ))}
            </div>

            {/* Match Log */}
            <div className="p-3 rounded-xl bg-slate-900 text-slate-200 text-[11px] h-28 overflow-y-auto space-y-1 font-mono">
              {matchLog.map((log, idx) => (
                <p key={idx}>{log}</p>
              ))}
            </div>
          </div>

        </div>

        {/* Winner Highlight Banner */}
        {winner && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-center animate-in zoom-in duration-200">
            <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1 animate-bounce" />
            <h4 className="font-bold text-base">WINNER: {winner.title}</h4>
            <p className="text-xs mt-0.5">Surviving winner of the {scenarios.length}-sided polygon duel arena!</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
          <button
            onClick={handleResetMatch}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Arena</span>
          </button>

          <button
            onClick={handleStartMatch}
            disabled={isPlaying || !!winner}
            className="liquid-btn-primary px-6 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isPlaying ? 'Match In Progress...' : 'Launch Polygon Pong Duel'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

function distToSegment(
  p: { x: number; y: number },
  v: { x: number; y: number },
  w: { x: number; y: number }
) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}
