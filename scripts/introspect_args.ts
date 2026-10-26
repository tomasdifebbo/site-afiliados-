import { shopeeGraphQL } from "../src/lib/shopee";

async function introspectArgs() {
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
  const productOfferField = res.__type.fields.find((f: any) => f.name === "productOfferV2");
  console.log("productOfferV2 args:", JSON.stringify(productOfferField?.args, null, 2));
}

introspectArgs();
