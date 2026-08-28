import type { MetadataRoute } from "next";

/**
 * Manifesto do PWA — é isso que permite "instalar"/"baixar" o painel como
 * um app de verdade (ícone na tela inicial do celular, janela própria no
 * PC), sem precisar publicar em loja de aplicativo nenhuma. `start_url`
 * aponta pro admin porque é o "sistema" que o dono baixa (Configurações >
 * Baixar app); o cliente final continua só usando o link normal pelo
 * navegador.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Barbearia Mr. Brhaian",
    short_name: "Mr. Brhaian",
    description: "Painel de agendamento e gestão da Barbearia Mr. Brhaian",
    start_url: "/admin",
    display: "standalone",
    background_color: "#05070d",
    theme_color: "#05070d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
