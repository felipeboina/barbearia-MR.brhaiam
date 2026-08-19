import Link from "next/link";
import { redirect } from "next/navigation";
import { SetupForm } from "@/components/marketing/SetupForm";
import { getTheTenant } from "@/lib/current-tenant";

// Precisa checar se a barbearia já foi configurada a cada requisição (esse
// estado muda assim que o setup é concluído).
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const tenant = await getTheTenant();
  if (tenant) redirect("/admin");

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
