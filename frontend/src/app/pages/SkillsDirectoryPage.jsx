import { useState } from "react";
import {
  loadSkills,
  saveSkills,
  SKILL_DIRECTIONS,
} from "../../data/skillsStore";
import { motion, AnimatePresence } from "framer-motion";

function emptyForm(direction = "BACK") {
  return {
    id: "",
    name: "",
    direction,
    description: "",
  };
}

export default function SkillsDirectoryPage() {
  const [initial] = useState(() => {
    try {
      return { skills: loadSkills(), error: "" };
    } catch {
      return {
        skills: null,
        error: "Не удалось загрузить справочник. Проверьте сохранённые данные и доступ к хранилищу браузера.",
      };
    }
  });

  const [skills, setSkills] = useState(initial.skills);
  const [form, setForm] = useState(() => emptyForm());
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  const pageAnimation = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.15, ease: "easeIn" } },
  };

  // Анимация для модального окна (фон)
  const modalOverlayAnimation = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };

  // Анимация для модального окна (контент)
  const modalContentAnimation = {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15, ease: "easeIn" } },
  };

  if (!skills) {
    return (
      <motion.section className="skills-directory" {...pageAnimation}>
        <h1>Справочник скиллов</h1>
        <div className="sd-notice sd-error" role="alert">{initial.error}</div>
      </motion.section>
    );
  }

  const isEditing = Boolean(form.id);
  const query = search.trim().toLocaleLowerCase("ru");

  const filteredSkills = skills
    .filter((skill) => {
      const matchesDirection = !directionFilter || skill.direction === directionFilter;
      const matchesSearch = `${skill.name} ${skill.description}`.toLocaleLowerCase("ru").includes(query);
      return matchesDirection && matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  function clearMessages() {
    setError("");
    setMessage("");
  }

  function startCreating() {
    setForm(emptyForm(directionFilter || "BACK"));
    clearMessages();
    setShowForm(true);
  }

  function editSkill(skill) {
    setForm({ ...skill });
    clearMessages();
    setShowForm(true);
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    clearMessages();
  }

  function commit(nextSkills, successMessage) {
    try {
      saveSkills(nextSkills);
      setSkills(nextSkills);
      setError("");
      setMessage(successMessage);
      return true;
    } catch {
      setMessage("");
      setError("Не удалось сохранить изменения. Проверьте доступность и свободное место в хранилище браузера.");
      return false;
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    clearMessages();

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      setError("Введите название скилла.");
      return;
    }

    if (!SKILL_DIRECTIONS.includes(form.direction)) {
      setError("Выберите направление.");
      return;
    }

    const duplicate = skills.some(
      (skill) =>
        skill.id !== form.id &&
        skill.direction === form.direction &&
        skill.name.trim().toLocaleLowerCase("ru") === name.toLocaleLowerCase("ru")
    );

    if (duplicate) {
      setError("Скилл с таким названием уже есть в этом направлении.");
      return;
    }

    const skill = {
      id: form.id || `skill-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      name,
      direction: form.direction,
      description,
    };

    const nextSkills = isEditing
      ? skills.map((item) => (item.id === skill.id ? skill : item))
      : [...skills, skill];

    const saved = commit(nextSkills, isEditing ? "Скилл обновлён." : "Скилл добавлен.");

    if (saved) {
      setForm(skill);
    }
  }

  function handleDelete() {
    if (!form.id) return;
    clearMessages();

    if (!window.confirm(`Удалить скилл «${form.name}» из справочника?`)) {
      return;
    }

    const saved = commit(
      skills.filter((skill) => skill.id !== form.id),
      "Скилл удалён."
    );

    if (saved) {
      setForm(emptyForm(directionFilter || "BACK"));
      setShowForm(false);
    }
  }

  function cancelForm() {
    setShowForm(false);
    clearMessages();
    setForm(emptyForm(directionFilter || "BACK"));
  }

  return (
    <motion.section className="skills-directory" {...pageAnimation}>
      <header className="sd-header">
        <div>
          <h1>Справочник скиллов</h1>
          <p>Технические навыки по направлениям BACK, FRONT и QA</p>
        </div>
        <button className="sd-button sd-primary" type="button" onClick={startCreating}>
          + Добавить скилл
        </button>
      </header>

      <div className="sd-notice">
        Деморежим администратора. Данные сохраняются в этом браузере.
      </div>

      {/* Убрали sd-layout, теперь панель занимает всю ширину */}
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
              {SKILL_DIRECTIONS.map((direction) => (
                <option key={direction} value={direction}>{direction}</option>
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
                    <span className="sd-tag">{skill.direction}</span>
                  </span>
                  <span className="sd-description">{skill.description || "Без описания"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* МОДАЛЬНОЕ ОКНО (по центру с размытием фона) */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="modal-overlay"
            {...modalOverlayAnimation}
            onClick={cancelForm} // Закрытие при клике на фон
          >
            <motion.div
              className="modal-content"
              {...modalContentAnimation}
              onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие при клике внутри формы
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
                  <select name="direction" value={form.direction} onChange={updateField} required>
                    {SKILL_DIRECTIONS.map((direction) => (
                      <option key={direction} value={direction}>{direction}</option>
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
                      Удалить
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