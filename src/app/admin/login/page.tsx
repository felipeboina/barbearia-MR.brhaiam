import { redirect } from "next/navigation";
import { Scissors } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/components/marketing/LoginForm";
import { getTheTenant } from "@/lib/current-tenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLoginPage() {
  const tenant = await getTheTenant();
  if (!tenant) redirect("/setup");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user.id).maybeSingle();
    if (profile?.tenant_id === tenant.id) redirect("/admin");
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-barber-red">
        <Scissors size={24} className="text-cream" />
      </div>
      <h1 className="text-xl mb-1 font-heading text-cream">{tenant.shop_name}</h1>
      <p className="text-sm text-muted mb-6 font-body">Painel do barbeiro</p>
      <Card className="max-w-sm w-full">
        <LoginForm />
      </Card>
    </div>
  );
}
