const state = {
  settings: {},
  dashboard: {},
  owners: [],
  patients: [],
  appointments: [],
  availability_rules: [],
  agenda_calendar: [],
  consents: [],
  records: [],
  consultations: [],
  grooming_documents: [],
  providers: [],
  catalog_items: [],
  billing_clients: [],
  billing_documents: [],
  cash_movements: [],
  stock_movements: [],
  users: [],
  billing_summary: {},
  requests: {},
  reports: {},
  compliance: {},
  google_calendar: {},
  generated_at: "",
  database_path: "",
  backups_path: "",
};

const elements = {};
const billingDraft = { lines: [] };
const activeAppointmentStatuses = new Set(["scheduled", "confirmed"]);
const hiddenCalendarStatuses = new Set(["cancelled", "no_show"]);
const activeSubsections = {};
let openNavDropdownSection = "";
let agendaViewDate = new Date();
let agendaSelectedDate = new Date().toISOString().slice(0, 10);
const AGENDA_VIEW_MODES = ["month", "week", "day", "list", "programador"];
const AGENDA_VIEW_STORAGE_KEY = "lativet_agenda_view";
let agendaViewMode = "programador";
try {
  const storedAgendaView = localStorage.getItem(AGENDA_VIEW_STORAGE_KEY);
  if (storedAgendaView && AGENDA_VIEW_MODES.includes(storedAgendaView)) {
    agendaViewMode = storedAgendaView;
  }
} catch (error) {
  // ignore storage access errors
}
let consultorioOwnerId = "";
let consultorioPatientId = "";
let consultorioProfileView = "records";
let consultorioPatientEditorVisible = false;
let consultorioPatientProfileOpen = false;
let activeSectionId = "dashboard";
let pendingAppointmentDraft = null;
let returnToAppointmentModal = false;
const notifications = [];
let unreadNotifications = 0;
const MAX_NOTIFICATIONS = 60;
const CONSULTORIO_PATIENT_PROFILE_SECTION_ID = "consultorioPatientProfile";
const permissionOptions = [
  { key: "dashboard", label: "Dashboard" },
  { key: "administration", label: "Administracion" },
  { key: "agenda", label: "Agenda" },
  { key: "sales", label: "Ventas" },
  { key: "consultorio", label: "Consultorio" },
  { key: "hospamb", label: "Hosp./Amb." },
  { key: "requests", label: "Solicitudes" },
  { key: "reports", label: "Informes" },
];
const permissionLabelMap = permissionOptions.reduce((acc, option) => {
  acc[option.key] = option.label;
  return acc;
}, {});
const usersFilters = { query: "", pageSize: 10, showInactive: false };
const ownersFilters = { query: "", petQuery: "" };
const consultorioPatientsFilters = { query: "" };
const authState = { requiresLogin: false, authenticated: false, currentUser: null };
const AUTH_SESSION_KEY = "lativet_auth_session";
const APP_VIEW_STATE_KEY = "lativet_app_view_v1";
const BOOTSTRAP_CACHE_KEY = "lativet_bootstrap_v3";
const BOOTSTRAP_CACHE_TTL_MS = 5 * 60 * 1000;
let bootstrapFullRequested = false;
let bootstrapReadyForSectionLoads = false;
let appViewPersistenceEnabled = false;
const BOOTSTRAP_CORE_SECTIONS = ["settings"];
const BOOTSTRAP_BACKGROUND_GROUPS = [
  ["owners", "patients"],
  ["availability_rules"],
  ["appointments"],
];
const OWNER_PATIENT_REFRESH_SECTIONS = ["owners", "patients"];
const AGENDA_REFRESH_SECTIONS = ["appointments", "owners", "patients", "availability_rules"];
const CONSULTORIO_PROFILE_VIEWS = [
  {
    value: "records",
    label: "Historia clinica",
    panels: ["consultorioRecordFormPanel", "consultorioRecordsPanel"],
    dataRequirements: ["owners", "patients", "records"],
  },
  {
    value: "consultations",
    label: "Consultas",
    panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
    dataRequirements: ["owners", "patients", "records", "consultations"],
    consultationTypes: ["Consulta"],
    formConsultationType: "Consulta",
  },
  {
    value: "vacunacion",
    label: "Vacunas",
    panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
    dataRequirements: ["owners", "patients", "records", "consultations"],
    consultationTypes: ["Vacunacion"],
    formConsultationType: "Vacunacion",
  },
  {
    value: "formula",
    label: "Formulas medicas",
    panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
    dataRequirements: ["owners", "patients", "records", "consultations"],
    consultationTypes: ["Formula"],
    formConsultationType: "Formula",
  },
  {
    value: "desparasitacion",
    label: "Desparasitaciones",
    panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
    dataRequirements: ["owners", "patients", "records", "consultations"],
    consultationTypes: ["Desparasitacion"],
    formConsultationType: "Desparasitacion",
  },
  {
    value: "hospamb",
    label: "Hospitalizaciones / ambulatorios",
    panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
    dataRequirements: ["owners", "patients", "records", "consultations"],
    consultationTypes: ["Hospitalizacion", "Ambulatorio"],
    formConsultationType: "Hospitalizacion",
  },
  {
    value: "cirugia",
    label: "Cirug\u00edas/procedimientos",
    panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
    dataRequirements: ["owners", "patients", "records", "consultations"],
    consultationTypes: ["Cirugia / procedimiento"],
    formConsultationType: "Cirugia / procedimiento",
  },
  {
    value: "orders",
    label: "Ordenes",
    panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
    dataRequirements: ["owners", "patients", "records", "consultations"],
    consultationTypes: ["Documento"],
    formConsultationType: "Documento",
  },
  {
    value: "laboratorio",
    label: "Examenes de laboratorio",
    panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
    dataRequirements: ["owners", "patients", "records", "consultations"],
    consultationTypes: ["Examen de laboratorio"],
    formConsultationType: "Examen de laboratorio",
  },
  {
    value: "imagenes",
    label: "Imagenes diagnosticas",
    panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
    dataRequirements: ["owners", "patients", "records", "consultations"],
    consultationTypes: ["Imagen diagnostica"],
    formConsultationType: "Imagen diagnostica",
  },
  {
    value: "seguimiento",
    label: "Seguimiento",
    panels: [
      "consultorioConsultationFormPanel",
      "consultorioEvolutionFormPanel",
      "consultorioConsultationsPanel",
    ],
    dataRequirements: ["owners", "patients", "records", "consultations"],
    consultationTypes: ["Seguimiento"],
    formConsultationType: "Seguimiento",
  },
  {
    value: "documents",
    label: "Documentos",
    panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
    dataRequirements: ["owners", "patients", "records", "consultations"],
    consultationTypes: ["Documento"],
    formConsultationType: "Documento",
  },
  {
    value: "remisiones",
    label: "Remisiones",
    panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
    dataRequirements: ["owners", "patients", "records", "consultations"],
    consultationTypes: ["Remision"],
    formConsultationType: "Remision",
  },
  {
    value: "consents",
    label: "Consentimientos",
    panels: ["consultorioConsentFormPanel", "consultorioConsentsPanel"],
    dataRequirements: ["owners", "patients", "records", "consultations", "consents"],
  },
  {
    value: "grooming",
    label: "Peluqueria",
    panels: ["consultorioGroomingFormPanel", "consultorioGroomingPanel"],
    dataRequirements: ["owners", "patients", "grooming_documents"],
  },
];
const CONSULTORIO_PROFILE_VIEW_MAP = CONSULTORIO_PROFILE_VIEWS.reduce((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});
const CONSULTORIO_PANEL_IDS = [
  "consultorioOwnersPanel",
  "consultorioOwnerDetailPanel",
  "consultorioRecordFormPanel",
  "consultorioConsultationFormPanel",
  "consultorioEvolutionFormPanel",
  "consultorioConsentFormPanel",
  "consultorioGroomingFormPanel",
  "consultorioRecordsPanel",
  "consultorioConsultationsPanel",
  "consultorioConsentsPanel",
  "consultorioGroomingPanel",
];
const SECTION_DATA_REQUIREMENTS = {
  dashboard: ["dashboard"],
  administration: ["users"],
  agenda: ["appointments", "availability_rules", "owners", "patients"],
  sales: [
    "providers",
    "catalog_items",
    "billing_clients",
    "billing_documents",
    "cash_movements",
    "stock_movements",
    "billing_summary",
  ],
  consultorio: ["owners", "patients"],
  hospamb: ["consultations"],
  requests: ["requests"],
  reports: ["reports"],
};
const SUBSECTION_DATA_REQUIREMENTS = {
  consultorio: {
    patients: ["owners", "patients"],
    grooming: ["owners", "patients", "grooming_documents"],
  },
};
const ALL_BOOTSTRAP_SECTIONS = Array.from(
  new Set([
    ...BOOTSTRAP_CORE_SECTIONS,
    ...BOOTSTRAP_BACKGROUND_GROUPS.flat(),
    ...Object.values(SECTION_DATA_REQUIREMENTS).flat(),
    ...Object.values(SUBSECTION_DATA_REQUIREMENTS)
      .flatMap((section) => Object.values(section))
      .flat(),
  ])
);
const loadedBootstrapSections = new Set();
const pendingBootstrapSections = new Set();
const AGENDA_TIMELINE_START_HOUR = 6;
const AGENDA_TIMELINE_END_HOUR = 21;
const AGENDA_TIMELINE_HOUR_HEIGHT = 44;
const consultationTypes = [
  "Consulta",
  "Vacunacion",
  "Formula",
  "Desparasitacion",
  "Ambulatorio",
  "Hospitalizacion",
  "Cirugia / procedimiento",
  "Examen de laboratorio",
  "Imagen diagnostica",
  "Seguimiento",
  "Documento",
  "Remision",
];
const CONSULTORIO_VACCINATION_CUSTOM_OPTION = "__custom__";
const consentTemplates = {
  Cirugia: {
    risks:
      "Riesgos: sangrado, infeccion, dolor, reacciones a medicamentos, complicaciones anestesicas y necesidad de procedimientos adicionales.",
    benefits:
      "Beneficios: correccion o mejora de la condicion tratada y mejor calidad de vida segun la evolucion.",
    alternatives:
      "Alternativas: manejo medico, observacion, remision a especialista o no realizar el procedimiento.",
    statement:
      "Recibo explicacion suficiente, entiendo riesgos y alternativas, y autorizo el procedimiento descrito.",
  },
  Anestesia: {
    risks:
      "Riesgos: reacciones adversas, hipotension, arritmias, vomito, aspiracion y complicaciones impredecibles.",
    benefits: "Beneficios: permitir procedimientos con control de dolor, ansiedad y movimiento.",
    alternatives:
      "Alternativas: menor sedacion, manejo medico, remision o no realizar el procedimiento.",
    statement:
      "Autorizo anestesia o sedacion y monitorizacion, entendiendo que no existe garantia absoluta de resultado.",
  },
  "Procedimiento invasivo": {
    risks:
      "Riesgos: sangrado, infeccion, dolor, reacciones a medicamentos y hallazgos inesperados.",
    benefits: "Beneficios: confirmar diagnostico y orientar tratamiento segun resultados.",
    alternatives:
      "Alternativas: pruebas no invasivas, observacion, remision o no realizar el procedimiento.",
    statement:
      "Autorizo el procedimiento invasivo descrito y acepto los riesgos razonables informados.",
  },
  Hospitalizacion: {
    risks:
      "Riesgos: estres, infecciones asociadas, eventos adversos a medicamentos y cambios en la respuesta clinica.",
    benefits: "Beneficios: observacion, soporte y ajuste terapeutico segun la evolucion.",
    alternatives:
      "Alternativas: manejo ambulatorio, remision o no hospitalizar asumiendo sus riesgos.",
    statement:
      "Autorizo hospitalizacion y procedimientos necesarios segun la evolucion del paciente.",
  },
  Eutanasia: {
    risks:
      "Riesgos: reacciones a medicamentos, movimientos reflejos y necesidad de dosis adicionales.",
    benefits: "Beneficios: aliviar sufrimiento cuando el pronostico es incompatible con bienestar.",
    alternatives: "Alternativas: cuidados paliativos, tratamiento adicional o segunda opinion.",
    statement: "Confirmo mi decision y autorizo la eutanasia humanitaria bajo criterio profesional.",
  },
  "Tratamiento de riesgo": {
    risks:
      "Riesgos: efectos adversos, falta de respuesta al tratamiento y necesidad de ajustes terapeuticos.",
    benefits:
      "Beneficios: controlar o resolver la condicion tratada y mejorar calidad de vida.",
    alternatives:
      "Alternativas: esquemas distintos, soporte, remision o no continuar el tratamiento.",
    statement:
      "Autorizo el tratamiento de riesgo propuesto y acepto controles y seguimientos recomendados.",
  },
};
const billingCashAccounts = ["caja_menor", "caja_mayor", "transferencia"];
const sectionSubsections = {
  dashboard: {
    label: "Vista del dashboard",
    options: [
      { value: "overview", label: "Resumen general", panels: ["dashboardOverviewBlock", "dashboardOperationPanel"] },
      { value: "requests", label: "Solicitudes", panels: ["dashboardRequestsPanel"] },
      { value: "agenda", label: "Agenda", panels: ["dashboardAgendaPanel"] },
      { value: "histories", label: "Historias clinicas", panels: ["dashboardHistoryPanel", "dashboardConsultationTypesPanel"] },
      { value: "sales", label: "Ventas", panels: ["dashboardSalesSummaryPanel", "dashboardSalesDocumentsPanel"] },
    ],
  },
  administration: {
    label: "Que quieres administrar",
    options: [
      { value: "users", label: "Usuarios", panels: ["administrationUsersPanel"] },
    ],
  },
  agenda: {
    label: "Que quieres gestionar",
    options: [
      {
        value: "general",
        label: "Agenda general",
        panels: [
          "agendaGeneralPanel",
          "agendaDayPanel",
          "agendaAvailabilityFormPanel",
          "agendaGeneralListPanel",
        ],
      },
    ],
  },
  sales: {
    label: "Que quieres hacer",
    options: [
      {
        value: "documents",
        label: "Documentos",
        panels: ["salesSummaryMetricsBlock", "salesSummaryPanel", "salesDocumentFormPanel", "salesPaymentFormPanel", "salesDocumentsPanel"],
      },
      {
        value: "cash",
        label: "Ingresos y egresos",
        panels: ["salesSummaryMetricsBlock", "salesSummaryPanel", "salesCashFormPanel", "salesCashPanel"],
      },
      {
        value: "inventory",
        label: "Inventario",
        panels: ["salesSummaryMetricsBlock", "salesSummaryPanel", "salesCatalogFormPanel", "salesStockFormPanel", "salesCatalogPanel", "salesStockHistoryPanel"],
      },
      { value: "providers", label: "Proveedores", panels: ["salesProviderFormPanel", "salesProvidersPanel"] },
      { value: "clients", label: "Clientes", panels: ["salesClientsPanel"] },
      { value: "settings", label: "Configuracion de facturacion", panels: ["salesSettingsPanel"] },
    ],
  },
  consultorio: {
    label: "Que quieres hacer en consultorio",
    options: [
      {
        value: "patients",
        label: "Pacientes",
        panels: ["consultorioOwnersPanel", "consultorioOwnerDetailPanel"],
      },
      {
        value: "grooming",
        label: "Peluqueria",
        panels: ["consultorioGroomingFormPanel", "consultorioGroomingPanel"],
      },
    ],
  },
  hospamb: {
    label: "Que vista quieres abrir",
    options: [
      { value: "hospitalization", label: "Hospitalizacion", panels: ["hospambHospitalizationPanel"] },
      { value: "ambulatory", label: "Ambulatorio", panels: ["hospambAmbulatoryPanel"] },
      {
        value: "procedures",
        label: "Cirug\u00edas / procedimientos",
        panels: ["hospambProcedurePanel"],
      },
    ],
  },
  requests: {
    label: "Que solicitudes quieres revisar",
    options: [
      { value: "records", label: "Historias clinicas", panels: ["requestsRecordsPanel"] },
      { value: "appointments", label: "Agendamiento", panels: ["requestsAppointmentsPanel"] },
      { value: "orders", label: "Ordenes", panels: ["requestsOrdersPanel"] },
      { value: "billing", label: "Facturacion", panels: ["requestsBillingPanel"] },
    ],
  },
  reports: {
    label: "Que informe quieres ver",
    options: [
      {
        value: "classic",
        label: "Dashboard clasico",
        panels: ["reportsStatsBlock", "reportsConsultationTypesPanel", "reportsAgendaPanel", "reportsGroomingPanel"],
      },
      { value: "owners", label: "Propietarios y mascotas", panels: ["reportsOwnersPanel", "reportsPatientsPanel"] },
      { value: "records", label: "Historico de registros", panels: ["reportsRecordsPanel", "reportsConsultationTypesPanel"] },
      { value: "audit", label: "Ultima gestion", panels: ["reportsAuditPanel"] },
      {
        value: "financial",
        label: "Financieros",
        panels: ["reportsBillingSummaryPanel", "reportsProvidersPanel", "reportsCatalogPanel", "reportsBillingDocumentsPanel", "reportsCashPanel"],
      },
    ],
  },
};

function getElement(id) {
  return document.getElementById(id);
}

function queryAll(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function truncate(value, limit = 160) {
  const text = String(value ?? "");
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value) {
  if (!value) {
    return "Sin fecha";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return new Date(`${value}T00:00:00`).toLocaleDateString("es-CO", { dateStyle: "medium" });
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

function toInputDateTime(value) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIsoDate(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function parseIsoDate(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(value, days) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function addMinutes(value, minutes) {
  return new Date(value.getTime() + minutes * 60000);
}

function getWeekdayIndex(value) {
  return (value.getDay() + 6) % 7;
}

function sameMonth(left, right) {
  return left.getMonth() === right.getMonth() && left.getFullYear() === right.getFullYear();
}

function formatMonthLabel(value) {
  return value.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

function formatAgendaDateLabel(value) {
  return parseIsoDate(value).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatAgendaTimeShort(value) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

function formatAgendaHourLabel(hour) {
  const base = new Date();
  base.setHours(hour, 0, 0, 0);
  return base.toLocaleTimeString("es-CO", { hour: "numeric" });
}

function buildAgendaTimelineHours() {
  const hours = [];
  for (let hour = AGENDA_TIMELINE_START_HOUR; hour < AGENDA_TIMELINE_END_HOUR; hour += 1) {
    hours.push({ hour, label: formatAgendaHourLabel(hour) });
  }
  return hours;
}

function normalizeAgendaTone(value) {
  const toneRaw = String(agendaEventTone(value))
    .replace(/[^a-z0-9_-]/gi, "")
    .toLowerCase();
  return [
    "scheduled",
    "draft",
    "confirmed",
    "in_progress",
    "completed",
    "finalized",
    "cancelled",
    "no_show",
  ].includes(toneRaw)
    ? toneRaw
    : "default";
}

function agendaEventTone(status) {
  return (
    {
      Pendiente: "scheduled",
      Pagado: "confirmed",
      Cotizacion: "draft",
      ingreso: "confirmed",
      entrada: "confirmed",
      gasto: "cancelled",
      salida: "cancelled",
      invoice: "finalized",
    }[status] || status || "draft"
  );
}

function buildAgendaMonthStart(viewDate) {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  return addDays(monthStart, -getWeekdayIndex(monthStart));
}

function listAppointmentsForDate(dateValue, { activeOnly = false } = {}) {
  return state.appointments
    .filter((item) => toIsoDate(item.appointment_at) === dateValue)
    .filter((item) => (activeOnly ? activeAppointmentStatuses.has(item.status) : true))
    .sort((left, right) => String(left.appointment_at).localeCompare(String(right.appointment_at)));
}

function listCalendarAppointmentsForDate(dateValue) {
  return listAppointmentsForDate(dateValue).filter(
    (item) => !hiddenCalendarStatuses.has(item.status)
  );
}

function getLatestAppointmentEnd(dateValue) {
  const appointments = listAppointmentsForDate(dateValue, { activeOnly: true });
  let latest = null;
  appointments.forEach((appointment) => {
    const start = new Date(appointment.appointment_at);
    if (Number.isNaN(start.getTime())) {
      return;
    }
    const minutes = Number(appointment.duration_minutes || 30);
    const end = addMinutes(start, minutes);
    if (!latest || end > latest) {
      latest = end;
    }
  });
  return latest;
}

function buildAgendaSlots(dateValue) {
  const target = parseIsoDate(dateValue);
  const activeAppointments = listAppointmentsForDate(dateValue, { activeOnly: true });
  const rules = state.availability_rules
    .filter((rule) => Number(rule.day_of_week) === getWeekdayIndex(target))
    .sort((left, right) => String(left.start_time).localeCompare(String(right.start_time)));
  const slots = [];
  rules.forEach((rule) => {
    let cursor = new Date(`${dateValue}T${rule.start_time}:00`);
    const end = new Date(`${dateValue}T${rule.end_time}:00`);
    const slotMinutes = Number(rule.slot_minutes || 30);
    while (cursor < end) {
      const slotEnd = addMinutes(cursor, slotMinutes);
      const conflicting = activeAppointments.find((appointment) => {
        const appointmentStart = new Date(appointment.appointment_at);
        const appointmentEnd = addMinutes(
          appointmentStart,
          Number(appointment.duration_minutes || 30)
        );
        return appointmentStart < slotEnd && appointmentEnd > cursor;
      });
      slots.push({
        slot_at: cursor.toISOString(),
        label: cursor.toLocaleTimeString("es-CO", {
          hour: "numeric",
          minute: "2-digit",
        }),
        end_label: slotEnd.toLocaleTimeString("es-CO", {
          hour: "numeric",
          minute: "2-digit",
        }),
        duration_minutes: slotMinutes,
        professional_name: rule.professional_name || "Agenda general",
        location: rule.location || "",
        occupied: Boolean(conflicting),
        patient_name: conflicting?.patient_name || "",
        appointment_id: conflicting?.id || "",
      });
      cursor = slotEnd;
    }
  });
  return slots;
}

function getAvailableSlotsForDate(dateValue) {
  if (!dateValue) {
    return [];
  }
  const latestEnd = getLatestAppointmentEnd(dateValue);
  const currentAppointmentId = elements.appointmentIdInput?.value || "";
  return buildAgendaSlots(dateValue).filter((slot) => {
    const isCurrent = slot.appointment_id && slot.appointment_id === currentAppointmentId;
    if (slot.occupied && !isCurrent) {
      return false;
    }
    if (isCurrent) {
      return true;
    }
    if (!latestEnd) {
      return true;
    }
    const slotStart = new Date(slot.slot_at);
    return slotStart >= latestEnd;
  });
}

function serializeForm(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    payload[checkbox.name] = checkbox.checked;
  });
  return payload;
}

function humanStatus(status) {
  const labels = {
    scheduled: "Programada",
    confirmed: "Confirmada",
    completed: "Completada",
    cancelled: "Cancelada",
    no_show: "No asistio",
    draft: "Borrador",
    finalized: "Finalizada",
    in_progress: "En proceso",
    Pendiente: "Pendiente",
    Pagado: "Pagado",
    Cotizacion: "Cotizacion",
    ingreso: "Ingreso",
    gasto: "Gasto",
    entrada: "Entrada",
    salida: "Salida",
    invoice: "Factura",
  };
  return labels[status] || status || "Sin estado";
}

function statusClass(status) {
  const normalized =
    {
      Pendiente: "scheduled",
      Pagado: "confirmed",
      Cotizacion: "draft",
      ingreso: "confirmed",
      entrada: "confirmed",
      gasto: "cancelled",
      salida: "cancelled",
      invoice: "finalized",
    }[status] || status || "draft";
  return `pill pill--${normalized}`;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const contentType = response.headers.get("content-type") || "";
  let payload = null;
  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }
  } else {
    const text = await response.text();
    const message = text ? text.slice(0, 200).trim() : "Respuesta no valida del servidor.";
    throw new Error(message || "Respuesta no valida del servidor.");
  }
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Operacion no completada.");
  }
  return payload?.data !== undefined ? payload.data : payload;
}

const api = {
  bootstrap: (options = {}) => {
    if (typeof options === "boolean") {
      return apiRequest(`/api/bootstrap${options ? "?lite=1" : ""}`);
    }
    const params = new URLSearchParams();
    if (options.lite) {
      params.set("lite", "1");
    }
    if (Array.isArray(options.sections) && options.sections.length) {
      params.set("sections", options.sections.join(","));
    }
    const query = params.toString();
    return apiRequest(`/api/bootstrap${query ? `?${query}` : ""}`);
  },
  saveSettings: (payload) =>
    apiRequest("/api/settings", { method: "POST", body: JSON.stringify(payload) }),
  saveOwner: (payload) =>
    apiRequest("/api/owners", { method: "POST", body: JSON.stringify(payload) }),
  deleteOwner: (ownerId) =>
    apiRequest(`/api/owners/${ownerId}/delete`, { method: "POST", body: "{}" }),
  saveProvider: (payload) =>
    apiRequest("/api/providers", { method: "POST", body: JSON.stringify(payload) }),
  savePatient: (payload) =>
    apiRequest("/api/patients", { method: "POST", body: JSON.stringify(payload) }),
  deletePatient: (patientId) =>
    apiRequest(`/api/patients/${patientId}/delete`, { method: "POST", body: "{}" }),
  saveCatalogItem: (payload) =>
    apiRequest("/api/catalog-items", { method: "POST", body: JSON.stringify(payload) }),
  saveAppointment: (payload) =>
    apiRequest("/api/appointments", { method: "POST", body: JSON.stringify(payload) }),
  updateAppointmentStatus: (appointmentId, status) =>
    apiRequest(`/api/appointments/${appointmentId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  deleteAppointment: (appointmentId) =>
    apiRequest(`/api/appointments/${appointmentId}`, { method: "DELETE" }),
  saveAvailability: (payload) =>
    apiRequest("/api/availability", { method: "POST", body: JSON.stringify(payload) }),
  deleteAvailability: (ruleId) =>
    apiRequest(`/api/availability/${ruleId}`, { method: "DELETE" }),
  saveGoogleCalendarConfig: (payload) =>
    apiRequest("/api/google-calendar/config", { method: "POST", body: JSON.stringify(payload) }),
  connectGoogleCalendar: () =>
    apiRequest("/api/google-calendar/connect", { method: "POST", body: "{}" }),
  disconnectGoogleCalendar: () =>
    apiRequest("/api/google-calendar/disconnect", { method: "POST", body: "{}" }),
  saveCashMovement: (payload) =>
    apiRequest("/api/cash-movements", { method: "POST", body: JSON.stringify(payload) }),
  saveStockAdjustment: (payload) =>
    apiRequest("/api/stock-adjustments", { method: "POST", body: JSON.stringify(payload) }),
  saveBillingDocument: (payload) =>
    apiRequest("/api/billing-documents", { method: "POST", body: JSON.stringify(payload) }),
  registerBillingPayment: (payload) =>
    apiRequest("/api/billing-payments", { method: "POST", body: JSON.stringify(payload) }),
  saveRecord: (payload, finalize) =>
    apiRequest("/api/records", {
      method: "POST",
      body: JSON.stringify({ ...payload, finalize }),
    }),
  saveConsultation: (payload) =>
    apiRequest("/api/consultations", { method: "POST", body: JSON.stringify(payload) }),
  saveEvolution: (payload) =>
    apiRequest("/api/evolutions", { method: "POST", body: JSON.stringify(payload) }),
  saveConsent: (payload) =>
    apiRequest("/api/consents", { method: "POST", body: JSON.stringify(payload) }),
  saveGrooming: (payload) =>
    apiRequest("/api/grooming", { method: "POST", body: JSON.stringify(payload) }),
  backupDatabase: () => apiRequest("/api/backups", { method: "POST", body: "{}" }),
  saveUser: (payload) =>
    apiRequest("/api/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUserStatus: (userId, is_active) =>
    apiRequest(`/api/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ is_active }),
    }),
  authStatus: () => apiRequest("/api/auth/status"),
  authLogin: (payload) =>
    apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  authLogout: () => apiRequest("/api/auth/logout", { method: "POST", body: "{}" }),
};

function getBootstrapCacheKey(userIdOverride) {
  const userId = userIdOverride || authState.currentUser?.id || "anon";
  return `${BOOTSTRAP_CACHE_KEY}_${userId}`;
}

