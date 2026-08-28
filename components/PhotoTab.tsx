import { useAction, useMutation } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { colors, radii, spacing, tabular, type } from "../constants/theme";
import { Button } from "./ui/Button";
import type { IdentifiedIngredient } from "../convex/vision";

type EditableIngredient = IdentifiedIngredient & { include: boolean };

// The meal row needs one name. Built from what was actually identified so the
// user has something real to edit, never a generic "Meal" placeholder.
function defaultMealName(items: { name: string }[]): string {
  const names = items.map((item) => item.name.trim()).filter(Boolean);
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

export function PhotoTab({
  date,
  onLogged,
}: {
  date: string;
  onLogged: () => void;
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const identifyFood = useAction(api.vision.identifyFood);
  const createLog = useMutation(api.foodLogs.create);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [ingredients, setIngredients] = useState<EditableIngredient[] | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [mealName, setMealName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);

  const pickAndAnalyze = async (source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", `Allow ${source} access to continue.`);
      return;
    }

    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setIngredients(null);
    setMealName("");
    setNameEdited(false);
    setAnalyzing(true);

    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
        body: blob,
      });
      if (!uploadResponse.ok) {
        throw new Error(
          `Upload failed (${uploadResponse.status}). Check your connection and try again.`,
        );
      }
      const { storageId: uploadedId } = await uploadResponse.json();
      setStorageId(uploadedId);

      const found = await identifyFood({ storageId: uploadedId });
      setIngredients(found.map((item) => ({ ...item, include: true })));
      setMealName(defaultMealName(found));
    } catch (error) {
      Alert.alert(
        "Couldn't analyze photo",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const updateIngredient = (
    index: number,
    patch: Partial<EditableIngredient>,
  ) => {
    if (!ingredients) return;
    const next = ingredients.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    setIngredients(next);
    if (!nameEdited) {
      setMealName(defaultMealName(next.filter((item) => item.include)));
    }
  };

  const saveAll = async () => {
    if (!ingredients) return;
    const selected = ingredients.filter((item) => item.include);
    if (selected.length === 0) {
      Alert.alert("Select at least one item to log");
      return;
    }
    const name = mealName.trim() || defaultMealName(selected);
    if (!name) {
      Alert.alert("Name this meal before adding it");
      return;
    }

    // One row per photo, with the identified items kept as the breakdown, so
    // the daily log reads as meals instead of a wall of ingredients.
    // Rounded before saving, matching every other log path, so the meal total
    // is exactly the sum of the breakdown the detail screen shows.
    const ingredientRows = selected.map((item) => ({
      name: item.name,
      quantity: Math.round(item.estimatedGrams),
      unit: "g",
      calories: Math.round(item.calories),
      proteinG: Math.round(item.proteinG),
      carbsG: Math.round(item.carbsG),
      fatG: Math.round(item.fatG),
    }));
    const total = ingredientRows.reduce(
      (sum, item) => ({
        quantity: sum.quantity + item.quantity,
        calories: sum.calories + item.calories,
        proteinG: sum.proteinG + item.proteinG,
        carbsG: sum.carbsG + item.carbsG,
        fatG: sum.fatG + item.fatG,
      }),
      { quantity: 0, calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );

    setSaving(true);
    try {
      await createLog({
        date,
        name,
        quantity: total.quantity,
        unit: "g",
        calories: total.calories,
        proteinG: total.proteinG,
        carbsG: total.carbsG,
        fatG: total.fatG,
        source: "photo",
        photoStorageId: storageId ?? undefined,
        ingredients: ingredientRows,
      });
      onLogged();
    } catch (error) {
      Alert.alert(
        "Couldn't add the meal",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!photoUri) {
    return (
      <View style={styles.pickerContainer}>
        <Text style={styles.hint}>
          Snap a photo and each item gets its own portion estimate. Nothing is
          logged as a generic "1 serving".
        </Text>
        <Button label="Take a photo" onPress={() => pickAndAnalyze("camera")} />
        <Button
          label="Choose from your library"
          variant="secondary"
          onPress={() => pickAndAnalyze("library")}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.form} contentContainerStyle={{ gap: 12 }}>
      <Image source={{ uri: photoUri }} style={styles.preview} />

      {analyzing ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.hint}>Identifying ingredients…</Text>
        </View>
      ) : null}

      {ingredients ? (
        <View style={styles.mealNameGroup}>
          <Text style={styles.fieldLabel}>Meal name</Text>
          <TextInput
            style={styles.mealNameInput}
            value={mealName}
            onChangeText={(text) => {
              setNameEdited(true);
              setMealName(text);
            }}
          />
        </View>
      ) : null}

      {ingredients?.map((item, index) => (
        <View key={index} style={styles.ingredientCard}>
          <View style={styles.ingredientHeaderRow}>
            <TouchableOpacity
              onPress={() =>
                updateIngredient(index, { include: !item.include })
              }
              style={[
                styles.checkbox,
                item.include && styles.checkboxChecked,
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.include }}
              accessibilityLabel={`Include ${item.name || "this item"} in the log`}
            />
            <TextInput
              style={styles.ingredientName}
              value={item.name}
              onChangeText={(text) => updateIngredient(index, { name: text })}
            />
          </View>
          <View style={styles.ingredientFieldsRow}>
            <IngredientField
              label="grams"
              value={item.estimatedGrams}
              onChangeText={(n) =>
                updateIngredient(index, { estimatedGrams: n })
              }
            />
            <IngredientField
              label="cal"
              value={item.calories}
              onChangeText={(n) => updateIngredient(index, { calories: n })}
            />
            <IngredientField
              label="protein"
              value={item.proteinG}
              onChangeText={(n) => updateIngredient(index, { proteinG: n })}
            />
            <IngredientField
              label="carbs"
              value={item.carbsG}
              onChangeText={(n) => updateIngredient(index, { carbsG: n })}
            />
            <IngredientField
              label="fat"
              value={item.fatG}
              onChangeText={(n) => updateIngredient(index, { fatG: n })}
            />
          </View>
        </View>
      ))}

      {ingredients ? (
        <View style={styles.buttonRow}>
          <View style={styles.buttonHalf}>
            <Button
              label="Retake"
              variant="secondary"
              onPress={() => {
                setPhotoUri(null);
                setIngredients(null);
                setMealName("");
                setNameEdited(false);
              }}
            />
          </View>
          <View style={styles.buttonGrow}>
            <Button label="Add to log" onPress={saveAll} busy={saving} />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function IngredientField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: number;
  onChangeText: (value: number) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <TextInput
        style={styles.fieldInput}
        value={String(value)}
        keyboardType="numeric"
        onChangeText={(text) => onChangeText(Number(text) || 0)}
      />
      <Text style={styles.fieldLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerContainer: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm + 4,
    justifyContent: "center",
  },
  hint: { ...type.body, color: colors.textMuted, textAlign: "center" },
  form: { flex: 1, padding: spacing.lg },
  preview: { width: "100%", height: 200, borderRadius: radii.lg },
  loadingRow: {
    flexDirection: "row",
    gap: spacing.sm + 2,
    alignItems: "center",
  },
  ingredientCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.sm + 6,
    gap: spacing.sm + 2,
  },
  ingredientHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm - 2,
    borderWidth: 2,
    borderColor: colors.border,
  },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  ingredientName: {
    flex: 1,
    ...type.bodyStrong,
    color: colors.text,
  },
  ingredientFieldsRow: { flexDirection: "row", gap: spacing.sm },
  fieldGroup: { flex: 1, alignItems: "center" },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    textAlign: "center",
    color: colors.text,
    width: "100%",
    ...tabular,
  },
  buttonHalf: { width: 120 },
  buttonGrow: { flex: 1 },
  fieldLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  mealNameGroup: { gap: spacing.xs + 2 },
  mealNameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    minHeight: 48,
    ...type.bodyStrong,
    color: colors.text,
  },
  buttonRow: { flexDirection: "row", gap: spacing.sm + 4 },
});
