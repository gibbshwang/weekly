import { create } from 'zustand';

export type SaveStatus = 'idle' | 'consent' | 'google-login' | 'saving' | 'saved' | 'error';

interface SaveState {
  status: SaveStatus;
  sessionId: string | null;
  errorMessage: string | null;
  setStatus: (s: SaveStatus) => void;
  setSessionId: (id: string) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as SaveStatus,
  sessionId: null as string | null,
  errorMessage: null as string | null,
};

export const useSaveStore = create<SaveState>()((set) => ({
  ...initialState,
  setStatus: (s) => set({ status: s }),
  setSessionId: (id) => set({ sessionId: id }),
  setError: (msg) => set({ errorMessage: msg }),
  reset: () => set({ ...initialState }),
}));
