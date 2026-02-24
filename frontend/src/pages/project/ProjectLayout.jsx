// src/pages/project/ProjectLayout.jsx
import React from "react";
import SidebarLayout from "../../components/common/SidebarLayout";
import { projectMenus } from "../../components/layout/ProjectMenus";

export default function ProjectLayout() {
  const { title, base, sections } = projectMenus.project;

  return <SidebarLayout title={title} base={base} sections={sections} />;
}
