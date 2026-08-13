import React, { useState } from 'react';
import { Crown, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface VipAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VipAccessModal: React.FC<VipAccessModalProps> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [org, setOrg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-6 sm:p-8 border border-amber-500/40 shadow-2xl relative text-left">
        
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl text-white">VERITAS VIP Membership</h3>
              <p className="text-xs text-amber-300">Exclusive Luxury Access & Dedicated AI Orchestration</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-amber-400 mx-auto animate-bounce" />
            <h4 className="font-bold text-xl text-white">VIP Application Received</h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
              Our executive concierge team will review your request for VIP Liquid Workspace access and reach out to {email} within 2 hours.
            </p>
            <button
              onClick={onClose}
              className="liquid-btn-primary px-6 py-2.5 rounded-xl text-xs font-bold"
            >
              Return to Workspace
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-white">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>VIP Membership Privileges</span>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300">
                <li>• Unlimited spatial canvas boards with 4K liquid glass exports</li>
                <li>• Enterprise Gemini 2.5 Flash & Pro custom fine-tuned analyst</li>
                <li>• End-to-end zero-knowledge encryption & audit logs</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Aaryan Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl glass-input px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Work / Preferred Email</label>
              <input
                type="email"
                required
                placeholder="aaryan@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl glass-input px-3 py-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Organization / Band Name</label>
              <input
                type="text"
                placeholder="The Velvet Resonance"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                className="w-full rounded-xl glass-input px-3 py-2 text-xs"
              />
            </div>

            <div className="pt-4 flex justify-end space-x-2 border-t border-white/10">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white">
                Cancel
              </button>
              <button type="submit" className="liquid-btn-primary px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950">
                Request Priority Access
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
