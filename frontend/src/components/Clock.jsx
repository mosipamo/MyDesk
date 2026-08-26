import { useEffect, useState } from "react";
import { Clock as ClockIcon } from "lucide-react";

export default function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = now.getSeconds();
  const date = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="sidebar-clock" title={`${date} · ${hh}:${mm}:${String(ss).padStart(2, "0")}`}>
      <ClockIcon size={15} className={`clock-icon${ss % 2 === 0 ? "" : " dim"}`} />
      <span className="footer-label clock-text">
        <span className="clock-time">
          {hh}
          <span className="clock-colon">:</span>
          {mm}
        </span>
        <span className="clock-date">{date}</span>
      </span>
    </div>
  );
}