function loadBootstrapCache() {
  if (authState.requiresLogin && !authState.currentUser) {
    return null;
  }
  try {
    const key = getBootstrapCacheKey();
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.data) {
      localStorage.removeItem(key);
      return null;
    }
    if (!parsed.at || Date.now() - parsed.at > BOOTSTRAP_CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch (error) {
    return null;
  }
}

function saveBootstrapCache(payload) {
  if ((authState.requiresLogin && !authState.currentUser) || !payload || typeof payload !== "object") {
    return;
  }
  try {
    const key = getBootstrapCacheKey();
    const snapshot = { at: Date.now(), data: payload };
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch (error) {
    // ignore cache write errors
  }
}

function clearBootstrapCache(userIdOverride) {
  try {
    const key = getBootstrapCacheKey(userIdOverride);
    localStorage.removeItem(key);
  } catch (error) {
    // ignore cache cleanup errors
  }
}

function getAppViewStateKey(userIdOverride) {
  const userId = userIdOverride || authState.currentUser?.id || "anon";
  return `${APP_VIEW_STATE_KEY}_${userId}`;
}

function getDefaultSubsectionValue(sectionId) {
  return sectionSubsections[sectionId]?.options?.[0]?.value || "";
}

function normalizeSubsectionValue(sectionId, value) {
  const options = sectionSubsections[sectionId]?.options || [];
  if (!options.length) {
    return "";
  }
  return options.some((option) => option.value === value) ? value : options[0].value || "";
}

function getAppViewSnapshot() {
  const subsections = {};
  Object.keys(sectionSubsections).forEach((sectionId) => {
    subsections[sectionId] = normalizeSubsectionValue(sectionId, activeSubsections[sectionId]);
  });
  return {
    activeSectionId,
    activeSubsections: subsections,
    consultorioOwnerId,
    consultorioPatientId,
    consultorioProfileView,
    consultorioPatientProfileOpen,
    agendaSelectedDate: toIsoDate(agendaSelectedDate) || toIsoDate(new Date()),
    agendaViewDate: toIsoDate(agendaViewDate) || toIsoDate(new Date()),
    agendaViewMode,
  };
}

function saveAppViewState() {
  if (!appViewPersistenceEnabled) {
    return;
  }
  if (authState.requiresLogin && !authState.currentUser) {
    return;
  }
  try {
    sessionStorage.setItem(getAppViewStateKey(), JSON.stringify(getAppViewSnapshot()));
  } catch (error) {
    // ignore storage write errors
  }
}

function clearAppViewState(userIdOverride) {
  try {
    sessionStorage.removeItem(getAppViewStateKey(userIdOverride));
  } catch (error) {
    // ignore storage cleanup errors
  }
}

function restoreAppViewState() {
  if (authState.requiresLogin && !authState.currentUser) {
    return false;
  }
  try {
    const raw = sessionStorage.getItem(getAppViewStateKey());
    if (!raw) {
      return false;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      clearAppViewState();
      return false;
    }
    Object.keys(sectionSubsections).forEach((sectionId) => {
      activeSubsections[sectionId] = normalizeSubsectionValue(
        sectionId,
        parsed.activeSubsections?.[sectionId]
      );
    });
    consultorioOwnerId =
      typeof parsed.consultorioOwnerId === "string" ? parsed.consultorioOwnerId : "";
    consultorioPatientId =
      typeof parsed.consultorioPatientId === "string" ? parsed.consultorioPatientId : "";
    consultorioProfileView = CONSULTORIO_PROFILE_VIEW_MAP[parsed.consultorioProfileView]
      ? parsed.consultorioProfileView
      : "records";
    consultorioPatientProfileOpen = Boolean(
      parsed.consultorioPatientProfileOpen && consultorioPatientId
    );
    agendaSelectedDate = toIsoDate(parsed.agendaSelectedDate) || toIsoDate(new Date());
    agendaViewDate = parseIsoDate(
      toIsoDate(parsed.agendaViewDate) || agendaSelectedDate || toIsoDate(new Date())
    );
    if (AGENDA_VIEW_MODES.includes(parsed.agendaViewMode)) {
      agendaViewMode = parsed.agendaViewMode;
      try {
        localStorage.setItem(AGENDA_VIEW_STORAGE_KEY, agendaViewMode);
      } catch (error) {
        // ignore storage errors
      }
    }
    const validSections = new Set([
      ...Object.keys(SECTION_DATA_REQUIREMENTS),
      CONSULTORIO_PATIENT_PROFILE_SECTION_ID,
    ]);
    let targetSectionId =
      typeof parsed.activeSectionId === "string" && validSections.has(parsed.activeSectionId)
        ? parsed.activeSectionId
        : "dashboard";
    if (
      targetSectionId === CONSULTORIO_PATIENT_PROFILE_SECTION_ID &&
      !consultorioPatientProfileOpen
    ) {
      targetSectionId = "consultorio";
    }
    const allowed = getAllowedSections();
    const navSectionId = getNavSectionId(targetSectionId);
    if (allowed.size && !allowed.has(navSectionId)) {
      targetSectionId =
        permissionOptions.find((option) => allowed.has(option.key))?.key || "dashboard";
    }
    setActiveSection(targetSectionId);
    return true;
  } catch (error) {
    clearAppViewState();
    return false;
  }
}

function restoreOrDefaultAppView() {
  appViewPersistenceEnabled = false;
  const restored = restoreAppViewState();
  if (!restored) {
    Object.keys(sectionSubsections).forEach((sectionId) => {
      activeSubsections[sectionId] = normalizeSubsectionValue(
        sectionId,
        activeSubsections[sectionId] || getDefaultSubsectionValue(sectionId)
      );
    });
    consultorioOwnerId = "";
    consultorioPatientId = "";
    consultorioProfileView = "records";
    consultorioPatientProfileOpen = false;
    setActiveSection("dashboard");
  }
  appViewPersistenceEnabled = true;
  saveAppViewState();
}

function cacheElements() {
  [
    "statusBanner",
    "backupButton",
    "notificationsButton",
    "notificationsBadge",
    "notificationsPanel",
    "notificationsList",
    "notificationsCopyButton",
    "notificationsClearButton",
    "logoutButton",
    "loginModal",
    "loginForm",
    "loginError",
    "dashboardUpdated",
    "metricOwners",
    "metricPatients",
    "metricRecords",
    "metricConsultations",
    "metricAppointments",
    "metricConsents",
    "metricGrooming",
    "metricAvailability",
    "agendaTodayValue",
    "agendaWeekValue",
    "recordsRetentionValue",
    "lastBackupValue",
    "databasePathLabel",
    "backupsPathLabel",
    "dashboardRequestsList",
    "dashboardConsultationTypeList",
    "dashboardAppointmentsList",
    "dashboardRecordsList",
    "dashboardBillingSummary",
    "dashboardBillingDocumentsList",
    "settingsForm",
    "ownerForm",
    "ownerModal",
    "closeOwnerModalButton",
    "openOwnerModalButton",
    "ownersList",
    "ownersSearchInput",
    "ownersPatientSearchInput",
    "ownersSearchButton",
    "consultorioOwnersPanel",
    "consultorioOwnerDetailPanel",
    "consultorioOwnerSummary",
    "consultorioOwnerName",
    "consultorioOwnerBackButton",
    "consultorioOwnerEditButton",
    "consultorioOwnerDeleteButton",
    "consultorioPatientFormPanel",
    "ownerPatientsSearchInput",
    "openPatientFormButton",
    "consultorioPatientProfilePanel",
    "consultorioPatientProfileTitle",
    "consultorioPatientProfileSubtitle",
    "consultorioPatientProfileNav",
    "consultorioPatientProfileSummary",
    "consultorioPatientBackButton",
    "consultorioPatientEditButton",
    "patientConsultationModal",
    "closePatientConsultationModalButton",
    "cancelPatientConsultationButton",
    "patientConsultationModalTitle",
    "patientConsultationModalSubtitle",
    "patientConsultationModalBadge",
    "patientConsultationModalIcon",
    "patientConsultationForm",
    "patientConsultationClinicalFields",
    "patientHospAmbFields",
    "patientHospAmbTypeSelect",
    "patientHospAmbRegisterTypeButton",
    "patientHospAmbAdmissionInput",
    "patientHospAmbDischargeReasonSelect",
    "patientHospAmbDischargeInput",
    "patientHospAmbReasonInput",
    "patientHospAmbObservationsInput",
    "patientVaccinationFields",
    "patientFormulaFields",
    "patientDewormingFields",
    "patientFormulaDateInput",
    "patientFormulaDiagnosisInput",
    "patientFormulaObservationsInput",
    "patientFormulaMedicationsList",
    "patientFormulaAddMedicationButton",
    "patientVaccinationDateInput",
    "patientVaccinationNameSelect",
    "patientVaccinationCustomNameInput",
    "patientVaccinationCustomButton",
    "patientVaccinationNextDateInput",
    "patientDewormingDateInput",
    "patientDewormingPreviousDateInput",
    "patientDewormingTypeSelect",
    "patientDewormingProductInput",
    "patientDewormingDoseInput",
    "patientDewormingNextDateInput",
    "patientDewormingNotesInput",
    "patientDewormingAttachmentFileInput",
    "patientDewormingAttachmentFileButton",
    "patientDewormingAttachmentsList",
    "patientDewormingAttachmentsValue",
    "patientConsultationReasonSelect",
    "patientConsultationRecordLabel",
    "patientConsultationAttachmentFileInput",
    "patientConsultationAttachmentFileButton",
    "patientConsultationAttachmentsList",
    "patientConsultationAttachmentsValue",
    "complianceNotes",
    "complianceSources",
    "appointmentForm",
    "appointmentRegisterOwnerButton",
    "appointmentTypeSelect",
    "appointmentProfessionalSelect",
    "appointmentPatientHelper",
    "appointmentPatientInput",
    "appointmentPatientId",
    "appointmentOwnerId",
    "appointmentIdInput",
    "appointmentPatientDropdown",
    "appointmentStartInput",
    "appointmentEndInput",
    "appointmentNoTimeCheckbox",
    "appointmentReserveCheckbox",
    "appointmentNoLocationCheckbox",
    "appointmentDurationInput",
    "appointmentStatusInput",
    "appointmentSlotsStrip",
    "availabilityForm",
    "availabilityRulesList",
    "availabilityModal",
    "closeAvailabilityModalButton",
    "agendaAppointmentsModal",
    "closeAgendaAppointmentsModalButton",
    "appointmentsList",
    "agendaMonthLabel",
    "agendaMonthGrid",
    "agendaMonthGridLarge",
    "agendaViewTabs",
    "agendaViewTodayButton",
    "agendaMonthView",
    "agendaWeekView",
    "agendaDayView",
    "agendaListView",
    "agendaProgramView",
    "agendaWeekTimeline",
    "agendaDayTimeline",
    "agendaListItems",
    "agendaSelectedDateLabel",
    "agendaConnectionBadge",
    "agendaAvailabilityFormPanel",
    "agendaGeneralListPanel",
    "agendaPrevMonthButton",
    "agendaTodayButton",
    "agendaNextMonthButton",
    "agendaWeekPrevButton",
    "agendaWeekNextButton",
    "agendaWeekLabel",
    "agendaWeekSlots",
    "agendaTimezoneLabel",
    "openAppointmentModalButton",
    "appointmentModal",
    "appointmentModalTitle",
    "appointmentModalSelectedDate",
    "closeAppointmentModalButton",
    "appointmentDetailModal",
    "appointmentDetailTitle",
    "appointmentDetailSubtitle",
    "appointmentDetailStatus",
    "appointmentDetailSummary",
    "appointmentDetailNotes",
    "appointmentDetailLinks",
    "closeAppointmentDetailButton",
    "patientForm",
    "patientFormTitle",
    "patientFormSubmitButton",
    "cancelPatientEditButton",
    "providerForm",
    "catalogForm",
    "billingDocumentForm",
    "billingSettingsForm",
    "billingPaymentForm",
    "cashMovementForm",
    "stockAdjustmentForm",
    "recordForm",
    "consultationForm",
    "evolutionForm",
    "consentForm",
    "groomingForm",
    "patientsList",
    "recordsList",
    "consultationsList",
    "consentTypeList",
    "consentsList",
    "groomingList",
    "hospitalizationList",
    "ambulatoryList",
    "procedureList",
    "salesDocumentsTotal",
    "salesInvoicesTotal",
    "salesQuotesTotal",
    "salesIncomeTotal",
    "salesPendingTotal",
    "salesLowStockTotal",
    "billingSummaryList",
    "providersList",
    "catalogItemsList",
    "billingClientsList",
    "billingDocumentsList",
    "usersClinicName",
    "usersTableBody",
    "usersSummary",
    "usersSearchInput",
    "usersPageSizeSelect",
    "openUserModalButton",
    "toggleInactiveUsersButton",
    "exportUsersButton",
    "userModal",
    "closeUserModalButton",
    "userForm",
    "userFormError",
    "cashMovementsList",
    "stockMovementsList",
    "requestRecordsList",
    "requestAppointmentsList",
    "requestOrdersList",
    "requestBillingList",
    "reportOwnersTotal",
    "reportPatientsTotal",
    "reportRecordsTotal",
    "reportConsultationsTotal",
    "reportAppointmentsTotal",
    "reportGroomingTotal",
    "reportBillingDocumentsTotal",
    "reportProvidersTotal",
    "reportCatalogItemsTotal",
    "reportsOwnersList",
    "reportsPatientsList",
    "reportsConsultationTypeList",
    "reportsAppointmentsDayList",
    "reportsGroomingStatusList",
    "reportsRecentRecordsList",
    "reportsAuditList",
    "reportsBillingSummaryList",
    "reportsProvidersList",
    "reportsCatalogList",
    "reportsBillingDocumentsList",
    "reportsCashMovementsList",
    "patientOwnerSelect",
    "catalogProviderSelect",
    "billingPatientSelect",
    "recordPatientSelect",
    "consultationRecordSelect",
    "consultationConsentSelect",
    "evolutionRecordSelect",
    "consentPatientSelect",
    "consentRecordSelect",
    "consentConsultationSelect",
    "consentTypeSelect",
    "groomingPatientSelect",
    "billingDocumentTypeSelect",
    "billingPaymentMethodSelect",
    "billingCashAccountSelect",
    "billingLineItemSelect",
    "billingLineQuantity",
    "addBillingLineButton",
    "billingDraftLines",
    "billingInitialPaymentGroup",
    "billingPaymentDocumentSelect",
    "stockAdjustmentItemSelect",
    "saveDraftButton",
    "finalizeRecordButton",
  ].forEach((id) => {
    elements[id] = getElement(id);
  });
}

function showStatus(message, tone = "info", html = false) {
  const banner = elements.statusBanner;
  banner.dataset.tone = tone;
  if (html) {
    banner.innerHTML = message;
  } else {
    banner.textContent = message;
  }
  const plainText = html
    ? String(message).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : String(message || "").trim();
  if (plainText) {
    addNotification(plainText, tone);
  }
}

function getNavSectionId(sectionId) {
  return sectionId === CONSULTORIO_PATIENT_PROFILE_SECTION_ID ? "consultorio" : sectionId;
}

function isInternalWorkspaceSection(section) {
  return section?.dataset?.internalSection === "true";
}

function setActiveSection(sectionId) {
  if (
    activeSectionId === CONSULTORIO_PATIENT_PROFILE_SECTION_ID &&
    sectionId !== CONSULTORIO_PATIENT_PROFILE_SECTION_ID
  ) {
    consultorioPatientProfileOpen = false;
  }
  if (
    sectionId !== "consultorio" &&
    sectionId !== CONSULTORIO_PATIENT_PROFILE_SECTION_ID &&
    consultorioPatientProfileOpen
  ) {
    consultorioPatientProfileOpen = false;
    elements.consultorioPatientProfilePanel?.classList.add("is-hidden");
    elements.consultorioPatientProfilePanel?.setAttribute("aria-hidden", "true");
  }
  activeSectionId = sectionId;
  const config = sectionSubsections[sectionId];
  if (config && !activeSubsections[sectionId]) {
    activeSubsections[sectionId] = config.options[0]?.value || "";
  }
  const navSectionId = getNavSectionId(sectionId);
  queryAll(".workspace-section").forEach((section) => {
    section.classList.toggle("is-visible", section.id === sectionId);
  });
  queryAll(".switcher-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.sectionTarget === navSectionId);
  });
  applySectionSubsection(sectionId);
  renderAll();
  if (bootstrapReadyForSectionLoads) {
    ensureSectionData(sectionId);
  }
  updateNavDropdownState();
}

function setSectionSubsection(sectionId, subsectionValue) {
  if (!sectionSubsections[sectionId]) {
    return;
  }
  activeSubsections[sectionId] = subsectionValue;
  applySectionSubsection(sectionId);
  if (getActiveSectionId() === sectionId) {
    renderAll();
    if (bootstrapReadyForSectionLoads) {
      ensureSectionData(sectionId);
    }
  }
  updateNavDropdownState();
}

function getSubsectionOption(sectionId) {
  const config = sectionSubsections[sectionId];
  if (!config) {
    return null;
  }
  const value = activeSubsections[sectionId] || config.options[0]?.value;
  return config.options.find((option) => option.value === value) || config.options[0] || null;
}

function syncSectionContainers(sectionId) {
  const section = getElement(sectionId);
  if (!section) {
    return;
  }
  section.querySelectorAll(".two-column-grid, .three-column-grid, .panel-stack").forEach((container) => {
    const hasVisibleChild = Array.from(container.children).some(
      (child) => !child.classList.contains("is-hidden")
    );
    container.classList.toggle("is-hidden", !hasVisibleChild);
  });
}

function syncConsultorioSubsection(option) {
  if (!option) {
    return;
  }
  const profileConfig =
    option.value === "patients" && consultorioPatientId ? getConsultorioProfileViewConfig() : null;
  if (
    profileConfig &&
    Object.prototype.hasOwnProperty.call(profileConfig, "formConsultationType") &&
    elements.consultationTypeSelect
  ) {
    elements.consultationTypeSelect.value = profileConfig.formConsultationType || "";
  }
}

function applySectionSubsection(sectionId) {
  const config = sectionSubsections[sectionId];
  if (!config) {
    return;
  }
  const option = getSubsectionOption(sectionId);
  if (!option) {
    return;
  }
  if (sectionId === "consultorio") {
    const visiblePanels = getConsultorioVisiblePanels();
    CONSULTORIO_PANEL_IDS.forEach((panelId) => {
      const panel = getElement(panelId);
      if (panel) {
        panel.classList.toggle("is-hidden", !visiblePanels.has(panelId));
      }
    });
    syncConsultorioSubsection(option);
    renderConsultorioOwnerDetail();
    renderPatients();
    renderConsultorioPatientProfile();
    syncSectionContainers(sectionId);
    return;
  }
  const visiblePanels = new Set(option.panels || []);
  const allPanels = new Set(config.options.flatMap((item) => item.panels || []));
  allPanels.forEach((panelId) => {
    const panel = getElement(panelId);
    if (panel) {
      panel.classList.toggle("is-hidden", !visiblePanels.has(panelId));
    }
  });
  if (sectionId === "consultorio") {
    syncConsultorioSubsection(option);
    renderConsultations();
    renderConsultorioOwnerDetail();
    renderPatients();
  }
  syncSectionContainers(sectionId);
}

function closeNavDropdowns() {
  openNavDropdownSection = "";
  queryAll(".switcher-item").forEach((item) => item.classList.remove("is-open"));
}

function renderNotifications() {
  if (!elements.notificationsList) {
    return;
  }
  if (!notifications.length) {
    elements.notificationsList.innerHTML = emptyState("Sin notificaciones por ahora.");
  } else {
    elements.notificationsList.innerHTML = notifications
      .map(
        (item) => `
        <article class="notification-item" data-tone="${escapeHtml(item.tone)}">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.message)}</p>
        </article>
      `
      )
      .join("");
  }
  if (elements.notificationsBadge) {
    elements.notificationsBadge.textContent = String(unreadNotifications);
    elements.notificationsBadge.classList.toggle("is-hidden", unreadNotifications === 0);
  }
}

function addNotification(message, tone = "info") {
  const timestamp = new Date();
  const titleMap = {
    error: "Error",
    success: "Listo",
    info: "Estado",
    warning: "Aviso",
  };
  notifications.unshift({
    message,
    tone,
    title: titleMap[tone] || "Estado",
    time: timestamp.toISOString(),
  });
  if (notifications.length > MAX_NOTIFICATIONS) {
    notifications.pop();
  }
  if (elements.notificationsPanel?.classList.contains("is-hidden")) {
    unreadNotifications = Math.min(unreadNotifications + 1, MAX_NOTIFICATIONS);
  }
  renderNotifications();
}

function openNotificationsPanel() {
  if (!elements.notificationsPanel) {
    return;
  }
  elements.notificationsPanel.classList.remove("is-hidden");
  elements.notificationsPanel.setAttribute("aria-hidden", "false");
  unreadNotifications = 0;
  renderNotifications();
}

function closeNotificationsPanel() {
  if (!elements.notificationsPanel) {
    return;
  }
  elements.notificationsPanel.classList.add("is-hidden");
  elements.notificationsPanel.setAttribute("aria-hidden", "true");
}

function toggleNotificationsPanel() {
  if (!elements.notificationsPanel) {
    return;
  }
  if (elements.notificationsPanel.classList.contains("is-hidden")) {
    openNotificationsPanel();
  } else {
    closeNotificationsPanel();
  }
}

function updateNavDropdownState() {
  queryAll("[data-nav-subsection]").forEach((item) => {
    const isSelected =
      getSubsectionOption(item.dataset.navSection)?.value === item.dataset.navSubsection;
    item.classList.toggle("is-selected", isSelected);
  });
}

function buildNavDropdowns() {
  queryAll(".app-switcher > .switcher-tab").forEach((button) => {
    if (button.parentElement?.classList.contains("switcher-item")) {
      return;
    }
    const sectionId = button.dataset.sectionTarget;
    const wrapper = document.createElement("div");
    wrapper.className = "switcher-item";
    wrapper.dataset.sectionId = sectionId;
    const dropdown = document.createElement("div");
    dropdown.className = "switcher-dropdown";
    dropdown.innerHTML = (sectionSubsections[sectionId]?.options || [])
      .map(
        (option) => `
          <button
            class="switcher-dropdown-item"
            type="button"
            data-nav-section="${escapeHtml(sectionId)}"
            data-nav-subsection="${escapeHtml(option.value)}"
          >
            ${escapeHtml(option.label)}
          </button>
        `
      )
      .join("");
    const label = button.textContent.trim();
    button.innerHTML = `<span>${escapeHtml(label)}</span><span class="switcher-caret">▾</span>`;
    button.parentNode.insertBefore(wrapper, button);
    wrapper.append(button, dropdown);
  });
  queryAll(".menu-strip").forEach((strip) => strip.classList.add("is-hidden"));
}

function bindNavDropdowns() {
  queryAll("[data-nav-subsection]").forEach((item) => {
    item.addEventListener("click", () => {
      setSectionSubsection(item.dataset.navSection, item.dataset.navSubsection);
      setActiveSection(item.dataset.navSection);
      closeNavDropdowns();
    });
  });
}

function populateSelect(select, items, getLabel, placeholder) {
  if (!select) {
    return;
  }
  const current = select.value;
  select.innerHTML = [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...items.map(
      (item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(getLabel(item))}</option>`
    ),
  ].join("");
  if (items.some((item) => item.id === current)) {
    select.value = current;
  }
}

function renderList(container, items, renderer, emptyMessage) {
  if (!container) {
    return;
  }
  container.innerHTML = items.length ? items.map(renderer).join("") : emptyState(emptyMessage);
}

function renderSummary(container, entries, emptyMessage) {
  if (!container) {
    return;
  }
  container.innerHTML = entries.length
    ? entries
        .map(
          ([label, value]) =>
            `<div class="summary-item"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
        )
        .join("")
    : emptyState(emptyMessage);
}

function renderRequestCards() {
  const requests = state.requests || {};
  const entries = [
    ["Historias clinicas", (requests.clinical_records || []).length],
    ["Agendamiento", (requests.appointments || []).length],
    ["Ordenes", (requests.orders || []).length],
    ["Facturacion", (requests.billing_documents || []).length],
  ];
  renderSummary(elements.dashboardRequestsList, entries, "No hay solicitudes pendientes.");
}

function getBillingSummaryEntries(summary = state.billing_summary || {}) {
  return [
    ["Total facturado", formatMoney(summary.total_facturado || 0)],
    ["Saldo pendiente", formatMoney(summary.saldo_pendiente || 0)],
    ["Ingresos", formatMoney(summary.ingresos || 0)],
    ["Gastos", formatMoney(summary.gastos || 0)],
    ["Items con inventario", summary.tracked_items_count || 0],
    ["Stock bajo", summary.low_stock_count || 0],
    ["Unidades en inventario", summary.inventory_units || 0],
  ];
}

function renderBillingDraftLines() {
  renderList(
    elements.billingDraftLines,
    billingDraft.lines,
    (line, index) => {
      const item = state.catalog_items.find((catalogItem) => catalogItem.id === line.catalog_item_id) || {};
      const unitPrice = Number(item.unit_price || 0);
      const lineTotal = unitPrice * Number(line.quantity || 0);
      return `
        <article class="list-card">
          <header>
            <div>
              <h4>${escapeHtml(item.name || "Item")}</h4>
              <p>${escapeHtml(item.category || "Sin categoria")}</p>
            </div>
            <span class="pill pill--draft">${escapeHtml(Number(line.quantity || 0))} u</span>
          </header>
          <p>Unitario: ${formatMoney(unitPrice)} / Total: ${formatMoney(lineTotal)}</p>
          <div class="item-actions">
            <button data-remove-billing-line="${index}" type="button">Quitar</button>
          </div>
        </article>
      `;
    },
    "Agrega al menos un item al documento."
  );
}

function syncBillingDocumentFormState() {
  const defaultCashAccount = state.settings.billing_default_cash_account || "caja_menor";
  const documentType = elements.billingDocumentTypeSelect?.value || "factura";
  const paymentMethod = elements.billingPaymentMethodSelect?.value || "Pendiente";

  [
    elements.billingCashAccountSelect,
    elements.billingPaymentForm?.elements?.cash_account,
    elements.cashMovementForm?.elements?.cash_account,
    elements.billingDocumentForm?.elements?.initial_payment_cash_account,
  ].forEach((field) => {
    if (field && !field.value) {
      field.value = defaultCashAccount;
    }
  });

  if (documentType === "cotizacion" && elements.billingPaymentMethodSelect) {
    elements.billingPaymentMethodSelect.value = "Pendiente";
  }

  const shouldShowInitialPayment = documentType === "factura" && paymentMethod === "Pendiente";
  elements.billingInitialPaymentGroup?.classList.toggle("is-hidden", !shouldShowInitialPayment);
}

function renderSales() {
  const summary = state.billing_summary || {};
  elements.salesDocumentsTotal.textContent = summary.documents_total ?? 0;
  elements.salesInvoicesTotal.textContent = summary.facturas_total ?? 0;
  elements.salesQuotesTotal.textContent = summary.cotizaciones_total ?? 0;
  elements.salesIncomeTotal.textContent = formatMoney(summary.ingresos || 0);
  elements.salesPendingTotal.textContent = formatMoney(summary.saldo_pendiente || 0);
  elements.salesLowStockTotal.textContent = summary.low_stock_count ?? 0;

  renderSummary(
    elements.billingSummaryList,
    getBillingSummaryEntries(summary),
    "Aun no hay informacion de facturacion."
  );

  renderList(
    elements.providersList,
    state.providers,
    (provider) => `
      <article class="list-card">
        <h4>${escapeHtml(provider.name)}</h4>
        <p>${escapeHtml(provider.contact_name || "Sin contacto")}</p>
        <p>${escapeHtml(provider.phone || "Sin telefono")} / ${escapeHtml(provider.email || "Sin correo")}</p>
        <p>Items asociados: ${provider.items_count || 0}</p>
      </article>
    `,
    "Aun no hay proveedores registrados."
  );

  renderList(
    elements.catalogItemsList,
    state.catalog_items,
    (item) => `
      <article class="list-card">
        <header>
          <div>
            <h4>${escapeHtml(item.name)}</h4>
            <p>${escapeHtml(item.category)}${item.provider_name ? ` / ${escapeHtml(item.provider_name)}` : ""}</p>
          </div>
          <span class="${statusClass(item.low_stock ? "Pendiente" : "Pagado")}">${
            item.low_stock ? "Stock bajo" : item.track_inventory ? "Controlado" : "Servicio"
          }</span>
        </header>
        <p>Costo unitario: ${formatMoney(item.unit_cost || 0)} / Venta: ${formatMoney(item.unit_price || 0)}</p>
        <p>Utilidad: ${formatMoney(item.profit_amount || 0)}</p>
        <p>Stock: ${Number(item.stock_quantity || 0)} / Minimo: ${Number(item.min_stock || 0)}</p>
      </article>
    `,
    "Aun no hay items en el catalogo."
  );

  renderList(
    elements.billingClientsList,
    state.billing_clients,
    (client) => `
      <article class="list-card">
        <h4>${escapeHtml(client.full_name)}</h4>
        <p>${escapeHtml(client.phone || "Sin telefono")} / ${escapeHtml(client.email || "Sin correo")}</p>
        <p>Mascotas: ${client.patients_count || 0}</p>
        <p>Documentos: ${client.documents_count || 0}</p>
      </article>
    `,
    "Aun no hay clientes para facturacion."
  );

  renderList(
    elements.billingDocumentsList,
    state.billing_documents,
    (document) => `
      <article class="list-card">
        <header>
          <div>
            <h4>${escapeHtml(document.document_number)} / ${escapeHtml(document.patient_name)}</h4>
            <p>${escapeHtml(document.document_type)} / ${formatDateTime(document.issue_date)}</p>
          </div>
          <span class="${statusClass(document.status)}">${escapeHtml(humanStatus(document.status))}</span>
        </header>
        <p>${escapeHtml(document.owner_name)}</p>
        <p>Total: ${formatMoney(document.total || 0)} / Pagado: ${formatMoney(document.amount_paid || 0)}</p>
        <p>Saldo: ${formatMoney(document.balance_due || 0)} / Lineas: ${document.lines_count || 0}</p>
        <div class="item-actions">
          ${
            document.document_type === "factura" && document.status === "Pendiente"
              ? `<button data-select-billing-document="${escapeHtml(document.id)}" type="button">Registrar abono</button>`
              : ""
          }
        </div>
      </article>
    `,
    "Aun no hay documentos de facturacion."
  );

  renderList(
    elements.cashMovementsList,
    state.cash_movements,
    (movement) => `
      <article class="list-card">
        <header>
          <div>
            <h4>${escapeHtml(movement.concept)}</h4>
            <p>${formatDateTime(movement.movement_date)}</p>
          </div>
          <span class="${statusClass(movement.movement_type)}">${escapeHtml(
            humanStatus(movement.movement_type)
          )}</span>
        </header>
        <p>${formatMoney(movement.amount || 0)} / ${escapeHtml(movement.cash_account || "Sin caja")}</p>
        <p>${escapeHtml(movement.category || "Sin categoria")}</p>
        <p>${movement.auto_generated ? "Generado automaticamente" : "Movimiento manual"}</p>
      </article>
    `,
    "Aun no hay movimientos de caja."
  );

  renderList(
    elements.stockMovementsList,
    state.stock_movements,
    (movement) => `
      <article class="list-card">
        <header>
          <div>
            <h4>${escapeHtml(movement.item_name)}</h4>
            <p>${formatDateTime(movement.movement_date)}</p>
          </div>
          <span class="${statusClass(movement.movement_type)}">${escapeHtml(
            humanStatus(movement.movement_type)
          )}</span>
        </header>
        <p>Cantidad: ${Number(movement.quantity || 0)} / Saldo: ${Number(movement.balance_after || 0)}</p>
        <p>${escapeHtml(movement.note || "Sin nota")}</p>
      </article>
    `,
    "Aun no hay movimientos de inventario."
  );
}

function renderDashboard() {
  const dashboard = state.dashboard || {};
  elements.metricOwners.textContent = dashboard.owners ?? 0;
  elements.metricPatients.textContent = dashboard.patients ?? 0;
  elements.metricRecords.textContent = dashboard.records_total ?? 0;
  elements.metricConsultations.textContent = dashboard.consultations_total ?? 0;
  elements.metricAppointments.textContent = dashboard.appointments ?? 0;
  elements.metricConsents.textContent = dashboard.consents ?? 0;
  elements.metricGrooming.textContent = dashboard.grooming_total ?? 0;
  elements.metricAvailability.textContent = dashboard.available_slots_next_14_days ?? 0;
  elements.agendaTodayValue.textContent = dashboard.appointments_today ?? 0;
  elements.agendaWeekValue.textContent = dashboard.upcoming_week ?? 0;
  elements.recordsRetentionValue.textContent = dashboard.records_near_retention ?? 0;
  elements.lastBackupValue.textContent = dashboard.last_backup_at
    ? formatDateTime(dashboard.last_backup_at)
    : "Sin respaldos";
  elements.databasePathLabel.textContent = state.database_path || "N/D";
  elements.backupsPathLabel.textContent = state.backups_path || "N/D";
  elements.dashboardUpdated.textContent = state.generated_at
    ? `Actualizado: ${formatDateTime(state.generated_at)}`
    : "";
  renderRequestCards();
  renderSummary(
    elements.dashboardConsultationTypeList,
    Object.entries(dashboard.consultations_by_type || {}),
    "Aun no hay consultas internas registradas."
  );
  const activeAppointments = state.appointments.filter((item) =>
    activeAppointmentStatuses.has(item.status)
  );
  renderList(
    elements.dashboardAppointmentsList,
    activeAppointments.slice(0, 6),
    (appointment) => `
      <article class="list-card">
        <header>
          <div>
            <h4>${escapeHtml(appointment.patient_name)}</h4>
            <p>${formatDateTime(appointment.appointment_at)}</p>
          </div>
          <span class="${statusClass(appointment.status)}">${escapeHtml(humanStatus(appointment.status))}</span>
        </header>
        <p>${escapeHtml(appointment.reason)}</p>
        <p>${escapeHtml(appointment.professional_name || "Sin profesional asignado")}</p>
      </article>
    `,
    "No hay citas activas."
  );
  renderList(
    elements.dashboardRecordsList,
    state.records.slice(0, 6),
    (record) => `
      <article class="list-card">
        <header>
          <div>
            <h4>${escapeHtml(record.patient_name)}</h4>
            <p>${formatDateTime(record.opened_at)}</p>
          </div>
          <span class="${statusClass(record.status)}">${escapeHtml(humanStatus(record.status))}</span>
        </header>
        <p>${escapeHtml(truncate(record.reason_for_consultation || "Sin motivo registrado"))}</p>
        <p>Consultas internas: ${record.consultations_count || 0}</p>
      </article>
    `,
    "Aun no hay historias clinicas registradas."
  );
  renderSummary(
    elements.dashboardBillingSummary,
    getBillingSummaryEntries(state.billing_summary || {}).slice(0, 6),
    "Aun no hay informacion de facturacion."
  );
  renderList(
    elements.dashboardBillingDocumentsList,
    (state.requests.billing_documents || []).slice(0, 6),
    (document) => `
      <article class="list-card">
        <header>
          <div>
            <h4>${escapeHtml(document.document_number)} / ${escapeHtml(document.patient_name)}</h4>
            <p>${escapeHtml(document.owner_name)}</p>
          </div>
          <span class="${statusClass(document.status)}">${escapeHtml(humanStatus(document.status))}</span>
        </header>
        <p>Total: ${formatMoney(document.total || 0)} / Saldo: ${formatMoney(document.balance_due || 0)}</p>
      </article>
    `,
    "No hay documentos pendientes."
  );
}

function applySettingsValues(form) {
  if (!form) {
    return;
  }
  Object.entries(state.settings || {}).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field) {
      return;
    }
    if (field.type === "checkbox") {
      field.checked = Boolean(value);
      return;
    }
    field.value = value ?? "";
  });
}

function applySettingsForm() {
  applySettingsValues(elements.settingsForm);
  applySettingsValues(elements.billingSettingsForm);
  applySettingsValues(elements.googleCalendarForm);
  const googleEnabled = elements.googleCalendarForm?.elements?.google_calendar_enabled;
  if (googleEnabled) {
    googleEnabled.value = "true";
  }
}

