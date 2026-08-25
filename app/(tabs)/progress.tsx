import { useQuery } from "convex/react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../convex/_generated/api";
import { colors } from "../../constants/theme";

export default function ProgressScreen() {
  const weightLogs = useQuery(api.weightLogs.list, {});
  const profile = useQuery(api.profile.get, {});
  const streak = useQuery(api.streak.current, {});

  const latestWeight =
    weightLogs && weightLogs.length > 0
      ? weightLogs[weightLogs.length - 1].weightLbs
      : undefined;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Progress</Text>

        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.cardValue}>
              {latestWeight !== undefined ? `${latestWeight} lbs` : "—"}
            </Text>
            <Text style={styles.cardLabel}>
              Goal {profile?.weightGoalLbs ?? "—"} lbs
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{streak ?? 0}</Text>
            <Text style={styles.cardLabel}>Day streak</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Weight history</Text>
        {weightLogs === undefined ? (
          <Text style={styles.emptyText}>Loading…</Text>
        ) : weightLogs.length === 0 ? (
          <Text style={styles.emptyText}>
            No weight entries yet. Weight logging + chart lands in the
            Progress build phase.
          </Text>
        ) : (
          weightLogs.map((entry) => (
            <View key={entry._id} style={styles.logRow}>
              <Text style={styles.logDate}>{entry.date}</Text>
              <Text style={styles.logValue}>{entry.weightLbs} lbs</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  row: { flexDirection: "row", gap: 12 },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  cardValue: { fontSize: 22, fontWeight: "800", color: colors.text },
  cardLabel: { color: colors.textMuted, marginTop: 4 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
  },
  emptyText: { color: colors.textMuted },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  logDate: { color: colors.text, fontWeight: "500" },
  logValue: { color: colors.textMuted },
});
