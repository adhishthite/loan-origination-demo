import type { DemoPersonaPreset } from "../../types/los";
import { formatINRLakh } from "../../utils/formatters";

interface PersonaSelectorProps {
  personas: DemoPersonaPreset[];
  activePersonaId: string;
  onSelectPersona: (id: string) => void;
}

const OUTCOME_HINT: Record<
  DemoPersonaPreset["badgeColor"],
  { label: string; dot: string }
> = {
  emerald: { label: "Clean approval", dot: "bg-approve" },
  amber: { label: "Needs review", dot: "bg-review" },
  rose: { label: "Declined", dot: "bg-decline" },
};

/**
 * Demo control: picks which preset applicant the borrower view loads.
 * Native radio inputs give arrow-key navigation and radiogroup semantics.
 */
export function PersonaSelector({
  personas,
  activePersonaId,
  onSelectPersona,
}: PersonaSelectorProps) {
  const list = Array.isArray(personas) ? personas : [];
  if (list.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <legend className="sr-only">Demo applicant</legend>
      <span aria-hidden="true" className="text-[13px] text-graphite">
        Demo applicant
      </span>
      <div className="inline-flex flex-wrap gap-1 rounded-md border border-rule bg-sheet p-1">
        {list.map((persona) => {
          const isSelected = persona.id === activePersonaId;
          const hint = OUTCOME_HINT[persona.badgeColor] ?? OUTCOME_HINT.amber;
          const amount = persona.loanRequest?.amount;
          return (
            <label
              key={persona.id}
              title={persona.summary || undefined}
              className={`flex cursor-pointer items-center gap-2 rounded-[5px] px-3 py-1.5 text-[13px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-agent ${
                isSelected
                  ? "bg-sunken text-ink"
                  : "text-graphite hover:bg-sunken hover:text-ink"
              }`}
            >
              <input
                type="radio"
                name="demo-applicant"
                value={persona.id}
                checked={isSelected}
                onChange={() => onSelectPersona(persona.id)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${hint.dot}`}
              />
              <span className="font-medium">{persona.name}</span>
              <span className="hidden text-faint md:inline">{hint.label}</span>
              {typeof amount === "number" && (
                <span className="num text-graphite">
                  {formatINRLakh(amount)}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
