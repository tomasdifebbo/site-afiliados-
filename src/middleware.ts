import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir acesso às rotas de login pública e api de login
  if (pathname === "/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  // Verificar se é uma rota protegida de admin
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const isValid = await verifySessionToken(token);

  if (!isValid) {
    if (isAdminApi) {
      return NextResponse.json(
        { success: false, error: "Acesso não autorizado. Autentique-se em /login." },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
