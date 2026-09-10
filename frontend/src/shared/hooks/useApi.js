import { useCallback, useEffect, useState } from "react";

export function useApi(requestFn, deps = []) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: "",
  });

  const load = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: "",
    }));

    try {
      const data = await requestFn();

      setState({
        data,
        loading: false,
        error: "",
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error?.message || "Не удалось загрузить данные",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return {
    ...state,
    reload: load,
  };
}