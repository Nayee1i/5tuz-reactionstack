import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "http://159.194.230.135:3001/api";

function emptyForm(departmentId = "") {
  return {
    id: "",
    fullName: "",
    directionId: "",
    departmentId,
    isAdmin: false,
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [directions, setDirections] = useState([]);
  
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const pageAnimation = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.15, ease: "easeIn" } },
  };
  const modalOverlayAnimation = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };
  const modalContentAnimation = {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15, ease: "easeIn" } },
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [search, directionFilter, departmentFilter]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, deptsRes, dirsRes] = await Promise.all([
        fetch(`${API_URL}/users`),
        fetch(`${API_URL}/departments`),
        fetch(`${API_URL}/directions`),
      ]);

      if (!usersRes.ok || !deptsRes.ok || !dirsRes.ok) {
        throw new Error("Ошибка сети при загрузке данных");
      }

      const usersData = await usersRes.json();
      const deptsData = await deptsRes.json();
      const dirsData = await dirsRes.json();

      // 🛡️ ЗАЩИТА: Проверяем, что пришли именно массивы
      if (Array.isArray(usersData)) setUsers(usersData);
      else {
        console.error("Бэкенд вернул не массив users:", usersData);
        setError("Ошибка формата данных пользователей");
      }

      if (Array.isArray(deptsData)) setDepartments(deptsData);
      if (Array.isArray(dirsData)) setDirections(dirsData);
      
      if (Array.isArray(deptsData) && deptsData.length > 0) {
        setForm(prev => ({ ...prev, departmentId: deptsData[0].id }));
      }
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить данные. Проверьте, запущен ли бэкенд на порту 3001.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (directionFilter) params.append("directionId", directionFilter);
      if (departmentFilter) params.append("departmentId", departmentFilter);

      const res = await fetch(`${API_URL}/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // 🛡️ ЗАЩИТА: Обновляем стейт только если это массив
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          console.error("Бэкенд вернул не массив при фильтрации:", data);
          setError("Ошибка при фильтрации: неверный формат данных");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || "Ошибка при фильтрации");
      }
    } catch (err) {
      console.error("Ошибка фильтрации:", err);
      setError("Ошибка сети при фильтрации");
    }
  };

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
    setForm(emptyForm(departmentFilter || departments[0]?.id || ""));
    setError("");
    setMessage("");
    setShowForm(true);
  }

  function editEmployee(employee) {
    setForm({
      id: employee.id,
      fullName: employee.fullName,
      directionId: employee.directionId,
      departmentId: employee.departmentId,
      isAdmin: Boolean(employee.isAdmin),
    });
    setShowForm(true);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const fullName = form.fullName.trim();
    if (!fullName) {
      setError("Введите ФИО сотрудника.");
      return;
    }
    if (!form.directionId) {
      setError("Выберите направление.");
      return;
    }

    const isEditing = Boolean(form.id);
    const url = isEditing ? `${API_URL}/users/${form.id}` : `${API_URL}/users`;
    const method = isEditing ? "PUT" : "POST";

    const defaultLogin = isEditing ? undefined : `${fullName.toLowerCase().replace(/\s+/g, '.')}@company.test`;
    const defaultPassword = isEditing ? undefined : "123456";

    const payload = {
      fullName,
      directionId: form.directionId,
      departmentId: form.departmentId || null,
      isAdmin: form.isAdmin,
      ...(defaultLogin && { login: defaultLogin, password: defaultPassword }),
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка сервера");

      setMessage(isEditing ? "Данные пользователя сохранены." : `Пользователь добавлен. Логин: ${defaultLogin}, Пароль: ${defaultPassword}`);
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!form.id) return;
    if (!window.confirm(`Удалить пользователя «${form.fullName}»?`)) return;

    try {
      const res = await fetch(`${API_URL}/users/${form.id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Ошибка удаления");

      setMessage("Пользователь удалён.");
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  }

  function cancelForm() {
    setShowForm(false);
    setError("");
    setMessage("");
  }

  if (isLoading) {
    return (
      <motion.section className="page" {...pageAnimation}>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Загрузка данных...</p>
        </div>
      </motion.section>
    );
  }

  // 🛡️ ГЛАВНОЕ ИСПРАВЛЕНИЕ: Гарантируем, что filteredUsers ВСЕГДА массив
  const filteredUsers = Array.isArray(users) ? users : [];

  return (
    <motion.section className="page" {...pageAnimation}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Пользователи</h1>
          <p className="page-subtitle">
            Администрирование пользователей и распределение по подразделениям
          </p>
        </div>
        <button className="button primary" type="button" onClick={startCreating}>
          + Пользователь
        </button>
      </div>

      {error && <div className="org-alert org-alert-error" style={{marginBottom: '16px'}} role="alert">{error}</div>}

      <div className="grid">
        <section className="card span-12">
          <div className="card-header">
            <h2>Список пользователей</h2>
            <span className="badge info">{filteredUsers.length} найдено</span>
          </div>
          
          <div className="users-filters">
            <div className="field">
              <label htmlFor="users-search">Поиск по ФИО</label>
              <input
                id="users-search"
                type="search"
                placeholder="Введите имя сотрудника"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="users-direction">Направление</label>
              <select
                id="users-direction"
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
              >
                <option value="">Все направления</option>
                {Array.isArray(directions) && directions.map((dir) => (
                  <option key={dir.id} value={dir.id}>{dir.name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="users-department">Подразделение</label>
              <select
                id="users-department"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">Все подразделения</option>
                {Array.isArray(departments) && departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="empty">Пользователи не найдены. Измените фильтры или добавьте пользователя.</div>
          ) : (
            <div className="users-table-wrap" role="region" aria-label="Таблица пользователей" tabIndex={0}>
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
                  {filteredUsers.map((employee) => (
                    <tr key={employee.id} className={form.id === employee.id ? "is-selected" : ""}>
                      <td>
                        <div className="item-title">{employee.fullName}</div>
                        <div className="item-meta">{employee.direction}</div>
                      </td>
                      <td>{employee.departmentName}</td>
                      <td>
                        <div className="users-statuses">
                          {employee.isAdmin && <span className="badge info">Администратор</span>}
                          {employee.managedDepartments?.length > 0 && (
                            <span className="badge success">Руководитель</span>
                          )}
                          {!employee.isAdmin && (!employee.managedDepartments || employee.managedDepartments.length === 0) && (
                            <span className="badge neutral">Сотрудник</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => editEmployee(employee)}
                        >
                          Изменить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div className="modal-overlay" {...modalOverlayAnimation} onClick={cancelForm}>
            <motion.div className="modal-content" {...modalContentAnimation} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{form.id ? "Редактирование пользователя" : "Новый пользователь"}</h2>
                <button className="modal-close" type="button" onClick={cancelForm} aria-label="Закрыть">×</button>
              </div>
              
              <form className="org-form" onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="employee-name">ФИО</label>
                  <input
                    id="employee-name"
                    name="fullName"
                    value={form.fullName}
                    onChange={updateField}
                    placeholder="Иванов Иван Иванович"
                    maxLength={150}
                    required
                  />
                </div>
                
                <div className="field">
                  <label htmlFor="employee-direction">Направление</label>
                  <select
                    id="employee-direction"
                    name="directionId"
                    value={form.directionId}
                    onChange={updateField}
                    required
                  >
                    <option value="">Выберите направление</option>
                    {Array.isArray(directions) && directions.map((dir) => (
                      <option key={dir.id} value={dir.id}>{dir.name}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="employee-department">Подразделение</label>
                  <select
                    id="employee-department"
                    name="departmentId"
                    value={form.departmentId}
                    onChange={updateField}
                    required
                  >
                    <option value="">Выберите подразделение</option>
                    {Array.isArray(departments) && departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <label className="users-checkbox">
                  <input
                    type="checkbox"
                    name="isAdmin"
                    checked={form.isAdmin}
                    onChange={updateField}
                  />
                  <span>Административный доступ</span>
                </label>

                {error && <div className="org-alert org-alert-error" role="alert">{error}</div>}
                {message && <div className="org-alert org-alert-success" role="status">{message}</div>}

                <div className="modal-actions">
                  {form.id && (
                    <button className="button org-delete" type="button" onClick={handleDelete}>
                      Удалить
                    </button>
                  )}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="button secondary" type="button" onClick={cancelForm}>Отмена</button>
                    <button className="button primary" type="submit">
                      {form.id ? "Сохранить изменения" : "Добавить"}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}