import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout.jsx";
import HomePage from "./pages/HomePage.jsx";
import MeetingsPage from "./pages/MeetingsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

export default function App() {
  return (
    <BrowserRouter>

        <Routes>
          {/* Корень сайта теперь отправляет на логин */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Страница входа */}
          <Route path="/login" element={<LoginPage />} />

          {/* Основная часть сайта теперь живёт по адресу /app */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Чтобы старые ссылки не ломались */}
          <Route path="/meetings" element={<Navigate to="/app/meetings" replace />} />
          <Route path="/profile" element={<Navigate to="/app/profile" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </BrowserRouter>
  );
}