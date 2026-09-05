export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="2.3" fill="#FF4E1A" />
      <path
        d="M10.2 16a5.8 5.8 0 1 1 11.6 0"
        fill="none"
        stroke="#E0A36A"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M6.5 16a9.5 9.5 0 1 1 19 0"
        fill="none"
        stroke="#E0A36A"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.65"
      />
      <path
        d="M3.4 16a12.6 12.6 0 1 1 25.2 0"
        fill="none"
        stroke="#E0A36A"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.3"
      />
    </svg>
  );
}
