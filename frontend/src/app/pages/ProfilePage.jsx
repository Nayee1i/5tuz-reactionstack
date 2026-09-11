import { useRef, useState } from "react";
import { useApi } from "../../shared/hooks/useApi";
import { getProfile, uploadAvatar } from "../../shared/api/profile.api";
import { motion } from "framer-motion";

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInitials(user) {
  if (!user) {
    return "??";
  }

  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";

  return (first + last).toUpperCase() || "??";
}

function getSkillTone(skill) {
  switch (skill.status) {
    case "confirmed":
    case "almost_confirmed":
    case "on_track":
      return "success";

    case "in_progress":
    case "planned":
      return "info";

    case "at_risk":
    case "overdue":
      return "warning";

    default:
      return "neutral";
  }
}

function getSkillLabel(skill) {
  if (skill.statusLabel) {
    return skill.statusLabel;
  }

  switch (skill.status) {
    case "confirmed":
      return "Подтверждён";
    case "almost_confirmed":
      return "Почти подтверждён";
    case "on_track":
      return "По плану";
    case "in_progress":
      return "В работе";
    case "planned":
      return "Запланирован";
    case "at_risk":
      return "Есть отставание";
    case "overdue":
      return "Просрочен";
    default:
      return "Без статуса";
  }
}