function filterOwners() {
  const query = String(ownersFilters.query || "").trim().toLowerCase();
  const petQuery = String(ownersFilters.petQuery || "").trim().toLowerCase();
  return (state.owners || []).filter((owner) => {
    const haystack = [
      owner.full_name,
      owner.identification_type,
      owner.identification_number,
      owner.phone,
      owner.alternate_phone,
      owner.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesOwner = !query || haystack.includes(query);
    const ownerPatients = (state.patients || []).filter((patient) => patient.owner_id === owner.id);
    const patientMatches = !petQuery
      || ownerPatients.some((patient) =>
        [patient.name, patient.species, patient.breed]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(petQuery)
      );
    return matchesOwner && patientMatches;
  });
}

function getOwnerPatients(ownerId) {
  return (state.patients || []).filter((patient) => patient.owner_id === ownerId);
}

function getFilteredConsultorioPatients() {
  const owner = getConsultorioOwner();
  if (!owner) {
    return [];
  }
  const query = String(consultorioPatientsFilters.query || "").trim().toLowerCase();
  const patients = getOwnerPatients(owner.id);
  if (!query) {
    return patients;
  }
  return patients.filter((patient) =>
    [patient.name, patient.species, patient.breed, patient.sex, patient.reproductive_status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query)
  );
}

function getOwnerInitials(owner) {
  const name = String(owner?.full_name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  return name || "PR";
}

function getPatientInitials(patient) {
  const name = String(patient?.name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  return name || "PT";
}

function getOwnerLatestActivity(ownerId) {
  const patientIds = new Set(getOwnerPatients(ownerId).map((patient) => patient.id));
  const activities = [];
  (state.records || []).forEach((record) => {
    if (!patientIds.has(record.patient_id)) {
      return;
    }
    activities.push({
      at: record.opened_at,
      patientName: record.patient_name,
      label: "Historia clinica",
    });
  });
  (state.consultations || []).forEach((consultation) => {
    if (!patientIds.has(consultation.patient_id)) {
      return;
    }
    activities.push({
      at: consultation.consultation_at,
      patientName: consultation.patient_name,
      label: consultation.title || consultation.consultation_type || "Consulta",
    });
  });
  (state.consents || []).forEach((consent) => {
    if (!patientIds.has(consent.patient_id)) {
      return;
    }
    activities.push({
      at: consent.signed_at,
      patientName: consent.patient_name,
      label: consent.procedure_name || "Consentimiento",
    });
  });
  (state.grooming_documents || []).forEach((document) => {
    if (!patientIds.has(document.patient_id)) {
      return;
    }
    activities.push({
      at: document.service_at,
      patientName: document.patient_name,
      label: document.service_name || "Peluqueria",
    });
  });
  activities.sort((left, right) => String(right.at || "").localeCompare(String(left.at || "")));
  return activities[0] || null;
}

function getConsultorioProfileTimelineItems(option = getConsultorioProfileViewConfig()) {
  if (!isConsultorioPatientProfileActive()) {
    return [];
  }

  const buildRecordItem = (record) => ({
    id: `record-${record.id}`,
    at: record.opened_at,
    typeLabel: "Historia clinica",
    title: record.payload?.history_focus || record.reason_for_consultation || "Historia clinica",
    tone: statusClass(record.status || "draft"),
    lines: [
      `Motivo: ${record.reason_for_consultation || "Sin motivo registrado"}`,
      `Diagnostico: ${record.presumptive_diagnosis || "Sin diagnostico presuntivo"}`,
      `Plan: ${truncate(record.procedures_plan || "Sin plan terapeutico", 180)}`,
    ],
  });

  const buildConsultationItem = (consultation) => {
    const formulaDetails = isFormulaConsultationType(consultation.consultation_type)
      ? parseConsultorioFormulaDetails(consultation)
      : null;
    const hospAmbDetails = isHospAmbConsultationType(consultation.consultation_type)
      ? parseConsultorioHospAmbDetails(consultation)
      : null;
    return {
      id: `consultation-${consultation.id}`,
      at: consultation.consultation_at,
      typeLabel: consultation.consultation_type || "Consulta",
      title: consultation.title || consultation.consultation_type || "Consulta clinica",
      tone: consultation.consent_required ? "pill pill--confirmed" : "pill pill--draft",
      attachments: parseConsultorioAttachments(consultation.attachments_summary || ""),
      lines: isFormulaConsultationType(consultation.consultation_type)
        ? [
            formulaDetails?.diagnosis
              ? `Diagnostico: ${truncate(formulaDetails.diagnosis, 180)}`
              : "",
            buildConsultorioFormulaMedicationPreview(formulaDetails?.medications || [])
              ? `Medicamentos: ${truncate(
                  buildConsultorioFormulaMedicationPreview(formulaDetails?.medications || []),
                  180
                )}`
              : "",
            formulaDetails?.observations
              ? `Observaciones: ${truncate(formulaDetails.observations, 180)}`
              : "",
          ].filter(Boolean)
        : isHospAmbConsultationType(consultation.consultation_type)
        ? [
            hospAmbDetails?.reason ? `Raz\u00f3n: ${truncate(hospAmbDetails.reason, 180)}` : "",
            hospAmbDetails?.observations
              ? `Observaciones: ${truncate(hospAmbDetails.observations, 180)}`
              : "",
            hospAmbDetails?.dischargeReason || hospAmbDetails?.dischargeAt
              ? `Salida: ${truncate(
                  [
                    hospAmbDetails?.dischargeReason || "",
                    hospAmbDetails?.dischargeAt ? formatDateTime(hospAmbDetails.dischargeAt) : "",
                  ]
                    .filter(Boolean)
                    .join(" / "),
                  180
                )}`
              : "",
          ].filter(Boolean)
        : [
            `Resumen: ${truncate(consultation.summary || "Sin resumen", 180)}`,
            consultation.indications ? `Indicaciones: ${truncate(consultation.indications, 180)}` : "",
            consultation.document_reference || consultation.referred_to
              ? `Referencia: ${consultation.document_reference || consultation.referred_to}`
              : "",
          ].filter(Boolean),
    };
  };

  const buildConsentItem = (consent) => ({
    id: `consent-${consent.id}`,
    at: consent.signed_at,
    typeLabel: "Consentimiento",
    title: consent.procedure_name || consent.consent_type || "Consentimiento",
    tone: "pill pill--confirmed",
    lines: [
      `Tipo: ${consent.consent_type || "Sin tipo"}`,
      `Tutor: ${consent.owner_signature_name || consent.owner_name || "Sin dato"}`,
      consent.notes ? `Notas: ${truncate(consent.notes, 180)}` : "",
    ].filter(Boolean),
  });

  const buildGroomingItem = (document) => ({
    id: `grooming-${document.id}`,
    at: document.service_at,
    typeLabel: "Peluqueria",
    title: document.service_name || document.document_type || "Servicio de peluqueria",
    tone: statusClass(document.status || "scheduled"),
    lines: [
      `Documento: ${document.document_type || "Sin tipo"}`,
      `Responsable: ${document.stylist_name || "Sin responsable"}`,
      truncate(document.recommendations || document.notes || "Sin observaciones", 180),
    ],
  });

  if (option?.value === "records") {
    return []
      .concat(getConsultorioScopedRecords().map(buildRecordItem))
      .concat(getConsultorioScopedConsultations().map(buildConsultationItem))
      .concat(getConsultorioScopedConsents().map(buildConsentItem))
      .concat(getConsultorioScopedGrooming().map(buildGroomingItem))
      .sort((left, right) => String(right.at || "").localeCompare(String(left.at || "")));
  }
  if (option?.value === "consents") {
    return getConsultorioScopedConsents()
      .map(buildConsentItem)
      .sort((left, right) => String(right.at || "").localeCompare(String(left.at || "")));
  }
  if (option?.value === "grooming") {
    return getConsultorioScopedGrooming()
      .map(buildGroomingItem)
      .sort((left, right) => String(right.at || "").localeCompare(String(left.at || "")));
  }
  return getConsultorioScopedConsultations(option?.consultationTypes || null)
    .map(buildConsultationItem)
    .sort((left, right) => String(right.at || "").localeCompare(String(left.at || "")));
}

function getConsultorioOwner() {
  return (state.owners || []).find((owner) => owner.id === consultorioOwnerId) || null;
}

function getConsultorioPatient() {
  return (state.patients || []).find((patient) => patient.id === consultorioPatientId) || null;
}

function getConsultorioProfileViewConfig() {
  return CONSULTORIO_PROFILE_VIEW_MAP[consultorioProfileView] || CONSULTORIO_PROFILE_VIEWS[0];
}

function isConsultorioWorkspaceOnlyView(profileConfig) {
  return ["consultations", "vacunacion", "formula", "desparasitacion", "hospamb", "cirugia"].includes(
    profileConfig?.value || ""
  );
}

function getConsultorioProfileDefaultConsultationTitle(profileConfig) {
  return (
    {
      consultations: "Consulta general",
      vacunacion: "Vacunacion",
      formula: "Formula medica",
      desparasitacion: "Desparasitacion",
      hospamb: "Hospitalizacion",
      cirugia: "Cirugia / procedimiento",
      orders: "Documento clinico",
      laboratorio: "Examen de laboratorio",
      imagenes: "Imagen diagnostica",
      seguimiento: "Seguimiento",
      documents: "Documento clinico",
      remisiones: "Remision",
    }[profileConfig?.value || ""] || "Consulta general"
  );
}

function getConsultorioProfileModalEntityLabel(consultationType) {
  return (
    {
      Consulta: "Consulta",
      Vacunacion: "Vacunacion",
      Formula: "Formula medica",
      Desparasitacion: "Desparasitacion",
      Ambulatorio: "Ambulatorio",
      Hospitalizacion: "Hospitalizacion",
      "Cirugia / procedimiento": "Cirug\u00eda/procedimiento",
      "Examen de laboratorio": "Examen de laboratorio",
      "Imagen diagnostica": "Imagen diagnostica",
      Seguimiento: "Seguimiento",
      Documento: "Documento clinico",
      Remision: "Remision",
    }[consultationType || ""] || "Consulta"
  );
}

function isVaccinationConsultationType(consultationType) {
  return String(consultationType || "").trim() === "Vacunacion";
}

function isFormulaConsultationType(consultationType) {
  return String(consultationType || "").trim() === "Formula";
}

function isDewormingConsultationType(consultationType) {
  return String(consultationType || "").trim() === "Desparasitacion";
}

function isHospAmbConsultationType(consultationType) {
  const normalized = String(consultationType || "").trim();
  return normalized === "Hospitalizacion" || normalized === "Ambulatorio";
}

function isConsultorioPatientsViewActive() {
  return getActiveSectionId() === "consultorio" && getSubsectionOption("consultorio")?.value === "patients";
}

function isConsultorioPatientProfileActive() {
  return (
    getActiveSectionId() === CONSULTORIO_PATIENT_PROFILE_SECTION_ID &&
    Boolean(getConsultorioPatient()) &&
    consultorioPatientProfileOpen
  );
}

function syncConsultorioSelectionState() {
  const ownersLoaded = loadedBootstrapSections.has("owners");
  const patientsLoaded = loadedBootstrapSections.has("patients");
  if (consultorioOwnerId && ownersLoaded && !getConsultorioOwner()) {
    consultorioOwnerId = "";
  }
  if (consultorioPatientId && patientsLoaded && !getConsultorioPatient()) {
    consultorioPatientId = "";
    consultorioPatientProfileOpen = false;
  }
  const patient = getConsultorioPatient();
  if (patient?.owner_id && consultorioOwnerId !== patient.owner_id) {
    consultorioOwnerId = patient.owner_id;
  }
}

function getConsultorioScopedRecords() {
  if (!isConsultorioPatientProfileActive()) {
    return state.records;
  }
  return state.records.filter((record) => record.patient_id === consultorioPatientId);
}

function getConsultorioScopedConsultations(consultationTypes = null) {
  let consultations = state.consultations || [];
  if (isConsultorioPatientProfileActive()) {
    consultations = consultations.filter((item) => item.patient_id === consultorioPatientId);
  }
  if (Array.isArray(consultationTypes) && consultationTypes.length) {
    consultations = consultations.filter((item) => consultationTypes.includes(item.consultation_type));
  }
  return consultations;
}

function getConsultorioScopedConsents() {
  if (!isConsultorioPatientProfileActive()) {
    return state.consents;
  }
  return state.consents.filter((item) => item.patient_id === consultorioPatientId);
}

function getConsultorioScopedGrooming() {
  if (!isConsultorioPatientProfileActive()) {
    return state.grooming_documents;
  }
  return state.grooming_documents.filter((item) => item.patient_id === consultorioPatientId);
}

function getConsultorioProfileCount(option) {
  if (!option || !consultorioPatientId) {
    return 0;
  }
  if (option.value === "records") {
    return getConsultorioScopedRecords().length;
  }
  if (option.value === "consents") {
    return getConsultorioScopedConsents().length;
  }
  if (option.value === "grooming") {
    return getConsultorioScopedGrooming().length;
  }
  return getConsultorioScopedConsultations(option.consultationTypes).length;
}

function getConsultorioPrimaryRecord() {
  return getConsultorioScopedRecords()
    .slice()
    .sort((left, right) => String(right.opened_at || "").localeCompare(String(left.opened_at || "")))[0] || null;
}

function buildConsultorioDraftRecordPayload(patient, consultationPayload = {}) {
  const consultationAt = consultationPayload.consultation_at || new Date().toISOString();
  const examGeneralSummary = buildConsultorioExamGeneralSummary(consultationPayload);
  const examSpecialSummary = buildConsultorioExamSpecialSummary(consultationPayload);
  return {
    patient_id: patient.id,
    opened_at: consultationAt,
    reason_for_consultation: consultationPayload.title || "Consulta general",
    anamnesis: consultationPayload.subjective || "",
    physical_exam_summary: buildConsultorioStructuredText([
      ["Objetivo", consultationPayload.objective],
      ["Examen general", examGeneralSummary],
      ["Examen especial", examSpecialSummary],
    ]),
    presumptive_diagnosis: consultationPayload.interpretation || "",
    procedures_plan: buildConsultorioStructuredText([
      ["Plan terapeutico", consultationPayload.therapeutic_plan],
      ["Plan diagnostico", consultationPayload.diagnostic_plan],
    ]),
    recommendations: consultationPayload.next_control
      ? `Proximo control: ${consultationPayload.next_control}`
      : "",
    attachments_summary: String(consultationPayload.attachments_summary || "").trim(),
    consent_required: false,
    consent_summary: "",
    professional_name:
      consultationPayload.professional_name || getDefaultConsultorioProfessionalName(),
    professional_license:
      consultationPayload.professional_license || getDefaultConsultorioProfessionalLicense(),
  };
}

const CONSULTORIO_EXAM_GENERAL_FIELDS = [
  ["Temperatura", "exam_general_temperature"],
  ["U.Temperatura", "exam_general_temperature_unit"],
  ["Peso", "exam_general_weight"],
  ["U.Peso", "exam_general_weight_unit"],
  ["ICC", "exam_general_icc"],
  ["TTLC", "exam_general_ttlc"],
  ["Frecuencia cardiaca", "exam_general_heart_rate"],
  ["Frecuencia respiratoria", "exam_general_respiratory_rate"],
  ["Reflejos", "exam_general_reflexes"],
  ["Pulso", "exam_general_pulse"],
  ["Saturacion", "exam_general_saturation"],
  ["Presion arterial", "exam_general_blood_pressure"],
  ["Mucosas", "exam_general_mucosa"],
  ["Glicemia", "exam_general_glucose"],
  ["Palpacion", "exam_general_palpation"],
  ["Turgencia", "exam_general_turgency"],
  ["Observaciones", "exam_general_observations"],
];

const CONSULTORIO_EXAM_GENERAL_LABELS = CONSULTORIO_EXAM_GENERAL_FIELDS.reduce((acc, [label, key]) => {
  acc[label.toLowerCase()] = key;
  return acc;
}, {});

const CONSULTORIO_EXAM_SPECIAL_FIELDS = [
  ["Actitud", "exam_special_attitude"],
  ["Hidratacion", "exam_special_hydration"],
  ["Estado nutricional", "exam_special_nutritional_status"],
  ["Ganglios linfaticos", "exam_special_lymph_nodes"],
  ["Mucosas", "exam_special_mucosa"],
  ["Sistema cardiovascular", "exam_special_cardiovascular"],
  ["Sistema respiratorio", "exam_special_respiratory"],
  ["Sistema digestivo", "exam_special_digestive"],
  ["Sistema urinario", "exam_special_urinary"],
  ["Sistema reproductivo", "exam_special_reproductive"],
  ["Sistema musculoesqueletico", "exam_special_musculoskeletal"],
  ["Sistema nervioso", "exam_special_nervous"],
  ["Piel y anexos", "exam_special_skin_appendages"],
  ["Ojos", "exam_special_eyes"],
  ["Oidos", "exam_special_ears"],
];

const CONSULTORIO_EXAM_SPECIAL_LABELS = CONSULTORIO_EXAM_SPECIAL_FIELDS.reduce((acc, [label, key]) => {
  acc[label.toLowerCase()] = key;
  return acc;
}, {});

function normalizeConsultorioSummaryValue(value) {
  return String(value || "")
    .trim()
    .replace(/\s*[\r\n]+\s*/g, " / ")
    .replace(/\s*;\s*/g, ", ");
}

function buildConsultorioExamGeneralSummary(payload = {}) {
  return CONSULTORIO_EXAM_GENERAL_FIELDS.map(([label, key]) => [
    label,
    normalizeConsultorioSummaryValue(payload[key]),
  ])
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("; ");
}

function buildConsultorioExamSpecialSummary(payload = {}) {
  return CONSULTORIO_EXAM_SPECIAL_FIELDS.map(([label, key]) => [
    label,
    normalizeConsultorioSummaryValue(payload[key]),
  ])
    .filter(([, value]) => value && value !== "No evaluado")
    .map(([label, value]) => `${label}: ${value}`)
    .join("; ");
}

function parseConsultorioExamGeneralSummary(value) {
  const result = Object.fromEntries(
    CONSULTORIO_EXAM_GENERAL_FIELDS.map(([, key]) => [key, ""])
  );
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return result;
  }
  let matchedAny = false;
  rawValue
    .split(/\s*;\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      const separator = segment.indexOf(":");
      if (separator === -1) {
        return;
      }
      const rawLabel = segment.slice(0, separator).trim().toLowerCase();
      const mappedKey = CONSULTORIO_EXAM_GENERAL_LABELS[rawLabel];
      if (!mappedKey) {
        return;
      }
      result[mappedKey] = segment.slice(separator + 1).trim();
      matchedAny = true;
    });
  if (!matchedAny) {
    result.exam_general_observations = rawValue;
  }
  return result;
}

function parseConsultorioExamSpecialSummary(value) {
  const result = Object.fromEntries(
    CONSULTORIO_EXAM_SPECIAL_FIELDS.map(([, key]) => [key, "No evaluado"])
  );
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return result;
  }
  rawValue
    .split(/\s*;\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      const separator = segment.indexOf(":");
      if (separator === -1) {
        return;
      }
      const rawLabel = segment.slice(0, separator).trim().toLowerCase();
      const mappedKey = CONSULTORIO_EXAM_SPECIAL_LABELS[rawLabel];
      if (!mappedKey) {
        return;
      }
      result[mappedKey] = segment.slice(separator + 1).trim() || "No evaluado";
    });
  return result;
}

function buildConsultorioStructuredText(entries) {
  return entries
    .map(([label, value]) => [label, String(value || "").trim()])
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

function parseConsultorioStructuredText(value, labels) {
  const lines = String(value || "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const result = Object.fromEntries(Object.values(labels).map((key) => [key, ""]));
  lines.forEach((line) => {
    const separator = line.indexOf(":");
    if (separator === -1) {
      return;
    }
    const rawLabel = line.slice(0, separator).trim().toLowerCase();
    const mappedKey = labels[rawLabel];
    if (mappedKey) {
      result[mappedKey] = line.slice(separator + 1).trim();
    }
  });
  return result;
}

function parseConsultorioConsultationDetails(consultation) {
  const summary = parseConsultorioStructuredText(consultation?.summary || "", {
    subjetivo: "subjective",
    objetivo: "objective",
    "examen general": "examGeneral",
    "examen especial": "examSpecial",
  });
  const indications = parseConsultorioStructuredText(consultation?.indications || "", {
    interpretacion: "interpretation",
    "plan terapeutico": "therapeuticPlan",
    "plan diagnostico": "diagnosticPlan",
    "proximo control": "nextControl",
  });
  const examGeneral = parseConsultorioExamGeneralSummary(summary.examGeneral || "");
  const examSpecial = parseConsultorioExamSpecialSummary(summary.examSpecial || "");
  return {
    subjective: summary.subjective || "",
    objective: summary.objective || "",
    examGeneral: examGeneral,
    examGeneralSummary: summary.examGeneral || "",
    examSpecial: examSpecial,
    examSpecialSummary: summary.examSpecial || "",
    interpretation: indications.interpretation || "",
    therapeuticPlan: indications.therapeuticPlan || "",
    diagnosticPlan: indications.diagnosticPlan || "",
    nextControl: indications.nextControl || "",
  };
}

function parseConsultorioVaccinationDetails(consultation) {
  const summary = parseConsultorioStructuredText(consultation?.summary || "", {
    vacuna: "name",
    laboratorio: "laboratory",
    lote: "lot",
    observaciones: "observations",
  });
  const indications = parseConsultorioStructuredText(consultation?.indications || "", {
    "proxima vacunacion": "nextVaccination",
    "proximo control": "nextControl",
  });
  return {
    vaccinationDate: normalizeDateFieldValue(consultation?.consultation_at),
    name: consultation?.title || summary.name || "",
    laboratory: summary.laboratory || "",
    lot: summary.lot || "",
    observations: summary.observations || "",
    nextVaccination: indications.nextVaccination || indications.nextControl || "",
  };
}

function parseConsultorioDewormingDetails(consultation) {
  const summary = parseConsultorioStructuredText(consultation?.summary || "", {
    tipo: "type",
    producto: "product",
    dosis: "dose",
    observaciones: "observations",
  });
  const indications = parseConsultorioStructuredText(consultation?.indications || "", {
    "ultima desparasitacion": "lastDeworming",
    "proximo control": "nextControl",
  });
  const genericDetails = parseConsultorioConsultationDetails(consultation);
  return {
    dewormingDate: normalizeDateFieldValue(consultation?.consultation_at),
    lastDeworming: normalizeDateFieldValue(indications.lastDeworming || ""),
    type: summary.type || "",
    product: summary.product || consultation?.title || "",
    dose: summary.dose || "",
    observations: summary.observations || genericDetails.subjective || "",
    nextControl: normalizeDateFieldValue(indications.nextControl || genericDetails.nextControl || ""),
  };
}

function parseConsultorioHospAmbDetails(consultation) {
  const summary = parseConsultorioStructuredText(consultation?.summary || "", {
    razon: "reason",
    observaciones: "observations",
  });
  const indications = parseConsultorioStructuredText(consultation?.indications || "", {
    "motivo de salida": "dischargeReason",
    "fecha de salida": "dischargeAt",
  });
  const genericDetails = parseConsultorioConsultationDetails(consultation);
  let stored = null;
  const rawReference = String(consultation?.document_reference || "").trim();
  if (rawReference.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawReference);
      if (parsed && parsed.kind === "hospamb") {
        stored = parsed;
      }
    } catch (error) {
      stored = null;
    }
  }
  return {
    type:
      String(stored?.type || "").trim() ||
      String(consultation?.consultation_type || "").trim() ||
      "Hospitalizacion",
    admissionAt: toInputDateTime(consultation?.consultation_at || ""),
    reason:
      String(stored?.reason || "").trim() ||
      summary.reason ||
      String(consultation?.title || "").trim() ||
      genericDetails.subjective ||
      genericDetails.objective ||
      String(consultation?.summary || "").trim(),
    observations:
      String(stored?.observations || "").trim() ||
      summary.observations ||
      genericDetails.objective ||
      genericDetails.interpretation ||
      "",
    dischargeReason: String(stored?.dischargeReason || "").trim() || indications.dischargeReason || "",
    dischargeAt: toInputDateTime(String(stored?.dischargeAt || "").trim() || indications.dischargeAt || ""),
  };
}

function createConsultorioFormulaMedication(item = {}) {
  return {
    name: String(item.name || "").trim(),
    presentation: String(item.presentation || "").trim(),
    quantity: String(item.quantity || "1").trim() || "1",
    dosage: String(item.dosage || item.posology || "").trim(),
  };
}

function hasConsultorioFormulaMedicationContent(item = {}) {
  const normalized = createConsultorioFormulaMedication(item);
  return Boolean(
    normalized.name ||
      normalized.presentation ||
      normalized.dosage ||
      (normalized.quantity && normalized.quantity !== "1")
  );
}

function buildConsultorioFormulaMedicationPreview(medications = []) {
  return (Array.isArray(medications) ? medications : [])
    .map((item) => createConsultorioFormulaMedication(item))
    .filter((item) => hasConsultorioFormulaMedicationContent(item))
    .map((item) =>
      [
        item.name,
        item.presentation ? `(${item.presentation})` : "",
        item.quantity ? `x${item.quantity}` : "",
        item.dosage ? `- ${item.dosage}` : "",
      ]
        .filter(Boolean)
        .join(" ")
    )
    .join(" | ");
}

function parseConsultorioFormulaDetails(consultation) {
  const summary = parseConsultorioStructuredText(consultation?.summary || "", {
    diagnostico: "diagnosis",
    medicamentos: "medications",
    observaciones: "observations",
  });
  const genericDetails = parseConsultorioConsultationDetails(consultation);
  let stored = null;
  const rawReference = String(consultation?.document_reference || "").trim();
  if (rawReference.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawReference);
      if (parsed && parsed.kind === "formula") {
        stored = parsed;
      }
    } catch (error) {
      stored = null;
    }
  }
  const storedMedications = Array.isArray(stored?.medications)
    ? stored.medications.map((item) => createConsultorioFormulaMedication(item))
    : [];
  const fallbackMedications = genericDetails.therapeuticPlan
    ? [
        createConsultorioFormulaMedication({
          name: consultation?.title || "Medicamento",
          dosage: genericDetails.therapeuticPlan,
        }),
      ]
    : [];
  return {
    formulaDate: normalizeDateFieldValue(consultation?.consultation_at),
    diagnosis:
      String(stored?.diagnosis || "").trim() ||
      summary.diagnosis ||
      genericDetails.interpretation ||
      "",
    observations:
      String(stored?.observations || "").trim() ||
      summary.observations ||
      genericDetails.subjective ||
      "",
    medications:
      storedMedications.length
        ? storedMedications
        : fallbackMedications.length
        ? fallbackMedications
        : [],
  };
}

function buildConsultorioVaccinationSummary(payload) {
  return buildConsultorioStructuredText([
    ["Vacuna", payload.title],
    ["Laboratorio", payload.vaccination_lab],
    ["Lote", payload.vaccination_lot],
    ["Observaciones", payload.vaccination_notes],
  ]);
}

function buildConsultorioVaccinationIndications(payload) {
  return buildConsultorioStructuredText([
    ["Proxima vacunacion", payload.vaccination_next_control],
    ["Proximo control", payload.next_control],
  ]);
}

function buildConsultorioDewormingSummary(payload) {
  return buildConsultorioStructuredText([
    ["Tipo", payload.deworming_type],
    ["Producto", payload.deworming_product],
    ["Dosis", payload.deworming_dose],
    ["Observaciones", payload.deworming_notes],
  ]);
}

function buildConsultorioDewormingIndications(payload) {
  return buildConsultorioStructuredText([
    ["Ultima desparasitacion", payload.deworming_last_date],
    ["Proximo control", payload.deworming_next_control],
  ]);
}

function buildConsultorioHospAmbSummary(payload) {
  return buildConsultorioStructuredText([
    ["Raz\u00f3n", payload.hospamb_reason],
    ["Observaciones", payload.hospamb_observations],
  ]);
}

function buildConsultorioHospAmbIndications(payload) {
  return buildConsultorioStructuredText([
    ["Motivo de salida", payload.hospamb_discharge_reason],
    ["Fecha de salida", payload.hospamb_discharge_at],
  ]);
}

function buildConsultorioFormulaSummary(payload) {
  return buildConsultorioStructuredText([
    ["Diagnostico", payload.formula_diagnosis],
    ["Medicamentos", buildConsultorioFormulaMedicationPreview(payload.formula_medications)],
    ["Observaciones", payload.formula_observations],
  ]);
}

function buildConsultorioFormulaIndications(payload) {
  return buildConsultorioStructuredText([
    ["Medicamentos", buildConsultorioFormulaMedicationPreview(payload.formula_medications)],
  ]);
}

function formatConsultorioWeightBadge(patient) {
  const weight = Number(patient?.weight_kg);
  if (!Number.isFinite(weight) || weight <= 0) {
    return "";
  }
  return `Peso: ${weight.toLocaleString("es-CO", {
    minimumFractionDigits: weight % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  })} Kilogramos`;
}

function getConsultorioConsultationExamLabel(consultation) {
  const details = parseConsultorioConsultationDetails(consultation);
  return (
    details.objective ||
    details.examGeneral.exam_general_observations ||
    details.examGeneral.exam_general_temperature ||
    details.examGeneralSummary ||
    truncate(consultation?.summary || "Sin examen registrado", 72)
  );
}

function getConsultorioConsultationDiagnosisLabel(consultation) {
  const details = parseConsultorioConsultationDetails(consultation);
  return (
    details.interpretation ||
    details.therapeuticPlan ||
    truncate(consultation?.indications || "Sin diagnostico registrado", 88)
  );
}

function getConsultorioFormulaDiagnosisLabel(consultation) {
  const details = parseConsultorioFormulaDetails(consultation);
  return details.diagnosis || truncate(consultation?.summary || "Sin diagnostico registrado", 96);
}

function getConsultorioFormulaMedicationLabel(consultation) {
  const details = parseConsultorioFormulaDetails(consultation);
  return (
    buildConsultorioFormulaMedicationPreview(details.medications) ||
    truncate(consultation?.indications || consultation?.summary || "Sin medicamentos registrados", 112)
  );
}

function getDefaultConsultorioProfessionalName() {
  return authState.currentUser?.full_name || state.settings?.clinic_name || "Lativet";
}

function getDefaultConsultorioProfessionalLicense() {
  return state.settings?.clinic_registration || authState.currentUser?.role || "No registrada";
}

function getConsultorioVisiblePanels() {
  const subsection = getSubsectionOption("consultorio")?.value || "patients";
  if (subsection === "grooming") {
    return new Set(["consultorioGroomingFormPanel", "consultorioGroomingPanel"]);
  }
  return new Set(["consultorioOwnersPanel", "consultorioOwnerDetailPanel"]);
}

function setConsultorioProfileView(value) {
  if (!CONSULTORIO_PROFILE_VIEW_MAP[value]) {
    return;
  }
  consultorioProfileView = value;
  applySectionSubsection("consultorio");
  const targetSectionId = isConsultorioPatientProfileActive()
    ? CONSULTORIO_PATIENT_PROFILE_SECTION_ID
    : "consultorio";
  renderSection(targetSectionId);
  saveAppViewState();
  if (bootstrapReadyForSectionLoads) {
    ensureSectionData(targetSectionId);
  }
}

function openConsultorioPatientProfile(patient) {
  if (!patient) {
    return;
  }
  consultorioPatientId = patient.id;
  consultorioOwnerId = patient.owner_id || consultorioOwnerId;
  consultorioPatientProfileOpen = true;
  consultorioProfileView = consultorioProfileView || "records";
  setSectionSubsection("consultorio", "patients");
  setActiveSection(CONSULTORIO_PATIENT_PROFILE_SECTION_ID);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeConsultorioPatientProfile(options = {}) {
  const { preservePatient = false } = options;
  closePatientConsultationModal();
  consultorioPatientProfileOpen = false;
  if (!preservePatient) {
    consultorioPatientId = "";
    consultorioProfileView = "records";
  }
  setSectionSubsection("consultorio", "patients");
  setActiveSection("consultorio");
}

function renderOwners() {
  const owners = filterOwners();
  if (!elements.ownersList) {
    return;
  }
  if (!owners.length) {
    elements.ownersList.innerHTML = emptyState("Aun no hay propietarios registrados.");
    return;
  }
  elements.ownersList.innerHTML = `
    <div class="table-wrapper owners-table-wrapper">
      <table class="data-table owners-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Identificador</th>
            <th>Telefono</th>
            <th>Mascotas</th>
            <th>Ultima gestion</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${owners
            .map((owner) => {
              const patients = getOwnerPatients(owner.id);
              const latestActivity = getOwnerLatestActivity(owner.id);
              return `
                <tr class="owner-table-row${owner.id === consultorioOwnerId ? " is-selected" : ""}" data-owner-select="${escapeHtml(
                  owner.id
                )}">
                  <td>
                    <div class="owner-table-name">
                      <span class="owner-table-avatar">${escapeHtml(getOwnerInitials(owner))}</span>
                      <div>
                        <strong>${escapeHtml(owner.full_name)}</strong>
                        <span>${escapeHtml(owner.email || "Sin correo")}</span>
                        <span>Creado: ${owner.created_at ? escapeHtml(formatDateTime(owner.created_at)) : "Sin fecha"}</span>
                      </div>
                    </div>
                  </td>
                  <td>${escapeHtml(owner.identification_number || "Sin dato")}</td>
                  <td>
                    <div class="owner-table-phone">
                      <span>${escapeHtml(owner.phone || "Sin dato")}</span>
                      ${
                        owner.alternate_phone
                          ? `<span>${escapeHtml(owner.alternate_phone)}</span>`
                          : ""
                      }
                    </div>
                  </td>
                  <td>
                    <div class="owner-pets-list">
                      ${
                        patients.length
                          ? patients
                              .map(
                                (patient) => `
                                  <button class="owner-pet-chip" type="button" data-patient-select="${escapeHtml(
                                    patient.id
                                  )}">
                                    <strong>${escapeHtml(patient.name)}</strong>
                                    <span>${escapeHtml(patient.sex || patient.species || "Mascota")}</span>
                                  </button>
                                `
                              )
                              .join("")
                          : `<span class="owner-pets-empty">Sin mascotas registradas</span>`
                      }
                    </div>
                  </td>
                  <td>
                    ${
                      latestActivity
                        ? `
                            <div class="owner-last-activity">
                              <strong>${escapeHtml(formatDateTime(latestActivity.at))}</strong>
                              <span>${escapeHtml(latestActivity.patientName || "Paciente")} · ${escapeHtml(
                            latestActivity.label
                          )}</span>
                            </div>
                          `
                        : `<span class="owner-pets-empty">Sin actividad</span>`
                    }
                  </td>
                  <td>
                    <div class="table-actions owner-table-actions">
                      <button class="ghost-button" type="button" data-owner-select="${escapeHtml(owner.id)}">Ver</button>
                      <button class="secondary-button" type="button" data-owner-edit="${escapeHtml(owner.id)}">Editar</button>
                      <button class="ghost-button ghost-button--danger" type="button" data-owner-delete="${escapeHtml(owner.id)}">Eliminar</button>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPatients() {
  if (!elements.patientsList) {
    return;
  }
  const owner = getConsultorioOwner();
  const patients = getFilteredConsultorioPatients();
  const emptyMessage = owner
    ? "Este propietario aun no tiene mascotas registradas."
    : "Selecciona un propietario para ver sus mascotas.";
  if (!patients.length) {
    elements.patientsList.innerHTML = emptyState(
      owner && consultorioPatientsFilters.query
        ? "No hay mascotas que coincidan con el filtro."
        : emptyMessage
    );
    return;
  }
  elements.patientsList.innerHTML = `
    <div class="table-wrapper owner-patients-table-wrapper">
      <table class="data-table owner-patients-table">
        <thead>
          <tr>
            <th>Perfil</th>
            <th>Nombre</th>
            <th>Especie</th>
            <th>Raza</th>
            <th>Genero</th>
            <th>E. reproductivo</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${patients
            .map(
              (patient) => `
                <tr class="${patient.id === consultorioPatientId ? "is-selected" : ""}">
                  <td>
                    <button class="ghost-button owner-patients-table__profile" type="button" data-patient-select="${escapeHtml(
                      patient.id
                    )}">
                      Perfil clinico
                    </button>
                  </td>
                  <td>
                    <div class="owner-patients-table__name">
                      <button class="owner-patients-table__link" type="button" data-patient-select="${escapeHtml(
                        patient.id
                      )}">
                        ${escapeHtml(patient.name || "Sin nombre")}
                      </button>
                      <span>${escapeHtml(patient.notes || "Sin notas")}</span>
                    </div>
                  </td>
                  <td>${escapeHtml(patient.species || "Sin dato")}</td>
                  <td>${escapeHtml(patient.breed || "Sin dato")}</td>
                  <td>${escapeHtml(patient.sex || "Sin dato")}</td>
                  <td>${escapeHtml(patient.reproductive_status || "Sin dato")}</td>
                  <td>
                    <div class="table-actions owner-patients-table__actions">
                      <button class="secondary-button" type="button" data-patient-edit="${escapeHtml(
                        patient.id
                      )}">Editar</button>
                      <button class="ghost-button ghost-button--danger" type="button" data-patient-delete="${escapeHtml(
                        patient.id
                      )}">Eliminar</button>
                    </div>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function buildConsultorioProfileOverviewMarkup({
  owner,
  patient,
  ownerPatients,
  patientFacts,
  profileConfig,
}) {
  return `
    <div class="consultorio-profile-strip">
      <article class="consultorio-profile-shell consultorio-profile-owner-card">
        <header>
          <span class="consultorio-profile-shell__eyebrow">Propietario</span>
          <h4>${escapeHtml(owner?.full_name || patient?.owner_name || "Sin propietario")}</h4>
        </header>
        <dl class="consultorio-profile-owner-data">
          <div>
            <dt>Identificacion</dt>
            <dd>${escapeHtml(
              owner
                ? [owner.identification_type, owner.identification_number].filter(Boolean).join(" ")
                : "Sin dato"
            )}</dd>
          </div>
          <div>
            <dt>Telefonos</dt>
            <dd>${escapeHtml([owner?.phone, owner?.alternate_phone].filter(Boolean).join(" / ") || "Sin dato")}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>${escapeHtml(owner?.email || "Sin dato")}</dd>
          </div>
          <div>
            <dt>Direccion</dt>
            <dd>${escapeHtml(owner?.address || "Sin dato")}</dd>
          </div>
        </dl>
      </article>

      <article class="consultorio-profile-shell consultorio-profile-pets-card">
        <header>
          <span class="consultorio-profile-shell__eyebrow">Mascotas</span>
          <h4>Mascotas del propietario</h4>
        </header>
        <div class="consultorio-profile-pet-switch">
          ${ownerPatients
            .map(
              (item) => `
                <button
                  class="consultorio-profile-pet-switch__item${item.id === patient?.id ? " is-active" : ""}"
                  type="button"
                  data-patient-select="${escapeHtml(item.id)}"
                >
                  <strong>${escapeHtml(item.name || "Mascota")}</strong>
                  <span>${escapeHtml(item.species || "Paciente")}${item.breed ? ` / ${escapeHtml(item.breed)}` : ""}</span>
                </button>
              `
            )
            .join("")}
        </div>
      </article>
    </div>

    <article class="consultorio-profile-shell consultorio-profile-patient-sheet">
      <div class="consultorio-profile-patient-sheet__header">
        <div class="consultorio-profile-patient-sheet__identity">
          <span class="consultorio-profile-avatar">${escapeHtml(getPatientInitials(patient))}</span>
          <div>
            <span class="consultorio-profile-shell__eyebrow">Datos generales</span>
            <h4>${escapeHtml(patient?.name || "Paciente")}</h4>
            <p>${escapeHtml(profileConfig?.label || "Historia clinica")}</p>
          </div>
        </div>
        <div class="consultorio-profile-patient-sheet__chips">
          <span class="consultorio-profile-chip">${escapeHtml(patient?.species || "Sin especie")}</span>
          <span class="consultorio-profile-chip">${escapeHtml(patient?.sex || "Sin genero")}</span>
          <span class="consultorio-profile-chip">${escapeHtml(
            patient?.reproductive_status || "Sin estado reproductivo"
          )}</span>
        </div>
      </div>
      <dl class="consultorio-profile-facts">
        ${patientFacts
          .map(
            ([label, value]) => `
              <div>
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(value)}</dd>
              </div>
            `
          )
          .join("")}
      </dl>
    </article>
  `;
}

function buildConsultorioProfileTimelineMarkup(profileConfig, timelineItems) {
  return `
    <article class="consultorio-profile-shell consultorio-profile-timeline-shell">
      <div class="consultorio-profile-timeline-shell__header">
        <div>
          <span class="consultorio-profile-shell__eyebrow">Expediente</span>
          <h4>${escapeHtml(profileConfig?.label || "Historia clinica")}</h4>
        </div>
        <span class="consultorio-profile-chip">${timelineItems.length} registros</span>
      </div>
      ${
        timelineItems.length
          ? `
            <div class="consultorio-profile-timeline">
              ${timelineItems
                .map(
                  (item) => `
                    <article class="consultorio-profile-timeline__item">
                      <div class="consultorio-profile-timeline__rail">
                        <span class="consultorio-profile-timeline__dot"></span>
                      </div>
                      <div class="consultorio-profile-timeline__content">
                        <header>
                          <div>
                            <strong>${escapeHtml(item.title)}</strong>
                            <span>${escapeHtml(item.typeLabel)} | ${escapeHtml(formatDateTime(item.at))}</span>
                          </div>
                          <span class="${escapeHtml(item.tone)}">${escapeHtml(item.typeLabel)}</span>
                        </header>
                        <div class="consultorio-profile-timeline__details">
                          ${item.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
                        </div>
                        ${
                          item.attachments?.length
                            ? `
                              <div class="consultorio-profile-timeline__attachments">
                                <span>Adjuntos</span>
                                ${buildConsultorioAttachmentPreviewMarkup(item.attachments)}
                              </div>
                            `
                            : ""
                        }
                      </div>
                    </article>
                  `
                )
                .join("")}
            </div>
          `
          : emptyState("Este paciente aun no tiene registros en esta seccion.")
      }
    </article>
  `;
}

function buildConsultorioConsultationsWorkspace(patient, profileConfig) {
  const consultations = getConsultorioScopedConsultations(profileConfig?.consultationTypes || null);
  const rows = consultations.length
    ? `
      <div class="table-wrapper consultorio-consultations-table-wrapper">
        <table class="data-table consultorio-consultations-table">
          <thead>
            <tr>
              <th>Opc.</th>
              <th>Fecha</th>
              <th>Motivo</th>
              <th>Examen</th>
              <th>Diagnostico</th>
              <th>Imagenes/Fotos/Adjuntos</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            ${consultations
              .map(
                (consultation) => `
                  <tr>
                    <td>
                      <div class="table-actions consultorio-consultations-table__actions">
                        <button
                          class="ghost-button"
                          type="button"
                          data-edit-patient-consultation="${escapeHtml(consultation.id)}"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                    <td>${escapeHtml(formatDateTime(consultation.consultation_at))}</td>
                    <td>${escapeHtml(consultation.title || "Consulta")}</td>
                    <td>${escapeHtml(getConsultorioConsultationExamLabel(consultation))}</td>
                    <td>${escapeHtml(getConsultorioConsultationDiagnosisLabel(consultation))}</td>
                    <td>${buildConsultorioAttachmentPreviewMarkup(
                      parseConsultorioAttachments(consultation.attachments_summary || ""),
                      { compact: true }
                    )}</td>
                    <td>${escapeHtml(consultation.professional_name || "Sin usuario")}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : emptyState("Este paciente aun no tiene consultas registradas.");
  return `
    <article class="consultorio-profile-shell consultorio-consultations-shell">
      <div class="consultorio-profile-table-toolbar">
        <div>
          <span class="consultorio-profile-shell__eyebrow">Consultas</span>
          <h4>Consultas de ${escapeHtml(patient?.name || "Paciente")}</h4>
          <p class="meta-copy">Registra, edita y consulta el historial de atenciones de esta mascota.</p>
        </div>
        <div class="form-actions">
          <button
            class="primary-button"
            type="button"
            data-open-patient-consultation-modal="true"
          >
            Registrar consulta
          </button>
        </div>
      </div>
      ${rows}
    </article>
  `;
}

function buildConsultorioVaccinationsWorkspace(patient, profileConfig) {
  const vaccinations = getConsultorioScopedConsultations(profileConfig?.consultationTypes || null);
  const content = vaccinations.length
    ? `
      <div class="table-wrapper consultorio-consultations-table-wrapper consultorio-vaccinations-table-wrapper">
        <table class="data-table consultorio-consultations-table consultorio-vaccinations-table">
          <thead>
            <tr>
              <th>Opc.</th>
              <th>Fecha</th>
              <th>Vacuna</th>
              <th>Detalle</th>
              <th>Proximo refuerzo</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            ${vaccinations
              .map((consultation) => {
                const details = parseConsultorioVaccinationDetails(consultation);
                const detailParts = [
                  details.laboratory ? `Laboratorio: ${details.laboratory}` : "",
                  details.lot ? `Lote: ${details.lot}` : "",
                  details.observations ? truncate(details.observations, 88) : "",
                ].filter(Boolean);
                return `
                  <tr>
                    <td>
                      <div class="table-actions consultorio-consultations-table__actions">
                        <button
                          class="ghost-button"
                          type="button"
                          data-edit-patient-consultation="${escapeHtml(consultation.id)}"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                    <td>${escapeHtml(formatDateTime(details.vaccinationDate || consultation.consultation_at))}</td>
                    <td>${escapeHtml(details.name || consultation.title || "Vacunacion")}</td>
                    <td>${escapeHtml(detailParts.join(" | ") || "Sin detalle registrado.")}</td>
                    <td>${escapeHtml(formatDateTime(details.nextVaccination || ""))}</td>
                    <td>${escapeHtml(consultation.professional_name || "Sin usuario")}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : `
      <div class="consultorio-module-empty consultorio-module-empty--vaccinations">
        <span class="consultorio-module-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 4l5 5"></path>
            <path d="M14 5l5 5"></path>
            <path d="M11 8l5 5"></path>
            <path d="M7 12l5 5"></path>
            <path d="M5 14l5 5"></path>
            <path d="M4 20l3-3"></path>
            <path d="M2 22l3-3"></path>
          </svg>
        </span>
        <strong>No hay registros de vacunacion</strong>
      </div>
    `;
  return `
    <article class="consultorio-profile-shell consultorio-vaccinations-shell">
      <div class="consultorio-profile-table-toolbar">
        <div>
          <span class="consultorio-profile-shell__eyebrow">Vacunaciones</span>
          <h4>Vacunaciones de ${escapeHtml(patient?.name || "Paciente")}</h4>
        </div>
        <div class="form-actions">
          <button
            class="primary-button"
            type="button"
            data-open-patient-consultation-modal="true"
            data-consultation-profile-view="vacunacion"
          >
            Registrar vacunacion
          </button>
        </div>
      </div>
      ${content}
    </article>
  `;
}

