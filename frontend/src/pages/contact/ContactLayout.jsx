// src/pages/contact/ContactLayout.jsx
import SidebarLayout from "../../components/common/SidebarLayout";
import { projectMenus } from "../../components/layout/ProjectMenus";

export default function ContactLayout() {
  return (
    <SidebarLayout
      title="업무연락"
      base={projectMenus.contact.base}
      sections={projectMenus.contact.sections}
    />
  );
}
