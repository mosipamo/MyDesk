import { useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { PenLine, ListTodo, FileText, CalendarDays, Search, LayoutDashboard } from "lucide-react";
import Logo from "./Logo.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

const links = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/canvas", label: "Canvas", icon: PenLine },
  { to: "/todos", label: "Todos", icon: ListTodo },
  { to: "/notes", label: "Notes", icon: FileText },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
];

export default function Sidebar() {
  const location = useLocation();
  const listRef = useRef(null);
  const [indicator, setIndicator] = useState(null);

  const activeIndex = links.findIndex((l) =>
    l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)
  );

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || activeIndex === -1) {
      setIndicator(null);
      return;
    }
    const el = list.children[activeIndex + 1];
    if (!el) return;
    setIndicator({ y: el.offsetTop, h: el.offsetHeight });
  }, [activeIndex]);

  useLayoutEffect(() => {
    function onResize() {
      if (activeIndex === -1) return;
      const el = listRef.current?.children[activeIndex + 1];
      if (el) setIndicator({ y: el.offsetTop, h: el.offsetHeight });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIndex]);

  return (
    <nav className="sidebar">
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
            style={{ animationDelay: `${0.08 + i * 0.06}s` }}
          >
            <Icon size={17} strokeWidth={2} />
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <ThemeToggle />
        <button
          type="button"
          className="sidebar-hint"
          onClick={() => window.dispatchEvent(new Event("cmdk-open"))}
        >
          <Search size={15} />
          <span className="footer-label">Quick find</span>
          <kbd>Ctrl K</kbd>
        </button>
      </div>
    </nav>
  );
}
