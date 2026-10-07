"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui";

/** Submit button that asks for confirmation before a destructive action. */
export function ConfirmButton({ message, children }: { message: string; children: ReactNode }) {
  return (
    <Button
      type="submit"
      variant="danger"
      size="sm"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
