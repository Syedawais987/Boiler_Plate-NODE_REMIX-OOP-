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
  const [isChecked, setIsChecked] = useState(false);
  const [shippingProtectionVariantId, setShippingProtectionVariantId] =
    useState(null);

  useEffect(() => {
    console.log("Running useEffect for cartLines change");
    const subtotal = calculateCartSubtotal(cartLines);
    console.log("Calculated cart subtotal:", subtotal);

    const variantId = calculateTierVariant(subtotal);
    console.log("Determined shipping protection variant ID:", variantId);

    setShippingProtectionVariantId(variantId);
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
    } else {
      console.log("Removing shipping protection");
      await removeShippingProtection(
        applyCartLinesChange,
        cartLines,
        shippingProtectionVariantId
      );
    }
  };

  return (
    <BlockStack>
      <Banner title="Worry-Free Protection">
        <Text>from damage, loss, and theft .</Text>
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

async function addShippingProtection(applyCartLinesChange, variantId) {
  console.log("Applying addCartLine change for variant ID:", variantId);
  const response = await applyCartLinesChange({
    type: "addCartLine",
    merchandiseId: variantId,
    quantity: 1,
  });
  console.log("Shipping protection added response:", response);
}

async function removeShippingProtection(
  applyCartLinesChange,
  cartLines,
  shippingProtectionVariantId
) {
  console.log(
    "Checking for existing shipping protection in cart lines:",
    cartLines
  );

  const protectionLine = cartLines.find(
    (line) => line.merchandise.id === shippingProtectionVariantId
  );

  if (protectionLine) {
    console.log("Found protection line to remove, ID:", protectionLine.id);
    const response = await applyCartLinesChange({
      type: "removeCartLine",
      id: protectionLine.id,
      quantity: Number(1),
    });
    console.log("Shipping protection removed response:", response);
  } else {
    console.log("No shipping protection found to remove");
  }
}
