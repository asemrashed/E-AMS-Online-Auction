import { RoleShell } from '@/components/RoleShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <RoleShell variant="dashboard">{children}</RoleShell>;
}