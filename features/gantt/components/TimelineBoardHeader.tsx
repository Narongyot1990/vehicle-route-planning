import { HOUR_WIDTH, HOURS, type DayColumn } from "@/lib/gantt";

type TimelineBoardHeaderProps = {
  days: DayColumn[];
  displayTotalHours: number;
  windowStartHour: number;
  hourWidth: number;
};

export function TimelineBoardHeader({
  days,
  displayTotalHours,
  windowStartHour,
  hourWidth
}: TimelineBoardHeaderProps) {
  return (
    <>
      <div className="corner-cell primary" aria-label="Vehicle column">
        <span className="corner-cell-label desktop-only">Vehicle</span>
        <span className="corner-cell-label mobile-only">Car</span>
      </div>
      <div className="days-row">
        {days.map((day) => (
          <div key={day.key} className="day-cell" style={{ width: HOURS.length * hourWidth }}>
            <span>{day.label}</span>
            <span>{day.weekday}</span>
          </div>
        ))}
      </div>

      <div className="corner-cell secondary" aria-label="Hour column">
        <span className="corner-cell-label desktop-only">Hour</span>
        <span className="corner-cell-label mobile-only">Hr</span>
      </div>
      <div className="hours-row">
        {Array.from({ length: displayTotalHours }, (_, hourIndex) => {
          const absoluteHour = windowStartHour + hourIndex;
          const hour = ((absoluteHour % 24) + 24) % 24;

          return (
            <div
              key={`hour-${hourIndex}`}
              className={`hour-cell${hour === 0 ? " day-start" : ""}`}
              style={{ width: hourWidth }}
            >
              {hour.toString().padStart(2, "0")}
            </div>
          );
        })}
      </div>
    </>
  );
}
