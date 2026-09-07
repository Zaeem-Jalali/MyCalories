import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { radii, spacing, type, type ThemeColors } from "../constants/theme";
import { useTheme, useThemedStyles } from "../components/ThemeProvider";
import { FoodSearchResult, searchFoods } from "../lib/openFoodFacts";
import { PhotoTab } from "../components/PhotoTab";
import { BarcodeTab } from "../components/BarcodeTab";
import { Chip } from "../components/ui/Chip";
import { PressableScale } from "../components/ui/PressableScale";
import { formatDateLabel, todayKey } from "../lib/dateKey";
import { Authenticated } from "convex/react";

type Mode = "photo" | "barcode" | "search" | "saved" | "manual";

const MODES: { value: Mode; label: string }[] = [
  { value: "photo", label: "Photo" },
  { value: "barcode", label: "Barcode" },
  { value: "search", label: "Search" },
  { value: "saved", label: "Saved" },
  { value: "manual", label: "Manual" },
];

function LogFoodScreenContent() {
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const date = dateParam ?? todayKey();

  const [mode, setMode] = useState<Mode>("photo");

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Log food</Text>
          <Text style={styles.subtitle}>{formatDateLabel(date)}</Text>
        </View>
        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>Close</Text>
        </PressableScale>
      </View>

      {/* Five options never fit one phone row. Scrolling keeps them on a
          single line instead of wrapping one orphan chip onto a second. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.modeScroll}
        contentContainerStyle={styles.modeRow}
      >
        {MODES.map((m) => (
          <Chip
            key={m.value}
            label={m.label}
            size="sm"
            selected={mode === m.value}
            onPress={() => setMode(m.value)}
          />
        ))}
      </ScrollView>

      {mode === "photo" ? (
        <PhotoTab date={date} onLogged={() => router.back()} />
      ) : mode === "barcode" ? (
        <BarcodeTab date={date} onLogged={() => router.back()} />
      ) : mode === "search" ? (
        <SearchTab date={date} onLogged={() => router.back()} />
      ) : mode === "saved" ? (
        <SavedTab date={date} onLogged={() => router.back()} />
      ) : (
        <ManualTab date={date} onLogged={() => router.back()} />
      )}
    </SafeAreaView>
  );
}

function SearchTab({ date, onLogged }: { date: string; onLogged: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [amount, setAmount] = useState("100");
  const createLog = useMutation(api.foodLogs.create);

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const found = await searchFoods(query.trim());
      setResults(found);
    } catch (error) {
      Alert.alert(
        "Search failed",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setLoading(false);
    }
  };

  const logSelected = async () => {
    if (!selected) return;
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert(`Enter a valid amount in ${selected.unit}`);
      return;
    }
    const scale = amountNum / 100;
    await createLog({
      date,
      name: selected.name,
      quantity: amountNum,
      unit: selected.unit,
      calories: Math.round(selected.caloriesPer100g * scale),
      proteinG: Math.round(selected.proteinPer100g * scale),
      carbsG: Math.round(selected.carbsPer100g * scale),
      fatG: Math.round(selected.fatPer100g * scale),
      source: "barcode",
    });
    onLogged();
  };

  if (selected) {
    return (
      <View style={styles.form}>
        <Text style={styles.selectedName}>{selected.name}</Text>
        <Text style={styles.fieldLabel}>
          Amount ({selected.unit})
          {selected.packageAmount ? " (from the package size)" : ""}
        </Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        <Text style={styles.previewText}>
          {Math.round((selected.caloriesPer100g * Number(amount || "0")) / 100)}{" "}
          cal for {amount || 0}
          {selected.unit}
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setSelected(null)}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={logSelected}>
            <Text style={styles.saveButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={query}
          onChangeText={setQuery}
          placeholder="Search a food, e.g. chicken breast"
          onSubmitEditing={runSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={runSearch}>
          <Text style={styles.saveButtonText}>Go</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : null}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultRow}
            onPress={() => {
              setSelected(item);
              setAmount(String(item.packageAmount ?? 100));
            }}
          >
            <Text style={styles.resultName}>{item.name}</Text>
            <Text style={styles.resultMeta}>
              {Math.round(item.caloriesPer100g)} cal / 100{item.unit}
              {item.brand ? ` · ${item.brand}` : ""}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              Search Open Food Facts for packaged foods.
            </Text>
          ) : null
        }
      />
    </View>
  );
}

function SavedTab({ date, onLogged }: { date: string; onLogged: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const savedMeals = useQuery(api.savedMeals.list, {});
  const createLog = useMutation(api.foodLogs.create);
  const removeSaved = useMutation(api.savedMeals.remove);
  const [filter, setFilter] = useState("");

  const filtered = (savedMeals ?? []).filter((meal) =>
    meal.name.toLowerCase().includes(filter.trim().toLowerCase()),
  );

  const logMeal = async (meal: Doc<"savedMeals">) => {
    await createLog({
      date,
      name: meal.name,
      quantity: meal.quantity,
      unit: meal.unit,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
      source: "saved",
      savedMealId: meal._id,
    });
    onLogged();
  };

  return (
    <View style={styles.form}>
      <TextInput
        style={styles.input}
        value={filter}
        onChangeText={setFilter}
        placeholder="Filter saved meals"
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.resultRow}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => logMeal(item)}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultMeta}>
                {item.calories} cal · {item.quantity}
                {item.unit}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                Alert.alert("Remove saved meal", `Delete "${item.name}"?`, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => removeSaved({ id: item._id }),
                  },
                ])
              }
              hitSlop={8}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          savedMeals !== undefined ? (
            <Text style={styles.emptyText}>
              No saved meals yet. Check &quot;Save as a reusable meal&quot; when
              logging manually to build this list.
            </Text>
          ) : null
        }
      />
    </View>
  );
}

function ManualTab({ date, onLogged }: { date: string; onLogged: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const createLog = useMutation(api.foodLogs.create);
  const createSavedMeal = useMutation(api.savedMeals.create);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const discardUpload = useMutation(api.files.discardUpload);
  // An uploaded blob that has not been attached to a log yet. Cleaned up when
  // it is replaced, removed, or the screen closes before saving, so an
  // abandoned pick does not leave a billable orphan in storage.
  const pendingUpload = useRef<Id<"_storage"> | null>(null);
  const discardPending = () => {
    const orphan = pendingUpload.current;
    pendingUpload.current = null;
    if (orphan) {
      discardUpload({ storageId: orphan }).catch((error) => {
        // Best-effort cleanup: a failure here only means the orphan lingers.
        console.warn("Could not discard an unused upload", error);
      });
    }
  };
  useEffect(() => discardPending, []);

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("serving");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");
  const [saveAsMeal, setSaveAsMeal] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoStorageId, setPhotoStorageId] = useState<Id<"_storage"> | null>(
    null,
  );
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickPhoto = async (source: "camera" | "library") => {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        `Allow ${source} access to add a photo.`,
      );
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    // Drop any previous upload up front: if this pick fails, save() must not
    // fall back to attaching the earlier photo the user thinks they replaced.
    discardPending();
    setPhotoUri(asset.uri);
    setPhotoStorageId(null);
    setUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const blob = await (await fetch(asset.uri)).blob();
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
      const { storageId } = await uploadResponse.json();
      if (typeof storageId !== "string") {
        throw new Error("Upload did not return a file id.");
      }
      pendingUpload.current = storageId as Id<"_storage">;
      setPhotoStorageId(storageId as Id<"_storage">);
    } catch (error) {
      setPhotoUri(null);
      setPhotoStorageId(null);
      Alert.alert(
        "Couldn't attach the photo",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const choosePhoto = () => {
    Alert.alert("Add a photo of the meal", undefined, [
      { text: "Take photo", onPress: () => pickPhoto("camera") },
      { text: "Choose from library", onPress: () => pickPhoto("library") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removePhoto = () => {
    discardPending();
    setPhotoUri(null);
    setPhotoStorageId(null);
  };

  const save = async () => {
    if (!name.trim() || !calories) {
      Alert.alert("Name and calories are required");
      return;
    }
    if (uploadingPhoto) {
      Alert.alert("Photo still uploading", "Give it a second and try again.");
      return;
    }
    const values = {
      name: name.trim(),
      quantity: Number(quantity) || 1,
      unit,
      calories: Number(calories) || 0,
      proteinG: Number(proteinG) || 0,
      carbsG: Number(carbsG) || 0,
      fatG: Number(fatG) || 0,
    };
    setSaving(true);
    try {
      await createLog({
        date,
        source: "manual",
        photoStorageId: photoStorageId ?? undefined,
        ...values,
      });
    } catch (error) {
      setSaving(false);
      Alert.alert(
        "Couldn't add to the log",
        error instanceof Error ? error.message : "Unknown error",
      );
      return;
    }
    // The photo now belongs to a log row, so it must not be cleaned up as an
    // orphan when this screen closes.
    pendingUpload.current = null;
    // The log row is committed. A failure saving the reusable-meal template
    // (a text-only copy, no photo) must not read as "the meal wasn't logged"
    // or the user re-taps and double-logs.
    if (saveAsMeal) {
      try {
        await createSavedMeal(values);
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

  return (
    <ScrollView
      style={styles.formScroll}
      contentContainerStyle={styles.formContent}
    >
      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

      <Text style={styles.fieldLabel}>Photo (optional)</Text>
      {photoUri ? (
        <View style={styles.photoRow}>
          <Image source={{ uri: photoUri }} style={styles.photoThumb} />
          {uploadingPhoto ? (
            <ActivityIndicator />
          ) : (
            <TouchableOpacity onPress={removePhoto} hitSlop={8}>
              <Text style={styles.deleteText}>Remove photo</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity style={styles.secondaryButton} onPress={choosePhoto}>
          <Text style={styles.secondaryButtonText}>Add a photo</Text>
        </TouchableOpacity>
      )}

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Quantity</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Unit</Text>
          <TextInput style={styles.input} value={unit} onChangeText={setUnit} />
        </View>
      </View>

      <Text style={styles.fieldLabel}>Calories</Text>
      <TextInput
        style={styles.input}
        value={calories}
        onChangeText={setCalories}
        keyboardType="numeric"
      />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Protein (g)</Text>
          <TextInput
            style={styles.input}
            value={proteinG}
            onChangeText={setProteinG}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Carbs (g)</Text>
          <TextInput
            style={styles.input}
            value={carbsG}
            onChangeText={setCarbsG}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>Fat (g)</Text>
          <TextInput
            style={styles.input}
            value={fatG}
            onChangeText={setFatG}
            keyboardType="numeric"
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setSaveAsMeal((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: saveAsMeal }}
      >
        <View style={[styles.checkbox, saveAsMeal && styles.checkboxChecked]} />
        <Text style={styles.checkboxLabel}>Save as a reusable meal</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={save}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.saveButtonText}>Add to log</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm + 4,
    },
    headerText: { gap: 2 },
    title: { ...type.title, fontSize: 20, color: c.text },
    subtitle: { ...type.label, color: c.textMuted },
    closeButton: { paddingVertical: spacing.xs, paddingLeft: spacing.md },
    closeText: { ...type.label, color: c.textMuted, fontWeight: "600" },
    // A horizontal ScrollView stretches to fill its column parent unless it is
    // told not to, which pushed the tab content to the bottom of the screen.
    modeScroll: { flexGrow: 0, flexShrink: 0 },
    modeRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + 4,
    },
    form: { flex: 1, padding: 20, gap: 12 },
    formScroll: { flex: 1 },
    formContent: { padding: 20, gap: 12, paddingBottom: 40 },
    row: { flexDirection: "row", gap: 12 },
    photoRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    photoThumb: { width: 64, height: 64, borderRadius: radii.md },
    fieldLabel: { color: c.textMuted, marginBottom: 6 },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      color: c.text,
    },
    searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
    searchButton: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    deleteText: { color: c.danger, fontWeight: "600", fontSize: 13 },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: c.border,
    },
    checkboxChecked: { backgroundColor: c.accent, borderColor: c.accent },
    checkboxLabel: { color: c.text },
    resultName: { color: c.text, fontWeight: "600" },
    resultMeta: { color: c.textMuted, marginTop: 2, fontSize: 13 },
    emptyText: { color: c.textMuted, marginTop: 20, textAlign: "center" },
    selectedName: { fontSize: 18, fontWeight: "700", color: c.text },
    previewText: { color: c.textMuted },
    buttonRow: { flexDirection: "row", gap: 12, marginTop: 8 },
    secondaryButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    secondaryButtonText: { color: c.text, fontWeight: "600" },
    saveButton: {
      flex: 1,
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    saveButtonText: { color: c.onAccent, fontWeight: "700" },
  });

// Mounted only with a session: every query on this screen is account-scoped.
export default function LogFoodScreen() {
  return (
    <Authenticated>
      <LogFoodScreenContent />
    </Authenticated>
  );
}
