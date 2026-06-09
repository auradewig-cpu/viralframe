interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}

export function StepIndicator({ currentStep, totalSteps, labels }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0 w-full mb-8">
      {labels.map((label, i) => {
        const step = i + 1;
        const active = step === currentStep;
        const done = step < currentStep;
        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{
                  background: done ? 'var(--vf-accent-success)' : active ? 'var(--vf-accent-primary)' : 'var(--vf-bg-elevated)',
                  color: done || active ? 'white' : 'var(--vf-text-muted)',
                  border: active ? '2px solid var(--vf-accent-primary)' : 'none',
                }}
              >
                {done ? '✓' : step}
              </div>
              <span className="text-xs mt-1 hidden sm:block" style={{ color: active ? 'var(--vf-accent-primary)' : 'var(--vf-text-muted)' }}>
                {label}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div className="flex-1 h-0.5 mx-2" style={{ background: done ? 'var(--vf-accent-success)' : 'var(--vf-border)' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
