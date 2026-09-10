const STORAGE_KEY = "pr-system.organization.v1";

const initialData = {
  departments: [
    {
      id: "company",
      name: "Компания",
      parentId: null,
      managerId: "employee-1",
    },
    {
      id: "backend",
      name: "Backend-разработка",
      parentId: "company",
      managerId: "employee-2",
    },
    {
      id: "frontend",
      name: "Frontend-разработка",
      parentId: "company",
      managerId: "employee-3",
    },
    {
      id: "qa",
      name: "QA",
      parentId: "company",
      managerId: "",
    },
    {
      id: "backend-a",
      name: "Backend · Team A",
      parentId: "backend",
      managerId: "",
    },
  ],

  employees: [
    {
      id: "employee-1",
      fullName: "Алексей Петров",
      departmentId: "company",
      direction: "BACK",
    },
    {
      id: "employee-2",
      fullName: "Мария Соколова",
      departmentId: "backend",
      direction: "BACK",
    },
    {
      id: "employee-3",
      fullName: "Анна Петрова",
      departmentId: "frontend",
      direction: "FRONT",
    },
    {
      id: "employee-4",
      fullName: "Максим Сидоров",
      departmentId: "qa",
      direction: "QA",
    },
  ],
};

export function loadOrganization() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    // Отдельная копия, чтобы не изменять исходные тестовые данные.
    return JSON.parse(JSON.stringify(initialData));
  }

  const data = JSON.parse(raw);

  if (
    !data ||
    !Array.isArray(data.departments) ||
    !Array.isArray(data.employees)
  ) {
    throw new Error("Некорректный формат сохранённых данных оргструктуры.");
  }

  return data;
}

export function saveOrganization(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Возвращает ID подразделения и всех его потомков.
export function getSubtreeIds(departments, departmentId) {
  const result = new Set();
  const queue = [departmentId];

  while (queue.length > 0) {
    const currentId = queue.pop();

    if (result.has(currentId)) continue;

    result.add(currentId);

    departments
      .filter((department) => department.parentId === currentId)
      .forEach((department) => queue.push(department.id));
  }

  return result;
}