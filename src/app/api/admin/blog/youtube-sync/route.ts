import { NextRequest, NextResponse } from "next/server";
import { syncYouTubeAchadinhosToBlog } from "@/lib/youtubeBlogSync";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query = body.query || "achadinhos da shopee";
    const limit = typeof body.limit === "number" ? body.limit : 3;

    const result = await syncYouTubeAchadinhosToBlog({
      query,
      maxVideos: limit,
      author: body.author || "Curadoria Achadinhos",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Erro na rota /api/admin/blog/youtube-sync:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Erro interno ao sincronizar YouTube",
      },
      { status: 500 }
    );
  }
}
