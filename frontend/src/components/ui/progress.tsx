import React from 'react';

interface ProgressProps {
  value: number; // 0-100
  className?: string;
  indicatorClassName?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  className = '',
  indicatorClassName = '',
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={`relative h-2 w-full overflow-hidden rounded-full bg-gray-200 ${className}`}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full transition-all duration-300 ease-linear ${indicatorClassName}`}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
};
