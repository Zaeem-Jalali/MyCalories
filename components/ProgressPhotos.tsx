import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { colors, radii, spacing, type } from "../constants/theme";
import { todayKey } from "../lib/dateKey";

export function ProgressPhotos() {
  const photos = useQuery(api.progressPhotos.list, {});
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createPhoto = useMutation(api.progressPhotos.create);
  const removePhoto = useMutation(api.progressPhotos.remove);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const confirmDelete = (id: Id<"progressPhotos">, date: string) => {
    Alert.alert("Delete photo", `Delete the progress photo from ${date}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setSelectedIds((current) => current.filter((x) => x !== id));
          removePhoto({ id });
        },
      },
    ]);
  };

  const addPhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow camera access to add a progress photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const uploadUrl = await generateUploadUrl();
    const blob = await (await fetch(asset.uri)).blob();
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
      body: blob,
    });
    const { storageId } = await uploadResponse.json();
    await createPhoto({ date: todayKey(), storageId });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((x) => x !== id);
      }
      if (current.length >= 2) {
        return [current[1], id];
      }
      return [...current, id];
    });
  };

  const selectedPhotos = photos?.filter((p) => selectedIds.includes(p._id));
  const [before, after] =
    selectedPhotos && selectedPhotos.length === 2
      ? selectedPhotos[0].date <= selectedPhotos[1].date
        ? selectedPhotos
        : [selectedPhotos[1], selectedPhotos[0]]
      : [undefined, undefined];

  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Progress photos</Text>
        <TouchableOpacity onPress={addPhoto}>
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {before && after ? (
        <View style={styles.compareCard}>
          <View style={styles.compareColumn}>
            {before.url ? (
              <Image source={{ uri: before.url }} style={styles.compareImage} />
            ) : null}
            <Text style={styles.compareDate}>{before.date}</Text>
          </View>
          <View style={styles.compareColumn}>
            {after.url ? (
              <Image source={{ uri: after.url }} style={styles.compareImage} />
            ) : null}
            <Text style={styles.compareDate}>{after.date}</Text>
          </View>
        </View>
      ) : null}

      {photos === undefined ? (
        <Text style={styles.emptyText}>Loading…</Text>
      ) : photos.length === 0 ? (
        <Text style={styles.emptyText}>
          No progress photos yet. Tap + Add, or select two below to compare.
        </Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.thumbRow}>
            {photos.map((photo) => (
              <View key={photo._id} style={styles.thumbSlot}>
                <TouchableOpacity
                  onPress={() => toggleSelect(photo._id)}
                  style={[
                    styles.thumbWrapper,
                    selectedIds.includes(photo._id) && styles.thumbWrapperSelected,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selectedIds.includes(photo._id) }}
                  accessibilityLabel={`Progress photo from ${photo.date}`}
                >
                  {photo.url ? (
                    <Image source={{ uri: photo.url }} style={styles.thumb} />
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDelete(photo._id, photo.date)}
                  style={styles.deleteButton}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete progress photo from ${photo.date}`}
                >
                  <Ionicons name="close-circle" size={20} color={colors.background} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { ...type.title, color: colors.text },
  addText: { ...type.bodyStrong, color: colors.accent },
  emptyText: { ...type.body, color: colors.textMuted },
  thumbRow: { flexDirection: "row", gap: spacing.sm },
  thumbSlot: { width: 84, height: 84 },
  thumbWrapper: {
    width: 84,
    height: 84,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbWrapperSelected: { borderColor: colors.accent },
  thumb: { width: "100%", height: "100%" },
  deleteButton: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: colors.danger,
    borderRadius: radii.pill,
  },
  compareCard: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
  },
  compareColumn: { flex: 1, alignItems: "center", gap: spacing.xs },
  compareImage: { width: "100%", height: 200, borderRadius: radii.md },
  compareDate: { ...type.label, color: colors.textMuted },
});
