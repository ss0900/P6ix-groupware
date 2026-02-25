import React from "react";

const isPrimitive = (value) =>
  typeof value === "string" || typeof value === "number";

export default function PageHeader({
  title,
  subtitle,
  children,
  breadcrumb = null,
  className = "",
}) {
  const childArray = React.Children.toArray(children);
  const hasTitleProp = title !== undefined && title !== null;
  const hasLegacyTitleChild =
    !hasTitleProp && childArray.length === 1 && isPrimitive(childArray[0]);

  const resolvedTitle = hasTitleProp
    ? title
    : hasLegacyTitleChild
      ? childArray[0]
      : null;
  const resolvedActions = hasTitleProp
    ? children
    : hasLegacyTitleChild
      ? null
      : children;

  return (
    <div
      className={[
        "mb-6",
        hasLegacyTitleChild ? "-mt-4" : "",
        className,
      ].join(" ")}
    >
      {breadcrumb && <div className="text-sm text-gray-500 mb-2">{breadcrumb}</div>}

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {resolvedTitle && (
            <h1 className="text-title min-w-0 break-words">{resolvedTitle}</h1>
          )}
          {subtitle && <p className="text-muted-sm mt-1">{subtitle}</p>}
        </div>

        {resolvedActions && (
          <div className="flex items-center gap-2">{resolvedActions}</div>
        )}
      </div>

      {hasLegacyTitleChild && <div className="h-px bg-gray-300 mt-2" />}
    </div>
  );
}
