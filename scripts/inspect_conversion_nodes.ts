import { shopeeGraphQL } from "../src/lib/shopee";

async function inspectOrders() {
  const query = `
    query {
      __type(name: "ConversionOrder") {
        fields {
          name
        }
      }
    }
  `;
  const res = await shopeeGraphQL<any>(query, {});
  console.log("Campos de ConversionOrder:", res.__type?.fields?.map((f: any) => f.name));
}

inspectOrders();
