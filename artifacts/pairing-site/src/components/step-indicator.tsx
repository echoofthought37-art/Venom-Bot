interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 mb-12">
      {Array.from({ length: totalSteps }).map((_, idx) => (
        <div
          key={idx}
          className={`h-1 rounded-full transition-all duration-500 ${
            idx + 1 === currentStep
              ? 'w-12 bg-primary'
              : idx + 1 < currentStep
              ? 'w-8 bg-primary/50'
              : 'w-6 bg-border'
          }`}
          data-testid={`step-indicator-${idx + 1}`}
        />
      ))}
    </div>
  );
}
