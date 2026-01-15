import React from "react";

export default function BoardToolbar({
  title,
  subtitle,
  actions,
  children,
  className = "",
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <div>
        {title && <h1 className="text-title">{title}</h1>}
        {subtitle && <p className="text-muted-sm">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">{actions || children}</div>
    </div>
  );
}
