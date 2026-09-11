import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MeetingsStatusProvider } from "../shared/context/meetings-status.context.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import HomePage from "./pages/HomePage.jsx";
import MeetingsPage from "./pages/MeetingsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import DepartmentsPage from "./pages/DepartmentsPage.jsx";
import AdminUsersPage from "./pages/AdminUsersPage.jsx";
import SkillsDirectoryPage from "./pages/SkillsDirectoryPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Корень сайта отправляет на логин */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Страница входа */}
        <Route path="/login" element={<LoginPage />} />

        {/* Основная часть сайта */}
        <Route
          path="/app"
          element={
            <MeetingsStatusProvider>
              <AppLayout />
            </MeetingsStatusProvider>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="directories/skills" element={<SkillsDirectoryPage />} />
        </Route>

        {/* Редиректы со старых путей */}
        <Route path="/meetings" element={<Navigate to="/app/meetings" replace />} />
        <Route path="/profile" element={<Navigate to="/app/profile" replace />} />
        <Route path="/departments" element={<Navigate to="/app/departments" replace />} />
        <Route path="/admin/users" element={<Navigate to="/app/admin/users" replace />} />
        <Route path="/directories/skills" element={<Navigate to="/app/directories/skills" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}