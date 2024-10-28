import {
  reactExtension,
  Banner,
  BlockStack,
  Checkbox,
  Text,
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
    <BlockStack>
      <Banner title="Shipping Protection">
        <Text>from damage, loss, and theft for ${protectionAmount}.</Text>
      </Banner>
      <Checkbox checked={isChecked} onChange={handleCheckboxChange}>
        {translate("Add Tiered Shipping Protection")}
      </Checkbox>
    </BlockStack>
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
    return "gid://shopify/ProductVariant/46069606121689";
  }
  if (subtotal >= 60 && subtotal < 120) {
    return "gid://shopify/ProductVariant/46069606154457";
  }
  if (subtotal >= 120 && subtotal < 180) {
    return "gid://shopify/ProductVariant/46069606187225";
  }
  if (subtotal >= 180) {
    return "gid://shopify/ProductVariant/46069606219993";
  }
  return null;
}

function getProtectionAmount(variantId) {
  const protectionAmounts = getProtectionAmounts();
  return protectionAmounts[variantId] || 0;
}

function getProtectionAmounts() {
  return {
    "gid://shopify/ProductVariant/46069606121689": 1.5,
    "gid://shopify/ProductVariant/46069606154457": 2.5,
    "gid://shopify/ProductVariant/46069606187225": 3.5,
    "gid://shopify/ProductVariant/46069606219993": 4.5,
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
