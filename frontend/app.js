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
const activeSubsections = {};
let openNavDropdownSection = "";
let agendaViewDate = new Date();
let agendaSelectedDate = new Date().toISOString().slice(0, 10);
const consultationTypes = [
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
      { value: "clinic", label: "Configuracion de la veterinaria", panels: ["administrationSettingsPanel"] },
      { value: "users", label: "Usuarios", panels: ["administrationUsersPanel"] },
      { value: "owners", label: "Propietarios", panels: ["administrationOwnersFormPanel", "administrationOwnersListPanel"] },
      { value: "variables", label: "Variables", panels: ["administrationVariablesPanel"] },
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
          "agendaGoogleCalendarPanel",
          "agendaGeneralListPanel",
          "agendaAvailabilityRulesPanel",
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
        value: "records",
        label: "Historias clinicas",
        panels: ["consultorioPatientFormPanel", "consultorioRecordFormPanel", "consultorioPatientsPanel", "consultorioRecordsPanel"],
      },
      {
        value: "vacunacion",
        label: "Vacunaciones",
        panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
        consultationType: "Vacunacion",
      },
      {
        value: "formula",
        label: "Formulas",
        panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
        consultationType: "Formula",
      },
      {
        value: "desparasitacion",
        label: "Desparacitaciones",
        panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
        consultationType: "Desparasitacion",
      },
      {
        value: "ambulatorio",
        label: "Ambulatorios",
        panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
        consultationType: "Ambulatorio",
      },
      {
        value: "cirugia",
        label: "Cirugias / procedimientos",
        panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
        consultationType: "Cirugia / procedimiento",
      },
      {
        value: "laboratorio",
        label: "Examenes de laboratorio",
        panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
        consultationType: "Examen de laboratorio",
      },
      {
        value: "imagenes",
        label: "Imagenes diagnosticas",
        panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
        consultationType: "Imagen diagnostica",
      },
      {
        value: "seguimiento",
        label: "Seguimiento",
        panels: ["consultorioConsultationFormPanel", "consultorioEvolutionFormPanel", "consultorioConsultationsPanel"],
        consultationType: "Seguimiento",
      },
      {
        value: "documentos",
        label: "Documentos",
        panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
        consultationType: "Documento",
      },
      {
        value: "remision",
        label: "Remiciones",
        panels: ["consultorioConsultationFormPanel", "consultorioConsultationsPanel"],
        consultationType: "Remision",
      },
      { value: "consents", label: "Consentimientos", panels: ["consultorioConsentFormPanel", "consultorioConsentsPanel"] },
      { value: "grooming", label: "Peluqueria", panels: ["consultorioGroomingFormPanel", "consultorioGroomingPanel"] },
    ],
  },
  hospamb: {
    label: "Que vista quieres abrir",
    options: [
      { value: "hospitalization", label: "Hospitalizacion", panels: ["hospambHospitalizationPanel"] },
      { value: "ambulatory", label: "Ambulatorio", panels: ["hospambAmbulatoryPanel"] },
      { value: "procedures", label: "Cirugias / procedimientos", panels: ["hospambProcedurePanel"] },
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
  const payload = await response.json();
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Operacion no completada.");
  }
  return payload.data;
}

