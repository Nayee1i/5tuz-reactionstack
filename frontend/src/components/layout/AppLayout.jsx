import { NavLink, Outlet, Link } from "react-router-dom";
import { useMeetingsStatus } from "../../shared/context/meetings-status.context.jsx";

const mainNavigation = [
  { to: "/app", label: "Главная", end: true },
  { to: "/app/meetings", label: "Встречи" },
  { to: "/app/departments", label: "Подразделения" },
  { to: "/app/admin/users", label: "Администрирование" },
  { to: "/app/directories/skills", label: "Справочник скиллов" },
];

export default function AppLayout() {
  const { data: meetingsStatus } = useMeetingsStatus();

  const hasLiveMeeting = Boolean(meetingsStatus?.ongoing);
  const meetingsBadge = hasLiveMeeting
    ? "live"
    : meetingsStatus?.upcomingCount > 0
      ? meetingsStatus.upcomingCount
      : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">PR</span>
          <span className="brand-name">SkillFlow</span>
        </div>

        <nav className="nav" aria-label="Основная навигация">
          {mainNavigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`.trim()
              }
            >
              <span>{item.label}</span>

              {item.to === "/app/meetings" && meetingsBadge ? (
                <span
                  className={`nav-badge ${hasLiveMeeting ? "live" : ""}`}
                  title={
                    hasLiveMeeting
                      ? "Сейчас идёт встреча"
                      : "Есть запланированные встречи"
                  }
                >
                  {hasLiveMeeting ? "●" : meetingsBadge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link to="/app/profile" className="mini-user-link">
            <div className="mini-user">
              <div className="avatar">АК</div>
              <div>
                <div className="mini-user-name">Алексей Ковалёв</div>
                <div className="mini-user-role">BACK · Team Lead</div>
              </div>
            </div>
          </Link>
        </div>
      </aside>

      <div className={`workspace ${hasLiveMeeting ? "has-live-banner" : ""}`}>
        <header className="topbar">
          <input
            className="search"
            type="search"
            placeholder="Поиск: сотрудники, скиллы, встречи…"
          />

          <div className="topbar-actions">
            <button className="button secondary" type="button">
              Уведомления
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}