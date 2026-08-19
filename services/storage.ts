import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  DiaryEntry,
  DoseSchedule,
  Medicine,
  ObservationSession,
  Patient,
  Prescription,
  SyncStatus,
  SymptomDefinition,
} from "@/models";
import { apiRequest, isApiConfigured, ApiError } from "./api";

const KEYS = {
  AUTH_TOKEN: "auth_token",
  PATIENT: "patient",
  PATIENT_ID: "patient_id",
  OBSERVATION_SESSIONS: "observation_sessions",
  DIARY_ENTRIES: "diary_entries",
};

type ApiAuthResponse = {
  token: string;
  username: string;
  patientId?: number;
  pharmacyId?: number;
};

type RegisterRole = "PATIENT" | "PHARMACY";

type RegisterInput = {
  username: string;
  password: string;
  role: RegisterRole;
  name?: string;
  email?: string;
  phoneNumber?: string;
  pharmacyName?: string;
  pharmacistName?: string;
  lat?: number;
  lng?: number;
};

type ApiPatientDto = {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
};

type ApiMedicineDto = {
  id: number;
  name: string;
  buyPrice?: number | string | null;
  sellPrice?: number | string | null;
  pharmaceuticalForm?: string | null;
  box?: number | string | null;
  capacity?: number | string | null;
  capacityMetric?: string | null;
  factoryId?: number | null;
  factoryName?: string | null;
  factory?: string | null;
};

type ApiCreateMedicineRequest = {
  name: string;
  buyPrice: number;
  sellPrice: number;
  pharmaceuticalForm: string;
  box: number;
  capacity: number;
  capacityMetric: string;
  factoryId?: number | null;
};

type ApiPrescriptionDto = {
  id: string;
  patientId: number;
  medicineId: number;
  medicineName?: string | null;
  dose?: string | null;
  frequency?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  issuedAt?: string | null;
  byPharmacist?: boolean | null;
  pharmacyId?: number | null;
  foodRequirement?: string | null;
  note?: string | null;
  byDoctor?: boolean | null;
  doctorName?: string | null;
  timeShift?: number | null;
  isDone?: boolean | null;
};

type ApiDoseScheduleDto = {
  id: number;
  prescriptionId: string;
  takeAt?: string | null;
  scheduledAt?: string | null;
  scheduleAt?: string | null;
  scheduled_at?: string | null;
  schedule_at?: string | null;
  taken?: boolean | null;
  takenAt?: string | null;
  patientPersonalNote?: string | null;
};

type ApiPageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

function getPageContent<T>(response: ApiPageResponse<T> | T[]): T[] {
  if (Array.isArray(response)) return response;
  return Array.isArray(response?.content) ? response.content : [];
}

async function getAllPageContent<T>(
  path: (page: number) => string,
  size: number,
  token?: string | null,
): Promise<T[]> {
  const items: T[] = [];

  for (let page = 0; page < 1000; page += 1) {
    const response = await requestApi<ApiPageResponse<T> | T[]>(
      path(page),
      {},
      token,
    );
    const pageItems = getPageContent(response);
    items.push(...pageItems);

    if (
      Array.isArray(response) ||
      pageItems.length < size ||
      response.last ||
      response.totalPages <= page + 1
    ) {
      break;
    }
  }

  return items;
}

type ApiSymptomMeasurementDto = {
  id: string;
  symptomId: string;
  symptomName: string;
  measurementId: string;
  measurementName: string;
  minValue?: string | null;
  maxValue?: string | null;
  meanValue?: string | null;
};

type ApiObservationDto = {
  id: string;
  observationSessionId: string;
  patientId: number;
  doseScheduleId?: number | null;
  symptomType: string;
  measurementUnit: string;
  valueBoolean?: boolean | null;
  valueNumeric?: number | null;
  valueText?: string | null;
  createdAt: string;
};

function isNumericId(value: string): boolean {
  return /^\d+$/.test(value);
}

