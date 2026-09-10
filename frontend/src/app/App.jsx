import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout.jsx";
import HomePage from "./Pages/HomePage.jsx";
import MeetingsPage from "./Pages/MeetingsPage.jsx";
import ProfilePage from "./Pages/ProfilePage.jsx";
import NotFoundPage from "./Pages/NotFoundPage.jsx";
import LoginPage from "./Pages/LoginPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}