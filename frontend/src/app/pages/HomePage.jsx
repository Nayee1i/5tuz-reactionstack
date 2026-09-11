import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../shared/hooks/useApi.js";
import { getDashboard } from "../../shared/api/dashboard.api.js";
import { useMeetingsStatus } from "../../shared/context/meetings-status.context.jsx";
import { motion, AnimatePresence } from "framer-motion";

function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return "Доброе утро";
  }

  if (hour >= 12 && hour < 18) {
    return "Добрый день";
  }

  if (hour >= 18 && hour < 23) {
    return "Добрый вечер";
  }

  return "Доброй ночи";
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(date);
}

function getSkillTone(skill) {
  if (skill.statusTone) {
    return skill.statusTone;
  }

  switch (skill.status) {
    case "confirmed":
    case "almost_confirmed":
    case "on_track":
      return "success";

    case "in_progress":
    case "planned":
      return "info";

    case "at_risk":
    case "overdue":
      return "warning";

    default:
      return "neutral";
  }
}

function getSkillLabel(skill) {
  if (skill.statusLabel) {
    return skill.statusLabel;
  }

  switch (skill.status) {
    case "confirmed":
      return "Подтверждён";
    case "almost_confirmed":
      return "Почти подтверждён";
    case "on_track":
      return "По плану";
    case "in_progress":
      return "В работе";
    case "planned":
      return "Запланирован";
    case "at_risk":
      return "Есть отставание";
    case "overdue":
      return "Просрочен";
    default:
      return skill.status || "Без статуса";
  }
}

function getMeetingTone(meeting) {
  if (meeting.statusTone) {
    return meeting.statusTone;
  }

  switch (meeting.status) {
    case "planned":
    case "scheduled":
      return "info";

    case "completed":
      return "success";

    case "draft":
    case "postponed":
      return "warning";

    case "cancelled":
      return "danger";

    default:
      return "neutral";
  }
}

function getMeetingLabel(meeting) {
  if (meeting.statusLabel) {
    return meeting.statusLabel;
  }

  switch (meeting.status) {
    case "planned":
    case "scheduled":
      return "Запланирована";
    case "completed":
      return "Проведена";
    case "draft":
      return "Черновик";
    case "postponed":
      return "Перенесена";
    case "cancelled":
      return "Отменена";
    default:
      return meeting.status || "Без статуса";
  }
}

function getProblemTone(problem) {
  if (problem.severityTone) {
    return problem.severityTone;
  }

  switch (problem.severity) {
    case "high":
    case "critical":
      return "danger";

    case "medium":
      return "warning";

    case "low":
      return "info";

    default:
      return "neutral";
  }
}

function getProblemLabel(problem) {
  if (problem.severityLabel) {
    return problem.severityLabel;
  }

  switch (problem.severity) {
    case "critical":
      return "Критический";
    case "high":
      return "Высокий";
    case "medium":
      return "Средний";
    case "low":
      return "Низкий";
    default:
      return problem.severity || "Без уровня";
  }
}

function EmptyState({ children }) {
  return <div className="empty">{children}</div>;
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="card">
      <div className="empty">{message}</div>
      <div className="stack">
        <button className="button secondary" type="button" onClick={onRetry}>
          Повторить
        </button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <section className="page">
      <div className="page-header">
        <div>
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-subtitle" />
        </div>
      </div>

      <div className="grid">
        <section className="card span-12">
          <div className="kpi-grid">
            <div className="skeleton skeleton-kpi" />
            <div className="skeleton skeleton-kpi" />
            <div className="skeleton skeleton-kpi" />
            <div className="skeleton skeleton-kpi" />
          </div>
        </section>

        <section className="card span-7">
          <div className="stack">
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
          </div>
        </section>

        <section className="card span-5">
          <div className="stack">
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
          </div>
        </section>

        <section className="card span-8">
          <div className="skeleton skeleton-card" />
        </section>

        <section className="card span-4">
          <div className="skeleton skeleton-card" />
        </section>
      </div>
    </section>
  );
}

