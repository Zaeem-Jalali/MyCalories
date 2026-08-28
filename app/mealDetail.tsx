import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { colors, radii, spacing, type } from "../constants/theme";
import { Authenticated } from "convex/react";

function MealDetailScreenContent() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  // A deep link or a restored navigation state can land here without a usable
  // id; skipping the query keeps that from throwing inside argument validation.
  const log = useQuery(
    api.foodLogs.get,
    id ? { id: id as Id<"foodLogs"> } : "skip",
  );

  if (!id || log === null) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>This entry no longer exists.</Text>
      </SafeAreaView>
    );
  }

  if (log === undefined) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const ingredients = log.ingredients ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {log.photoUrl ? (
          <Image source={{ uri: log.photoUrl }} style={styles.photo} />
        ) : null}

        <Text style={styles.title}>{log.name}</Text>
        <Text style={styles.subtitle}>
          {Math.round(log.calories)} cal · {Math.round(log.quantity)}
          {log.unit} · {log.date}
        </Text>

        <View style={styles.macroRow}>
          <Macro label="Protein" value={log.proteinG} color={colors.protein} />
          <Macro label="Carbs" value={log.carbsG} color={colors.carbs} />
          <Macro label="Fat" value={log.fatG} color={colors.fat} />
        </View>

        {ingredients.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>What's in it</Text>
            {ingredients.map((item, index) => (
              <View key={index} style={styles.ingredientRow}>
                <View style={styles.ingredientMain}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  <Text style={styles.ingredientMeta}>
                    {Math.round(item.quantity)}
                    {item.unit} · {Math.round(item.proteinG)}p{" "}
                    {Math.round(item.carbsG)}c {Math.round(item.fatG)}f
                  </Text>
                </View>
                <Text style={styles.ingredientCalories}>
                  {Math.round(item.calories)} cal
                </Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Macro({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.macroCard}>
      <Text style={[styles.macroValue, { color }]}>{Math.round(value)}g</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: "center", justifyContent: "center" },
  headerRow: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  backButton: { padding: spacing.xs, alignSelf: "flex-start" },
  content: { padding: 20, gap: spacing.md, paddingBottom: 40 },
  photo: { width: "100%", height: 260, borderRadius: radii.lg },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  subtitle: { ...type.label, color: colors.textMuted, marginTop: -8 },
  macroRow: { flexDirection: "row", gap: 12 },
  macroCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    alignItems: "center",
  },
  macroValue: { fontSize: 18, fontWeight: "700" },
  macroLabel: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.xs,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  ingredientMain: { flex: 1, gap: 2 },
  ingredientName: { color: colors.text, fontWeight: "500" },
  ingredientMeta: { ...type.label, color: colors.textMuted },
  ingredientCalories: { color: colors.textMuted },
  emptyText: { color: colors.textMuted },
});

// Mounted only with a session: every query on this screen is account-scoped.
export default function MealDetailScreen() {
  return (
    <Authenticated>
      <MealDetailScreenContent />
    </Authenticated>
  );
}
