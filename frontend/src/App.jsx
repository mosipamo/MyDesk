import { useEffect, useRef } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import CanvasPage from "./pages/CanvasPage.jsx";
import TodosPage from "./pages/TodosPage.jsx";
import NotesPage from "./pages/NotesPage.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";

function Boundary({ path, children }) {
  return (
    <ErrorBoundary key={path}>
      {children}
    </ErrorBoundary>
  );
}

export default function App() {
  const location = useLocation();
  const contentRef = useRef(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content" ref={contentRef}>
        <Routes>
          <Route path="/" element={<Boundary path="/"><div className="page-enter"><CanvasPage /></div></Boundary>} />
          <Route path="/todos" element={<Boundary path="/todos"><div className="page-enter"><TodosPage /></div></Boundary>} />
          <Route path="/notes" element={<Boundary path="/notes"><div className="page-enter"><NotesPage /></div></Boundary>} />
          <Route path="/calendar" element={<Boundary path="/calendar"><div className="page-enter"><CalendarPage /></div></Boundary>} />
        </Routes>
      </main>
      <CommandPalette />
    </div>
  );
}
