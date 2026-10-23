/**
 * Policy Ruler: the FOIR scale (0–80%) with the three credit-policy zones.
 * Requested FOIR is a solid ink marker; an optional counter-offer marker is
 * joined to it by an arrow so the restructuring reads at a glance.
 */

const SCALE_MAX = 80;
const APPROVE_MAX = 45;
const REVIEW_MAX = 55;

type Tone = "approve" | "review" | "decline";

export function foirTone(foir: number): Tone {
  if (foir <= APPROVE_MAX) return "approve";
  if (foir <= REVIEW_MAX) return "review";
  return "decline";
}

const TONE_TEXT: Record<Tone, string> = {
  approve: "text-approve",
  review: "text-review",
  decline: "text-decline",
};
const TONE_BG: Record<Tone, string> = {
  approve: "bg-approve",
  review: "bg-review",
  decline: "bg-decline",
};
const TONE_WORD: Record<Tone, string> = {
  approve: "within the auto-approve zone",
  review: "in the review band",
  decline: "above the 55% cap",
};

function toPct(foir: number): number {
  if (!Number.isFinite(foir)) return 0;
  return (Math.min(Math.max(foir, 0), SCALE_MAX) / SCALE_MAX) * 100;
}

/** Keep marker labels inside the ruler near the edges. */
function labelAlign(pct: number): string {
  if (pct < 12) return "translate-x-0";
  if (pct > 88) return "-translate-x-full";
  return "-translate-x-1/2";
}

interface PolicyRulerProps {
  requestedFoir: number;
  counterFoir?: number;
  compact?: boolean;
}

export function PolicyRuler({
  requestedFoir,
  counterFoir,
  compact = false,
}: PolicyRulerProps) {
  const reqPct = toPct(requestedFoir);
  const hasCounter =
    typeof counterFoir === "number" &&
    Number.isFinite(counterFoir) &&
    Math.abs(counterFoir - requestedFoir) >= 0.05;
  const ctrPct = hasCounter ? toPct(counterFoir as number) : reqPct;
  const ctrTone = hasCounter ? foirTone(counterFoir as number) : "approve";

  const summary = `FOIR policy scale from 0 to 80 percent. Auto-approve up to 45%, review 45 to 55%, decline above 55%. Requested FOIR ${requestedFoir.toFixed(1)}%, ${TONE_WORD[foirTone(requestedFoir)]}.${
    hasCounter
      ? ` Counter-offer FOIR ${(counterFoir as number).toFixed(1)}%, ${TONE_WORD[ctrTone]}.`
      : ""
  }`;

  const barH = compact ? "h-5" : "h-11";
  const left = Math.min(reqPct, ctrPct);
  const width = Math.abs(reqPct - ctrPct);
  const pointsLeft = ctrPct < reqPct;

  return (
    <div role="img" aria-label={summary} className="w-full select-none">
      {/* Requested label */}
      <div className={`relative ${compact ? "h-5" : "h-6"}`}>
        <span
          className={`absolute bottom-1 whitespace-nowrap text-[12px] font-semibold text-ink ${labelAlign(reqPct)}`}
          style={{ left: `${reqPct}%` }}
        >
          Requested <span className="num">{requestedFoir.toFixed(1)}%</span>
        </span>
      </div>

      {/* Zones */}
      <div
        className={`relative ${barH} overflow-visible rounded-md border border-rule`}
      >
        <div className="absolute inset-0 flex overflow-hidden rounded-md">
          <div
            className={`flex bg-approve-tint pl-2 ${compact ? "items-center" : "items-start pt-1"}`}
            style={{ width: `${(APPROVE_MAX / SCALE_MAX) * 100}%` }}
          >
            {!compact && (
              <span className="text-[12px] font-medium text-approve">
                Auto-approve
              </span>
            )}
          </div>
          <div
            className={`flex justify-center border-x border-sheet bg-review-tint ${compact ? "items-center" : "items-start pt-1"}`}
            style={{
              width: `${((REVIEW_MAX - APPROVE_MAX) / SCALE_MAX) * 100}%`,
            }}
          >
            {!compact && (
              <span className="hidden text-[12px] font-medium text-review sm:inline">
                Review
              </span>
            )}
          </div>
          <div
            className={`flex flex-1 justify-end bg-decline-tint pr-2 ${compact ? "items-center" : "items-start pt-1"}`}
          >
            {!compact && (
              <span className="text-[12px] font-medium text-decline">
                Decline
              </span>
            )}
          </div>
        </div>

        {/* Connector arrow between requested and counter */}
        {hasCounter && width > 0.5 && (
          <div
            className={`absolute h-0 border-t-2 border-dashed border-ink/70 ${compact ? "top-1/2 -translate-y-1/2" : "bottom-[9px]"}`}
            style={{ left: `${left}%`, width: `${width}%` }}
          >
            <span
              className={`absolute -top-[5px] h-0 w-0 border-y-[4px] border-y-transparent ${
                pointsLeft
                  ? "left-0 border-r-[6px] border-r-ink/70"
                  : "right-0 border-l-[6px] border-l-ink/70"
              }`}
            />
          </div>
        )}

        {/* Requested marker */}
        <span
          className="absolute -top-1 -bottom-1 w-[3px] -translate-x-1/2 rounded-full bg-ink"
          style={{ left: `${reqPct}%` }}
        />

        {/* Counter marker */}
        {hasCounter && (
          <span
            className={`absolute -top-1 -bottom-1 w-[3px] -translate-x-1/2 rounded-full ${TONE_BG[ctrTone]}`}
            style={{ left: `${ctrPct}%` }}
          />
        )}
      </div>

      {/* Ticks */}
      <div className="relative mt-1 h-4 text-[11px] text-faint">
        {[0, APPROVE_MAX, REVIEW_MAX, SCALE_MAX].map((t) => {
          const p = toPct(t);
          return (
            <span
              key={t}
              className={`num absolute ${p === 0 ? "" : p === 100 ? "-translate-x-full" : "-translate-x-1/2"}`}
              style={{ left: `${p}%` }}
            >
              {t}%
            </span>
          );
        })}
      </div>

      {/* Counter label */}
      {hasCounter && (
        <div className="relative h-5">
          <span
            className={`absolute top-0.5 whitespace-nowrap text-[12px] font-semibold ${TONE_TEXT[ctrTone]} ${labelAlign(ctrPct)}`}
            style={{ left: `${ctrPct}%` }}
          >
            Counter-offer{" "}
            <span className="num">{(counterFoir as number).toFixed(1)}%</span>
          </span>
        </div>
      )}
    </div>
  );
}
