import { CameraView, useCameraPermissions } from "expo-camera";
import { useMutation } from "convex/react";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "../convex/_generated/api";
import { colors, radii, spacing, type } from "../constants/theme";
import { FoodSearchResult, getProductByBarcode } from "../lib/openFoodFacts";

export function BarcodeTab({
  date,
  onLogged,
}: {
  date: string;
  onLogged: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [looking, setLooking] = useState(false);
  const [product, setProduct] = useState<FoodSearchResult | null>(null);
  const [grams, setGrams] = useState("100");
  const createLog = useMutation(api.foodLogs.create);

  const handleScanned = async ({ data }: { data: string }) => {
    if (!scanning) return;
    setScanning(false);
    setLooking(true);
    try {
      const found = await getProductByBarcode(data);
      if (!found) {
        Alert.alert(
          "Not found",
          "That barcode isn't in the Open Food Facts database. Try Search or Manual instead.",
          [{ text: "OK", onPress: () => setScanning(true) }],
        );
        return;
      }
      setProduct(found);
    } catch (error) {
      Alert.alert(
        "Lookup failed",
        error instanceof Error ? error.message : "Unknown error",
        [{ text: "OK", onPress: () => setScanning(true) }],
      );
    } finally {
      setLooking(false);
    }
  };

  const logProduct = async () => {
    if (!product) return;
    const gramsNum = Number(grams);
    if (!gramsNum || gramsNum <= 0) {
      Alert.alert("Enter a valid amount in grams");
      return;
    }
    const scale = gramsNum / 100;
    await createLog({
      date,
      name: product.name,
      quantity: gramsNum,
      unit: "g",
      calories: Math.round(product.caloriesPer100g * scale),
      proteinG: Math.round(product.proteinPer100g * scale),
      carbsG: Math.round(product.carbsPer100g * scale),
      fatG: Math.round(product.fatPer100g * scale),
      source: "barcode",
    });
    onLogged();
  };

  if (!permission) {
    return <View style={styles.center} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>
          Camera access is needed to scan barcodes.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (product) {
    return (
      <View style={styles.form}>
        <Text style={styles.productName}>{product.name}</Text>
        {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}
        <Text style={styles.fieldLabel}>Amount (grams)</Text>
        <TextInput
          style={styles.input}
          value={grams}
          onChangeText={setGrams}
          keyboardType="numeric"
        />
        <Text style={styles.previewText}>
          {Math.round((product.caloriesPer100g * Number(grams || "0")) / 100)}{" "}
          cal for {grams || 0}g
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setProduct(null);
              setScanning(true);
            }}
          >
            <Text style={styles.secondaryButtonText}>Scan again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={logProduct}>
            <Text style={styles.primaryButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"],
        }}
        onBarcodeScanned={scanning ? handleScanned : undefined}
      />
      <View style={styles.scanFrame} />
      {looking ? (
        <View style={styles.lookingOverlay}>
          <ActivityIndicator color={colors.background} />
        </View>
      ) : (
        <Text style={styles.scanHint}>Point the camera at a barcode</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  hint: { ...type.body, color: colors.textMuted, textAlign: "center" },
  cameraContainer: { flex: 1, backgroundColor: colors.text },
  scanFrame: {
    position: "absolute",
    top: "35%",
    left: "15%",
    right: "15%",
    height: "20%",
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: radii.md,
  },
  scanHint: {
    position: "absolute",
    bottom: spacing.xl,
    alignSelf: "center",
    color: colors.background,
    ...type.body,
  },
  lookingOverlay: {
    position: "absolute",
    bottom: spacing.xl,
    alignSelf: "center",
  },
  form: { flex: 1, padding: spacing.lg, gap: spacing.md },
  productName: { ...type.title, color: colors.text },
  brand: { ...type.label, color: colors.textMuted, marginTop: -spacing.sm },
  fieldLabel: { ...type.label, color: colors.textMuted, marginTop: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.text,
  },
  previewText: { ...type.body, color: colors.textMuted },
  buttonRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  secondaryButtonText: { ...type.bodyStrong, color: colors.text },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryButtonText: { ...type.bodyStrong, color: colors.onAccent },
});
