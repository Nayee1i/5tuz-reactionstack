import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const [values, setValues] = useState({ login: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (error) setError(""); // Убираем ошибку, как только пользователь начал печатать
  };

    const handleSubmit = async (event) => {
    console.log("1. Функция handleSubmit вызвана");
    
    // Если этой строки нет в консоли, значит событие не перехватывается!
    event.preventDefault(); 
    console.log("2. event.preventDefault() отработал");
    
    setError("");

    if (!values.login.trim() || !values.password.trim()) {
      console.log("3. Ошибка валидации: пустые поля");
      setError("Введите логин и пароль");
      cardRef.current?.classList.add("shake");
      setTimeout(() => cardRef.current?.classList.remove("shake"), 400);
      return;
    }

    setIsLoading(true);
    console.log("4. Началась имитация запроса");

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      const fakeUser = {
        id: 1,
        firstName: values.login,
        lastName: "",
        fullName: values.login,
        email: `${values.login}@skillflow.local`, // Добавлены обратные кавычки ` `
        role: values.login.toLowerCase() === "admin" ? "admin" : "user",
        position: values.login.toLowerCase() === "admin" ? "Team Lead" : "Frontend Developer",
        direction: "BACK",
        department: "Backend Platform",
      };

      localStorage.setItem("token", "fake-demo-token");
      localStorage.setItem("user", JSON.stringify(fakeUser));
      console.log("5. Данные сохранены в localStorage, выполняем navigate...");

      navigate("/app", { replace: true });
      console.log("6. navigate вызван");
      
    } catch (err) {
      console.error("Ошибка в try/catch:", err);
      setError("Не удалось войти. Попробуйте ещё раз.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="auth-page">
      <div className="auth-glow" aria-hidden="true" />

      <div className="auth-panel">
        <div className="auth-card" ref={cardRef}>
          <header className="auth-header">
            <div className="auth-logo">PR</div>
            <h1 className="auth-title">Вход в SkillFlow</h1>
            <p className="auth-subtitle">
              Система мониторинга развития технических навыков
            </p>
          </header>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="login">Логин</label>
              <input
                id="login"
                name="login"
                type="text"
                value={values.login}
                onChange={handleChange}
                placeholder="Например: admin"
                autoComplete="username"
                required
              />
            </div>
<div className="field">
              <label htmlFor="password">Пароль</label>
              <div className="password-control">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={values.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >
                  {showPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="button primary auth-submit"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Выполняется вход...
                </span>
              ) : "Войти"}
            </button>
          </form>

          <footer className="auth-footer">
            Демо-режим: подойдёт любой логин и пароль
          </footer>
        </div>
      </div>
      
      {/* Добавляем ключевой кадр для спиннера, если его нет в основном CSS */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}