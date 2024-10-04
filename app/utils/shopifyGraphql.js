import axios from "axios";

export async function shopify_graphql({ session, query, variables = null }) {
  if (!session || !query) {
    throw new Error("Session or query argument missing");
  }

  const url = `https://${session.shop}/admin/api/2024-10/graphql.json`;

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": session.accessToken,
    },
    data: JSON.stringify({ query, variables }),
  };

  try {
    const response = await axios(url, options);
    // console.log("Sesssion Token ", session.accessToken)
    return response.data;
  } catch (error) {
    console.error("GraphQL request failed:", error);
    console.log("Sesssion Token ", session.accessToken);
    throw new Error("GraphQL request failed");
  }
}
