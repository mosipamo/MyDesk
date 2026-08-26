import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  PenLine,
  ListTodo,
  FileText,
  CalendarDays,
  Search,
  LayoutDashboard,
  BarChart3,
  Timer as TimerIcon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Logo from "./Logo.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import Clock from "./Clock.jsx";
import { fmt, useTimer } from "../lib/timerStore.js";

const KEY = "mydesk-sidebar";

const links = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/todos", label: "Todos", icon: ListTodo },
  { to: "/notes", label: "Notes", icon: FileText },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/canvas", label: "Canvas", icon: PenLine },
  { to: "/focus", label: "Focus", icon: TimerIcon },
];

function MiniTimer() {
  const t = useTimer();
  const navigate = useNavigate();
  if (!t.running) return null;
  return (
    <button type="button" className="mini-timer" onClick={() => navigate("/focus")} title="Focus timer running — open">
      <span className="mt-dot" />
      <span className="footer-label">{fmt(t.remaining)}</span>
    </button>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const listRef = useRef(null);
  const [indicator, setIndicator] = useState(null);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(KEY) === "1");

  useEffect(() => {
    localStorage.setItem(KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    function onKey(e) {
      // Capture phase so browser-level Ctrl+B (Edge etc.) never fires.
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        e.stopPropagation();
        setCollapsed((c) => !c);
      } else if (e.key === "\\" && !mod && !e.altKey) {
        const typing = e.target?.closest?.(
          "input, textarea, select, [contenteditable]"
        );
        if (!typing) {
          e.preventDefault();
          setCollapsed((c) => !c);
        }
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const activeIndex = links.findIndex((l) =>
    l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)
  );

  // Re-measure whenever layout could change: route, viewport, or collapse.
  useLayoutEffect(() => {
    function measure() {
      if (activeIndex === -1) {
        setIndicator(null);
        return;
      }
      const el = listRef.current?.children[activeIndex + 1];
      if (el) setIndicator({ y: el.offsetTop, h: el.offsetHeight });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeIndex, collapsed]);

  return (
    <nav className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-brand">
        <Logo />
        <span className="brand-name">
          My<em>Desk</em>
        </span>
      </div>

      <div className="nav-list" ref={listRef}>
        <div
          className="nav-indicator"
          style={{
            opacity: indicator ? undefined : 0,
            transform: `translateY(${indicator?.y ?? 0}px)`,
            height: indicator?.h ?? 38,
          }}
        />
        {links.map(({ to, label, icon: Icon, end }, i) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            style={{ animationDelay: `${0.08 + i * 0.05}s` }}
            title={label}
          >
            <Icon size={17} strokeWidth={2} />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </div>

      <MiniTimer />

      <div className="sidebar-footer">
        <Clock />
        <ThemeToggle />
        <button
          type="button"
          className="sidebar-hint"
          onClick={() => window.dispatchEvent(new Event("cmdk-open"))}
          title="Quick find — Ctrl+K or press /"
        >
          <Search size={15} />
          <span className="footer-label">Quick find</span>
          {!collapsed && <kbd>Ctrl K</kbd>}
        </button>
        <button
          type="button"
          className="sidebar-hint"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar — Ctrl+B or \\" : "Collapse sidebar — Ctrl+B or \\"}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          <span className="footer-label">Collapse</span>
          {!collapsed && <kbd>Ctrl B</kbd>}
        </button>
      </div>
    </nav>
  );
}
