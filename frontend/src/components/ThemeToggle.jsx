import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const KEY = "mydesk-theme";

export function getInitialTheme() {
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return (
    <button
      type="button"
      className="theme-toggle-btn theme-toggle"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      <span className="toggle-orb">
        <Sun className="icon-sun" size={17} />
        <Moon className="icon-moon" size={16} />
      </span>
      <span className="footer-label">{theme === "dark" ? "Dark" : "Light"} mode</span>
    </button>
  );
}
