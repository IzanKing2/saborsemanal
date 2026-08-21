export function SharedWithGroupBadge({ memberCount }: { memberCount: number }) {
  if (memberCount <= 1) return null;
  return (
    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-300/20 px-3 py-1 text-xs font-bold text-amber-200">
      <svg
        aria-hidden="true"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path
          d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 20v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Compartido con tu grupo ({memberCount})
    </span>
  );
}