function buildConsultorioFormulasWorkspace(patient, profileConfig) {
  const formulas = getConsultorioScopedConsultations(profileConfig?.consultationTypes || null);
  const content = formulas.length
    ? `
      <div class="table-wrapper consultorio-consultations-table-wrapper consultorio-formulas-table-wrapper">
        <table class="data-table consultorio-consultations-table consultorio-formulas-table">
          <thead>
            <tr>
              <th>Opc.</th>
              <th>Fecha formula</th>
              <th>Diagnostico presuntivo y/o final</th>
              <th>Medicamentos</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            ${formulas
              .map(
                (consultation) => `
                  <tr>
                    <td>
                      <div class="table-actions consultorio-consultations-table__actions">
                        <button
                          class="ghost-button"
                          type="button"
                          data-edit-patient-consultation="${escapeHtml(consultation.id)}"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                    <td>${escapeHtml(normalizeDateFieldValue(consultation.consultation_at) || "Sin fecha")}</td>
                    <td>${escapeHtml(getConsultorioFormulaDiagnosisLabel(consultation))}</td>
                    <td>${escapeHtml(getConsultorioFormulaMedicationLabel(consultation))}</td>
                    <td>${escapeHtml(consultation.professional_name || "Sin usuario")}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : `
      <div class="consultorio-module-empty consultorio-module-empty--formulas">
        <span class="consultorio-module-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 17A2.5 2.5 0 0 0 4 14.5V4.5A2.5 2.5 0 0 1 6.5 2H20v15"></path>
            <path d="M8 7h8"></path>
            <path d="M8 11h8"></path>
            <path d="M8 15h5"></path>
          </svg>
        </span>
        <strong>No hay formulas medicas registradas</strong>
      </div>
    `;
  return `
    <article class="consultorio-profile-shell consultorio-formulas-shell">
      <div class="consultorio-profile-table-toolbar">
        <div>
          <span class="consultorio-profile-shell__eyebrow">Formulas medicas</span>
          <h4>Formulas medicas de ${escapeHtml(patient?.name || "Paciente")}</h4>
        </div>
        <div class="form-actions">
          <button
            class="primary-button"
            type="button"
            data-open-patient-consultation-modal="true"
            data-consultation-profile-view="formula"
          >
            Registrar formula medica
          </button>
        </div>
      </div>
      ${content}
    </article>
  `;
}

function buildConsultorioDewormingWorkspace(patient, profileConfig) {
  const dewormingEntries = getConsultorioScopedConsultations(profileConfig?.consultationTypes || null);
  const content = dewormingEntries.length
    ? `
      <div class="table-wrapper consultorio-consultations-table-wrapper consultorio-deworming-table-wrapper">
        <table class="data-table consultorio-consultations-table consultorio-deworming-table">
          <thead>
            <tr>
              <th>Opc.</th>
              <th>Fecha</th>
              <th>Desparasitante</th>
              <th>Detalle</th>
              <th>Proximo control</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            ${dewormingEntries
              .map((consultation) => {
                const details = parseConsultorioDewormingDetails(consultation);
                const detailLabel = truncate(
                  [
                    details.type ? `Tipo: ${details.type}` : "",
                    details.dose ? `Dosis: ${details.dose}` : "",
                    details.observations ? details.observations : "",
                  ]
                    .filter(Boolean)
                    .join(" | ") || "Sin detalle registrado.",
                  112
                );
                return `
                  <tr>
                    <td>
                      <div class="table-actions consultorio-consultations-table__actions">
                        <button
                          class="ghost-button"
                          type="button"
                          data-edit-patient-consultation="${escapeHtml(consultation.id)}"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                    <td>${escapeHtml(formatDateTime(consultation.consultation_at))}</td>
                    <td>${escapeHtml(details.product || consultation.title || "Desparasitacion")}</td>
                    <td>${escapeHtml(detailLabel)}</td>
                    <td>${escapeHtml(formatDateTime(details.nextControl || ""))}</td>
                    <td>${escapeHtml(consultation.professional_name || "Sin usuario")}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : `
      <div class="consultorio-module-empty consultorio-module-empty--deworming">
        <span class="consultorio-module-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 3h6"></path>
            <path d="M10 3v3"></path>
            <path d="M14 3v3"></path>
            <path d="M7 8a5 5 0 0 1 10 0v4a5 5 0 0 1-10 0V8Z"></path>
            <path d="M3 10h4"></path>
            <path d="M17 10h4"></path>
            <path d="M4 16l3-2"></path>
            <path d="M20 16l-3-2"></path>
            <path d="M9 19v2"></path>
            <path d="M15 19v2"></path>
          </svg>
        </span>
        <strong>No hay registros de desparasitacion</strong>
      </div>
    `;
  return `
    <article class="consultorio-profile-shell consultorio-deworming-shell">
      <div class="consultorio-profile-table-toolbar">
        <div>
          <span class="consultorio-profile-shell__eyebrow">Desparasitaciones</span>
          <h4>Desparasitaciones de ${escapeHtml(patient?.name || "Paciente")}</h4>
        </div>
        <div class="form-actions">
          <button
            class="primary-button"
            type="button"
            data-open-patient-consultation-modal="true"
            data-consultation-profile-view="desparasitacion"
          >
            Registrar desparasitacion
          </button>
        </div>
      </div>
      ${content}
    </article>
  `;
}

function buildConsultorioHospAmbWorkspace(patient, profileConfig) {
  const entries = getConsultorioScopedConsultations(profileConfig?.consultationTypes || null);
  const content = entries.length
    ? `
      <div class="table-wrapper consultorio-consultations-table-wrapper consultorio-hospamb-table-wrapper">
        <table class="data-table consultorio-consultations-table consultorio-hospamb-table">
          <thead>
            <tr>
              <th>Opc.</th>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Motivo</th>
              <th>Detalle</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            ${entries
              .map((consultation) => {
                const details = parseConsultorioHospAmbDetails(consultation);
                const detailLabel = truncate(
                  [
                    details.dischargeReason ? `Motivo de salida: ${details.dischargeReason}` : "",
                    details.dischargeAt ? `Fecha de salida: ${formatDateTime(details.dischargeAt)}` : "",
                    details.observations || "",
                  ]
                    .filter(Boolean)
                    .join(" | ") || "Sin detalle registrado.",
                  112
                );
                return `
                  <tr>
                    <td>
                      <div class="table-actions consultorio-consultations-table__actions">
                        <button
                          class="ghost-button"
                          type="button"
                          data-edit-patient-consultation="${escapeHtml(consultation.id)}"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                    <td>${escapeHtml(formatDateTime(details.admissionAt || consultation.consultation_at))}</td>
                    <td>${escapeHtml(
                      (details.type || consultation.consultation_type || "Hospitalizacion") ===
                        "Hospitalizacion"
                        ? "Hospitalizaci\u00f3n"
                        : details.type || consultation.consultation_type || "Hospitalizaci\u00f3n"
                    )}</td>
                    <td>${escapeHtml(truncate(details.reason || consultation.title || "Sin motivo", 88))}</td>
                    <td>${escapeHtml(detailLabel)}</td>
                    <td>${escapeHtml(consultation.professional_name || "Sin usuario")}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : `
      <div class="consultorio-module-empty consultorio-module-empty--hospamb">
        <span class="consultorio-module-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3h8v18H8z"></path>
            <path d="M3 8h5v13H3z"></path>
            <path d="M16 11h5v10h-5z"></path>
            <path d="M10 7h4"></path>
            <path d="M12 5v4"></path>
            <path d="M6 11h0"></path>
            <path d="M6 14h0"></path>
            <path d="M11 11h0"></path>
            <path d="M13 11h0"></path>
            <path d="M11 14h0"></path>
            <path d="M13 14h0"></path>
          </svg>
        </span>
        <strong>No hay registros de hospitalizaci\u00f3n/ambulatorio</strong>
      </div>
    `;
  return `
    <article class="consultorio-profile-shell consultorio-hospamb-shell">
      <div class="consultorio-profile-table-toolbar">
        <div>
          <span class="consultorio-profile-shell__eyebrow">Hospitalizaciones/ambulatorios</span>
          <h4>Hospitalizaciones/ambulatorios de ${escapeHtml(patient?.name || "Paciente")}</h4>
        </div>
        <div class="form-actions">
          <button
            class="primary-button"
            type="button"
            data-open-patient-consultation-modal="true"
            data-consultation-profile-view="hospamb"
          >
            Registrar hospitalizaci\u00f3n/ambulatorio
          </button>
        </div>
      </div>
      ${content}
    </article>
  `;
}

function buildConsultorioProcedureWorkspace(patient, profileConfig) {
  const procedures = getConsultorioScopedConsultations(profileConfig?.consultationTypes || null);
  const content = procedures.length
    ? `
      <div class="table-wrapper consultorio-consultations-table-wrapper">
        <table class="data-table consultorio-consultations-table">
          <thead>
            <tr>
              <th>Opc.</th>
              <th>Fecha</th>
              <th>Procedimiento</th>
              <th>Resumen</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            ${procedures
              .map(
                (consultation) => `
                  <tr>
                    <td>
                      <div class="table-actions consultorio-consultations-table__actions">
                        <button
                          class="ghost-button"
                          type="button"
                          data-edit-patient-consultation="${escapeHtml(consultation.id)}"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                    <td>${escapeHtml(formatDateTime(consultation.consultation_at))}</td>
                    <td>${escapeHtml(consultation.title || "Cirug\u00eda / procedimiento")}</td>
                    <td>${escapeHtml(
                      truncate(
                        consultation.summary ||
                          getConsultorioConsultationDiagnosisLabel(consultation) ||
                          "Sin resumen",
                        120
                      )
                    )}</td>
                    <td>${escapeHtml(consultation.professional_name || "Sin usuario")}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : `
      <div class="consultorio-module-empty consultorio-module-empty--procedures">
        <span class="consultorio-module-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3a4 4 0 0 1 4 4v1.4a3 3 0 0 0 .88 2.12l.8.8A2 2 0 0 1 18.2 15L15 18.2a4.25 4.25 0 0 1-6 0L5.8 15a2 2 0 0 1 .52-3.68l.8-.8A3 3 0 0 0 8 8.4V7a4 4 0 0 1 4-4Z"></path>
            <path d="M9.5 7.5h5"></path>
            <path d="M12 5v5"></path>
            <path d="M8 20h8"></path>
          </svg>
        </span>
        <strong>No hay registros de cirug\u00eda/procedimiento</strong>
      </div>
    `;
  return `
    <article class="consultorio-profile-shell consultorio-procedures-shell">
      <div class="consultorio-profile-table-toolbar">
        <div class="consultorio-profile-toolbar__group">
          <span class="consultorio-profile-toolbar__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 4V2"></path>
              <path d="M9 4V2"></path>
              <path d="M10 10 4.5 15.5a2.12 2.12 0 1 0 3 3L13 13"></path>
              <path d="m14 9 1-1"></path>
              <path d="M5 8h14"></path>
              <path d="M7 4h10a2 2 0 0 1 2 2v2H5V6a2 2 0 0 1 2-2Z"></path>
            </svg>
          </span>
          <div class="consultorio-profile-toolbar__title">
            <h4>Cirug\u00edas/procedimientos de <span class="consultorio-profile-toolbar__accent">${escapeHtml(
              patient?.name || "Paciente"
            )}</span></h4>
          </div>
        </div>
        <div class="form-actions">
          <button
            class="primary-button"
            type="button"
            data-open-patient-consultation-modal="true"
            data-consultation-profile-view="cirugia"
          >
            + Registrar cirug\u00eda/procedimiento
          </button>
        </div>
      </div>
      ${content}
    </article>
  `;
}

function renderConsultorioPatientProfile() {
  if (!elements.consultorioPatientProfilePanel) {
    return;
  }
  if (!isConsultorioPatientProfileActive()) {
    elements.consultorioPatientProfilePanel.classList.add("is-hidden");
    elements.consultorioPatientProfilePanel.setAttribute("aria-hidden", "true");
    if (elements.consultorioPatientEditButton) {
      elements.consultorioPatientEditButton.disabled = true;
    }
    if (elements.consultorioPatientBackButton) {
      elements.consultorioPatientBackButton.disabled = true;
    }
    if (elements.consultorioPatientProfileTitle) {
      elements.consultorioPatientProfileTitle.textContent = "Perfil del paciente";
    }
    if (elements.consultorioPatientProfileSubtitle) {
      elements.consultorioPatientProfileSubtitle.textContent =
        "Selecciona una mascota para desplegar historia, vacunas, formulas y demas secciones.";
    }
    if (elements.consultorioPatientProfileNav) {
      elements.consultorioPatientProfileNav.innerHTML = "";
    }
    if (elements.consultorioPatientProfileSummary) {
      elements.consultorioPatientProfileSummary.innerHTML = emptyState(
        "Selecciona una mascota para abrir su perfil clinico."
      );
    }
    return;
  }
  const patient = getConsultorioPatient();
  const owner = getConsultorioOwner();
  const profileConfig = getConsultorioProfileViewConfig();
  const ownerPatients = owner ? getOwnerPatients(owner.id) : [];
  const timelineItems = getConsultorioProfileTimelineItems(profileConfig);
  const patientFacts = [
    ["Especie", patient?.species || "Sin dato"],
    ["Raza / subespecie", patient?.breed || "Sin dato"],
    ["Genero", patient?.sex || "Sin dato"],
    ["Estado reproductivo", patient?.reproductive_status || "Sin dato"],
    ["Peso", patient?.weight_kg ? `${patient.weight_kg} kg` : "Sin dato"],
    ["Edad", patient?.age_years ? `${patient.age_years} anos` : "Sin dato"],
    ["Microchip", patient?.microchip || "Sin dato"],
    ["Vacunacion", patient?.vaccination_status || "Sin dato"],
    ["Desparasitacion", patient?.deworming_status || "Sin dato"],
    ["Alergias", patient?.allergies || "Sin dato"],
    ["Condiciones cronicas", patient?.chronic_conditions || "Sin dato"],
    ["Notas", patient?.notes || "Sin observaciones"],
  ];
  elements.consultorioPatientProfilePanel.classList.remove("is-hidden");
  elements.consultorioPatientProfilePanel.setAttribute("aria-hidden", "false");
  if (elements.consultorioPatientEditButton) {
    elements.consultorioPatientEditButton.disabled = false;
  }
  if (elements.consultorioPatientBackButton) {
    elements.consultorioPatientBackButton.disabled = false;
  }
  if (elements.consultorioPatientProfileTitle) {
    elements.consultorioPatientProfileTitle.textContent = patient?.name || "Perfil del paciente";
  }
  if (elements.consultorioPatientProfileSubtitle) {
    const ownerLabel = owner?.full_name || patient?.owner_name || "Sin propietario";
    elements.consultorioPatientProfileSubtitle.textContent = `${patient?.species || "Paciente"}${
      patient?.breed ? ` / ${patient.breed}` : ""
    } · Tutor: ${ownerLabel} · Vista activa: ${profileConfig?.label || "Historia clinica"}`;
  }
  if (elements.consultorioPatientProfileNav) {
    elements.consultorioPatientProfileNav.innerHTML = CONSULTORIO_PROFILE_VIEWS.map(
      (option) => `
        <button
          class="consultorio-profile-nav__item${option.value === consultorioProfileView ? " is-active" : ""}"
          type="button"
          data-consultorio-profile-view="${escapeHtml(option.value)}"
        >
          <span>${escapeHtml(option.label)}</span>
          <strong>${getConsultorioProfileCount(option)}</strong>
        </button>
      `
    ).join("");
  }
  if (elements.consultorioPatientProfileSummary) {
    const summaryCards = [
      {
        title: "Datos del paciente",
        entries: [
          ["Especie", patient?.species || "Sin dato"],
          ["Raza", patient?.breed || "Sin dato"],
          ["Sexo", patient?.sex || "Sin dato"],
          ["Edad", patient?.age_years ? `${patient.age_years} anos` : "Sin dato"],
          ["Peso", patient?.weight_kg ? `${patient.weight_kg} kg` : "Sin dato"],
          ["Estado reproductivo", patient?.reproductive_status || "Sin dato"],
        ],
      },
      {
        title: "Tutor responsable",
        entries: [
          ["Propietario", owner?.full_name || patient?.owner_name || "Sin dato"],
          [
            "Identificacion",
            owner ? `${owner.identification_type} ${owner.identification_number}` : "Sin dato",
          ],
          ["Telefono", owner?.phone || "Sin dato"],
          ["Correo", owner?.email || "Sin dato"],
          ["Direccion", owner?.address || "Sin dato"],
          ["Notas", patient?.notes || "Sin observaciones"],
        ],
      },
      {
        title: "Contexto clinico",
        entries: [
          ["Vacunas", patient?.vaccination_status || "Sin dato"],
          ["Desparasitaciones", patient?.deworming_status || "Sin dato"],
          ["Alergias", patient?.allergies || "Sin dato"],
          ["Condiciones cronicas", patient?.chronic_conditions || "Sin dato"],
          ["Microchip", patient?.microchip || "Sin dato"],
          ["Vista abierta", profileConfig?.label || "Historia clinica"],
        ],
      },
    ];
    elements.consultorioPatientProfileSummary.innerHTML = summaryCards
      .map(
        (card) => `
          <article class="consultorio-profile-card">
            <h4>${escapeHtml(card.title)}</h4>
            <dl>
              ${card.entries
                .map(
                  ([label, value]) => `
                    <div>
                      <dt>${escapeHtml(label)}</dt>
                      <dd>${escapeHtml(value)}</dd>
                    </div>
                  `
                )
                .join("")}
            </dl>
          </article>
        `
      )
      .join("");
  }
  if (elements.consultorioPatientProfileSubtitle) {
    const ownerLabel = owner?.full_name || patient?.owner_name || "Sin propietario";
    elements.consultorioPatientProfileSubtitle.textContent = `${patient?.species || "Paciente"}${
      patient?.breed ? ` / ${patient.breed}` : ""
    } | Tutor: ${ownerLabel} | Seccion activa: ${profileConfig?.label || "Historia clinica"}`;
  }
  if (elements.consultorioPatientProfileSummary) {
    const showOverview = !isConsultorioWorkspaceOnlyView(profileConfig);
    const overviewMarkup = showOverview
      ? buildConsultorioProfileOverviewMarkup({
          owner,
          patient,
          ownerPatients,
          patientFacts,
          profileConfig,
        })
      : "";
    const contentMarkup =
      profileConfig?.value === "consultations"
        ? buildConsultorioConsultationsWorkspace(patient, profileConfig)
        : profileConfig?.value === "vacunacion"
        ? buildConsultorioVaccinationsWorkspace(patient, profileConfig)
        : profileConfig?.value === "formula"
        ? buildConsultorioFormulasWorkspace(patient, profileConfig)
        : profileConfig?.value === "desparasitacion"
        ? buildConsultorioDewormingWorkspace(patient, profileConfig)
        : profileConfig?.value === "hospamb"
        ? buildConsultorioHospAmbWorkspace(patient, profileConfig)
        : profileConfig?.value === "cirugia"
        ? buildConsultorioProcedureWorkspace(patient, profileConfig)
        : buildConsultorioProfileTimelineMarkup(profileConfig, timelineItems);
    elements.consultorioPatientProfileSummary.innerHTML = `
      <div class="consultorio-profile-workspace">
        ${overviewMarkup}
        ${contentMarkup}
      </div>
    `;
  }
}

function renderConsultorioOwnerDetail() {
  if (!elements.consultorioOwnerDetailPanel || !elements.consultorioOwnersPanel) {
    return;
  }
  const consultorioOption = getSubsectionOption("consultorio");
  if (consultorioOption?.value !== "patients") {
    return;
  }
  const owner = getConsultorioOwner();
  if (!owner) {
    if (loadedBootstrapSections.has("owners")) {
      consultorioOwnerId = "";
    }
    elements.consultorioOwnerDetailPanel.classList.add("is-hidden");
    elements.consultorioOwnersPanel.classList.remove("is-hidden");
    if (elements.consultorioOwnerName) {
      elements.consultorioOwnerName.textContent = "Detalle del propietario";
    }
    if (elements.consultorioOwnerEditButton) {
      elements.consultorioOwnerEditButton.disabled = true;
    }
    if (elements.consultorioOwnerDeleteButton) {
      elements.consultorioOwnerDeleteButton.disabled = true;
    }
    if (elements.consultorioOwnerSummary) {
      elements.consultorioOwnerSummary.innerHTML = emptyState(
        "Selecciona un propietario para ver su ficha."
      );
    }
    if (elements.ownerPatientsSearchInput) {
      elements.ownerPatientsSearchInput.value = "";
    }
    consultorioPatientsFilters.query = "";
    if (elements.patientOwnerSelect) {
      elements.patientOwnerSelect.value = "";
      elements.patientOwnerSelect.disabled = false;
    }
    resetPatientEditor();
    return;
  }
  elements.consultorioOwnersPanel.classList.add("is-hidden");
  elements.consultorioOwnerDetailPanel.classList.remove("is-hidden");
  if (elements.consultorioOwnerName) {
    elements.consultorioOwnerName.textContent = owner.full_name || "Propietario";
  }
  if (elements.consultorioOwnerEditButton) {
    elements.consultorioOwnerEditButton.disabled = false;
  }
  if (elements.consultorioOwnerDeleteButton) {
    elements.consultorioOwnerDeleteButton.disabled = false;
  }
  const ownerSummaryRows = [
    ["Nombre", owner.full_name || "Sin dato"],
    [
      "Identificacion",
      [owner.identification_type, owner.identification_number].filter(Boolean).join(" ") || "Sin dato",
    ],
    [
      "Telefonos",
      [owner.phone, owner.alternate_phone].filter(Boolean).join(" / ") || "Sin dato",
    ],
    ["Direccion", owner.address || "Sin dato"],
    ["Correo", owner.email || "Sin dato"],
    ["Contacto", owner.full_name || "Sin dato"],
  ];
  if (elements.consultorioOwnerSummary) {
    elements.consultorioOwnerSummary.innerHTML = `
      <dl class="owner-detail-summary__rows">
        ${ownerSummaryRows
          .map(
            ([label, value]) => `
              <div>
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(value)}</dd>
              </div>
            `
          )
          .join("")}
      </dl>
      <div class="owner-detail-summary__meta">
        <span class="owner-detail-summary__badge">Mascotas registradas: ${escapeHtml(
          String(getOwnerPatients(owner.id).length)
        )}</span>
      </div>
    `;
  }
  if (elements.patientOwnerSelect) {
    elements.patientOwnerSelect.value = owner.id;
    elements.patientOwnerSelect.disabled = true;
  }
  if (elements.ownerPatientsSearchInput) {
    elements.ownerPatientsSearchInput.value = consultorioPatientsFilters.query || "";
  }
}

function setConsultorioPatientEditorVisible(visible) {
  consultorioPatientEditorVisible = Boolean(visible);
  if (elements.consultorioPatientFormPanel) {
    elements.consultorioPatientFormPanel.classList.toggle("is-hidden", !consultorioPatientEditorVisible);
  }
}

function resetPatientEditor(options = {}) {
  const { keepVisible = false } = options;
  if (!elements.patientForm) {
    return;
  }
  resetForm(elements.patientForm);
  if (elements.patientForm.elements.id) {
    elements.patientForm.elements.id.value = "";
  }
  if (elements.patientFormTitle) {
    elements.patientFormTitle.textContent = "Registrar mascota";
  }
  if (elements.patientFormSubmitButton) {
    elements.patientFormSubmitButton.textContent = "Guardar mascota";
  }
  if (elements.cancelPatientEditButton) {
    elements.cancelPatientEditButton.classList.add("is-hidden");
  }
  const owner = getConsultorioOwner();
  if (elements.patientOwnerSelect) {
    elements.patientOwnerSelect.value = owner?.id || "";
    elements.patientOwnerSelect.disabled = Boolean(owner);
  }
  setConsultorioPatientEditorVisible(keepVisible && Boolean(owner));
}

function openNewPatientEditor() {
  consultorioPatientId = "";
  resetPatientEditor({ keepVisible: true });
  setConsultorioPatientEditorVisible(true);
  elements.patientForm?.elements?.name?.focus();
}

function openPatientEditor(patient) {
  if (!patient || !elements.patientForm) {
    return;
  }
  consultorioPatientId = patient.id || consultorioPatientId;
  consultorioOwnerId = patient.owner_id || consultorioOwnerId;
  elements.patientForm.reset();
  const fields = elements.patientForm.elements;
  fields.id.value = patient.id || "";
  fields.owner_id.value = patient.owner_id || consultorioOwnerId || "";
  fields.name.value = patient.name || "";
  fields.species.value = patient.species || "";
  fields.breed.value = patient.breed || "";
  fields.sex.value = patient.sex || "";
  fields.birth_date.value = patient.birth_date || "";
  fields.age_years.value = patient.age_years ?? "";
  fields.color.value = patient.color || "";
  fields.reproductive_status.value = patient.reproductive_status || "";
  fields.microchip.value = patient.microchip || "";
  fields.weight_kg.value = patient.weight_kg ?? "";
  fields.allergies.value = patient.allergies || "";
  fields.chronic_conditions.value = patient.chronic_conditions || "";
  fields.vaccination_status.value = patient.vaccination_status || "";
  fields.deworming_status.value = patient.deworming_status || "";
  fields.notes.value = patient.notes || "";
  if (elements.patientFormTitle) {
    elements.patientFormTitle.textContent = "Editar mascota";
  }
  if (elements.patientFormSubmitButton) {
    elements.patientFormSubmitButton.textContent = "Guardar cambios";
  }
  if (elements.cancelPatientEditButton) {
    elements.cancelPatientEditButton.classList.remove("is-hidden");
  }
  if (elements.patientOwnerSelect) {
    elements.patientOwnerSelect.disabled = Boolean(getConsultorioOwner());
  }
  setConsultorioPatientEditorVisible(true);
  elements.patientForm?.elements?.name?.focus();
}

function renderAppointments() {
  renderList(
    elements.appointmentsList,
    state.appointments,
    (appointment) => {
      const actions = [];
      const terminal = ["completed", "cancelled", "no_show"].includes(appointment.status);
      actions.push(
        `<button data-appointment-id="${escapeHtml(
          appointment.id
        )}" data-appointment-action="edit">Editar</button>`
      );
      actions.push(
        `<button data-appointment-id="${escapeHtml(
          appointment.id
        )}" data-appointment-action="delete">Eliminar</button>`
      );
      if (["cancelled", "no_show"].includes(appointment.status)) {
        actions.push(
          `<button data-appointment-id="${escapeHtml(
            appointment.id
          )}" data-appointment-action="reactivate">Reactivar</button>`
        );
      }
      if (!terminal && appointment.status !== "confirmed") {
        actions.push(
          `<button data-appointment-id="${escapeHtml(appointment.id)}" data-status="confirmed">Confirmar</button>`
        );
      }
      if (!terminal) {
        actions.push(
          `<button data-appointment-id="${escapeHtml(appointment.id)}" data-status="completed">Completar</button>`
        );
        actions.push(
          `<button data-appointment-id="${escapeHtml(appointment.id)}" data-status="cancelled">Cancelar</button>`
        );
      }
      return `
        <article class="list-card">
          <header>
            <div>
              <h4>${escapeHtml(appointment.patient_name)}</h4>
              <p>${formatDateTime(appointment.appointment_at)}</p>
            </div>
            <span class="${statusClass(appointment.status)}">${escapeHtml(humanStatus(appointment.status))}</span>
          </header>
          <p>Tutor: ${escapeHtml(appointment.owner_name)}</p>
          <p>${escapeHtml(appointment.professional_name || "Agenda general")} / ${
            appointment.duration_minutes || 30
          } min</p>
          <p>${escapeHtml(appointment.reason)}</p>
          ${
            appointment.google_event_url
              ? `<p><a href="${escapeHtml(
                  appointment.google_event_url
                )}" target="_blank" rel="noreferrer">Abrir en Google Calendar</a></p>`
              : ""
          }
          ${
            appointment.google_sync_status
              ? `<p>Sync Google: ${escapeHtml(appointment.google_sync_status)}${
                  appointment.google_sync_error ? ` / ${escapeHtml(appointment.google_sync_error)}` : ""
                }</p>`
              : ""
          }
          <div class="item-actions">${actions.join("")}</div>
        </article>
      `;
    },
    "Aun no hay citas registradas."
  );
}

function renderAvailability() {
  if (elements.availabilityRulesList) {
    renderList(
      elements.availabilityRulesList,
      state.availability_rules,
      (rule) => `
        <article class="list-card">
          <h4>${escapeHtml(rule.professional_name)}</h4>
          <p>Dia: ${Number(rule.day_of_week) + 1} / ${escapeHtml(rule.start_time)} - ${escapeHtml(rule.end_time)}</p>
          <p>Bloque: ${rule.slot_minutes} min${rule.location ? ` / ${escapeHtml(rule.location)}` : ""}</p>
          <div class="item-actions">
            <button data-delete-availability="${escapeHtml(rule.id)}">Eliminar</button>
          </div>
        </article>
      `,
      "Aun no hay bloques configurados."
    );
  }
  renderAgendaMonth();
  renderAgendaView();
  renderGoogleCalendarStatus();
  saveAppViewState();
}

function renderAgendaMonth() {
  elements.agendaMonthLabel.textContent = formatMonthLabel(agendaViewDate);
  const gridStart = buildAgendaMonthStart(agendaViewDate);
  const today = toIsoDate(new Date());
  const cards = [];
  for (let index = 0; index < 42; index += 1) {
    const current = addDays(gridStart, index);
    const currentIso = toIsoDate(current);
    const slots = buildAgendaSlots(currentIso);
    const latestEnd = getLatestAppointmentEnd(currentIso);
    const availableSlots = slots.filter((slot) => {
      if (slot.occupied) {
        return false;
      }
      if (!latestEnd) {
        return true;
      }
      const slotStart = new Date(slot.slot_at);
      return slotStart >= latestEnd;
    });
    const appointments = listCalendarAppointmentsForDate(currentIso);
    cards.push(`
      <button
        type="button"
        class="agenda-date-card${sameMonth(current, agendaViewDate) ? "" : " is-muted"}${
          currentIso === agendaSelectedDate ? " is-selected" : ""
        }${currentIso === today ? " is-today" : ""}"
        data-agenda-date="${escapeHtml(currentIso)}"
      >
        <span class="agenda-date-card__day">${escapeHtml(String(current.getDate()))}</span>
        <span class="agenda-date-card__meta">${appointments.length} citas</span>
        <span class="agenda-date-card__meta">${availableSlots.length} libres</span>
      </button>
    `);
  }
  elements.agendaMonthGrid.innerHTML = cards.join("");
}

function formatWeekdayShort(value) {
  const label = value.toLocaleDateString("es-CO", { weekday: "short" });
  return label.replace(".", "").toUpperCase();
}

function formatAgendaWeekRange(start, end) {
  const startLabel = start.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
  const endLabel = end.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startLabel} - ${endLabel}`;
}

