export const dashboardMock = {
  user: {
    id: 1,
    firstName: "Алексей",
    lastName: "Ковалёв",
    fullName: "Алексей Ковалёв",
    direction: "BACK",
    department: "Backend Platform",
    manager: "Иван Смирнов",
  },

  kpis: [
    {
      id: "plan",
      label: "Выполнение годового плана",
      value: "68%",
      note: "+12% за месяц",
    },
    {
      id: "skills",
      label: "Подтверждено скиллов",
      value: "14 / 22",
      note: "3 ожидают встречи",
    },
    {
      id: "meetings",
      label: "Встречи за месяц",
      value: "6",
      note: "2 запланированы",
    },
    {
      id: "problems",
      label: "Открытые проблемы",
      value: "2",
      note: "1 требует внимания",
    },
  ],

  skills: [
    {
      id: 1,
      name: "REST API",
      progress: 85,
      status: "almost_confirmed",
      statusLabel: "Почти подтверждён",
    },
    {
      id: 2,
      name: "Docker",
      progress: 58,
      status: "in_progress",
      statusLabel: "В работе",
    },
    {
      id: 3,
      name: "PostgreSQL",
      progress: 34,
      status: "at_risk",
      statusLabel: "Есть отставание",
    },
  ],

  meetings: [
    {
      id: 1,
      title: "1:1 с Марией Соколовой",
      startsAt: "2026-09-12T10:00:00",
      type: "PR",
      status: "planned",
      statusLabel: "Запланирована",
    },
    {
      id: 2,
      title: "Подтверждение Docker",
      startsAt: "2026-09-15T14:30:00",
      type: "Skill Review",
      status: "draft",
      statusLabel: "Черновик",
    },
    {
      id: 3,
      title: "Итоги квартала",
      startsAt: "2026-09-28T11:00:00",
      type: "Team Review",
      status: "planned",
      statusLabel: "Запланирована",
    },
  ],

  problems: [
    {
      id: 1,
      title: "Отставание по PostgreSQL",
      owner: "Иван Петров",
      dueDate: "2026-09-24",
      severity: "medium",
      severityLabel: "Средний",
    },
    {
      id: 2,
      title: "Не подтверждён CI/CD",
      owner: "Мария Соколова",
      dueDate: "2026-09-30",
      severity: "high",
      severityLabel: "Высокий",
    },
  ],

  achievements: ["Наставник", "3 скилла подряд"],
};