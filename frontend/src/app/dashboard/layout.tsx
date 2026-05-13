/** Pegasus Design — Dashboard Layout (with Shell) */
import { Shell } from "@/components/ui/shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
