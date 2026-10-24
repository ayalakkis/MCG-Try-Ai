import { CheckIcon } from "./icons";
import SectionLabel from "./SectionLabel";
import s from "./BriefChecklist.module.css";

export type BriefRowStatus = "done" | "current" | "pending";

export interface BriefRow {
  key: string;
  label: string;
  value?: string;
  status: BriefRowStatus;
}

interface BriefChecklistProps {
  title: string;
  rows: BriefRow[];
  /** Text for the current row's value ("Now"). */
  nowLabel: string;
}

/** Brief rows (one per BRIEF_FIELDS entry): done = dark check, current = spinner + "Now", pending = dashed circle. */
export default function BriefChecklist({ title, rows, nowLabel }: BriefChecklistProps) {
  const filled = rows.filter((r) => r.status === "done").length;
  return (
    <>
      <div className={s.head}>
        <SectionLabel>{title}</SectionLabel>
        <span className={s.count}>
          {filled} / {rows.length}
        </span>
      </div>
      <div className={s.box}>
        {rows.map((r) => (
          <div key={r.key} className={[s.row, r.status === "current" ? s.current : "", r.status === "pending" ? s.pending : ""].join(" ")}>
            {r.status === "done" && (
              <span className={s.ok}>
                <CheckIcon />
              </span>
            )}
            {r.status === "current" && <span className={`spin ${s.spinner}`} />}
            {r.status === "pending" && <span className={s.empty} />}
            {r.label}
            <span className={s.value}>{r.status === "done" ? r.value : r.status === "current" ? nowLabel : ""}</span>
          </div>
        ))}
      </div>
    </>
  );
}
