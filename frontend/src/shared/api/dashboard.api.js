import { api } from "./client";
import { endpoints } from "./endpoints";
import { dashboardMock } from "../mocks/dashboard.mock";

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
    direction: raw.direction ?? "",
    department: raw.department ?? raw.department_name ?? raw.departmentName ?? "",
    manager: raw.manager ?? raw.manager_name ?? raw.managerName ?? "",
  };
}

function normalizeArray(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    statusLabel: item.statusLabel ?? item.status_label,
    severityLabel: item.severityLabel ?? item.severity_label,
    startsAt: item.startsAt ?? item.starts_at ?? item.date,
    dueDate: item.dueDate ?? item.due_date,
  }));
}

function normalizeDashboard(payload) {
  const data = payload?.data ?? payload ?? {};

  return {
    user: normalizeUser(data.user ?? data.currentUser ?? data.viewedUser),
    viewedUser: normalizeUser(data.viewedUser ?? data.user ?? data.currentUser),
    permissions: data.permissions ?? {},
    kpis: normalizeArray(data.kpis),
    skills: normalizeArray(data.skills ?? data.skillPlan),
    meetings: normalizeArray(data.meetings ?? data.upcomingMeetings),
    problems: normalizeArray(data.problems ?? data.openProblems),
    achievements: Array.isArray(data.achievements) ? data.achievements : [],
  };
}

export async function getDashboard() {
  if (USE_MOCK) {
    await delay(600);
    return normalizeDashboard(dashboardMock);
  }

  const response = await api.get(endpoints.dashboard);
  return normalizeDashboard(response);
}

export async function getCurrentUser() {
  if (USE_MOCK) {
    await delay(300);
    return normalizeUser(dashboardMock.user);
  }

  const response = await api.get(endpoints.me);
  return normalizeUser(response);
}