import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateProductScriptWithGemini } from "@/lib/geminiScriptGenerator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, productName, price, categoryName, apiKey } = body;

    let targetProduct = {
      name: productName || "",
      price: price || null,
      categoryName: categoryName || null,
    };

    if (id) {
      const item = await prisma.darkVideo.findUnique({ where: { id } });
      if (item) {
        targetProduct = {
          name: item.productName,
          price: item.price,
          categoryName: item.categoryName,
        };
      }
    }

    if (!targetProduct.name) {
      return NextResponse.json({ error: "Nome do produto não informado" }, { status: 400 });
    }

    const result = await generateProductScriptWithGemini({
      name: targetProduct.name,
      price: targetProduct.price,
      categoryName: targetProduct.categoryName,
      apiKey,
    });

    if (id) {
      await prisma.darkVideo.update({
        where: { id },
        data: {
          scriptText: result.script,
          captionText: result.caption,
        },
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erro ao gerar roteiro com Gemini" },
      { status: 500 }
    );
  }
}
