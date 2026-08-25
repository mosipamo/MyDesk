import { NavLink } from "react-router-dom";
import { PenLine, ListTodo, FileText, CalendarDays, Search } from "lucide-react";

const links = [
  { to: "/", label: "Canvas", icon: PenLine, end: true },
  { to: "/todos", label: "Todos", icon: ListTodo },
  { to: "/notes", label: "Notes", icon: FileText },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
];

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        work<span>/</span>space
      </div>
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <Icon size={16} strokeWidth={2} />
          {label}
        </NavLink>
      ))}
      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-hint"
          onClick={() => window.dispatchEvent(new Event("cmdk-open"))}
        >
          <Search size={14} />
          Quick find
          <kbd>Ctrl K</kbd>
        </button>
      </div>
    </nav>
  );
}