function extractTime(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getBackendScheduleAt(
  schedule: ApiDoseScheduleDto,
): string | undefined {
  const value =
    schedule.takeAt ??
    schedule.scheduledAt ??
    schedule.scheduleAt ??
    schedule.scheduled_at ??
    schedule.schedule_at;

  return typeof value === "string" && value.trim() ? value : undefined;
}

function getDoseStatus(
  schedule: ApiDoseScheduleDto,
  takeAt?: string,
): DoseSchedule["status"] {
  if (schedule.taken) return "taken";
  if (takeAt) {
    const timestamp = new Date(takeAt).getTime();
    if (Number.isFinite(timestamp) && timestamp < Date.now()) return "missed";
  }
  return "pending";
}

function mapFoodRequirement(
  value?: string | null,
): Prescription["foodRequirement"] {
  switch ((value ?? "").toLowerCase()) {
    case "before_meal":
      return "before_meal";
    case "after_meal":
      return "after_meal";
    case "with_meal":
      return "with_meal";
    default:
      return "any_time";
  }
}

function mapDosageForm(value?: string | null): Medicine["dosageForm"] {
  const form = (value ?? "tablet").toLowerCase();
  if (form.includes("capsule")) return "capsule";
  if (
    form.includes("liquid") ||
    form.includes("syrup") ||
    form.includes("solution")
  )
    return "liquid";
  if (form.includes("injection")) return "injection";
  if (
    form.includes("cream") ||
    form.includes("ointment") ||
    form.includes("gel")
  )
    return "cream";
  if (form.includes("inhal")) return "inhaler";
  return "tablet";
}

function mapMedicine(dto: ApiMedicineDto): Medicine {
  const strengthParts = [dto.capacity, dto.capacityMetric].filter(Boolean);
  const strength =
    strengthParts.length > 0
      ? strengthParts.join("")
      : dto.box != null
        ? `${dto.box} units`
        : "";

  return {
    id: String(dto.id),
    name: dto.name,
    genericName: dto.name,
    dosageForm: mapDosageForm(dto.pharmaceuticalForm),
    strength: strength || "Unknown",
    manufacturer: dto.factoryName ?? dto.factory ?? undefined,
    description: dto.pharmaceuticalForm ?? undefined,
  };
}

function toBackendDateTime(value: string, endOfDay = false): string {
  const trimmed = value.trim();
  if (trimmed.includes("T")) {
    return trimmed;
  }
  return `${trimmed}T${endOfDay ? "23:59:59" : "08:00:00"}`;
}

function toBackendFrequency(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "once daily") return "24 hours";
  if (normalized === "twice daily") return "12 hours";
  if (normalized === "three times daily") return "8 hours";
  if (normalized === "four times daily") return "6 hours";
  if (normalized === "weekly") return "168 hours";
  if (normalized === "as needed") return "24 hours";

  const match = normalized.match(/(\d+)/);
  if (match) {
    return `${match[1]} hours`;
  }

  return "24 hours";
}

function symptomKey(
  symptomType: string,
  measurementUnit?: string | null,
): string {
  return `${symptomType.trim().toLowerCase()}::${(measurementUnit ?? "").trim().toLowerCase()}`;
}

function inferSymptomTypeFromObservation(
  observation: ApiObservationDto,
): SymptomDefinition["type"] {
  if (observation.valueBoolean != null) return "boolean";
  if (observation.valueNumeric != null) return "numeric";
  return "text";
}

