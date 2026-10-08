import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SewingClient from "./SewingClient";

export const dynamic = "force-dynamic";

export default async function SewingPage() {
  const session = await auth();
  if (!session || session.user.role !== "sewing_supervisor") redirect("/unauthorized");
  return <SewingClient name={session.user.name || "Sewing Supervisor"} />;
}
