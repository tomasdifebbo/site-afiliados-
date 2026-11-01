import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

/**
 * 📤 UPLOAD DE VÍDEO DO PRODUTO (MP4 / WebM / MOV)
 * Permite que o operador suba um vídeo real do seu próprio computador
 * para compor o vídeo dark vertical ou horizontal com narração Gemini AI.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    // Valida tipo de arquivo de vídeo
    const mime = file.type || "";
    if (!mime.startsWith("video/") && !file.name.match(/\.(mp4|mov|webm|mkv|avi)$/i)) {
      return NextResponse.json(
        { error: "Formato inválido. Por favor, envie um arquivo de vídeo (MP4, WebM ou MOV)." },
        { status: 400 }
      );
    }

    // Diretório de armazenamento público
    const uploadDir = join(process.cwd(), "public", "uploads", "videos");
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    const cleanName = file.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const uniqueFileName = `upload-${Date.now()}-${cleanName}`;
    const filePath = join(uploadDir, uniqueFileName);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/videos/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      videoUrl: publicUrl,
      fileName: file.name,
      sizeBytes: buffer.length,
    });
  } catch (err: any) {
    console.error("Erro no upload de vídeo:", err);
    return NextResponse.json(
      { error: err.message || "Falha ao processar upload do vídeo." },
      { status: 500 }
    );
  }
}
