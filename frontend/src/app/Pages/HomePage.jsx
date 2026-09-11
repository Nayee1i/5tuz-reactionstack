import { useNavigate } from "react-router-dom";
import { useApi } from "../../shared/hooks/useApi.js";
import { getDashboard } from "../../shared/api/dashboard.api.js";
import { useMeetingsStatus } from "../../shared/context/meetings-status.context.jsx";
import { motion } from "framer-motion";

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

export default function HomePage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(getDashboard, []);
  const { data: meetingsStatus } = useMeetingsStatus();
  const ongoingMeeting = meetingsStatus?.ongoing;

  // Настройки анимации для этой страницы
  const pageAnimation = {
    initial: { opacity: 0, y: 12 }, // Начинаем чуть ниже и прозрачные
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } }, // Плавно всплываем
    exit: { opacity: 0, y: -12, transition: { duration: 0.15, ease: "easeIn" } }, // Уходим чуть вверх при смене страницы
  };

  if (loading) {
    return (
      <motion.section className="page" {...pageAnimation}>
        <div className="card">
          <div className="empty">Загрузка дашборда...</div>
        </div>
      </motion.section>
    );
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
  const problems = Array.isArray(data.problems) ? data.problems : [];
  const achievements = Array.isArray(data.achievements) ? data.achievements : [];

  const displayName = user.firstName || user.fullName || "пользователь";
  const subtitle = [user.direction, user.department].filter(Boolean).join(" · ");

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
            {getGreeting()}, {displayName}
          </h1>
          <p className="page-subtitle">
            {subtitle || "Ваш рабочий центр развития"}
          </p>
        </div>
        <div className="page-actions">
          <button className="button secondary" type="button">
            Открыть статистику
          </button>
        </div>
      </header>

      <div className="grid">
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

            <button className="link-button" type="button">
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

            {problems.length > 0 ? (
              <span className="badge warning">Требуют внимания</span>
            ) : null}
          </div>

          {problems.length === 0 ? (
            <EmptyState>Открытых проблем нет</EmptyState>
          ) : (
            <div className="list">
              {problems.map((problem, index) => (
                <article className="list-item" key={problem.id || index}>
                  <div>
                    <div className="item-title">{problem.title}</div>

                    <div className="item-meta">
                      {problem.owner} · до {formatDate(problem.dueDate)}
                    </div>
                  </div>

                  <span className={`badge ${getProblemTone(problem)}`}>
                    {getProblemLabel(problem)}
                  </span>
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
            <button className="button secondary full" type="button">
              Добавить скилл
            </button>

            <button className="button secondary full" type="button">
              Провести встречу 1:1
            </button>

            <button className="button secondary full" type="button">
              Прикрепить материалы
            </button>

            <button className="button secondary full" type="button">
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
    </motion.section>
  );
}