function formatAgendaTimezoneLabel() {
  const timezone = state.settings.agenda_timezone || "America/Bogota";
  let tzName = "";
  try {
    tzName = new Intl.DateTimeFormat("es-CO", {
      timeZone: timezone,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;
  } catch (error) {
    tzName = "";
  }
  return tzName ? `${tzName} ${timezone}` : timezone;
}

function renderAgendaWeekSlots() {
  if (!elements.agendaWeekSlots) {
    return;
  }
  const selected = parseIsoDate(agendaSelectedDate);
  const weekStart = addDays(selected, -getWeekdayIndex(selected));
  const weekEnd = addDays(weekStart, 6);
  const rangeLabel = formatAgendaWeekRange(weekStart, weekEnd);
  if (elements.agendaSelectedDateLabel) {
    elements.agendaSelectedDateLabel.textContent = rangeLabel;
  }
  if (elements.agendaWeekLabel) {
    elements.agendaWeekLabel.textContent = rangeLabel;
  }
  if (elements.agendaTimezoneLabel) {
    elements.agendaTimezoneLabel.textContent = formatAgendaTimezoneLabel();
  }
  const columns = [];
  for (let index = 0; index < 7; index += 1) {
    const current = addDays(weekStart, index);
    const currentIso = toIsoDate(current);
    const latestEnd = getLatestAppointmentEnd(currentIso);
    const slots = buildAgendaSlots(currentIso).filter((slot) => {
      if (slot.occupied) {
        return false;
      }
      if (!latestEnd) {
        return true;
      }
      const slotStart = new Date(slot.slot_at);
      return slotStart >= latestEnd;
    });
    const slotMarkup = slots.length
      ? slots
          .map(
            (slot) => `
              <button
                type="button"
                class="agenda-slot"
                data-slot-at="${escapeHtml(slot.slot_at)}"
                data-slot-minutes="${escapeHtml(String(slot.duration_minutes || 30))}"
              >
                <span class="agenda-slot-time">${escapeHtml(slot.label)}</span>
                <span class="agenda-slot-duration">${escapeHtml(
                  String(slot.duration_minutes || 30)
                )} min</span>
              </button>
            `
          )
          .join("")
      : `<div class="agenda-slot agenda-slot--empty">—</div>`;
    columns.push(`
      <div class="agenda-week-day${currentIso === agendaSelectedDate ? " is-selected" : ""}" data-agenda-date="${escapeHtml(
      currentIso
    )}">
        <div class="agenda-week-day__header">
          <span class="agenda-week-day__dow">${escapeHtml(formatWeekdayShort(current))}</span>
          <span class="agenda-week-day__date">${escapeHtml(String(current.getDate()))}</span>
        </div>
        <div class="agenda-week-day__slots">
          ${slotMarkup}
        </div>
      </div>
    `);
  }
  elements.agendaWeekSlots.innerHTML = columns.join("");
}

function renderAgendaView() {
  syncAgendaViewTabs();
  toggleAgendaViewPanels();
  if (elements.agendaTimezoneLabel) {
    elements.agendaTimezoneLabel.textContent = formatAgendaTimezoneLabel();
  }
  switch (agendaViewMode) {
    case "month":
      renderAgendaLargeMonth();
      break;
    case "week":
      renderAgendaWeekTimeline();
      break;
    case "day":
      renderAgendaDayTimeline();
      break;
    case "list":
      renderAgendaListView();
      break;
    default:
      renderAgendaWeekSlots();
      break;
  }
}

function buildAgendaTimelineEventMarkup(appointment, { dayStart, dayEnd, minuteHeight } = {}) {
  const start = new Date(appointment.appointment_at);
  if (Number.isNaN(start.getTime())) {
    return "";
  }
  const duration = Number(appointment.duration_minutes || 30);
  const end = addMinutes(start, duration);
  if (end <= dayStart || start >= dayEnd) {
    return "";
  }
  const clampedStart = start < dayStart ? dayStart : start;
  const clampedEnd = end > dayEnd ? dayEnd : end;
  const minutesFromStart = (clampedStart.getTime() - dayStart.getTime()) / 60000;
  const minutesDuration = Math.max(15, (clampedEnd.getTime() - clampedStart.getTime()) / 60000);
  const top = minutesFromStart * minuteHeight;
  const height = Math.max(18, minutesDuration * minuteHeight);
  const timeLabel = `${formatAgendaTimeShort(start)} - ${formatAgendaTimeShort(end)}`;
  const label = truncate(appointment.reason || appointment.patient_name || "Cita", 32);
  const tone = normalizeAgendaTone(appointment.status);
  return `
    <div class="agenda-timeline-event agenda-timeline-event--${tone}" data-appointment-id="${escapeHtml(
      appointment.id
    )}" role="button" tabindex="0" style="top:${top}px;height:${height}px">
      <span class="agenda-timeline-event__time">${escapeHtml(timeLabel)}</span>
      <span class="agenda-timeline-event__text">${escapeHtml(label)}</span>
    </div>
  `;
}

function renderAgendaWeekTimeline() {
  if (!elements.agendaWeekTimeline) {
    return;
  }
  const selected = parseIsoDate(agendaSelectedDate);
  const weekStart = addDays(selected, -getWeekdayIndex(selected));
  const weekEnd = addDays(weekStart, 6);
  if (elements.agendaSelectedDateLabel) {
    elements.agendaSelectedDateLabel.textContent = formatAgendaWeekRange(weekStart, weekEnd);
  }
  const hours = buildAgendaTimelineHours();
  const hourSlots = AGENDA_TIMELINE_END_HOUR - AGENDA_TIMELINE_START_HOUR;
  const timelineHeight = hourSlots * AGENDA_TIMELINE_HOUR_HEIGHT;
  const minuteHeight = AGENDA_TIMELINE_HOUR_HEIGHT / 60;
  const headerDays = [];
  const columns = [];
  for (let index = 0; index < 7; index += 1) {
    const current = addDays(weekStart, index);
    const currentIso = toIsoDate(current);
    headerDays.push(`
      <button type="button" class="agenda-timeline__day-label" data-agenda-date="${escapeHtml(currentIso)}">
        ${escapeHtml(formatWeekdayShort(current))} ${escapeHtml(String(current.getDate()))}
      </button>
    `);
    const dayStart = new Date(
      `${currentIso}T${String(AGENDA_TIMELINE_START_HOUR).padStart(2, "0")}:00:00`
    );
    const dayEnd = new Date(
      `${currentIso}T${String(AGENDA_TIMELINE_END_HOUR).padStart(2, "0")}:00:00`
    );
    const appointments = listCalendarAppointmentsForDate(currentIso);
    const events = appointments
      .map((appointment) =>
        buildAgendaTimelineEventMarkup(appointment, { dayStart, dayEnd, minuteHeight })
      )
      .join("");
    columns.push(`
      <div class="agenda-timeline__day-column" data-agenda-date="${escapeHtml(currentIso)}">
        ${events}
      </div>
    `);
  }
  const timeLabels = hours
    .map((hour) => `<div class="agenda-timeline__time">${escapeHtml(hour.label)}</div>`)
    .join("");
  elements.agendaWeekTimeline.innerHTML = `
    <div class="agenda-timeline" style="--timeline-hour-height:${AGENDA_TIMELINE_HOUR_HEIGHT}px;--timeline-height:${timelineHeight}px;">
      <div class="agenda-timeline__header">
        <div class="agenda-timeline__corner"></div>
        ${headerDays.join("")}
      </div>
      <div class="agenda-timeline__body">
        <div class="agenda-timeline__times">
          ${timeLabels}
        </div>
        <div class="agenda-timeline__grid">
          ${columns.join("")}
        </div>
      </div>
    </div>
  `;
}

function renderAgendaDayTimeline() {
  if (!elements.agendaDayTimeline) {
    return;
  }
  const currentIso = agendaSelectedDate;
  if (elements.agendaSelectedDateLabel) {
    elements.agendaSelectedDateLabel.textContent = formatAgendaDateLabel(currentIso);
  }
  const hours = buildAgendaTimelineHours();
  const hourSlots = AGENDA_TIMELINE_END_HOUR - AGENDA_TIMELINE_START_HOUR;
  const timelineHeight = hourSlots * AGENDA_TIMELINE_HOUR_HEIGHT;
  const minuteHeight = AGENDA_TIMELINE_HOUR_HEIGHT / 60;
  const dayStart = new Date(
    `${currentIso}T${String(AGENDA_TIMELINE_START_HOUR).padStart(2, "0")}:00:00`
  );
  const dayEnd = new Date(
    `${currentIso}T${String(AGENDA_TIMELINE_END_HOUR).padStart(2, "0")}:00:00`
  );
  const appointments = listCalendarAppointmentsForDate(currentIso);
  const events = appointments
    .map((appointment) =>
      buildAgendaTimelineEventMarkup(appointment, { dayStart, dayEnd, minuteHeight })
    )
    .join("");
  const timeLabels = hours
    .map((hour) => `<div class="agenda-timeline__time">${escapeHtml(hour.label)}</div>`)
    .join("");
  elements.agendaDayTimeline.innerHTML = `
    <div class="agenda-timeline agenda-timeline--day" style="--timeline-hour-height:${AGENDA_TIMELINE_HOUR_HEIGHT}px;--timeline-height:${timelineHeight}px;">
      <div class="agenda-timeline__header">
        <div class="agenda-timeline__corner"></div>
        <div class="agenda-timeline__day-label">${escapeHtml(
          formatWeekdayShort(parseIsoDate(currentIso))
        )}</div>
      </div>
      <div class="agenda-timeline__body">
        <div class="agenda-timeline__times">
          ${timeLabels}
        </div>
        <div class="agenda-timeline__grid">
          <div class="agenda-timeline__day-column" data-agenda-date="${escapeHtml(currentIso)}">
            ${events}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAgendaListView() {
  if (!elements.agendaListItems) {
    return;
  }
  const selected = parseIsoDate(agendaSelectedDate);
  const weekStart = addDays(selected, -getWeekdayIndex(selected));
  const weekEnd = addDays(weekStart, 6);
  if (elements.agendaSelectedDateLabel) {
    elements.agendaSelectedDateLabel.textContent = formatAgendaWeekRange(weekStart, weekEnd);
  }
  const days = [];
  for (let index = 0; index < 7; index += 1) {
    const current = addDays(weekStart, index);
    const currentIso = toIsoDate(current);
    const appointments = listCalendarAppointmentsForDate(currentIso);
    const items = appointments.length
      ? appointments
          .map((appointment) => {
            const start = new Date(appointment.appointment_at);
            const end = addMinutes(start, Number(appointment.duration_minutes || 30));
            const timeLabel = `${formatAgendaTimeShort(start)} - ${formatAgendaTimeShort(end)}`;
            const title = truncate(
              `${appointment.reason || appointment.patient_name || "Cita"}`,
              48
            );
            return `
              <div class="agenda-list-item" data-appointment-id="${escapeHtml(
                appointment.id
              )}" role="button" tabindex="0">
                <div class="agenda-list-time">${escapeHtml(timeLabel)}</div>
                <div class="agenda-list-title">
                  <strong>${escapeHtml(title)}</strong>
                  <span>${escapeHtml(appointment.owner_name || "")}</span>
                </div>
              </div>
            `;
          })
          .join("")
      : `<div class="agenda-list-item"><div class="agenda-list-time">--</div><div class="agenda-list-title"><span>Sin citas</span></div></div>`;
    days.push(`
      <article class="agenda-list-day" data-agenda-date="${escapeHtml(currentIso)}">
        <div class="agenda-list-day__header">
          <strong>${escapeHtml(formatWeekdayShort(current))}</strong>
          <span>${escapeHtml(
            current.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
          )}</span>
        </div>
        <div class="agenda-list-day__items">
          ${items}
        </div>
      </article>
    `);
  }
  elements.agendaListItems.innerHTML = days.join("");
}

function renderAgendaLargeMonth() {
  if (elements.appointmentModalSelectedDate) {
    elements.appointmentModalSelectedDate.textContent = formatAgendaDateLabel(agendaSelectedDate);
  }
  if (elements.agendaSelectedDateLabel) {
    elements.agendaSelectedDateLabel.textContent = formatMonthLabel(agendaViewDate);
  }
  if (!elements.agendaMonthGridLarge) {
    return;
  }
  const gridStart = buildAgendaMonthStart(agendaViewDate);
  const today = toIsoDate(new Date());
  const cards = [];
  for (let index = 0; index < 42; index += 1) {
    const current = addDays(gridStart, index);
    const currentIso = toIsoDate(current);
    const appointments = listCalendarAppointmentsForDate(currentIso);
    const visible = appointments.slice(0, 3);
    const moreCount = appointments.length - visible.length;
    const events = visible
      .map((appointment) => {
        const timeLabel = formatAgendaTimeShort(appointment.appointment_at);
        const label = truncate(
          appointment.reason || appointment.patient_name || "Cita",
          26
        );
        const tone = normalizeAgendaTone(appointment.status);
        return `
          <div class="agenda-event-chip agenda-event-chip--${tone}" data-appointment-id="${escapeHtml(
            appointment.id
          )}" role="button" tabindex="0">
            <span class="agenda-event-dot"></span>
            <span class="agenda-event-time">${escapeHtml(timeLabel)}</span>
            <span class="agenda-event-text">${escapeHtml(label)}</span>
          </div>
        `;
      })
      .join("");
    const moreLine = moreCount > 0 ? `<div class="agenda-event-more">+${moreCount} mas</div>` : "";
    cards.push(`
      <button
        type="button"
        class="agenda-large-day${sameMonth(current, agendaViewDate) ? "" : " is-muted"}${
          currentIso === agendaSelectedDate ? " is-selected" : ""
        }${currentIso === today ? " is-today" : ""}"
        data-agenda-date="${escapeHtml(currentIso)}"
      >
        <div class="agenda-large-day__date">${escapeHtml(String(current.getDate()))}</div>
        <div class="agenda-large-day__events">
          ${events || ""}
          ${moreLine}
        </div>
      </button>
    `);
  }
  elements.agendaMonthGridLarge.innerHTML = cards.join("");
}

function renderGoogleCalendarStatus() {
  const info = state.google_calendar || {};
  const hasBadge = Boolean(elements.agendaConnectionBadge);
  const hasInline = Boolean(elements.googleCalendarInlineStatus);
  const hasSummary = Boolean(elements.googleCalendarStatus);
  if (!hasBadge && !hasInline && !hasSummary) {
    return;
  }
  if (hasBadge) {
    elements.agendaConnectionBadge.textContent = info.connected ? "Google conectado" : "Google pendiente";
    elements.agendaConnectionBadge.className = `pill ${info.connected ? "pill--confirmed" : "pill--draft"}`;
  }
  if (hasInline) {
    elements.googleCalendarInlineStatus.textContent = info.connected ? "Conectado" : "Pendiente";
    elements.googleCalendarInlineStatus.className = `pill ${info.connected ? "pill--confirmed" : "pill--draft"}`;
  }
  if (hasSummary) {
    elements.googleCalendarStatus.innerHTML = `
      <div class="summary-item"><span>Estado</span><strong>${escapeHtml(
        info.connected ? "Conectado" : "Sin conectar"
      )}</strong></div>
      <div class="summary-item"><span>Calendar ID</span><strong>${escapeHtml(
        info.calendar_id || "primary"
      )}</strong></div>
      <div class="summary-item"><span>Credenciales OAuth</span><strong>${escapeHtml(
        info.credentials_present ? "Guardadas" : "Pendientes"
      )}</strong></div>
      <div class="summary-item"><span>Zona horaria</span><strong>${escapeHtml(
        info.timezone || state.settings.agenda_timezone || "America/Bogota"
      )}</strong></div>
      ${
        info.error
          ? `<div class="summary-item"><span>Detalle</span><strong>${escapeHtml(info.error)}</strong></div>`
          : ""
      }
    `;
  }
}

function buildUserPermissionsSummary(permissions) {
  if (!Array.isArray(permissions) || !permissions.length) {
    return "Sin permisos";
  }
  if (permissions.length >= permissionOptions.length) {
    return "Acceso total";
  }
  return permissions.map((key) => permissionLabelMap[key] || key).join(", ");
}

function isAdminUser() {
  return Boolean(authState.currentUser?.is_admin);
}

function getAllowedSections() {
  const all = permissionOptions.map((option) => option.key);
  if (!authState.requiresLogin) {
    return new Set(all);
  }
  if (!authState.authenticated) {
    return new Set();
  }
  if (isAdminUser()) {
    return new Set(all);
  }
  const permissions = Array.isArray(authState.currentUser?.permissions)
    ? authState.currentUser.permissions
    : [];
  return new Set(permissions);
}

function applyPermissionsVisibility() {
  const allowed = getAllowedSections();
  queryAll("[data-section-target]").forEach((button) => {
    const sectionId = button.dataset.sectionTarget;
    const wrapper = button.closest(".switcher-item") || button;
    wrapper.classList.toggle("is-hidden", !allowed.has(sectionId));
  });
  queryAll(".workspace-section").forEach((section) => {
    if (isInternalWorkspaceSection(section)) {
      section.classList.remove("is-hidden");
      return;
    }
    section.classList.toggle("is-hidden", !allowed.has(section.id));
  });
  if (!allowed.size) {
    return;
  }
  const active = getNavSectionId(getActiveSectionId());
  if (!active || !allowed.has(active)) {
    const firstAllowed = permissionOptions.find((option) => allowed.has(option.key))?.key;
    if (firstAllowed) {
      setActiveSection(firstAllowed);
    }
  }
}

function syncAdminControls() {
  const isAdmin = isAdminUser();
  if (elements.openUserModalButton) {
    elements.openUserModalButton.classList.toggle("is-hidden", !isAdmin);
  }
  if (elements.toggleInactiveUsersButton) {
    elements.toggleInactiveUsersButton.classList.toggle("is-hidden", !isAdmin);
  }
  if (elements.exportUsersButton) {
    elements.exportUsersButton.classList.toggle("is-hidden", !isAdmin);
  }
  if (elements.userForm) {
    elements.userForm.querySelectorAll("input, select, textarea").forEach((field) => {
      if (field.name === "id") {
        return;
      }
      field.disabled = !isAdmin;
    });
  }
}

function renderUsers() {
  if (!elements.usersTableBody) {
    return;
  }
  const clinicName = state.settings?.clinic_name || "Lativet";
  elements.usersClinicName.textContent = clinicName;
  const query = usersFilters.query.trim().toLowerCase();
  let users = Array.isArray(state.users) ? [...state.users] : [];
  if (!usersFilters.showInactive) {
    users = users.filter((user) => user.is_active);
  }
  if (query) {
    users = users.filter((user) => {
      const haystack = `${user.full_name || ""} ${user.email || ""} ${user.role || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }
  const total = users.length;
  const pageSize = Number(usersFilters.pageSize || 10);
  const visible = users.slice(0, pageSize);
  if (!visible.length) {
    elements.usersTableBody.innerHTML = `<tr><td colspan="5">${emptyState("Aun no hay usuarios registrados.")}</td></tr>`;
  } else {
    const isAdmin = isAdminUser();
    elements.usersTableBody.innerHTML = visible
      .map((user) => {
        const statusLabel = user.is_active ? "Activo" : "Inactivo";
        const statusClass = user.is_active ? "pill--confirmed" : "pill--draft";
        const createdLabel = user.created_at ? formatDateTime(user.created_at) : "N/D";
        const permissionsLabel = buildUserPermissionsSummary(user.permissions);
        return `
          <tr class="${user.is_active ? "" : "is-muted"}">
            <td>
              <div class="table-actions">
                ${
                  isAdmin
                    ? `
                <button type="button" data-user-edit="${escapeHtml(user.id)}">Editar</button>
                <button type="button" data-user-toggle="${escapeHtml(user.id)}" data-user-active="${user.is_active ? "1" : "0"}">
                  ${user.is_active ? "Desactivar" : "Activar"}
                </button>`
                    : "<span class=\"meta-copy\">Solo administrador</span>"
                }
              </div>
            </td>
            <td>${escapeHtml(user.full_name || "Sin nombre")}</td>
            <td>${escapeHtml(user.email || "Sin correo")}</td>
            <td>
              ${escapeHtml(user.role || "Sin rol")}
              <div class="meta-copy">Permisos: ${escapeHtml(permissionsLabel)}</div>
              <span class="pill ${statusClass}">${statusLabel}</span>
            </td>
            <td>${escapeHtml(createdLabel)}</td>
          </tr>
        `;
      })
      .join("");
  }
  const showing = Math.min(total, pageSize);
  elements.usersSummary.textContent = total
    ? `Mostrando registros del 1 al ${showing} de un total de ${total} registros.`
    : "Sin registros.";
}

function renderRecords() {
  const records = getConsultorioScopedRecords();
  renderList(
    elements.recordsList,
    records,
    (record) => `
      <article class="list-card">
        <header>
          <div>
            <h4>${escapeHtml(record.patient_name)}</h4>
            <p>${formatDateTime(record.opened_at)} / ${escapeHtml(record.owner_name)}</p>
          </div>
          <span class="${statusClass(record.status)}">${escapeHtml(humanStatus(record.status))}</span>
        </header>
        <p>Area: ${escapeHtml(record.payload?.care_area || "Consultorio")}</p>
        <p>${escapeHtml(truncate(record.reason_for_consultation || "Sin motivo registrado"))}</p>
        <p>Consultas internas: ${record.consultations_count || 0} / Evoluciones: ${record.evolutions_count || 0}</p>
        <div class="item-actions">
          <button data-select-record="${escapeHtml(record.id)}" data-mode="evolution">Usar en evolucion</button>
          <button data-select-record="${escapeHtml(record.id)}" data-mode="consultation">Agregar consulta</button>
        </div>
      </article>
    `,
    isConsultorioPatientProfileActive()
      ? "Este paciente aun no tiene historias clinicas registradas."
      : "Aun no hay historias clinicas registradas."
  );
}

function renderConsultations() {
  const profileConfig = isConsultorioPatientProfileActive() ? getConsultorioProfileViewConfig() : null;
  const visibleConsultations = getConsultorioScopedConsultations(profileConfig?.consultationTypes || null);
  renderList(
    elements.consultationsList,
    visibleConsultations,
    (consultation) => {
      const hospAmbDetails = isHospAmbConsultationType(consultation.consultation_type)
        ? parseConsultorioHospAmbDetails(consultation)
        : null;
      return `
        <article class="list-card">
          <header>
            <div>
              <h4>${escapeHtml(consultation.title)}</h4>
              <p>${escapeHtml(consultation.consultation_type)} / ${formatDateTime(
                consultation.consultation_at
              )}</p>
            </div>
            <span class="${statusClass(
              consultation.consent_required ? "confirmed" : "scheduled"
            )}">${consultation.consent_required ? "Con consentimiento" : "Sin consentimiento"}</span>
          </header>
          <p>Paciente: ${escapeHtml(consultation.patient_name)}</p>
          <p>${escapeHtml(
            isFormulaConsultationType(consultation.consultation_type)
              ? getConsultorioFormulaMedicationLabel(consultation)
              : hospAmbDetails
              ? truncate([hospAmbDetails.reason, hospAmbDetails.observations].filter(Boolean).join(" | "))
              : truncate(consultation.summary)
          )}</p>
          <p>${escapeHtml(
            isFormulaConsultationType(consultation.consultation_type)
              ? ""
              : hospAmbDetails
              ? truncate(
                  [
                    hospAmbDetails.dischargeReason,
                    hospAmbDetails.dischargeAt ? formatDateTime(hospAmbDetails.dischargeAt) : "",
                  ]
                    .filter(Boolean)
                    .join(" / ")
                )
              : consultation.document_reference || consultation.referred_to || ""
          )}</p>
        </article>
      `;
    },
    isConsultorioPatientProfileActive()
      ? "Este paciente aun no tiene registros en esta seccion."
      : "Aun no hay consultas internas registradas."
  );
}

