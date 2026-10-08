import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SupervisorClient from "./SupervisorClient";

export const dynamic = "force-dynamic";

export default async function SupervisorPage() {
  const session = await auth();
  if (!session || session.user.role !== "cutting_supervisor") redirect("/unauthorized");
  return <SupervisorClient name={session.user.name || "Supervisor"} />;
}
