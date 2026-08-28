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
import { colors, radii, spacing, type } from "../constants/theme";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ProgressPhotos() {
  const photos = useQuery(api.progressPhotos.list, {});
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createPhoto = useMutation(api.progressPhotos.create);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
              <TouchableOpacity
                key={photo._id}
                onPress={() => toggleSelect(photo._id)}
                style={[
                  styles.thumbWrapper,
                  selectedIds.includes(photo._id) && styles.thumbWrapperSelected,
                ]}
              >
                {photo.url ? (
                  <Image source={{ uri: photo.url }} style={styles.thumb} />
                ) : null}
              </TouchableOpacity>
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
