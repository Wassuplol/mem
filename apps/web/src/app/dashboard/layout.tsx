import { AppShell } from "@/components/app-shell";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppShell title="Control room" subtitle="Your Mem, at a glance">
      {children}
    </AppShell>
  );
}
