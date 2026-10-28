import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "todos") {
      where.status = status;
    }

    const items = await prisma.darkVideo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const counts = {
      total: await prisma.darkVideo.count(),
      novo: await prisma.darkVideo.count({ where: { status: "novo" } }),
      renderizando: await prisma.darkVideo.count({ where: { status: "renderizando" } }),
      em_revisao: await prisma.darkVideo.count({ where: { status: "em_revisao" } }),
      aprovado: await prisma.darkVideo.count({ where: { status: "aprovado" } }),
      rejeitado: await prisma.darkVideo.count({ where: { status: "rejeitado" } }),
    };

    return NextResponse.json({ items, counts });
  } catch (error: any) {
    console.error("Erro ao listar fila de vídeos dark:", error);
    return NextResponse.json({ error: error.message || "Erro ao consultar fila" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Inserção em lote a partir de produtos existentes
    if (Array.isArray(body.productIds) && body.productIds.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: body.productIds } },
        include: { category: true },
      });

      const created = [];
      for (const p of products) {
        // Evita duplicar na fila se já existir com status 'novo' ou 'em_revisao'
        const existing = await prisma.darkVideo.findFirst({
          where: {
            productId: p.id,
            status: { in: ["novo", "renderizando", "em_revisao"] },
          },
        });

        if (!existing) {
          const item = await prisma.darkVideo.create({
            data: {
              productId: p.id,
              productName: p.name,
              categoryName: p.category?.name || "Achadinhos",
              price: p.price,
              affiliateLink: p.affiliateLink,
              imageUrl: p.imageUrl,
              sellerVideoUrl: p.videoUrl || null,
              status: "novo",
            },
          });
          created.push(item);
        }
      }

      return NextResponse.json({ success: true, count: created.length, created });
    }

    // Inserção individual (ou manual)
    const { productId, productName, categoryName, price, affiliateLink, imageUrl, sellerVideoUrl } = body;

    if (!productName) {
      return NextResponse.json({ error: "Nome do produto é obrigatório" }, { status: 400 });
    }

    const item = await prisma.darkVideo.create({
      data: {
        productId: productId || null,
        productName,
        categoryName: categoryName || "Achadinhos",
        price: price ? Number(price) : null,
        affiliateLink: affiliateLink || "",
        imageUrl: imageUrl || "",
        sellerVideoUrl: sellerVideoUrl || null,
        status: "novo",
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error("Erro ao adicionar produto na fila:", error);
    return NextResponse.json({ error: error.message || "Erro ao inserir na fila" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    const validStatuses = ["novo", "renderizando", "em_revisao", "aprovado", "rejeitado"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (notes !== undefined) data.notes = notes;

    const updated = await prisma.darkVideo.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    console.error("Erro ao atualizar item da fila:", error);
    return NextResponse.json({ error: error.message || "Erro ao atualizar item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
    }

    await prisma.darkVideo.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao deletar item da fila:", error);
    return NextResponse.json({ error: error.message || "Erro ao deletar" }, { status: 500 });
  }
}
