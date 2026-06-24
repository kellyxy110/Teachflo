"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, X, ChevronRight, CheckCircle } from "lucide-react";

const DISMISS_KEY = "tf_profile_card_dismissed";

type Props = {
  firstName: string;
  qualification: string | null;
  trcnNumber: string | null;
  trcnStatus: string | null;
  yearsOfExp: number | null;
  bio: string | null;
  subjects: string[];
  photoUrl: string | null;
  phone: string | null;
};

function computeRating(p: Props): number {
  let pts = 0;
  const qualPts: Record<string, number> = {
    NCE: 1, "B.Ed": 2, "B.Sc+PGDE": 2, "M.Ed": 3, "M.Sc": 3, "Ph.D": 4,
  };
  if (p.qualification) pts += qualPts[p.qualification] ?? 0;
  if (p.trcnStatus === "REGISTERED") pts += 1;
  const exp = p.yearsOfExp ?? 0;
  if (exp >= 10) pts += 1;
  else if (exp >= 3) pts += 0.5;
  if (p.bio && p.bio.length > 20) pts += 0.5;
  if (p.subjects.length >= 2) pts += 0.5;
  return Math.min(5, Math.round((pts / 7) * 5 * 2) / 2);
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = rating >= i + 1;
        const half = !filled && rating >= i + 0.5;
        return (
          <span key={i} className="relative inline-block w-4 h-4">
            <Star size={16} className="text-border absolute inset-0" />
            {(filled || half) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: half ? "50%" : "100%" }}>
                <Star size={16} className="text-amber-400" fill="currentColor" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

type CheckItem = { label: string; done: boolean };

export function ProfileCompletionCard(props: Props) {
  const [dismissed, setDismissed] = useState(true);
  const rating = computeRating(props);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === "1";
    if (!wasDismissed && rating < 3) setDismissed(false);
  }, [rating]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  const checks: CheckItem[] = [
    { label: "Profile photo", done: !!props.photoUrl },
    { label: "Phone number", done: !!props.phone },
    { label: "Highest qualification", done: !!props.qualification },
    { label: "TRCN registration number", done: !!props.trcnNumber },
    { label: "Subjects taught (2+)", done: props.subjects.length >= 2 },
    { label: "Professional bio", done: !!(props.bio && props.bio.length > 20) },
  ];

  const doneCount = checks.filter((c) => c.done).length;
  const pct = Math.round((doneCount / checks.length) * 100);

  return (
    <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/25 rounded-2xl p-5 relative">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-muted hover:text-text hover:bg-border/30 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-600 font-bold text-lg shrink-0">
          {props.firstName[0]}
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-text">Complete your teacher profile</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
              {doneCount}/{checks.length} done
            </span>
          </div>
          <p className="text-xs text-text-2 mt-0.5 mb-3">
            A complete profile boosts your credential star rating and builds trust with your school administration.
          </p>

          <div className="h-1.5 bg-border rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4">
            {checks.map(({ label, done }) => (
              <div
                key={label}
                className={`flex items-center gap-1.5 text-xs ${done ? "text-muted" : "text-text-2"}`}
              >
                <CheckCircle
                  size={12}
                  className={done ? "text-success shrink-0" : "text-border shrink-0"}
                  fill={done ? "currentColor" : "none"}
                />
                <span className={done ? "line-through" : ""}>{label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <StarRow rating={rating} />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                {rating.toFixed(1)}/5.0
              </span>
            </div>
            <Link
              href="/settings"
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors ml-auto"
            >
              Complete Profile
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
