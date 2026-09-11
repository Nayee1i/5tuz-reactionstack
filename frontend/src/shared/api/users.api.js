// frontend/src/shared/api/users.api.js
import { api } from "./client";

/**
 * Получить список всех пользователей 
 * (используется в AdminUsersPage и в выпадающем списке MeetingsPage)
 */
export async function getAllUsers() {
  const response = await api.get("/users");
  return Array.isArray(response) ? response : [];
}

/**
 * Создать нового пользователя
 */
export async function createUser(data) {
  return api.post("/users", data);
}

/**
 * Обновить данные пользователя
 */
export async function updateUser(id, data) {
  return api.put(`/users/${id}`, data);
}

/**
 * Удалить (деактивировать) пользователя
 */
export async function deleteUser(id) {
  return api.delete(`/users/${id}`);
}