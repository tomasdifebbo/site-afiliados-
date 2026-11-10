import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const errorDescription = req.nextUrl.searchParams.get("error_description");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const redirectUri = `${origin}/api/admin/mercadolivre/callback`;

  if (error || !code) {
    const msg = errorDescription || error || "Código de autorização não recebido";
    return NextResponse.redirect(`${origin}/admin/produtos?ml_error=${encodeURIComponent(msg)}`);
  }

  const clientId = process.env.ML_CLIENT_ID;
  const clientSecret = process.env.ML_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${origin}/admin/produtos?ml_error=Credenciais+ML_CLIENT_ID+ou+ML_CLIENT_SECRET+ausentes`
    );
  }

  try {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token || !tokenData.refresh_token) {
      const errMsg = tokenData.message || tokenData.error || `Erro HTTP ${tokenRes.status}`;
      return NextResponse.redirect(`${origin}/admin/produtos?ml_error=${encodeURIComponent(errMsg)}`);
    }

    // Grava o ML_REFRESH_TOKEN em process.env e tenta salvar nos arquivos locais apenas se permitido
    const refreshToken = tokenData.refresh_token;
    process.env.ML_REFRESH_TOKEN = refreshToken;

    const updateEnv = (fileName: string) => {
      try {
        const filePath = path.resolve(process.cwd(), fileName);
        if (fs.existsSync(filePath)) {
          let content = fs.readFileSync(filePath, "utf-8");
          const regex = /^ML_REFRESH_TOKEN=.*$/m;
          if (regex.test(content)) {
            content = content.replace(regex, `ML_REFRESH_TOKEN=${refreshToken}`);
          } else {
            content += `\nML_REFRESH_TOKEN=${refreshToken}\n`;
          }
          fs.writeFileSync(filePath, content, "utf-8");
        }
      } catch (fileErr) {
        // Em ambientes serverless como a Vercel, o sistema de arquivos é somente leitura (/var/task)
        console.warn(`[ML Callback] Não foi possível salvar em ${fileName} (ambiente read-only):`, fileErr);
      }
    };

    updateEnv(".env");
    updateEnv(".env.local");

    return NextResponse.redirect(
      `${origin}/admin/produtos?ml_status=connected&user_id=${tokenData.user_id || ""}&refresh_token=${encodeURIComponent(refreshToken)}`
    );
  } catch (e: any) {
    return NextResponse.redirect(
      `${origin}/admin/produtos?ml_error=${encodeURIComponent(
        e.message || "Erro desconhecido ao obter token"
      )}`
    );
  }
}
