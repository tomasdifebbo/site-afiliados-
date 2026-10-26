import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { products, categorySlug } = await req.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Nenhum produto enviado para importação." }, { status: 400, headers: corsHeaders });
    }

    // 1. Resolve Target Category
    let targetCategory = null;
    if (categorySlug) {
      targetCategory = await prisma.category.findUnique({ where: { slug: categorySlug } });
    }
    
    if (!targetCategory) {
      targetCategory = await prisma.category.findFirst({ where: { slug: "saude" } });
    }

    if (!targetCategory) {
      targetCategory = await prisma.category.findFirst() || await prisma.category.create({
        data: { name: "Geral", slug: "geral" }
      });
    }

    const AFFILIATE_ID = "an_18370270013";
    const GENERIC_LINKS = new Set([
      "https://s.shopee.com.br/1BGX4gLZZ",
      "https://s.shopee.com.br/4AvSPosErb",
      targetCategory.affiliateLink || "",
    ]);

    function buildProductAffiliateLink(p: any): string {
      const raw = (p.affiliateLink || "").trim();
      if (raw.startsWith("http") && !GENERIC_LINKS.has(raw) && !raw.includes("-cat.")) {
        if (raw.includes("shopee.com.br/") && !raw.includes("s.shopee.com.br") && !raw.includes("mmp_pid=")) {
          const sep = raw.includes("?") ? "&" : "?";
          return `${raw}${sep}mmp_pid=${AFFILIATE_ID}&utm_source=${AFFILIATE_ID}&utm_medium=affiliates`;
        }
        return raw;
      }

      const shopId = p.shopId ? String(p.shopId).trim() : "";
      const itemId = p.itemId ? String(p.itemId).trim() : (/^\d{6,}$/.test(String(p.id || "")) ? String(p.id) : "");

      if (shopId && itemId) {
        return `https://shopee.com.br/product/${shopId}/${itemId}?mmp_pid=${AFFILIATE_ID}&utm_source=${AFFILIATE_ID}&utm_medium=affiliates`;
      }

      const keyword = encodeURIComponent((p.name || "").trim());
      return `https://shopee.com.br/search?keyword=${keyword}&mmp_pid=${AFFILIATE_ID}&utm_source=${AFFILIATE_ID}&utm_medium=affiliates`;
    }

    // 2. Query existing product names to avoid duplicates
    const existingProducts = await prisma.product.findMany({
      select: { name: true },
    });
    const existingNames = new Set(existingProducts.map((p) => p.name.trim().toLowerCase()));
    const seenBatchNames = new Set<string>();

    // 3. Prepare items for bulk insert, filtering out duplicates
    const preparedData = products
      .filter((p: any) => {
        if (!p || !p.name || p.name.trim().length === 0) return false;
        const norm = p.name.trim().toLowerCase();
        if (existingNames.has(norm) || seenBatchNames.has(norm)) return false;
        seenBatchNames.add(norm);
        return true;
      })
      .map((p: any) => {
        const slugBase = p.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 40);

        const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
        const slug = `${slugBase}-${uniqueSuffix}`;

        const priceNum = typeof p.price === 'number' ? p.price : parseFloat(String(p.price || "0").replace(',', '.')) || 0;

        return {
          name: p.name.trim(),
          slug,
          description: `Oferta imperdível: ${p.name.trim()}. Garanta o melhor preço e procedência na Shopee pelo Achadinhos do Dia!`,
          price: priceNum,
          affiliateLink: buildProductAffiliateLink(p),
          imageUrl: p.imageUrl || "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop",
          categoryId: targetCategory!.id,
          isFeatured: Math.random() > 0.85
        };
      });

    // 3. Fast Chunked Batch Insertion (100 at a time)
    const chunkSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < preparedData.length; i += chunkSize) {
      const chunk = preparedData.slice(i, i + chunkSize);
      const res = await prisma.product.createMany({
        data: chunk,
      });
      totalInserted += res.count;
    }

    return NextResponse.json({
      success: true,
      count: totalInserted,
      categoryName: targetCategory.name,
      categorySlug: targetCategory.slug
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error("Erro na importação:", error);
    return NextResponse.json({ 
      error: "Erro interno no servidor ao salvar os produtos.",
      details: error.message 
    }, { status: 500, headers: corsHeaders });
  }
}

export async function GET() {
  try {
    const AFFILIATE_ID = "an_18370270013";
    const categories = await prisma.category.findMany();
    const categoryLinks = new Set(
      categories.map((c) => c.affiliateLink).filter(Boolean) as string[]
    );
    categoryLinks.add("https://s.shopee.com.br/1BGX4gLZZ");
    categoryLinks.add("https://s.shopee.com.br/4AvSPosErb");
    categoryLinks.add("https://shope.ee/example");

    const products = await prisma.product.findMany();
    let updatedCount = 0;

    for (const p of products) {
      if (!p.affiliateLink || categoryLinks.has(p.affiliateLink) || p.affiliateLink.includes("-cat.")) {
        const keyword = encodeURIComponent(p.name.trim());
        const newLink = `https://shopee.com.br/search?keyword=${keyword}&mmp_pid=${AFFILIATE_ID}&utm_source=${AFFILIATE_ID}&utm_medium=affiliates`;
        await prisma.product.update({
          where: { id: p.id },
          data: { affiliateLink: newLink },
        });
        updatedCount++;
      }
    }

    return NextResponse.json({ success: true, updatedCount, totalProducts: products.length }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const categorySlug = req.nextUrl.searchParams.get("categorySlug");
    const productId = req.nextUrl.searchParams.get("productId");

    if (productId) {
      await prisma.click.deleteMany({ where: { productId } });
      await prisma.product.delete({ where: { id: productId } });
      return NextResponse.json({ success: true, deletedCount: 1 }, { headers: corsHeaders });
    }

    if (categorySlug) {
      const cat = await prisma.category.findUnique({ where: { slug: categorySlug } });
      if (!cat) {
        return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404, headers: corsHeaders });
      }
      await prisma.click.deleteMany({
        where: { product: { categoryId: cat.id } },
      });
      const res = await prisma.product.deleteMany({
        where: { categoryId: cat.id },
      });
      return NextResponse.json({ success: true, deletedCount: res.count }, { headers: corsHeaders });
    }

    // Default: delete all products from the site
    await prisma.click.deleteMany({});
    const res = await prisma.product.deleteMany({});

    return NextResponse.json({ success: true, deletedCount: res.count }, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Erro ao excluir produtos:", error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}


