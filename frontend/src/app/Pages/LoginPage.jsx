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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!values.login.trim() || !values.password.trim()) {
      setError("Введите логин и пароль");
      return;
    }

    setIsLoading(true);

      try {
    // Стучимся на бэкенд. Vite сам перенаправит /api на localhost:3001
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: values.login,
        password: values.password,
      }),
    });

    const data = await response.json();

    // Если бэкенд вернул ошибку (например, неверный пароль)
    if (!response.ok) {
      throw new Error(data.error || 'Неверный логин или пароль');
    }

    // Сохраняем "пропуск" (токен) и данные юзера в кармашек браузера (localStorage)
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Пути назад на главную
    navigate('/', { replace: true });
    
  } catch (err) {
    // Если произошла ошибка, показываем её под формой
    setError(err.message || 'Ошибка соединения с сервером');
  } finally {
    setIsLoading(false);
  };

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