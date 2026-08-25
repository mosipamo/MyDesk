import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import CanvasPage from "./pages/CanvasPage.jsx";
import TodosPage from "./pages/TodosPage.jsx";
import NotesPage from "./pages/NotesPage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";

// Each page gets its own boundary (keyed by path) so a crash on one page
// shows a recoverable message in the content area without taking the
// sidebar/nav down with it, and without carrying a stale crash into
// whichever page you navigate to next.
function Boundary({ path, children }) {
  return (
    <ErrorBoundary key={path}>
      {children}
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content">
        <Routes>
          <Route path="/" element={<Boundary path="/"><CanvasPage /></Boundary>} />
          <Route path="/todos" element={<Boundary path="/todos"><TodosPage /></Boundary>} />
          <Route path="/notes" element={<Boundary path="/notes"><NotesPage /></Boundary>} />
          <Route path="/calendar" element={<Boundary path="/calendar"><CalendarPage /></Boundary>} />
        </Routes>
      </main>
      <CommandPalette />
    </div>
  );
}
