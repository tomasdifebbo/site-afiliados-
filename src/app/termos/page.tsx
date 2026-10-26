import { FileText, AlertCircle, ShoppingBag, ExternalLink } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso | Achadinhos do Dia",
  description: "Termos e condições de uso, isenções de responsabilidade e regras de navegação do site Achadinhos do Dia.",
};

export default function TermosPage() {
  return (
    <div className="container" style={{ padding: "4rem 1.5rem 8rem", maxWidth: "900px" }}>
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          padding: "6px 14px",
          borderRadius: "100px",
          color: "#2563eb",
          fontWeight: 700,
          fontSize: "0.85rem",
          marginBottom: "1rem"
        }}>
          <FileText size={16} /> Condições de Acesso
        </div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "3rem", fontWeight: 800, marginBottom: "1rem" }}>
          Termos de Uso
        </h1>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "1.1rem", lineHeight: 1.6 }}>
          Leia atentamente os termos e condições aplicáveis à utilização do portal <strong>Achadinhos do Dia</strong>.
        </p>
      </div>

      <div className="glass shadow-premium" style={{ borderRadius: "24px", padding: "2.5rem", background: "#fff", display: "flex", flexDirection: "column", gap: "2rem" }}>
        <section>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.8rem", color: "#111" }}>
            1. Natureza do Serviço Prestado
          </h2>
          <p style={{ color: "#444", fontSize: "1rem", lineHeight: 1.8 }}>
            O <strong>Achadinhos do Dia</strong> opera estritamente como um canal digital de notícias, guias informativos, curadoria e recomendação de produtos comercializados por terceiros. <strong>Não somos fabricantes, lojistas, transportadores ou intermediadores de pagamento.</strong>
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.8rem", color: "#111", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShoppingBag size={22} color="#FF6600" /> 2. Relação de Afiliado com a Shopee
          </h2>
          <p style={{ color: "#444", fontSize: "1rem", lineHeight: 1.8, marginBottom: "0.8rem" }}>
            Declaramos abertamente que este site integra o <strong>Programa de Afiliados da Shopee Brasil</strong>. Ao clicar em botões como "Ver Oferta na Shopee", "Comprar Agora" ou links similares, você é redirecionado à plataforma oficial da Shopee (site ou aplicativo oficial).
          </p>
          <p style={{ color: "#444", fontSize: "1rem", lineHeight: 1.8 }}>
            Podemos ser remunerados com uma porcentagem de comissão por vendas concretizadas através dessas recomendações, em total conformidade com as regras operacionais da Shopee e as normas do Código de Defesa do Consumidor.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.8rem", color: "#111", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={22} color="#dc2626" /> 3. Preços, Estoque e Condições Comerciais
          </h2>
          <p style={{ color: "#444", fontSize: "1rem", lineHeight: 1.8, marginBottom: "0.8rem" }}>
            Os preços, cupons de desconto, valores de frete e prazos de entrega informados em nosso site correspondem a uma fotografia do momento da curadoria e <strong>estão sujeitos a alteração contínua a qualquer instante</strong> pelos próprios lojistas e pela plataforma da Shopee.
          </p>
          <p style={{ color: "#444", fontSize: "0.95rem", lineHeight: 1.8, backgroundColor: "#fff5f5", borderLeft: "4px solid #dc2626", padding: "1rem", borderRadius: "8px" }}>
            <strong>Importante:</strong> O preço, estoque e condições válidas para a sua compra serão sempre aqueles exibidos na tela final de fechamento do pedido dentro da loja oficial da Shopee.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.8rem", color: "#111", display: "flex", alignItems: "center", gap: "8px" }}>
            <ExternalLink size={22} color="#FF6600" /> 4. Garantia, Devolução e Atendimento ao Cliente
          </h2>
          <p style={{ color: "#444", fontSize: "1rem", lineHeight: 1.8, marginBottom: "0.8rem" }}>
            Quaisquer reclamações, cancelamentos, solicitações de reembolso, rastreamento de entregas ou exercício do direito de arrependimento (art. 49 do CDC) deverão ser solicitados <strong>diretamente dentro da central de atendimento e aplicativo da Shopee</strong>, que garante a proteção ao comprador através do programa "Garantia Shopee".
          </p>
          <p style={{ color: "#444", fontSize: "1rem", lineHeight: 1.8 }}>
            O Achadinhos do Dia não possui acesso a números de pedidos, faturas ou painéis de lojistas, estando isento de responsabilidade material direta sobre os produtos fornecidos.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.8rem", color: "#111" }}>
            5. Propriedade Intelectual e Uso Consciente
          </h2>
          <p style={{ color: "#444", fontSize: "1rem", lineHeight: 1.8 }}>
            Os textos, logotipos e layout do Achadinhos do Dia são de propriedade de seus criadores. As marcas, fotos de produtos e logotipos de terceiros citados (incluindo "Shopee") pertencem a seus respectivos titulares e são utilizados estritamente para identificação dos produtos recomendados no exercício regular da divulgação de afiliados.
          </p>
        </section>
      </div>
    </div>
  );
}
