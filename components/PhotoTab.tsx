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
  View,
} from "react-native";

import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import {
  card,
  cardTight,
  radii,
  spacing,
  tabular,
  type,
  type ThemeColors,
} from "../constants/theme";
import { useTheme, useThemedStyles } from "./ThemeProvider";
import { Button } from "./ui/Button";
import { PressableScale } from "./ui/PressableScale";
import type { IdentifiedIngredient } from "../convex/vision";
import { downscaleForVision, VISION_FOOD_WIDTH } from "../lib/prepImage";

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

const round = (n: number) => Math.round(n);

export function PhotoTab({
  date,
  onLogged,
}: {
  date: string;
  onLogged: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const identifyFood = useAction(api.vision.identifyFood);
  const createLog = useMutation(api.foodLogs.create);
  const createSavedMeal = useMutation(api.savedMeals.create);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [ingredients, setIngredients] = useState<EditableIngredient[] | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [mealName, setMealName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [saveAsMeal, setSaveAsMeal] = useState(false);

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
    setSaveAsMeal(false);
    setAnalyzing(true);

    try {
      const scaledUri = await downscaleForVision(asset.uri, VISION_FOOD_WIDTH);
      setPhotoUri(scaledUri);

      const uploadUrl = await generateUploadUrl();
      const response = await fetch(scaledUri);
      const blob = await response.blob();

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
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

  // The portion stepper is the primary way to correct an estimate: nudge the
  // grams and every macro moves with it, in proportion, so the numbers stay
  // consistent. The fields are still directly editable for a manual override.
  const stepPortion = (index: number, deltaGrams: number) => {
    if (!ingredients) return;
    const item = ingredients[index];
    const currentGrams = round(item.estimatedGrams);
    const nextGrams = Math.max(10, currentGrams + deltaGrams);
    // A zero or missing estimate has no ratio to scale by; fall back to a
    // flat per-gram rate from whatever macro values came back.
    const ratio = currentGrams > 0 ? nextGrams / currentGrams : 1;
    updateIngredient(index, {
      estimatedGrams: nextGrams,
      calories: item.calories * ratio,
      proteinG: item.proteinG * ratio,
      carbsG: item.carbsG * ratio,
      fatG: item.fatG * ratio,
    });
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
      quantity: round(item.estimatedGrams),
      unit: "g",
      calories: round(item.calories),
      proteinG: round(item.proteinG),
      carbsG: round(item.carbsG),
      fatG: round(item.fatG),
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

    const totals = {
      calories: total.calories,
      proteinG: total.proteinG,
      carbsG: total.carbsG,
      fatG: total.fatG,
    };

    setSaving(true);
    try {
      await createLog({
        date,
        name,
        quantity: total.quantity,
        unit: "g",
        ...totals,
        source: "photo",
        photoStorageId: storageId ?? undefined,
        ingredients: ingredientRows,
      });
    } catch (error) {
      setSaving(false);
      Alert.alert(
        "Couldn't add the meal",
        error instanceof Error ? error.message : "Unknown error",
      );
      return;
    }

    // The meal is logged. A saved-meal template is the totals only, no photo
    // and no ingredient breakdown. A failure here must not read as "the meal
    // wasn't logged" or the user re-taps and double-logs.
    if (saveAsMeal) {
      try {
        await createSavedMeal({
          name,
          quantity: total.quantity,
          unit: "g",
          ...totals,
        });
      } catch (error) {
        Alert.alert(
          "Logged, but couldn't save the reusable meal",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    }
    setSaving(false);
    onLogged();
  };

  if (!photoUri) {
    return (
      <View style={styles.pickerContainer}>
        <View style={styles.viewfinder}>
          <View style={styles.viewfinderFrame} />
          <Text style={styles.viewfinderHint}>Frame the whole plate</Text>
        </View>
        <Text style={styles.hint}>
          CalorieAI estimates each item and you check the numbers before
          anything is saved.
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

  const selected = ingredients?.filter((item) => item.include) ?? [];
  const reviewTotal = selected.reduce((sum, item) => sum + item.calories, 0);

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.reviewHead}>
          <Image source={{ uri: photoUri }} style={styles.thumb} />
          <View style={styles.reviewHeadMain}>
            <Text style={styles.eyebrow}>Meal name</Text>
            {ingredients ? (
              <TextInput
                style={styles.mealNameInput}
                value={mealName}
                onChangeText={(text) => {
                  setNameEdited(true);
                  setMealName(text);
                }}
              />
            ) : (
              <View style={styles.mealNamePlaceholder} />
            )}
            <PressableScale
              onPress={() => {
                setPhotoUri(null);
                setIngredients(null);
                setMealName("");
                setNameEdited(false);
                setSaveAsMeal(false);
              }}
              accessibilityRole="button"
              accessibilityLabel="Retake photo"
            >
              <Text style={styles.retake}>Retake photo</Text>
            </PressableScale>
          </View>
        </View>

        {analyzing ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <Text style={styles.hint}>Identifying items and portions…</Text>
          </View>
        ) : null}

        {ingredients ? (
          <>
            <View style={styles.itemsHeader}>
              <Text style={styles.sectionTitle}>Items found</Text>
              <Text style={styles.sectionNote}>Every number is editable</Text>
            </View>

            <View style={styles.itemList}>
              {ingredients.map((item, index) => (
                <View
                  key={index}
                  style={[styles.itemCard, !item.include && styles.itemCardOff]}
                >
                  <View style={styles.itemTop}>
                    <PressableScale
                      scaleTo={0.9}
                      onPress={() =>
                        updateIngredient(index, { include: !item.include })
                      }
                      style={[
                        styles.checkbox,
                        item.include && styles.checkboxOn,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: item.include }}
                      accessibilityLabel={`Include ${item.name || "this item"} in the log`}
                    >
                      {item.include ? (
                        <Text style={styles.checkMark}>✓</Text>
                      ) : null}
                    </PressableScale>
                    <TextInput
                      style={[
                        styles.itemName,
                        !item.include && styles.itemNameOff,
                      ]}
                      value={item.name}
                      onChangeText={(text) =>
                        updateIngredient(index, { name: text })
                      }
                    />
                  </View>

                  <View style={styles.fieldsRow}>
                    <ItemField
                      label="kcal"
                      value={item.calories}
                      onChange={(n) => updateIngredient(index, { calories: n })}
                    />
                    <ItemField
                      label="protein"
                      value={item.proteinG}
                      onChange={(n) => updateIngredient(index, { proteinG: n })}
                    />
                    <ItemField
                      label="carbs"
                      value={item.carbsG}
                      onChange={(n) => updateIngredient(index, { carbsG: n })}
                    />
                    <ItemField
                      label="fat"
                      value={item.fatG}
                      onChange={(n) => updateIngredient(index, { fatG: n })}
                    />
                  </View>

                  <View style={styles.portionRow}>
                    <Text style={styles.portionLabel}>Adjust portion</Text>
                    <View style={styles.stepper}>
                      <PressableScale
                        scaleTo={0.92}
                        style={styles.stepButton}
                        onPress={() => stepPortion(index, -10)}
                        accessibilityRole="button"
                        accessibilityLabel={`Reduce ${item.name} portion`}
                      >
                        <Text style={styles.stepGlyph}>−</Text>
                      </PressableScale>
                      <Text style={styles.stepValue}>
                        {round(item.estimatedGrams)} g
                      </Text>
                      <PressableScale
                        scaleTo={0.92}
                        style={styles.stepButton}
                        onPress={() => stepPortion(index, 10)}
                        accessibilityRole="button"
                        accessibilityLabel={`Increase ${item.name} portion`}
                      >
                        <Text style={styles.stepGlyph}>+</Text>
                      </PressableScale>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {ingredients ? (
        <View style={styles.footer}>
          <View style={styles.footerTop}>
            <Text style={styles.footerCount}>
              {selected.length} of {ingredients.length} item
              {ingredients.length === 1 ? "" : "s"} included
            </Text>
            <Text style={styles.footerTotal}>{round(reviewTotal)} kcal</Text>
          </View>
          <PressableScale
            style={styles.saveMealRow}
            onPress={() => setSaveAsMeal((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: saveAsMeal }}
            accessibilityLabel="Save as a reusable meal"
          >
            <View
              style={[styles.saveMealBox, saveAsMeal && styles.saveMealBoxOn]}
            >
              {saveAsMeal ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
            <Text style={styles.saveMealLabel}>Save as a reusable meal</Text>
          </PressableScale>
          <Button label="Add to log" onPress={saveAll} busy={saving} />
        </View>
      ) : null}
    </View>
  );
}

function ItemField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={String(round(value))}
        keyboardType="numeric"
        onChangeText={(text) => onChange(Number(text) || 0)}
      />
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: { flex: 1 },
    scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.md },

    pickerContainer: {
      flex: 1,
      padding: spacing.lg,
      gap: spacing.sm + 4,
      justifyContent: "center",
    },
    viewfinder: {
      ...cardTight(c),
      backgroundColor: c.surface,
      minHeight: 220,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    viewfinderFrame: {
      width: 44,
      height: 36,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      borderColor: c.textMuted,
    },
    viewfinderHint: { ...type.label, color: c.textMuted },
    hint: { ...type.body, color: c.textMuted, textAlign: "center" },
    loadingRow: {
      flexDirection: "row",
      gap: spacing.sm + 2,
      alignItems: "center",
    },

    reviewHead: {
      flexDirection: "row",
      gap: spacing.md,
      alignItems: "flex-start",
    },
    thumb: {
      width: 80,
      height: 80,
      borderRadius: radii.md,
      backgroundColor: c.surface,
    },
    reviewHeadMain: { flex: 1, gap: spacing.sm },
    eyebrow: {
      fontSize: 11,
      fontWeight: "500",
      letterSpacing: 0.6,
      textTransform: "uppercase",
      color: c.textMuted,
    },
    mealNameInput: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      minHeight: 44,
      ...type.body,
      color: c.text,
    },
    mealNamePlaceholder: {
      height: 44,
      borderRadius: radii.md,
      backgroundColor: c.surface,
    },
    retake: { ...type.label, color: c.accent, fontWeight: "600" },

    itemsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
    },
    sectionTitle: { ...type.bodyStrong, fontSize: 17, color: c.text },
    sectionNote: { fontSize: 12.5, color: c.textMuted },

    itemList: { gap: spacing.sm },
    itemCard: { ...cardTight(c), padding: spacing.md, gap: spacing.sm + 4 },
    itemCardOff: { backgroundColor: c.surface },
    itemTop: {
      flexDirection: "row",
      gap: spacing.sm + 4,
      alignItems: "flex-start",
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      borderColor: c.track,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    checkboxOn: { backgroundColor: c.accent, borderColor: c.accent },
    checkMark: { color: c.onAccent, fontSize: 13, fontWeight: "700" },
    itemName: { flex: 1, ...type.body, color: c.text },
    itemNameOff: { color: c.textMuted },

    fieldsRow: { flexDirection: "row", gap: spacing.xs + 2 },
    field: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.sm,
      paddingHorizontal: spacing.xs + 4,
      paddingTop: 6,
      paddingBottom: 4,
    },
    fieldLabel: {
      fontSize: 9.5,
      fontWeight: "500",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      color: c.textMuted,
    },
    fieldInput: {
      fontSize: 15,
      fontWeight: "500",
      color: c.text,
      paddingVertical: 4,
      ...tabular,
    },

    portionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    portionLabel: { fontSize: 12.5, color: c.textMuted },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs + 2,
    },
    stepButton: {
      width: 44,
      height: 36,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    stepGlyph: { fontSize: 17, color: c.text },
    stepValue: {
      minWidth: 60,
      textAlign: "center",
      ...type.label,
      color: c.text,
      ...tabular,
    },

    footer: {
      ...card(c),
      borderRadius: 0,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      padding: spacing.lg,
      paddingBottom: spacing.lg + 6,
      gap: spacing.sm + 4,
    },
    footerTop: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    saveMealRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
    },
    saveMealBox: {
      width: 22,
      height: 22,
      borderRadius: radii.sm,
      borderWidth: 1.5,
      borderColor: c.track,
      alignItems: "center",
      justifyContent: "center",
    },
    saveMealBoxOn: { backgroundColor: c.accent, borderColor: c.accent },
    saveMealLabel: { ...type.body, color: c.text },
    footerCount: { ...type.body, color: c.textMuted },
    footerTotal: {
      fontSize: 20,
      fontWeight: "600",
      color: c.text,
      ...tabular,
    },
  });
