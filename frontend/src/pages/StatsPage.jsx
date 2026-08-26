import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { BarChart3, CheckCircle2, ListTodo, AlarmClock, Flame, FileText, PenLine } from "lucide-react";
import { api } from "../api.js";
import { BarChart, DonutChart, Legend } from "../components/charts.jsx";
import ProgressRing from "../components/ProgressRing.jsx";

const PRIORITY_COLORS = {
  1: "var(--priority-1)",
  2: "var(--priority-2)",
  3: "var(--priority-3)",
  4: "var(--priority-4)",
  5: "var(--priority-5)",
};

const DAY = 86400000;

function dayKey(d) {
  return format(d, "yyyy-MM-dd");
}

export default function StatsPage() {
  const [todos, setTodos] = useState([]);
  const [notesCount, setNotesCount] = useState(0);
  const [drawingsCount, setDrawingsCount] = useState(0);

  useEffect(() => {
    api.listTodos().then(setTodos).catch(console.error);
    api.listNotes().then((n) => setNotesCount(n.length)).catch(console.error);
    api.listDrawings().then((d) => setDrawingsCount(d.length)).catch(console.error);
  }, []);

  const done = todos.filter((t) => t.done);
  const open = todos.filter((t) => !t.done);
  const todayStr = dayKey(new Date());
  const overdue = open.filter((t) => t.due_date && t.due_date < todayStr);
  const rate = todos.length ? done.length / todos.length : 0;

  // Completions & creations for the last 14 days
  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date(Date.now() - (13 - i) * DAY);
        return { key: dayKey(d), label: format(d, "d"), full: format(d, "EEE d MMM") };
      }),
    []
  );

  const completedByDay = days.map((d) => ({
    label: d.label,
    title: d.full,
    value: done.filter((t) => {
      if (!t.completed_at) return false;
      // Server stores naive UTC; parse then format locally so evenings
      // land on the day the user actually experienced.
      return dayKey(new Date(t.completed_at)) === d.key;
    }).length,
  }));

  const createdByDay = days.map((d) => ({
    label: d.label,
    title: d.full,
    value: todos.filter((t) => {
      if (!t.created_at) return false;
      return dayKey(new Date(t.created_at)) === d.key;
    }).length,
  }));

  const prioritySegments = [5, 4, 3, 2, 1].map((p) => ({
    label: `P${p}`,
    value: todos.filter((t) => t.priority === p).length,
    color: PRIORITY_COLORS[p],
  }));

  const weekdayData = useMemo(() => {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = new Array(7).fill(0);
    for (const t of done) {
      if (!t.completed_at) continue;
      counts[new Date(t.completed_at).getDay()]++;
    }
    return counts.map((v, i) => ({ label: names[i], value: v }));
  }, [done]);

  return (
    <div>
      <div className="page-header">Insights</div>
      <div className="page-title-row">
        <div>
          <h1 className="page-title">Stats</h1>
          <p className="page-sub">
            How your work actually flows. Completion history starts accumulating now.
          </p>
        </div>
        <ProgressRing value={Math.round(rate * 100)} max={100} size={64} label="Completion rate" />
      </div>

      <div className="stats-row five">
        <div className="stat-chip accent">
          <span className="stat-icon"><CheckCircle2 size={20} /></span>
          <div>
            <span className="label">Done</span>
            <span className="value">{done.length}</span>
          </div>
        </div>
        <div className="stat-chip warn">
          <span className="stat-icon"><ListTodo size={20} /></span>
          <div>
            <span className="label">Open</span>
            <span className="value">{open.length}</span>
          </div>
        </div>
        <div className="stat-chip danger">
          <span className="stat-icon"><AlarmClock size={20} /></span>
          <div>
            <span className="label">Overdue</span>
            <span className="value">{overdue.length}</span>
          </div>
        </div>
        <div className="stat-chip">
          <span className="stat-icon"><FileText size={20} /></span>
          <div>
            <span className="label">Notes</span>
            <span className="value">{notesCount}</span>
          </div>
        </div>
        <div className="stat-chip">
          <span className="stat-icon"><PenLine size={20} /></span>
          <div>
            <span className="label">Drawings</span>
            <span className="value">{drawingsCount}</span>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <section className="dash-card span-6">
          <div className="dash-card-head">
            <span className="dash-card-title">
              <CheckCircle2 size={14} />
              Completed — last 14 days
            </span>
          </div>
          <BarChart data={completedByDay} height={170} />
        </section>

        <section className="dash-card span-6">
          <div className="dash-card-head">
            <span className="dash-card-title">
              <ListTodo size={14} />
              Created — last 14 days
            </span>
          </div>
          <BarChart data={createdByDay} height={170} accent="var(--priority-2)" />
        </section>

        <section className="dash-card span-6 donut-card">
          <div className="dash-card-head">
            <span className="dash-card-title">
              <BarChart3 size={14} />
              Priority mix
            </span>
          </div>
          <DonutChart
            segments={prioritySegments}
            centerLabel={todos.length}
            centerSub="tasks"
          />
          <Legend items={prioritySegments} />
        </section>

        <section className="dash-card span-6">
          <div className="dash-card-head">
            <span className="dash-card-title">
              <Flame size={14} />
              Which days you finish things
            </span>
          </div>
          <BarChart data={weekdayData} height={170} accent="var(--warn)" />
        </section>
      </div>
    </div>
  );
}