const api = {
  bootstrap: () => apiRequest("/api/bootstrap"),
  saveSettings: (payload) =>
    apiRequest("/api/settings", { method: "POST", body: JSON.stringify(payload) }),
  saveOwner: (payload) =>
    apiRequest("/api/owners", { method: "POST", body: JSON.stringify(payload) }),
  saveProvider: (payload) =>
    apiRequest("/api/providers", { method: "POST", body: JSON.stringify(payload) }),
  savePatient: (payload) =>
    apiRequest("/api/patients", { method: "POST", body: JSON.stringify(payload) }),
  saveCatalogItem: (payload) =>
    apiRequest("/api/catalog-items", { method: "POST", body: JSON.stringify(payload) }),
  saveAppointment: (payload) =>
    apiRequest("/api/appointments", { method: "POST", body: JSON.stringify(payload) }),
  updateAppointmentStatus: (appointmentId, status) =>
    apiRequest(`/api/appointments/${appointmentId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
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
};

function cacheElements() {
  [
    "statusBanner",
    "backupButton",
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
    "ownersList",
    "complianceNotes",
    "complianceSources",
    "appointmentForm",
    "availabilityForm",
    "googleCalendarForm",
    "googleCalendarManageButton",
    "googleCalendarModal",
    "closeGoogleCalendarModalButton",
    "appointmentsList",
    "availabilityRulesList",
    "agendaMonthLabel",
    "agendaMonthGrid",
    "agendaSelectedDateLabel",
    "agendaDaySlots",
    "agendaSelectedDayAppointments",
    "agendaConnectionBadge",
    "agendaPrevMonthButton",
    "agendaTodayButton",
    "agendaNextMonthButton",
    "openAppointmentModalButton",
    "appointmentModal",
    "appointmentModalSelectedDate",
    "closeAppointmentModalButton",
    "googleCalendarStatus",
    "googleCalendarConnectButton",
    "googleCalendarDisconnectButton",
    "patientForm",
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
    "appointmentPatientSelect",
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
    return;
  }
  banner.textContent = message;
}

function setActiveSection(sectionId) {
  const config = sectionSubsections[sectionId];
  if (config && !activeSubsections[sectionId]) {
    activeSubsections[sectionId] = config.options[0]?.value || "";
  }
  queryAll(".workspace-section").forEach((section) => {
    section.classList.toggle("is-visible", section.id === sectionId);
  });
  queryAll(".switcher-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.sectionTarget === sectionId);
  });
  applySectionSubsection(sectionId);
  updateNavDropdownState();
}

function setSectionSubsection(sectionId, subsectionValue) {
  if (!sectionSubsections[sectionId]) {
    return;
  }
  activeSubsections[sectionId] = subsectionValue;
  applySectionSubsection(sectionId);
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
  section.querySelectorAll(".two-column-grid, .three-column-grid").forEach((container) => {
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
  if (option.consultationType && elements.consultationTypeSelect) {
    elements.consultationTypeSelect.value = option.consultationType;
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
  }
  syncSectionContainers(sectionId);
}

function closeNavDropdowns() {
  openNavDropdownSection = "";
  queryAll(".switcher-item").forEach((item) => item.classList.remove("is-open"));
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

function renderOwners() {
  renderList(
    elements.ownersList,
    state.owners,
    (owner) => `
      <article class="list-card">
        <h4>${escapeHtml(owner.full_name)}</h4>
        <p>${escapeHtml(owner.identification_type)} ${escapeHtml(owner.identification_number)}</p>
        <p>Telefono: ${escapeHtml(owner.phone || "Sin dato")}</p>
        <p>Correo: ${escapeHtml(owner.email || "Sin dato")}</p>
        <p>Mascotas: ${owner.patients_count || 0}</p>
      </article>
    `,
    "Aun no hay propietarios registrados."
  );
}

function renderPatients() {
  renderList(
    elements.patientsList,
    state.patients,
    (patient) => `
      <article class="list-card">
        <h4>${escapeHtml(patient.name)}</h4>
        <p>${escapeHtml(patient.species)}${patient.breed ? ` / ${escapeHtml(patient.breed)}` : ""}</p>
        <p>Responsable: ${escapeHtml(patient.owner_name)}</p>
        <p>Historias: ${patient.records_count || 0}</p>
      </article>
    `,
    "Aun no hay pacientes registrados."
  );
}

function renderAppointments() {
  renderList(
    elements.appointmentsList,
    state.appointments,
    (appointment) => {
      const actions = [];
      const terminal = ["completed", "cancelled", "no_show"].includes(appointment.status);
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
  renderAgendaMonth();
  renderAgendaSelectedDay();
  renderGoogleCalendarStatus();
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
    const appointments = listAppointmentsForDate(currentIso);
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
        <span class="agenda-date-card__meta">${slots.filter((slot) => !slot.occupied).length} libres</span>
      </button>
    `);
  }
  elements.agendaMonthGrid.innerHTML = cards.join("");
}