function mapPrescription(
  dto: ApiPrescriptionDto,
  medicine: Medicine,
  schedules: ApiDoseScheduleDto[],
): Prescription {
  const startDate = dto.startDate
    ? dto.startDate.split("T")[0]
    : new Date().toISOString().split("T")[0];
  const base: Prescription = {
    id: dto.id,
    patientId: String(dto.patientId),
    medicineId: String(dto.medicineId),
    medicine,
    dose: dto.dose ?? "As directed",
    frequency: dto.frequency ?? "24 hours",
    foodRequirement: mapFoodRequirement(dto.foodRequirement),
    startDate,
    ...(dto.endDate ? { endDate: dto.endDate.split("T")[0] } : {}),
    prescribedBy: dto.byDoctor
      ? (dto.doctorName ?? "Doctor")
      : dto.byPharmacist
        ? "Pharmacist"
        : "Myself",
    note: dto.note ?? undefined,
    byDoctor: dto.byDoctor ?? undefined,
    doctorName: dto.doctorName ?? undefined,
    timeShift:
      dto.timeShift != null && dto.timeShift > 0 ? dto.timeShift : undefined,
    isDone: dto.isDone ?? false,
    syncStatus: "synced",
    doseSchedules: [],
  };

  const doseSchedules = schedules
    .slice()
    .map((schedule) => ({
      schedule,
      takeAt: getBackendScheduleAt(schedule),
    }))
    .sort((a, b) => (a.takeAt ?? "").localeCompare(b.takeAt ?? ""))
    .map(({ schedule, takeAt }) => ({
      id: String(schedule.id),
      prescriptionId: String(dto.id),
      ...(takeAt ? { takeAt } : {}),
      scheduledTime: extractTime(takeAt),
      status: getDoseStatus(schedule, takeAt),
      scheduledId: schedule.id,
      syncStatus: "synced" as const,
      ...(schedule.takenAt ? { takenAt: schedule.takenAt } : {}),
      ...(schedule.patientPersonalNote
        ? { patientNote: schedule.patientPersonalNote }
        : {}),
    }));

  return { ...base, doseSchedules };
}

async function getStoredPatient(): Promise<Patient | null> {
  const stored = await AsyncStorage.getItem(KEYS.PATIENT);
  if (!stored) return null;
  return JSON.parse(stored) as Patient;
}

async function getStoredPatientId(): Promise<number | null> {
  const explicitId = await AsyncStorage.getItem(KEYS.PATIENT_ID);
  if (explicitId) {
    const parsedExplicit = Number.parseInt(explicitId, 10);
    if (Number.isFinite(parsedExplicit)) return parsedExplicit;
  }

  const storedPatient = await getStoredPatient();
  if (!storedPatient?.id) return null;
  const parsed = Number.parseInt(storedPatient.id, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function requestApi<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  return apiRequest<T>(path, options, token);
}

async function resolveMedicineIdByName(name: string): Promise<number> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Missing auth token.");
  }

  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Custom medicine name is required.");
  }

  const searchParams = new URLSearchParams({
    page: "0",
    size: "50",
    name: normalizedName,
  });

  const existing = await getAllPageContent<ApiMedicineDto>(
    (page) => {
      const pageParams = new URLSearchParams(searchParams);
      pageParams.set("page", String(page));
      return `/medicines?${pageParams}`;
    },
    50,
    token,
  );

  const exactMatch = existing.find(
    (item) => item.name.trim().toLowerCase() === normalizedName.toLowerCase(),
  );
  if (exactMatch) {
    return exactMatch.id;
  }

  const created = await requestApi<ApiMedicineDto>(
    "/medicines",
    {
      method: "POST",
      body: JSON.stringify({
        name: normalizedName,
        buyPrice: 0,
        sellPrice: 0,
        pharmaceuticalForm: "tablet",
        box: 1,
        capacity: 1,
        capacityMetric: "unit",
      } satisfies ApiCreateMedicineRequest),
    },
    token,
  );

  return created.id;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function isUuid(value?: string | null): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function newPrescriptionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function updatePrescriptionTimeShift(
  prescriptionId: string,
  timeShift: number,
): Promise<Prescription[]> {
  if (!isApiConfigured()) {
    throw new Error("Prescription updates require backend connection.");
  }

  const token = await getAuthToken();
  if (!token) {
    throw new Error("Missing auth token.");
  }

  await requestApi(
    `/prescriptions/${prescriptionId}`,
    {
      method: "PUT",
      body: JSON.stringify({ timeShift }),
    },
    token,
  );

  return getPrescriptions();
}

function extractObservationValue(observation: ApiObservationDto) {
  if (observation.valueBoolean != null) return observation.valueBoolean;
  if (observation.valueNumeric != null) return observation.valueNumeric;
  return observation.valueText ?? "";
}

