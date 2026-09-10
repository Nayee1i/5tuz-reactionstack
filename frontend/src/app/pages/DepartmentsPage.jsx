import { useState } from "react";
import {
  getSubtreeIds,
  loadOrganization,
  saveOrganization,
} from "../../data/organizationStore";

function emptyForm(parentId = "company") {
  return {
    id: "",
    name: "",
    parentId,
    managerId: "",
  };
}

function DepartmentTree({
  departments,
  employees,
  parentId,
  selectedId,
  onSelect,
}) {
  const children = departments.filter(
    (department) => department.parentId === parentId
  );

  if (children.length === 0) return null;

  return (
    <ul className="org-tree">
      {children.map((department) => {
        const manager = employees.find(
          (employee) => employee.id === department.managerId
        );

        const employeeCount = employees.filter(
          (employee) => employee.departmentId === department.id
        ).length;

        return (
          <li key={department.id}>
            <button
              type="button"
              className={`org-node ${
                selectedId === department.id ? "is-selected" : ""
              }`}
              aria-pressed={selectedId === department.id}
              onClick={() => onSelect(department)}
            >
              <span className="org-node-title">{department.name}</span>

              <span className="org-node-meta">
                Руководитель: {manager?.fullName || "Не назначен"}
              </span>

              <span className="org-node-meta">
                Сотрудников непосредственно в подразделении: {employeeCount}
              </span>
            </button>

            <DepartmentTree
              departments={departments}
              employees={employees}
              parentId={department.id}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          </li>
        );
      })}
    </ul>
  );
}

