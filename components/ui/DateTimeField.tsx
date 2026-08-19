import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

function formatDate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(d: Date) {
  return d.toTimeString().slice(0, 5);
}

function formatDateTime(d: Date) {
  return `${formatDate(d)} ${formatTime(d)}`;
}

function formatLocalDateTime(d: Date) {
  return `${formatDate(d)}T${formatTime(d)}:00`;
}

export default function DateTimeField({
  value,
  mode = "date",
  onChange,
  placeholder,
  icon,
  colors,
}: {
  value?: string;
  mode?: "date" | "time" | "datetime";
  onChange: (iso: string) => void;
  placeholder?: string;
  icon?: string;
  colors?: any;
}) {
  const [show, setShow] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time">(
    mode === "time" ? "time" : "date",
  );
  const [datetimeDraft, setDatetimeDraft] = useState<Date | null>(null);
  const parsed = value ? new Date(value) : null;
  const current =
    parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();

  const openPicker = () => {
    if (mode === "datetime") {
      setPickerMode("date");
      setDatetimeDraft(current);
    } else {
      setPickerMode(mode);
    }
    setShow(true);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors?.surface ?? "#fff",
          borderColor: colors?.border ?? "#ccc",
        },
      ]}
    >
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Pressable onPress={openPicker} style={styles.pressable}>
        <Text style={[styles.valueText, { color: colors?.text ?? "#000" }]}>
          {value
            ? mode === "time"
              ? formatTime(current)
              : mode === "datetime"
                ? formatDateTime(current)
                : formatDate(current)
            : (placeholder ??
              (mode === "time"
                ? "HH:MM"
                : mode === "datetime"
                  ? "YYYY-MM-DD HH:MM"
                  : "YYYY-MM-DD"))}
        </Text>
      </Pressable>

      {show && (
        <DateTimePicker
          value={mode === "datetime" ? (datetimeDraft ?? current) : current}
          mode={mode === "datetime" ? pickerMode : mode}
          display="default"
          onChange={(event, selected) => {
            if (event.type === "dismissed" || !selected) {
              setShow(false);
              setDatetimeDraft(null);
              setPickerMode(mode === "time" ? "time" : "date");
              return;
            }

            if (mode !== "datetime") {
              setShow(false);
              onChange(
                mode === "date" ? formatDate(selected) : formatTime(selected),
              );
              return;
            }

            if (pickerMode === "date") {
              const base = datetimeDraft ?? current;
              const merged = new Date(selected);
              merged.setHours(base.getHours(), base.getMinutes(), 0, 0);
              setDatetimeDraft(merged);
              setPickerMode("time");
              return;
            }

            const base = datetimeDraft ?? current;
            const merged = new Date(base);
            merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
            onChange(formatLocalDateTime(merged));
            setShow(false);
            setDatetimeDraft(null);
            setPickerMode("date");
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  icon: {
    fontSize: 14,
  },
  pressable: {
    flex: 1,
  },
  valueText: {
    fontSize: 16,
  },
});
