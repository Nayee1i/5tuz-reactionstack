import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  const [values, setValues] = useState({
    login: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // frontend/src/app/Pages/LoginPage.jsx
// ... (код выше без изменений)
  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log("✅ 1. Форма отправлена, preventDefault сработал");
    setError("");
    
    if (!values.login.trim() || !values.password.trim()) {
      console.log("❌ 2. Ошибка: пустые поля");
      setError("Введите логин и пароль");
      return;
    }

    console.log("🔄 3. Начинаем запрос к /api/auth/login с данными:", values);
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      console.log("📡 4. Ответ получен. Статус:", response.status);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("❌ 5. Ошибка от сервера:", errData);
        throw new Error(errData.message || "Неверный логин или пароль");
      }

      const data = await response.json();
      console.log("🎉 6. Успешный вход! Токен:", data.token);
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      console.log("🚀 7. Делаем navigate('/')");
      navigate("/", { replace: true });
    } catch (err) {
      console.error("💥 8. ПОЙМАНА ОШИБКА В TRY/CATCH:", err);
      setError(err.message || "Ошибка входа. Проверьте логин и пароль.");
    } finally {
      setIsLoading(false);
    }
  };

// ... (код ниже без изменений)

  return (
    <section className="auth-page">
      <div className="auth-glow" aria-hidden="true" />

      <div className="auth-panel">
        <div className="auth-card">
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
                placeholder="Введите логин"
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
                  placeholder="Введите пароль"
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

            {error ? (
              <div className="auth-error" role="alert">
                {error}
              </div>
            ) : null}

            <button
              className="button primary auth-submit"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Выполняется вход..." : "Войти"}
            </button>
          </form>

          <footer className="auth-footer">
            Доступ выдаётся администратором системы
          </footer>
        </div>
      </div>
    </section>
  );
}