function renderConsents() {
  const consents = getConsultorioScopedConsents();
  const consentSummary = Object.entries(
    consents.reduce((acc, consent) => {
      const key = consent.consent_type || "Sin tipo";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  );
  renderSummary(
    elements.consentTypeList,
    consentSummary,
    isConsultorioPatientProfileActive()
      ? "Este paciente aun no tiene consentimientos registrados."
      : "Aun no hay consentimientos registrados."
  );
  renderList(
    elements.consentsList,
    consents,
    (consent) => `
      <article class="list-card">
        <header>
          <div>
            <h4>${escapeHtml(consent.patient_name)}</h4>
            <p>${escapeHtml(consent.consent_type)} / ${formatDateTime(consent.signed_at)}</p>
          </div>
          <span class="pill pill--confirmed">${escapeHtml(consent.procedure_name)}</span>
        </header>
        <p>Tutor: ${escapeHtml(consent.owner_name)}</p>
        <p>Historia: ${escapeHtml(consent.record_label || "Sin adjuntar")}</p>
        <p>Consulta: ${escapeHtml(consent.consultation_label || "Sin adjuntar")}</p>
      </article>
    `,
    isConsultorioPatientProfileActive()
      ? "Este paciente aun no tiene consentimientos registrados."
      : "Aun no hay consentimientos registrados."
  );
}

function renderGrooming() {
  const groomingDocuments = getConsultorioScopedGrooming();
  renderList(
    elements.groomingList,
    groomingDocuments,
    (item) => `
      <article class="list-card">
        <header>
          <div>
            <h4>${escapeHtml(item.patient_name)}</h4>
            <p>${escapeHtml(item.service_name)} / ${formatDateTime(item.service_at)}</p>
          </div>
          <span class="${statusClass(item.status)}">${escapeHtml(humanStatus(item.status))}</span>
        </header>
        <p>${escapeHtml(item.document_type)}</p>
        <p>Responsable: ${escapeHtml(item.stylist_name)}</p>
        <p>${escapeHtml(truncate(item.recommendations || item.notes || "Sin observaciones"))}</p>
      </article>
    `,
    isConsultorioPatientProfileActive()
      ? "Este paciente aun no tiene documentos de peluqueria."
      : "Aun no hay documentos de peluqueria."
  );
}

function renderHospAmb() {
  const hospitalizacion = state.consultations.filter(
    (item) => item.consultation_type === "Hospitalizacion"
  );
  const ambulatorio = state.consultations.filter(
    (item) => item.consultation_type === "Ambulatorio"
  );
  const procedimientos = state.consultations.filter((item) =>
    ["Cirugia / procedimiento", "Seguimiento", "Remision"].includes(item.consultation_type)
  );
  const renderer = (consultation) => `
    <article class="list-card">
      <h4>${escapeHtml(consultation.patient_name)}</h4>
      <p>${escapeHtml(consultation.title)}</p>
      <p>${formatDateTime(consultation.consultation_at)}</p>
    </article>
  `;
  renderList(elements.hospitalizationList, hospitalizacion, renderer, "Sin consultas de hospitalizacion.");
  renderList(elements.ambulatoryList, ambulatorio, renderer, "Sin consultas ambulatorias.");
  renderList(elements.procedureList, procedimientos, renderer, "Sin procedimientos o remisiones.");
}

function renderRequests() {
  const requests = state.requests || {};
  renderList(
    elements.requestRecordsList,
    requests.clinical_records || [],
    (record) => `
      <article class="list-card">
        <h4>${escapeHtml(record.patient_name)}</h4>
        <p>${escapeHtml(humanStatus(record.status))}</p>
        <p>${escapeHtml(truncate(record.reason_for_consultation || "Sin motivo"))}</p>
      </article>
    `,
    "No hay historias pendientes."
  );
  renderList(
    elements.requestAppointmentsList,
    requests.appointments || [],
    (appointment) => `
      <article class="list-card">
        <h4>${escapeHtml(appointment.patient_name)}</h4>
        <p>${formatDateTime(appointment.appointment_at)}</p>
        <p>${escapeHtml(appointment.reason)}</p>
      </article>
    `,
    "No hay citas pendientes."
  );
  renderList(
    elements.requestOrdersList,
    requests.orders || [],
    (consultation) => `
      <article class="list-card">
        <h4>${escapeHtml(consultation.patient_name)}</h4>
        <p>${escapeHtml(consultation.consultation_type)}</p>
        <p>${escapeHtml(consultation.title)}</p>
      </article>
    `,
    "No hay ordenes pendientes."
  );
  renderList(
    elements.requestBillingList,
    requests.billing_documents || [],
    (document) => `
      <article class="list-card">
        <h4>${escapeHtml(document.document_number)} / ${escapeHtml(document.patient_name)}</h4>
        <p>${escapeHtml(document.owner_name)}</p>
        <p>Saldo: ${formatMoney(document.balance_due || 0)}</p>
      </article>
    `,
    "No hay facturas pendientes."
  );
}

function renderReports() {
  const reports = state.reports || {};
  const totals = reports.totals || {};
  elements.reportOwnersTotal.textContent = totals.owners ?? 0;
  elements.reportPatientsTotal.textContent = totals.patients ?? 0;
  elements.reportRecordsTotal.textContent = totals.records ?? 0;
  elements.reportConsultationsTotal.textContent = totals.consultations ?? 0;
  elements.reportAppointmentsTotal.textContent = totals.appointments ?? 0;
  elements.reportGroomingTotal.textContent = totals.grooming_documents ?? 0;
  elements.reportBillingDocumentsTotal.textContent = totals.billing_documents ?? 0;
  elements.reportProvidersTotal.textContent = totals.providers ?? 0;
  elements.reportCatalogItemsTotal.textContent = totals.catalog_items ?? 0;
  renderList(
    elements.reportsOwnersList,
    reports.owners || [],
    (owner) => `<article class="list-card"><h4>${escapeHtml(owner.full_name)}</h4><p>Mascotas: ${
      owner.patients_count || 0
    }</p></article>`,
    "Sin datos de propietarios."
  );
  renderList(
    elements.reportsPatientsList,
    reports.patients || [],
    (patient) => `<article class="list-card"><h4>${escapeHtml(patient.name)}</h4><p>${escapeHtml(
      patient.owner_name
    )}</p></article>`,
    "Sin datos de pacientes."
  );
  renderSummary(
    elements.reportsConsultationTypeList,
    Object.entries(reports.consultations_by_type || {}),
    "Sin datos de consultas."
  );
  renderSummary(
    elements.reportsAppointmentsDayList,
    Object.entries(reports.appointments_by_day || {}),
    "Sin datos de agenda."
  );
  renderSummary(
    elements.reportsGroomingStatusList,
    Object.entries(reports.grooming_by_status || {}),
    "Sin datos de peluqueria."
  );
  renderList(
    elements.reportsRecentRecordsList,
    reports.recent_records || [],
    (record) => `<article class="list-card"><h4>${escapeHtml(record.patient_name)}</h4><p>${escapeHtml(
      humanStatus(record.status)
    )}</p><p>${formatDateTime(record.opened_at)}</p></article>`,
    "Sin registros clinicos."
  );
  renderList(
    elements.reportsAuditList,
    reports.recent_audit || [],
    (audit) => `<article class="list-card"><h4>${escapeHtml(audit.entity_type)}</h4><p>${escapeHtml(
      audit.action
    )}</p><p>${formatDateTime(audit.created_at)}</p></article>`,
    "Sin auditoria."
  );
  renderSummary(
    elements.reportsBillingSummaryList,
    getBillingSummaryEntries(reports.billing || {}),
    "Sin datos de facturacion."
  );
  renderList(
    elements.reportsProvidersList,
    reports.providers || [],
    (provider) => `<article class="list-card"><h4>${escapeHtml(provider.name)}</h4><p>${
      provider.items_count || 0
    } items asociados</p></article>`,
    "Sin proveedores."
  );
  renderList(
    elements.reportsCatalogList,
    reports.catalog_items || [],
    (item) => `<article class="list-card"><h4>${escapeHtml(item.name)}</h4><p>${escapeHtml(
      item.category
    )}</p><p>${formatMoney(item.unit_price || 0)}</p></article>`,
    "Sin catalogo."
  );
  renderList(
    elements.reportsBillingDocumentsList,
    reports.recent_billing_documents || [],
    (document) => `<article class="list-card"><h4>${escapeHtml(document.document_number)}</h4><p>${escapeHtml(
      document.patient_name
    )}</p><p>${formatMoney(document.total || 0)} / ${escapeHtml(document.status)}</p></article>`,
    "Sin facturacion."
  );
  renderList(
    elements.reportsCashMovementsList,
    reports.cash_movements || [],
    (movement) => `<article class="list-card"><h4>${escapeHtml(movement.concept)}</h4><p>${formatMoney(
      movement.amount || 0
    )}</p><p>${escapeHtml(humanStatus(movement.movement_type))}</p></article>`,
    "Sin movimientos de caja."
  );
}

function renderCompliance() {
  const compliance = state.compliance || {};
  elements.complianceNotes.innerHTML = `
    <article class="compliance-note">
      <p><strong>Jurisdiccion:</strong> ${escapeHtml(compliance.jurisdiction || "N/D")}</p>
      <p>${escapeHtml(compliance.retention_policy_note || "")}</p>
      <p>${escapeHtml(compliance.disclaimer || "")}</p>
    </article>
    <article class="compliance-note">
      <p><strong>Secciones requeridas</strong></p>
      <p>${escapeHtml((compliance.required_sections || []).join(" | "))}</p>
    </article>
  `;
  renderList(
    elements.complianceSources,
    compliance.sources || [],
    (source) => `
      <article class="list-card source-card">
        <h4><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(
          source.title
        )}</a></h4>
        <p>${escapeHtml(source.summary || "")}</p>
      </article>
    `,
    "Sin fuentes de referencia."
  );
}

function getProfessionalOptions() {
  const names = new Set();
  (state.availability_rules || []).forEach((rule) => {
    const name = String(rule.professional_name || "").trim();
    if (name) {
      names.add(name);
    }
  });
  (state.appointments || []).forEach((appointment) => {
    const name = String(appointment.professional_name || "").trim();
    if (name) {
      names.add(name);
    }
  });
  if (!names.size) {
    names.add("Agenda general");
  } else if (!names.has("Agenda general")) {
    names.add("Agenda general");
  }
  return Array.from(names)
    .sort((left, right) => left.localeCompare(right, "es"))
    .map((label) => ({ id: label, label }));
}

function getOwnerById(ownerId) {
  return (state.owners || []).find((owner) => owner.id === ownerId) || null;
}

function getPatientById(patientId) {
  return (state.patients || []).find((patient) => patient.id === patientId) || null;
}

function getRecordById(recordId) {
  return (state.records || []).find((record) => record.id === recordId) || null;
}

function getConsultationById(consultationId) {
  return (state.consultations || []).find((consultation) => consultation.id === consultationId) || null;
}

function buildOwnerLabel(owner) {
  const parts = [owner.full_name];
  if (owner.identification_number) {
    parts.push(owner.identification_number);
  }
  if (owner.phone || owner.alternate_phone) {
    parts.push(owner.phone || owner.alternate_phone);
  }
  return parts.filter(Boolean).join(" / ");
}

function normalizeQuery(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .split(/[\s/]+/)
    .filter(Boolean);
}

function matchesOwner(owner, query) {
  const tokens = normalizeQuery(query);
  if (!tokens.length) {
    return true;
  }
  const haystack = [
    owner.full_name,
    owner.identification_number,
    owner.phone,
    owner.alternate_phone,
    owner.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function buildAppointmentPatientLabel(patient) {
  const owner = getOwnerById(patient.owner_id);
  const ownerName = owner?.full_name || patient.owner_name || "Sin propietario";
  const ownerId = owner?.identification_number || "";
  const ownerPhone = owner?.phone || owner?.alternate_phone || "";
  const parts = [ownerName, patient.name, patient.species];
  if (ownerId) {
    parts.push(ownerId);
  }
  if (ownerPhone) {
    parts.push(ownerPhone);
  }
  return parts.join(" / ");
}

function buildOwnerOnlyLabel(owner) {
  return `${buildOwnerLabel(owner)} / (sin mascota registrada)`;
}

function matchesAppointmentPatient(patient, query) {
  const tokens = normalizeQuery(query);
  if (!tokens.length) {
    return true;
  }
  const owner = getOwnerById(patient.owner_id);
  const haystack = [
    patient.name,
    patient.species,
    patient.breed,
    patient.owner_name,
    owner?.full_name,
    owner?.identification_number,
    owner?.phone,
    owner?.alternate_phone,
    owner?.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function renderAppointmentPatientDropdown() {
  const query = String(elements.appointmentPatientInput?.value || "")
    .trim()
    .toLowerCase();
  const current = elements.appointmentPatientId?.value || "";
  const allPatients = state.patients || [];
  const owners = state.owners || [];
  const patients = query
    ? allPatients.filter((patient) => matchesAppointmentPatient(patient, query))
    : allPatients;
  const ownerMatches = query ? owners.filter((owner) => matchesOwner(owner, query)) : owners;
  const dropdown = elements.appointmentPatientDropdown;
  if (dropdown) {
    const items = [];
    if (patients.length) {
      patients.forEach((patient) => {
        const label = buildAppointmentPatientLabel(patient);
        items.push(`
          <button
            type="button"
            class="appointment-dropdown__item"
            data-patient-id="${escapeHtml(patient.id)}"
            data-owner-id="${escapeHtml(patient.owner_id || "")}"
            data-patient-label="${escapeHtml(label)}"
          >
            ${escapeHtml(label)}
          </button>
        `);
      });
      const ownersWithoutPets = ownerMatches.filter(
        (owner) => !allPatients.some((patient) => patient.owner_id === owner.id)
      );
      ownersWithoutPets.forEach((owner) => {
        const label = buildOwnerOnlyLabel(owner);
        items.push(`
          <button
            type="button"
            class="appointment-dropdown__item"
            data-owner-id="${escapeHtml(owner.id)}"
            data-owner-label="${escapeHtml(label)}"
          >
            ${escapeHtml(label)}
          </button>
        `);
      });
    } else if (ownerMatches.length) {
      const ownersWithoutPets = ownerMatches.filter(
        (owner) => !allPatients.some((patient) => patient.owner_id === owner.id)
      );
      ownersWithoutPets.forEach((owner) => {
        const label = buildOwnerOnlyLabel(owner);
        items.push(`
          <button
            type="button"
            class="appointment-dropdown__item"
            data-owner-id="${escapeHtml(owner.id)}"
            data-owner-label="${escapeHtml(label)}"
          >
            ${escapeHtml(label)}
          </button>
        `);
      });
    } else {
      items.push(`<div class="appointment-dropdown__item is-muted">Sin resultados</div>`);
    }
    dropdown.innerHTML = items.join("");
    const shouldShowDropdown =
      items.length > 0 && document.activeElement === elements.appointmentPatientInput;
    dropdown.classList.toggle("is-hidden", !shouldShowDropdown);
  }
  if (elements.appointmentPatientHelper) {
    let message = "";
    if (!patients.length) {
      const allPatientsEmpty = !allPatients.length;
      if (allPatientsEmpty) {
        message = "Aun no hay mascotas registradas. Debes registrar una mascota para agendar.";
      } else if (query) {
        if (ownerMatches.length) {
          const preview = ownerMatches
            .slice(0, 3)
            .map((owner) => buildOwnerLabel(owner))
            .join(" | ");
          const suffix = ownerMatches.length > 3 ? " | ..." : "";
          message = `Propietario encontrado. Puedes seleccionarlo y registrar la mascota luego: ${preview}${suffix}`;
        } else {
          message = "No encontramos mascotas con ese propietario o documento.";
        }
      } else {
        message = "";
      }
    }
    elements.appointmentPatientHelper.textContent = message;
  }
  if (current && patients.every((item) => item.id !== current) && elements.appointmentPatientId) {
    elements.appointmentPatientId.value = "";
  }
  if (current && elements.appointmentPatientInput && !elements.appointmentPatientInput.value) {
    const selectedPatient = allPatients.find((patient) => patient.id === current);
    if (selectedPatient) {
      elements.appointmentPatientInput.value = buildAppointmentPatientLabel(selectedPatient);
    }
  }
}

function renderSelects() {
  const scopedPatient = isConsultorioPatientProfileActive() ? getConsultorioPatient() : null;
  const scopedRecords = scopedPatient
    ? state.records.filter((record) => record.patient_id === scopedPatient.id)
    : state.records;
  const scopedConsents = scopedPatient
    ? state.consents.filter((consent) => consent.patient_id === scopedPatient.id)
    : state.consents;
  const scopedConsultations = scopedPatient
    ? state.consultations.filter((consultation) => consultation.patient_id === scopedPatient.id)
    : state.consultations;
  populateSelect(
    elements.patientOwnerSelect,
    state.owners,
    (owner) => `${owner.full_name} - ${owner.identification_number}`,
    "Selecciona propietario"
  );
  populateSelect(
    elements.catalogProviderSelect,
    state.providers,
    (provider) => provider.name,
    "Proveedor opcional"
  );
  const patientLabel = (patient) => `${patient.name} / ${patient.species} / ${patient.owner_name}`;
  renderAppointmentPatientDropdown();
  [
    elements.billingPatientSelect,
    elements.recordPatientSelect,
    elements.consentPatientSelect,
    elements.groomingPatientSelect,
  ].forEach((select) => populateSelect(select, state.patients, patientLabel, "Selecciona paciente"));
  populateSelect(
    elements.appointmentProfessionalSelect,
    getProfessionalOptions(),
    (option) => option.label,
    "Selecciona una opcion"
  );
  const recordLabel = (record) => `${record.patient_name} / ${formatDateTime(record.opened_at)}`;
  [elements.consultationRecordSelect, elements.evolutionRecordSelect, elements.consentRecordSelect].forEach(
    (select) => populateSelect(select, scopedRecords, recordLabel, "Selecciona historia")
  );
  populateSelect(
    elements.consultationConsentSelect,
    scopedConsents,
    (consent) => `${consent.patient_name} / ${consent.procedure_name}`,
    "Consentimiento opcional"
  );
  populateSelect(
    elements.consentConsultationSelect,
    scopedConsultations,
    (consultation) => `${consultation.patient_name} / ${consultation.title}`,
    "Consulta opcional"
  );
  populateSelect(
    elements.billingLineItemSelect,
    state.catalog_items,
    (item) => `${item.name} / ${formatMoney(item.unit_price || 0)}`,
    "Selecciona item"
  );
  populateSelect(
    elements.stockAdjustmentItemSelect,
    state.catalog_items.filter((item) => item.track_inventory),
    (item) => `${item.name} / stock ${Number(item.stock_quantity || 0)}`,
    "Selecciona item"
  );
  populateSelect(
    elements.billingPaymentDocumentSelect,
    state.billing_documents.filter(
      (document) => document.document_type === "factura" && document.status === "Pendiente"
    ),
    (document) =>
      `${document.document_number} / ${document.patient_name} / saldo ${formatMoney(
        document.balance_due || 0
      )}`,
    "Selecciona factura pendiente"
  );
  if (scopedPatient) {
    [elements.recordPatientSelect, elements.consentPatientSelect, elements.groomingPatientSelect].forEach(
      (select) => {
        if (select) {
          select.value = scopedPatient.id;
        }
      }
    );
  }
}

function resetForm(form) {
  if (!form || typeof form.reset !== "function") {
    return;
  }
  form.reset();
}

function setDateTimeDefaults() {
  const current = toInputDateTime(new Date().toISOString());
  const currentDate = new Date().toISOString().slice(0, 10);
  [
    "appointmentForm",
    "billingDocumentForm",
    "billingPaymentForm",
    "cashMovementForm",
    "stockAdjustmentForm",
    "recordForm",
    "consultationForm",
    "evolutionForm",
    "consentForm",
    "groomingForm",
  ].forEach((formId) => {
    const form = elements[formId];
    if (!form) {
      return;
    }
    form.querySelectorAll('input[type="datetime-local"]').forEach((input) => {
      if (!input.value) {
        input.value = current;
      }
    });
    form.querySelectorAll('input[type="date"]').forEach((input) => {
      if (!input.value) {
        input.value = currentDate;
      }
    });
  });
}

function getActiveSectionId() {
  return activeSectionId;
}

function renderSection(sectionId) {
  switch (sectionId) {
    case "dashboard":
      renderDashboard();
      return;
    case "administration":
      renderUsers();
      return;
    case "agenda":
      renderAppointments();
      renderAvailability();
      renderSelects();
      return;
    case "sales":
      renderSales();
      renderSelects();
      renderBillingDraftLines();
      syncBillingDocumentFormState();
      return;
    case "consultorio":
      syncConsultorioSelectionState();
      renderOwners();
      renderPatients();
      renderConsultorioOwnerDetail();
      renderConsultorioPatientProfile();
      renderRecords();
      renderConsultations();
      renderConsents();
      renderGrooming();
      renderSelects();
      return;
    case CONSULTORIO_PATIENT_PROFILE_SECTION_ID:
      syncConsultorioSelectionState();
      renderConsultorioPatientProfile();
      renderSelects();
      return;
    case "hospamb":
      renderHospAmb();
      return;
    case "requests":
      renderRequests();
      return;
    case "reports":
      renderReports();
      return;
    default:
      renderDashboard();
  }
}

function renderAll() {
  applySettingsForm();
  renderCompliance();
  renderSection(getActiveSectionId());
  saveAppViewState();
}

function markBootstrapSectionsLoaded(sections) {
  (sections || []).forEach((section) => {
    loadedBootstrapSections.add(section);
    pendingBootstrapSections.delete(section);
  });
}

function markBootstrapSectionsPending(sections) {
  (sections || []).forEach((section) => pendingBootstrapSections.add(section));
}

function clearBootstrapSectionsPending(sections) {
  (sections || []).forEach((section) => pendingBootstrapSections.delete(section));
}

function getMissingBootstrapSections(sections) {
  return (sections || []).filter(
    (section) => !loadedBootstrapSections.has(section) && !pendingBootstrapSections.has(section)
  );
}

function getSectionDataRequirements(sectionId) {
  if (sectionId === CONSULTORIO_PATIENT_PROFILE_SECTION_ID) {
    const baseRequirements = ["owners", "patients"];
    const profileRequirements = consultorioPatientId
      ? getConsultorioProfileViewConfig()?.dataRequirements || []
      : [];
    return Array.from(new Set([...baseRequirements, ...profileRequirements]));
  }
  if (sectionId === "consultorio") {
    const subsectionValue = activeSubsections[sectionId] || "patients";
    if (subsectionValue === "grooming") {
      return ["owners", "patients", "grooming_documents"];
    }
    const baseRequirements = ["owners", "patients"];
    const profileRequirements = consultorioPatientId
      ? getConsultorioProfileViewConfig()?.dataRequirements || []
      : [];
    return Array.from(new Set([...baseRequirements, ...profileRequirements]));
  }
  const subsectionValue = activeSubsections[sectionId];
  const subsectionRequirements =
    SUBSECTION_DATA_REQUIREMENTS[sectionId]?.[subsectionValue] || null;
  return subsectionRequirements || SECTION_DATA_REQUIREMENTS[sectionId] || [];
}

async function ensureSectionData(sectionId, options = {}) {
  const { showError = true } = options;
  const requiredSections = getSectionDataRequirements(sectionId);
  const missingSections = getMissingBootstrapSections(requiredSections);
  if (!missingSections.length) {
    return true;
  }
  markBootstrapSectionsPending(missingSections);
  try {
    await refreshData({ sections: missingSections });
    return true;
  } catch (error) {
    clearBootstrapSectionsPending(missingSections);
    if (showError) {
      showStatus(error.message || "No fue posible cargar los datos de esta seccion.", "error");
    }
    return false;
  }
}

async function refreshData(options = {}) {
  let message = "";
  let lite = false;
  let sections = null;
  let render = true;
  if (typeof options === "string") {
    message = options;
  } else {
    ({ message = "", lite = false, sections = null, render = true } = options || {});
  }
  const payload = await api.bootstrap({ lite, sections });
  Object.assign(state, payload);
  if (!lite) {
    if (Array.isArray(sections) && sections.length) {
      markBootstrapSectionsLoaded(sections);
    } else {
      markBootstrapSectionsLoaded(ALL_BOOTSTRAP_SECTIONS);
    }
  }
  const shouldCache =
    !lite &&
    (!sections ||
      (Array.isArray(sections) &&
        sections.length === BOOTSTRAP_CORE_SECTIONS.length &&
        sections.every((item) => BOOTSTRAP_CORE_SECTIONS.includes(item))));
  if (shouldCache) {
    saveBootstrapCache(payload);
  }
  if (!toIsoDate(agendaSelectedDate)) {
    agendaSelectedDate = toIsoDate(new Date());
  }
  if (render) {
    renderAll();
  }
  if (message) {
    showStatus(message, "success");
  }
}

function setAgendaSelectedDate(value) {
  agendaSelectedDate = value;
  const selected = parseIsoDate(value);
  agendaViewDate = new Date(selected.getFullYear(), selected.getMonth(), 1);
  renderAvailability();
}

function shiftAgendaWeek(direction) {
  const current = parseIsoDate(agendaSelectedDate);
  const next = addDays(current, direction * 7);
  setAgendaSelectedDate(toIsoDate(next));
}

function setAgendaToday() {
  agendaSelectedDate = toIsoDate(new Date());
  agendaViewDate = new Date();
  renderAvailability();
}

function shiftAgendaView(direction) {
  if (agendaViewMode === "month") {
    agendaViewDate = new Date(agendaViewDate.getFullYear(), agendaViewDate.getMonth() + direction, 1);
    renderAvailability();
    return;
  }
  const current = parseIsoDate(agendaSelectedDate);
  const multiplier = agendaViewMode === "day" ? 1 : 7;
  const next = addDays(current, direction * multiplier);
  setAgendaSelectedDate(toIsoDate(next));
}

function setAgendaViewMode(mode) {
  if (!AGENDA_VIEW_MODES.includes(mode)) {
    return;
  }
  agendaViewMode = mode;
  try {
    localStorage.setItem(AGENDA_VIEW_STORAGE_KEY, mode);
  } catch (error) {
    // ignore storage errors
  }
  renderAvailability();
}

function syncAgendaViewTabs() {
  if (!elements.agendaViewTabs) {
    return;
  }
  elements
    .agendaViewTabs
    .querySelectorAll("[data-agenda-view]")
    .forEach((button) => {
      button.classList.toggle("is-active", button.dataset.agendaView === agendaViewMode);
    });
}

function toggleAgendaViewPanels() {
  const panels = {
    month: elements.agendaMonthView,
    week: elements.agendaWeekView,
    day: elements.agendaDayView,
    list: elements.agendaListView,
    programador: elements.agendaProgramView,
  };
  Object.entries(panels).forEach(([key, panel]) => {
    if (!panel) {
      return;
    }
    panel.classList.toggle("is-hidden", key !== agendaViewMode);
  });
}

function parseAppointmentDateTime(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function buildAppointmentEndValue(startValue, minutes = 30) {
  const start = parseAppointmentDateTime(startValue);
  if (!start) {
    return "";
  }
  return toInputDateTime(addMinutes(start, minutes));
}

function renderAppointmentSlotsStrip() {
  if (!elements.appointmentSlotsStrip) {
    return;
  }
  if (elements.appointmentNoTimeCheckbox?.checked) {
    elements.appointmentSlotsStrip.innerHTML = "";
    elements.appointmentSlotsStrip.classList.add("is-hidden");
    return;
  }
  const startValue = elements.appointmentStartInput?.value || "";
  const dateValue = toIsoDate(startValue) || agendaSelectedDate;
  const slots = getAvailableSlotsForDate(dateValue);
  if (!slots.length) {
    elements.appointmentSlotsStrip.innerHTML =
      '<div class="appointment-slots-empty">No hay horarios disponibles.</div>';
    elements.appointmentSlotsStrip.classList.remove("is-hidden");
    return;
  }
  const selectedValue = startValue ? toInputDateTime(startValue) : "";
  const items = slots.map((slot) => {
    const duration = Number(slot.duration_minutes || 30);
    const localValue = toInputDateTime(slot.slot_at);
    const isSelected = selectedValue && localValue === selectedValue;
    const label = `${slot.label} · ${duration} min`;
    return `
      <button
        type="button"
        class="appointment-slot-pill${isSelected ? " is-selected" : ""}"
        data-slot-at="${escapeHtml(slot.slot_at)}"
        data-slot-minutes="${duration}"
      >
        ${escapeHtml(label)}
      </button>
    `;
  });
  elements.appointmentSlotsStrip.innerHTML = items.join("");
  elements.appointmentSlotsStrip.classList.remove("is-hidden");
}

function syncAppointmentSelectedDate() {
  if (!elements.appointmentModalSelectedDate) {
    return;
  }
  const startValue = elements.appointmentStartInput?.value || "";
  const targetDate = toIsoDate(startValue) || agendaSelectedDate;
  elements.appointmentModalSelectedDate.textContent = formatAgendaDateLabel(targetDate);
  renderAppointmentSlotsStrip();
}

function syncAppointmentEndTime({ force = false } = {}) {
  if (!elements.appointmentStartInput || !elements.appointmentEndInput) {
    return;
  }
  const durationValue = Number(elements.appointmentDurationInput?.value || 30);
  const startValue = elements.appointmentStartInput.value;
  if (!startValue) {
    return;
  }
  const start = parseAppointmentDateTime(startValue);
  if (!start) {
    return;
  }
  const endValue = elements.appointmentEndInput.value;
  const end = parseAppointmentDateTime(endValue);
  if (force || !end || end <= start) {
    elements.appointmentEndInput.value = buildAppointmentEndValue(startValue, durationValue || 30);
  }
}

function toggleAppointmentNoTime(checked) {
  if (!elements.appointmentEndInput) {
    return;
  }
  elements.appointmentEndInput.disabled = checked;
  if (checked) {
    syncAppointmentEndTime({ force: true });
  }
  renderAppointmentSlotsStrip();
}

function selectAppointmentSlot(slotAt, durationMinutes) {
  if (!slotAt || !elements.appointmentStartInput) {
    return;
  }
  elements.appointmentStartInput.value = toInputDateTime(slotAt);
  if (elements.appointmentDurationInput) {
    elements.appointmentDurationInput.value = String(durationMinutes || 30);
  }
  syncAppointmentEndTime({ force: true });
  syncAppointmentSelectedDate();
}

function captureAppointmentDraft() {
  if (!elements.appointmentForm) {
    return null;
  }
  const payload = serializeForm(elements.appointmentForm);
  if (elements.appointmentPatientInput) {
    payload.owner_search = elements.appointmentPatientInput.value || "";
  }
  if (elements.appointmentPatientId) {
    payload.patient_id = elements.appointmentPatientId.value || "";
  }
  if (elements.appointmentOwnerId) {
    payload.owner_id = elements.appointmentOwnerId.value || payload.owner_id || "";
  }
  if (elements.appointmentStartInput) {
    payload.appointment_at = elements.appointmentStartInput.value || "";
  }
  if (elements.appointmentEndInput) {
    payload.appointment_end_at = elements.appointmentEndInput.value || "";
  }
  return payload;
}

function restoreAppointmentDraft(draft) {
  if (!draft || !elements.appointmentForm) {
    return;
  }
  if (elements.appointmentPatientInput) {
    elements.appointmentPatientInput.value = draft.owner_search || "";
  }
  if (elements.appointmentPatientId) {
    elements.appointmentPatientId.value = draft.patient_id || "";
  }
  if (elements.appointmentOwnerId) {
    elements.appointmentOwnerId.value = draft.owner_id || "";
  }
  if (elements.appointmentTypeSelect) {
    elements.appointmentTypeSelect.value = draft.appointment_type || "";
  }
  if (elements.appointmentProfessionalSelect) {
    elements.appointmentProfessionalSelect.value = draft.professional_name || "";
  }
  if (elements.appointmentStartInput) {
    elements.appointmentStartInput.value = draft.appointment_at || "";
  }
  if (elements.appointmentEndInput) {
    elements.appointmentEndInput.value = draft.appointment_end_at || "";
  }
  if (elements.appointmentReserveCheckbox) {
    elements.appointmentReserveCheckbox.checked = Boolean(draft.reserve_only);
  }
  if (elements.appointmentNoTimeCheckbox) {
    elements.appointmentNoTimeCheckbox.checked = Boolean(draft.appointment_no_time);
    toggleAppointmentNoTime(elements.appointmentNoTimeCheckbox.checked);
  }
  if (elements.appointmentNoLocationCheckbox) {
    elements.appointmentNoLocationCheckbox.checked =
      typeof draft.appointment_no_location === "boolean"
        ? draft.appointment_no_location
        : true;
  }
  if (elements.appointmentForm.elements.reason) {
    elements.appointmentForm.elements.reason.value = draft.reason || "";
  }
  if (elements.appointmentForm.elements.notes) {
    elements.appointmentForm.elements.notes.value = draft.notes || "";
  }
  renderAppointmentPatientDropdown();
  syncAppointmentSelectedDate();
  if (elements.appointmentEndInput && !draft.appointment_end_at) {
    syncAppointmentEndTime({ force: true });
  }
}

function maybeReturnToAppointmentModal() {
  if (!returnToAppointmentModal) {
    return;
  }
  const draft = pendingAppointmentDraft;
  returnToAppointmentModal = false;
  pendingAppointmentDraft = null;
  openAppointmentModal(draft?.appointment_at || "");
  restoreAppointmentDraft(draft);
}

function openOwnerModalFromAppointment() {
  pendingAppointmentDraft = captureAppointmentDraft();
  returnToAppointmentModal = true;
  closeAppointmentModal();
  openOwnerModal();
}

function openAppointmentModalForDate(dateValue) {
  const targetDate = toIsoDate(dateValue) || agendaSelectedDate;
  if (!targetDate) {
    openAppointmentModal();
    return;
  }
  setAgendaSelectedDate(targetDate);
  const slots = getAvailableSlotsForDate(targetDate);
  if (slots.length) {
    openAppointmentModal(slots[0].slot_at, Number(slots[0].duration_minutes || 30));
    return;
  }
  openAppointmentModal(`${targetDate}T08:00`, Number(elements.appointmentDurationInput?.value || 30));
}

function openAppointmentModalForSlot(slotAt, durationMinutes) {
  const targetDate = toIsoDate(slotAt);
  if (targetDate) {
    setAgendaSelectedDate(targetDate);
  }
  openAppointmentModal(slotAt, durationMinutes);
}

function openAppointmentModal(initialDateTime = "", durationMinutes = 30) {
  const dateTimeValue = initialDateTime || `${agendaSelectedDate}T08:00`;
  elements.appointmentModal.classList.remove("is-hidden");
  elements.appointmentModal.setAttribute("aria-hidden", "false");
  if (elements.appointmentModalTitle) {
    elements.appointmentModalTitle.textContent = "Crear evento";
  }
  if (elements.appointmentIdInput) {
    elements.appointmentIdInput.value = "";
  }
  if (elements.appointmentStatusInput) {
    elements.appointmentStatusInput.value = "scheduled";
  }
  if (elements.appointmentStartInput) {
    elements.appointmentStartInput.value = toInputDateTime(dateTimeValue);
  }
  if (elements.appointmentEndInput) {
    elements.appointmentEndInput.value = buildAppointmentEndValue(dateTimeValue, durationMinutes);
  }
  if (elements.appointmentDurationInput) {
    elements.appointmentDurationInput.value = String(durationMinutes || 30);
  }
  if (elements.appointmentPatientInput) {
    elements.appointmentPatientInput.value = "";
  }
  if (elements.appointmentPatientId) {
    elements.appointmentPatientId.value = "";
  }
  if (elements.appointmentOwnerId) {
    elements.appointmentOwnerId.value = "";
  }
  if (elements.appointmentReserveCheckbox) {
    elements.appointmentReserveCheckbox.checked = false;
  }
  if (elements.appointmentNoTimeCheckbox) {
    elements.appointmentNoTimeCheckbox.checked = false;
    toggleAppointmentNoTime(false);
  }
  if (elements.appointmentNoLocationCheckbox) {
    elements.appointmentNoLocationCheckbox.checked = true;
  }
  if (elements.appointmentTypeSelect) {
    elements.appointmentTypeSelect.value = "";
  }
  if (elements.appointmentProfessionalSelect && elements.appointmentProfessionalSelect.options.length) {
    const hasAgenda = Array.from(elements.appointmentProfessionalSelect.options).some(
      (option) => option.value === "Agenda general"
    );
    if (hasAgenda) {
      elements.appointmentProfessionalSelect.value = "Agenda general";
    }
  }
  renderAppointmentPatientDropdown();
  syncAppointmentSelectedDate();
}

function openAppointmentModalForEdit(appointment) {
  if (!appointment) {
    return;
  }
  openAppointmentModal(appointment.appointment_at, Number(appointment.duration_minutes || 30));
  if (elements.appointmentModalTitle) {
    elements.appointmentModalTitle.textContent = "Editar cita";
  }
  if (elements.appointmentIdInput) {
    elements.appointmentIdInput.value = appointment.id || "";
  }
  if (elements.appointmentStatusInput) {
    elements.appointmentStatusInput.value = appointment.status || "scheduled";
  }
  const patient = (state.patients || []).find((item) => item.id === appointment.patient_id);
  const owner = appointment.owner_id ? getOwnerById(appointment.owner_id) : null;
  const label = patient
    ? buildAppointmentPatientLabel(patient)
    : owner
      ? buildOwnerOnlyLabel(owner)
      : appointment.owner_name || "";
  if (elements.appointmentPatientInput) {
    elements.appointmentPatientInput.value = label;
  }
  if (elements.appointmentPatientId) {
    elements.appointmentPatientId.value = appointment.patient_id || "";
  }
  if (elements.appointmentOwnerId) {
    elements.appointmentOwnerId.value = appointment.owner_id || "";
  }
  if (elements.appointmentProfessionalSelect) {
    elements.appointmentProfessionalSelect.value =
      appointment.professional_name || "Agenda general";
  }
  if (elements.appointmentTypeSelect) {
    elements.appointmentTypeSelect.value = "";
  }
  if (elements.appointmentForm?.elements?.reason) {
    elements.appointmentForm.elements.reason.value = appointment.reason || "";
  }
  if (elements.appointmentForm?.elements?.notes) {
    elements.appointmentForm.elements.notes.value = appointment.notes || "";
  }
  renderAppointmentPatientDropdown();
  syncAppointmentSelectedDate();
}

function closeAppointmentModal() {
  elements.appointmentModal.classList.add("is-hidden");
  elements.appointmentModal.setAttribute("aria-hidden", "true");
}

function openAppointmentDetailModal(appointmentId) {
  if (!elements.appointmentDetailModal) {
    return;
  }
  const appointment = (state.appointments || []).find((item) => item.id === appointmentId);
  if (!appointment) {
    showStatus("No se encontro la cita seleccionada.", "error");
    return;
  }
  const duration = Number(appointment.duration_minutes || 30);
  const start = new Date(appointment.appointment_at);
  let subtitle = formatDateTime(appointment.appointment_at);
  if (!Number.isNaN(start.getTime())) {
    const end = addMinutes(start, duration);
    const dateLabel = start.toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    subtitle = `${dateLabel} · ${formatAgendaTimeShort(start)} - ${formatAgendaTimeShort(end)}`;
  }
  if (elements.appointmentDetailTitle) {
    elements.appointmentDetailTitle.textContent =
      appointment.reason || appointment.patient_name || "Detalle de cita";
  }
  if (elements.appointmentDetailSubtitle) {
    elements.appointmentDetailSubtitle.textContent = subtitle;
  }
  if (elements.appointmentDetailStatus) {
    elements.appointmentDetailStatus.innerHTML = `<span class="${statusClass(
      appointment.status
    )}">${escapeHtml(humanStatus(appointment.status))}</span>`;
  }
  const summary = [
    ["Propietario", appointment.owner_name || "Sin dato"],
    ["Paciente", appointment.patient_name || "Sin dato"],
    ["Encargado", appointment.professional_name || "Agenda general"],
    ["Duracion", `${duration} min`],
  ];
  renderSummary(elements.appointmentDetailSummary, summary, "Sin informacion disponible.");
  if (elements.appointmentDetailNotes) {
    elements.appointmentDetailNotes.textContent = appointment.notes || "Sin descripcion";
  }
  if (elements.appointmentDetailLinks) {
    const links = [];
    if (appointment.google_event_url) {
      links.push(
        `<a href="${escapeHtml(
          appointment.google_event_url
        )}" target="_blank" rel="noreferrer">Abrir en Google Calendar</a>`
      );
    }
    if (appointment.google_sync_status) {
      links.push(
        `Sync Google: ${escapeHtml(appointment.google_sync_status)}${
          appointment.google_sync_error ? ` / ${escapeHtml(appointment.google_sync_error)}` : ""
        }`
      );
    }
    elements.appointmentDetailLinks.innerHTML = links.join("");
    elements.appointmentDetailLinks.classList.toggle("is-hidden", !links.length);
  }
  elements.appointmentDetailModal.classList.remove("is-hidden");
  elements.appointmentDetailModal.setAttribute("aria-hidden", "false");
}

function closeAppointmentDetailModal() {
  if (!elements.appointmentDetailModal) {
    return;
  }
  elements.appointmentDetailModal.classList.add("is-hidden");
  elements.appointmentDetailModal.setAttribute("aria-hidden", "true");
}

function openAvailabilityModal() {
  elements.availabilityModal.classList.remove("is-hidden");
  elements.availabilityModal.setAttribute("aria-hidden", "false");
}

function closeAvailabilityModal() {
  elements.availabilityModal.classList.add("is-hidden");
  elements.availabilityModal.setAttribute("aria-hidden", "true");
}

function openOwnerModal(owner = null) {
  if (!elements.ownerModal || !elements.ownerForm) {
    return;
  }
  elements.ownerForm.reset();
  elements.ownerForm.elements.id.value = owner?.id || "";
  elements.ownerForm.elements.full_name.value = owner?.full_name || "";
  elements.ownerForm.elements.identification_type.value = owner?.identification_type || "";
  elements.ownerForm.elements.identification_number.value = owner?.identification_number || "";
  elements.ownerForm.elements.phone.value = owner?.phone || "";
  if (elements.ownerForm.elements.alternate_phone) {
    elements.ownerForm.elements.alternate_phone.value = owner?.alternate_phone || "";
  }
  elements.ownerForm.elements.email.value = owner?.email || "";
  elements.ownerForm.elements.address.value = owner?.address || "";
  const title = getElement("ownerModalTitle");
  if (title) {
    title.textContent = owner ? "Editar propietario" : "Registro de propietario";
  }
  elements.ownerModal.classList.remove("is-hidden");
  elements.ownerModal.setAttribute("aria-hidden", "false");
}

function closeOwnerModal(options = {}) {
  if (!elements.ownerModal) {
    return;
  }
  const { suppressReturn = false } = options || {};
  elements.ownerModal.classList.add("is-hidden");
  elements.ownerModal.setAttribute("aria-hidden", "true");
  if (!suppressReturn) {
    maybeReturnToAppointmentModal();
  }
}

function normalizeDateFieldValue(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return toIsoDate(parsed);
}

function ensurePatientConsultationReasonOption(value) {
  if (!elements.patientConsultationReasonSelect || !value) {
    return;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return;
  }
  const exists = Array.from(elements.patientConsultationReasonSelect.options).some(
    (option) => option.value === normalized
  );
  if (!exists) {
    const dynamicOption = document.createElement("option");
    dynamicOption.value = normalized;
    dynamicOption.textContent = normalized;
    elements.patientConsultationReasonSelect.appendChild(dynamicOption);
  }
}

const CONSULTORIO_IMAGE_ATTACHMENT_MAX_DIMENSION = 1280;
const CONSULTORIO_IMAGE_ATTACHMENT_MAX_DATA_URL_LENGTH = 1_200_000;

function normalizeConsultorioAttachmentItem(item) {
  if (!item) {
    return null;
  }
  if (typeof item === "string") {
    const value = item.trim();
    return value
      ? {
          kind: "text",
          value,
        }
      : null;
  }
  if (typeof item !== "object") {
    return null;
  }
  const kind = String(item.kind || item.type || "").trim().toLowerCase();
  if (kind === "image") {
    const dataUrl = String(item.dataUrl || item.url || "").trim();
    if (!dataUrl) {
      return null;
    }
    return {
      kind: "image",
      name: String(item.name || item.label || "Imagen clinica").trim() || "Imagen clinica",
      dataUrl,
      mimeType: String(item.mimeType || item.mime_type || "image/jpeg").trim() || "image/jpeg",
    };
  }
  const value = String(item.value || item.label || item.name || "").trim();
  return value
    ? {
        kind: "text",
        value,
      }
    : null;
}

function parseConsultorioAttachments(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return [];
  }
  if (rawValue.startsWith("[") || rawValue.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawValue);
      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.items)
          ? parsed.items
          : [];
      return items.map(normalizeConsultorioAttachmentItem).filter(Boolean);
    } catch (error) {
      // Compatibilidad con adjuntos antiguos guardados como texto.
    }
  }
  return rawValue
    .split(/\r?\n+/)
    .map((item) => normalizeConsultorioAttachmentItem(item))
    .filter(Boolean);
}

function serializeConsultorioAttachments(items = []) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => normalizeConsultorioAttachmentItem(item))
    .filter(Boolean);
  return normalizedItems.length ? JSON.stringify(normalizedItems) : "";
}

function buildConsultorioAttachmentPreviewMarkup(items = [], options = {}) {
  const { compact = false } = options;
  const attachments = (Array.isArray(items) ? items : [])
    .map((item) => normalizeConsultorioAttachmentItem(item))
    .filter(Boolean);
  if (!attachments.length) {
    return compact ? `<span class="consultorio-attachment-placeholder">-</span>` : "";
  }
  const imageLimit = compact ? 1 : 4;
  const textLimit = compact ? 1 : 3;
  let renderedCount = 0;
  let renderedImages = 0;
  let renderedText = 0;
  const content = attachments
    .map((item) => {
      if (item.kind === "image") {
        if (renderedImages >= imageLimit) {
          return "";
        }
        renderedImages += 1;
        renderedCount += 1;
        return `
          <a
            class="consultorio-attachment-thumb"
            href="${escapeHtml(item.dataUrl)}"
            target="_blank"
            rel="noreferrer"
            title="${escapeHtml(item.name || "Imagen clinica")}"
          >
            <img src="${escapeHtml(item.dataUrl)}" alt="${escapeHtml(item.name || "Imagen clinica")}" loading="lazy" />
          </a>
        `;
      }
      if (renderedText >= textLimit) {
        return "";
      }
      renderedText += 1;
      renderedCount += 1;
      return `<span class="consultorio-attachment-tag">${escapeHtml(
        truncate(item.value || "Adjunto", compact ? 26 : 44)
      )}</span>`;
    })
    .filter(Boolean);
  const remaining = attachments.length - renderedCount;
  if (remaining > 0) {
    content.push(`<span class="consultorio-attachment-more">+${remaining}</span>`);
  }
  return `
    <div class="consultorio-attachment-gallery${compact ? " consultorio-attachment-gallery--compact" : ""}">
      ${content.join("")}
    </div>
  `;
}

function readConsultorioFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
}

function loadConsultorioImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo procesar la imagen seleccionada."));
    image.src = dataUrl;
  });
}

function getConsultorioScaledDimensions(width, height, maxDimension) {
  if (!width || !height || Math.max(width, height) <= maxDimension) {
    return { width, height };
  }
  const ratio = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

async function buildConsultorioImageAttachment(file) {
  if (!file || !String(file.type || "").startsWith("image/")) {
    throw new Error("Solo puedes adjuntar archivos de imagen.");
  }
  const sourceDataUrl = await readConsultorioFileAsDataUrl(file);
  const image = await loadConsultorioImage(sourceDataUrl);
  const dimensions = getConsultorioScaledDimensions(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    CONSULTORIO_IMAGE_ATTACHMENT_MAX_DIMENSION
  );
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar la imagen para adjuntarla.");
  }
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
  let mimeType = file.type === "image/png" || file.type === "image/webp" ? "image/webp" : "image/jpeg";
  let quality = mimeType === "image/jpeg" ? 0.82 : 0.84;
  let dataUrl = canvas.toDataURL(mimeType, quality);
  if (dataUrl.length > CONSULTORIO_IMAGE_ATTACHMENT_MAX_DATA_URL_LENGTH && mimeType !== "image/jpeg") {
    mimeType = "image/jpeg";
    quality = 0.82;
    dataUrl = canvas.toDataURL(mimeType, quality);
  }
  while (
    dataUrl.length > CONSULTORIO_IMAGE_ATTACHMENT_MAX_DATA_URL_LENGTH &&
    quality > 0.55
  ) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL(mimeType, quality);
  }
  if (dataUrl.length > CONSULTORIO_IMAGE_ATTACHMENT_MAX_DATA_URL_LENGTH) {
    throw new Error("La imagen es demasiado pesada. Usa una imagen mas liviana.");
  }
  return {
    kind: "image",
    name: String(file.name || "imagen-clinica").trim(),
    dataUrl,
    mimeType,
  };
}

async function addPatientConsultationAttachmentImages(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) {
    return;
  }
  const currentItems = getPatientConsultationAttachments();
  for (const file of files) {
    currentItems.push(await buildConsultorioImageAttachment(file));
  }
  setPatientConsultationAttachments(currentItems);
}

function renderConsultorioAttachmentFieldState(valueElement, listElement, items = []) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => normalizeConsultorioAttachmentItem(item))
    .filter(Boolean);
  if (valueElement) {
    valueElement.value = serializeConsultorioAttachments(normalizedItems);
  }
  if (listElement) {
    listElement.innerHTML = normalizedItems.length
      ? normalizedItems
          .map(
            (item, index) => `
              <div class="consultorio-consultation-attachment consultorio-consultation-attachment--${escapeHtml(
                item.kind
              )}">
                ${
                  item.kind === "image"
                    ? `
                      <a
                        class="consultorio-consultation-attachment__preview"
                        href="${escapeHtml(item.dataUrl)}"
                        target="_blank"
                        rel="noreferrer"
                        title="${escapeHtml(item.name || "Imagen clinica")}"
                      >
                        <img
                          class="consultorio-consultation-attachment__thumbnail"
                          src="${escapeHtml(item.dataUrl)}"
                          alt="${escapeHtml(item.name || "Imagen clinica")}"
                          loading="lazy"
                        />
                      </a>
                    `
                    : ""
                }
                <span class="consultorio-consultation-attachment__body">
                  <strong>${item.kind === "image" ? "Imagen clinica" : "Referencia"}</strong>
                  <span>${escapeHtml(
                    truncate(item.kind === "image" ? item.name || "Imagen clinica" : item.value || "Adjunto", 52)
                  )}</span>
                </span>
                <button
                  class="ghost-button"
                  type="button"
                  data-remove-patient-consultation-attachment="${escapeHtml(String(index))}"
                >
                  Quitar
                </button>
              </div>
            `
          )
          .join("")
      : "";
  }
}

function getConsultorioAttachmentFieldItems(valueElement) {
  return parseConsultorioAttachments(valueElement?.value || "");
}

function setPatientConsultationAttachments(items = []) {
  renderConsultorioAttachmentFieldState(
    elements.patientConsultationAttachmentsValue,
    elements.patientConsultationAttachmentsList,
    items
  );
}

function getPatientConsultationAttachments() {
  return getConsultorioAttachmentFieldItems(elements.patientConsultationAttachmentsValue);
}

async function addPatientDewormingAttachmentImages(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) {
    return;
  }
  const currentItems = getPatientDewormingAttachments();
  for (const file of files) {
    currentItems.push(await buildConsultorioImageAttachment(file));
  }
  setPatientDewormingAttachments(currentItems);
}

function setPatientDewormingAttachments(items = []) {
  renderConsultorioAttachmentFieldState(
    elements.patientDewormingAttachmentsValue,
    elements.patientDewormingAttachmentsList,
    items
  );
}

function getPatientDewormingAttachments() {
  return getConsultorioAttachmentFieldItems(elements.patientDewormingAttachmentsValue);
}

function closePatientConsultationModal() {
  if (!elements.patientConsultationModal) {
    return;
  }
  elements.patientConsultationModal.classList.add("is-hidden");
  elements.patientConsultationModal.setAttribute("aria-hidden", "true");
  document.body?.classList.remove("modal-open");
}

function syncPatientVaccinationCustomField() {
  const showCustom =
    elements.patientVaccinationNameSelect?.value === CONSULTORIO_VACCINATION_CUSTOM_OPTION;
  elements.patientVaccinationCustomNameInput?.classList.toggle("is-hidden", !showCustom);
  if (!showCustom && elements.patientVaccinationCustomNameInput) {
    elements.patientVaccinationCustomNameInput.value = "";
  }
}

function setPatientVaccinationNameValue(value) {
  const normalized = String(value || "").trim();
  if (!elements.patientVaccinationNameSelect) {
    return;
  }
  const matchesPredefined = Array.from(elements.patientVaccinationNameSelect.options).some(
    (option) =>
      option.value &&
      option.value !== CONSULTORIO_VACCINATION_CUSTOM_OPTION &&
      option.value === normalized
  );
  if (!normalized) {
    elements.patientVaccinationNameSelect.value = "";
    if (elements.patientVaccinationCustomNameInput) {
      elements.patientVaccinationCustomNameInput.value = "";
    }
    syncPatientVaccinationCustomField();
    return;
  }
  if (matchesPredefined) {
    elements.patientVaccinationNameSelect.value = normalized;
    if (elements.patientVaccinationCustomNameInput) {
      elements.patientVaccinationCustomNameInput.value = "";
    }
    syncPatientVaccinationCustomField();
    return;
  }
  elements.patientVaccinationNameSelect.value = CONSULTORIO_VACCINATION_CUSTOM_OPTION;
  if (elements.patientVaccinationCustomNameInput) {
    elements.patientVaccinationCustomNameInput.value = normalized;
  }
  syncPatientVaccinationCustomField();
}

function getPatientVaccinationNameValue(form) {
  const selected = String(form?.elements?.vaccination_name?.value || "").trim();
  if (selected === CONSULTORIO_VACCINATION_CUSTOM_OPTION) {
    return String(form?.elements?.vaccination_name_custom?.value || "").trim();
  }
  return selected;
}

function renderPatientFormulaMedications(items = []) {
  if (!elements.patientFormulaMedicationsList) {
    return;
  }
  const normalizedItems = (Array.isArray(items) ? items : []).map((item) =>
    createConsultorioFormulaMedication(item)
  );
  const rows = normalizedItems.length ? normalizedItems : [createConsultorioFormulaMedication()];
  elements.patientFormulaMedicationsList.innerHTML = rows
    .map(
      (item, index) => `
        <article class="consultorio-formula-medication" data-formula-medication-item="${escapeHtml(String(index))}">
          <div class="consultorio-formula-medication__header">
            <strong>Medicamento</strong>
            <button
              class="ghost-button consultorio-formula-medication__remove"
              type="button"
              data-remove-patient-formula-medication="${escapeHtml(String(index))}"
            >
              Eliminar
            </button>
          </div>
          <div class="consultorio-formula-medication__grid">
            <label class="consultorio-consultation-form__field">
              <span>Nombre</span>
              <input
                data-formula-medication-field="name"
                type="text"
                value="${escapeHtml(item.name)}"
                placeholder="Nombre"
              />
            </label>
            <label class="consultorio-consultation-form__field">
              <span>Presentacion</span>
              <input
                data-formula-medication-field="presentation"
                type="text"
                value="${escapeHtml(item.presentation)}"
                placeholder="Presentacion"
              />
            </label>
            <label class="consultorio-consultation-form__field">
              <span>Cantidad</span>
              <input
                data-formula-medication-field="quantity"
                type="number"
                min="1"
                step="1"
                value="${escapeHtml(item.quantity || "1")}"
                placeholder="1"
              />
            </label>
            <label class="consultorio-consultation-form__field consultorio-formula-medication__dosage">
              <span>Posologia (Forma de administracion)</span>
              <input
                data-formula-medication-field="dosage"
                type="text"
                value="${escapeHtml(item.dosage)}"
                placeholder="Posologia (Forma de administracion)"
              />
            </label>
          </div>
        </article>
      `
    )
    .join("");
}

