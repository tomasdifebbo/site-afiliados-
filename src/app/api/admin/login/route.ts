import { NextRequest, NextResponse } from "next/server";
import { verifyAdminPassword, createSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";

    if (!verifyAdminPassword(password)) {
      return NextResponse.json(
        { success: false, error: "Senha incorreta. Tente novamente." },
        { status: 401 }
      );
    }

    const token = await createSessionToken();

    const response = NextResponse.json({
      success: true,
      message: "Autenticado com sucesso!",
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60, // 7 dias
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Erro no login admin:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
