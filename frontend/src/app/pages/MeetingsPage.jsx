import { useEffect, useState } from "react";
import { useApi } from "../../shared/hooks/useApi";
import { useSearchParams } from "react-router-dom";
import {
  getUpcomingMeetings,
  getMeetingsHistory,
} from "../../shared/api/meetings.api";

const DEMO_NOTICE =
  "Действие пока недоступно в демо-режиме. Эндпоинты для бэкенда уже подготовлены.";

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getMeetingTone(meeting) {
  if (meeting.isOngoing) {
    return "danger";
  }

  switch (meeting.status) {
    case "completed":
      return "success";

    case "scheduled":
      return "info";

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
    case "ongoing":
      return "Идёт сейчас";
    case "scheduled":
      return "Запланирована";
    case "completed":
      return "Итоги подведены";
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

function MeetingPersons({ meeting }) {
  return (
    <div className="meeting-persons">
      <span>Проводит: {meeting.conductor?.fullName || "—"}</span>
      <span>Участник: {meeting.participant?.fullName || "—"}</span>
    </div>
  );
}

export default function MeetingsPage() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [notice, setNotice] = useState("");
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);

  const upcoming = useApi(getUpcomingMeetings, []);
  const [searchParams, setSearchParams] = useSearchParams();

  const [history, setHistory] = useState({
    data: null,
    loading: false,
    error: "",
  });

  const loadHistory = async () => {
    setHistory((prev) => ({
      ...prev,
      loading: true,
      error: "",
    }));

    try {
      const data = await getMeetingsHistory(1, 10);

      setHistory({
        data,
        loading: false,
        error: "",
      });
    } catch (error) {
      setHistory({
        data: null,
        loading: false,
        error: error?.message || "Не удалось загрузить историю встреч",
      });
    }
  };

  useEffect(() => {
    if (activeTab !== "history") {
      return;
    }

    if (history.data || history.loading) {
      return;
    }

    loadHistory();
  }, [activeTab]);

  // Если пришли с главной с параметром ?new=1 — сразу открываем планировщик
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setIsPlannerOpen(true);

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("new");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const showDemoNotice = (text) => {
    setNotice(text || DEMO_NOTICE);
  };

  const openPlanner = () => {
    setIsPlannerOpen(true);
  };

  const closePlanner = () => {
    setIsPlannerOpen(false);
  };

  const handlePlannerSubmit = (event) => {
    event.preventDefault();
    showDemoNotice(
      "Создание встречи пока недоступно. Эндпоинт для бэкенда: POST /api/meetings.",
    );
    closePlanner();
  };

  const upcomingMeetings = Array.isArray(upcoming.data)
    ? upcoming.data
    : [];

  const historyItems = history.data?.items ?? [];

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Встречи</h1>
          <p className="page-subtitle">
            Планирование, назначенные 1:1 и история подведённых итогов
          </p>
        </div>
      </header>

      {notice ? (
        <div className="card">
          <div className="empty">{notice}</div>
        </div>
      ) : null}

      <div className="tabs">
        <button
          type="button"
          className={activeTab === "upcoming" ? "tab active" : "tab"}
          onClick={() => setActiveTab("upcoming")}
        >
          Предстоящие
        </button>

        <button
          type="button"
          className={activeTab === "history" ? "tab active" : "tab"}
          onClick={() => setActiveTab("history")}
        >
          История
        </button>
      </div>

      {activeTab === "upcoming" ? (
        <div className="grid">
          <section className="card span-12">
            <div className="card-header">
              <h2>Назначенные встречи</h2>

              <div className="card-header-actions">
                {upcomingMeetings.length > 0 ? (
                  <span className="badge neutral">{upcomingMeetings.length}</span>
                ) : null}

                <button
                  className="button primary"
                  type="button"
                  onClick={openPlanner}
                >
                  Запланировать встречу
                </button>
              </div>
            </div>

            {upcoming.loading ? (
              <EmptyState>Загрузка встреч...</EmptyState>
            ) : upcoming.error ? (
              <ErrorState message={upcoming.error} onRetry={upcoming.reload} />
            ) : upcomingMeetings.length === 0 ? (
              <EmptyState>Встречи пока не запланированы</EmptyState>
            ) : (
              <div className="meetings-list">
                {upcomingMeetings.map((meeting, index) => (
                  <article
                    key={meeting.id || index}
                    className={`meeting-item ${meeting.isOngoing ? "live" : ""}`}
                  >
                    <div className="meeting-time">
                      <strong>{formatTime(meeting.startsAt)}</strong>
                      <span>{formatDate(meeting.startsAt)}</span>
                    </div>

                    <div className="meeting-body">
                      <div className="meeting-title-row">
                        <h3>{meeting.title}</h3>

                        <span className={`badge ${getMeetingTone(meeting)}`}>
                          {getMeetingLabel(meeting)}
                        </span>
                      </div>

                      <div className="meeting-meta">
                        {meeting.type} · {meeting.format || "Формат не указан"}
                      </div>

                      <MeetingPersons meeting={meeting} />
                    </div>

                    <div className="meeting-actions">
                      {meeting.isOngoing ? (
                        <button
                          className="button primary"
                          type="button"
                          onClick={() =>
                            showDemoNotice(
                              "Вход во встречу пока недоступен в демо-режиме. Позже здесь будет открытие протокола или ссылки на звонок.",
                            )
                          }
                        >
                          Войти
                        </button>
                      ) : (
                        <button
                          className="button secondary"
                          type="button"
                          onClick={() =>
                            showDemoNotice(
                              "Открытие карточки встречи пока недоступно в демо-режиме. Позже здесь будет протокол встречи.",
                            )
                          }
                        >
                          Открыть
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {activeTab === "history" ? (
        <div className="grid">
          <section className="card span-12">
            <div className="card-header">
              <h2>История встреч</h2>

              {history.data?.total ? (
                <span className="badge neutral">{history.data.total}</span>
              ) : null}
            </div>

            {history.loading ? (
              <EmptyState>Загрузка истории...</EmptyState>
            ) : history.error ? (
              <ErrorState message={history.error} onRetry={loadHistory} />
            ) : historyItems.length === 0 ? (
              <EmptyState>История встреч пока пуста</EmptyState>
            ) : (
              <div className="history-list">
                {historyItems.map((meeting, index) => (
                  <article className="history-item" key={meeting.id || index}>
                    <div className="history-top">
                      <div>
                        <h3>{meeting.title}</h3>
                        <div className="meeting-meta">
                          {formatDateTime(meeting.startsAt)} · {meeting.type}
                        </div>
                      </div>

                      <span className="badge success">
                        {getMeetingLabel(meeting)}
                      </span>
                    </div>

                    <MeetingPersons meeting={meeting} />

                    {meeting.summary ? (
                      <p className="history-summary">{meeting.summary}</p>
                    ) : null}

                    <div className="history-stats">
                      <span className="badge success">
                        Зачтено скиллов: {meeting.confirmedSkillsCount}
                      </span>

                      <span className="badge warning">
                        Проблем: {meeting.problemsCount}
                      </span>

                      <span className="badge neutral">
                        Материалов: {meeting.attachmentsCount}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {isPlannerOpen ? (
        <div className="modal-overlay" onClick={closePlanner}>
          <div
            className="modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Запланировать встречу</h2>

              <button
                className="modal-close"
                type="button"
                onClick={closePlanner}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <form className="planner-form" onSubmit={handlePlannerSubmit}>
              <div className="planner-grid">
                <div className="field">
                  <label htmlFor="meeting-date">Дата</label>
                  <input id="meeting-date" type="date" />
                </div>

                <div className="field">
                  <label htmlFor="meeting-time">Время</label>
                  <input id="meeting-time" type="time" />
                </div>
              </div>

              <div className="field">
                <label htmlFor="meeting-participant">Сотрудник</label>
                <select id="meeting-participant" defaultValue="maria">
                  <option value="maria">Мария Соколова</option>
                  <option value="ivan">Иван Петров</option>
                  <option value="alexey">Алексей Ковалёв</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="meeting-type">Тип встречи</label>
                <select id="meeting-type" defaultValue="pr">
                  <option value="pr">PR 1:1</option>
                  <option value="skill-review">Skill Review</option>
                  <option value="problem-review">Problem Review</option>
                </select>
              </div>

              <div className="modal-actions">
                <button
                  className="button secondary"
                  type="button"
                  onClick={closePlanner}
                >
                  Отмена
                </button>

                <button className="button primary" type="submit">
                  Создать встречу
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}