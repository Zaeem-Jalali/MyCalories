import { useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { colors, spacing, tabular, type } from "../constants/theme";
import { dateFromKey } from "../lib/dateKey";

const CHART_HEIGHT = 160;
const PADDING = 24;

export function WeightChart({
  entries,
}: {
  entries: { date: string; weightLbs: number }[];
}) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  if (entries.length < 2) {
    return (
      <View style={styles.empty} onLayout={onLayout}>
        <Text style={styles.emptyText}>
          Log weight on at least two days to see a chart.
        </Text>
      </View>
    );
  }

  const weights = entries.map((e) => e.weightLbs);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const usableWidth = Math.max(width - PADDING * 2, 1);
  const usableHeight = CHART_HEIGHT - PADDING * 2;

  const points = entries.map((entry, i) => {
    const x = PADDING + (i / (entries.length - 1)) * usableWidth;
    const y =
      PADDING + usableHeight - ((entry.weightLbs - min) / range) * usableHeight;
    return { x, y, entry };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <View style={styles.container} onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={CHART_HEIGHT}>
          <Line
            x1={PADDING}
            y1={PADDING}
            x2={width - PADDING}
            y2={PADDING}
            stroke={colors.border}
            strokeWidth={1}
          />
          <Line
            x1={PADDING}
            y1={CHART_HEIGHT / 2}
            x2={width - PADDING}
            y2={CHART_HEIGHT / 2}
            stroke={colors.border}
            strokeWidth={1}
          />
          <Line
            x1={PADDING}
            y1={CHART_HEIGHT - PADDING}
            x2={width - PADDING}
            y2={CHART_HEIGHT - PADDING}
            stroke={colors.border}
            strokeWidth={1}
          />
          <Path
            d={linePath}
            stroke={colors.accent}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill={colors.background}
              stroke={colors.accent}
              strokeWidth={2}
            />
          ))}
        </Svg>
      ) : null}
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>{axisLabel(entries[0].date)}</Text>
        <Text style={styles.axisLabel}>
          {axisLabel(entries[entries.length - 1].date)}
        </Text>
      </View>
    </View>
  );
}

// Axis ticks read as dates, not as fragments of the storage key.
function axisLabel(key: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(dateFromKey(key));
}

const styles = StyleSheet.create({
  container: { paddingVertical: spacing.sm },
  empty: {
    padding: spacing.md,
    minHeight: CHART_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { ...type.body, color: colors.textMuted, textAlign: "center" },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: PADDING - spacing.sm,
    marginTop: -spacing.sm,
  },
  axisLabel: { ...type.label, ...tabular, color: colors.textMuted },
});
