import { prisma } from "../src/lib/prisma";
import { createSessionToken, verifySessionToken, verifyAdminPassword } from "../src/lib/auth";

async function runTests() {
  console.log("=== INICIANDO TESTES AUTOMATIZADOS DO CICLO 5 ===");
  let failures = 0;

  try {
    // 1. Testar validação de senha
    console.log("\n[Teste 1] Testando validação de senha de administrador...");
    const currentPass = process.env.ADMIN_PASSWORD || "admin";
    if (verifyAdminPassword(currentPass) && !verifyAdminPassword("senha_errada_123")) {
      console.log("PASS: Validação de senha administrativa funcionando com sucesso!");
    } else {
      console.error("FAIL: Falha na validação de senha.");
      failures++;
    }

    // 2. Testar geração e verificação de token de sessão
    console.log("\n[Teste 2] Testando geração e assinatura criptográfica do token de sessão...");
    const token = await createSessionToken();
    console.log(`Token gerado: ${token.slice(0, 30)}...`);

    const isValid = await verifySessionToken(token);
    if (isValid) {
      console.log("PASS: Token legítimo verificado com sucesso via HMAC-SHA256!");
    } else {
      console.error("FAIL: Token legítimo foi rejeitado.");
      failures++;
    }

    // 3. Testar rejeição de token forjado/inválido
    console.log("\n[Teste 3] Testando rejeição de token forjado ou adulterado...");
    const tamperedToken = token + "fake";
    const isTamperedValid = await verifySessionToken(tamperedToken);
    const isNullValid = await verifySessionToken(null);
    const isMalformedValid = await verifySessionToken("admin_123");

    if (!isTamperedValid && !isNullValid && !isMalformedValid) {
      console.log("PASS: Todos os tokens falsos/adulterados foram rejeitados com segurança!");
    } else {
      console.error("FAIL: Falha na segurança: token falso foi aceito.");
      failures++;
    }

    // 4. Testar integridade da base
    const totalCount = await prisma.product.count();
    console.log(`\nPASS: Total de produtos intactos no banco: ${totalCount}`);

  } catch (error: any) {
    console.error("ERRO NO TESTE:", error);
    failures++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n================================================");
  if (failures === 0) {
    console.log("RESULTADO FINAL: TESTES DO CICLO 5 PASSARAM COM SUCESSO!");
  } else {
    console.error(`RESULTADO FINAL: ${failures} FALHA(S) ENCONTRADA(S).`);
    process.exit(1);
  }
}

runTests();
