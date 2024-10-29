import {
  reactExtension,
  useApi,
  Banner,
  BlockStack,
  Checkbox,
  InlineStack,
  Heading,
  Modal,
  Link,
  Button,
  View,
  Icon,
  Switch,
  Text,
  TextBlock,
  useApplyCartLinesChange,
  useCartLines,
  useTranslate,
} from "@shopify/ui-extensions-react/checkout";
import { useState, useEffect } from "react";

export default reactExtension("purchase.checkout.block.render", () => (
  <TieredShippingProtection />
));

function TieredShippingProtection() {
  const translate = useTranslate();
  const applyCartLinesChange = useApplyCartLinesChange();
  const cartLines = useCartLines();
  const [isChecked, setIsChecked] = useState(true);
  const [shippingProtectionVariantId, setShippingProtectionVariantId] =
    useState(null);
  const { ui } = useApi();
  const [protectionAmount, setProtectionAmount] = useState(0);

  useEffect(() => {
    console.log("Running useEffect for cartLines change");
    const subtotal = calculateCartSubtotal(cartLines);
    console.log("Calculated cart subtotal:", subtotal);

    const variantId = calculateTierVariant(subtotal);
    console.log("Determined shipping protection variant ID:", variantId);

    setShippingProtectionVariantId(variantId);
    setProtectionAmount(getProtectionAmount(variantId));

    const existingProtectionLine = cartLines.find(
      (line) => line.merchandise.id === variantId
    );
    setIsChecked(!!existingProtectionLine);

    if (!existingProtectionLine && isChecked && variantId) {
      addShippingProtection(applyCartLinesChange, variantId);
    }

    cartLines.forEach((line) => {
      if (
        line.merchandise.id !== variantId &&
        Object.keys(getProtectionAmounts()).includes(line.merchandise.id)
      ) {
        removeShippingProtection(applyCartLinesChange, line.id);
      }
    });
  }, [cartLines]);

  const handleCheckboxChange = async (checked) => {
    console.log("Checkbox change detected, checked:", checked);
    setIsChecked(checked);

    if (checked && shippingProtectionVariantId) {
      console.log(
        "Adding shipping protection with variant ID:",
        shippingProtectionVariantId
      );
      await addShippingProtection(
        applyCartLinesChange,
        shippingProtectionVariantId
      );
    } else if (!checked) {
      const protectionLine = cartLines.find(
        (line) => line.merchandise.id === shippingProtectionVariantId
      );

      if (protectionLine) {
        console.log(
          "Removing shipping protection with line ID:",
          protectionLine.id
        );
        await removeShippingProtection(applyCartLinesChange, protectionLine.id);
      }
    }
  };

  return (
    <InlineStack
      columns={["20%", "fill"]}
      border="base"
      cornerRadius="base"
      padding={["tight", "tight", "tight", "tight"]}
    >
      <BlockStack
        padding={["base", "none", "base", "none"]}
        alignment="center"
        distribution="center"
      >
        <Switch
          accessibilityLabel="my-switch"
          checked={isChecked}
          onChange={handleCheckboxChange}
        />
      </BlockStack>

      <View padding="extraTight">
        <Text>
          <InlineStack spacing="extraTight">
            <Heading>Shipping Protection</Heading>

            <Link
              overlay={
                <Modal
                  id="my-modal"
                  padding
                  title="Shipping Protection Policy: Terms and Conditions"
                >
                  <BlockStack spacing="base">
                    <TextBlock>
                      <Heading>Optional Shipping Protection Coverage</Heading>
                    </TextBlock>
                    <TextBlock padding="tight">
                      For a small percentage of your total order amount,
                      Amplified Amino offers optional shipping protection that
                      covers the full value of your order against damage, loss,
                      or theft during transit. This protection must be purchased
                      at checkout and guarantees that you will be compensated or
                      your products replaced if any issues arise while your
                      package is in transit.
                    </TextBlock>

                    <TextBlock>
                      <Heading>Claims and Replacement</Heading>
                    </TextBlock>

                    <TextBlock>
                      <Heading>Stolen Package</Heading>
                    </TextBlock>
                    <TextBlock padding="tight">
                      Claim Filing Window: Claims must be filed within 7 days of
                      the package being marked as delivered according to the
                      carrier's tracking information.
                    </TextBlock>
                    <TextBlock padding="tight">
                      Orders Over $100: For orders valued over $100, a police
                      report is required to process the claim.
                    </TextBlock>

                    <TextBlock>
                      <Heading>Lost Package</Heading>
                    </TextBlock>
                    <TextBlock padding="tight">
                      Stuck in Transit: Claims for packages stuck in transit can
                      be filed no earlier than 10 days and no later than 30 days
                      from the last update on the package's tracking.
                    </TextBlock>
                    <TextBlock padding="tight">
                      Delivered to Wrong Location: If the package is marked as
                      delivered but was sent to an incorrect address, a claim
                      must be filed within 7 days of the delivery date. Proof of
                      incorrect delivery is required, such as photos, carrier
                      statements, or other documentation.
                    </TextBlock>

                    <TextBlock>
                      <Heading>Damaged Item on Arrival</Heading>
                    </TextBlock>
                    <TextBlock padding="tight">
                      Claim Filing Window: Claims for damaged items must be
                      filed within 2 days of delivery and must include photos of
                      both the package and the damaged item(s).
                    </TextBlock>
                    <TextBlock padding="tight">
                      Replacement Process: Upon verification, Amplified Amino
                      will replace the damaged products or issue a refund
                      equivalent to the value of the affected goods, subject to
                      product availability. Replacement shipments may be sent
                      using an alternative shipping method.
                    </TextBlock>

                    <TextBlock>
                      <Heading>Additional Information</Heading>
                    </TextBlock>
                    <TextBlock padding="tight">
                      All orders are documented and photographed prior to
                      shipment to help prevent fraudulent claims.
                    </TextBlock>

                    <TextBlock>
                      <Heading>Limitations of Liability</Heading>
                    </TextBlock>
                    <TextBlock padding="tight">
                      Force Majeure: Amplified Amino is not liable for delays or
                      damage caused by events beyond our control, including but
                      not limited to natural disasters, acts of terrorism, or
                      government actions.
                    </TextBlock>

                    <TextBlock padding="tight">
                      By purchasing our shipping protection, you acknowledge
                      that you have read, understood, and agree to these
                      Shipping Protection Policy terms and conditions.
                    </TextBlock>

                    <BlockStack inlineAlignment="end">
                      <Button onPress={() => ui.overlay.close("my-modal")}>
                        Close
                      </Button>
                    </BlockStack>
                  </BlockStack>
                </Modal>
              }
            >
              <Icon source="info" />
            </Link>
          </InlineStack>
        </Text>

        <InlineStack spacing="extraTight">
          <Text size="base" appearance="subdued">
            from damage, loss, and theft for
          </Text>
          <Heading> ${protectionAmount}</Heading>
        </InlineStack>
      </View>
    </InlineStack>
  );
}

