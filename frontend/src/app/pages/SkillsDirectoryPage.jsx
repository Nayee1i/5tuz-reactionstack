import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Вспомогательная функция для создания пустой формы. 
// Теперь используем directionId вместо строки direction
function emptyForm(directions = []) {
  return {
    id: "",
    name: "",
    directionId: directions.length > 0 ? directions[0].id : "",
    description: "",
  };
}

export default function SkillsDirectoryPage() {
  const [skills, setSkills] = useState([]);
  const [directions, setDirections] = useState([]);
  const [form, setForm] = useState(() => emptyForm([]));
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. ЗАГРУЗКА ДАННЫХ С СЕРВЕРА ПРИ МОНТИРОВАНИИ
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [skillsRes, dirsRes] = await Promise.all([
          fetch('/api/skills'),
          fetch('/api/skills/directions')
        ]);
        
        if (!skillsRes.ok || !dirsRes.ok) throw new Error('Ошибка сети при загрузке данных');
        
        const skillsData = await skillsRes.json();
        const dirsData = await dirsRes.json();
        
        setSkills(skillsData);
        setDirections(dirsData);
        setForm(emptyForm(dirsData)); // Инициализируем форму с реальным первым направлением
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить данные с сервера. Проверьте подключение.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Если пришли с главной с параметром ?new=1 — сразу открываем форму создания
  useEffect(() => {
    if (searchParams.get("new") === "1" && directions.length > 0) {
      startCreating();
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("new");
      setSearchParams(nextParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams, directions]);

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

  if (isLoading) {
    return (
      <motion.section className="skills-directory" {...pageAnimation}>
        <h1>Справочник скиллов</h1>
        <div className="sd-notice">Загрузка данных...</div>
      </motion.section>
    );
  }

  const isEditing = Boolean(form.id);
  const query = search.trim().toLocaleLowerCase("ru");
  
  const filteredSkills = skills
    .filter((skill) => {
      // Фильтр по directionId
      const matchesDirection = !directionFilter || skill.directionId === directionFilter;
      const matchesSearch = `${skill.name} ${skill.description || ""}`.toLocaleLowerCase("ru").includes(query);
      return matchesDirection && matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  function clearMessages() {
    setError("");
    setMessage("");
  }

  function startCreating() {
    setForm(emptyForm(directions));
    clearMessages();
    setShowForm(true);
  }

  function editSkill(skill) {
    setForm({ 
      id: skill.id, 
      name: skill.name, 
      directionId: skill.directionId, 
      description: skill.description || "" 
    });
    clearMessages();
    setShowForm(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    clearMessages();
  }

  // 2. ОТПРАВКА ФОРМЫ НА СЕРВЕР
  async function handleSubmit(event) {
    event.preventDefault();
    clearMessages();
    
    const name = form.name.trim();
    const description = form.description.trim();
    
    if (!name) {
      setError("Введите название скилла.");
      return;
    }
    if (!form.directionId) {
      setError("Выберите направление.");
      return;
    }

    try {
      const url = isEditing ? `/api/skills/${form.id}` : '/api/skills';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          description, 
          directionId: form.directionId 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка сохранения на сервере');
        return;
      }

      // Успех! Обновляем локальный стейт
      if (isEditing) {
        setSkills(prev => prev.map(item => item.id === data.id ? data : item));
        setMessage("Скилл успешно обновлён.");
      } else {
        setSkills(prev => [...prev, data]);
        setMessage("Скилл успешно добавлен.");
      }
      
      setForm(data); // Обновляем форму реальными данными с сервера (с настоящим ID)
      setShowForm(false); // Можно оставить true, если хотите продолжить редактирование, но обычно закрывают
      
    } catch (err) {
      console.error(err);
      setError("Сетевая ошибка при сохранении.");
    }
  }

  // 3. УДАЛЕНИЕ ЧЕРЕЗ СЕРВЕР
  async function handleDelete() {
    if (!form.id) return;
    clearMessages();
    
    if (!window.confirm(`Архивировать скилл «${form.name}»? (Он исчезнет из справочника, но сохранится в старых планах)`)) {
      return;
    }

    try {
      const response = await fetch(`/api/skills/${form.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Ошибка удаления');
        return;
      }

      setSkills(prev => prev.filter(skill => skill.id !== form.id));
      setMessage("Скилл архивирован.");
      setShowForm(false);
      setForm(emptyForm(directions));
      
    } catch (err) {
      console.error(err);
      setError("Сетевая ошибка при удалении.");
    }
  }

  function cancelForm() {
    setShowForm(false);
    clearMessages();
    setForm(emptyForm(directions));
  }

  return (
    <motion.section className="skills-directory" {...pageAnimation}>
      <header className="sd-header">
        <div>
          <h1>Справочник скиллов</h1>
          <p>Технические навыки по направлениям</p>
        </div>
        <button className="sd-button sd-primary" type="button" onClick={startCreating}>
          + Добавить скилл
        </button>
      </header>

      <div className="sd-notice">
        Данные синхронизируются с сервером.
      </div>

      <section className="sd-panel">
        <div className="sd-panel-heading">
          <h2>Навыки</h2>
          <span className="sd-counter">{filteredSkills.length} / {skills.length}</span>
        </div>
        
        <div className="sd-filters">
          <label className="sd-field">
            <span>Поиск</span>
            <input
              type="search"
              placeholder="Название или описание"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="sd-field">
            <span>Направление</span>
            <select
              value={directionFilter}
              onChange={(event) => setDirectionFilter(event.target.value)}
            >
              <option value="">Все направления</option>
              {directions.map((dir) => (
                <option key={dir.id} value={dir.id}>{dir.name}</option>
              ))}
            </select>
          </label>
        </div>

        {filteredSkills.length === 0 ? (
          <div className="sd-empty">Скиллы не найдены. Измените фильтры или добавьте новый.</div>
        ) : (
          <ul className="sd-list">
            {filteredSkills.map((skill) => (
              <li key={skill.id}>
                <button
                  type="button"
                  className={`sd-skill ${form.id === skill.id ? "sd-selected" : ""}`}
                  aria-pressed={form.id === skill.id}
                  onClick={() => editSkill(skill)}
                >
                  <span className="sd-skill-heading">
                    <strong>{skill.name}</strong>
                    {/* skill.direction приходит с бэкенда как объект {id, name} благодаря include в Prisma */}
                    <span className="sd-tag">{skill.direction?.name || "Не указано"}</span>
                  </span>
                  <span className="sd-description">{skill.description || "Без описания"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* МОДАЛЬНОЕ ОКНО */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="modal-overlay"
            {...modalOverlayAnimation}
            onClick={cancelForm}
          >
            <motion.div
              className="modal-content"
              {...modalContentAnimation}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{isEditing ? "Редактирование скилла" : "Новый скилл"}</h2>
                <button
                  className="modal-close"
                  type="button"
                  onClick={cancelForm}
                  aria-label="Закрыть"
                >
                  ×
                </button>
              </div>
              
              <form className="sd-form" onSubmit={handleSubmit}>
                <label className="sd-field">
                  <span>Название</span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    placeholder="Например, PostgreSQL"
                    maxLength={120}
                    required
                  />
                </label>
                
                <label className="sd-field">
                  <span>Направление</span>
                  <select name="directionId" value={form.directionId} onChange={updateField} required>
                    <option value="" disabled>Выберите направление</option>
                    {directions.map((dir) => (
                      <option key={dir.id} value={dir.id}>{dir.name}</option>
                    ))}
                  </select>
                </label>
                
                <label className="sd-field">
                  <span>Описание</span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={updateField}
                    placeholder="Что входит в этот навык"
                    rows={5}
                    maxLength={2000}
                  />
                </label>
                
                {error && <div className="sd-notice sd-error" role="alert">{error}</div>}
                {message && <div className="sd-notice sd-success" role="status">{message}</div>}
                
                <div className="modal-actions">
                  {isEditing && (
                    <button className="sd-button sd-danger" type="button" onClick={handleDelete}>
                      Архивировать
                    </button>
                  )}
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="sd-button" type="button" onClick={cancelForm}>
                      Отмена
                    </button>
                    <button className="sd-button sd-primary" type="submit">
                      {isEditing ? "Сохранить" : "Добавить"}
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