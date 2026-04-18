// ─── Base Skeleton ────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-surface-container-highest rounded ${className ?? ''}`} />
  );
}

// ─── SessionLogSkeleton ───────────────────────────────────
export function SessionLogSkeleton() {
  return (
    <div className="card-elevated rounded-xl p-4 space-y-4">
      {/* Header row: name + date */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-32" />
      </div>

      {/* 3 exercise rows */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-10 w-16 rounded-lg" />
            ))}
          </div>
        </div>
      ))}

      {/* Save button placeholder */}
      <Skeleton className="h-10 w-full rounded-full mt-2" />
    </div>
  );
}

// ─── ProgramSkeleton ──────────────────────────────────────
export function ProgramSkeleton() {
  return (
    <div className="space-y-4">
      {/* Program header */}
      <div className="card-elevated rounded-xl p-4 space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      {/* 2 exercise cards */}
      {[0, 1].map((i) => (
        <div key={i} className="card-elevated rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex gap-2 pt-1">
            {[0, 1, 2].map((j) => (
              <Skeleton key={j} className="h-8 flex-1 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ProgressTableSkeleton ────────────────────────────────
export function ProgressTableSkeleton() {
  return (
    <div className="card-elevated rounded-xl p-4 space-y-3">
      {/* Table header */}
      <div className="flex gap-4 pb-2 border-b border-outline-variant/20">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20 ml-auto" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* 5 rows */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 py-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16 ml-auto" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

// ─── ExercisesGridSkeleton ────────────────────────────────
export function ExercisesGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="card-elevated rounded-xl p-4 space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-1.5 pt-1">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DashboardSkeleton ────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Welcome widget */}
      <div className="card-elevated rounded-xl p-6 space-y-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>

      {/* 2 action cards */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="card-elevated rounded-xl p-4 space-y-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