async function loadRemotePrescriptions(): Promise<Prescription[] | null> {
  if (!isApiConfigured()) return null;

  const token = await getAuthToken();
  const patientId = await getStoredPatientId();
  if (!token || patientId == null) return null;

  try {
    const [prescriptionsPage, schedulesPage] = await Promise.all([
      getAllPageContent<ApiPrescriptionDto>(
        (page) => `/patients/${patientId}/prescriptions?page=${page}&size=100`,
        100,
        token,
      ),
      getAllPageContent<ApiDoseScheduleDto>(
        (page) => `/patients/${patientId}/dose-schedules?page=${page}&size=200`,
        200,
        token,
      ),
    ]);

    const medicineIds = [
      ...new Set(prescriptionsPage.map((item) => item.medicineId)),
    ];
    const medicines = await Promise.all(
      medicineIds.map(async (medicineId) => {
        const medicine = await requestApi<ApiMedicineDto>(
          `/medicines/${medicineId}`,
          {},
          token,
        );
        return [medicineId, mapMedicine(medicine)] as const;
      }),
    );
    const medicineById = new Map<number, Medicine>(medicines);

    const schedulesByPrescription = new Map<string, ApiDoseScheduleDto[]>();
    for (const schedule of schedulesPage) {
      const current =
        schedulesByPrescription.get(schedule.prescriptionId) ?? [];
      current.push(schedule);
      schedulesByPrescription.set(schedule.prescriptionId, current);
    }

    const prescriptions = prescriptionsPage.map((prescription) =>
      mapPrescription(
        prescription,
        medicineById.get(prescription.medicineId) ??
          mapMedicine({
            id: prescription.medicineId,
            name: prescription.medicineName ?? "Medicine",
            pharmaceuticalForm: "tablet",
          }),
        schedulesByPrescription.get(prescription.id) ?? [],
      ),
    );

    return prescriptions;
  } catch (error) {
    console.warn("Failed to load prescriptions from API:", error);
    return null;
  }
}

export async function saveAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
}

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.AUTH_TOKEN);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
}

export async function login(
  username: string,
  password: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (!isApiConfigured()) {
    return {
      success: false,
      error: "Backend API is not configured.",
    };
  }

  try {
    const auth = await requestApi<ApiAuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
        role: "PATIENT",
      }),
    });

    await saveAuthToken(auth.token);

    if (auth.patientId != null) {
      await AsyncStorage.setItem(KEYS.PATIENT_ID, String(auth.patientId));
      const patient = await requestApi<ApiPatientDto>(
        `/patients/${auth.patientId}`,
        {},
        auth.token,
      );

      const currentPatient: Patient = {
        id: String(patient.id),
        username: auth.username,
        name: patient.name,
        token: auth.token,
      };
      await AsyncStorage.setItem(KEYS.PATIENT, JSON.stringify(currentPatient));
    }

    return { success: true, token: auth.token };
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 401 || error.status === 404)
    ) {
      return {
        success: false,
        error:
          "لم يتم العثور على حساب. الرجاء إنشاء حساب جديد إذا لم يكن لديك.",
      };
    }

    return {
      success: false,
      error: getErrorMessage(error, "Login failed"),
    };
  }
}

export async function register(
  input: RegisterInput,
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (!isApiConfigured()) {
    return {
      success: false,
      error: "Backend API is not configured.",
    };
  }

  try {
    const auth = await requestApi<ApiAuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });

    if (input.role === "PATIENT" && auth.patientId != null) {
      await saveAuthToken(auth.token);
      await AsyncStorage.setItem(KEYS.PATIENT_ID, String(auth.patientId));
      const patient = await requestApi<ApiPatientDto>(
        `/patients/${auth.patientId}`,
        {},
        auth.token,
      );

      const currentPatient: Patient = {
        id: String(patient.id),
        username: auth.username,
        name: patient.name,
        token: auth.token,
      };
      await AsyncStorage.setItem(KEYS.PATIENT, JSON.stringify(currentPatient));
    }

    return {
      success: true,
      token: input.role === "PATIENT" ? auth.token : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Registration failed"),
    };
  }
}

