import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useApi } from "../../shared/hooks/useApi";
import { useMeetingsStatus } from "../../shared/context/meetings-status.context.jsx";
import {
  getUpcomingMeetings,
  getMeetingsHistory,
  getMeetingById,
  createMeeting,
  deleteMeeting,
} from "../../shared/api/meetings.api";

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(date);
}

function formatTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getMeetingTone(meeting) {
  if (meeting.isOngoing) return "danger";

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
  if (meeting.statusLabel) return meeting.statusLabel;

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

/* ========== Модалка с деталями встречи ========== */

function MeetingDetailsModal({ meetingId, onClose }) {
  const { data: meeting, loading, error, reload } = useApi(
    () => getMeetingById(meetingId),
    [meetingId],
    { cacheKey: `meeting-${meetingId}` },
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-wide"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{meeting ? meeting.title : "Встреча"}</h2>

          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {loading && !meeting ? (
          <div className="empty">Загрузка встречи...</div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : meeting ? (
          <div className="meeting-details">
            <div className="meeting-details-top">
              <span className={`badge ${getMeetingTone(meeting)}`}>
                {getMeetingLabel(meeting)}
              </span>

              <span className="meeting-meta">
                {meeting.type} · {meeting.format || "Формат не указан"}
              </span>
            </div>

            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Дата и время</span>
                <span className="info-value">
                  {formatDateTime(meeting.startsAt)} — {formatTime(meeting.endsAt)}
                </span>
              </div>

              <div className="info-row">
                <span className="info-label">Проводит</span>
                <span className="info-value">
                  {meeting.conductor?.fullName || "—"}
                  {meeting.conductor?.position ? `, ${meeting.conductor.position}` : ""}
                </span>
              </div>

              <div className="info-row">
                <span className="info-label">Участник</span>
                <span className="info-value">
                  {meeting.participant?.fullName || "—"}
                  {meeting.participant?.direction ? ` · ${meeting.participant.direction}` : ""}
                </span>
              </div>

              {meeting.link ? (
                <div className="info-row">
                  <span className="info-label">Ссылка на звонок</span>
                  <span className="info-value">{meeting.link}</span>
                </div>
              ) : null}
            </div>

            {meeting.status === "completed" ? (
              <>
                <h3 className="meeting-details-subtitle">Итоги встречи</h3>

                {meeting.summary ? (
                  <p className="meeting-summary">{meeting.summary}</p>
                ) : (
                  <div className="empty">Итоги не заполнены</div>
                )}

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
              </>
            ) : (
              <p className="meeting-summary-muted">
                Итоги, зачтённые скиллы и проблемы появятся после проведения встречи.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ========== Страница ========== */

export default function MeetingsPage() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState("info");
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [plannerForm, setPlannerForm] = useState({
    date: "",
    time: "",
    participantId: "2",
    type: "pr",
    format: "online",
  });
  const [plannerError, setPlannerError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const upcoming = useApi(getUpcomingMeetings, []);
  const { reload: reloadStatus } = useMeetingsStatus();
  const [searchParams, setSearchParams] = useSearchParams();

  const [history, setHistory] = useState({ data: null, loading: false, error: "" });

  const loadHistory = async () => {
    setHistory((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      const data = await getMeetingsHistory(1, 10);
      setHistory({ data, loading: false, error: "" });
    } catch (error) {
      setHistory({
        data: null,
        loading: false,
        error: error?.message || "Не удалось загрузить историю встреч",
      });
    }
  };

  useEffect(() => {
    if (activeTab !== "history") return;
    if (history.data || history.loading) return;
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Открытие планировщика по ?new=1 с главной
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setIsPlannerOpen(true);

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("new");
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
  if (deleteConfirmId === null) {
    return;
  }

  const timer = setTimeout(() => setDeleteConfirmId(null), 4000);
  return () => clearTimeout(timer);
  }, [deleteConfirmId]);

  const showNotice = (text, tone = "info") => {
    setNotice(text);
    setNoticeTone(tone);
  };

  const openPlanner = () => {
    setPlannerError("");
    setIsPlannerOpen(true);
  };

  const closePlanner = () => {
    setIsPlannerOpen(false);
  };

  const handlePlannerChange = (event) => {
    const { name, value } = event.target;
    setPlannerForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlannerSubmit = async (event) => {
    event.preventDefault();
    setPlannerError("");

    if (!plannerForm.date || !plannerForm.time) {
      setPlannerError("Укажите дату и время встречи");
      return;
    }

    const startsAt = new Date(`${plannerForm.date}T${plannerForm.time}:00`);

    if (Number.isNaN(startsAt.getTime())) {
      setPlannerError("Некорректные дата или время");
      return;
    }

    if (startsAt.getTime() < Date.now()) {
      setPlannerError("Нельзя запланировать встречу в прошлом");
      return;
    }

    setIsCreating(true);

    try {
      await createMeeting({
        participantId: Number(plannerForm.participantId),
        type: plannerForm.type,
        format: plannerForm.format,
        startsAt: startsAt.toISOString(),
        endsAt: new Date(startsAt.getTime() + 45 * 60000).toISOString(),
      });

      closePlanner();
      showNotice("Встреча запланирована", "success");

      setPlannerForm((prev) => ({ ...prev, date: "", time: "" }));

      // Тихо обновляем список и бейдж в меню
      upcoming.reload();
      reloadStatus();
    } catch (error) {
      setPlannerError(error?.message || "Не удалось создать встречу");
    } finally {
      setIsCreating(false);
    }
  };

  const requestDelete = (meetingId) => {
  setDeleteConfirmId((prev) => (prev === meetingId ? null : meetingId));
};

const handleDeleteMeeting = async (meetingId) => {
  setIsDeleting(true);

  try {
    await deleteMeeting(meetingId);

    showNotice("Встреча удалена", "success");
    setDeleteConfirmId(null);

    if (selectedMeetingId === meetingId) {
      setSelectedMeetingId(null);
    }

    // Тихо обновляем список и бейдж в меню
    upcoming.reload();
    reloadStatus();
  } catch (error) {
    showNotice(error?.message || "Не удалось удалить встречу", "error");
    setDeleteConfirmId(null);
  } finally {
    setIsDeleting(false);
  }
};

  const upcomingMeetings = Array.isArray(upcoming.data) ? upcoming.data : [];
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
        <div
          className={`org-alert ${
            noticeTone === "success" ? "org-alert-success" : "org-alert-error"
          }`}
        >
          {notice}
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

                <button className="button primary" type="button" onClick={openPlanner}>
                  Запланировать встречу
                </button>
              </div>
            </div>

            {!upcoming.data && upcoming.loading ? (
              <EmptyState>Загрузка встреч...</EmptyState>
            ) : upcoming.error && !upcoming.data ? (
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
                      <button
                        className={meeting.isOngoing ? "button primary" : "button secondary"}
                        type="button"
                        onClick={() => setSelectedMeetingId(meeting.id)}
                      >
                        {meeting.isOngoing ? "Войти" : "Открыть"}
                      </button>

                      {meeting.status === "scheduled" || meeting.status === "draft" ? (
                        deleteConfirmId === meeting.id ? (
                          <button
                            className="button org-delete"
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDeleteMeeting(meeting.id)}
                          >
                            {isDeleting ? "Удаление..." : "Точно?"}
                          </button>
                        ) : (
                          <button
                            className="button secondary"
                            type="button"
                            onClick={() => requestDelete(meeting.id)}
                            title="Удалить встречу"
                          >
                            Удалить
                          </button>
                        )
                      ) : null}
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

            {!history.data && history.loading ? (
              <EmptyState>Загрузка истории...</EmptyState>
            ) : history.error && !history.data ? (
              <ErrorState message={history.error} onRetry={loadHistory} />
            ) : historyItems.length === 0 ? (
              <EmptyState>История встреч пока пуста</EmptyState>
            ) : (
              <div className="history-list">
                {historyItems.map((meeting, index) => (
                  <article
                    className="history-item"
                    key={meeting.id || index}
                    onClick={() => setSelectedMeetingId(meeting.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="history-top">
                      <div>
                        <h3>{meeting.title}</h3>
                        <div className="meeting-meta">
                          {formatDateTime(meeting.startsAt)} · {meeting.type}
                        </div>
                      </div>

                      <span className="badge success">{getMeetingLabel(meeting)}</span>
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

      {/* ===== Планировщик ===== */}
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
              {plannerError ? (
                <div className="org-alert org-alert-error">{plannerError}</div>
              ) : null}

              <div className="planner-grid">
                <div className="field">
                  <label htmlFor="meeting-date">Дата</label>
                  <input
                    id="meeting-date"
                    name="date"
                    type="date"
                    value={plannerForm.date}
                    onChange={handlePlannerChange}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="meeting-time">Время</label>
                  <input
                    id="meeting-time"
                    name="time"
                    type="time"
                    value={plannerForm.time}
                    onChange={handlePlannerChange}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="meeting-participant">Сотрудник</label>
                <select
                  id="meeting-participant"
                  name="participantId"
                  value={plannerForm.participantId}
                  onChange={handlePlannerChange}
                >
                  <option value="2">Мария Соколова</option>
                  <option value="3">Иван Петров</option>
                  <option value="1">Алексей Ковалёв</option>
                </select>
              </div>

              <div className="planner-grid">
                <div className="field">
                  <label htmlFor="meeting-type">Тип встречи</label>
                  <select
                    id="meeting-type"
                    name="type"
                    value={plannerForm.type}
                    onChange={handlePlannerChange}
                  >
                    <option value="pr">PR 1:1</option>
                    <option value="skill-review">Skill Review</option>
                    <option value="problem-review">Problem Review</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="meeting-format">Формат</label>
                  <select
                    id="meeting-format"
                    name="format"
                    value={plannerForm.format}
                    onChange={handlePlannerChange}
                  >
                    <option value="online">Онлайн</option>
                    <option value="office">Офис</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="button secondary"
                  type="button"
                  onClick={closePlanner}
                  disabled={isCreating}
                >
                  Отмена
                </button>

                <button className="button primary" type="submit" disabled={isCreating}>
                  {isCreating ? "Создание..." : "Создать встречу"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ===== Детали встречи ===== */}
      {selectedMeetingId !== null ? (
        <MeetingDetailsModal
          meetingId={selectedMeetingId}
          onClose={() => setSelectedMeetingId(null)}
        />
      ) : null}
    </section>
  );
}