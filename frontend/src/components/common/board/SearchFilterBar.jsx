import React from "react";

export default function SearchFilterBar({
  onSubmit,
  actions,
  className = "",
  children,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`page-box flex flex-wrap gap-4 items-end ${className}`}
    >
      {children}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </form>
  );
}
