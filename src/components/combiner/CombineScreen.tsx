import React, { useState } from 'react';
import { Layers, Wrench, CheckCircle2, Zap, Info } from 'lucide-react';
import { UserTool } from '../../types/index.js';

interface CombineScreenProps {
  tools: UserTool[];
}

export const CombineScreen: React.FC<CombineScreenProps> = ({ tools }) => {
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(
    tools.slice(0, 4).map(t => t.id)
  );

  const toggleTool = (id: string) => {
    setSelectedToolIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectedTools = tools.filter(t => selectedToolIds.includes(t.id));

  return (
    <div className="space-y-6 py-2 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">Multi-Tool Studio</span>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-400" />
            Tool Combiner Studio
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            What can I build or sell by combining the free tools I already have access to?
          </p>
        </div>
      </div>

      {/* Selectable Tool List */}
      <div className="panel-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Wrench className="h-4 w-4 text-indigo-400" />
            Select Available Tools ({selectedToolIds.length} / {tools.length} Selected)
          </h2>
          <span className="badge-tag badge-emerald">₹0 Upfront Cost Recipe</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {tools.map((t) => {
            const isSelected = selectedToolIds.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggleTool(t.id)}
                className={`p-3.5 rounded-lg border text-left flex items-start justify-between transition-all ${
                  isSelected
                    ? 'bg-indigo-600/15 border-indigo-500 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1 pr-2">
                  <h3 className="font-bold text-xs leading-snug">{t.name}</h3>
                  <span className="text-[10px] text-slate-500 block font-mono">{t.category} • {t.access_type}</span>
                </div>
                <div className={`h-4 w-4 rounded flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-700'
                }`}>
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Standby Explanation */}
      <div className="panel-card p-6 space-y-3 bg-slate-900/60 text-center max-w-2xl mx-auto">
        <Zap className="h-6 w-6 text-indigo-400 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-100">Combiner Engine Standby</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-lg mx-auto">
            You have <strong className="text-slate-200 font-mono">{selectedTools.length} tools</strong> selected. In Phase 5, the Combiner AI will evaluate multi-tool combinations for feasibility, market demand, customer problem, and execution steps.
          </p>
        </div>
      </div>
    </div>
  );
};
