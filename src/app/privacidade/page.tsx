import { Lock, Eye, Database, Shield } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | Achadinhos do Dia",
  description: "Conheça nossas práticas de privacidade, tratamento de dados (LGPD) e o uso de cookies de rastreamento de afiliados.",
};

export default function PrivacidadePage() {
  return (
    <div className="container" style={{ padding: "4rem 1.5rem 8rem", maxWidth: "900px" }}>
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          padding: "6px 14px",
          borderRadius: "100px",
          color: "#059669",
          fontWeight: 700,
          fontSize: "0.85rem",
          marginBottom: "1rem"
        }}>
          <Lock size={16} /> LGPD & Privacidade
        </div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "3rem", fontWeight: 800, marginBottom: "1rem" }}>
          Política de Privacidade
        </h1>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "1.1rem", lineHeight: 1.6 }}>
          Sua privacidade e segurança são prioridades absolutas para o <strong>Achadinhos do Dia</strong>.
        </p>
      </div>

      <div className="glass shadow-premium" style={{ borderRadius: "24px", padding: "2.5rem", background: "#fff", display: "flex", flexDirection: "column", gap: "2rem" }}>
        <section>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.8rem", color: "#111", display: "flex", alignItems: "center", gap: "8px" }}>
            <Eye size={22} color="#FF6600" /> 1. Quem Somos e Escopo Desta Política
          </h2>
          <p style={{ color: "#444", fontSize: "1rem", lineHeight: 1.8 }}>
            O <strong>Achadinhos do Dia</strong> é um portal brasileiro de recomendações e curadoria de produtos. Esta política descreve como tratamos informações geradas durante a sua navegação em nosso site, em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 - LGPD)</strong>.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.8rem", color: "#111", display: "flex", alignItems: "center", gap: "8px" }}>
            <Database size={22} color="#FF6600" /> 2. Dados Que Não Coletamos
          </h2>
          <p style={{ color: "#444", fontSize: "1rem", lineHeight: 1.8, marginBottom: "0.8rem" }}>
            Como nosso modelo de atuação é puramente de curadoria e indicação, nós <strong>NUNCA</strong> solicitamos, armazenamos ou temos acesso a:
          </p>
          <ul style={{ paddingLeft: "1.5rem", color: "#444", fontSize: "0.95rem", lineHeight: 1.8 }}>
            <li>Dados bancários, números de cartões de crédito ou senhas;</li>
            <li>Endereços residenciais de entrega de pedidos;</li>
            <li>Documentos pessoais sensíveis (como CPF ou RG).</li>
          </ul>
          <p style={{ color: "#444", fontSize: "0.95rem", lineHeight: 1.8, marginTop: "0.8rem" }}>
            Todas as compras, pagamentos e inserções de dados cadastrais ocorrem exclusivamente dentro da plataforma oficial da <strong>Shopee</strong> (ou marketplace indicado), sob os rigorosos protocolos de segurança e criptografia próprios da loja oficial.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.8rem", color: "#111", display: "flex", alignItems: "center", gap: "8px" }}>
            <Shield size={22} color="#FF6600" /> 3. Cookies de Afiliados e Rastreamento de Compras
          </h2>
          <p style={{ color: "#444", fontSize: "1rem", lineHeight: 1.8, marginBottom: "0.8rem" }}>
            Quando você clica em um link de recomendação em nosso site para visualizar um produto, um <strong>cookie de rastreamento de afiliado</strong> padrão da Shopee pode ser armazenado no seu navegador.
          </p>
          <p style={{ color: "#444", fontSize: "0.95rem", lineHeight: 1.8 }}>
            Esse cookie serve exclusivamente para:
          </p>
          <ul style={{ paddingLeft: "1.5rem", color: "#444", fontSize: "0.95rem", lineHeight: 1.8 }}>
            <li>Registrar que a indicação do produto partiu do Achadinhos do Dia;</li>
            <li>Garantir o comissionamento caso uma compra elegível seja concluída dentro do período de validade do cookie da Shopee;</li>
            <li>Mensurar métricas anônimas de cliques e interesse por categoria.</li>
          </ul>
          <p style={{ color: "#666", fontSize: "0.9rem", lineHeight: 1.7, marginTop: "0.8rem" }}>
            Você pode, a qualquer momento, limpar ou bloquear cookies diretamente nas configurações de privacidade do seu navegador (Google Chrome, Firefox, Safari, Edge, etc.).
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.8rem", color: "#111" }}>
            4. Dados de Navegação e Estatísticas
          </h2>
          <p style={{ color: "#444", fontSize: "1rem", lineHeight: 1.8 }}>
            Podemos registrar dados estatísticos anônimos e agregados sobre cliques (exemplo: quantidade de visitas a determinado produto, dispositivo móvel ou desktop e horário) unicamente com a finalidade de otimizar a experiência de navegação e melhorar a curadoria de produtos mais procurados.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.8rem", color: "#111" }}>
            5. Alterações Desta Política e Contato
          </h2>
          <p style={{ color: "#444", fontSize: "1rem", lineHeight: 1.8 }}>
            Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças em normas regulatórias ou nas diretrizes dos programas de parceiros. Dúvidas ou solicitações relativas à privacidade podem ser encaminhadas pelos nossos canais oficiais de comunicação.
          </p>
          <p style={{ color: "#888", fontSize: "0.85rem", marginTop: "1rem" }}>
            Última atualização: {new Date().toLocaleDateString("pt-BR")}.
          </p>
        </section>
      </div>
    </div>
  );
}