export default function DepartmentsPage() {
  const [initial] = useState(() => {
    try {
      return { data: loadOrganization(), error: "" };
    } catch {
      return {
        data: null,
        error:
          "Не удалось прочитать данные оргструктуры. Проверьте доступ к хранилищу браузера и сохранённые данные.",
      };
    }
  });

  const [data, setData] = useState(initial.data);
  const [form, setForm] = useState(() => emptyForm());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false); // <-- Добавлено

  if (!data) {
    return (
      <section className="page">
        <h1 className="page-title">Подразделения</h1>

        <div className="org-alert org-alert-error" role="alert">
          {initial.error}
        </div>
      </section>
    );
  }

  const { departments, employees } = data;

  const isEditing = Boolean(form.id);
  const isRoot = isEditing && form.parentId === null;

  const excludedParentIds = isEditing
    ? getSubtreeIds(departments, form.id)
    : new Set();

  const parentOptions = departments.filter(
    (department) => !excludedParentIds.has(department.id)
  );

  const selectedEmployees = employees.filter(
    (employee) => employee.departmentId === form.id
  );

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setMessage("");
  }

  function selectDepartment(department) {
    setForm({ ...department });
    setShowForm(true); // <-- Показываем форму при выборе
    setError("");
    setMessage("");
  }

  function startCreating() {
    setForm(emptyForm(form.id || "company"));
    setError("");
    setMessage("");
    setShowForm(true); // <-- Показываем форму
  }

  function commit(nextData, successMessage) {
    try {
      saveOrganization(nextData);
      setData(nextData);
      setError("");
      setMessage(successMessage);
      return true;
    } catch {
      setMessage("");
      setError(
        "Не удалось сохранить изменения. Проверьте доступность и свободное место в хранилище браузера."
      );
      return false;
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const name = form.name.trim();

    if (!name) {
      setError("Введите название подразделения.");
      return;
    }

    if (!isRoot) {
      const parentExists = departments.some(
        (department) => department.id === form.parentId
      );

      if (!parentExists) {
        setError("Выберите родительское подразделение.");
        return;
      }

      if (excludedParentIds.has(form.parentId)) {
        setError("Нельзя переносить подразделение в себя или своего потомка.");
        return;
      }
    }

    if (
      form.managerId &&
      !employees.some((employee) => employee.id === form.managerId)
    ) {
      setError("Выбранный руководитель не найден.");
      return;
    }

    const department = {
      id:
        form.id ||
        `department-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      name,
      parentId: isRoot ? null : form.parentId,
      managerId: form.managerId,
    };

    const nextDepartments = isEditing
      ? departments.map((item) =>
          item.id === department.id ? department : item
        )
      : [...departments, department];

    const saved = commit(
      { ...data, departments: nextDepartments },
      isEditing ? "Подразделение обновлено." : "Подразделение создано."
    );

    if (saved) {
      setForm(department);
    }
  }

  function handleDelete() {
    setError("");
    setMessage("");

    if (!form.id || isRoot) return;

    const hasChildren = departments.some(
      (department) => department.parentId === form.id
    );

    const hasEmployees = employees.some(
      (employee) => employee.departmentId === form.id
    );

    if (hasChildren || hasEmployees) {
      setError(
        "Сначала перенесите дочерние подразделения и сотрудников. Удалить можно только пустое подразделение."
      );
      return;
    }

    if (!window.confirm(`Удалить подразделение «${form.name}»?`)) {
      return;
    }

    const saved = commit(
      {
        ...data,
        departments: departments.filter(
          (department) => department.id !== form.id
        ),
      },
      "Подразделение удалено."
    );

    if (saved) {
      setForm(emptyForm());
      setShowForm(false); // <-- Скрываем форму после удаления
    }
  }

  function cancelForm() {
    setShowForm(false); // <-- Новая функция для отмены
    setError("");
    setMessage("");
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Подразделения</h1>
          <p className="page-subtitle">
            Структура компании, руководители и состав подразделений
          </p>
        </div>

        <button
          type="button"
          className="button primary"
          onClick={startCreating}
        >
          + Подразделение
        </button>
      </div>

      <div className="org-demo-note">
        Деморежим: изменения сохраняются только в этом браузере.
        Серверная авторизация пока не подключена.
      </div>

      <div className="org-layout">
        <section className="card org-tree-panel">
          <div className="card-header">
            <h2>Оргструктура</h2>
            <span className="badge info">{departments.length}</span>
          </div>

          <DepartmentTree
            departments={departments}
            employees={employees}
            parentId={null}
            selectedId={form.id}
            onSelect={selectDepartment}
          />
        </section>

        {showForm && ( // <-- Условный рендеринг формы
          <section className="card">
            <div className="card-header">
              <h2>
                {isEditing ? "Редактирование" : "Новое подразделение"}
              </h2>
            </div>

            <form className="org-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="department-name">Название</label>
                <input
                  id="department-name"
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder="Например, Backend · Team B"
                  maxLength={120}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="department-parent">
                  Родительское подразделение
                </label>

                <select
                  id="department-parent"
                  name="parentId"
                  value={form.parentId ?? ""}
                  onChange={updateField}
                  disabled={isRoot}
                  required={!isRoot}
                >
                  {isRoot ? (
                    <option value="">Корень структуры</option>
                  ) : (
                    <>
                      <option value="">Выберите подразделение</option>
                      {parentOptions.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>

                <small className="org-help">
                  Смена родителя переносит подразделение вместе со всем
                  его поддеревом. Корень структуры в этом прототипе фиксирован.
                </small>
              </div>

              <div className="field">
                <label htmlFor="department-manager">Руководитель</label>

                <select
                  id="department-manager"
                  name="managerId"
                  value={form.managerId}
                  onChange={updateField}
                >
                  <option value="">Не назначен</option>

                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="org-alert org-alert-error" role="alert">
                  {error}
                </div>
              )}

              {message && (
                <div className="org-alert org-alert-success" role="status">
                  {message}
                </div>
              )}

              <div className="org-form-actions">
                <button type="submit" className="button primary">
                  {isEditing ? "Сохранить изменения" : "Создать"}
                </button>

                {isEditing && !isRoot && (
                  <button
                    type="button"
                    className="button org-delete"
                    onClick={handleDelete}
                  >
                    Удалить
                  </button>
                )}

                <button
                  type="button"
                  className="button"
                  onClick={cancelForm}
                >
                  Отмена
                </button>
              </div>
            </form>

            {isEditing && (
              <div className="org-members">
                <h3>Сотрудники подразделения</h3>

                {selectedEmployees.length === 0 ? (
                  <div className="empty">
                    В этом подразделении пока нет сотрудников.
                  </div>
                ) : (
                  <div className="list">
                    {selectedEmployees.map((employee) => (
                      <div className="list-item" key={employee.id}>
                        <span>{employee.fullName}</span>
                        <span className="badge info">
                          {employee.direction}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </section>
  );
}