import React from 'react';
import { FileText, X, ExternalLink } from 'lucide-react';
import type { EvidenceItem } from '../../types/decision';

interface EvidenceModalProps {
  evidence: EvidenceItem | null;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  evidence,
  onClose
}) => {
  if (!evidence) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      {/* Translucent Dark Frosted Glass Container Card */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative text-left text-white">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-serif-luxury font-bold text-base text-white">{evidence.name}</h3>
              <p className="text-xs text-slate-400">Attached Evidence Document</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {evidence.summary && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Document Summary & Rationale
              </label>
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs leading-relaxed text-slate-200">
                {evidence.summary}
              </div>
            </div>
          )}

          {evidence.type === 'image' && evidence.url && (
            <div className="rounded-2xl overflow-hidden border border-slate-700 bg-black max-h-64 flex items-center justify-center">
              <img src={evidence.url} alt={evidence.name} className="max-h-64 object-contain" />
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-700/80 text-xs">
            <span className="text-slate-400 font-mono">Type: {evidence.type.toUpperCase()}</span>
            
            {evidence.url && (
              <a
                href={evidence.url}
                target="_blank"
                rel="noreferrer"
                className="bg-white hover:bg-slate-200 text-slate-900 px-4 py-2 rounded-xl font-bold flex items-center space-x-1"
              >
                <span>Open Document</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
