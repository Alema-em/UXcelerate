export function Mark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="2.2" fill="#E4A574" />
      <path
        d="M10.5 16a5.5 5.5 0 1 1 11 0"
        fill="none"
        stroke="#7EBFB8"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M7 16a9 9 0 1 1 18 0"
        fill="none"
        stroke="#7EBFB8"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M3.8 16a12.2 12.2 0 1 1 24.4 0"
        fill="none"
        stroke="#7EBFB8"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}
