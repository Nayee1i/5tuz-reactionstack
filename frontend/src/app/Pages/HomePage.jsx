const kpis = [
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
];

const skills = [
  {
    id: 1,
    name: "REST API",
    status: "Почти подтверждён",
    statusTone: "success",
    progress: 85,
  },
  {
    id: 2,
    name: "Docker",
    status: "В работе",
    statusTone: "info",
    progress: 58,
  },
  {
    id: 3,
    name: "PostgreSQL",
    status: "Есть отставание",
    statusTone: "warning",
    progress: 34,
  },
];

const meetings = [
  {
    id: 1,
    title: "1:1 с Марией Соколовой",
    date: "12 сентября",
    type: "PR",
    status: "Запланирована",
    statusTone: "info",
  },
  {
    id: 2,
    title: "Подтверждение Docker",
    date: "15 сентября",
    type: "Skill Review",
    status: "Черновик",
    statusTone: "warning",
  },
  {
    id: 3,
    title: "Итоги квартала",
    date: "28 сентября",
    type: "Team Review",
    status: "Запланирована",
    statusTone: "info",
  },
];

const problems = [
  {
    id: 1,
    title: "Отставание по PostgreSQL",
    owner: "Иван Петров",
    due: "до 24 сентября",
    level: "Средний",
  },
  {
    id: 2,
    title: "Не подтверждён CI/CD",
    owner: "Мария Соколова",
    due: "до 30 сентября",
    level: "Высокий",
  },
];

export default function HomePage() {
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Добрый день, Алексей 👋</h1>
          <p className="page-subtitle">
            Ваш рабочий центр: обучение, встречи и прогресс команды
          </p>
        </div>

        <div className="page-actions">
          <button className="button secondary" type="button">
            Открыть аналитику
          </button>
          <button className="button primary" type="button">
            Новая встреча
          </button>
        </div>
      </header>

      <div className="grid">
        <section className="card span-12">
          <div className="kpi-grid">
            {kpis.map((kpi) => (
              <article className="kpi" key={kpi.id}>
                <span className="kpi-label">{kpi.label}</span>
                <strong className="kpi-value">{kpi.value}</strong>
                <span className="kpi-note">{kpi.note}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="card span-7">
          <div className="card-header">
            <h2>План развития навыков</h2>
            <span className="badge info">BACK</span>
          </div>

          <div className="stack">
            {skills.map((skill) => (
              <article className="skill-row" key={skill.id}>
                <div className="skill-top">
                  <h3>{skill.name}</h3>
                  <span className={`badge ${skill.statusTone}`}>
                    {skill.status}
                  </span>
                </div>

                <div
                  className="progress"
                  role="progressbar"
                  aria-valuenow={skill.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="progress-bar"
                    style={{ width: `${skill.progress}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="card span-5">
          <div className="card-header">
            <h2>Ближайшие встречи</h2>
            <button className="link-button" type="button">
              Все
            </button>
          </div>

          <div className="list">
            {meetings.map((meeting) => (
              <article className="list-item" key={meeting.id}>
                <div>
                  <div className="item-title">{meeting.title}</div>
                  <div className="item-meta">
                    {meeting.date} · {meeting.type}
                  </div>
                </div>

                <span className={`badge ${meeting.statusTone}`}>
                  {meeting.status}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="card span-8">
          <div className="card-header">
            <h2>Проблемы и риски</h2>
            <span className="badge warning">Требуют внимания</span>
          </div>

          <div className="list">
            {problems.map((problem) => (
              <article className="list-item" key={problem.id}>
                <div>
                  <div className="item-title">{problem.title}</div>
                  <div className="item-meta">
                    {problem.owner} · {problem.due}
                  </div>
                </div>

                <span className="badge danger">{problem.level}</span>
              </article>
            ))}
          </div>
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
              Провести 1:1
            </button>
            <button className="button secondary full" type="button">
              Прикрепить материалы
            </button>
            <button className="button secondary full" type="button">
              Посмотреть профиль
            </button>
          </div>

          <div className="chips">
            <span className="chip">Наставник</span>
            <span className="chip">3 скилла подряд</span>
            <span className="chip">Без просрочек</span>
          </div>
        </section>
      </div>
    </section>
  );
}