export async function logout(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.AUTH_TOKEN,
    KEYS.PATIENT,
    KEYS.PATIENT_ID,
  ]);
}

async function pullRemotePrescriptionMetadata(): Promise<void> {
  // No local prescription cache: metadata is authoritative on server.
  return;
}

export async function getPrescriptions(): Promise<Prescription[]> {
  if (!isApiConfigured()) return [];

  const remote = await loadRemotePrescriptions();
  return remote ?? [];
}

export async function syncPrescriptionsNow(): Promise<Prescription[]> {
  return getPrescriptions();
}

export async function updateDoseSchedule(
  prescriptionId: string,
  doseScheduleId: string,
  updates: Partial<DoseSchedule>,
): Promise<Prescription[]> {
  if (!isApiConfigured()) {
    throw new Error("Dose updates require backend connection.");
  }

  const token = await getAuthToken();
  const patientId = await getStoredPatientId();
  if (!token || patientId == null) {
    throw new Error("Missing auth token or patient id.");
  }

  // Load fresh prescriptions from backend to find server ids
  const remote = await loadRemotePrescriptions();
  if (!remote) throw new Error("Failed to load prescriptions from server.");

  const rx = remote.find((r) => r.id === prescriptionId);
  if (!rx) throw new Error("Prescription not found.");

  const dose = rx.doseSchedules.find((d) => d.id === doseScheduleId);

  // If marking as taken
  if (updates.status === "taken") {
    const takenAt = updates.takenAt ?? new Date().toISOString();
    const note = updates.patientNote ?? null;

    if (dose?.scheduledId != null) {
      await requestApi(
        `/dose-schedules/${dose.scheduledId}/take`,
        {
          method: "POST",
          body: JSON.stringify({ patientPersonalNote: note }),
        },
        token,
      );
    } else {
      await requestApi(
        "/dose-schedules",
        {
          method: "POST",
          body: JSON.stringify({
            prescriptionId: rx.id,
            taken: true,
            takenAt,
            patientPersonalNote: note,
          }),
        },
        token,
      );
    }

    return (await loadRemotePrescriptions()) ?? [];
  }

  // For other updates, if server dose exists try to PUT it, else reload
  if (dose?.scheduledId != null) {
    const body: any = {};
    if (updates.patientNote !== undefined)
      body.patientPersonalNote = updates.patientNote;
    if (updates.takenAt !== undefined) body.takenAt = updates.takenAt;
    if (Object.keys(body).length > 0) {
      await requestApi(
        `/dose-schedules/${dose.scheduledId}`,
        { method: "PUT", body: JSON.stringify(body) },
        token,
      );
    }
  }

  return (await loadRemotePrescriptions()) ?? [];
}

export async function markPrescriptionDone(
  prescriptionId: string,
): Promise<Prescription[]> {
  if (!isApiConfigured()) {
    throw new Error("Marking done requires backend connection.");
  }

  const token = await getAuthToken();
  if (!token) throw new Error("Missing auth token.");

  await requestApi(
    `/prescriptions/${prescriptionId}/done`,
    { method: "POST" },
    token,
  );

  return (await loadRemotePrescriptions()) ?? [];
}

export async function getObservationSessions(): Promise<ObservationSession[]> {
  if (!isApiConfigured()) {
    throw new Error("Observation loading requires backend connection.");
  }

  const token = await getAuthToken();
  const patientId = await getStoredPatientId();
  if (!token || patientId == null) return [];

  const observationsPage = await getAllPageContent<ApiObservationDto>(
    (page) => `/patients/${patientId}/observations?page=${page}&size=500`,
    500,
    token,
  );

  const bySession = new Map<string, ObservationSession>();
  for (const item of observationsPage) {
    const symptomDefinitionId = symptomKey(
      item.symptomType,
      item.measurementUnit,
    );
    const symptomDefinition = {
      id: symptomDefinitionId,
      name: item.symptomType,
      type: inferSymptomTypeFromObservation(item),
      unit: item.measurementUnit || undefined,
    };

    const mappedObservation = {
      id: item.id,
      sessionId: item.observationSessionId,
      symptomDefinitionId,
      symptomDefinition,
      value: extractObservationValue(item),
      recordedAt: item.createdAt,
    };

    const existing = bySession.get(item.observationSessionId);
    if (!existing) {
      bySession.set(item.observationSessionId, {
        id: item.observationSessionId,
        doseScheduleId: String(item.doseScheduleId ?? ""),
        startedAt: item.createdAt,
        endedAt: item.createdAt,
        observations: [mappedObservation],
      });
      continue;
    }

    existing.observations.push(mappedObservation);
  }

  return Array.from(bySession.values());
}

