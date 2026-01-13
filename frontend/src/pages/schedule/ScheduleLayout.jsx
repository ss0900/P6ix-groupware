// src/pages/schedule/ScheduleLayout.jsx
import SidebarLayout from "../../components/common/SidebarLayout";
import { projectMenus } from "../../components/layout/ProjectMenus";

export default function ScheduleLayout() {
  return (
    <SidebarLayout
      title="회의∙일정"
      base={projectMenus.schedule.base}
      sections={projectMenus.schedule.sections}
    />
  );
}
