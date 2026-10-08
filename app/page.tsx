import { auth } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const roleRedirect: Record<string, string> = {
    cutting_supervisor: "/dashboard/supervisor",
    cutting_verifier: "/dashboard/verifier",
    sewing_supervisor: "/dashboard/sewing",
  };

  redirect(roleRedirect[session.user.role] || "/login");
}
