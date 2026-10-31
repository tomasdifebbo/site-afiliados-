import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateProductScriptWithGemini } from "@/lib/geminiScriptGenerator";
import { synthesizeVoiceWithGemini } from "@/lib/geminiAudioGenerator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, productName, price, categoryName, apiKey, withAudio = true } = body;

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

    let narrationAudio: { audioUrl: string; durationEstSeconds: number } | null = null;
    if (withAudio && result.script) {
      try {
        narrationAudio = await synthesizeVoiceWithGemini({
          text: result.script,
          apiKey,
          filenamePrefix: `dark-narracao-${id || "preview"}`,
        });
      } catch (audioErr: any) {
        console.warn("[generate-script] Erro ao gerar áudio Gemini TTS:", audioErr.message);
      }
    }

    if (id) {
      await prisma.darkVideo.update({
        where: { id },
        data: {
          scriptText: result.script,
          captionText: result.caption,
          notes: narrationAudio ? narrationAudio.audioUrl : undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
      audioUrl: narrationAudio?.audioUrl || null,
      durationEstSeconds: narrationAudio?.durationEstSeconds || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erro ao gerar roteiro com Gemini" },
      { status: 500 }
    );
  }
}
