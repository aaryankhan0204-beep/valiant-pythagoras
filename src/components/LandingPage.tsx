import React from 'react';
import { 
  ArrowRight, 
  CheckCircle2
} from 'lucide-react';
import type { BoardState } from '../types/decision';

interface LandingPageProps {
  onLaunchWorkspace: () => void;
  board: BoardState;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchWorkspace,
  board
}) => {
  return (
    <div className="overview-container w-full font-sans relative overflow-x-hidden min-h-[calc(100vh-64px)] bg-[#faf8f5] dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200">
      
      {/* Editorial Background Image Overlay with Soft Warm Vignette */}
      <div 
        className="absolute inset-0 opacity-15 dark:opacity-10 bg-cover bg-center pointer-events-none mix-blend-multiply"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80')`
        }}
      />

      <div className="max-w-7xl mx-auto px-8 py-12 relative z-10 text-center flex flex-col justify-between min-h-[calc(100vh-100px)]">
        
        {/* Top Eyebrow Tag */}
        <div className="mt-4">
          <div className="inline-flex items-center space-x-3 text-xs tracking-[0.3em] uppercase font-bold text-slate-500 dark:text-slate-400">
            <span className="h-[1px] w-8 bg-slate-400 dark:bg-slate-600" />
            <span>DECISION INTELLIGENCE • REAL-TIME CANVAS</span>
            <span className="h-[1px] w-8 bg-slate-400 dark:bg-slate-600" />
          </div>
        </div>

        {/* Hero Headline Section */}
        <div className="my-auto py-12 max-w-4xl mx-auto">
          
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif-luxury tracking-tight text-slate-900 dark:text-white leading-[1.08] mb-6">
            Valiant <br />
            <span className="italic font-normal">Real-Time Decision Canvas</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10 font-normal">
            A real-time collaborative whiteboard designed for teams to structure ideas, evaluate choices, and make confident decisions together.
          </p>

          {/* Dual Luxury Action Buttons - Solid Obsidian & Solid Crisp White Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onLaunchWorkspace}
              className="btn-obsidian-primary w-full sm:w-auto flex items-center justify-center space-x-3 text-xs shadow-xl"
            >
              <span>Explore Decision Boards</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* CRISP SOLID WHITE LAUNCH WORKSPACE BUTTON */}
            <button
              onClick={onLaunchWorkspace}
              className="bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 w-full sm:w-auto px-8 py-3.5 rounded-lg text-xs font-extrabold shadow-lg tracking-[0.15em] uppercase transition-all flex items-center justify-center space-x-2"
            >
              <span>Launch Workspace</span>
            </button>
          </div>

        </div>

        {/* Active Decision Prompt Feature Box */}
        <div className="max-w-4xl mx-auto w-full mb-12 p-8 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] tracking-[0.2em] font-extrabold uppercase px-3 py-1 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-md">
              Active Decision Board
            </span>
            <div className="flex items-center space-x-1 text-xs text-emerald-600 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Ready for Consensus</span>
            </div>
          </div>

          <h3 className="text-2xl font-serif-luxury font-bold text-slate-900 dark:text-white mb-2">
            {board.decisionPrompt || 'Which Option Should We Select?'}
          </h3>

          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-6">
            Compare alternative options using structured evidence, facts, and weighted consensus scoring.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(board.scenarios || []).map((scen) => (
              <div 
                key={scen.id} 
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
              >
                <span 
                  className="text-[9px] tracking-[0.15em] font-extrabold uppercase px-2 py-0.5 rounded text-white shadow-sm inline-block mb-2"
                  style={{ backgroundColor: scen.colorHex }}
                >
                  {scen.badgeTag}
                </span>
                <h4 className="font-serif-luxury font-bold text-base text-slate-900 dark:text-white mb-1">
                  {scen.title}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {scen.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Luxury Statistics Metric Row */}
        <div className="border-t border-slate-300 dark:border-slate-800 pt-8 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            
            <div>
              <h3 className="text-4xl font-serif-luxury font-bold text-slate-900 dark:text-white mb-1">
                150+
              </h3>
              <p className="text-[10px] tracking-[0.25em] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                Decision Frameworks
              </p>
            </div>

            <div>
              <h3 className="text-4xl font-serif-luxury font-bold text-slate-900 dark:text-white mb-1">
                48
              </h3>
              <p className="text-[10px] tracking-[0.25em] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                Active Workspace Boards
              </p>
            </div>

            <div>
              <h3 className="text-4xl font-serif-luxury font-bold text-slate-900 dark:text-white mb-1">
                1892
              </h3>
              <p className="text-[10px] tracking-[0.25em] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                Est. Consensus Finalized
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
