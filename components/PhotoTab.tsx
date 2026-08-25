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
import { colors } from "../constants/theme";
import type { IdentifiedIngredient } from "../convex/vision";

type EditableIngredient = IdentifiedIngredient & { include: boolean };

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
      const { storageId: uploadedId } = await uploadResponse.json();
      setStorageId(uploadedId);

      const found = await identifyFood({ storageId: uploadedId });
      setIngredients(found.map((item) => ({ ...item, include: true })));
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
    setIngredients((current) =>
      current
        ? current.map((item, i) => (i === index ? { ...item, ...patch } : item))
        : current,
    );
  };

  const saveAll = async () => {
    if (!ingredients) return;
    const selected = ingredients.filter((item) => item.include);
    if (selected.length === 0) {
      Alert.alert("Select at least one item to log");
      return;
    }
    setSaving(true);
    try {
      for (const item of selected) {
        await createLog({
          date,
          name: item.name,
          quantity: item.estimatedGrams,
          unit: "g",
          calories: item.calories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
          source: "photo",
          photoStorageId: storageId ?? undefined,
        });
      }
      onLogged();
    } finally {
      setSaving(false);
    }
  };

  if (!photoUri) {
    return (
      <View style={styles.pickerContainer}>
        <Text style={styles.hint}>
          Snap a photo and each item gets its own portion estimate — nothing
          gets logged as a generic "1 serving."
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => pickAndAnalyze("camera")}
        >
          <Text style={styles.primaryButtonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => pickAndAnalyze("library")}
        >
          <Text style={styles.secondaryButtonText}>Choose from Library</Text>
        </TouchableOpacity>
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
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              setPhotoUri(null);
              setIngredients(null);
            }}
          >
            <Text style={styles.secondaryButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, { flex: 1 }]}
            onPress={saveAll}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? "Saving…" : "Add to log"}
            </Text>
          </TouchableOpacity>
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
  pickerContainer: { flex: 1, padding: 20, gap: 12, justifyContent: "center" },
  hint: { color: colors.textMuted, textAlign: "center" },
  primaryButton: {
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: { color: colors.background, fontWeight: "700" },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: { color: colors.text, fontWeight: "600" },
  form: { flex: 1, padding: 20 },
  preview: { width: "100%", height: 200, borderRadius: 16 },
  loadingRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  ingredientCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  ingredientHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
  },
  checkboxChecked: { backgroundColor: colors.text, borderColor: colors.text },
  ingredientName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  ingredientFieldsRow: { flexDirection: "row", gap: 8 },
  fieldGroup: { flex: 1, alignItems: "center" },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    textAlign: "center",
    color: colors.text,
    width: "100%",
  },
  fieldLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  buttonRow: { flexDirection: "row", gap: 12 },
});
