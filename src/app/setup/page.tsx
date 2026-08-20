import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { SetupForm } from "@/components/marketing/SetupForm";
import { getTheTenant } from "@/lib/current-tenant";

// Precisa checar se a barbearia já foi configurada a cada requisição (esse
// estado muda assim que o setup é concluído).
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const tenant = await getTheTenant();
  if (tenant) redirect("/admin/login");

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 brand-bg">
      <Link href="/" className="text-sm text-muted mb-6 font-body">
        ← Voltar
      </Link>
      <Image src="/logo.jpg" alt="Logo" width={64} height={64} className="rounded-full mb-4" style={{ boxShadow: "0 4px 24px -4px rgba(47,95,224,0.5)" }} priority />
      <h1 className="text-2xl mb-6 font-heading text-cream text-center">Configure sua barbearia</h1>
      <SetupForm />
    </div>
  );
}
