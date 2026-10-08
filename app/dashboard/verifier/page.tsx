import { auth } from "@/auth";
import { redirect } from "next/navigation";
import VerifierClient from "./VerifierClient";

export const dynamic = "force-dynamic";

export default async function VerifierPage() {
  const session = await auth();
  if (!session || session.user.role !== "cutting_verifier") redirect("/unauthorized");
  return <VerifierClient name={session.user.name || "Verifier"} />;
}
