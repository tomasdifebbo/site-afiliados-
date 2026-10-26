import { shopeeGraphQL } from "../src/lib/shopee";

async function analyzeConversionReport() {
  console.log("=== ANÁLISE INICIAL DO CICLO 3: conversionReport ===");

  const query = `
    query {
      __type(name: "Query") {
        fields {
          name
          args {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    }
  `;

  const res = await shopeeGraphQL<any>(query, {});
  const field = res.__type.fields.find((f: any) => f.name === "conversionReport");
  console.log("Args de conversionReport:", JSON.stringify(field?.args, null, 2));

  // Vamos inspecionar o tipo de retorno de conversionReport
  const typeQuery = `
    query {
      __type(name: "ConversionReportResult") {
        name
        fields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
      }
    }
  `;
  try {
    const typeRes = await shopeeGraphQL<any>(typeQuery, {});
    console.log("Fields de ConversionReportResult:", JSON.stringify(typeRes.__type?.fields?.map((f: any) => f.name), null, 2));
  } catch (err: any) {
    console.log("Erro ao buscar ConversionReportResult:", err.message);
  }
}

analyzeConversionReport();
