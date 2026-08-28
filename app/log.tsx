import { useMutation } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../convex/_generated/api";
import { colors, radii, spacing, type } from "../constants/theme";
import { FoodSearchResult, searchFoods } from "../lib/openFoodFacts";
import { PhotoTab } from "../components/PhotoTab";
import { BarcodeTab } from "../components/BarcodeTab";

type Mode = "photo" | "barcode" | "search" | "manual";

const MODES: { value: Mode; label: string }[] = [
  { value: "photo", label: "Photo" },
  { value: "barcode", label: "Barcode" },
  { value: "search", label: "Search" },
  { value: "manual", label: "Manual" },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LogFoodScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const date = dateParam ?? todayKey();

  const [mode, setMode] = useState<Mode>("photo");

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Log food — {date}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.modeRow}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.value}
            style={[styles.modeChip, mode === m.value && styles.modeChipActive]}
            onPress={() => setMode(m.value)}
          >
            <Text
              style={[
                styles.modeChipText,
                mode === m.value && styles.modeChipTextActive,
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === "photo" ? (
        <PhotoTab date={date} onLogged={() => router.back()} />
      ) : mode === "barcode" ? (
        <BarcodeTab date={date} onLogged={() => router.back()} />
      ) : mode === "search" ? (
        <SearchTab date={date} onLogged={() => router.back()} />
      ) : (
        <ManualTab date={date} onLogged={() => router.back()} />
      )}
    </SafeAreaView>
  );
}

function SearchTab({
  date,
  onLogged,
}: {
  date: string;
  onLogged: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [grams, setGrams] = useState("100");
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
    const gramsNum = Number(grams);
    if (!gramsNum || gramsNum <= 0) {
      Alert.alert("Enter a valid amount in grams");
      return;
    }
    const scale = gramsNum / 100;
    await createLog({
      date,
      name: selected.name,
      quantity: gramsNum,
      unit: "g",
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
          Amount (grams){selected.packageGrams ? " — from the package size" : ""}
        </Text>
        <TextInput
          style={styles.input}
          value={grams}
          onChangeText={setGrams}
          keyboardType="numeric"
        />
        <Text style={styles.previewText}>
          {Math.round((selected.caloriesPer100g * Number(grams || "0")) / 100)}{" "}
          cal for {grams || 0}g
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
              setGrams(String(item.packageGrams ?? 100));
            }}
          >
            <Text style={styles.resultName}>{item.name}</Text>
            <Text style={styles.resultMeta}>
              {Math.round(item.caloriesPer100g)} cal / 100g
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

function ManualTab({
  date,
  onLogged,
}: {
  date: string;
  onLogged: () => void;
}) {
  const createLog = useMutation(api.foodLogs.create);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("serving");
  const [calories, setCalories] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [carbsG, setCarbsG] = useState("");
  const [fatG, setFatG] = useState("");

  const save = async () => {
    if (!name.trim() || !calories) {
      Alert.alert("Name and calories are required");
      return;
    }
    await createLog({
      date,
      name: name.trim(),
      quantity: Number(quantity) || 1,
      unit,
      calories: Number(calories) || 0,
      proteinG: Number(proteinG) || 0,
      carbsG: Number(carbsG) || 0,
      fatG: Number(fatG) || 0,
      source: "manual",
    });
    onLogged();
  };

  return (
    <View style={styles.form}>
      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} />

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

      <TouchableOpacity style={styles.saveButton} onPress={save}>
        <Text style={styles.saveButtonText}>Add to log</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  closeText: { color: colors.textMuted, fontWeight: "600" },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeChipActive: { backgroundColor: colors.accentTint, borderColor: colors.accent },
  modeChipText: { ...type.label, color: colors.text, fontWeight: "500" },
  modeChipTextActive: { color: colors.accent },
  form: { flex: 1, padding: 20, gap: 12 },
  row: { flexDirection: "row", gap: 12 },
  fieldLabel: { color: colors.textMuted, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  searchButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  resultRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  resultName: { color: colors.text, fontWeight: "600" },
  resultMeta: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  emptyText: { color: colors.textMuted, marginTop: 20, textAlign: "center" },
  selectedName: { fontSize: 18, fontWeight: "700", color: colors.text },
  previewText: { color: colors.textMuted },
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: { color: colors.text, fontWeight: "600" },
  saveButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: { color: colors.onAccent, fontWeight: "700" },
});