// Компонент модального окна для добавления проблемы
// Компонент модального окна для добавления проблемы (в стиле "Запланировать встречу")
// Компонент модального окна для добавления проблемы (в стиле "Новый пользователь")
function AddProblemModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: "",
    comment: "",
    owner: "",
    dueDate: "",
    severity: "medium",
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      title: "",
      comment: "",
      owner: "",
      dueDate: "",
      severity: "medium",
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.8)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#0d0d0d",
                border: "1px solid #1a1a1a",
                borderRadius: "12px",
                padding: "32px",
                width: "100%",
                maxWidth: "520px",
                boxShadow: "0 25px 50px rgba(0, 0, 0, 0.8)",
              }}
            >
              {/* Заголовок */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "28px",
                }}
              >
                <h2 style={{ margin: 0, fontSize: "20px", color: "white", fontWeight: "600" }}>
                  Добавить проблему
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6b7280",
                    fontSize: "24px",
                    cursor: "pointer",
                    padding: "0",
                    lineHeight: 1,
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#6b7280";
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Поле: Название */}
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    Название
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "#111111",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      color: "white",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    placeholder="Например: Отставание по React"
                    onFocus={(e) => {
                      e.target.style.borderColor = "#4b5563";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#2a2a2a";
                    }}
                  />
                </div>

                {/* Поле: Описание */}
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    Описание
                  </label>
                  <textarea
                    value={formData.comment}
                    onChange={(e) =>
                      setFormData({ ...formData, comment: e.target.value })
                    }
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "#111111",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      color: "white",
                      fontSize: "14px",
                      resize: "vertical",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    placeholder="Опишите проблему..."
                    onFocus={(e) => {
                      e.target.style.borderColor = "#4b5563";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#2a2a2a";
                    }}
                  />
                </div>

                {/* Поле: Владелец */}
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    Владелец
                  </label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={(e) =>
                      setFormData({ ...formData, owner: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "#111111",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      color: "white",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    placeholder="Например: Иван Петров"
                    onFocus={(e) => {
                      e.target.style.borderColor = "#4b5563";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#2a2a2a";
                    }}
                  />
                </div>

                {/* Поле: Срок решения */}
                <div style={{ marginBottom: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    Срок решения
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) =>
                      setFormData({ ...formData, dueDate: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      background: "#111111",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      color: "white",
                      fontSize: "14px",
                      boxSizing: "border-box",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#4b5563";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#2a2a2a";
                    }}
                  />
                </div>

                {/* Уровень важности */}
                <div style={{ marginBottom: "28px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "10px",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "600",
                    }}
                  >
                    Уровень важности
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "12px",
                    }}
                  >
                    {[
                      { value: "low", label: "Низкий", color: "#3b82f6" },
                      { value: "medium", label: "Средний", color: "#f59e0b" },
                      { value: "high", label: "Высокий", color: "#ef4444" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, severity: item.value })
                        }
                        style={{
                          padding: "10px 16px",
                          background:
                            formData.severity === item.value
                              ? item.color
                              : "#111111",
                          border: `1px solid ${formData.severity === item.value ? item.color : "#2a2a2a"}`,
                          borderRadius: "8px",
                          color: "white",
                          fontSize: "14px",
                          fontWeight: formData.severity === item.value ? "600" : "500",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (formData.severity !== item.value) {
                            e.currentTarget.style.background = "#1a1a1a";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (formData.severity !== item.value) {
                            e.currentTarget.style.background = "#111111";
                          }
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Кнопки */}
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      padding: "10px 20px",
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "8px",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#2a2a2a";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#1a1a1a";
                    }}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "10px 20px",
                      background: "#6366f1",
                      border: "none",
                      borderRadius: "8px",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#4f46e5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#6366f1";
                    }}
                  >
                    Добавить
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function HomePage() {
  const [isStatsOpen, setIsStatsOpen] = useState(true);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [problems, setProblems] = useState([]);
  const [hoveredProblemId, setHoveredProblemId] = useState(null); // 🔴 Для отслеживания наведения
  
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(getDashboard, []);
  const { data: meetingsStatus } = useMeetingsStatus();
  const ongoingMeeting = meetingsStatus?.ongoing;

  useEffect(() => {
    if (data && Array.isArray(data.problems)) {
      setProblems(data.problems);
    }
  }, [data]);

  const pageAnimation = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.15, ease: "easeIn" } },
  };

  if (!data && loading) {
    return <DashboardSkeleton />;
  } 

  if (error || !data) {
    return (
      <motion.section className="page" {...pageAnimation}>
        <ErrorState message={error || "Данные не получены"} onRetry={reload} />
      </motion.section>
    );
  }

  const user = data.viewedUser || data.user || {};
  const kpis = Array.isArray(data.kpis) ? data.kpis : [];
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const meetings = Array.isArray(data.meetings) ? data.meetings : [];
  const achievements = Array.isArray(data.achievements) ? data.achievements : [];

  const displayName = user.firstName || user.fullName || "пользователь";
  const subtitle = [user.direction, user.department].filter(Boolean).join(" · ");

  const handleAddProblem = (problemData) => {
    const newProblem = {
      id: Date.now().toString(),
      title: problemData.title,
      comment: problemData.comment,
      owner: problemData.owner,
      dueDate: problemData.dueDate,
      severity: problemData.severity,
      status: "OPEN",
    };
    
    setProblems((prev) => [...prev, newProblem]);
  };

  // 🔴 Функция удаления проблемы
  const handleDeleteProblem = (id) => {
    setProblems((prev) => prev.filter((problem) => problem.id !== id));
  };

  return (
    <motion.section className="page" {...pageAnimation}>
      {ongoingMeeting ? (
        <div className="live-banner">
          <div className="live-banner-info">
            <span className="live-dot" aria-hidden="true" />
            <div>
              <strong>Сейчас идёт встреча: {ongoingMeeting.title}</strong>
              <div className="live-banner-meta">
                {ongoingMeeting.type} · {ongoingMeeting.format} · Участник:{" "}
                {ongoingMeeting.participant?.fullName || "—"}
              </div>
            </div>
          </div>

          <button
            className="button primary"
            type="button"
            onClick={() => navigate("/app/meetings")}
          >
            Перейти к встрече
          </button>
        </div>
      ) : null}

      <header className="page-header">
        <div>
          <h1 className="page-title">
            {getGreeting()}, {displayName}!
          </h1>
          <p className="page-subtitle">
            {subtitle || "Ваш рабочий центр развития"}
          </p>
        </div>
        <div className="page-actions">
          <button 
            className="button secondary" 
            type="button"
            onClick={() => setIsStatsOpen(!isStatsOpen)}
          >
            {isStatsOpen ? "Скрыть статистику" : "Открыть статистику"}
          </button>
        </div>
      </header>

      <div className="grid">
        {isStatsOpen && (
          <section className="card span-12">
            {kpis.length === 0 ? (
              <EmptyState>Статистика пока не доступна</EmptyState>
            ) : (
              <div className="kpi-grid">
                {kpis.map((kpi, index) => (
                  <article className="kpi" key={kpi.id || index}>
                    <span className="kpi-label">{kpi.label}</span>
                    <strong className="kpi-value">{kpi.value}</strong>
                    <span className="kpi-note">{kpi.note}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="card span-7">
          <div className="card-header">
            <h2>План развития навыков</h2>

            {user.direction ? (
              <span className="badge neutral">{user.direction}</span>
            ) : null}
          </div>

          {skills.length === 0 ? (
            <EmptyState>План навыков пока не назначен</EmptyState>
          ) : (
            <div className="stack">
              {skills.map((skill, index) => (
                <article className="skill-row" key={skill.id || index}>
                  <div className="skill-top">
                    <h3>{skill.name}</h3>

                    <span className={`badge ${getSkillTone(skill)}`}>
                      {getSkillLabel(skill)}
                    </span>
                  </div>

                  <div
                    className="progress"
                    role="progressbar"
                    aria-valuenow={skill.progress || 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="progress-bar"
                      style={{
                        width: `${Math.min(Math.max(skill.progress || 0, 0), 100)}%`,
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card span-5">
          <div className="card-header">
            <h2>Ближайшие встречи</h2>

            <button 
              className="link-button" 
              type="button"
              onClick={() => navigate("/app/meetings")}
            >
              Все
            </button>
          </div>

          {meetings.length === 0 ? (
            <EmptyState>Встречи пока не запланированы</EmptyState>
          ) : (
            <div className="list">
              {meetings.map((meeting, index) => (
                <article className="list-item" key={meeting.id || index}>
                  <div>
                    <div className="item-title">{meeting.title}</div>

                    <div className="item-meta">
                      {formatDate(meeting.startsAt)} · {meeting.type}
                    </div>
                  </div>

                  <span className={`badge ${getMeetingTone(meeting)}`}>
                    {getMeetingLabel(meeting)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card span-8">
          <div className="card-header">
            <h2>Проблемы и риски</h2>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {problems.length > 0 ? (
                <span className="badge warning">Требуют внимания</span>
              ) : null}
              
              <button
                className="button secondary"
                type="button"
                onClick={() => setIsProblemModalOpen(true)}
                style={{
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                Добавить
              </button>
            </div>
          </div>

          {problems.length === 0 ? (
            <EmptyState>Открытых проблем нет</EmptyState>
          ) : (
            <div className="list">
              {problems.map((problem) => (
                <article 
                  className="list-item" 
                  key={problem.id}
                  onMouseEnter={() => setHoveredProblemId(problem.id)}
                  onMouseLeave={() => setHoveredProblemId(null)}
                  style={{
                    position: "relative",
                    transition: "background 0.2s",
                    paddingRight: hoveredProblemId === problem.id ? "52px" : "0",
                  }}
                >
                  <div>
                    <div className="item-title">{problem.title}</div>
                    <div className="item-meta">
                      {problem.owner} · до {formatDate(problem.dueDate)}
                    </div>
                  </div>

                  <span 
                    className={`badge ${getProblemTone(problem)}`}
                    style={{
                      transition: "opacity 0.2s",
                      opacity: hoveredProblemId === problem.id ? 0 : 1,
                    }}
                  >
                    {getProblemLabel(problem)}
                  </span>

                  {/* Кнопка удаления (появляется при наведении) */}
                  {hoveredProblemId === problem.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteProblem(problem.id)}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "#ef4444",
                        border: "none",
                        borderRadius: "6px",
                        color: "white",
                        width: "32px",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "20px",
                        lineHeight: 1,
                        transition: "all 0.2s",
                        boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#dc2626";
                        e.currentTarget.style.transform = "translateY(-50%) scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#ef4444";
                        e.currentTarget.style.transform = "translateY(-50%) scale(1)";
                      }}
                      title="Удалить проблему"
                    >
                      ×
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="card span-4">
          <div className="card-header">
            <h2>Быстрые действия</h2>
          </div>

          <div className="stack">
            <button className="button secondary full" type="button" onClick={() => navigate("/app/directories/skills?new=1")}>
              Добавить скилл
            </button>

            <button className="button secondary full" type="button" onClick={() => navigate("/app/meetings?new=1")}>
              Запланировать встречу 1:1
            </button>

            <button className="button secondary full" type="button" onClick={() => navigate("/app/meetings")}>
              Запланированные встречи
            </button>

            <button
              className="button secondary full"
              type="button"
              onClick={() => navigate("/app/profile")}
            >
              Посмотреть профиль
            </button>
          </div>

          {achievements.length > 0 ? (
            <div className="chips">
              {achievements.map((achievement) => (
                <span className="chip" key={achievement}>
                  {achievement}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <AddProblemModal
        isOpen={isProblemModalOpen}
        onClose={() => setIsProblemModalOpen(false)}
        onSubmit={handleAddProblem}
      />
    </motion.section>
  );
}