'use client';

import { Check } from 'lucide-react';

const PLANS = [
  {
    name: 'Starter',
    price: '$49',
    period: '/mo',
    features: ['1,000 AI Conversations', 'Basic Analytics', 'Email Support'],
    isCurrent: false,
    actionLabel: 'Downgrade',
  },
  {
    name: 'Pro',
    price: '$199',
    period: '/mo',
    features: ['10,000 AI Conversations', '3,000 Voice Minutes', 'Advanced Analytics', 'Priority Support'],
    isCurrent: true,
    actionLabel: 'Active Plan',
  },
  {
    name: 'Business',
    price: '$499',
    period: '/mo',
    features: ['50,000 AI Conversations', 'Custom Voice Agent', 'Dedicated CSM'],
    isCurrent: false,
    actionLabel: 'Upgrade',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: ['Unlimited Volume', 'On-Prem Deployment', '24/7 Phone Support'],
    isCurrent: false,
    actionLabel: 'Contact Sales',
  },
];

export function PlanComparisonGrid() {
  return (
    <div className="mb-8 space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Available Plans</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl p-6 border flex flex-col justify-between backdrop-blur-md relative transition-all duration-300 ${
              plan.isCurrent ? 'scale-[1.02] shadow-2xl' : 'hover:scale-[1.01]'
            }`}
            style={{
              background: plan.isCurrent
                ? 'color-mix(in srgb, var(--primary) 10%, var(--surface-container))'
                : 'var(--glass-bg)',
              borderColor: plan.isCurrent ? 'var(--primary)' : 'var(--glass-border)',
              boxShadow: plan.isCurrent ? '0 0 20px color-mix(in srgb, var(--primary) 20%, transparent)' : 'none',
            }}
          >
            {plan.isCurrent && (
              <span
                className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-bl-xl rounded-tr-2xl text-white"
                style={{ background: 'var(--primary)' }}
              >
                Current Plan
              </span>
            )}

            <div>
              <h3 className="text-base font-bold mb-1" style={{ color: plan.isCurrent ? 'var(--primary)' : 'var(--foreground)' }}>
                {plan.name}
              </h3>
              <div className="text-2xl font-bold font-mono text-foreground mb-4">
                {plan.price}
                <span className="text-xs font-normal text-muted-foreground">{plan.period}</span>
              </div>

              <ul className="space-y-2.5 mb-6 text-xs text-muted-foreground">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                    <span className={plan.isCurrent ? 'text-foreground font-medium' : ''}>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              disabled={plan.isCurrent}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all ${
                plan.isCurrent
                  ? 'bg-[var(--surface-high)] text-muted-foreground cursor-default border'
                  : 'bg-[var(--primary)] text-white hover:opacity-90 shadow-md'
              }`}
              style={{
                borderColor: plan.isCurrent ? 'var(--glass-border)' : 'transparent',
              }}
            >
              {plan.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
