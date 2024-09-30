import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import translations from '@shopify/polaris/locales/en.json';
import { NavMenu } from "@shopify/app-bridge-react";
import cookie from 'cookie';


export const links = () => [
  { rel: "stylesheet", href: polarisStyles },
];

export const loader = async ({request}) => {
  const cookies = cookie.parse(request.headers.get('Cookie') || '');
  const shop = cookies.shop;

  return json({ apiKey: process.env.SHOPIFY_API_KEY || "", shop });
};

export default function App() {
  const { apiKey, shop } = useLoaderData();

  const appBridgeConfig = {
    apiKey: apiKey,
    shopOrigin: shop,
    forceRedirect: true,
  };

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey} i18n={translations} config={appBridgeConfig}>
      <NavMenu>
        <Link to="/app">Dashboard</Link>
        <Link to="/app/quotes">Quotes</Link>
        <Link to="/app/customers">Customers</Link>
        <Link to="/app/commissions">Commissions</Link>
        <Link to="/app/orders">Orders</Link>
        <Link to="/app/spaces">Spaces</Link>
        <Link to="/app/settings">Settings</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
