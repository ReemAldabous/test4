import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import type { DoseSchedule, Prescription } from "@/models";
import { formatTime } from "@/utils/time";
import { MedicineIconContainer } from "./ui/MedicineIcon";

interface TakeDoseModalProps {
  visible: boolean;
  prescription: Prescription | null;
  doseSchedule: DoseSchedule | null;
  onConfirm: (note?: string) => void;
  onCancel: () => void;
}

export function TakeDoseModal({
  visible,
  prescription,
  doseSchedule,
  onConfirm,
  onCancel,
}: TakeDoseModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { t } = useApp();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(note.trim() || undefined);
      setNote("");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNote("");
    onCancel();
  };

  if (!prescription || !doseSchedule) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={handleCancel} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, shadowColor: colors.cardShadow },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <MedicineIconContainer
              form={prescription.medicine.dosageForm}
              bgColor={colors.primary}
              size={52}
            />
            <View style={styles.headerText}>
              <View style={styles.titleRow}>
                <Text style={[styles.eyebrow, { color: colors.success }]}>
                  {t("confirmAction")}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: colors.success + "18" },
                  ]}
                >
                  <Feather name="clock" size={12} color={colors.success} />
                  <Text style={[styles.statusText, { color: colors.success }]}>
                    {formatTime(doseSchedule.scheduledTime)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {t("markAsTakenShort")}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {prescription.medicine.name} · {prescription.dose}
              </Text>
            </View>
          </View>

          {/* Note input */}
          <View style={styles.noteSection}>
            <Text style={[styles.noteLabel, { color: colors.text }]}>
              {t("addPersonalNote")}
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t("doseNotePlaceholder")}
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              style={[
                styles.noteInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleCancel}
              disabled={loading}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.cancelText, { color: colors.textSecondary }]}
              >
                {t("cancel")}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={loading}
              style={({ pressed }) => [
                styles.confirmBtn,
                {
                  backgroundColor: colors.success,
                  opacity: pressed || loading ? 0.85 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="check-circle" size={18} color="#fff" />
              )}
              <Text style={styles.confirmText}>
                {loading ? t("savingShort") : t("markAsTakenShort")}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "web" ? 34 : 0,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  time: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  noteSection: {
    gap: 8,
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
  },
  noteLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    textAlignVertical: "top",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  confirmBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
