import Link from "next/link";
import { redirect } from "next/navigation";
import { SetupForm } from "@/components/marketing/SetupForm";
import { getTheTenant } from "@/lib/current-tenant";

export default async function SetupPage() {
  const tenant = await getTheTenant();
  if (tenant) redirect("/admin/login");

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="text-sm text-muted mb-6 font-body">
        ← Voltar
      </Link>
      <h1 className="text-2xl mb-6 font-heading text-cream text-center">Configure sua barbearia</h1>
      <SetupForm />
    </div>
  );
}