function getPatientFormulaMedications({ includeEmpty = false } = {}) {
  if (!elements.patientFormulaMedicationsList) {
    return [];
  }
  const medications = Array.from(
    elements.patientFormulaMedicationsList.querySelectorAll("[data-formula-medication-item]")
  )
    .map((item) =>
      createConsultorioFormulaMedication({
        name: item.querySelector('[data-formula-medication-field="name"]')?.value || "",
        presentation:
          item.querySelector('[data-formula-medication-field="presentation"]')?.value || "",
        quantity: item.querySelector('[data-formula-medication-field="quantity"]')?.value || "1",
        dosage: item.querySelector('[data-formula-medication-field="dosage"]')?.value || "",
      })
    );
  return includeEmpty
    ? medications
    : medications.filter((item) => hasConsultorioFormulaMedicationContent(item));
}

function openPatientConsultationModal(consultation = null) {
  if (!elements.patientConsultationModal || !elements.patientConsultationForm) {
    return;
  }
  const patient = getConsultorioPatient();
  if (!patient) {
    showStatus("Selecciona una mascota para registrar la consulta.", "info");
    return;
  }
  const record = consultation ? getRecordById(consultation.record_id) : getConsultorioPrimaryRecord();
  if (consultation && !record) {
    showStatus(
      "No se encontro la historia clinica asociada a esta consulta.",
      "error"
    );
    return;
  }
  const form = elements.patientConsultationForm;
  const profileConfig =
    CONSULTORIO_PROFILE_VIEW_MAP[consultorioProfileView] || getConsultorioProfileViewConfig();
  const defaultConsultationType =
    consultation?.consultation_type ||
    profileConfig?.formConsultationType ||
    "Consulta";
  const isVaccinationMode = isVaccinationConsultationType(defaultConsultationType);
  const isFormulaMode = isFormulaConsultationType(defaultConsultationType);
  const isDewormingMode = isDewormingConsultationType(defaultConsultationType);
  const isHospAmbMode =
    isHospAmbConsultationType(defaultConsultationType) || profileConfig?.value === "hospamb";
  const defaultTitle =
    consultation?.title || getConsultorioProfileDefaultConsultationTitle(profileConfig);
  form.reset();
  const details = parseConsultorioConsultationDetails(consultation);
  const vaccinationDetails = parseConsultorioVaccinationDetails(consultation);
  const formulaDetails = parseConsultorioFormulaDetails(consultation);
  const dewormingDetails = parseConsultorioDewormingDetails(consultation);
  const hospAmbDetails = parseConsultorioHospAmbDetails(consultation);
  form.elements.id.value = consultation?.id || "";
  form.elements.record_id.value = record?.id || "";
  form.elements.consultation_type.value = defaultConsultationType;
  form.elements.professional_name.value =
    consultation?.professional_name || getDefaultConsultorioProfessionalName();
  form.elements.professional_license.value =
    consultation?.professional_license || getDefaultConsultorioProfessionalLicense();
  form.elements.consultation_at.value = toInputDateTime(
    consultation?.consultation_at || new Date().toISOString()
  );
  if (!isHospAmbMode) {
    ensurePatientConsultationReasonOption(defaultTitle);
    form.elements.title.value = defaultTitle;
  }
  form.elements.subjective.value = details.subjective || "";
  form.elements.objective.value = details.objective || "";
  form.elements.interpretation.value = details.interpretation || "";
  form.elements.therapeutic_plan.value = details.therapeuticPlan || "";
  form.elements.diagnostic_plan.value = details.diagnosticPlan || "";
  form.elements.next_control.value = normalizeDateFieldValue(details.nextControl);
  if (form.elements.hospamb_type) {
    form.elements.hospamb_type.value = hospAmbDetails.type || defaultConsultationType;
  }
  if (form.elements.hospamb_admission_at) {
    form.elements.hospamb_admission_at.value =
      hospAmbDetails.admissionAt || toInputDateTime(new Date().toISOString());
  }
  if (form.elements.hospamb_discharge_reason) {
    form.elements.hospamb_discharge_reason.value = hospAmbDetails.dischargeReason || "";
  }
  if (form.elements.hospamb_discharge_at) {
    form.elements.hospamb_discharge_at.value = hospAmbDetails.dischargeAt || "";
  }
  if (form.elements.hospamb_reason) {
    form.elements.hospamb_reason.value = hospAmbDetails.reason || "";
  }
  if (form.elements.hospamb_observations) {
    form.elements.hospamb_observations.value = hospAmbDetails.observations || "";
  }
  if (form.elements.vaccination_date) {
    form.elements.vaccination_date.value =
      vaccinationDetails.vaccinationDate || normalizeDateFieldValue(new Date().toISOString());
  }
  if (form.elements.vaccination_lab) {
    form.elements.vaccination_lab.value = vaccinationDetails.laboratory || "";
  }
  if (form.elements.vaccination_lot) {
    form.elements.vaccination_lot.value = vaccinationDetails.lot || "";
  }
  if (form.elements.vaccination_notes) {
    form.elements.vaccination_notes.value = vaccinationDetails.observations || "";
  }
  if (form.elements.vaccination_next_control) {
    form.elements.vaccination_next_control.value = normalizeDateFieldValue(
      vaccinationDetails.nextVaccination
    );
  }
  if (form.elements.formula_date) {
    form.elements.formula_date.value =
      formulaDetails.formulaDate || normalizeDateFieldValue(new Date().toISOString());
  }
  if (form.elements.formula_diagnosis) {
    form.elements.formula_diagnosis.value = formulaDetails.diagnosis || "";
  }
  if (form.elements.formula_observations) {
    form.elements.formula_observations.value = formulaDetails.observations || "";
  }
  renderPatientFormulaMedications(formulaDetails.medications);
  if (form.elements.deworming_date) {
    form.elements.deworming_date.value =
      dewormingDetails.dewormingDate || normalizeDateFieldValue(new Date().toISOString());
  }
  if (form.elements.deworming_last_date) {
    form.elements.deworming_last_date.value = dewormingDetails.lastDeworming || "";
  }
  if (form.elements.deworming_type) {
    form.elements.deworming_type.value = dewormingDetails.type || "";
  }
  if (form.elements.deworming_product) {
    form.elements.deworming_product.value = dewormingDetails.product || "";
  }
  if (form.elements.deworming_dose) {
    form.elements.deworming_dose.value = dewormingDetails.dose || "";
  }
  if (form.elements.deworming_notes) {
    form.elements.deworming_notes.value = dewormingDetails.observations || "";
  }
  if (form.elements.deworming_next_control) {
    form.elements.deworming_next_control.value = dewormingDetails.nextControl || "";
  }
  setPatientVaccinationNameValue(vaccinationDetails.name || defaultTitle);
  Object.entries(details.examGeneral || {}).forEach(([fieldName, fieldValue]) => {
    if (form.elements[fieldName]) {
      form.elements[fieldName].value = fieldValue || "";
    }
  });
  Object.entries(details.examSpecial || {}).forEach(([fieldName, fieldValue]) => {
    if (form.elements[fieldName]) {
      form.elements[fieldName].value = fieldValue || "No evaluado";
    }
  });
  if (elements.patientConsultationAttachmentFileInput) {
    elements.patientConsultationAttachmentFileInput.value = "";
  }
  if (elements.patientDewormingAttachmentFileInput) {
    elements.patientDewormingAttachmentFileInput.value = "";
  }
  setPatientConsultationAttachments(parseConsultorioAttachments(consultation?.attachments_summary || ""));
  setPatientDewormingAttachments(parseConsultorioAttachments(consultation?.attachments_summary || ""));
  if (elements.patientConsultationModalTitle) {
    const entityLabel = isHospAmbMode
      ? "Hospitalizaci\u00f3n/ambulatorio"
      : getConsultorioProfileModalEntityLabel(defaultConsultationType);
    elements.patientConsultationModalTitle.textContent = `${
      consultation ? `Editar ${entityLabel}` : `Registro de ${entityLabel}`
    } - ${patient.name || "Paciente"}`;
  }
  if (elements.patientConsultationModalSubtitle) {
    elements.patientConsultationModalSubtitle.textContent = "";
    elements.patientConsultationModalSubtitle.classList.add("is-hidden");
  }
  if (elements.patientConsultationModalBadge) {
    const badgeText =
      isVaccinationMode || isFormulaMode || isDewormingMode
        ? formatConsultorioWeightBadge(patient)
        : "";
    elements.patientConsultationModalBadge.textContent = badgeText;
    elements.patientConsultationModalBadge.classList.toggle("is-hidden", !badgeText);
  }
  if (elements.patientHospAmbFields) {
    elements.patientHospAmbFields.classList.toggle("is-hidden", !isHospAmbMode);
  }
  if (elements.patientVaccinationFields) {
    elements.patientVaccinationFields.classList.toggle("is-hidden", !isVaccinationMode);
  }
  if (elements.patientFormulaFields) {
    elements.patientFormulaFields.classList.toggle("is-hidden", !isFormulaMode);
  }
  if (elements.patientDewormingFields) {
    elements.patientDewormingFields.classList.toggle("is-hidden", !isDewormingMode);
  }
  if (elements.patientConsultationClinicalFields) {
    elements.patientConsultationClinicalFields.classList.toggle(
      "is-hidden",
      isVaccinationMode || isFormulaMode || isDewormingMode || isHospAmbMode
    );
  }
  const modalCard = elements.patientConsultationModal.querySelector(".modal-card");
  elements.patientConsultationModal.classList.toggle("modal-shell--hospamb", isHospAmbMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--hospamb", isHospAmbMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--vaccination", isVaccinationMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--formula", isFormulaMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--deworming", isDewormingMode);
  elements.patientConsultationModalIcon?.classList.toggle("is-hospamb", isHospAmbMode);
  if (elements.closePatientConsultationModalButton) {
    elements.closePatientConsultationModalButton.innerHTML = "&times;";
  }
  if (elements.patientConsultationRecordLabel) {
    elements.patientConsultationRecordLabel.textContent =
      isVaccinationMode || isFormulaMode || isDewormingMode || isHospAmbMode
        ? ""
        : record
        ? `Historia clinica vinculada: ${record.id}`
        : "La historia clinica se creara automaticamente al guardar esta consulta.";
    elements.patientConsultationRecordLabel.classList.toggle(
      "is-hidden",
      isVaccinationMode || isFormulaMode || isDewormingMode || isHospAmbMode
    );
  }
  form
    .querySelector(".consultorio-consultation-form__footer")
    ?.classList.toggle(
      "consultorio-consultation-form__footer--align-end",
      isVaccinationMode || isFormulaMode || isDewormingMode || isHospAmbMode
    );
  elements.patientConsultationModal.classList.remove("is-hidden");
  elements.patientConsultationModal.setAttribute("aria-hidden", "false");
  document.body?.classList.add("modal-open");
  elements.patientConsultationModal.querySelector(".modal-card")?.scrollTo({ top: 0, behavior: "auto" });
  if (isFormulaMode && form.elements.formula_date) {
    form.elements.formula_date.focus();
  } else if (isVaccinationMode && form.elements.vaccination_date) {
    form.elements.vaccination_date.focus();
  } else if (isDewormingMode && form.elements.deworming_date) {
    form.elements.deworming_date.focus();
  } else if (isHospAmbMode && form.elements.hospamb_type) {
    form.elements.hospamb_type.focus();
  } else {
    form.elements.consultation_at.focus();
  }
}

function openUserModal(user = null) {
  if (!elements.userModal || !elements.userForm) {
    return;
  }
  elements.userForm.reset();
  if (elements.userFormError) {
    elements.userFormError.textContent = "";
    elements.userFormError.classList.add("is-hidden");
  }
  elements.userForm.elements.id.value = user?.id || "";
  elements.userForm.elements.full_name.value = user?.full_name || "";
  elements.userForm.elements.email.value = user?.email || "";
  elements.userForm.elements.role.value = user?.role || "Veterinario";
  elements.userForm.elements.is_active.checked = user?.is_active ?? true;
  if (elements.userForm.elements.password) {
    elements.userForm.elements.password.value = "";
  }
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const hasAll = permissions.length >= permissionOptions.length;
  elements.userForm.elements.permissions_all.checked = hasAll;
  permissionOptions.forEach((option) => {
    const field = elements.userForm.elements[`perm_${option.key}`];
    if (field) {
      field.checked = hasAll || permissions.includes(option.key);
    }
  });
  elements.userModal.classList.remove("is-hidden");
  elements.userModal.setAttribute("aria-hidden", "false");
}

function setUserFormError(message) {
  if (!elements.userFormError) {
    return;
  }
  elements.userFormError.textContent = message || "";
  elements.userFormError.classList.toggle("is-hidden", !message);
}

function closeUserModal() {
  if (!elements.userModal) {
    return;
  }
  elements.userModal.classList.add("is-hidden");
  elements.userModal.setAttribute("aria-hidden", "true");
}

function openAgendaAppointmentsModal() {
  elements.agendaAppointmentsModal.classList.remove("is-hidden");
  elements.agendaAppointmentsModal.setAttribute("aria-hidden", "false");
}

function closeAgendaAppointmentsModal() {
  elements.agendaAppointmentsModal.classList.add("is-hidden");
  elements.agendaAppointmentsModal.setAttribute("aria-hidden", "true");
}

function openLoginModal(force = false) {
  if (!elements.loginModal) {
    return;
  }
  if (elements.loginError) {
    elements.loginError.textContent = "";
    elements.loginError.classList.add("is-hidden");
  }
  elements.loginModal.dataset.force = force ? "1" : "0";
  elements.loginModal.classList.remove("is-hidden");
  elements.loginModal.setAttribute("aria-hidden", "false");
}

function closeLoginModal() {
  if (!elements.loginModal) {
    return;
  }
  if (elements.loginModal.dataset.force === "1" && !authState.authenticated) {
    return;
  }
  elements.loginModal.dataset.force = "0";
  elements.loginModal.classList.add("is-hidden");
  elements.loginModal.setAttribute("aria-hidden", "true");
}

function setAuthUI(authenticated) {
  if (document?.body) {
    const shouldLock = authState.requiresLogin && !authenticated;
    document.body.classList.toggle("auth-locked", shouldLock);
  }
  if (elements.logoutButton) {
    elements.logoutButton.classList.toggle("is-hidden", !authenticated);
  }
  syncAdminControls();
  applyPermissionsVisibility();
}

async function handleOwnerDelete(ownerId) {
  const owner = getOwnerById(ownerId);
  if (!owner) {
    throw new Error("No se encontro el propietario seleccionado.");
  }
  const confirmed = window.confirm(
    `Eliminar al propietario ${owner.full_name || ""}? Esta accion no se puede deshacer.`
  );
  if (!confirmed) {
    return;
  }
  await api.deleteOwner(ownerId);
  if (getConsultorioPatient()?.owner_id === ownerId) {
    consultorioPatientId = "";
    consultorioProfileView = "records";
    consultorioPatientProfileOpen = false;
  }
  if (consultorioOwnerId === ownerId) {
    consultorioOwnerId = "";
  }
  resetPatientEditor();
  await refreshData({
    sections: OWNER_PATIENT_REFRESH_SECTIONS,
    message: "Propietario eliminado.",
  });
  setActiveSection("consultorio");
  setSectionSubsection("consultorio", "patients");
}

async function handlePatientDelete(patientId) {
  const patient = getPatientById(patientId);
  if (!patient) {
    throw new Error("No se encontro la mascota seleccionada.");
  }
  const confirmed = window.confirm(
    `Eliminar a ${patient.name || "esta mascota"}? Esta accion no se puede deshacer.`
  );
  if (!confirmed) {
    return;
  }
  await api.deletePatient(patientId);
  if (consultorioPatientId === patientId) {
    consultorioPatientId = "";
    consultorioProfileView = "records";
    consultorioPatientProfileOpen = false;
  }
  if (elements.patientForm?.elements?.id?.value === patientId) {
    resetPatientEditor();
  }
  await refreshData({
    sections: OWNER_PATIENT_REFRESH_SECTIONS,
    message: "Paciente eliminado.",
  });
  setActiveSection("consultorio");
  setSectionSubsection("consultorio", "patients");
}

async function handleOwnersListClick(event) {
  const patientButton = event.target.closest("[data-patient-select]");
  if (patientButton) {
    const patient = getPatientById(patientButton.dataset.patientSelect || "");
    if (!patient) {
      throw new Error("No se encontro la mascota seleccionada.");
    }
    consultorioProfileView = "records";
    openConsultorioPatientProfile(patient);
    return;
  }
  const editButton = event.target.closest("[data-owner-edit]");
  if (editButton) {
    const owner = getOwnerById(editButton.dataset.ownerEdit || "");
    if (!owner) {
      throw new Error("No se encontro el propietario seleccionado.");
    }
    openOwnerModal(owner);
    return;
  }
  const deleteButton = event.target.closest("[data-owner-delete]");
  if (deleteButton) {
    await handleOwnerDelete(deleteButton.dataset.ownerDelete || "");
    return;
  }
  const selectButton = event.target.closest("[data-owner-select]");
  if (!selectButton) {
    return;
  }
  consultorioOwnerId = selectButton.dataset.ownerSelect || "";
  consultorioPatientId = "";
  consultorioProfileView = "records";
  consultorioPatientProfileOpen = false;
  consultorioPatientsFilters.query = "";
  if (elements.ownerPatientsSearchInput) {
    elements.ownerPatientsSearchInput.value = "";
  }
  resetPatientEditor();
  setSectionSubsection("consultorio", "patients");
  renderConsultorioOwnerDetail();
  renderPatients();
}

async function handlePatientsListClick(event) {
  const selectButton = event.target.closest("[data-patient-select]");
  if (selectButton) {
    const patient = getPatientById(selectButton.dataset.patientSelect || "");
    if (!patient) {
      throw new Error("No se encontro la mascota seleccionada.");
    }
    consultorioProfileView = "records";
    openConsultorioPatientProfile(patient);
    return;
  }
  const editButton = event.target.closest("[data-patient-edit]");
  if (editButton) {
    const patient = getPatientById(editButton.dataset.patientEdit || "");
    if (!patient) {
      throw new Error("No se encontro la mascota seleccionada.");
    }
    consultorioPatientId = patient.id;
    consultorioOwnerId = patient.owner_id || consultorioOwnerId;
    openPatientEditor(patient);
    return;
  }
  const deleteButton = event.target.closest("[data-patient-delete]");
  if (deleteButton) {
    await handlePatientDelete(deleteButton.dataset.patientDelete || "");
  }
}


function applyConsentTemplate(type) {
  const template = consentTemplates[type];
  if (!template) {
    return;
  }
  const fields = {
    risks_explained: template.risks,
    benefits_expected: template.benefits,
    alternatives: template.alternatives,
    owner_statement: template.statement,
  };
  Object.entries(fields).forEach(([name, value]) => {
    const field = elements.consentForm.elements[name];
    if (!field || String(field.value || "").trim()) {
      return;
    }
    field.value = value;
  });
}

async function handleSettingsSubmit(event) {
  event.preventDefault();
  await api.saveSettings({ ...state.settings, ...serializeForm(event.currentTarget) });
  await refreshData("Configuracion actualizada.");
}

async function handleBillingSettingsSubmit(event) {
  event.preventDefault();
  const payload = { ...state.settings, ...serializeForm(event.currentTarget) };
  await api.saveSettings(payload);
  await refreshData("Configuracion de facturacion actualizada.");
  setActiveSection("sales");
}

function addDraftBillingLine() {
  const catalogItemId = elements.billingLineItemSelect.value;
  const quantity = Number(elements.billingLineQuantity.value || 0);
  if (!catalogItemId) {
    throw new Error("Selecciona un item del catalogo.");
  }
  if (quantity <= 0) {
    throw new Error("La cantidad debe ser mayor a cero.");
  }
  const existingLine = billingDraft.lines.find((line) => line.catalog_item_id === catalogItemId);
  if (existingLine) {
    existingLine.quantity = Number(existingLine.quantity) + quantity;
  } else {
    billingDraft.lines.push({ catalog_item_id: catalogItemId, quantity });
  }
  elements.billingLineQuantity.value = "1";
  renderBillingDraftLines();
}

function buildBillingDocumentPayload(form) {
  if (!billingDraft.lines.length) {
    throw new Error("Agrega al menos un item al documento.");
  }
  const payload = serializeForm(form);
  payload.lines = billingDraft.lines.map((line) => ({
    catalog_item_id: line.catalog_item_id,
    quantity: line.quantity,
  }));
  payload.payment_method = payload.payment_method || "Pendiente";
  payload.cash_account = payload.cash_account || state.settings.billing_default_cash_account || "caja_menor";
  if (payload.document_type === "cotizacion") {
    payload.payment_method = "Pendiente";
    payload.cash_account = "";
    payload.initial_payment_amount = 0;
    payload.initial_payment_date = "";
    payload.initial_payment_method = "";
    payload.initial_payment_cash_account = "";
  } else {
    payload.initial_payment_amount = Number(payload.initial_payment_amount || 0);
    payload.initial_payment_method =
      payload.initial_payment_method || payload.payment_method || "Efectivo";
    payload.initial_payment_cash_account =
      payload.initial_payment_cash_account || payload.cash_account || "caja_menor";
  }
  return payload;
}

async function handleOwnerSubmit(event) {
  event.preventDefault();
  const owner = await api.saveOwner(serializeForm(event.currentTarget));
  if (owner?.id) {
    consultorioOwnerId = owner.id;
  }
  resetForm(event.currentTarget);
  const shouldReturn = returnToAppointmentModal;
  closeOwnerModal({ suppressReturn: true });
  await refreshData({
    sections: OWNER_PATIENT_REFRESH_SECTIONS,
    message: "Propietario guardado.",
  });
  if (shouldReturn) {
    if (owner) {
      pendingAppointmentDraft = {
        ...(pendingAppointmentDraft || {}),
        owner_search:
          owner.full_name || owner.identification_number || owner.phone || "",
      };
    }
    setActiveSection("agenda");
    maybeReturnToAppointmentModal();
    return;
  }
  setActiveSection("consultorio");
  setSectionSubsection("consultorio", "patients");
  renderConsultorioOwnerDetail();
  renderPatients();
}

