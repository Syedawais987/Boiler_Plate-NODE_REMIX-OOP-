import { Page, Button, Card, TextContainer } from "@shopify/polaris";
import { useCallback } from "react";

export default function Index() {
  const handleSyncProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/app/products/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Sync successful:", data);
      // Add a success notification if desired
    } catch (error) {
      console.error("Error syncing products:", error);
      // Add an error notification if desired
    }
  }, []);

  return (
    <Page title="Product Sync">
      <Card sectioned>
        <TextContainer>
          <p>App is working. Click the button below to sync products.</p>
        </TextContainer>
        <div style={{ marginTop: "20px" }}>
          <Button onClick={handleSyncProducts} primary>
            Sync Products
          </Button>
        </div>
      </Card>
    </Page>
  );
}
