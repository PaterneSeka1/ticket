"use client";

export function PageSkeleton({ message = "Chargement…" }: { message?: string }) {
  return (
    <div className="vdm-landing flex min-h-screen items-center justify-center px-4">
      <div className="vdm-card w-full max-w-sm rounded-[32px] p-8 text-center space-y-4">
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-2 w-2 rounded-full bg-[#f4b90a] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-sm text-[var(--vdm-muted)]">{message}</p>
      </div>
    </div>
  );
}
