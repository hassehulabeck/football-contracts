interface StatTileProps {
  label: string;
  value: string;
  /** Dims the figure — for a count of zero, which is not news. */
  muted?: boolean;
}

/**
 * One headline figure in a row of them. Extracted from the dashboard's private
 * StatCard so the contracts summary reads as the same component, not a copy
 * that drifts.
 */
export function StatTile({ label, value, muted }: StatTileProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
      <p className="text-white/50 text-xs sm:text-sm uppercase tracking-wide mb-1">{label}</p>
      <p
        className={`tabular text-2xl sm:text-3xl font-black ${
          muted ? 'text-white/25' : 'text-brand-400'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
