"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Botão de "baixar/instalar" o painel como app (PWA) — funciona tanto no
 * PC (Chrome/Edge, vira uma janela própria com ícone) quanto no celular
 * (Android: mesmo fluxo; iOS/Safari não tem um botão programático, então
 * mostramos o passo a passo manual). Sem loja de aplicativo nenhuma
 * envolvida — é o navegador quem instala, usando o manifest do site
 * (src/app/manifest.ts).
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê APIs só existentes no navegador (matchMedia/userAgent), não dá pra saber no servidor
    setInstalled(standalone);
    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent) && !standalone);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstalling(false);
  };

  if (installed) {
    return <p className="text-xs text-muted font-body">App já instalado neste dispositivo.</p>;
  }

  if (deferredPrompt) {
    return (
      <Button variant="brass" disabled={installing} onClick={install}>
        <Download size={14} /> {installing ? "Instalando..." : "Baixar / instalar app"}
      </Button>
    );
  }

  if (isIOS) {
    return (
      <p className="text-xs text-muted font-body">
        No iPhone/iPad: no Safari, toque no ícone de <strong className="text-cream">Compartilhar</strong> e depois em{" "}
        <strong className="text-cream">&quot;Adicionar à Tela de Início&quot;</strong>.
      </p>
    );
  }

  return (
    <p className="text-xs text-muted font-body">
      Seu navegador ainda não liberou a instalação automática — procure por{" "}
      <strong className="text-cream">&quot;Instalar app&quot;</strong> ou <strong className="text-cream">&quot;Adicionar à tela inicial&quot;</strong> no
      menu dele (geralmente o ícone ⋮ ou ⋯).
    </p>
  );
}
