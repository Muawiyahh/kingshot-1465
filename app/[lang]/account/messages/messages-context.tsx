"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import type { Contact } from "@/lib/types";

type MessagesState = {
  contacts: Contact[];
  /** The conversation on screen, or the one just clicked while it loads. */
  activeId: string | null;
  /** True between a click and the new chat's page arriving. */
  pending: boolean;
  /** Called on click, so the list highlight and chat header switch before the server answers. */
  open: (partnerId: string | null) => void;
};

const MessagesContext = createContext<MessagesState>({ contacts: [], activeId: null, pending: false, open: () => {} });

export function useMessages() {
  return useContext(MessagesContext);
}

/** Shared by the list and the chat pane, which live in different route segments. */
export function MessagesProvider({ contacts, children }: { contacts: Contact[]; children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  // A click, remembered with the page it happened on. Once the URL moves on, the URL wins again.
  const [clicked, setClicked] = useState<{ id: string | null; from: string | null } | null>(null);
  const activeId = clicked && clicked.from === segment ? clicked.id : segment;
  const open = (id: string | null) => setClicked({ id, from: segment });
  const pending = activeId !== segment;

  return (
    <MessagesContext.Provider value={{ contacts, activeId, pending, open }}>{children}</MessagesContext.Provider>
  );
}
