const STORAGE_KEY = "pr-system.skills.v1";

export const SKILL_DIRECTIONS = ["BACK", "FRONT", "QA"];

const initialSkills = [
  {
    id: "skill-rest",
    name: "REST API",
    direction: "BACK",
    description: "Проектирование и разработка HTTP API",
  },
  {
    id: "skill-docker",
    name: "Docker",
    direction: "BACK",
    description: "Контейнеризация приложений",
  },
  {
    id: "skill-react",
    name: "React",
    direction: "FRONT",
    description: "Компоненты, состояние и жизненный цикл",
  },
  {
    id: "skill-testing",
    name: "Тест-дизайн",
    direction: "QA",
    description: "Проектирование тестовых сценариев",
  },
];

export function loadSkills() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return initialSkills.map((skill) => ({ ...skill }));
  }

  const skills = JSON.parse(raw);

  if (
    !Array.isArray(skills) ||
    !skills.every(
      (skill) =>
        skill &&
        typeof skill.id === "string" &&
        typeof skill.name === "string" &&
        SKILL_DIRECTIONS.includes(skill.direction) &&
        typeof skill.description === "string"
    ) ||
    new Set(skills.map((skill) => skill.id)).size !== skills.length
  ) {
    throw new Error("Некорректный формат справочника скиллов.");
  }

  return skills;
}

export function saveSkills(skills) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
}