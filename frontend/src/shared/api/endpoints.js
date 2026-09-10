export const endpoints = {
  // Профиль
  dashboard: "/dashboard",
  me: "/users/me",

  // Профиль
  profile: "/users/me/profile",
  profileAvatar: "/users/me/avatar",
  profileSkills: "/users/me/skills",
  profileAchievements: "/users/me/achievements",

  // Встречи
  meetings: "/meetings",
  meetingsStatus: "/meetings/status",
  meetingsUpcoming: "/meetings/upcoming",
  meetingsHistory: "/meetings/history",
  meetingById: (id) => `/meetings/${id}`,
};