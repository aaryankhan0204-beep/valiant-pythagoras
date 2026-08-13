import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  AlertTriangle, 
  BarChart2, 
  HelpCircle, 
  RefreshCw, 
  BrainCircuit, 
  ArrowRight,
  Zap,
  Scale,
  Key,
  Check,
  Lock
} from 'lucide-react';
import type { BoardState } from '../../types/decision';
import { defaultGeminiService } from '../../services/gemini';
import type { AiAnalysisResult } from '../../services/gemini';

interface AiAnalystPanelProps {
  board: BoardState;
  isOpen: boolean;
  onClose: () => void;
  apiKey: string | null;
  onSaveApiKey?: (key: string) => void;
}

export const AiAnalystPanel: React.FC<AiAnalystPanelProps> = ({
  board,
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey
}) => {
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<{ question: string; answer: string }[]>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [inlineKey, setInlineKey] = useState(apiKey || defaultGeminiService.getApiKey() || '');
  const [showKeyCard, setShowKeyCard] = useState(!defaultGeminiService.hasApiKey());

  const activeKey = apiKey || defaultGeminiService.getApiKey();

  const fetchAnalysis = async () => {
    setIsLoading(true);
    if (activeKey) defaultGeminiService.setApiKey(activeKey);
    const result = await defaultGeminiService.analyzeBoard(board);
    setAnalysis(result);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalysis();
    }
  }, [isOpen, board.cards.length, activeKey]);

  const handleActivateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineKey.trim()) return;
    defaultGeminiService.setApiKey(inlineKey.trim());
    if (onSaveApiKey) onSaveApiKey(inlineKey.trim());
    setShowKeyCard(false);
    fetchAnalysis();
  };

  const handleAskQuestion = async (q: string) => {
    if (!q.trim()) return;
    setIsAnswering(true);
    if (activeKey) defaultGeminiService.setApiKey(activeKey);
    const answer = await defaultGeminiService.answerQuestion(board, q);
    setQaHistory((prev) => [{ question: q, answer }, ...prev]);
    setCustomQuestion('');
    setIsAnswering(false);
  };

  if (!isOpen) return null;

  return (
    <aside className="fixed top-16 right-0 w-full sm:w-[440px] h-[calc(100vh-64px)] z-40 bg-slate-900/95 border-l border-slate-700/80 shadow-2xl backdrop-blur-2xl flex flex-col text-left text-white animate-in slide-in-from-right duration-300">
      
      {/* Panel Top Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-black/40">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center shadow-md">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
              <span>Gemini Research Analyst</span>
              {activeKey ? (
                <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  🟢 Live API
                </span>
              ) : (
                <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  ⚡ Demo Mode
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">Contextual Visual Decision Intelligence</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowKeyCard(!showKeyCard)}
            className={`p-1.5 rounded-lg border transition-all ${
              showKeyCard
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
            }`}
            title="Configure Gemini API Key"
          >
            <Key className="w-4 h-4" />
          </button>

          <button
            onClick={fetchAnalysis}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="Refresh Analysis"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Panel Content Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        
        {/* Inline Gemini API Key Setup Banner */}
        {showKeyCard && (
          <div className="p-4 rounded-2xl bg-purple-950/70 border border-purple-600/60 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-purple-300">
                <Lock className="w-4 h-4 text-purple-400" />
                <span>Connect Live Google Gemini API</span>
              </div>
              <button
                onClick={() => setShowKeyCard(false)}
                className="text-purple-300 hover:text-white text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-purple-200 leading-relaxed font-medium">
              Enter your Google Gemini API key to unlock live AI synthesis, argument generation, and custom board Q&A.
            </p>

            <form onSubmit={handleActivateKey} className="flex items-center space-x-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={inlineKey}
                onChange={(e) => setInlineKey(e.target.value)}
                className="flex-1 rounded-xl bg-slate-900 border border-purple-500/50 px-3 py-2 text-xs font-mono text-white placeholder-slate-500"
              />
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center space-x-1 shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Activate</span>
              </button>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <Sparkles className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            <p className="text-xs font-medium">Gemini is analyzing board contributions & evidence...</p>
          </div>
        ) : analysis ? (
          <>
            {/* Executive Summary */}
            <div className="rounded-2xl p-4 border border-purple-500/40 bg-purple-950/40 shadow-sm">
              <div className="flex items-center space-x-2 text-xs font-bold text-purple-300 mb-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Executive Board Synthesis</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">{analysis.summary}</p>
            </div>

            {/* Argument Balance Visualizer */}
            <div className="rounded-2xl p-4 border border-slate-800 bg-slate-800/60 shadow-sm">
              <div className="flex items-center space-x-2 text-xs font-bold text-white mb-3">
                <BarChart2 className="w-4 h-4 text-sky-400" />
                <span>Argument Distribution & Net Stance</span>
              </div>

              <div className="space-y-3">
                {analysis.argumentBalance.map((item) => {
                  const total = item.supportCount + item.opposeCount || 1;
                  const supportPct = Math.round((item.supportCount / total) * 100);
                  return (
                    <div key={item.scenarioId} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-200 truncate">{item.scenarioTitle}</span>
                        <span className="text-[11px] text-slate-400">
                          {item.supportCount} Support / {item.opposeCount} Oppose
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${supportPct}%` }} />
                        <div className="bg-rose-500 h-full transition-all" style={{ width: `${100 - supportPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Disagreement Hotspots Alert */}
            {analysis.disagreementHotspots.length > 0 && (
              <div className="rounded-2xl p-4 border border-amber-500/40 bg-amber-950/40 shadow-sm">
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-300 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Disagreement Hotspots ({analysis.disagreementHotspots.length})</span>
                </div>

                <div className="space-y-2.5">
                  {analysis.disagreementHotspots.map((hs, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900/90 border border-slate-700 text-xs">
                      <span className="font-bold text-amber-300 text-[11px] block mb-0.5">{hs.scenarioTitle}: {hs.issue}</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{hs.conflict}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unbacked Assumptions Warning */}
            {analysis.unbackedAssumptions.length > 0 && (
              <div className="rounded-2xl p-4 border border-rose-500/40 bg-rose-950/40 shadow-sm">
                <div className="flex items-center space-x-2 text-xs font-bold text-rose-300 mb-2">
                  <Zap className="w-4 h-4 text-rose-400" />
                  <span>Unbacked Assumptions Needing Verification</span>
                </div>
                <div className="space-y-2">
                  {analysis.unbackedAssumptions.map((ass, i) => (
                    <div key={i} className="text-xs text-slate-300 p-2.5 rounded-xl bg-slate-900/90 border border-slate-700">
                      <span className="font-semibold text-rose-300">"{ass.cardTitle}"</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">by {ass.author}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Weigh-In Objective Analysis */}
            {analysis.recommendation && (
              <div className="rounded-2xl p-4 border border-sky-500/40 bg-sky-950/40 shadow-sm">
                <div className="flex items-center space-x-2 text-xs font-bold text-sky-300 mb-2">
                  <Scale className="w-4 h-4 text-sky-400" />
                  <span>AI Objective Weigh-In</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">{analysis.recommendation}</p>
              </div>
            )}

          </>
        ) : null}

        {/* Targeted Analyst Queries Section */}
        <div className="rounded-2xl p-4 border border-slate-800 bg-slate-800/60 space-y-3 shadow-sm">
          <div className="flex items-center space-x-2 text-xs font-bold text-white">
            <HelpCircle className="w-4 h-4 text-purple-400" />
            <span>Targeted Decision Questions</span>
          </div>

          {/* Quick Prompts */}
          <div className="flex flex-wrap gap-1.5">
            {[
              "What are the strongest arguments against Option B?",
              "What assumptions are we relying on?",
              "Where do member priorities conflict?"
            ].map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleAskQuestion(q)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-950 text-slate-300 border border-slate-700 hover:border-purple-500/60 text-left transition-all font-medium"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Question Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Ask analyst about board data..."
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion(customQuestion)}
              className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 font-medium"
            />
            <button
              onClick={() => handleAskQuestion(customQuestion)}
              disabled={isAnswering}
              className="bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center shrink-0 shadow-md"
            >
              {isAnswering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* QA Answers History */}
          {qaHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-700">
              {qaHistory.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-purple-500/40 text-xs">
                  <p className="font-semibold text-purple-300 mb-1">Q: {item.question}</p>
                  <p className="text-slate-200 leading-relaxed text-[11px] font-medium">A: {item.answer}</p>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </aside>
  );
};
