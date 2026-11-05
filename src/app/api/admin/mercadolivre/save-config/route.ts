import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { clientId, clientSecret, refreshToken, affiliateTag, affiliateTool } = body;

    const updateEnvFile = (filePath: string) => {
      if (!fs.existsSync(filePath)) return;
      let content = fs.readFileSync(filePath, "utf-8");

      const setKey = (key: string, val?: string) => {
        if (val === undefined) return;
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(content)) {
          content = content.replace(regex, `${key}=${val}`);
        } else {
          content += `\n${key}=${val}`;
        }
      };

      if (clientId !== undefined) setKey("ML_CLIENT_ID", clientId);
      if (clientSecret !== undefined) setKey("ML_CLIENT_SECRET", clientSecret);
      if (refreshToken !== undefined) setKey("ML_REFRESH_TOKEN", refreshToken);
      if (affiliateTag !== undefined) setKey("ML_AFFILIATE_TAG", affiliateTag);
      if (affiliateTool !== undefined) setKey("ML_AFFILIATE_TOOL", affiliateTool);

      fs.writeFileSync(filePath, content, "utf-8");
    };

    if (clientId) process.env.ML_CLIENT_ID = clientId;
    if (clientSecret) process.env.ML_CLIENT_SECRET = clientSecret;
    if (refreshToken) process.env.ML_REFRESH_TOKEN = refreshToken;
    if (affiliateTag !== undefined) process.env.ML_AFFILIATE_TAG = affiliateTag;
    if (affiliateTool !== undefined) process.env.ML_AFFILIATE_TOOL = affiliateTool;

    updateEnvFile(path.resolve(process.cwd(), ".env"));
    updateEnvFile(path.resolve(process.cwd(), ".env.local"));

    return NextResponse.json({ success: true, message: "Configurações do Mercado Livre salvas com sucesso!" });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || "Erro ao salvar configurações" }, { status: 500 });
  }
}
