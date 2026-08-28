import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Atom,
  BarChart2,
  BookOpen,
  Brain,
  Calculator,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  Code2,
  Database,
  FileText,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Library,
  PenSquare,
  Settings,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import type { Permission, UserRole } from "@/lib/roles";
import { can } from "@/lib/roles";

export type TeacherRouteStatus =
  | "CANONICAL"
  | "LEGACY_ALIAS"
  | "HIDDEN_FROM_PRIMARY_NAV"
  | "ROLE_RESTRICTED";

export type TeacherNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  title?: string;
  icon: LucideIcon;
  status: TeacherRouteStatus;
  requiredPermission?: Permission;
};

export type TeacherNavGroup = {
  id: string;
  label: string;
  collapsible?: boolean;
  items: TeacherNavItem[];
};

const item = (
  href: string,
  label: string,
  icon: LucideIcon,
  options: Partial<Omit<TeacherNavItem, "href" | "label" | "icon">> = {},
): TeacherNavItem => ({ href, label, icon, status: "CANONICAL", ...options });

export const teacherNavGroups: TeacherNavGroup[] = [
  {
    id: "today",
    label: "Today",
    items: [item("/dashboard", "Dashboard", LayoutDashboard, { shortLabel: "Today" })],
  },
  {
    id: "teaching",
    label: "Teaching",
    items: [
      item("/classes", "Classes", GraduationCap),
      item("/lessons", "Lessons", BookOpen),
      item("/homework", "Homework", PenSquare),
    ],
  },
  {
    id: "students-records",
    label: "Students & records",
    items: [
      item("/students", "Students", Users),
      item("/attendance", "Attendance", ClipboardCheck),
      item("/scores", "Scores", ClipboardList),
      item("/report-cards", "Reports", FileText, { title: "Report Cards" }),
      item("/student-hub", "Import & Sync", Database, { title: "Student Data Hub" }),
    ],
  },
  {
    id: "assessment",
    label: "Assessment",
    items: [
      item("/question-bank", "Question Bank", ClipboardList),
      item("/exams", "Assessments", CalendarCheck, { title: "Assessments" }),
      item("/grading", "Grading", FileText),
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      item("/library", "Library", Library),
      item("/curriculum", "Curriculum", BookOpen),
    ],
  },
  {
    id: "tools",
    label: "Tools",
    collapsible: true,
    items: [
      item("/study-buddy", "AI Assistant", Sparkles, { title: "Study Buddy" }),
      item("/knowledge-studio", "Knowledge Studio", FlaskConical),
      item("/intelligence", "Intelligence", Brain),
      item("/analytics", "Analytics", BarChart2, { status: "ROLE_RESTRICTED", requiredPermission: "analytics:read" }),
      item("/math-workspace", "Math Workspace", Calculator),
      item("/physics-lab", "Physics Lab", Activity),
      item("/chem-lab", "Chemistry Lab", Atom),
      item("/code-lab", "Code Lab", Code2),
    ],
  },
];

export const teacherAccountItems: TeacherNavItem[] = [
  item("/settings", "Settings", Settings),
];

export const teacherMobilePrimaryItems: TeacherNavItem[] = [
  teacherNavGroups[0].items[0],
  teacherNavGroups[1].items[0],
  teacherNavGroups[2].items[0],
  teacherNavGroups[3].items[1],
];

/** Routes intentionally kept outside primary navigation. No redirects are implied. */
export const teacherRouteMap: TeacherNavItem[] = [
  ...teacherNavGroups.flatMap((group) => group.items),
  ...teacherAccountItems,
  item("/question-bank/import", "Import Questions", Upload, { status: "HIDDEN_FROM_PRIMARY_NAV" }),
  item("/exams/import", "Legacy Exam Import", Upload, { status: "HIDDEN_FROM_PRIMARY_NAV" }),
  item("/student-hub/import", "Import Students", Upload, { status: "HIDDEN_FROM_PRIMARY_NAV" }),
  item("/student-hub/analytics", "Student Analytics", BarChart2, { status: "HIDDEN_FROM_PRIMARY_NAV" }),
  item("/student-hub/manual", "Manual Student Entry", Users, { status: "HIDDEN_FROM_PRIMARY_NAV" }),
  item("/student-hub/portal", "School Portal Sync", Database, { status: "HIDDEN_FROM_PRIMARY_NAV" }),
  item("/student-hub/reports", "Student Reports", FileText, { status: "HIDDEN_FROM_PRIMARY_NAV" }),
  item("/student-hub/sync-history", "Sync History", Database, { status: "HIDDEN_FROM_PRIMARY_NAV" }),
  item("/import", "Smart Import", Upload, { status: "LEGACY_ALIAS" }),
  item("/health", "Health Records", Activity, { status: "HIDDEN_FROM_PRIMARY_NAV" }),
  item("/beta", "Beta Hub", FlaskConical, { status: "HIDDEN_FROM_PRIMARY_NAV" }),
  item("/onboarding", "Setup", Settings, { status: "HIDDEN_FROM_PRIMARY_NAV" }),
  item("/setup", "Setup", Settings, { status: "HIDDEN_FROM_PRIMARY_NAV" }),
];

export function isTeacherRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function teacherRouteTitle(pathname: string) {
  const match = [...teacherRouteMap]
    .sort((a, b) => b.href.length - a.href.length)
    .find((route) => isTeacherRouteActive(pathname, route.href));
  return match?.title ?? match?.label ?? "TeachNexis";
}

export function visibleTeacherNavGroups(role: UserRole | null) {
  return teacherNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (navItem) => !navItem.requiredPermission || can(role, navItem.requiredPermission),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

export function visibleTeacherAccountItems(role: UserRole | null) {
  return teacherAccountItems.filter(
    (navItem) => !navItem.requiredPermission || can(role, navItem.requiredPermission),
  );
}
