import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/shopee";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productName,
      price,
      imageUrl,
      affiliateLink,
      productLink,
      itemId,
      shopId,
      siteUrl = "https://achadinhosdodia.com.br",
    } = body;

    if (!productName || !productName.trim()) {
      return NextResponse.json({ error: "Nome do produto é obrigatório" }, { status: 400 });
    }

    const name = productName.trim();
    const cleanItemId = itemId ? String(itemId) : null;
    const targetAffiliateLink = affiliateLink || productLink || "";

    // 1. Procurar produto existente
    let existing = null;
    if (cleanItemId) {
      existing = await prisma.product.findUnique({
        where: { itemId: cleanItemId },
      });
    }

    if (!existing) {
      existing = await prisma.product.findFirst({
        where: {
          OR: [
            { name: { equals: name } },
            { name: { contains: name.slice(0, 30) } },
          ],
        },
      });
    }

    // Se já existe no banco
    if (existing) {
      // Se não tinha affiliateLink e agora tem, atualiza
      if (targetAffiliateLink && (!existing.affiliateLink || existing.affiliateLink.includes("shopee.com.br/search"))) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { affiliateLink: targetAffiliateLink },
        });
      }

      const maskedUrl = `${siteUrl.replace(/\/$/, "")}/go/${existing.slug}`;
      return NextResponse.json({
        success: true,
        slug: existing.slug,
        maskedUrl,
        productId: existing.id,
        isNew: false,
      });
    }

    // 2. Se não existe, criar no banco com slug limpo e único
    const defaultCategory =
      (await prisma.category.findFirst({ where: { slug: "casa---eletro" } })) ||
      (await prisma.category.findFirst({ where: { slug: "eletrodomesticos" } })) ||
      (await prisma.category.findFirst());

    if (!defaultCategory) {
      return NextResponse.json({ error: "Nenhuma categoria cadastrada" }, { status: 500 });
    }

    const baseSlug = slugify(name, 35) || "produto";
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    let finalSlug = `${baseSlug}-${uniqueSuffix}`;

    // Garantir unicidade do slug
    const slugCollision = await prisma.product.findUnique({ where: { slug: finalSlug } });
    if (slugCollision) {
      finalSlug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const finalAffiliateLink =
      targetAffiliateLink ||
      `https://shopee.com.br/search?keyword=${encodeURIComponent(name)}`;

    const newProduct = await prisma.product.create({
      data: {
        name,
        slug: finalSlug,
        description: `Achadinho verificado com super desconto na Shopee: ${name}. Compre com segurança pelo Achadinhos do Dia!`,
        price: Number(price) || 0,
        affiliateLink: finalAffiliateLink,
        imageUrl: imageUrl || "",
        categoryId: defaultCategory.id,
        itemId: cleanItemId,
        shopId: shopId ? String(shopId) : null,
      },
    });

    const maskedUrl = `${siteUrl.replace(/\/$/, "")}/go/${newProduct.slug}`;

    return NextResponse.json({
      success: true,
      slug: newProduct.slug,
      maskedUrl,
      productId: newProduct.id,
      isNew: true,
    });
  } catch (error: any) {
    console.error("Erro ao assegurar link mascarado:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar link mascarado" },
      { status: 500 }
    );
  }
}
