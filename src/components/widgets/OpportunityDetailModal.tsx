import React from 'react';
import { PracticalGuideWorkspace } from '../guide/PracticalGuideWorkspace.js';

export interface OpportunityDetailModalProps {
  card?: any;
  planId?: string;
  anchorEl?: HTMLElement | null;
  onClose: () => void;
  onStartPlan?: (id: string) => void;
  backLabel?: string;
}

/**
 * OpportunityDetailModal (Backward-compatibility wrapper)
 * Replaces the old floating modal with the dedicated full-screen practical guidance workspace.
 */
export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  card,
  planId,
  onClose,
  onStartPlan,
  backLabel,
}) => {
  const returnLabel = backLabel ? backLabel.replace(/^←?\s*Back to\s*/i, '') : 'Ways to Earn';

  return (
    <div className="fixed inset-0 z-50 bg-[#070a0f] text-slate-100 overflow-y-auto min-h-screen">
      <PracticalGuideWorkspace
        planId={planId}
        card={card}
        returnTabLabel={returnLabel}
        onBack={onClose}
        onPlanUpdated={() => {
          if (planId && onStartPlan) onStartPlan(planId);
        }}
      />
    </div>
  );
};
