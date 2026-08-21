import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Sem isso, o Next.js só reconhece automaticamente a origem "principal"
    // do deploy pra validar Server Actions (o mecanismo por trás de toda
    // ação do painel admin, incluindo concluir atendimento). Domínio
    // próprio custom, com e sem "www", precisa ser listado explicitamente
    // — senão a ação é rejeitada antes mesmo de rodar nosso código.
    serverActions: {
      allowedOrigins: ["mrbrhaianbarbearia.com", "www.mrbrhaianbarbearia.com", "zyronagenda.online", "www.zyronagenda.online"],
    },
  },
};

export default nextConfig;
