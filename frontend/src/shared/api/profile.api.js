import { api } from "./client";
import { endpoints } from "./endpoints";
import { profileMock } from "../mocks/profile.mock";

const USE_MOCK = process.env.REACT_APP_USE_MOCK === "true";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUser(raw = {}) {
  const firstName = raw.firstName ?? raw.first_name ?? "";
  const lastName = raw.lastName ?? raw.last_name ?? "";

  return {
    id: raw.id ?? null,
    firstName,
    lastName,
    fullName:
      raw.fullName ??
      raw.full_name ??
      [firstName, lastName].filter(Boolean).join(" "),
    email: raw.email ?? "",
    position: raw.position ?? raw.job_title ?? "",
    direction: raw.direction ?? "",
    department: raw.department ?? raw.department_name ?? "",
    departmentId: raw.departmentId ?? raw.department_id ?? null,
    company: raw.company ?? raw.company_name ?? "",
    joinedAt: raw.joinedAt ?? raw.joined_at ?? null,
    avatarUrl: raw.avatarUrl ?? raw.avatar_url ?? null,
  };
}

function normalizeManager(raw = {}) {
  if (!raw || Object.keys(raw).length === 0) {
    return null;
  }

  return normalizeUser(raw);
}

function normalizeAchievement(raw = {}) {
  return {
    id: raw.id ?? null,
    title: raw.title ?? raw.name ?? "Достижение",
    description: raw.description ?? "",
    earnedAt: raw.earnedAt ?? raw.earned_at ?? null,
    icon: raw.icon ?? null,
  };
}

function normalizeSkill(raw = {}) {
  return {
    id: raw.id ?? null,
    name: raw.name ?? raw.skill_name ?? "Скилл",
    direction: raw.direction ?? "",
    progress: raw.progress ?? 0,
    status: raw.status ?? "in_progress",
    statusLabel: raw.statusLabel ?? raw.status_label ?? null,
    plannedDate: raw.plannedDate ?? raw.planned_date ?? null,
    confirmedAt: raw.confirmedAt ?? raw.confirmed_at ?? null,
  };
}

function normalizeProfile(payload) {
  const data = payload?.data ?? payload ?? {};

  return {
    user: normalizeUser(data.user ?? data),
    manager: normalizeManager(data.manager ?? null),
    achievements: Array.isArray(data.achievements)
      ? data.achievements.map(normalizeAchievement)
      : [],
    skills: Array.isArray(data.skills)
      ? data.skills.map(normalizeSkill)
      : [],
  };
}

export async function getProfile() {
  if (USE_MOCK) {
    await delay(600);

    return normalizeProfile({
      user: profileMock,
      manager: profileMock.manager,
      achievements: profileMock.achievements,
      skills: profileMock.skills,
    });
  }

  const [profile, skills, achievements] = await Promise.all([
    api.get(endpoints.profile),
    api.get(endpoints.profileSkills),
    api.get(endpoints.profileAchievements),
  ]);

  return normalizeProfile({
    ...profile,
    skills: skills ?? [],
    achievements: achievements ?? [],
  });
}

export async function uploadAvatar(file) {
  if (USE_MOCK) {
    await delay(800);

    // Возвращаем временный URL на основе FileReader для локального превью
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ avatarUrl: reader.result });
      reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
      reader.readAsDataURL(file);
    });
  }

  const formData = new FormData();
  formData.append("file", file);

  // Для multipart/form-data заголовок Content-Type выставляется браузером сам
  const response = await fetch(
    `${process.env.REACT_APP_API_URL || "/api"}${endpoints.profileAvatar}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(localStorage.getItem("token")
          ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
          : {}),
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error("Не удалось загрузить аватар");
  }

  return response.json();
}