export async function saveObservationSession(
  session: ObservationSession,
): Promise<void> {
  if (!isApiConfigured()) {
    throw new Error("Observation saving requires backend connection.");
  }

  const token = await getAuthToken();
  const patientId = await getStoredPatientId();
  if (!token || patientId == null) {
    throw new Error("Missing auth token or patient id.");
  }

  const existingPage = await getAllPageContent<ApiObservationDto>(
    (page) => `/patients/${patientId}/observations?page=${page}&size=500`,
    500,
    token,
  );

  const existingForDose = existingPage.filter(
    (item) =>
      item.observationSessionId === session.id ||
      (isNumericId(session.doseScheduleId) &&
        item.doseScheduleId != null &&
        String(item.doseScheduleId) === session.doseScheduleId),
  );
  const existingBySymptomKey = new Map<string, ApiObservationDto>(
    existingForDose.map((item) => [
      symptomKey(item.symptomType, item.measurementUnit),
      item,
    ]),
  );

  let observationSessionId = isUuid(session.id)
    ? session.id
    : existingForDose[0]?.observationSessionId;

  for (const observation of session.observations) {
    const symptomType = observation.symptomDefinition.name.trim();
    const measurementUnit =
      observation.symptomDefinition.unit?.trim() || "text";

    const payload: {
      valueBoolean?: boolean;
      valueNumeric?: number;
      valueText?: string;
    } = {};

    if (typeof observation.value === "boolean") {
      payload.valueBoolean = observation.value;
    } else if (typeof observation.value === "number") {
      payload.valueNumeric = observation.value;
    } else {
      payload.valueText = String(observation.value ?? "");
    }

    const existingObservation = existingBySymptomKey.get(
      symptomKey(symptomType, measurementUnit),
    );
    if (existingObservation) {
      await requestApi(
        `/observations/${existingObservation.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            symptomType,
            measurementUnit,
            valueBoolean: payload.valueBoolean ?? null,
            valueNumeric: payload.valueNumeric ?? null,
            valueText: payload.valueText ?? null,
          }),
        },
        token,
      );
      continue;
    }

    const created = await requestApi<ApiObservationDto>(
      "/observations",
      {
        method: "POST",
        body: JSON.stringify({
          patientId,
          symptomType,
          measurementUnit,
          ...(observationSessionId ? { observationSessionId } : {}),
          valueBoolean: payload.valueBoolean ?? null,
          valueNumeric: payload.valueNumeric ?? null,
          valueText: payload.valueText ?? null,
        }),
      },
      token,
    );

    observationSessionId = created.observationSessionId;
  }
}

export async function getObservationSessionByDose(
  doseScheduleId: string,
): Promise<ObservationSession | null> {
  const sessions = await getObservationSessions();
  return sessions.find((s) => s.doseScheduleId === doseScheduleId) ?? null;
}

export async function deleteObservationSession(
  sessionId: string,
): Promise<ObservationSession[]> {
  if (!isApiConfigured()) {
    throw new Error("Observation deletion requires backend connection.");
  }

  const token = await getAuthToken();
  const patientId = await getStoredPatientId();
  if (!token || patientId == null) {
    throw new Error("Missing auth token or patient id.");
  }

  const existingPage = await getAllPageContent<ApiObservationDto>(
    (page) => `/patients/${patientId}/observations?page=${page}&size=500`,
    500,
    token,
  );

  const toDelete = existingPage.filter(
    (item) => item.observationSessionId === sessionId,
  );

  await Promise.all(
    toDelete.map((item) =>
      requestApi(`/observations/${item.id}`, { method: "DELETE" }, token),
    ),
  );

  return getObservationSessions();
}

export async function addPrescription(
  prescription: Prescription,
): Promise<Prescription[]> {
  if (!isApiConfigured()) {
    throw new Error("Creating prescriptions requires backend connection.");
  }

  const token = await getAuthToken();
  const patientId = await getStoredPatientId();
  if (!token || patientId == null)
    throw new Error("Missing auth token or patient id.");

  let medicineId = prescription.medicineId;
  if (!isNumericId(medicineId)) {
    const resolved = await resolveMedicineIdByName(prescription.medicine.name);
    medicineId = String(resolved);
  }

  const payload = {
    patientId,
    medicineId: Number.parseInt(medicineId, 10),
    dose: prescription.dose,
    frequency: toBackendFrequency(prescription.frequency),
    startDate: toBackendDateTime(prescription.startDate),
    endDate: prescription.endDate
      ? toBackendDateTime(prescription.endDate, true)
      : null,
    byPharmacist: false,
    foodRequirement: prescription.foodRequirement,
    note: prescription.note ?? prescription.notes ?? null,
    byDoctor: prescription.byDoctor ?? false,
    doctorName: prescription.doctorName ?? null,
    timeShift: prescription.timeShift ?? 0,
  };

  await requestApi(
    "/prescriptions",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );

  return (await loadRemotePrescriptions()) ?? [];
}

export async function removePrescription(
  prescriptionId: string,
): Promise<Prescription[]> {
  if (!isApiConfigured()) {
    throw new Error("Removing prescriptions requires backend connection.");
  }

  const token = await getAuthToken();
  if (!token) throw new Error("Missing auth token.");

  await requestApi(
    `/prescriptions/${prescriptionId}`,
    { method: "DELETE" },
    token,
  );
  return (await loadRemotePrescriptions()) ?? [];
}

export async function updatePrescription(
  prescriptionId: string,
  prescription: Prescription,
): Promise<Prescription[]> {
  if (!isApiConfigured()) {
    throw new Error("Updating prescriptions requires backend connection.");
  }

  const token = await getAuthToken();
  if (!token) throw new Error("Missing auth token.");

  const payload = {
    dose: prescription.dose,
    frequency: toBackendFrequency(prescription.frequency),
    startDate: toBackendDateTime(prescription.startDate),
    endDate: prescription.endDate
      ? toBackendDateTime(prescription.endDate, true)
      : null,
    byPharmacist: false,
    foodRequirement: prescription.foodRequirement,
    note: prescription.note ?? prescription.notes ?? null,
    byDoctor: prescription.byDoctor ?? false,
    doctorName: prescription.doctorName ?? null,
    timeShift: prescription.timeShift ?? 0,
    isDone: prescription.isDone ?? false,
  };

  await requestApi(
    `/prescriptions/${prescriptionId}`,
    { method: "PUT", body: JSON.stringify(payload) },
    token,
  );

  return (await loadRemotePrescriptions()) ?? [];
}

export async function getDiaryEntries(): Promise<DiaryEntry[]> {
  const stored = await AsyncStorage.getItem(KEYS.DIARY_ENTRIES);
  if (stored) return JSON.parse(stored);
  return [];
}

export async function saveDiaryEntry(entry: DiaryEntry): Promise<void> {
  const entries = await getDiaryEntries();
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry;
  else entries.unshift(entry);
  await AsyncStorage.setItem(KEYS.DIARY_ENTRIES, JSON.stringify(entries));
}

export async function deleteDiaryEntry(entryId: string): Promise<void> {
  const entries = await getDiaryEntries();
  const updated = entries.filter((e) => e.id !== entryId);
  await AsyncStorage.setItem(KEYS.DIARY_ENTRIES, JSON.stringify(updated));
}

export async function getSymptomDefinitions(): Promise<SymptomDefinition[]> {
  return [];
}
