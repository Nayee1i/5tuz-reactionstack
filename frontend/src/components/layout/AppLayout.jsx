import { useState, useRef, useEffect } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { useMeetingsStatus } from "../../shared/context/meetings-status.context.jsx";

const Icons = {
  home: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-6h6v6" />
    </svg>
  ),

  meetings: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  ),

  departments: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
      <path d="M17 9h2a2 2 0 0 1 2 2v10" />
      <path d="M7 7h4M7 11h4M7 15h4" />
    </svg>
  ),

  admin: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V20h-2.6v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H5.8v-2.6h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V5h2.6v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v2.6h-.1a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  ),

  skills: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l2.4 4.9L20 8.7l-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8L12 3Z" />
    </svg>
  ),
};


const mainNavigation = [
  {
    to: "/app",
    label: "Главная",
    end: true,
    icon: Icons.home,
  },
  {
    to: "/app/meetings",
    label: "Встречи",
    icon: Icons.meetings,
  },
  {
    to: "/app/departments",
    label: "Подразделения",
    icon: Icons.departments,
  },
  {
    to: "/app/admin/users",
    label: "Администрирование",
    icon: Icons.admin,
  },
  {
    to: "/app/directories/skills",
    label: "Справочник скиллов",
    icon: Icons.skills,
  },
];

// 🔴 Теперь это состояние, а не константа
const initialNotifications = [
  {
    id: 1,
    title: "Встреча через 30 минут",
    message: "1:1 с Алексеем Ковалёвым в 14:00",
    time: "5 мин назад",
    type: "info",
    read: false,
  },
  {
    id: 2,
    title: "Скил подтверждён",
    message: "TypeScript Advanced подтверждён на встрече",
    time: "2 часа назад",
    type: "success",
    read: false,
  },
  {
    id: 3,
    title: "Новая задача",
    message: "Добавить валидацию формы создания встречи",
    time: "Вчера",
    type: "warning",
    read: true,
  },
  {
    id: 4,
    title: "Встреча перенесена",
    message: "Командная встреча перенесена на пятницу",
    time: "2 дня назад",
    type: "info",
    read: true,
  },
];

export default function AppLayout() {
  const { data: meetingsStatus } = useMeetingsStatus();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications); // 🔴 Состояние для уведомлений
  const [theme, setTheme] = useState(() => {
  return localStorage.getItem("theme") || "dark";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const notificationsRef = useRef(null);

  const hasLiveMeeting = Boolean(meetingsStatus?.ongoing);
  const meetingsBadge = hasLiveMeeting
    ? "live"
    : meetingsStatus?.upcomingCount > 0
      ? meetingsStatus.upcomingCount
      : null;

  const unreadCount = notifications.filter((n) => !n.read).length; // 🔴 Считаем из состояния

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setIsNotificationsOpen(false);
      }
    }
  

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔴 Функция для отметки одного уведомления как прочитанное
  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  // 🔴 Функция для отметки всех уведомлений как прочитанные
  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
              <div className="brand">
        <div className="brand-info">
          <span className="brand-logo">PR</span>
          <span className="brand-name">SkillFlow</span>
        </div>

        <button
          type="button"
          className="theme-toggle"
          onClick={() =>
            setTheme((current) =>
              current === "light" ? "dark" : "light"
            )
          }
          aria-label={
            theme === "light"
              ? "Включить тёмную тему"
              : "Включить светлую тему"
          }
          title={
            theme === "light"
              ? "Тёмная тема"
              : "Светлая тема"
          }
        >
          {theme === "light" ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          )}
        </button>
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
              <span className="nav-link-content">
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </span>

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
        <header className="topbar" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "12px 24px" }}>
          {/* 🔴 Кнопка Уведомления — СПРАВА */}
          <div 
            className="notifications-dropdown" 
            ref={notificationsRef}
            style={{ position: "relative" }}
          >
            <button
                className="button secondary"
                type="button"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                style={{ 
                  position: "relative",
                  background: "#374151",
                  color: "white",
                  border: "1px solid #4b5563",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "44px",
                  minHeight: "36px"
                }}
              >
                {/* SVG иконка колокольчика */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-8px",
                      right: "-8px",
                      background: "#ef4444",
                      color: "white",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
            </button>   

            {isNotificationsOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  width: "360px",
                  maxHeight: "400px",
                  overflowY: "auto",
                  zIndex: 1000,
                }}
              >
                <div
                  style={{
                    padding: "16px",
                    borderBottom: "1px solid #e5e7eb",
                    fontWeight: "600",
                    fontSize: "16px",
                    color: "#111827",
                    background: "#f9fafb",
                  }}
                >
                  Уведомления ({unreadCount} непрочитанных)
                </div>

                {notifications.length === 0 ? (
                  <div style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>
                    Нет уведомлений
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)} // 🔴 Клик по уведомлению
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid #f3f4f6",
                        background: notification.read ? "white" : "#f0f9ff",
                        cursor: "pointer",
                        transition: "background 0.2s",
                        opacity: notification.read ? 0.7 : 1, // 🔴 Прочитанные чуть бледнее
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = notification.read
                          ? "white"
                          : "#f0f9ff";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "4px",
                        }}
                      >
                        <strong
                          style={{
                            fontSize: "14px",
                            fontWeight: notification.read ? "400" : "600", //  Прочитанные не жирные
                            color: notification.read ? "#6b7280" : "#111827",
                          }}
                        >
                          {notification.title}
                        </strong>
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#9ca3af",
                            whiteSpace: "nowrap",
                            marginLeft: "8px",
                          }}
                        >
                          {notification.time}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#6b7280",
                          lineHeight: "1.4",
                        }}
                      >
                        {notification.message}
                      </div>
                    </div>
                  ))
                )}

                <div
                  style={{
                    padding: "12px 16px",
                    textAlign: "center",
                    borderTop: "1px solid #e5e7eb",
                    background: "#f9fafb",
                  }}
                >
                  <button
                    type="button"
                    onClick={markAllAsRead} // 🔴 Добавлен обработчик
                    disabled={unreadCount === 0} // 🔴 Блокируем если все прочитаны
                    style={{
                      background: "none",
                      border: "none",
                      color: unreadCount === 0 ? "#9ca3af" : "#3b82f6",
                      cursor: unreadCount === 0 ? "not-allowed" : "pointer",
                      fontSize: "14px",
                      fontWeight: "500",
                      opacity: unreadCount === 0 ? 0.5 : 1,
                    }}
                  >
                    Отметить все как прочитанные
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}