function renderAgendaSelectedDay() {
  elements.appointmentModalSelectedDate.textContent = formatAgendaDateLabel(agendaSelectedDate);
  elements.agendaSelectedDateLabel.textContent = formatAgendaDateLabel(agendaSelectedDate);

  const slots = buildAgendaSlots(agendaSelectedDate);
  elements.agendaDaySlots.innerHTML = slots.length
    ? slots
        .map(
          (slot) => `
            <button
              type="button"
              class="slot-pill${slot.occupied ? " is-occupied" : ""}"
              data-slot-at="${escapeHtml(slot.slot_at)}"
              ${slot.occupied ? "disabled" : ""}
            >
              ${escapeHtml(slot.label)} - ${escapeHtml(slot.end_label)}
              <small>${escapeHtml(slot.professional_name)}${slot.location ? ` / ${escapeHtml(slot.location)}` : ""}</small>
              ${slot.occupied ? `<strong>${escapeHtml(slot.patient_name)}</strong>` : "<strong>Disponible</strong>"}
            </button>
          `
        )
        .join("")
    : emptyState("No hay bloques configurados para este dia.");

  renderList(
    elements.agendaSelectedDayAppointments,
    listAppointmentsForDate(agendaSelectedDate),
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
        <p>${escapeHtml(appointment.professional_name || "Agenda general")}</p>
      </article>
    `,
    "No hay citas registradas para este dia."
  );
}

function renderGoogleCalendarStatus() {
  const info = state.google_calendar || {};
  elements.agendaConnectionBadge.textContent = info.connected ? "Google conectado" : "Google pendiente";
  elements.agendaConnectionBadge.className = `pill ${info.connected ? "pill--confirmed" : "pill--draft"}`;
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

function renderRecords() {
  renderList(
    elements.recordsList,
    state.records,
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
    "Aun no hay historias clinicas registradas."
  );
}

function renderConsultations() {
  const activeConsultorioOption = getSubsectionOption("consultorio");
  const visibleConsultations = activeConsultorioOption?.consultationType
    ? state.consultations.filter(
        (consultation) => consultation.consultation_type === activeConsultorioOption.consultationType
      )
    : state.consultations;
  renderList(
    elements.consultationsList,
    visibleConsultations,
    (consultation) => `
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
        <p>${escapeHtml(truncate(consultation.summary))}</p>
        <p>${escapeHtml(consultation.document_reference || consultation.referred_to || "")}</p>
      </article>
    `,
    "Aun no hay consultas internas registradas."
  );
}

function renderConsents() {
  renderSummary(
    elements.consentTypeList,
    Object.entries(state.dashboard.consents_by_type || {}),
    "Aun no hay consentimientos registrados."
  );
  renderList(
    elements.consentsList,
    state.consents,
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
    "Aun no hay consentimientos registrados."
  );
}

function renderGrooming() {
  renderList(
    elements.groomingList,
    state.grooming_documents,
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
    "Aun no hay documentos de peluqueria."
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

function renderSelects() {
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
  [
    elements.appointmentPatientSelect,
    elements.billingPatientSelect,
    elements.recordPatientSelect,
    elements.consentPatientSelect,
    elements.groomingPatientSelect,
  ].forEach((select) => populateSelect(select, state.patients, patientLabel, "Selecciona paciente"));
  const recordLabel = (record) => `${record.patient_name} / ${formatDateTime(record.opened_at)}`;
  [elements.consultationRecordSelect, elements.evolutionRecordSelect, elements.consentRecordSelect].forEach(
    (select) => populateSelect(select, state.records, recordLabel, "Selecciona historia")
  );
  populateSelect(
    elements.consultationConsentSelect,
    state.consents,
    (consent) => `${consent.patient_name} / ${consent.procedure_name}`,
    "Consentimiento opcional"
  );
  populateSelect(
    elements.consentConsultationSelect,
    state.consultations,
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
}

function resetForm(form) {
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

function renderAll() {
  renderDashboard();
  applySettingsForm();
  renderOwners();
  renderPatients();
  renderAppointments();
  renderAvailability();
  renderSales();
  renderRecords();
  renderConsultations();
  renderConsents();
  renderGrooming();
  renderHospAmb();
  renderRequests();
  renderReports();
  renderCompliance();
  renderSelects();
  renderBillingDraftLines();
  syncBillingDocumentFormState();
  Object.keys(sectionSubsections).forEach(applySectionSubsection);
}

async function refreshData(message) {
  const payload = await api.bootstrap();
  Object.assign(state, payload);
  if (!toIsoDate(agendaSelectedDate)) {
    agendaSelectedDate = toIsoDate(new Date());
  }
  renderAll();
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

function openAppointmentModal(initialDateTime = "") {
  const dateTimeValue =
    initialDateTime || `${agendaSelectedDate}T08:00`;
  elements.appointmentModal.classList.remove("is-hidden");
  elements.appointmentModal.setAttribute("aria-hidden", "false");
  elements.appointmentForm.elements.appointment_at.value = toInputDateTime(dateTimeValue);
  elements.appointmentModalSelectedDate.textContent = formatAgendaDateLabel(
    toIsoDate(dateTimeValue) || agendaSelectedDate
  );
}

function closeAppointmentModal() {
  elements.appointmentModal.classList.add("is-hidden");
  elements.appointmentModal.setAttribute("aria-hidden", "true");
}

function openGoogleCalendarModal() {
  elements.googleCalendarModal.classList.remove("is-hidden");
  elements.googleCalendarModal.setAttribute("aria-hidden", "false");
}

function closeGoogleCalendarModal() {
  elements.googleCalendarModal.classList.add("is-hidden");
  elements.googleCalendarModal.setAttribute("aria-hidden", "true");
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
  await api.saveOwner(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  await refreshData("Propietario guardado.");
  setActiveSection("administration");
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
  await api.savePatient(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  await refreshData("Paciente guardado.");
  setActiveSection("consultorio");
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
  await api.saveAppointment(payload);
  agendaSelectedDate = toIsoDate(payload.appointment_at) || agendaSelectedDate;
  resetForm(event.currentTarget);
  closeAppointmentModal();
  setDateTimeDefaults();
  await refreshData("Cita guardada.");
  setActiveSection("agenda");
}

async function handleAvailabilitySubmit(event) {
  event.preventDefault();
  await api.saveAvailability(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  await refreshData("Disponibilidad guardada.");
  setActiveSection("agenda");
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
  const button = event.target.closest("button[data-appointment-id]");
  if (!button) {
    return;
  }
  await api.updateAppointmentStatus(button.dataset.appointmentId, button.dataset.status);
  await refreshData("Estado de cita actualizado.");
}

async function handleAvailabilityRulesClick(event) {
  const button = event.target.closest("button[data-delete-availability]");
  if (!button) {
    return;
  }
  await api.deleteAvailability(button.dataset.deleteAvailability);
  await refreshData("Horario de atencion eliminado.");
}

function handleAgendaMonthClick(event) {
  const dateButton = event.target.closest("[data-agenda-date]");
  if (dateButton) {
    setAgendaSelectedDate(dateButton.dataset.agendaDate);
    return;
  }
  const slotButton = event.target.closest("[data-slot-at]");
  if (slotButton && !slotButton.disabled) {
    openAppointmentModal(slotButton.dataset.slotAt);
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
      setActiveSection(sectionId);
      const wrapper = button.closest(".switcher-item");
      if (!wrapper) {
        return;
      }
      const shouldOpen = openNavDropdownSection !== sectionId;
      closeNavDropdowns();
      if (shouldOpen) {
        wrapper.classList.add("is-open");
        openNavDropdownSection = sectionId;
      }
    });
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".switcher-item")) {
      closeNavDropdowns();
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNavDropdowns();
      closeAppointmentModal();
      closeGoogleCalendarModal();
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
  elements.settingsForm.addEventListener("submit", wrapAsync(handleSettingsSubmit));
  elements.billingSettingsForm.addEventListener("submit", wrapAsync(handleBillingSettingsSubmit));
  elements.ownerForm.addEventListener("submit", wrapAsync(handleOwnerSubmit));
  elements.providerForm.addEventListener("submit", wrapAsync(handleProviderSubmit));
  elements.patientForm.addEventListener("submit", wrapAsync(handlePatientSubmit));
  elements.catalogForm.addEventListener("submit", wrapAsync(handleCatalogSubmit));
  elements.appointmentForm.addEventListener("submit", wrapAsync(handleAppointmentSubmit));
  elements.availabilityForm.addEventListener("submit", wrapAsync(handleAvailabilitySubmit));
  elements.googleCalendarForm.addEventListener("submit", wrapAsync(handleGoogleCalendarSubmit));
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
  elements.appointmentsList.addEventListener("click", wrapAsync(handleAppointmentsClick));
  elements.availabilityRulesList.addEventListener("click", wrapAsync(handleAvailabilityRulesClick));
  elements.agendaMonthGrid.addEventListener("click", handleAgendaMonthClick);
  elements.agendaDaySlots.addEventListener("click", handleAgendaMonthClick);
  elements.recordsList.addEventListener("click", handleRecordsClick);
  elements.openAppointmentModalButton.addEventListener("click", () => openAppointmentModal());
  elements.closeAppointmentModalButton.addEventListener("click", closeAppointmentModal);
  elements.appointmentModal.addEventListener("click", (event) => {
    if (event.target.dataset.closeAppointmentModal) {
      closeAppointmentModal();
    }
  });
  elements.googleCalendarManageButton.addEventListener("click", openGoogleCalendarModal);
  elements.closeGoogleCalendarModalButton.addEventListener("click", closeGoogleCalendarModal);
  elements.googleCalendarModal.addEventListener("click", (event) => {
    if (event.target.dataset.closeGoogleCalendarModal) {
      closeGoogleCalendarModal();
    }
  });
  elements.agendaPrevMonthButton.addEventListener("click", () => {
    agendaViewDate = new Date(agendaViewDate.getFullYear(), agendaViewDate.getMonth() - 1, 1);
    renderAvailability();
  });
  elements.agendaTodayButton.addEventListener("click", () => {
    agendaSelectedDate = toIsoDate(new Date());
    agendaViewDate = new Date();
    renderAvailability();
  });
  elements.agendaNextMonthButton.addEventListener("click", () => {
    agendaViewDate = new Date(agendaViewDate.getFullYear(), agendaViewDate.getMonth() + 1, 1);
    renderAvailability();
  });
  elements.googleCalendarConnectButton.addEventListener(
    "click",
    wrapAsync(handleGoogleCalendarConnect)
  );
  elements.googleCalendarDisconnectButton.addEventListener(
    "click",
    wrapAsync(handleGoogleCalendarDisconnect)
  );
  elements.billingDocumentTypeSelect.addEventListener("change", syncBillingDocumentFormState);
  elements.billingPaymentMethodSelect.addEventListener("change", syncBillingDocumentFormState);
  elements.consentTypeSelect.addEventListener("change", () =>
    applyConsentTemplate(elements.consentTypeSelect.value)
  );
}

async function initApp() {
  cacheElements();
  buildNavDropdowns();
  bindNavigation();
  bindNavDropdowns();
  bindForms();
  setActiveSection("dashboard");
  setDateTimeDefaults();
  await refreshData("Version web lista.");
}

window.addEventListener("DOMContentLoaded", () => {
  initApp().catch((error) => {
    showStatus(error.message || "No fue posible inicializar la app.", "error");
  });
});
