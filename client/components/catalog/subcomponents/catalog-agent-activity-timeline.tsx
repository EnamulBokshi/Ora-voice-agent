'use client';

import { ProductActivity } from '../catalog-types';

interface CatalogAgentActivityTimelineProps {
  activity: ProductActivity[];
}

export function CatalogAgentActivityTimeline({ activity }: CatalogAgentActivityTimelineProps) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">
        Recent Agent Activity
      </h4>
      <div className="space-y-3 border-l-2 ml-2 pl-3" style={{ borderColor: 'var(--border)' }}>
        {activity.map((act, idx) => (
          <div key={idx} className="relative">
            <div
              className="absolute -left-[17px] top-1 w-2 h-2 rounded-full"
              style={{
                backgroundColor: act.type === 'primary' ? 'var(--primary)' : 'var(--secondary)',
              }}
            />
            <p className="text-xs text-foreground font-medium">{act.action}</p>
            <p className="text-[10px] text-muted-foreground">{act.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
