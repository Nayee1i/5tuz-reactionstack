import { useCallback, useEffect, useState } from "react";

// Простой in-memory кеш: ключ запроса → { data, timestamp }
const cache = new Map();
const CACHE_TTL = 60_000; // 1 минута: данные считаются свежими

export function useApi(requestFn, deps = [], options = {}) {
  // Ключ кеша: имя функции или произвольная строка
  const cacheKey = options.cacheKey || requestFn.name || requestFn.toString();

  const [state, setState] = useState(() => {
    // Если есть свежий кеш — начинаем сразу с данными, без лоадера
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { data: cached.data, loading: false, error: "" };
    }
    return { data: null, loading: true, error: "" };
  });

  const load = useCallback(async (silent = false) => {
    // silent = true → не показывать лоадер, обновлять в фоне
    if (!silent) {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: "",
      }));
    }

    try {
      const data = await requestFn();

      cache.set(cacheKey, { data, timestamp: Date.now() });

      setState({
        data,
        loading: false,
        error: "",
      });
    } catch (error) {
      setState((prev) => ({
        data: prev.data, // при ошибке оставляем старые данные
        loading: false,
        error: error?.message || "Не удалось загрузить данные",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, ...deps]);

  useEffect(() => {
    const cached = cache.get(cacheKey);
    const isFresh = cached && Date.now() - cached.timestamp < CACHE_TTL;

    if (isFresh) {
      // Данные свежие — обновляем тихо в фоне
      load(true);
    } else {
      // Данных нет или устарели — грузим с лоадером
      load(false);
    }
  }, [load, cacheKey]);

  return {
    ...state,
    reload: () => load(true),
  };
}

// Для тестов/разработки: сброс кеша
export function clearApiCache() {
  cache.clear();
}