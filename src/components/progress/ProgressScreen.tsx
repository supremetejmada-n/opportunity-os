import React from 'react';
import { TrendingUp, Award, Eye, Bookmark, Play, Video, Users, DollarSign } from 'lucide-react';
import { ProgressMetrics } from '../../types/index.js';

interface ProgressScreenProps {
  metrics: ProgressMetrics;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({ metrics }) => {
  const metricCards = [
    { label: 'Opportunities Viewed', value: metrics.opportunities_viewed, icon: Eye },
    { label: 'Opportunities Saved', value: metrics.opportunities_saved, icon: Bookmark },
    { label: 'Opportunities Attempted', value: metrics.opportunities_attempted, icon: Play },
    { label: 'Demos Built', value: metrics.demos_created, icon: Video },
    { label: 'Prospects Contacted', value: metrics.prospects_contacted, icon: Users },
    { label: 'Revenue Earned', value: `₹${metrics.revenue_earned}`, icon: DollarSign },
  ];

  return (
    <div className="space-y-6 py-2 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">Outcome Tracking</span>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            Execution Progress & Learning System
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Tracks actual real-world outcomes, demos built, outreach activity, and system learning signals.
          </p>
        </div>
      </div>

      {/* Metric Counters (Actual Database Values, 0 in Standby) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {metricCards.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="panel-card p-3.5 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="truncate">{m.label}</span>
                <Icon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              </div>
              <p className="text-lg font-bold text-slate-100 font-mono">{m.value}</p>
            </div>
          );
        })}
      </div>

      {/* Intelligent Empty State Explanation */}
      <div className="panel-card p-6 text-center space-y-3 bg-slate-900/60 max-w-2xl mx-auto my-4">
        <Award className="h-8 w-8 text-indigo-400 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-100">Learning Engine Standby</h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-lg mx-auto">
            As you attempt opportunities, build demos, contact prospects, and log feedback, the system records real execution signals. In Phase 7, these signals dynamically tune recommendation weights to match your personal success patterns.
          </p>
        </div>
      </div>
    </div>
  );
};
