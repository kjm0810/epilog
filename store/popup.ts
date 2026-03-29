'use client';

import { create } from 'zustand';

export type Popup = {
  type: string;
  work_index: number;
};

type PopupState = {
  popup: Popup | null;
  get: () => Popup | null;
  set: (popup: Popup) => void;
  clear: () => void;
};

export const usePopupStore = create<PopupState>((set, get) => ({
  popup: null,
  get: () => get().popup,
  set: (popup) => set({ popup }),
  clear: () => set({ popup: null }),
}));
