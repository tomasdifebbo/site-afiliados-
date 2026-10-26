import { shopeeGraphQL } from "../src/lib/shopee";

async function inspectReturnType() {
  const query = `
    query {
      __type(name: "Query") {
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
  const res = await shopeeGraphQL<any>(query, {});
  const cr = res.__type.fields.find((f: any) => f.name === "conversionReport");
  console.log("cr.type:", cr.type);

  const typeName = cr.type.name || cr.type.ofType?.name;
  console.log("typeName:", typeName);

  const detailQuery = `
    query {
      __type(name: "${typeName}") {
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
  const detailRes = await shopeeGraphQL<any>(detailQuery, {});
  console.log("Fields de", typeName, ":", JSON.stringify(detailRes.__type?.fields?.map((f: any) => f.name), null, 2));
}

inspectReturnType();
