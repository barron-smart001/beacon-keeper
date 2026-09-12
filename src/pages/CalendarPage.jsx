import { ChevronLeft, ChevronRight, ClipboardList, CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
import AppShell from "../components/app/AppShell";

function monthGrid(month) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from({ length: Math.ceil((offset + total) / 7) * 7 }, (_, index) => index - offset + 1);
}

function CalendarPage() {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(null);
  const days = useMemo(() => monthGrid(month), [month]);
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(month);
  const selectedLabel = selectedDate && new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(selectedDate);
  function previousMonth() { setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)); setSelectedDate(null); }
  function nextMonth() { setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)); setSelectedDate(null); }
  function selectDay(day) { if (day < 1) return; setSelectedDate(new Date(month.getFullYear(), month.getMonth(), day)); }
  function isToday(day) { return day === today.getDate() && month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear(); }
  function isSelected(day) { return selectedDate && day === selectedDate.getDate() && month.getMonth() === selectedDate.getMonth() && month.getFullYear() === selectedDate.getFullYear(); }

  return <AppShell><main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-10"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Trader activity calendar</p><h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">Calendar</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Review your trading records by day. This is your private activity calendar, not an economic calendar.</p></div><section className="mt-9 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"><div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-4 sm:px-6"><button type="button" onClick={previousMonth} className="grid size-10 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]" aria-label="Previous month"><ChevronLeft size={18} /></button><div className="text-center"><h2 className="text-base font-medium">{monthLabel}</h2><p className="mt-1 text-xs text-[var(--text-muted)]">Select a date to inspect its records.</p></div><button type="button" onClick={nextMonth} className="grid size-10 place-items-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)]" aria-label="Next month"><ChevronRight size={18} /></button></div><div className="grid grid-cols-7 gap-px bg-[var(--border-soft)]">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="bg-[var(--surface)] px-2 py-3 text-center text-xs text-[var(--text-muted)]">{day}</div>)}{days.map((day, index) => day < 1 ? <div key={`blank-${index}`} className="min-h-20 bg-[var(--bg)] sm:min-h-28" /> : <button key={day} type="button" onClick={() => selectDay(day)} className={`min-h-20 bg-[var(--bg)] p-2 text-left transition hover:bg-[var(--surface-elevated)] sm:min-h-28 ${isSelected(day) ? "bg-[rgba(201,168,118,0.09)]" : ""}`}><span className={`grid size-6 place-items-center rounded-full font-mono text-xs ${isToday(day) ? "bg-[var(--accent)] text-[#17130d]" : "text-[var(--text-muted)]"}`}>{day}</span></button>)}</div></section><section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"><div className="flex items-start gap-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]"><ClipboardList size={19} /></div><div><h2 className="text-base font-medium">{selectedLabel || "Select a day"}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{selectedDate ? "No activity has been recorded for this date yet. Trade and money records will appear here once the data connection is applied." : "Choose a date from the calendar to review the records created on that day."}</p></div></div><div className="mt-6 border-t border-[var(--border-soft)] pt-5 text-xs text-[var(--text-muted)]"><CalendarDays className="mr-2 inline text-[var(--accent)]" size={15} />Dates with activity will be highlighted as your journal grows.</div></section></main></AppShell>;
}

export default CalendarPage;
