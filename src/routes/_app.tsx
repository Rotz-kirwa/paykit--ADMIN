import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { getCurrentUserFn } from "@/lib/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: async () => {
    const user = await getCurrentUserFn();
    if (!user) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardLayout,
});
// regen 1776505395
