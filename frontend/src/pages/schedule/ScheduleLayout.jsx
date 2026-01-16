// src/pages/schedule/ScheduleLayout.jsx
import React, { useState, useEffect } from "react";
import SidebarLayout from "../../components/common/SidebarLayout";
import { projectMenus } from "../../components/layout/ProjectMenus";
import { calendarApi } from "../../api/schedule";
import CalendarManageModal from "./CalendarManageModal";
import { Settings, Calendar as CalendarIcon } from "lucide-react";

export default function ScheduleLayout() {
  const [menuConfig, setMenuConfig] = useState(projectMenus.schedule);
  const [isManageOpen, setIsManageOpen] = useState(false);

  useEffect(() => {
    fetchCustomCalendars();
  }, []);

  const fetchCustomCalendars = async () => {
    let dynamicItems = [];
    try {
      const res = await calendarApi.customCalendars();
      const calendars = res.data || [];

      // 트리 구조를 메뉴 구조로 변환
      const transformCalendars = (calendarList) => {
        return calendarList.map((cal) => {
          const children =
            cal.sub_calendars && cal.sub_calendars.length > 0
              ? transformCalendars(cal.sub_calendars)
              : [];

          return {
            to: `category/${cal.id}`,
            label: cal.name,
            items: children,
            icon: children.length === 0 ? CalendarIcon : undefined,
          };
        });
      };

      dynamicItems = transformCalendars(calendars);
    } catch (error) {
      console.error("Failed to load custom calendars", error);
    }

    // 기본 메뉴와 병합
    const newConfig = { ...projectMenus.schedule };

    newConfig.sections = newConfig.sections.map((section) => {
      if (section.title === "카테고리별 일정") {
        return {
          ...section,
          items: [
            ...section.items.filter((item) => item.label !== "사용자 정의 일정"),
            {
              label: "사용자 정의 일정",
              to: "category/custom",
              items: [
                ...dynamicItems,
                {
                  label: "사용자 정의 일정 관리",
                  icon: Settings,
                  onClick: () => setIsManageOpen(true),
                  to: "#",
                  className:
                    "!text-red-500 hover:!bg-red-50 focus:!bg-red-50 !bg-transparent",
                },
              ],
            },
          ],
        };
      }
      return section;
    });

    setMenuConfig(newConfig);
  };

  const { title, base, sections } = menuConfig;

  return (
    <>
      <SidebarLayout title={title} base={base} sections={sections} />
      <CalendarManageModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        onRefresh={fetchCustomCalendars}
      />
    </>
  );
}