function calculateCartSubtotal(cartLines) {
  console.log("Calculating cart subtotal from cart lines:", cartLines);
  const subtotal = cartLines.reduce((total, line) => {
    const linePrice = parseFloat(line.cost.totalAmount.amount) || 0;
    console.log("Adding line price to subtotal:", linePrice);
    return total + linePrice;
  }, 0);
  console.log("Final cart subtotal:", subtotal);
  return subtotal;
}

function calculateTierVariant(subtotal) {
  console.log("Calculating tier variant for subtotal:", subtotal);
  if (subtotal >= 0 && subtotal < 60) {
    return "gid://shopify/ProductVariant/49611331961147";
  }
  if (subtotal >= 60 && subtotal < 120) {
    return "gid://shopify/ProductVariant/49611331993915";
  }
  if (subtotal >= 120 && subtotal < 180) {
    return "gid://shopify/ProductVariant/49611332026683";
  }
  if (subtotal >= 180) {
    return "gid://shopify/ProductVariant/49611332059451";
  }
  return null;
}

function getProtectionAmount(variantId) {
  const protectionAmounts = getProtectionAmounts();
  return protectionAmounts[variantId] || 0;
}

function getProtectionAmounts() {
  return {
    "gid://shopify/ProductVariant/49611331961147": "1.50",
    "gid://shopify/ProductVariant/49611331993915": "2.50",
    "gid://shopify/ProductVariant/49611332026683": "3.50",
    "gid://shopify/ProductVariant/49611332059451": "4.50",
  };
}

async function addShippingProtection(applyCartLinesChange, variantId) {
  console.log("Applying addCartLine change for variant ID:", variantId);
  const response = await applyCartLinesChange({
    type: "addCartLine",
    merchandiseId: variantId,
    quantity: 1,
  });
  console.log("Shipping protection added response:", response);
}

async function removeShippingProtection(applyCartLinesChange, lineId) {
  console.log("Removing shipping protection with line ID:", lineId);
  const response = await applyCartLinesChange({
    type: "removeCartLine",
    id: lineId,
    quantity: 1,
  });
  console.log("Shipping protection removed response:", response);
}
