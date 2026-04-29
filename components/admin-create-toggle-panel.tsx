"use client";

import { ReactNode, useState } from "react";

type AdminCreateTogglePanelProps = {
  closedLabel: string;
  openLabel: string;
  children: ReactNode;
};

export function AdminCreateTogglePanel({ closedLabel, openLabel, children }: AdminCreateTogglePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="header-row" style={{ alignItems: "center" }}>
        <button type="button" className="btn" onClick={() => setOpen((current) => !current)}>
          {open ? openLabel : closedLabel}
        </button>
      </div>

      {open ? children : null}
    </div>
  );
}
