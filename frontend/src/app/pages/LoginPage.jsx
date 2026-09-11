import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  const [values, setValues] = useState({ login: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // === ЛОГИКА АНИМАЦИИ ФОНА (СЕТКА ТОЧЕК) ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let dots = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initDots();
    };

    const initDots = () => {
      dots = [];
      const spacing = 40; // Расстояние между точками
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          dots.push({ x, y, baseSize: 1.2 });
        }
      }
    };

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Цвет обычных точек (очень бледный)
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";

      dots.forEach((dot) => {
        const dx = mouseRef.current.x - dot.x;
        const dy = mouseRef.current.y - dot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 120; // Радиус реакции на курсор

        let size = dot.baseSize;
        
        // Слабая реакция: если курсор рядом, точка чуть растет и появляется линия
        if (distance < maxDist) {
          size = dot.baseSize + (1 - distance / maxDist) * 1.5;
          
          // Рисуем очень бледную линию к курсору (фирменный фиолетовый)
          ctx.beginPath();
          ctx.moveTo(dot.x, dot.y);
          ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
          ctx.strokeStyle = `rgba(94, 106, 210, ${0.4 * (1 - distance / maxDist)})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    
    resize();
    animate();

    // Очистка при размонтировании компонента
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!values.login.trim() || !values.password.trim()) {
      setError("Введите логин и пароль");
      cardRef.current?.classList.add("shake");
      setTimeout(() => cardRef.current?.classList.remove("shake"), 400);
      return;
    }

    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      const fakeUser = {
        id: 1,
        firstName: values.login,
        lastName: "",
        fullName: values.login,
        email: `${values.login}@skillflow.local`,
        role: values.login.toLowerCase() === "admin" ? "admin" : "user",
        position: values.login.toLowerCase() === "admin" ? "Team Lead" : "Frontend Developer",
        direction: "BACK",
        department: "Backend Platform",
      };

      localStorage.setItem("token", "fake-demo-token");
      localStorage.setItem("user", JSON.stringify(fakeUser));

      navigate("/app", { replace: true });
    } catch (err) {
      console.error("Ошибка в try/catch:", err);
      setError("Не удалось войти. Попробуйте ещё раз.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="auth-page">
      {/* 1. Старое свечение (для глубины фона) */}
      <div className="auth-glow" aria-hidden="true" />
      
      {/* 2. Наш новый Canvas с точками */}
      <canvas 
        ref={canvasRef} 
        className="auth-network-bg" 
        aria-hidden="true" 
      />

      <div className="auth-panel">
        <div className="auth-card" ref={cardRef}>
          <header className="auth-header">
            <div className="auth-logo">SF</div>
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
      
      {/* 3. Исправленные и надежные стили */}
      <style>{`
        /* Анимация спиннера */
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }

        /* Позиционирование canvas ПОД карточкой, но НАД общим фоном */
        .auth-network-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0; 
          pointer-events: none; /* Чтобы клики проходили сквозь canvas к полям ввода */
        }

        .auth-panel {
          position: relative;
          z-index: 1; /* Карточка всегда поверх canvas */
        }

        /* === ЖЕСТКАЯ ФИКСАЦИЯ ЦВЕТА ПОЛЕЙ ВВОДА === */
        
        /* Запрещаем изменение фона при фокусе */
        .auth-card .field input:focus {
          background-color: #08090a !important; /* Цвет var(--bg) */
        }

        /* МАГИЯ: Перебиваем стандартный белый/желтый фон автозаполнения Chrome/Safari */
        .auth-card .field input:-webkit-autofill,
        .auth-card .field input:-webkit-autofill:hover,
        .auth-card .field input:-webkit-autofill:focus,
        .auth-card .field input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #08090a inset !important; /* "Закрашиваем" фон браузера */
          -webkit-text-fill-color: #f7f8f8 !important; /* Цвет текста var(--text) */
          caret-color: #f7f8f8 !important; /* Цвет курсора */
          transition: background-color 5000s ease-in-out 0s; /* Бесконечная задержка перехода фона */
        }

        /* Дополнительно фиксируем цвет при валидации браузером */
        .auth-card .field input:valid,
        .auth-card .field input:invalid {
          background-color: #08090a !important;
        }

        /* Анимация тряски при ошибке */
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .auth-card.shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </section>
  );
}