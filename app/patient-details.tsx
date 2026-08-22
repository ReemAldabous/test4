import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import DateTimeField from "@/components/ui/DateTimeField";
import { useApp } from "@/context/AppContext";
import type { Patient } from "@/models";

const genders: Array<{
  value: NonNullable<Patient["gender"]>;
  label: "male" | "female" | "other" | "unknown";
}> = [
  { value: "MALE", label: "male" },
  { value: "FEMALE", label: "female" },
  { value: "OTHER", label: "other" },
  { value: "UNKNOWN", label: "unknown" },
];

export default function PatientDetailsScreen() {
  const colors = Colors[useColorScheme() === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { patient, savePatientDetails, t, isRTL } = useApp();
  const [dateOfBirth, setDateOfBirth] = useState(patient?.dateOfBirth ?? "");
  const [gender, setGender] = useState<Patient["gender"]>(patient?.gender);
  const [heightCm, setHeightCm] = useState(patient?.heightCm?.toString() ?? "");
  const [weightKg, setWeightKg] = useState(patient?.weightKg?.toString() ?? "");
  const [diagnosis, setDiagnosis] = useState(patient?.diagnosis ?? "");
  const [allergies, setAllergies] = useState(patient?.allergies ?? "");
  const [imageUri, setImageUri] = useState(patient?.profileImageUri);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("patientDetails"), t("addProfilePhoto"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri)
      setImageUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePatientDetails({
        dateOfBirth: dateOfBirth || undefined,
        gender,
        heightCm: heightCm ? Number(heightCm) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
        diagnosis: diagnosis.trim(),
        allergies: allergies.trim(),
        imageUri,
      });
      Alert.alert(t("success"), t("patientDetailsSaved"), [
        { text: t("close"), onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t("error"), t("patientDetailsSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = [
    styles.input,
    {
      color: colors.text,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 16 : 8),
            borderBottomColor: colors.borderLight,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel={t("back")}
        >
          <Feather
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={22}
            color={colors.text}
          />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("patientDetails")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t("patientDetailsSubtitle")}
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={pickImage}
          style={[
            styles.avatarButton,
            {
              backgroundColor: colors.primary + "18",
              borderColor: colors.primary,
            },
          ]}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.avatarImage} />
          ) : (
            <Feather name="camera" size={28} color={colors.primary} />
          )}
          <View
            style={[styles.cameraBadge, { backgroundColor: colors.primary }]}
          >
            <Feather name="edit-2" size={13} color="#fff" />
          </View>
        </Pressable>
        <Text style={[styles.photoLabel, { color: colors.textSecondary }]}>
          {imageUri ? t("changeProfilePhoto") : t("addProfilePhoto")}
        </Text>

        <FieldLabel label={t("dateOfBirth")} colors={colors} />
        <DateTimeField
          value={dateOfBirth}
          onChange={setDateOfBirth}
          placeholder="YYYY-MM-DD"
          icon=""
          colors={colors}
        />

        <FieldLabel label={t("gender")} colors={colors} />
        <View style={styles.genderGrid}>
          {genders.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => setGender(item.value)}
              style={[
                styles.genderOption,
                {
                  borderColor:
                    gender === item.value ? colors.primary : colors.border,
                  backgroundColor:
                    gender === item.value ? colors.primary : colors.surface,
                },
              ]}
            >
              <Text
                style={{
                  color: gender === item.value ? "#fff" : colors.text,
                  fontFamily: "Inter_600SemiBold",
                }}
              >
                {t(item.label)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          <View style={styles.half}>
            <FieldLabel label={t("heightCm")} colors={colors} />
            <TextInput
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="decimal-pad"
              style={inputStyle}
              placeholder="175.5"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.half}>
            <FieldLabel label={t("weightKg")} colors={colors} />
            <TextInput
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="decimal-pad"
              style={inputStyle}
              placeholder="67.1"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>
        <FieldLabel label={t("diagnosis")} colors={colors} />
        <TextInput
          value={diagnosis}
          onChangeText={setDiagnosis}
          style={inputStyle}
          placeholder={t("optional")}
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <FieldLabel label={t("allergies")} colors={colors} />
        <TextInput
          value={allergies}
          onChangeText={setAllergies}
          style={[inputStyle, styles.textArea]}
          placeholder={t("optional")}
          placeholderTextColor={colors.textMuted}
          multiline
        />
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Feather name="save" size={18} color="#fff" />
          )}
          <Text style={styles.saveText}>
            {saving ? t("saving") : t("save")}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function FieldLabel({ label, colors }: { label: string; colors: any }) {
  return <Text style={[styles.label, { color: colors.text }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  backButton: { padding: 4 },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, marginTop: 3, fontFamily: "Inter_400Regular" },
  content: { padding: 20, paddingBottom: 40 },
  avatarButton: {
    alignSelf: "center",
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "visible",
  },
  avatarImage: { width: 108, height: 108, borderRadius: 54 },
  cameraBadge: {
    position: "absolute",
    right: -3,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  photoLabel: {
    textAlign: "center",
    marginTop: 10,
    marginBottom: 24,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    marginTop: 16,
    fontFamily: "Inter_600SemiBold",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
    fontFamily: "Inter_400Regular",
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  genderGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genderOption: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    flexGrow: 1,
    flexBasis: "45%",
  },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  saveButton: {
    minHeight: 50,
    borderRadius: 8,
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  saveText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
