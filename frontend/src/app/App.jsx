import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout.jsx";
import HomePage from "../app/pages/HomePage.jsx";
import MeetingsPage from "../app/pages/MeetingsPage.jsx";
import ProfilePage from "../app/pages/ProfilePage.jsx";
import NotFoundPage from "../app/pages/NotFoundPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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