async function handleProviderSubmit(event) {
  event.preventDefault();
  await api.saveProvider(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  await refreshData("Proveedor guardado.");
  setActiveSection("sales");
}

async function handlePatientSubmit(event) {
  event.preventDefault();
  const payload = serializeForm(event.currentTarget);
  if (!payload.owner_id) {
    payload.owner_id =
      consultorioOwnerId ||
      elements.patientOwnerSelect?.value ||
      "";
  }
  const patient = await api.savePatient(payload);
  if (patient?.owner_id) {
    consultorioOwnerId = patient.owner_id;
  }
  if (patient?.id) {
    consultorioPatientId = patient.id;
  }
  consultorioPatientProfileOpen = false;
  resetPatientEditor();
  await refreshData({
    sections: OWNER_PATIENT_REFRESH_SECTIONS,
    message: "Paciente guardado.",
  });
  setActiveSection("consultorio");
  setSectionSubsection("consultorio", "patients");
  renderConsultorioOwnerDetail();
  renderPatients();
}

async function handleCatalogSubmit(event) {
  event.preventDefault();
  await api.saveCatalogItem(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  event.currentTarget.elements.track_inventory.checked = true;
  event.currentTarget.elements.purchase_cost.value = "0";
  event.currentTarget.elements.margin_percent.value = "0";
  event.currentTarget.elements.presentation_total.value = "1";
  event.currentTarget.elements.stock_quantity.value = "0";
  event.currentTarget.elements.min_stock.value = "0";
  await refreshData("Item de catalogo guardado.");
  setActiveSection("sales");
}

async function handleAppointmentSubmit(event) {
  event.preventDefault();
  const payload = serializeForm(event.currentTarget);
  const start = parseAppointmentDateTime(payload.appointment_at);
  const end = parseAppointmentDateTime(payload.appointment_end_at);
  if (start && end) {
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    if (duration > 0) {
      payload.duration_minutes = Math.min(240, Math.max(15, duration));
    }
  }
  if (!payload.reason) {
    payload.reason = payload.appointment_type || "Cita";
  }
  if (payload.appointment_type && payload.reason && !payload.reason.includes(payload.appointment_type)) {
    payload.reason = `${payload.appointment_type} - ${payload.reason}`;
  }
  if (!payload.patient_id && !payload.owner_id) {
    throw new Error("Debes seleccionar un propietario.");
  }
  if (!payload.status) {
    payload.status = "scheduled";
  }
  if (!payload.professional_name) {
    payload.professional_name = "Agenda general";
  }
  await api.saveAppointment(payload);
  agendaSelectedDate = toIsoDate(payload.appointment_at) || agendaSelectedDate;
  resetForm(event.currentTarget);
  closeAppointmentModal();
  setDateTimeDefaults();
  await refreshData({
    sections: AGENDA_REFRESH_SECTIONS,
    message: "Cita guardada.",
  });
  setActiveSection("agenda");
}

async function handleAvailabilitySubmit(event) {
  event.preventDefault();
  await api.saveAvailability(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  await refreshData({
    sections: AGENDA_REFRESH_SECTIONS,
    message: "Disponibilidad guardada.",
  });
  closeAvailabilityModal();
  setActiveSection("agenda");
}

function buildUserPayload() {
  const form = elements.userForm;
  const payload = {
    id: form.elements.id.value || "",
    full_name: form.elements.full_name.value,
    email: form.elements.email.value,
    role: form.elements.role.value,
    is_active: form.elements.is_active.checked,
  };
  const password = form.elements.password?.value?.trim();
  if (!payload.id && !password) {
    throw new Error("La contrasena es obligatoria para nuevos usuarios.");
  }
  if (password) {
    payload.password = password;
  }
  const permissions = [];
  const allChecked = form.elements.permissions_all.checked;
  if (allChecked) {
    permissionOptions.forEach((option) => permissions.push(option.key));
  } else {
    permissionOptions.forEach((option) => {
      const field = form.elements[`perm_${option.key}`];
      if (field?.checked) {
        permissions.push(option.key);
      }
    });
  }
  payload.permissions = permissions;
  return payload;
}

async function handleUserSubmit(event) {
  event.preventDefault();
  try {
    const payload = buildUserPayload();
    await api.saveUser(payload);
    closeUserModal();
    await refreshData("Usuario guardado.");
    setActiveSection("administration");
  } catch (error) {
    setUserFormError(error.message || "No fue posible guardar el usuario.");
    throw error;
  }
}

async function handleUsersTableClick(event) {
  if (!isAdminUser()) {
    return;
  }
  const editButton = event.target.closest("button[data-user-edit]");
  if (editButton) {
    const user = state.users.find((item) => item.id === editButton.dataset.userEdit);
    if (user) {
      openUserModal(user);
    }
    return;
  }
  const toggleButton = event.target.closest("button[data-user-toggle]");
  if (toggleButton) {
    const userId = toggleButton.dataset.userToggle;
    const isActive = toggleButton.dataset.userActive === "1";
    await api.updateUserStatus(userId, !isActive);
    await refreshData(isActive ? "Usuario desactivado." : "Usuario activado.");
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = elements.loginForm.elements.email.value;
  const password = elements.loginForm.elements.password.value;
  try {
    const result = await api.authLogin({ email, password });
    sessionStorage.setItem(AUTH_SESSION_KEY, "1");
    authState.currentUser = result?.user || null;
    authState.authenticated = true;
    setAuthUI(true);
    closeLoginModal();
    restoreOrDefaultAppView();
    await startDataLoad();
  } catch (error) {
    if (elements.loginError) {
      elements.loginError.textContent = error.message || "Credenciales invalidas.";
      elements.loginError.classList.remove("is-hidden");
    }
  }
}

async function handleLogout() {
  try {
    await api.authLogout();
  } catch (error) {
    // ignore
  }
  appViewPersistenceEnabled = false;
  clearBootstrapCache(authState.currentUser?.id);
  clearAppViewState(authState.currentUser?.id);
  consultorioOwnerId = "";
  consultorioPatientId = "";
  consultorioProfileView = "records";
  consultorioPatientProfileOpen = false;
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  authState.currentUser = null;
  authState.authenticated = false;
  setAuthUI(false);
  openLoginModal(true);
}

async function handleGoogleCalendarSubmit(event) {
  event.preventDefault();
  await api.saveGoogleCalendarConfig(serializeForm(event.currentTarget));
  event.currentTarget.elements.credentials_json.value = "";
  await refreshData("Integracion de Google Calendar actualizada.");
  setActiveSection("agenda");
}

async function handleGoogleCalendarConnect() {
  const result = await api.connectGoogleCalendar();
  if (result?.auth_url) {
    const popup = window.open(result.auth_url, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.href = result.auth_url;
      return;
    }
    showStatus(
      "Se abrio la ventana de autorizacion de Google Calendar. Completa el permiso y luego actualiza la pagina.",
      "info"
    );
    return;
  }
  await refreshData("Google Calendar conectado.");
  setActiveSection("agenda");
}

async function handleGoogleCalendarDisconnect() {
  await api.disconnectGoogleCalendar();
  await refreshData("Google Calendar desconectado.");
  setActiveSection("agenda");
}

async function handleBillingDocumentSubmit(event) {
  event.preventDefault();
  await api.saveBillingDocument(buildBillingDocumentPayload(event.currentTarget));
  billingDraft.lines = [];
  resetForm(event.currentTarget);
  setDateTimeDefaults();
  syncBillingDocumentFormState();
  await refreshData("Documento de facturacion guardado.");
  setActiveSection("sales");
}

async function handleBillingPaymentSubmit(event) {
  event.preventDefault();
  await api.registerBillingPayment(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  setDateTimeDefaults();
  await refreshData("Abono registrado.");
  setActiveSection("sales");
}

async function handleCashMovementSubmit(event) {
  event.preventDefault();
  await api.saveCashMovement(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  setDateTimeDefaults();
  await refreshData("Movimiento de caja guardado.");
  setActiveSection("sales");
}

async function handleStockAdjustmentSubmit(event) {
  event.preventDefault();
  await api.saveStockAdjustment(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  setDateTimeDefaults();
  await refreshData("Ajuste de inventario aplicado.");
  setActiveSection("sales");
}

async function submitRecord(finalize) {
  await api.saveRecord(serializeForm(elements.recordForm), finalize);
  resetForm(elements.recordForm);
  setDateTimeDefaults();
  await refreshData(finalize ? "Historia clinica finalizada." : "Historia guardada.");
  setActiveSection("consultorio");
}

async function handleConsultationSubmit(event) {
  event.preventDefault();
  await api.saveConsultation(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  setDateTimeDefaults();
  await refreshData("Consulta interna guardada.");
  setActiveSection("consultorio");
}

async function handlePatientConsultationSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = serializeForm(form);
  const patient = getConsultorioPatient();
  if (!patient) {
    throw new Error("No se encontro la mascota seleccionada.");
  }
  const examGeneralSummary = buildConsultorioExamGeneralSummary(payload);
  const examSpecialSummary = buildConsultorioExamSpecialSummary(payload);
  payload.consultation_type =
    payload.consultation_type ||
    getConsultorioProfileViewConfig()?.formConsultationType ||
    "Consulta";
  if (isHospAmbConsultationType(payload.consultation_type)) {
    const selectedType = String(payload.hospamb_type || payload.consultation_type || "").trim();
    const admissionAt = String(payload.hospamb_admission_at || payload.consultation_at || "").trim();
    const reason = String(payload.hospamb_reason || "").trim();
    const dischargeReason = String(payload.hospamb_discharge_reason || "").trim();
    const dischargeAt = String(payload.hospamb_discharge_at || "").trim();
    if (!selectedType) {
      throw new Error("Selecciona si el registro corresponde a hospitalizaci\u00f3n o ambulatorio.");
    }
    if (!admissionAt) {
      throw new Error("Selecciona la fecha de ingreso.");
    }
    if (!reason) {
      throw new Error("Escribe la raz\u00f3n del ingreso.");
    }
    if ((dischargeReason && !dischargeAt) || (!dischargeReason && dischargeAt)) {
      throw new Error("Completa motivo y fecha de salida, o deja ambos campos vacios.");
    }
    const parsedAdmissionAt = new Date(admissionAt);
    const parsedDischargeAt = dischargeAt ? new Date(dischargeAt) : null;
    if (
      parsedDischargeAt &&
      !Number.isNaN(parsedAdmissionAt.getTime()) &&
      !Number.isNaN(parsedDischargeAt.getTime()) &&
      parsedDischargeAt < parsedAdmissionAt
    ) {
      throw new Error("La fecha de salida no puede ser anterior a la fecha de ingreso.");
    }
    payload.consultation_type = selectedType;
    payload.title = reason;
    payload.consultation_at = admissionAt;
    payload.next_control = "";
    payload.summary = buildConsultorioHospAmbSummary(payload);
    payload.indications = buildConsultorioHospAmbIndications(payload);
    payload.attachments_summary = "";
    payload.document_reference = JSON.stringify({
      kind: "hospamb",
      type: selectedType,
      reason,
      observations: String(payload.hospamb_observations || "").trim(),
      dischargeReason,
      dischargeAt,
    });
  } else if (isFormulaConsultationType(payload.consultation_type)) {
    const formulaMedications = getPatientFormulaMedications();
    if (!payload.formula_date) {
      throw new Error("Selecciona la fecha de la formula.");
    }
    if (!String(payload.formula_diagnosis || "").trim()) {
      throw new Error("Escribe el diagnostico presuntivo y/o final.");
    }
    if (!formulaMedications.length || !formulaMedications.some((item) => item.name)) {
      throw new Error("Agrega al menos un medicamento a la formula.");
    }
    payload.title = "Formula medica";
    payload.consultation_at = `${payload.formula_date}T12:00`;
    payload.next_control = "";
    payload.formula_medications = formulaMedications;
    payload.summary = buildConsultorioFormulaSummary(payload);
    payload.indications = buildConsultorioFormulaIndications(payload);
    payload.attachments_summary = "";
    payload.document_reference = JSON.stringify({
      kind: "formula",
      diagnosis: String(payload.formula_diagnosis || "").trim(),
      observations: String(payload.formula_observations || "").trim(),
      medications: formulaMedications,
    });
  } else if (isDewormingConsultationType(payload.consultation_type)) {
    if (!payload.deworming_date) {
      throw new Error("Selecciona la fecha de desparasitacion.");
    }
    if (!String(payload.deworming_product || "").trim()) {
      throw new Error("Escribe el producto de la desparasitacion.");
    }
    payload.title = String(payload.deworming_product || "").trim();
    payload.consultation_at = `${payload.deworming_date}T12:00`;
    payload.next_control = payload.deworming_next_control || "";
    payload.summary = buildConsultorioDewormingSummary(payload);
    payload.indications = buildConsultorioDewormingIndications(payload);
    payload.attachments_summary = serializeConsultorioAttachments(
      getPatientDewormingAttachments()
    );
    payload.document_reference = "";
  } else if (isVaccinationConsultationType(payload.consultation_type)) {
    const vaccinationName = getPatientVaccinationNameValue(form);
    if (!payload.vaccination_date) {
      throw new Error("Selecciona la fecha de vacunacion.");
    }
    if (!vaccinationName) {
      throw new Error("Selecciona o escribe la vacuna.");
    }
    payload.title = vaccinationName;
    payload.consultation_at = `${payload.vaccination_date}T12:00`;
    payload.next_control = payload.vaccination_next_control || "";
    payload.summary = buildConsultorioVaccinationSummary({
      ...payload,
      title: vaccinationName,
    });
    payload.indications = buildConsultorioVaccinationIndications({
      ...payload,
      title: vaccinationName,
    });
    payload.attachments_summary = "";
    payload.document_reference = "";
  } else {
    payload.summary = buildConsultorioStructuredText([
      ["Subjetivo", payload.subjective],
      ["Objetivo", payload.objective],
      ["Examen general", examGeneralSummary],
      ["Examen especial", examSpecialSummary],
    ]);
    payload.indications = buildConsultorioStructuredText([
      ["Interpretacion", payload.interpretation],
      ["Plan terapeutico", payload.therapeutic_plan],
      ["Plan diagnostico", payload.diagnostic_plan],
      ["Proximo control", payload.next_control],
    ]);
    payload.attachments_summary = serializeConsultorioAttachments(
      getPatientConsultationAttachments()
    );
    payload.document_reference = "";
  }
  payload.referred_to = "";
  payload.consent_required = false;
  payload.consent_id = "";
  payload.professional_name = payload.professional_name || getDefaultConsultorioProfessionalName();
  payload.professional_license =
    payload.professional_license || getDefaultConsultorioProfessionalLicense();
  if (!payload.record_id) {
    const createdRecord = await api.saveRecord(
      buildConsultorioDraftRecordPayload(patient, payload),
      false
    );
    payload.record_id = createdRecord?.id || "";
    form.elements.record_id.value = payload.record_id;
  }
  const consultation = await api.saveConsultation(payload);
  closePatientConsultationModal();
  const entityLabel = getConsultorioProfileModalEntityLabel(payload.consultation_type);
  let statusMessage = payload.id
    ? `${entityLabel} actualizada.`
    : `${entityLabel} registrada.`;
  const reminder = consultation?.control_reminder;
  if (reminder?.scheduled) {
    const reminderLabel =
      reminder.label ||
      (isVaccinationConsultationType(payload.consultation_type)
        ? "vacunacion"
        : isDewormingConsultationType(payload.consultation_type)
        ? "desparasitacion"
        : "control");
    statusMessage += ` Recordatorio de ${reminderLabel} programado para ${formatDateTime(
      reminder.scheduled_for
    )}.`;
    if (Array.isArray(reminder.warnings) && reminder.warnings.length) {
      statusMessage += ` ${reminder.warnings.join(" ")}`;
    }
  }
  await refreshData({
    sections: ["consultations", "records"],
    message: statusMessage,
  });
  consultorioPatientProfileOpen = true;
  consultorioProfileView =
    CONSULTORIO_PROFILE_VIEWS.find(
      (option) => option.formConsultationType === payload.consultation_type
    )?.value || "consultations";
  setActiveSection(CONSULTORIO_PATIENT_PROFILE_SECTION_ID);
}

async function handleEvolutionSubmit(event) {
  event.preventDefault();
  await api.saveEvolution(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  setDateTimeDefaults();
  await refreshData("Evolucion agregada.");
  setActiveSection("consultorio");
}

async function handleConsentSubmit(event) {
  event.preventDefault();
  const result = await api.saveConsent(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  setDateTimeDefaults();
  await refreshData();
  setActiveSection("consultorio");
  if (result?.pdf?.error) {
    showStatus(`Consentimiento guardado. PDF no generado: ${result.pdf.error}`, "info");
    return;
  }
  if (result?.pdf?.url) {
    showStatus(
      `Consentimiento guardado. <a href="${escapeHtml(
        result.pdf.url
      )}" target="_blank" rel="noreferrer">Descargar PDF</a>`,
      result?.email?.sent ? "success" : "info",
      true
    );
    return;
  }
  showStatus("Consentimiento guardado.", "success");
}

async function handleGroomingSubmit(event) {
  event.preventDefault();
  await api.saveGrooming(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  setDateTimeDefaults();
  await refreshData("Documento de peluqueria guardado.");
  setActiveSection("consultorio");
}

async function handleBackupClick() {
  const result = await api.backupDatabase();
  await refreshData(`Respaldo creado en ${result.path}`);
}

function handleBillingDraftClick(event) {
  const button = event.target.closest("button[data-remove-billing-line]");
  if (!button) {
    return;
  }
  billingDraft.lines.splice(Number(button.dataset.removeBillingLine), 1);
  renderBillingDraftLines();
}

async function handleAppointmentsClick(event) {
  const actionButton = event.target.closest("button[data-appointment-action]");
  if (actionButton) {
    const appointmentId = actionButton.dataset.appointmentId || "";
    const action = actionButton.dataset.appointmentAction || "";
    const appointment = (state.appointments || []).find((item) => item.id === appointmentId);
    if (action === "edit") {
      if (!appointment) {
        showStatus("No se encontro la cita seleccionada.", "error");
        return;
      }
      closeAgendaAppointmentsModal();
      openAppointmentModalForEdit(appointment);
      return;
    }
    if (action === "delete") {
      if (!appointmentId) {
        return;
      }
      const confirmed = window.confirm(
        "¿Eliminar esta cita? Esta accion no se puede deshacer."
      );
      if (!confirmed) {
        return;
      }
      await api.deleteAppointment(appointmentId);
      await refreshData({
        sections: AGENDA_REFRESH_SECTIONS,
        message: "Cita eliminada.",
      });
      return;
    }
    if (action === "reactivate") {
      if (!appointmentId) {
        return;
      }
      await api.updateAppointmentStatus(appointmentId, "scheduled");
      await refreshData({
        sections: AGENDA_REFRESH_SECTIONS,
        message: "Cita reactivada.",
      });
      return;
    }
  }
  const button = event.target.closest("button[data-appointment-id][data-status]");
  if (!button) {
    return;
  }
  await api.updateAppointmentStatus(button.dataset.appointmentId, button.dataset.status);
  await refreshData({
    sections: AGENDA_REFRESH_SECTIONS,
    message: "Estado de cita actualizado.",
  });
}

async function handleAvailabilityListClick(event) {
  const button = event.target.closest("button[data-delete-availability]");
  if (!button) {
    return;
  }
  await api.deleteAvailability(button.dataset.deleteAvailability);
  await refreshData({
    sections: AGENDA_REFRESH_SECTIONS,
    message: "Disponibilidad eliminada.",
  });
}

function handleAgendaMiniCalendarClick(event) {
  const dateButton = event.target.closest("[data-agenda-date]");
  if (dateButton) {
    setAgendaSelectedDate(dateButton.dataset.agendaDate);
  }
}

function handleAgendaMonthClick(event) {
  const appointmentButton = event.target.closest("[data-appointment-id]");
  if (appointmentButton) {
    openAppointmentDetailModal(appointmentButton.dataset.appointmentId);
    return;
  }
  const slotButton = event.target.closest("[data-slot-at]");
  if (slotButton && !slotButton.disabled) {
    const minutes = Number(slotButton.dataset.slotMinutes || 30);
    openAppointmentModalForSlot(slotButton.dataset.slotAt, minutes);
    return;
  }
  const dateButton = event.target.closest("[data-agenda-date]");
  if (dateButton) {
    openAppointmentModalForDate(dateButton.dataset.agendaDate);
  }
}

function resolveAgendaTimelineSelection(event) {
  const column = event.target.closest(".agenda-timeline__day-column[data-agenda-date]");
  if (!column) {
    return null;
  }
  const dateValue = column.dataset.agendaDate || "";
  if (!dateValue) {
    return null;
  }
  const rect = column.getBoundingClientRect();
  if (!rect.height) {
    return null;
  }
  const totalMinutes = (AGENDA_TIMELINE_END_HOUR - AGENDA_TIMELINE_START_HOUR) * 60;
  const offsetY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
  const rawMinutes = (offsetY / rect.height) * totalMinutes;
  const roundedMinutes = Math.min(
    totalMinutes - 15,
    Math.max(0, Math.round(rawMinutes / 15) * 15)
  );
  const selectedDateTime = new Date(
    `${dateValue}T${String(AGENDA_TIMELINE_START_HOUR).padStart(2, "0")}:00:00`
  );
  selectedDateTime.setMinutes(selectedDateTime.getMinutes() + roundedMinutes);

  const matchingSlot = buildAgendaSlots(dateValue).find((slot) => {
    if (slot.occupied) {
      return false;
    }
    const slotStart = new Date(slot.slot_at);
    const slotEnd = addMinutes(slotStart, Number(slot.duration_minutes || 30));
    return selectedDateTime >= slotStart && selectedDateTime < slotEnd;
  });
  if (matchingSlot) {
    return {
      slotAt: matchingSlot.slot_at,
      durationMinutes: Number(matchingSlot.duration_minutes || 30),
    };
  }
  return {
    slotAt: toInputDateTime(selectedDateTime),
    durationMinutes: Number(elements.appointmentDurationInput?.value || 30),
  };
}

function handleAgendaTimelineClick(event) {
  const appointmentButton = event.target.closest("[data-appointment-id]");
  if (appointmentButton) {
    openAppointmentDetailModal(appointmentButton.dataset.appointmentId);
    return;
  }
  const timelineSelection = resolveAgendaTimelineSelection(event);
  if (timelineSelection) {
    openAppointmentModalForSlot(timelineSelection.slotAt, timelineSelection.durationMinutes);
    return;
  }
  const dateButton = event.target.closest("[data-agenda-date]");
  if (dateButton) {
    openAppointmentModalForDate(dateButton.dataset.agendaDate);
  }
}

function handleAgendaWeekClick(event) {
  const appointmentButton = event.target.closest("[data-appointment-id]");
  if (appointmentButton) {
    openAppointmentDetailModal(appointmentButton.dataset.appointmentId);
    return;
  }
  const slotButton = event.target.closest("[data-slot-at]");
  if (slotButton && !slotButton.disabled) {
    const minutes = Number(slotButton.dataset.slotMinutes || 30);
    openAppointmentModalForSlot(slotButton.dataset.slotAt, minutes);
    return;
  }
  const dayButton = event.target.closest("[data-agenda-date]");
  if (dayButton) {
    openAppointmentModalForDate(dayButton.dataset.agendaDate);
  }
}

function handleRecordsClick(event) {
  const button = event.target.closest("button[data-select-record]");
  if (!button) {
    return;
  }
  if (button.dataset.mode === "consultation") {
    elements.consultationRecordSelect.value = button.dataset.selectRecord;
    showStatus("Historia seleccionada para nueva consulta.", "info");
  } else {
    elements.evolutionRecordSelect.value = button.dataset.selectRecord;
    showStatus("Historia seleccionada para nueva evolucion.", "info");
  }
  setActiveSection("consultorio");
}

function handleBillingDocumentsClick(event) {
  const button = event.target.closest("button[data-select-billing-document]");
  if (!button) {
    return;
  }
  const document = state.billing_documents.find((item) => item.id === button.dataset.selectBillingDocument);
  elements.billingPaymentDocumentSelect.value = button.dataset.selectBillingDocument;
  if (document) {
    elements.billingPaymentForm.elements.amount.value = Number(document.balance_due || 0);
  }
  showStatus("Factura pendiente seleccionada para registrar abono.", "info");
  setActiveSection("sales");
}

function bindNavigation() {
  queryAll("[data-section-target]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const sectionId = button.dataset.sectionTarget;
      const wrapper = button.closest(".switcher-item");
      if (wrapper) {
        const shouldOpen = openNavDropdownSection !== sectionId;
        closeNavDropdowns();
        if (shouldOpen) {
          wrapper.classList.add("is-open");
          openNavDropdownSection = sectionId;
        }
        return;
      }
      setActiveSection(sectionId);
    });
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".switcher-item")) {
      closeNavDropdowns();
    }
    if (
      elements.notificationsPanel &&
      !elements.notificationsPanel.classList.contains("is-hidden") &&
      !event.target.closest("#notificationsPanel") &&
      !event.target.closest("#notificationsButton")
    ) {
      closeNotificationsPanel();
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const consultationModalOpen = Boolean(
        elements.patientConsultationModal &&
          !elements.patientConsultationModal.classList.contains("is-hidden")
      );
      closeNavDropdowns();
      closeAppointmentModal();
      closeAvailabilityModal();
      closeAgendaAppointmentsModal();
      closePatientConsultationModal();
      closeUserModal();
      closeOwnerModal();
      closeLoginModal();
      if (consultationModalOpen) {
        return;
      }
      if (consultorioPatientProfileOpen) {
        closeConsultorioPatientProfile();
      }
    }
  });
}

function wrapAsync(handler) {
  return async (event) => {
    try {
      await handler(event);
    } catch (error) {
      showStatus(error.message || "Operacion fallida.", "error");
    }
  };
}

function bindForms() {
  if (elements.notificationsButton) {
    elements.notificationsButton.addEventListener("click", toggleNotificationsPanel);
  }
  if (elements.notificationsClearButton) {
    elements.notificationsClearButton.addEventListener("click", () => {
      notifications.length = 0;
      unreadNotifications = 0;
      renderNotifications();
    });
  }
  if (elements.notificationsCopyButton) {
    elements.notificationsCopyButton.addEventListener("click", async () => {
      const content = notifications
        .map((item) => `[${item.time}] ${item.title}: ${item.message}`)
        .join("\n");
      try {
        await navigator.clipboard.writeText(content || "Sin notificaciones.");
        showStatus("Notificaciones copiadas.", "success");
      } catch (error) {
        showStatus("No fue posible copiar las notificaciones.", "error");
      }
    });
  }
  if (elements.openUserModalButton) {
    elements.openUserModalButton.addEventListener("click", () => openUserModal());
  }
  if (elements.closeUserModalButton) {
    elements.closeUserModalButton.addEventListener("click", closeUserModal);
  }
  if (elements.userModal) {
    elements.userModal.addEventListener("click", (event) => {
      if (event.target.dataset.closeUserModal) {
        closeUserModal();
      }
    });
  }
  if (elements.openOwnerModalButton) {
    elements.openOwnerModalButton.addEventListener("click", () => openOwnerModal());
  }
  if (elements.closeOwnerModalButton) {
    elements.closeOwnerModalButton.addEventListener("click", closeOwnerModal);
  }
  if (elements.ownerModal) {
    elements.ownerModal.addEventListener("click", (event) => {
      if (event.target.dataset.closeOwnerModal) {
        closeOwnerModal();
      }
    });
  }
  if (elements.userForm) {
    elements.userForm.addEventListener("submit", wrapAsync(handleUserSubmit));
    elements.userForm.elements.permissions_all?.addEventListener("change", (event) => {
      const checked = event.target.checked;
      permissionOptions.forEach((option) => {
        const field = elements.userForm.elements[`perm_${option.key}`];
        if (field) {
          field.checked = checked;
        }
      });
    });
  }
  if (elements.usersTableBody) {
    elements.usersTableBody.addEventListener("click", wrapAsync(handleUsersTableClick));
  }
  if (elements.usersSearchInput) {
    elements.usersSearchInput.addEventListener("input", (event) => {
      usersFilters.query = event.target.value || "";
      renderUsers();
    });
  }
  if (elements.ownersSearchInput) {
    elements.ownersSearchInput.addEventListener("input", (event) => {
      ownersFilters.query = event.target.value || "";
      renderOwners();
    });
  }
  if (elements.ownersPatientSearchInput) {
    elements.ownersPatientSearchInput.addEventListener("input", (event) => {
      ownersFilters.petQuery = event.target.value || "";
      renderOwners();
    });
  }
  if (elements.ownersSearchButton) {
    elements.ownersSearchButton.addEventListener("click", () => {
      renderOwners();
    });
  }
  if (elements.ownerPatientsSearchInput) {
    elements.ownerPatientsSearchInput.addEventListener("input", (event) => {
      consultorioPatientsFilters.query = event.target.value || "";
      renderPatients();
    });
  }
  if (elements.usersPageSizeSelect) {
    elements.usersPageSizeSelect.addEventListener("change", (event) => {
      usersFilters.pageSize = Number(event.target.value || 10);
      renderUsers();
    });
  }
  if (elements.toggleInactiveUsersButton) {
    elements.toggleInactiveUsersButton.addEventListener("click", () => {
      usersFilters.showInactive = !usersFilters.showInactive;
      elements.toggleInactiveUsersButton.textContent = usersFilters.showInactive
        ? "Ocultar inactivos"
        : "Usuarios inactivos";
      renderUsers();
    });
  }
  if (elements.ownersList) {
    elements.ownersList.addEventListener("click", wrapAsync(handleOwnersListClick));
  }
  if (elements.consultorioOwnerBackButton) {
    elements.consultorioOwnerBackButton.addEventListener("click", () => {
      consultorioOwnerId = "";
      consultorioPatientId = "";
      consultorioProfileView = "records";
      consultorioPatientProfileOpen = false;
      consultorioPatientsFilters.query = "";
      if (elements.ownerPatientsSearchInput) {
        elements.ownerPatientsSearchInput.value = "";
      }
      resetPatientEditor();
      setSectionSubsection("consultorio", "patients");
    });
  }
  if (elements.consultorioOwnerEditButton) {
    elements.consultorioOwnerEditButton.addEventListener("click", () => {
      const owner = getConsultorioOwner();
      if (owner) {
        openOwnerModal(owner);
      }
    });
  }
  if (elements.consultorioOwnerDeleteButton) {
    elements.consultorioOwnerDeleteButton.addEventListener(
      "click",
      wrapAsync(async () => {
        if (consultorioOwnerId) {
          await handleOwnerDelete(consultorioOwnerId);
        }
      })
    );
  }
  if (elements.openPatientFormButton) {
    elements.openPatientFormButton.addEventListener("click", () => {
      openNewPatientEditor();
    });
  }
  if (elements.cancelPatientEditButton) {
    elements.cancelPatientEditButton.addEventListener("click", resetPatientEditor);
  }
  if (elements.patientsList) {
    elements.patientsList.addEventListener("click", wrapAsync(handlePatientsListClick));
  }
  if (elements.consultorioPatientProfileSummary) {
    elements.consultorioPatientProfileSummary.addEventListener("click", (event) => {
      const openConsultationButton = event.target.closest("[data-open-patient-consultation-modal]");
      if (openConsultationButton) {
        const targetProfileView =
          openConsultationButton.dataset.consultationProfileView || consultorioProfileView;
        if (CONSULTORIO_PROFILE_VIEW_MAP[targetProfileView]) {
          consultorioProfileView = targetProfileView;
        }
        openPatientConsultationModal();
        return;
      }
      const editConsultationButton = event.target.closest("[data-edit-patient-consultation]");
      if (editConsultationButton) {
        const consultation = getConsultationById(editConsultationButton.dataset.editPatientConsultation || "");
        if (consultation) {
          openPatientConsultationModal(consultation);
        }
        return;
      }
      const patientButton = event.target.closest("[data-patient-select]");
      if (!patientButton) {
        return;
      }
      const patient = getPatientById(patientButton.dataset.patientSelect || "");
      if (!patient) {
        return;
      }
      openConsultorioPatientProfile(patient);
    });
  }
  if (elements.closePatientConsultationModalButton) {
    elements.closePatientConsultationModalButton.addEventListener("click", closePatientConsultationModal);
  }
  if (elements.cancelPatientConsultationButton) {
    elements.cancelPatientConsultationButton.addEventListener("click", closePatientConsultationModal);
  }
  if (elements.patientConsultationModal) {
    elements.patientConsultationModal.addEventListener("click", (event) => {
      if (event.target.dataset.closePatientConsultationModal) {
        closePatientConsultationModal();
      }
    });
  }
  if (elements.patientHospAmbRegisterTypeButton) {
    elements.patientHospAmbRegisterTypeButton.addEventListener("click", () => {
      showStatus(
        "Por ahora los tipos disponibles para este registro son Hospitalizaci\u00f3n y Ambulatorio.",
        "info"
      );
      elements.patientHospAmbTypeSelect?.focus();
    });
  }
  if (elements.patientHospAmbTypeSelect && elements.patientConsultationForm) {
    elements.patientHospAmbTypeSelect.addEventListener("change", (event) => {
      if (elements.patientConsultationForm?.elements?.consultation_type) {
        elements.patientConsultationForm.elements.consultation_type.value = event.target.value || "Hospitalizacion";
      }
    });
  }
  if (elements.patientConsultationAttachmentFileButton && elements.patientConsultationAttachmentFileInput) {
    elements.patientConsultationAttachmentFileButton.addEventListener("click", () => {
      elements.patientConsultationAttachmentFileInput.click();
    });
    elements.patientConsultationAttachmentFileInput.addEventListener(
      "change",
      wrapAsync(async (event) => {
        try {
          await addPatientConsultationAttachmentImages(event.currentTarget.files);
        } finally {
          event.currentTarget.value = "";
        }
      })
    );
  }
  if (elements.patientConsultationAttachmentsList) {
    elements.patientConsultationAttachmentsList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-patient-consultation-attachment]");
      if (!removeButton) {
        return;
      }
      const index = Number(removeButton.dataset.removePatientConsultationAttachment);
      const items = getPatientConsultationAttachments();
      items.splice(index, 1);
      setPatientConsultationAttachments(items);
    });
  }
  if (elements.patientDewormingAttachmentFileButton && elements.patientDewormingAttachmentFileInput) {
    elements.patientDewormingAttachmentFileButton.addEventListener("click", () => {
      elements.patientDewormingAttachmentFileInput.click();
    });
    elements.patientDewormingAttachmentFileInput.addEventListener(
      "change",
      wrapAsync(async (event) => {
        try {
          await addPatientDewormingAttachmentImages(event.currentTarget.files);
        } finally {
          event.currentTarget.value = "";
        }
      })
    );
  }
  if (elements.patientDewormingAttachmentsList) {
    elements.patientDewormingAttachmentsList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-patient-consultation-attachment]");
      if (!removeButton) {
        return;
      }
      const index = Number(removeButton.dataset.removePatientConsultationAttachment);
      const items = getPatientDewormingAttachments();
      items.splice(index, 1);
      setPatientDewormingAttachments(items);
    });
  }
  if (elements.patientVaccinationCustomButton && elements.patientVaccinationNameSelect) {
    elements.patientVaccinationCustomButton.addEventListener("click", () => {
      elements.patientVaccinationNameSelect.value = CONSULTORIO_VACCINATION_CUSTOM_OPTION;
      syncPatientVaccinationCustomField();
      elements.patientVaccinationCustomNameInput?.focus();
    });
    elements.patientVaccinationNameSelect.addEventListener("change", syncPatientVaccinationCustomField);
  }
  if (elements.patientFormulaAddMedicationButton) {
    elements.patientFormulaAddMedicationButton.addEventListener("click", () => {
      const items = getPatientFormulaMedications({ includeEmpty: true });
      items.push(createConsultorioFormulaMedication());
      renderPatientFormulaMedications(items);
      elements.patientFormulaMedicationsList
        ?.querySelector('[data-formula-medication-item]:last-child [data-formula-medication-field="name"]')
        ?.focus();
    });
  }
  if (elements.patientFormulaMedicationsList) {
    elements.patientFormulaMedicationsList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-patient-formula-medication]");
      if (!removeButton) {
        return;
      }
      const index = Number(removeButton.dataset.removePatientFormulaMedication);
      const items = getPatientFormulaMedications({ includeEmpty: true });
      items.splice(index, 1);
      renderPatientFormulaMedications(items);
    });
  }
  if (elements.patientConsultationForm) {
    elements.patientConsultationForm.addEventListener(
      "submit",
      wrapAsync(handlePatientConsultationSubmit)
    );
  }
  if (elements.consultorioPatientProfileNav) {
    elements.consultorioPatientProfileNav.addEventListener("click", (event) => {
      const button = event.target.closest("[data-consultorio-profile-view]");
      if (!button) {
        return;
      }
      setConsultorioProfileView(button.dataset.consultorioProfileView || "records");
    });
  }
  if (elements.consultorioPatientBackButton) {
    elements.consultorioPatientBackButton.addEventListener("click", () => {
      closeConsultorioPatientProfile({ preservePatient: true });
    });
  }
  if (elements.consultorioPatientEditButton) {
    elements.consultorioPatientEditButton.addEventListener("click", () => {
      const patient = getConsultorioPatient();
      if (patient) {
        closeConsultorioPatientProfile({ preservePatient: true });
        openPatientEditor(patient);
      }
    });
  }
  if (elements.exportUsersButton) {
    elements.exportUsersButton.addEventListener("click", () => {
      const rows = (state.users || []).map((user) => ({
        Nombre: user.full_name || "",
        Correo: user.email || "",
        Rol: user.role || "",
        Estado: user.is_active ? "Activo" : "Inactivo",
        Permisos: Array.isArray(user.permissions) ? user.permissions.join("|") : "",
        Creacion: user.created_at || "",
      }));
      if (!rows.length) {
        showStatus("No hay usuarios para exportar.", "info");
        return;
      }
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(",")]
        .concat(
          rows.map((row) =>
            headers
              .map((key) => `"${String(row[key] || "").replaceAll('"', '""')}"`)
              .join(",")
          )
        )
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "usuarios.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    });
  }
  if (elements.loginForm) {
    elements.loginForm.addEventListener("submit", wrapAsync(handleLoginSubmit));
  }
  if (elements.logoutButton) {
    elements.logoutButton.addEventListener("click", wrapAsync(handleLogout));
  }
  if (elements.settingsForm) {
    elements.settingsForm.addEventListener("submit", wrapAsync(handleSettingsSubmit));
  }
  elements.billingSettingsForm.addEventListener("submit", wrapAsync(handleBillingSettingsSubmit));
  elements.ownerForm.addEventListener("submit", wrapAsync(handleOwnerSubmit));
  elements.providerForm.addEventListener("submit", wrapAsync(handleProviderSubmit));
  elements.patientForm.addEventListener("submit", wrapAsync(handlePatientSubmit));
  elements.catalogForm.addEventListener("submit", wrapAsync(handleCatalogSubmit));
  elements.appointmentForm.addEventListener("submit", wrapAsync(handleAppointmentSubmit));
  if (elements.availabilityForm) {
    elements.availabilityForm.addEventListener("submit", wrapAsync(handleAvailabilitySubmit));
  }
  if (elements.availabilityRulesList) {
    elements.availabilityRulesList.addEventListener(
      "click",
      wrapAsync(handleAvailabilityListClick)
    );
  }
  if (elements.googleCalendarForm) {
    elements.googleCalendarForm.addEventListener("submit", wrapAsync(handleGoogleCalendarSubmit));
  }
  elements.billingDocumentForm.addEventListener("submit", wrapAsync(handleBillingDocumentSubmit));
  elements.billingPaymentForm.addEventListener("submit", wrapAsync(handleBillingPaymentSubmit));
  elements.cashMovementForm.addEventListener("submit", wrapAsync(handleCashMovementSubmit));
  elements.stockAdjustmentForm.addEventListener("submit", wrapAsync(handleStockAdjustmentSubmit));
  elements.consultationForm.addEventListener("submit", wrapAsync(handleConsultationSubmit));
  elements.evolutionForm.addEventListener("submit", wrapAsync(handleEvolutionSubmit));
  elements.consentForm.addEventListener("submit", wrapAsync(handleConsentSubmit));
  elements.groomingForm.addEventListener("submit", wrapAsync(handleGroomingSubmit));
  elements.saveDraftButton.addEventListener("click", wrapAsync(() => submitRecord(false)));
  elements.finalizeRecordButton.addEventListener("click", wrapAsync(() => submitRecord(true)));
  elements.backupButton.addEventListener("click", wrapAsync(handleBackupClick));
  elements.addBillingLineButton.addEventListener("click", wrapAsync(async () => addDraftBillingLine()));
  elements.billingDraftLines.addEventListener("click", handleBillingDraftClick);
  elements.billingDocumentsList.addEventListener("click", handleBillingDocumentsClick);
  if (elements.appointmentsList) {
    elements.appointmentsList.addEventListener("click", wrapAsync(handleAppointmentsClick));
  }
  if (elements.agendaMonthGrid) {
    elements.agendaMonthGrid.addEventListener("click", handleAgendaMiniCalendarClick);
  }
  if (elements.agendaMonthGridLarge) {
    elements.agendaMonthGridLarge.addEventListener("click", handleAgendaMonthClick);
  }
  if (elements.agendaWeekSlots) {
    elements.agendaWeekSlots.addEventListener("click", handleAgendaWeekClick);
  }
  if (elements.agendaWeekTimeline) {
    elements.agendaWeekTimeline.addEventListener("click", handleAgendaTimelineClick);
  }
  if (elements.agendaDayTimeline) {
    elements.agendaDayTimeline.addEventListener("click", handleAgendaTimelineClick);
  }
  if (elements.agendaListItems) {
    elements.agendaListItems.addEventListener("click", handleAgendaMonthClick);
  }
  elements.recordsList.addEventListener("click", handleRecordsClick);
  elements.openAppointmentModalButton.addEventListener("click", () =>
    openAppointmentModalForDate(agendaSelectedDate)
  );
  elements.closeAppointmentModalButton.addEventListener("click", closeAppointmentModal);
  if (elements.closeAppointmentDetailButton) {
    elements.closeAppointmentDetailButton.addEventListener("click", closeAppointmentDetailModal);
  }
  if (elements.appointmentRegisterOwnerButton) {
    elements.appointmentRegisterOwnerButton.addEventListener("click", () => openOwnerModalFromAppointment());
  }
  if (elements.appointmentPatientInput) {
    elements.appointmentPatientInput.addEventListener("input", () => {
      renderAppointmentPatientDropdown();
    });
    elements.appointmentPatientInput.addEventListener("focus", () => {
      renderAppointmentPatientDropdown();
      if (elements.appointmentPatientDropdown) {
        elements.appointmentPatientDropdown.classList.remove("is-hidden");
      }
    });
    elements.appointmentPatientInput.addEventListener("blur", () => {
      setTimeout(() => {
        elements.appointmentPatientDropdown?.classList.add("is-hidden");
      }, 120);
    });
  }
  if (elements.appointmentPatientDropdown) {
    elements.appointmentPatientDropdown.addEventListener("click", (event) => {
      const button = event.target.closest("[data-patient-id], [data-owner-id]");
      if (!button) {
        return;
      }
      const patientId = button.dataset.patientId || "";
      const ownerId = button.dataset.ownerId || "";
      const label = button.dataset.patientLabel || button.dataset.ownerLabel || "";
      if (elements.appointmentPatientId) {
        elements.appointmentPatientId.value = patientId;
      }
      if (elements.appointmentOwnerId) {
        elements.appointmentOwnerId.value =
          ownerId || (patientId ? (state.patients || []).find((p) => p.id === patientId)?.owner_id : "") || "";
      }
      if (elements.appointmentPatientInput) {
        elements.appointmentPatientInput.value = label;
      }
      elements.appointmentPatientDropdown.classList.add("is-hidden");
    });
  }
  if (elements.appointmentStartInput) {
    elements.appointmentStartInput.addEventListener("change", () => {
      syncAppointmentEndTime();
      syncAppointmentSelectedDate();
    });
  }
  if (elements.appointmentEndInput) {
    elements.appointmentEndInput.addEventListener("change", () => syncAppointmentEndTime());
  }
  if (elements.appointmentDurationInput) {
    elements.appointmentDurationInput.addEventListener("change", () => {
      syncAppointmentEndTime({ force: true });
      renderAppointmentSlotsStrip();
    });
  }
  if (elements.appointmentNoTimeCheckbox) {
    elements.appointmentNoTimeCheckbox.addEventListener("change", (event) => {
      toggleAppointmentNoTime(event.target.checked);
    });
  }
  if (elements.appointmentSlotsStrip) {
    elements.appointmentSlotsStrip.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-slot-at]");
      if (!button) {
        return;
      }
      const minutes = Number(button.dataset.slotMinutes || 30);
      selectAppointmentSlot(button.dataset.slotAt, minutes);
    });
  }
  elements.appointmentModal.addEventListener("click", (event) => {
    if (event.target.dataset.closeAppointmentModal) {
      closeAppointmentModal();
    }
  });
  if (elements.appointmentDetailModal) {
    elements.appointmentDetailModal.addEventListener("click", (event) => {
      if (event.target.dataset.closeAppointmentDetailModal) {
        closeAppointmentDetailModal();
      }
    });
  }
  if (elements.agendaAvailabilityFormPanel) {
    elements.agendaAvailabilityFormPanel.addEventListener("click", openAvailabilityModal);
  }
  if (elements.closeAvailabilityModalButton) {
    elements.closeAvailabilityModalButton.addEventListener("click", closeAvailabilityModal);
  }
  if (elements.availabilityModal) {
    elements.availabilityModal.addEventListener("click", (event) => {
      if (event.target.dataset.closeAvailabilityModal) {
        closeAvailabilityModal();
      }
    });
  }
  if (elements.agendaGeneralListPanel) {
    elements.agendaGeneralListPanel.addEventListener("click", openAgendaAppointmentsModal);
  }
  if (elements.closeAgendaAppointmentsModalButton) {
    elements.closeAgendaAppointmentsModalButton.addEventListener("click", closeAgendaAppointmentsModal);
  }
  if (elements.agendaAppointmentsModal) {
    elements.agendaAppointmentsModal.addEventListener("click", (event) => {
      if (event.target.dataset.closeAgendaAppointmentsModal) {
        closeAgendaAppointmentsModal();
      }
    });
  }
  elements.agendaPrevMonthButton.addEventListener("click", () => {
    agendaViewDate = new Date(agendaViewDate.getFullYear(), agendaViewDate.getMonth() - 1, 1);
    renderAvailability();
  });
  if (elements.agendaWeekPrevButton) {
    elements.agendaWeekPrevButton.addEventListener("click", () => shiftAgendaView(-1));
  }
  elements.agendaTodayButton.addEventListener("click", () => setAgendaToday());
  if (elements.agendaViewTodayButton) {
    elements.agendaViewTodayButton.addEventListener("click", () => setAgendaToday());
  }
  if (elements.agendaWeekNextButton) {
    elements.agendaWeekNextButton.addEventListener("click", () => shiftAgendaView(1));
  }
  elements.agendaNextMonthButton.addEventListener("click", () => {
    agendaViewDate = new Date(agendaViewDate.getFullYear(), agendaViewDate.getMonth() + 1, 1);
    renderAvailability();
  });
  if (elements.agendaViewTabs) {
    elements.agendaViewTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-agenda-view]");
      if (!button) {
        return;
      }
      setAgendaViewMode(button.dataset.agendaView || "");
    });
  }
  if (elements.googleCalendarConnectButton) {
    elements.googleCalendarConnectButton.addEventListener(
      "click",
      wrapAsync(handleGoogleCalendarConnect)
    );
  }
  if (elements.googleCalendarDisconnectButton) {
    elements.googleCalendarDisconnectButton.addEventListener(
      "click",
      wrapAsync(handleGoogleCalendarDisconnect)
    );
  }
  elements.billingDocumentTypeSelect.addEventListener("change", syncBillingDocumentFormState);
  elements.billingPaymentMethodSelect.addEventListener("change", syncBillingDocumentFormState);
  elements.consentTypeSelect.addEventListener("change", () =>
    applyConsentTemplate(elements.consentTypeSelect.value)
  );
}

function scheduleFullBootstrapLoad() {
  if (bootstrapFullRequested) {
    return;
  }
  bootstrapFullRequested = true;
  const run = async () => {
    let loadedAny = false;
    for (const group of BOOTSTRAP_BACKGROUND_GROUPS) {
      try {
        await refreshData({ sections: group, render: false });
        loadedAny = true;
      } catch (error) {
        console.warn("Bootstrap secundario omitido:", error);
      }
    }
    if (loadedAny) {
      renderAll();
    }
    bootstrapFullRequested = false;
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => run(), { timeout: 2000 });
  } else {
    setTimeout(run, 350);
  }
}

async function startDataLoad() {
  showStatus("Version web lista. Cargando configuracion...", "info");
  const activeSectionId = getActiveSectionId();
  const finalizeBootstrapStatus = async () => {
    await ensureSectionData(activeSectionId, { showError: false });
    const activeReady = getSectionDataRequirements(activeSectionId).every((section) =>
      loadedBootstrapSections.has(section)
    );
    showStatus(
      activeReady ? "Datos operativos cargados." : "Configuracion cargada. Cargando modulos...",
      activeReady ? "success" : "info"
    );
  };
  const cached = loadBootstrapCache();
  if (cached) {
    Object.assign(state, cached);
    markBootstrapSectionsLoaded(BOOTSTRAP_CORE_SECTIONS);
    if (!toIsoDate(agendaSelectedDate)) {
      agendaSelectedDate = toIsoDate(new Date());
    }
    renderAll();
    bootstrapReadyForSectionLoads = true;
    await finalizeBootstrapStatus();
  }
  if (cached) {
    scheduleFullBootstrapLoad();
    return;
  }
  refreshData({ sections: BOOTSTRAP_CORE_SECTIONS })
    .then(() => {
      bootstrapReadyForSectionLoads = true;
      return finalizeBootstrapStatus();
    })
    .then(() => {
      scheduleFullBootstrapLoad();
    })
    .catch((error) => {
      bootstrapReadyForSectionLoads = false;
      showStatus(error.message || "No fue posible cargar la configuracion.", "error");
    });
}

async function initApp() {
  cacheElements();
  renderNotifications();
  buildNavDropdowns();
  bindNavigation();
  bindNavDropdowns();
  bindForms();
  setDateTimeDefaults();
  try {
    const status = await api.authStatus();
    authState.requiresLogin = Boolean(status.requires_login);
    authState.authenticated = Boolean(status.authenticated);
    authState.currentUser = status.user || null;
  } catch (error) {
    authState.requiresLogin = true;
    authState.authenticated = false;
    authState.currentUser = null;
  }
  const sessionUnlocked = sessionStorage.getItem(AUTH_SESSION_KEY) === "1";
  if (authState.requiresLogin) {
    if (!authState.authenticated) {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    } else if (!sessionUnlocked) {
      authState.authenticated = false;
      authState.currentUser = null;
    }
  } else {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    authState.currentUser = null;
  }
  setAuthUI(authState.authenticated);
  if (authState.requiresLogin && !authState.authenticated) {
    openLoginModal(true);
    return;
  }
  restoreOrDefaultAppView();
  await startDataLoad();
}

window.addEventListener("DOMContentLoaded", () => {
  initApp().catch((error) => {
    showStatus(error.message || "No fue posible inicializar la app.", "error");
  });
});

window.addEventListener("error", (event) => {
  if (event?.message) {
    addNotification(event.message, "error");
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event?.reason?.message || event?.reason || "Promesa rechazada.";
  addNotification(String(reason), "error");
});
