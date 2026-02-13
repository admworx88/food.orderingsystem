interface OceanViewIconProps {
  className?: string;
  strokeWidth?: number;
}

export function OceanViewIcon({ className, strokeWidth = 1.5 }: OceanViewIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Restaurant structure */}
      <path d="M12 3L6 7h12L12 3z" />
      <rect x="7" y="7" width="10" height="5" rx="0.5" />
      <line x1="10" y1="7" x2="10" y2="12" />
      <line x1="14" y1="7" x2="14" y2="12" />
      {/* Platform/stilts */}
      <line x1="8" y1="12" x2="8" y2="14.5" />
      <line x1="16" y1="12" x2="16" y2="14.5" />
      <line x1="12" y1="12" x2="12" y2="14.5" />
      {/* Waves */}
      <path d="M2 15.5c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" />
      <path d="M2 18.5c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" />
      <path d="M2 21.5c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" />
    </svg>
  );
}
