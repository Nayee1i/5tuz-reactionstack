const now = new Date();

function shiftMinutes(minutes) {
  return new Date(now.getTime() + minutes * 60000).toISOString();
}

const ongoingMeeting = {
  id: 1,
  title: "PR 1:1 с Марией Соколовой",
  type: "PR",
  format: "Онлайн",
  startsAt: shiftMinutes(-15),
  endsAt: shiftMinutes(30),
  status: "ongoing",
  statusLabel: "Идёт сейчас",
  link: "https://meet.skillflow.local/pr-1",
  conductor: {
    id: 1,
    firstName: "Алексей",
    lastName: "Ковалёв",
    fullName: "Алексей Ковалёв",
    position: "Team Lead",
  },
  participant: {
    id: 2,
    firstName: "Мария",
    lastName: "Соколова",
    fullName: "Мария Соколова",
    position: "Backend Developer",
    direction: "BACK",
  },
};

export const meetingsStatusMock = {
  ongoing: ongoingMeeting,
  next: {
    id: 2,
    title: "Подтверждение Docker",
    type: "Skill Review",
    format: "Онлайн",
    startsAt: shiftMinutes(60 * 4),
    endsAt: shiftMinutes(60 * 5),
    status: "scheduled",
    statusLabel: "Запланирована",
  },
  upcomingCount: 4,
};

export const upcomingMeetingsMock = [
  ongoingMeeting,
  {
    id: 2,
    title: "Подтверждение Docker",
    type: "Skill Review",
    format: "Онлайн",
    startsAt: shiftMinutes(60 * 4),
    endsAt: shiftMinutes(60 * 5),
    status: "scheduled",
    statusLabel: "Запланирована",
    conductor: {
      id: 1,
      fullName: "Алексей Ковалёв",
      position: "Team Lead",
    },
    participant: {
      id: 3,
      fullName: "Иван Петров",
      position: "Junior Backend Developer",
      direction: "BACK",
    },
  },
  {
    id: 3,
    title: "1:1 по годовому плану",
    type: "PR",
    format: "Офис",
    startsAt: shiftMinutes(60 * 24),
    endsAt: shiftMinutes(60 * 25),
    status: "scheduled",
    statusLabel: "Запланирована",
    conductor: {
      id: 12,
      fullName: "Иван Смирнов",
      position: "Engineering Manager",
    },
    participant: {
      id: 1,
      fullName: "Алексей Ковалёв",
      position: "Team Lead",
      direction: "BACK",
    },
  },
  {
    id: 4,
    title: "Обсуждение проблем по PostgreSQL",
    type: "Problem Review",
    format: "Онлайн",
    startsAt: shiftMinutes(60 * 30),
    endsAt: shiftMinutes(60 * 30.5),
    status: "draft",
    statusLabel: "Черновик",
    conductor: {
      id: 1,
      fullName: "Алексей Ковалёв",
      position: "Team Lead",
    },
    participant: {
      id: 3,
      fullName: "Иван Петров",
      position: "Junior Backend Developer",
      direction: "BACK",
    },
  },
];

export const meetingsHistoryMock = {
  page: 1,
  pageSize: 10,
  total: 3,
  items: [
    {
      id: 101,
      title: "PR 1:1 с Марией Соколовой",
      type: "PR",
      format: "Онлайн",
      startsAt: "2026-08-28T10:00:00",
      endsAt: "2026-08-28T10:45:00",
      status: "completed",
      statusLabel: "Итоги подведены",
      conductor: {
        id: 1,
        fullName: "Алексей Ковалёв",
        position: "Team Lead",
      },
      participant: {
        id: 2,
        fullName: "Мария Соколова",
        position: "Backend Developer",
        direction: "BACK",
      },
      summary:
        "Обсудили прогресс по REST API и Docker. Мария подтвердила базовое понимание проектирования REST. По Docker есть пробелы в работе с multi-stage сборками. Договорились подготовить практический пример к следующей встрече.",
      confirmedSkillsCount: 1,
      problemsCount: 1,
      attachmentsCount: 2,
    },
    {
      id: 102,
      title: "Подтверждение Git",
      type: "Skill Review",
      format: "Онлайн",
      startsAt: "2026-07-14T14:00:00",
      endsAt: "2026-07-14T14:30:00",
      status: "completed",
      statusLabel: "Итоги подведены",
      conductor: {
        id: 1,
        fullName: "Алексей Ковалёв",
        position: "Team Lead",
      },
      participant: {
        id: 3,
        fullName: "Иван Петров",
        position: "Junior Backend Developer",
        direction: "BACK",
      },
      summary:
        "Иван показал уверенную работу с ветками, merge request и rebase. Скилл Git подтверждён. Рекомендовано изучить стратегии версионирования.",
      confirmedSkillsCount: 1,
      problemsCount: 0,
      attachmentsCount: 1,
    },
    {
      id: 103,
      title: "Промежуточный обзор плана обучения",
      type: "PR",
      format: "Офис",
      startsAt: "2026-06-02T11:00:00",
      endsAt: "2026-06-02T11:40:00",
      status: "completed",
      statusLabel: "Итоги подведены",
      conductor: {
        id: 12,
        fullName: "Иван Смирнов",
        position: "Engineering Manager",
      },
      participant: {
        id: 1,
        fullName: "Алексей Ковалёв",
        position: "Team Lead",
        direction: "BACK",
      },
      summary:
        "Обсудили годовой план Алексея. Согласовали сроки подтверждения PostgreSQL и CI/CD. Отмечена потребность в менторстве по архитектуре.",
      confirmedSkillsCount: 0,
      problemsCount: 1,
      attachmentsCount: 0,
    },
  ],
};