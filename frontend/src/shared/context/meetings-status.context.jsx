import { createContext, useContext } from "react";
import { useApi } from "../hooks/useApi";
import { getMeetingsStatus } from "../api/meetings.api";

const MeetingsStatusContext = createContext(null);

export function MeetingsStatusProvider({ children }) {
  const value = useApi(getMeetingsStatus, []);

  return (
    <MeetingsStatusContext.Provider value={value}>
      {children}
    </MeetingsStatusContext.Provider>
  );
}

export function useMeetingsStatus() {
  const context = useContext(MeetingsStatusContext);

  if (context) {
    return context;
  }

  return {
    data: null,
    loading: false,
    error: "",
    reload: () => {},
  };
}