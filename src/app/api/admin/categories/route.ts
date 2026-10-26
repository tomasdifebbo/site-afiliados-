import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const inspect = req.nextUrl.searchParams.get("inspect");
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        affiliateLink: true,
        _count: {
          select: { products: true }
        }
      }
    });

    if (inspect) {
      const products = await prisma.product.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, categoryId: true, createdAt: true }
      });
      const batches: Record<string, { count: number; firstProduct: string; lastProduct: string; firstTime: string; lastTime: string }> = {};
      for (const p of products) {
        const key = p.createdAt.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
        if (!batches[key]) {
          batches[key] = {
            count: 0,
            firstProduct: p.name,
            lastProduct: p.name,
            firstTime: p.createdAt.toISOString(),
            lastTime: p.createdAt.toISOString(),
          };
        }
        batches[key].count++;
        batches[key].lastProduct = p.name;
        batches[key].lastTime = p.createdAt.toISOString();
      }
      return NextResponse.json({
        totalProducts: products.length,
        batches,
      });
    }

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Erro ao listar categorias:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const saudeCat = await prisma.category.findUnique({ where: { slug: "saude" } });
    let eletroCat = await prisma.category.findUnique({ where: { slug: "eletrodomesticos" } });

    if (!eletroCat) {
      eletroCat = await prisma.category.create({
        data: { name: "Eletrodomésticos", slug: "eletrodomesticos" },
      });
    }

    // 1. Delete accidental script paste if present
    await prisma.product.deleteMany({
      where: { name: { startsWith: "(function()" } },
    });

    // 2. Ensure products before 18:00 UTC are in Saúde (480 products)
    if (saudeCat) {
      await prisma.product.updateMany({
        where: {
          createdAt: { lt: new Date("2026-10-21T18:00:00.000Z") },
        },
        data: { categoryId: saudeCat.id },
      });
    }

    // 3. Ensure the 500 products from 18:02 UTC are in Eletrodomésticos
    const movedEletro = await prisma.product.updateMany({
      where: {
        createdAt: { gte: new Date("2026-10-21T18:00:00.000Z") },
      },
      data: { categoryId: eletroCat.id },
    });

    const updatedSaude = await prisma.category.findUnique({
      where: { slug: "saude" },
      include: { _count: { select: { products: true } } },
    });

    const updatedEletro = await prisma.category.findUnique({
      where: { slug: "eletrodomesticos" },
      include: { _count: { select: { products: true } } },
    });

    return NextResponse.json({
      success: true,
      eletroCount: movedEletro.count,
      saudeTotal: updatedSaude?._count.products || 0,
      eletroTotal: updatedEletro?._count.products || 0,
    });
  } catch (error: any) {
    console.error("Erro ao mover produtos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


