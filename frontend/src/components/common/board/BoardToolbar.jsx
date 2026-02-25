import React from "react";

export default function BoardToolbar({
  title,
  subtitle,
  actions,
  children,
  left,
  right,
  className = "",
}) {
  const hasLegacySlots = left !== undefined || right !== undefined;

  if (hasLegacySlots) {
    return (
      <div
        className={[
          "mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between",
          className,
        ].join(" ")}
      >
        <div className="flex flex-wrap items-center gap-2">{left}</div>
        <div className="flex flex-wrap items-center gap-2">{right}</div>
      </div>
    );
  }

  return (
    <div
      className={[
        "flex flex-wrap items-center justify-between gap-3",
        className,
      ].join(" ")}
    >
      <div>
        {title && <h1 className="text-title">{title}</h1>}
        {subtitle && <p className="text-muted-sm">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{actions || children}</div>
    </div>
  );
}
