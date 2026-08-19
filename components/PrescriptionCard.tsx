import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import Colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import type { Prescription } from "@/models";
import { formatTime } from "@/utils/time";
import { MedicineIconContainer } from "./ui/MedicineIcon";
import { StatusBadge } from "./ui/StatusBadge";

interface PrescriptionCardProps {
  prescription: Prescription;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PrescriptionCard({
  prescription,
  onPress,
  onEdit,
  onDelete,
}: PrescriptionCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const { t, locale } = useApp();
  const [expanded, setExpanded] = useState(false);

  const takenCount = prescription.doseSchedules.filter(
    (d) => d.status === "taken",
  ).length;
  const totalCount = prescription.doseSchedules.length;
  const completionLabel =
    totalCount > 0
      ? t("takenPercent", {
          percent: Math.round((takenCount / totalCount) * 100),
        })
      : t("noDoses");

  const dosageFormLabels: Record<string, string> = {
    tablet: t("dosageTablet"),
    capsule: t("dosageCapsule"),
    syrup: t("dosageSyrup"),
    injection: t("dosageInjection"),
    cream: t("dosageCream"),
    drops: t("dosageDrops"),
  };
  const dosageForm =
    dosageFormLabels[prescription.medicine.dosageForm.toLowerCase()] ??
    prescription.medicine.dosageForm;
  const frequencyLabels: Record<string, string> = {
    "once daily": t("onceDaily"),
    "twice daily": t("twiceDaily"),
    "three times daily": t("threeTimesDaily"),
    "four times daily": t("fourTimesDaily"),
    "as needed": t("asNeeded"),
  };
  const frequency =
    frequencyLabels[prescription.frequency.toLowerCase()] ??
    prescription.frequency.replace(/ hours?$/i, ` ${t("hoursUnit")}`);
  const prescribedByLabels: Record<string, string> = {
    myself: t("myself"),
    doctor: t("doctor"),
    pharmacist: t("pharmacist"),
  };
  const prescribedBy =
    prescribedByLabels[prescription.prescribedBy.toLowerCase()] ??
    prescription.prescribedBy;
  const formatLocalizedDate = (value: string) => {
    const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString(locale, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.cardShadow,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.cardBody,
          { opacity: pressed ? 0.96 : 1 },
        ]}
      >
        <View
          style={[styles.accentStrip, { backgroundColor: colors.primary }]}
        />
        {/* Header */}
        <View style={styles.paperHeader}>
          <View style={styles.topLine}>
            <View
              style={[
                styles.rxMark,
                { backgroundColor: colors.primary + "14" },
              ]}
            >
              <Text style={[styles.rxText, { color: colors.primary }]}>Rx</Text>
            </View>
            <View style={styles.headerRight}>
              <View
                style={[
                  styles.progressPill,
                  {
                    backgroundColor: colors.primary + "14",
                    borderColor: colors.primary + "25",
                  },
                ]}
              >
                <Text style={[styles.progressText, { color: colors.primary }]}>
                  {takenCount}/{totalCount}
                </Text>
                <Text
                  style={[styles.progressSubtext, { color: colors.primary }]}
                >
                  {completionLabel}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.header}>
            <MedicineIconContainer
              form={prescription.medicine.dosageForm}
              bgColor={colors.primary}
              size={58}
            />
            <View style={styles.headerInfo}>
              <Text style={[styles.cardLabel, { color: colors.textMuted }]}>
                {t("prescriptionLabel")}
              </Text>
              <Text
                style={[styles.name, { color: colors.text }]}
                numberOfLines={2}
              >
                {prescription.medicine.name}
              </Text>
              <Text
                style={[styles.generic, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {prescription.medicine.genericName}
              </Text>
              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.metaChip,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <Feather name="pill" size={11} color={colors.primary} />
                  <Text
                    style={[
                      styles.metaChipText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {dosageForm}
                  </Text>
                </View>
                <View
                  style={[
                    styles.metaChip,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <Feather name="user" size={11} color={colors.primary} />
                  <Text
                    style={[
                      styles.metaChipText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {prescribedBy}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Details block */}
        <View
          style={[styles.detailsBlock, { borderTopColor: colors.borderLight }]}
        >
          <DetailRow
            label={t("doseLabel")}
            value={prescription.dose}
            colors={colors}
          />
          <DetailRow
            label={t("frequencyLabel")}
            value={frequency}
            colors={colors}
          />
          <DetailRow
            label={t("startDateLabel")}
            value={formatLocalizedDate(prescription.startDate)}
            colors={colors}
          />
          {prescription.endDate && (
            <DetailRow
              label={t("endDateLabel")}
              value={formatLocalizedDate(prescription.endDate)}
              colors={colors}
            />
          )}
          <DetailRow
            label={t("prescribedByLabel")}
            value={prescribedBy}
            colors={colors}
          />
        </View>
      </Pressable>

      {(onEdit || onDelete) && (
        <View
          style={[styles.actionRow, { borderTopColor: colors.borderLight }]}
          pointerEvents="box-none"
        >
          {onEdit && (
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: colors.primary + "12",
                  borderColor: colors.primary + "25",
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Feather name="edit-2" size={14} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>
                {t("edit")}
              </Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: "#FF3B3010",
                  borderColor: "#FF3B3025",
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Feather name="trash-2" size={14} color="#FF3B30" />
              <Text style={[styles.actionText, { color: "#FF3B30" }]}>
                {t("delete")}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Expand doses button */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={[styles.expandBtn, { borderTopColor: colors.borderLight }]}
      >
        <Text style={[styles.expandLabel, { color: colors.primary }]}>
          {expanded ? t("hideSchedule") : t("showSchedule")}
        </Text>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.primary}
        />
      </Pressable>

      {/* Dose schedules */}
      {expanded && (
        <View style={styles.scheduleList}>
          {prescription.doseSchedules.map((ds) => (
            <View
              key={ds.id}
              style={[
                styles.scheduleRow,
                { borderTopColor: colors.borderLight },
              ]}
            >
              <View style={styles.scheduleTime}>
                <Feather name="clock" size={14} color={colors.textMuted} />
                <Text style={[styles.scheduleTimeText, { color: colors.text }]}>
                  {formatTime(ds.scheduledTime)}
                </Text>
              </View>
              <StatusBadge status={ds.status} size="sm" />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function DetailRow({
  label,
  colors,
  value,
}: {
  label: string;
  colors: any;
  value: string;
}) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.borderLight }]}>
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[styles.detailValue, { color: colors.text }]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
    minHeight: 260,
  },
  cardBody: {
    overflow: "hidden",
  },
  accentStrip: {
    height: 6,
  },
  paperHeader: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    gap: 12,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  rxMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rxText: {
    fontSize: 22,
    lineHeight: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerInfo: {
    flex: 1,
    gap: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  name: {
    fontSize: 21,
    lineHeight: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  generic: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  progressPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 88,
  },
  progressText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  progressSubtext: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  detailsBlock: {
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 2,
    backgroundColor: undefined,
  },
  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "Inter_500Medium",
  },
  actionRow: {
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    backgroundColor: "transparent",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  expandBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderTopWidth: 1,
  },
  expandLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  scheduleList: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  scheduleTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scheduleTimeText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
