import { createPortal } from "react-dom";
import { useState } from "react";
import {
  loadOrganization,
  saveOrganization,
} from "../../data/organizationStore";

const DIRECTIONS = ["BACK", "FRONT", "QA"];

function emptyForm(departmentId = "") {
  return {
    id: "",
    fullName: "",
    direction: "BACK",
    departmentId,
    isAdmin: false,
  };
}

export default function AdminUsersPage() {
  const [initial] = useState(() => {
    try {
      return {
        data: loadOrganization(),
        error: "",
      };
    } catch {
      return {
        data: null,
        error:
          "Не удалось загрузить пользователей. Проверьте доступ к хранилищу браузера и сохранённые данные.",
      };
    }
  });

  const [data, setData] = useState(initial.data);

  const [form, setForm] = useState(() =>
    emptyForm(initial.data?.departments[0]?.id || "")
  );

  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false); // <-- Добавлено

  if (!data) {
    return (
      <section className="page">
        <h1 className="page-title">Пользователи</h1>

        <div className="org-alert org-alert-error" role="alert">
          {initial.error}
        </div>
      </section>
    );
  }

  const { employees, departments } = data;
  const isEditing = Boolean(form.id);

  function departmentName(id) {
    return (
      departments.find((department) => department.id === id)?.name ||
      "Не назначено"
    );
  }

  function managedDepartments(employeeId) {
    return departments.filter(
      (department) => department.managerId === employeeId
    );
  }

  const query = search.trim().toLocaleLowerCase("ru");

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch = employee.fullName
      .toLocaleLowerCase("ru")
      .includes(query);

    const matchesDirection =
      !directionFilter || employee.direction === directionFilter;

    const matchesDepartment =
      !departmentFilter || employee.departmentId === departmentFilter;

    return matchesSearch && matchesDirection && matchesDepartment;
  });

  const selectedManagedDepartments = isEditing
    ? managedDepartments(form.id)
    : [];

  function updateField(event) {
    const { name, type, checked, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setMessage("");
  }

  function startCreating() {
    setForm(
      emptyForm(departmentFilter || departments[0]?.id || "")
    );
    setError("");
    setMessage("");
    setShowForm(true); // <-- Показываем форму
  }

  function editEmployee(employee) {
    setForm({
      id: employee.id,
      fullName: employee.fullName,
      direction: employee.direction,
      departmentId: employee.departmentId,
      isAdmin: Boolean(employee.isAdmin),
    });
    setShowForm(true); // <-- Показываем форму при редактировании
    setError("");
    setMessage("");
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

  const fullName = form.fullName.trim();

  if (!fullName) {
    setError("Введите ФИО сотрудника.");
    return;
  }

  if (!DIRECTIONS.includes(form.direction)) {
    setError("Выберите направление.");
    return;
  }

  const departmentExists = departments.some(
    (department) => department.id === form.departmentId
  );

  if (!departmentExists) {
    setError("Выберите существующее подразделение.");
    return;
  }

  // Запоминаем: это создание или редактирование
  const wasEditing = Boolean(form.id);

  const existingEmployee = employees.find(
    (employee) => employee.id === form.id
  );

  if (wasEditing && !existingEmployee) {
    setError("Пользователь не найден. Обновите страницу.");
    return;
  }

  const employee = {
    ...existingEmployee,
    id:
      form.id ||
      `employee-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`,
    fullName,
    direction: form.direction,
    departmentId: form.departmentId,
    isAdmin: form.isAdmin,
  };

  const nextEmployees = wasEditing
    ? employees.map((item) =>
        item.id === employee.id ? employee : item
      )
    : [...employees, employee];

  const saved = commit(
    {
      ...data,
      employees: nextEmployees,
    },
    wasEditing
      ? "Данные пользователя сохранены."
      : "Добавлено"
  );

  if (!saved) {
    return;
  }

  // Редактирование — оставляем окно открытым
  if (wasEditing) {
    setForm({
      id: employee.id,
      fullName: employee.fullName,
      direction: employee.direction,
      departmentId: employee.departmentId,
      isAdmin: employee.isAdmin,
    });

    return;
  }

  setShowForm(false);

  setForm(
    emptyForm(
      departmentFilter ||
        departments[0]?.id ||
        ""
    )
  );

  setMessage("Добавлено");

  setTimeout(() => {
    setMessage("");
  }, 3000);
}

  function handleDelete() {
    if (!form.id) return;

    setError("");
    setMessage("");

    const managed = managedDepartments(form.id);

    if (managed.length > 0) {
      setError(
        `Пользователь руководит подразделениями: ${managed
          .map((department) => department.name)
          .join(", ")}. Сначала назначьте других руководителей в оргструктуре.`
      );
      return;
    }

    if (!window.confirm(`Удалить пользователя «${form.fullName}»?`)) {
      return;
    }

    const saved = commit(
      {
        ...data,
        employees: employees.filter(
          (employee) => employee.id !== form.id
        ),
      },
      "Пользователь удалён."
    );

    if (saved) {
      setForm(
        emptyForm(departmentFilter || departments[0]?.id || "")
      );
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
          <h1 className="page-title">Пользователи</h1>
          <p className="page-subtitle">
            Администрирование пользователей и распределение по подразделениям
          </p>
        </div>

        <button
          className="button primary"
          type="button"
          onClick={startCreating}
        >
          + Пользователь
        </button>
      </div>

      <div className="org-demo-note">
        Деморежим администратора. Здесь создаются тестовые записи
        сотрудников, а не реальные учётные записи для входа.
        Изменения доступны только в этом браузере.
      </div>
      {!showForm && message && (
    <div className="entity-added-message" role="status">
      {message}
    </div>
      )}

      <div className="users-layout">
        <section className="card">
          <div className="card-header">
            <h2>Список пользователей</h2>
            <span className="badge info">
              {filteredEmployees.length} / {employees.length}
            </span>
          </div>

          <div className="users-filters">
            <div className="field">
              <label htmlFor="users-search">Поиск по ФИО</label>
              <input
                id="users-search"
                type="search"
                placeholder="Введите имя сотрудника"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="users-direction">Направление</label>
              <select
                id="users-direction"
                value={directionFilter}
                onChange={(event) =>
                  setDirectionFilter(event.target.value)
                }
              >
                <option value="">Все направления</option>

                {DIRECTIONS.map((direction) => (
                  <option key={direction} value={direction}>
                    {direction}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="users-department">Подразделение</label>
              <select
                id="users-department"
                value={departmentFilter}
                onChange={(event) =>
                  setDepartmentFilter(event.target.value)
                }
              >
                <option value="">Все подразделения</option>

                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="org-help users-filter-note">
            Фильтр подразделения не включает дочерние подразделения.
          </p>

          {filteredEmployees.length === 0 ? (
            <div className="empty">
              Пользователи не найдены. Измените фильтры или добавьте
              пользователя.
            </div>
          ) : (
            <div
              className="users-table-wrap"
              role="region"
              aria-label="Таблица пользователей"
              tabIndex={0}
            >
              <table className="users-table">
                <thead>
                  <tr>
                    <th scope="col">Сотрудник</th>
                    <th scope="col">Подразделение</th>
                    <th scope="col">Статус</th>
                    <th scope="col">Действие</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEmployees.map((employee) => {
                    const managed = managedDepartments(employee.id);

                    return (
                      <tr
                        key={employee.id}
                        className={
                          form.id === employee.id ? "is-selected" : ""
                        }
                      >
                        <td>
                          <div className="item-title">
                            {employee.fullName}
                          </div>
                          <div className="item-meta">
                            {employee.direction}
                          </div>
                        </td>

                        <td>
                          {departmentName(employee.departmentId)}
                        </td>

                        <td>
                          <div className="users-statuses">
                            {employee.isAdmin && (
                              <span className="badge info">
                                Администратор
                              </span>
                            )}

                            {managed.length > 0 && (
                              <span className="badge success">
                                Руководитель
                              </span>
                            )}

                            {!employee.isAdmin &&
                              managed.length === 0 && (
                                <span className="badge neutral">
                                  Сотрудник
                                </span>
                              )}
                          </div>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="link-button"
                            aria-label={`Редактировать: ${employee.fullName}`}
                            onClick={() => editEmployee(employee)}
                          >
                            Изменить
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showForm &&
  createPortal(
    <div
      className="entity-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          cancelForm();
        }
      }}
    >
      <section
        className="entity-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="entity-modal-close"
          onClick={cancelForm}
          aria-label="Закрыть"
          title="Закрыть"
        >
          ×
        </button>

        <div className="entity-modal-header">
          <h2 id="user-modal-title">
            {isEditing
              ? "Редактирование пользователя"
              : "Новый пользователь"}
          </h2>

          <p className="entity-modal-subtitle">
            {isEditing
              ? "Измените данные сотрудника и сохраните изменения."
              : "Добавьте нового сотрудника в систему."}
          </p>
        </div>

        <form className="org-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="employee-name">
              ФИО
            </label>

            <input
              id="employee-name"
              name="fullName"
              value={form.fullName}
              onChange={updateField}
              placeholder="Иванов Иван Иванович"
              maxLength={150}
              required
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="employee-direction">
              Направление
            </label>

            <select
              id="employee-direction"
              name="direction"
              value={form.direction}
              onChange={updateField}
              required
            >
              {DIRECTIONS.map((direction) => (
                <option
                  key={direction}
                  value={direction}
                >
                  {direction}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="employee-department">
              Подразделение
            </label>

            <select
              id="employee-department"
              name="departmentId"
              value={form.departmentId}
              onChange={updateField}
              required
            >
              <option value="">
                Выберите подразделение
              </option>

              {departments.map((department) => (
                <option
                  key={department.id}
                  value={department.id}
                >
                  {department.name}
                </option>
              ))}
            </select>

            <small className="org-help">
              Чтобы перенести сотрудника, выберите другое
              подразделение и сохраните изменения.
            </small>
          </div>

          <label className="users-checkbox">
            <input
              type="checkbox"
              name="isAdmin"
              checked={form.isAdmin}
              onChange={updateField}
            />

            <span>
              Административный доступ
            </span>
          </label>

          <div className="users-access-note">
            Руководитель назначается на странице
            «Подразделения».
          </div>

          {selectedManagedDepartments.length > 0 && (
            <div>
              <div className="item-title">
                Руководит подразделениями
              </div>

              <ul className="users-managed-list">
                {selectedManagedDepartments.map(
                  (department) => (
                    <li key={department.id}>
                      {department.name}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {error && (
            <div
              className="org-alert org-alert-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {showForm && message && (
            <div
              className="org-alert org-alert-success"
              role="status"
            >
              {message}
            </div>
          )}

          <div className="org-form-actions">
            <button
              className="button primary"
              type="submit"
            >
              {isEditing
                ? "Сохранить изменения"
                : "Добавить"}
            </button>

            {isEditing && (
              <button
                className="button org-delete"
                type="button"
                onClick={handleDelete}
              >
                Удалить
              </button>
            )}

            <button
              className="button"
              type="button"
              onClick={cancelForm}
            >
              Отмена
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body
  )}
      </div>
    </section>
  );
}