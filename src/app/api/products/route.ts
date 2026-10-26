import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("categorySlug");
    const search = searchParams.get("search")?.trim();
    const featured = searchParams.get("featured") === "true";
    const sort = searchParams.get("sort") || "recent";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(48, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (featured) {
      where.isFeatured = true;
    }

    if (search) {
      where.name = { contains: search };
    }

    // Configuração flexível de ordenação
    let orderBy: any = { createdAt: "desc" };
    if (sort === "best_sales") {
      orderBy = [{ sales: "desc" }, { createdAt: "desc" }];
    } else if (sort === "best_rating") {
      orderBy = [{ ratingStar: "desc" }, { createdAt: "desc" }];
    } else if (sort === "best_discount") {
      orderBy = [{ discountRate: "desc" }, { createdAt: "desc" }];
    } else if (sort === "lowest_price") {
      orderBy = { price: "asc" };
    } else if (sort === "highest_price") {
      orderBy = { price: "desc" };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: {
            select: { name: true, slug: true }
          }
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      products,
      total,
      page,
      limit,
      totalPages,
      hasMore,
    });
  } catch (error: any) {
    console.error("Erro ao listar produtos paginados:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
