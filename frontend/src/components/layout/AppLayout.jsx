import { NavLink, Outlet } from "react-router-dom";

const navigation = [
  { to: "/app", label: "Главная", end: true },
  { to: "/app/meetings", label: "Встречи" },
  { to: "/app/profile", label: "Профиль" },
];

export default function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">PR</span>
          <span className="brand-name">SkillFlow</span>
        </div>

        <nav className="nav" aria-label="Основная навигация">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`.trim()
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="mini-user">
            <div className="avatar">АК</div>
            <div>
              <div className="mini-user-name">Алексей Ковалёв</div>
              <div className="mini-user-role">BACK · Team Lead</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="workspace">
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
            <button className="button primary" type="button">
              Новая встреча
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