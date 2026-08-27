import React, { useState } from 'react';
import { 
  HelpCircle, 
  X, 
  Hand, 
  StickyNote, 
  Square, 
  ArrowRight, 
  PenTool, 
  Image as ImageIcon, 
  Command,
  Sun
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tools' | 'consensus' | 'shortcuts'>('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Translucent Dark Frosted Glass Container Card */}
      <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl relative text-left text-white max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-700/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold shadow-md">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-luxury font-bold text-xl text-white">How to Use Valiant</h3>
              <p className="text-xs text-slate-400">Collaborative Decision Intelligence & Spatial Canvas Guide</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pt-4 pb-2 shrink-0">
          {[
            { id: 'overview', label: 'Canvas Controls' },
            { id: 'tools', label: 'Toolbar & Items' },
            { id: 'consensus', label: 'Voting & Consensus' },
            { id: 'shortcuts', label: 'Shortcuts' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6 text-slate-300 text-xs">
          
          {/* Tab 1: Canvas Controls & Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h4 className="font-serif-luxury font-bold text-base text-white">Navigating Your Infinite Canvas</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold">
                    <Hand className="w-4 h-4" />
                    <span>Panning the Board</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Select the Hand Tool or hold down <kbd className="px-1.5 py-0.5 rounded bg-slate-700 font-mono text-[10px]">Space</kbd> while clicking and dragging to pan across the infinite canvas.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <div className="flex items-center space-x-2 text-sky-400 font-bold">
                    <Command className="w-4 h-4" />
                    <span>Zooming In & Out</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Use your mouse scroll wheel or the zoom buttons located in the bottom-right corner to zoom between 30% and 250%.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2 sm:col-span-2">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold">
                    <Sun className="w-4 h-4" />
                    <span>Theme Customization</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Toggle between <strong>Light Whiteboard</strong> and <strong>Dark Blackboard</strong> modes using the Sun/Moon icon in the top header.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Toolbar & Items */}
          {activeTab === 'tools' && (
            <div className="space-y-4">
              <h4 className="font-serif-luxury font-bold text-base text-white">Toolbar Items & Canvas Objects</h4>

              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                    <StickyNote className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white mb-0.5">Sticky Notes</h5>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Add color-coded cards classified as Fact, Opinion, Assumption, Suggestion, or Question under evaluated option columns. Double-click any note to edit text.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                    <Square className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white mb-0.5">Shape Containers</h5>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Click the Square tool to choose Rectangles, Circles, Diamonds, or Badge Containers. Selecting a shape displays inline color controls and pullable resize handles.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white mb-0.5">Curved Connector Arrows</h5>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Draw curved vector arrows between notes to map relationships, dependencies, or trade-offs. Drag the middle control dot to adjust arrow curvature.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                    <PenTool className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white mb-0.5">Goodnotes Freehand Pen Suite</h5>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Draw smooth freehand sketches, diagrams, or handwritten annotations with custom ink colors and stroke thickness (Fine, Medium, Thick).
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-start space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white mb-0.5">Image Upload</h5>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Upload local images directly to your decision board for visual context and reference documents.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Voting & Consensus */}
          {activeTab === 'consensus' && (
            <div className="space-y-4">
              <h4 className="font-serif-luxury font-bold text-base text-white">Team Agreement & Evaluation</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <h5 className="font-bold text-emerald-400">Note Thumbs Up & Down</h5>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Vote on individual sticky notes to show support or opposition. Likes and dislikes are tracked independently so feedback is clear.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                  <h5 className="font-bold text-purple-400">Consensus Mode</h5>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Click <strong>Consensus</strong> in the top header to enter multi-user voting. Rate choices against criteria to auto-compute the winning scenario matrix.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2 sm:col-span-2">
                  <h5 className="font-bold text-amber-400">Polygon Pong Tiebreaker Arena</h5>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    When decision votes result in a deadlock, launch the interactive Polygon Pong arena to determine a clear winner through real-time gameplay!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Keyboard Shortcuts */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <h4 className="font-serif-luxury font-bold text-base text-white">Keyboard Shortcuts Quick Reference</h4>

              <div className="divide-y divide-slate-800 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                {[
                  { keys: ['Ctrl', 'Z'], desc: 'Undo last action on board' },
                  { keys: ['Ctrl', 'Y'], desc: 'Redo previously undone action' },
                  { keys: ['Delete'], desc: 'Delete currently selected card, shape, or arrow' },
                  { keys: ['Escape'], desc: 'Clear current tool or active selection' },
                  { keys: ['Space', 'Drag'], desc: 'Pan around the spatial canvas' },
                  { keys: ['Double Click'], desc: 'Edit note text or standalone mini text box' }
                ].map((sc, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <span className="text-slate-300 text-[11px] font-medium">{sc.desc}</span>
                    <div className="flex items-center space-x-1">
                      {sc.keys.map((k, kIdx) => (
                        <kbd key={kIdx} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-[10px] font-bold">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-700/80 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="bg-white hover:bg-slate-200 text-slate-900 px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition-all"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
};
