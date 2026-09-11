import { api } from "./client";
import { endpoints } from "./endpoints";
import {
  selectUpcomingMeetings,
  selectHistoryMeetings,
  selectMeetingById,
  selectMeetingsStatus,
  insertMeeting,
  deleteMeetingById,
} from "../mocks/meetings.store";

const USE_MOCK = process.env.REACT_APP_USE_MOCK === "true";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePerson(raw = {}) {
  if (!raw || Object.keys(raw).length === 0) {
    return null;
  }

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
    position: raw.position ?? raw.job_title ?? "",
    direction: raw.direction ?? "",
  };
}

function normalizeMeeting(raw = {}) {
  if (!raw || Object.keys(raw).length === 0) {
    return null;
  }

  const status = raw.status ?? "scheduled";

  return {
    id: raw.id ?? null,
    title: raw.title ?? "Встреча",
    type: raw.type ?? "PR",
    format: raw.format ?? "",
    startsAt: raw.startsAt ?? raw.starts_at ?? null,
    endsAt: raw.endsAt ?? raw.ends_at ?? null,
    status,
    statusLabel: raw.statusLabel ?? raw.status_label ?? null,
    link: raw.link ?? raw.meeting_link ?? null,
    conductor: normalizePerson(raw.conductor ?? raw.host),
    participant: normalizePerson(raw.participant ?? raw.employee),
    summary: raw.summary ?? raw.summary_text ?? "",
    confirmedSkillsCount:
      raw.confirmedSkillsCount ?? raw.confirmed_skills_count ?? 0,
    problemsCount: raw.problemsCount ?? raw.problems_count ?? 0,
    attachmentsCount: raw.attachmentsCount ?? raw.attachments_count ?? 0,
    isOngoing: raw.isOngoing ?? raw.is_ongoing ?? status === "ongoing",
  };
}

function normalizeStatus(payload) {
  const data = payload?.data ?? payload ?? {};

  return {
    ongoing: normalizeMeeting(data.ongoing),
    next: normalizeMeeting(data.next),
    upcomingCount: data.upcomingCount ?? data.upcoming_count ?? 0,
  };
}

function normalizeUpcoming(payload) {
  const items = Array.isArray(payload)
    ? payload
    : payload?.items ?? payload?.data ?? [];

  return items.map(normalizeMeeting).filter(Boolean);
}

function normalizeHistory(payload) {
  const data = payload?.data ?? payload ?? {};
  const items = Array.isArray(data) ? data : data.items ?? [];

  return {
    items: items.map(normalizeMeeting).filter(Boolean),
    total: data.total ?? items.length,
    page: data.page ?? 1,
    pageSize: data.pageSize ?? data.page_size ?? 10,
  };
}

export async function getMeetingsStatus() {
  if (USE_MOCK) {
    await delay(80);
    return normalizeStatus(selectMeetingsStatus());
  }

  const response = await api.get(endpoints.meetingsStatus);
  return normalizeStatus(response);
}

export async function getUpcomingMeetings(limit = 20) {
  if (USE_MOCK) {
    await delay(100);
    return normalizeUpcoming(selectUpcomingMeetings().slice(0, limit));
  }

  const response = await api.get(`${endpoints.meetingsUpcoming}?limit=${limit}`);
  return normalizeUpcoming(response);
}

export async function getMeetingsHistory(page = 1, pageSize = 10) {
  if (USE_MOCK) {
    await delay(120);
    return normalizeHistory(selectHistoryMeetings(page, pageSize));
  }

  const response = await api.get(
    `${endpoints.meetingsHistory}?page=${page}&pageSize=${pageSize}`,
  );

  return normalizeHistory(response);
}

export async function getMeetingById(id) {
  if (USE_MOCK) {
    await delay(120);

    const meeting = selectMeetingById(id);

    if (!meeting) {
      throw new Error("Встреча не найдена");
    }

    return normalizeMeeting(meeting);
  }

  const response = await api.get(endpoints.meetingById(id));
  return normalizeMeeting(response);
}

export async function createMeeting(payload) {
  if (USE_MOCK) {
    await delay(100);
    return normalizeMeeting(insertMeeting(payload));
  }

  const response = await api.post(endpoints.meetings, payload);
  return normalizeMeeting(response);
}

export async function deleteMeeting(id) {
  if (USE_MOCK) {
    await delay(100);
    return normalizeMeeting(deleteMeetingById(id));
  }

  await api.delete(endpoints.meetingById(id));
  return true;
}