function EmptyState({ children }) {
  return <div className="empty">{children}</div>;
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="card">
      <div className="empty">{message}</div>
      <div className="stack">
        <button className="button secondary" type="button" onClick={onRetry}>
          Повторить
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value || "—"}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { data, loading, error, reload } = useApi(getProfile, []);
  const fileInputRef = useRef(null);

  const [bio, setBio] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isSavingBio, setIsSavingBio] = useState(false);

  // При первой загрузке данных заполняем локальное состояние био
  const dataLoaded = !loading && !error && !!data;
  if (dataLoaded && !bio && data.user?.bio) {
    setBio(data.user.bio);
    setBioDraft(data.user.bio);
  }

  const pageAnimation = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
    exit: { opacity: 0, y: -12, transition: { duration: 0.15, ease: "easeIn" } },
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const result = await uploadAvatar(file);
      console.log("Аватар загружен:", result);
    } catch (err) {
      console.error(err);
    }

    event.target.value = "";
  };

  const startEditBio = () => {
    setBioDraft(bio);
    setIsEditingBio(true);
  };

  const saveBio = async () => {
    setIsSavingBio(true);
    try {
      // TODO: заменить на реальный запрос к бэкенду
      // await api.patch("/api/users/me/bio", { bio: bioDraft });
      await new Promise((resolve) => setTimeout(resolve, 400));
      setBio(bioDraft);
      setIsEditingBio(false);
    } catch (err) {
      console.error("Не удалось сохранить описание:", err);
    } finally {
      setIsSavingBio(false);
    }
  };

  const cancelBio = () => {
    setBioDraft(bio);
    setIsEditingBio(false);
  };

  if (loading) {
    return (
      <motion.section className="page" {...pageAnimation}>
        <div className="card">
          <div className="empty">Загрузка профиля...</div>
        </div>
      </motion.section>
    );
  }

  if (error) {
    return (
      <motion.section className="page" {...pageAnimation}>
        <ErrorState message={error} onRetry={reload} />
      </motion.section>
    );
  }

  if (!data) {
    return (
      <motion.section className="page" {...pageAnimation}>
        <ErrorState message="Данные профиля не получены" onRetry={reload} />
      </motion.section>
    );
  }

  const { user, manager, achievements, skills } = data;

  const confirmedSkills = skills.filter((s) => s.status === "confirmed");
  const inProgressSkills = skills.filter((s) => s.status !== "confirmed");

  return (
    <motion.section className="page" {...pageAnimation}>
      <header className="page-header">
        <div>
          <h1 className="page-title">Профиль</h1>
          <p className="page-subtitle">
            Информация о вас, вашем развитии и достижениях
          </p>
        </div>
      </header>

      <div className="grid">
        {/* ===== Карточка пользователя ===== */}
        <section className="card span-5 profile-hero">
          <div className="profile-hero-top">
            <button
              type="button"
              className="avatar-wrapper"
              onClick={handleAvatarClick}
              aria-label="Изменить аватар"
              title="Нажмите, чтобы изменить аватар"
            >
              {user.avatarUrl ? (
                <img
                  className="avatar-image"
                  src={user.avatarUrl}
                  alt={user.fullName}
                />
              ) : (
                <div className="avatar avatar-large">
                  {getInitials(user)}
                </div>
              )}

              <span className="avatar-overlay">Сменить</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />

            <div className="profile-hero-info">
              <h2 className="profile-name">{user.fullName}</h2>

              {user.position ? (
                <div className="profile-position">{user.position}</div>
              ) : null}

              <div className="profile-badges">
                {user.direction ? (
                  <span className="badge neutral">{user.direction}</span>
                ) : null}

                {user.department ? (
                  <span className="badge neutral">{user.department}</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* ===== О СЕБЕ ===== */}
          <div className="profile-bio">
            <div className="profile-bio-label">О себе</div>

            {isEditingBio ? (
              <div className="profile-bio-editor">
                <textarea
                  value={bioDraft}
                  onChange={(event) => setBioDraft(event.target.value)}
                  placeholder="Расскажите о своём опыте, интересах и целях развития"
                  maxLength={600}
                  autoFocus
                />

                <div className="profile-bio-meta">
                  <span>{bioDraft.length} / 600</span>

                  <div className="profile-bio-actions">
                    <button
                      className="button secondary"
                      type="button"
                      onClick={cancelBio}
                      disabled={isSavingBio}
                    >
                      Отмена
                    </button>

                    <button
                      className="button primary"
                      type="button"
                      onClick={saveBio}
                      disabled={isSavingBio}
                    >
                      {isSavingBio ? "Сохранение..." : "Сохранить"}
                    </button>
                  </div>
                </div>
              </div>
            ) : bio ? (
              <button
                type="button"
                className="profile-bio-display"
                onClick={startEditBio}
                title="Нажмите, чтобы отредактировать"
              >
                <p className="profile-bio-text">{bio}</p>
                <span className="profile-bio-edit-hint">Редактировать</span>
              </button>
            ) : (
              <button
                type="button"
                className="profile-bio-empty"
                onClick={startEditBio}
              >
                <span>Добавьте информацию о себе</span>
                <span className="profile-bio-edit-hint">Расскажите о своём опыте и целях</span>
              </button>
            )}
          </div>

          <div className="profile-hero-stats">
            <div className="profile-stat">
              <span className="profile-stat-value">{skills.length}</span>
              <span className="profile-stat-label">Скиллов в плане</span>
            </div>

            <div className="profile-stat">
              <span className="profile-stat-value">{confirmedSkills.length}</span>
              <span className="profile-stat-label">Подтверждено</span>
            </div>

            <div className="profile-stat">
              <span className="profile-stat-value">{achievements.length}</span>
              <span className="profile-stat-label">Достижений</span>
            </div>
          </div>
        </section>

        {/* ===== Информация ===== */}
        <section className="card span-7">
          <div className="card-header">
            <h2>Информация</h2>
          </div>

          <div className="info-grid">
            <InfoRow label="Компания" value={user.company} />
            <InfoRow label="Подразделение" value={user.department} />
            <InfoRow label="Направление" value={user.direction} />
            <InfoRow
              label="Руководитель"
              value={manager ? manager.fullName : "Не назначен"}
            />
            <InfoRow label="Email" value={user.email} />
            <InfoRow
              label="В компании с"
              value={formatDate(user.joinedAt)}
            />
          </div>
        </section>

        {/* ===== Достижения ===== */}
        <section className="card span-12">
          <div className="card-header">
            <h2>Достижения</h2>

            {achievements.length > 0 ? (
              <span className="badge neutral">
                {achievements.length}{" "}
                {achievements.length === 1
                  ? "достижение"
                  : achievements.length < 5
                    ? "достижения"
                    : "достижений"}
              </span>
            ) : null}
          </div>

          {achievements.length === 0 ? (
            <EmptyState>
              Пока нет достижений. Подтвердите первый скилл, чтобы получить
              первое достижение.
            </EmptyState>
          ) : (
            <div className="achievements-grid">
              {achievements.map((achievement, index) => (
                <article
                  className="achievement"
                  key={achievement.id || index}
                >
                  <div className="achievement-icon">
                    <span className="achievement-icon-inner">
                      {(achievement.title?.[0] ?? "★").toUpperCase()}
                    </span>
                  </div>

                  <div className="achievement-body">
                    <h3 className="achievement-title">{achievement.title}</h3>

                    <p className="achievement-description">
                      {achievement.description}
                    </p>

                    <div className="achievement-meta">
                      Получено {formatShortDate(achievement.earnedAt)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ===== Скиллы в работе ===== */}
        <section className="card span-8">
          <div className="card-header">
            <h2>План развития навыков</h2>

            <span className="badge neutral">
              {inProgressSkills.length} в работе
            </span>
          </div>

          {inProgressSkills.length === 0 ? (
            <EmptyState>Все скиллы подтверждены</EmptyState>
          ) : (
            <div className="stack">
              {inProgressSkills.map((skill, index) => (
                <article
                  className="skill-row"
                  key={skill.id || index}
                >
                  <div className="skill-top">
                    <div>
                      <h3>{skill.name}</h3>

                      <div className="skill-meta">
                        Плановая дата: {formatShortDate(skill.plannedDate)}
                      </div>
                    </div>

                    <span className={`badge ${getSkillTone(skill)}`}>
                      {getSkillLabel(skill)}
                    </span>
                  </div>

                  <div
                    className="progress"
                    role="progressbar"
                    aria-valuenow={skill.progress || 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="progress-bar"
                      style={{
                        width: `${Math.min(Math.max(skill.progress || 0, 0), 100)}%`,
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ===== Подтверждённые скиллы ===== */}
        <section className="card span-4">
          <div className="card-header">
            <h2>Подтверждено</h2>

            {confirmedSkills.length > 0 ? (
              <span className="badge success">
                {confirmedSkills.length}
              </span>
            ) : null}
          </div>

          {confirmedSkills.length === 0 ? (
            <EmptyState>Пока нет подтверждённых скиллов</EmptyState>
          ) : (
            <div className="list">
              {confirmedSkills.map((skill, index) => (
                <article
                  className="list-item"
                  key={skill.id || index}
                >
                  <div>
                    <div className="item-title">{skill.name}</div>

                    <div className="item-meta">
                      Подтверждено {formatShortDate(skill.confirmedAt)}
                    </div>
                  </div>

                  <span className="badge success">✓</span>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </motion.section>
  );
}