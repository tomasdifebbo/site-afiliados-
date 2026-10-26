import { Sparkles, ShieldCheck, HeartHandshake, HelpCircle } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre Nós | Achadinhos do Dia",
  description: "Conheça a história e o compromisso do Achadinhos do Dia com a curadoria honesta e transparente de produtos da internet.",
};

export default function SobrePage() {
  return (
    <div className="container" style={{ padding: "4rem 1.5rem 8rem", maxWidth: "900px" }}>
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "rgba(255, 102, 0, 0.1)",
          padding: "6px 14px",
          borderRadius: "100px",
          color: "hsl(var(--primary))",
          fontWeight: 700,
          fontSize: "0.85rem",
          marginBottom: "1rem"
        }}>
          <Sparkles size={16} /> Quem Somos
        </div>
        <h1 style={{ fontFamily: "var(--font-outfit)", fontSize: "3rem", fontWeight: 800, marginBottom: "1rem" }}>
          Sobre o <span style={{ color: "hsl(var(--primary))" }}>Achadinhos do Dia</span>
        </h1>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "1.15rem", lineHeight: 1.6 }}>
          Sua ponte confiável para encontrar os produtos mais úteis, criativos e com o melhor custo-benefício da internet.
        </p>
      </div>

      <div className="glass shadow-premium" style={{ borderRadius: "24px", padding: "2.5rem", marginBottom: "2.5rem", background: "#fff" }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: "1rem", color: "#111" }}>
          Nossa Missão
        </h2>
        <p style={{ color: "#444", fontSize: "1.05rem", lineHeight: 1.8, marginBottom: "1.5rem" }}>
          Comprar online pode ser uma experiência cansativa diante de milhões de opções e vendedores diferentes. O <strong>Achadinhos do Dia</strong> nasceu exatamente para simplificar sua vida: nossa equipe pesquisa, filtra e seleciona diariamente as melhores ofertas de utilidades domésticas, eletrodomésticos, produtos de saúde, cuidados pessoais e novidades virais.
        </p>
        <p style={{ color: "#444", fontSize: "1.05rem", lineHeight: 1.8 }}>
          Priorizamos produtos com boas avaliações, preços acessíveis e vendedores bem qualificados dentro dos maiores marketplaces do Brasil.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
        <div className="glass shadow-premium" style={{ padding: "2rem", borderRadius: "20px", background: "#fff" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(255, 102, 0, 0.1)", color: "#FF6600", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <ShieldCheck size={26} />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Curadoria Independente</h3>
          <p style={{ color: "#555", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Não somos uma loja nem recebemos pagamentos diretamente. Nosso trabalho é exclusivamente editorial de curadoria e recomendação.
          </p>
        </div>

        <div className="glass shadow-premium" style={{ padding: "2rem", borderRadius: "20px", background: "#fff" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <HeartHandshake size={26} />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Programa de Afiliados</h3>
          <p style={{ color: "#555", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Participamos do Programa de Afiliados oficial da Shopee. Quando você compra por meio de um dos nossos links, nós recebemos uma pequena comissão sem qualquer acréscimo no seu valor final.
          </p>
        </div>

        <div className="glass shadow-premium" style={{ padding: "2rem", borderRadius: "20px", background: "#fff" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <HelpCircle size={26} />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Segurança da Compra</h3>
          <p style={{ color: "#555", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Toda a transação de pagamento, emissão de nota fiscal, faturamento e entrega é processada dentro do ambiente seguro e com garantia oficial da Shopee.
          </p>
        </div>
      </div>

      <div className="glass shadow-premium" style={{ borderRadius: "24px", padding: "2rem", background: "#fcfcfc", border: "1px solid #eee" }}>
        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: "0.6rem" }}>Isenção de Marca Registrada</h3>
        <p style={{ fontSize: "0.9rem", color: "#666", lineHeight: 1.7, margin: 0 }}>
          "Shopee" é marca registrada de sua respectiva titular. O Achadinhos do Dia é um canal de divulgação independente cadastrado regularmente no Programa de Afiliados da Shopee Brasil, respeitando integralmente as diretrizes comunitárias, termos de uso e políticas de marca da plataforma parceira.
        </p>
      </div>
    </div>
  );
}
