import { shopeeGraphQL } from "../src/lib/shopee";

async function testRealConversionQuery() {
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysAgo = now - 30 * 24 * 3600;

  const query = `
    query ($purchaseTimeStart: Int64, $purchaseTimeEnd: Int64, $limit: Int) {
      conversionReport(purchaseTimeStart: $purchaseTimeStart, purchaseTimeEnd: $purchaseTimeEnd, limit: $limit) {
        nodes {
          conversionId
          clickTime
          purchaseTime
          conversionStatus
          estimatedTotalCommission
          totalCommission
          netCommission
          device
        }
        pageInfo {
          page
          limit
          hasNextPage
          scrollId
        }
      }
    }
  `;

  try {
    const res = await shopeeGraphQL<any>(query, {
      purchaseTimeStart: String(thirtyDaysAgo),
      purchaseTimeEnd: String(now),
      limit: 10,
    });

    console.log("Resposta conversionReport:", JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error("Erro na query conversionReport:", err.message);
  }
}

testRealConversionQuery();
