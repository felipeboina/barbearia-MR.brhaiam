import { Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function SetupConfirmadoPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <Card className="max-w-md mx-auto text-center anim-pop">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-brass">
          <Check size={26} className="text-ink" />
        </div>
        <h2 className="text-xl mb-2 font-heading text-cream">E-mail confirmado!</h2>
        <p className="text-sm text-muted mb-6 font-body">Agora é só entrar com o e-mail e senha que você criou.</p>
        <a href="/admin/login">
          <Button variant="brass">Ir para o login</Button>
        </a>
      </Card>
    </div>
  );
}
