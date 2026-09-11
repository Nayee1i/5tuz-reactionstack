import { upcomingMeetingsMock, meetingsHistoryMock } from "./meetings.mock";

// Пользователи для выбора участника в планировщике (мок)
export const mockUsers = [
  { id: 1, fullName: "Алексей Ковалёв", position: "Team Lead", direction: "BACK" },
  { id: 2, fullName: "Мария Соколова", position: "Backend Developer", direction: "BACK" },
  { id: 3, fullName: "Иван Петров", position: "Junior Backend Developer", direction: "BACK" },
];

const CURRENT_USER_ID = 1;

const TYPE_LABELS = {
  pr: "PR 1:1",
  "skill-review": "Skill Review",
  "problem-review": "Problem Review",
};

// «Таблица» meetings: сид из моков + созданные встречи
let meetings = [
  ...upcomingMeetingsMock.map((m) => ({ ...m })),
  ...meetingsHistoryMock.items.map((m) => ({ ...m })),
];

let nextId = 1000;

function getUser(id) {
  return mockUsers.find((u) => u.id === Number(id)) || null;
}

// Статус ongoing считаем по окну [startsAt, endsAt]
function withComputedStatus(meeting) {
  if (meeting.status === "completed" || meeting.status === "cancelled") {
    return { ...meeting, isOngoing: false };
  }

  const now = Date.now();
  const start = new Date(meeting.startsAt).getTime();
  const end = meeting.endsAt
    ? new Date(meeting.endsAt).getTime()
    : start + 45 * 60000;

  if (now >= start && now <= end) {
    return { ...meeting, status: "ongoing", statusLabel: "Идёт сейчас", isOngoing: true };
  }

  return { ...meeting, isOngoing: false };
}

export function selectAllMeetings() {
  return meetings.map(withComputedStatus);
}

export function selectUpcomingMeetings() {
  return selectAllMeetings()
    .filter((m) => m.status !== "completed" && m.status !== "cancelled")
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

export function selectHistoryMeetings(page = 1, pageSize = 10) {
  const items = selectAllMeetings()
    .filter((m) => m.status === "completed")
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt));

  return { items, total: items.length, page, pageSize };
}

export function selectMeetingById(id) {
  const found = meetings.find((m) => String(m.id) === String(id));
  return found ? withComputedStatus(found) : null;
}

export function selectMeetingsStatus() {
  const all = selectAllMeetings();
  const ongoing = all.find((m) => m.status === "ongoing") || null;

  const future = all
    .filter((m) => m.status === "scheduled" || m.status === "draft")
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

  return {
    ongoing,
    next: future[0] || null,
    upcomingCount: future.length + (ongoing ? 1 : 0),
  };
}

// INSERT INTO meetings ...
export function insertMeeting(payload) {
  const participant = getUser(payload.participantId);
  const conductor = getUser(CURRENT_USER_ID);
  const typeLabel = TYPE_LABELS[payload.type] || "PR 1:1";

  const meeting = {
    id: nextId++,
    title: `${typeLabel} с ${participant ? participant.fullName : "сотрудником"}`,
    type: typeLabel,
    format: payload.format === "office" ? "Офис" : "Онлайн",
    startsAt: payload.startsAt,
    endsAt: payload.endsAt,
    status: "scheduled",
    statusLabel: "Запланирована",
    link: null,
    conductor: conductor ? { ...conductor } : null,
    participant: participant ? { ...participant } : null,
    summary: "",
    confirmedSkillsCount: 0,
    problemsCount: 0,
    attachmentsCount: 0,
  };

  meetings = [...meetings, meeting];
  return meeting;
}

// DELETE FROM meetings WHERE id = :id AND status IN ('scheduled','draft')
export function deleteMeetingById(id) {
  const found = meetings.find((m) => String(m.id) === String(id));

  if (!found) {
    throw new Error("Встреча не найдена");
  }

  const current = withComputedStatus(found);

  if (current.status === "completed" || current.status === "ongoing") {
    throw new Error("Удалить можно только запланированную встречу");
  }

  meetings = meetings.filter((m) => String(m.id) !== String(id));
  return current;
}