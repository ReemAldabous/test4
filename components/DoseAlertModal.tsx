import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Alert,
} from "react-native";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { updateDoseSchedule } from "@/services/storage";
import * as Notifications from "expo-notifications";

const ACTION_TAKEN = "TAKEN";
const ACTION_IGNORE = "IGNORE";

export function DoseAlertModal() {
  const { currentDoseNotification, dismissDoseNotification, prescriptions, t } =
    useApp();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const inFlightActionRef = useRef(false);
  const [loadingAction, setLoadingAction] = useState<
    typeof ACTION_TAKEN | typeof ACTION_IGNORE | null
  >(null);

  const notification = currentDoseNotification;
  const prescription = notification
    ? prescriptions.find((p) => p.id === notification.prescriptionId)
    : null;

  const doseSchedule = prescription?.doseSchedules.find(
    (ds) => ds.id === notification?.doseScheduleId,
  );
  const isIgnoreLoading = loadingAction === ACTION_IGNORE;
  const isTakenLoading = loadingAction === ACTION_TAKEN;
  const isAnyLoading = loadingAction !== null;

  const handleAction = async (
    action: typeof ACTION_TAKEN | typeof ACTION_IGNORE,
  ) => {
    if (!notification) return;
    if (inFlightActionRef.current) return;

    inFlightActionRef.current = true;
    setLoadingAction(action);
    try {
      if (action === ACTION_TAKEN) {
        await updateDoseSchedule(
          notification.prescriptionId,
          notification.doseScheduleId,
          {
            status: "taken",
            takenAt: new Date().toISOString(),
          },
        );
        Alert.alert(t("success"), t("doseRecordedSuccess"));
      } else if (action === ACTION_IGNORE) {
        await updateDoseSchedule(
          notification.prescriptionId,
          notification.doseScheduleId,
          {
            status: "skipped",
            takenAt: undefined,
            patientNote: t("doseIgnoredSuccess"),
          },
        );
        Alert.alert(t("skip"), t("doseIgnoredSuccess"));
      }

      await Notifications.dismissNotificationAsync(
        notification.notification.request.identifier,
      );
      dismissDoseNotification();
    } catch (error) {
      console.error("Error handling dose action:", error);
      Alert.alert(t("deleteFailed"), t("doseActionError"));
    } finally {
      setLoadingAction(null);
      inFlightActionRef.current = false;
    }
  };

  return (
    <Modal
      visible={!!notification}
      transparent
      animationType="fade"
      onRequestClose={dismissDoseNotification}
    >
      <View style={styles.container}>
        <View
          style={[
            styles.alertBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.primary,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Feather name="droplet" size={32} color={colors.primary} />
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={dismissDoseNotification}
              disabled={isAnyLoading}
            >
              <Feather name="x" size={24} color={colors.text} />
            </Pressable>
          </View>

          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={[styles.kicker, { color: colors.primary }]}>
              {t("medicationReminder")}
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("doseAlertTitle")}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t("scheduledDoseDescription")}
            </Text>
          </View>

          {/* Medicine Info */}
          {prescription && (
            <View
              style={[
                styles.infoSection,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t("medicineLabel")}
                </Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {prescription.medicine.name}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t("doseLabel")}
                </Text>
                <Text style={[styles.value, { color: colors.text }]}>
                  {prescription.dose}
                </Text>
              </View>
              {doseSchedule?.scheduledTime ? (
                <View style={styles.infoRow}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {t("scheduledTimeLabel")}
                  </Text>
                  <Text style={[styles.value, { color: colors.text }]}>
                    {doseSchedule.scheduledTime}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <Pressable
              style={[
                styles.button,
                styles.ignoreButton,
                {
                  borderColor: colors.error,
                  backgroundColor: colors.error + "10",
                },
              ]}
              onPress={() => handleAction(ACTION_IGNORE)}
              disabled={isAnyLoading}
            >
              {isIgnoreLoading ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Feather name="x" size={20} color={colors.error} />
              )}
              <Text
                style={[
                  styles.buttonText,
                  { color: colors.error, marginLeft: 8 },
                ]}
              >
                {isIgnoreLoading ? t("saving") : t("skip")}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.button,
                styles.takenButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => handleAction(ACTION_TAKEN)}
              disabled={isAnyLoading}
            >
              {isTakenLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="check" size={20} color="#fff" />
              )}
              <Text
                style={[styles.buttonText, { color: "#fff", marginLeft: 8 }]}
              >
                {isTakenLoading ? t("saving") : t("doseRecordedSuccess")}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  alertBox: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 23,
    fontFamily: "Inter_700Bold",
  },
  titleBlock: {
    gap: 6,
    marginBottom: 18,
  },
  kicker: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  infoSection: {
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 22,
  },
  infoRow: {
    gap: 3,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  value: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  ignoreButton: {
    borderWidth: 1.5,
  },
  takenButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
