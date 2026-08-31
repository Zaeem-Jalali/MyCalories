import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProgressTrack } from "../components/ui/ProgressTrack";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { card, cardTight, colors, radii, spacing, tabular, type } from "../constants/theme";
import { formatDateLabel } from "../lib/dateKey";
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
  const profile = useQuery(api.profile.get, {});
  const removeLog = useMutation(api.foodLogs.remove);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    Alert.alert(
      "Delete this entry?",
      "It will be removed from the day's log. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            setDeleting(true);
            try {
              await removeLog({ id: id as Id<"foodLogs"> });
              router.back();
            } catch (error) {
              setDeleting(false);
              Alert.alert(
                "Couldn't delete the entry",
                error instanceof Error ? error.message : "Unknown error",
              );
            }
          },
        },
      ],
    );
  };

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
  const itemLine =
    ingredients.length > 0
      ? `, ${ingredients.length} item${ingredients.length === 1 ? "" : "s"}`
      : "";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={confirmDelete}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="Delete this entry"
          style={styles.deleteButton}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {log.photoUrl ? (
          <Image source={{ uri: log.photoUrl }} style={styles.photo} />
        ) : null}

        <Text style={styles.title}>{log.name}</Text>
        <Text style={styles.subtitle}>
          {Math.round(log.calories)} kcal{itemLine}, logged {formatDateLabel(log.date)}
        </Text>

        <View style={styles.macroRow}>
          <Macro
            label="Protein"
            value={log.proteinG}
            goal={profile?.proteinGoalG}
            color={colors.protein}
          />
          <Macro
            label="Carbs"
            value={log.carbsG}
            goal={profile?.carbsGoalG}
            color={colors.carbs}
          />
          <Macro
            label="Fat"
            value={log.fatG}
            goal={profile?.fatGoalG}
            color={colors.fat}
          />
        </View>

        {ingredients.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Ingredient breakdown</Text>
            <View style={styles.ingredientCard}>
              {ingredients.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.ingredientRow,
                    index === ingredients.length - 1 && styles.ingredientRowLast,
                  ]}
                >
                  <View style={styles.ingredientMain}>
                    <Text style={styles.ingredientName}>{item.name}</Text>
                    <Text style={styles.ingredientMeta}>
                      {Math.round(item.quantity)}
                      {item.unit} · {Math.round(item.proteinG)}p{" "}
                      {Math.round(item.carbsG)}c {Math.round(item.fatG)}f
                    </Text>
                  </View>
                  <Text style={styles.ingredientCalories}>
                    {Math.round(item.calories)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Macro({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal?: number;
  color: string;
}) {
  return (
    <View style={styles.macroCard}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{Math.round(value)} g</Text>
      {goal ? (
        <View style={styles.macroTrack}>
          <ProgressTrack value={value} goal={goal} color={color} height={4} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: "center", justifyContent: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    padding: spacing.xs,
  },
  backLabel: { ...type.label, color: colors.text },
  deleteButton: {
    padding: spacing.xs,
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  photo: { width: "100%", height: 260, borderRadius: radii.lg },
  title: {
    ...type.title,
    color: colors.text,
  },
  subtitle: {
    ...type.label,
    color: colors.textMuted,
    marginTop: -spacing.sm,
    ...tabular,
  },
  macroRow: { flexDirection: "row", gap: spacing.sm + 2 },
  macroCard: { ...cardTight, flex: 1, padding: spacing.sm + 6 },
  macroLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  macroValue: {
    fontSize: 21,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.sm + 2,
    ...tabular,
  },
  macroTrack: { marginTop: spacing.sm + 4 },
  sectionTitle: {
    ...type.bodyStrong,
    fontSize: 17,
    color: colors.text,
    marginTop: spacing.xs,
  },
  ingredientCard: { ...card, overflow: "hidden" },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm + 4,
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  ingredientRowLast: { borderBottomWidth: 0 },
  ingredientMain: { flex: 1, gap: 4 },
  ingredientName: { ...type.body, color: colors.text },
  ingredientMeta: { ...type.label, color: colors.textMuted, ...tabular },
  ingredientCalories: {
    ...type.bodyStrong,
    color: colors.text,
    ...tabular,
  },
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
