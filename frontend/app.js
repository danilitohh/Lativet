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
  cash_sessions: [],
  stock_movements: [],
  users: [],
  billing_summary: {},
  requests: {},
  reports: {},
  sales_report: null,
  compliance: {},
  google_calendar: {},
  generated_at: "",
  database_path: "",
  backups_path: "",
};

const elements = {};
const billingDraft = { lines: [] };
const inventoryUiState = {
  search: "",
  category: "",
  providerId: "",
  providerDraftId: "",
  detailItemId: "",
  status: "all",
  lowStockOnly: false,
  selectedItemId: "",
  page: 1,
  pageSize: 10,
  showStockForm: false,
  showProviderForm: false,
  showProductForm: false,
};
const CATALOG_PRESENTATION_OPTIONS = [
  { value: "unidad", label: "Unidad" },
  { value: "caja", label: "Caja" },
  { value: "frasco", label: "Frasco" },
  { value: "blister", label: "Blister" },
  { value: "tableta", label: "Tableta" },
  { value: "capsula", label: "Capsula" },
  { value: "ampolla", label: "Ampolla" },
  { value: "vial", label: "Vial" },
  { value: "bolsa", label: "Bolsa" },
  { value: "tubo", label: "Tubo" },
  { value: "sobre", label: "Sobre" },
  { value: "spray", label: "Spray" },
  { value: "gotero", label: "Gotero" },
  { value: "kit", label: "Kit" },
  { value: "paquete", label: "Paquete" },
  { value: "servicio", label: "Servicio" },
  { value: "sesion", label: "Sesion" },
  { value: "procedimiento", label: "Procedimiento" },
  { value: "otro", label: "Otro" },
];
const BILLING_WIZARD_STEPS = [
  { step: 1, label: "Datos de factura" },
  { step: 2, label: "Items" },
  { step: 3, label: "Pago" },
  { step: 4, label: "Resumen" },
];
const billingWizardState = { currentStep: 1 };
let salesSelectedDocumentId = "";
let salesSelectedDocument = null;
let salesReportPromise = null;
const SALES_DOCUMENT_SUBSECTIONS = new Set(["factura", "cotizacion"]);
const salesReportState = {
  start_date: "",
  end_date: "",
  as_of_date: "",
  loading: false,
  loaded: false,
  requestedKey: "",
};
const activeAppointmentStatuses = new Set([
  "scheduled",
  "pending_confirmation",
  "waiting_room",
  "confirmed",
]);
const hiddenCalendarStatuses = new Set(["cancelled", "no_show"]);
const APPOINTMENT_STATUS_META = {
  scheduled: { label: "Agendada", tone: "scheduled" },
  pending_confirmation: { label: "Por confirmar", tone: "pending_confirmation" },
  waiting_room: { label: "Sala de espera", tone: "waiting_room" },
  confirmed: { label: "Confirmada", tone: "confirmed" },
  completed: { label: "Completada", tone: "completed" },
  cancelled: { label: "Cancelada", tone: "cancelled" },
  no_show: { label: "No asistio", tone: "no_show" },
};
const APPOINTMENT_STATUS_ORDER = [
  "scheduled",
  "pending_confirmation",
  "waiting_room",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];
const GOOGLE_ATTENDEE_RESPONSE_META = {
  accepted: "Invitacion aceptada",
  tentative: "Respuesta tentativa",
  needsAction: "Pendiente de respuesta",
  declined: "Invitacion rechazada",
};
const activeSubsections = {};
let openNavDropdownSection = "";
let agendaViewDate = new Date();
let agendaSelectedDate = new Date().toISOString().slice(0, 10);
const agendaDragState = { appointmentId: "", sourceSlotAt: "" };
const AGENDA_VIEW_MODES = ["month", "week", "day", "list", "programador"];
const AGENDA_VIEW_STORAGE_KEY = "lativet_agenda_view";
const AGENDA_APPOINTMENT_TYPE_META = {
  consulta: { label: "Consulta", shortLabel: "Consultas" },
  vacunacion: { label: "Vacunacion", shortLabel: "Vacunas" },
  desparasitacion: { label: "Desparasitacion", shortLabel: "Desparasitaciones" },
  cirugia: { label: "Cirugia", shortLabel: "Cirugias" },
  laboratorio: { label: "Laboratorio", shortLabel: "Laboratorio" },
  imagen: { label: "Imagen", shortLabel: "Imagenes" },
  seguimiento: { label: "Seguimiento", shortLabel: "Seguimientos" },
  peluqueria: { label: "Peluqueria", shortLabel: "Peluqueria" },
  documento: { label: "Documento", shortLabel: "Documentos" },
  default: { label: "Cita", shortLabel: "Citas" },
};
const AGENDA_QUICK_TYPE_ORDER = [
  "consulta",
  "vacunacion",
  "cirugia",
  "peluqueria",
  "seguimiento",
  "laboratorio",
  "imagen",
  "desparasitacion",
  "documento",
  "default",
];
const CONSULTORIO_DOCUMENT_FORMATS_STORAGE_KEY = "lativet_document_formats";
const DEFAULT_CONSULTORIO_DOCUMENT_FORMATS = [
  "Documento general",
  "Consentimiento informado",
  "Certificado / constancia",
  "Informe clinico",
  "Remision",
  "Autorizacion especial",
  "Estancia / hospitalizacion",
];
let agendaViewMode = "day";
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
let consultorioPatientProfileNotesVisible = false;
let consultorioDocumentFormats = [];
let patientDocumentEditorMode = "visual";
let patientDocumentLastGeneratedHtml = "";
let patientDocumentLastSuggestedName = "";
let pendingLabTestContext = null;
let pendingProcedureOrderItemIndex = null;
let activeSectionId = "dashboard";
let pendingAppointmentDraft = null;
let returnToAppointmentModal = false;
let pendingConsentPatientId = "";
let pendingGroomingPatientId = "";
let agendaAutoSyncInFlight = false;
let agendaAutoSyncTimerId = 0;
const GROOMING_DOCUMENT_TYPE_LABEL = "Registro de peluquería y spa";
const GROOMING_SERVICE_TYPE_OPTIONS = [
  "Baño",
  "Baño medicado",
  "Corte",
  "Corte higiénico",
  "Spa",
  "Cepillado",
  "Deslanado",
  "Corte de uñas",
  "Limpieza de oídos",
  "Paquete completo",
  "Otro",
];
const GROOMING_RABIES_STATUS_LABELS = {
  vigente: "Vigente",
  vencida: "Vencida",
  pendiente: "Pendiente",
  no_registra: "Sin registro",
  no_aplica: "No aplica",
};
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
  { key: "consents", label: "Consentimientos" },
  { key: "hospamb", label: "Hosp./Amb." },
  { key: "requests", label: "Solicitudes" },
  { key: "reports", label: "Informes" },
];
const permissionLabelMap = permissionOptions.reduce((acc, option) => {
  acc[option.key] = option.label;
  return acc;
}, {});
const DASHBOARD_QUICK_ACTIONS = [
  {
    shortcut: "factura",
    title: "Crear factura",
    description: "Inicia la facturacion del dia y deja listo el seguimiento de pagos.",
    badge: "Ventas",
    image: "crear factura.png",
    icon: "invoice",
    requires: "sales",
    meta: () => {
      const pending = getDashboardPendingBillingDocumentsCount();
      return pending ? `${pending} pendientes` : "Facturacion inmediata";
    },
  },
  {
    shortcut: "cotizacion",
    title: "Crear cotizacion",
    description: "Prepara presupuestos y comparte una propuesta rapida al cliente.",
    badge: "Ventas",
    image: "crear cotizacion.png",
    icon: "quote",
    requires: "sales",
    meta: () => getDashboardQuoteCountText(),
  },
  {
    shortcut: "abono",
    title: "Registrar abono",
    description: "Ve directo a facturas para cargar pagos parciales o totales.",
    badge: "Cobros",
    image: "registrar abono.png",
    icon: "payment",
    requires: "sales",
    meta: () => {
      const pending = getDashboardPendingBillingDocumentsCount();
      return pending ? `${pending} por revisar` : "Saldo al dia";
    },
  },
  {
    shortcut: "caja",
    title: "Registrar ingreso o gasto",
    description: "Abre caja para movimientos operativos, aperturas y cierres.",
    badge: "Caja",
    image: "registrar ingreso o gasto.png",
    icon: "cash",
    requires: "sales",
    meta: () => getDashboardCashSummaryText(),
  },
  {
    shortcut: "inventory",
    title: "Revisar inventario",
    description: "Consulta stock, ajustes, precios y alertas desde ventas.",
    badge: "Inventario",
    image: "revisar inventario.png",
    icon: "inventory",
    requires: "sales",
    meta: () => getDashboardLowStockText(),
  },
  {
    shortcut: "agenda",
    title: "Agenda del dia",
    description: "Salta a la programacion para confirmar, crear o editar citas.",
    badge: "Agenda",
    image: "agenda del dia.png",
    icon: "calendar",
    requires: "agenda",
    meta: () => `${state.dashboard?.appointments_today ?? 0} hoy`,
  },
  {
    shortcut: "patients",
    title: "Pacientes e historias",
    description: "Abre propietarios, mascotas y la historia clinica sin rodeos.",
    badge: "Clinica",
    image: "pacientes e historias.png",
    icon: "patient",
    requires: "consultorio",
    meta: () => `${state.dashboard?.patients ?? 0} mascotas`,
  },
  {
    shortcut: "consents",
    title: "Consentimientos",
    description: "Registra soportes legales y revisa el archivo disponible.",
    badge: "Legal",
    image: "consentimientos.png",
    icon: "consent",
    requires: "consents",
    meta: () => `${state.dashboard?.consents ?? 0} registrados`,
  },
  {
    shortcut: "grooming",
    title: "Peluqueria",
    description: "Entra directo al modulo de grooming para servicios y control.",
    badge: "Spa",
    image: "peluqueria.png",
    icon: "grooming",
    requires: "consultorio",
    meta: () => `${state.dashboard?.grooming_total ?? 0} servicios`,
  },
  {
    shortcut: "reports",
    title: "Ver reportes",
    description: "Abre el resumen operativo y financiero para tomar decisiones.",
    badge: "Informes",
    image: "ver reportes.png",
    icon: "report",
    requires: "reports",
    meta: () => `${state.dashboard?.consultations_total ?? 0} consultas`,
  },
  {
    shortcut: "users",
    title: "Usuarios y permisos",
    description: "Gestiona el equipo, accesos y roles desde administracion.",
    badge: "Equipo",
    image: "usuarios y permisos.png",
    icon: "users",
    requires: "administration",
    meta: () => getDashboardUsersText(),
  },
];
const DASHBOARD_SHORTCUT_REQUIREMENTS = {
  "dashboard-home": "dashboard",
  agenda: "agenda",
  sales: "sales",
  consultorio: "consultorio",
  consents: "consents",
  reports: "reports",
  administration: "administration",
  factura: "sales",
  cotizacion: "sales",
  abono: "sales",
  caja: "sales",
  inventory: "sales",
  patients: "consultorio",
  grooming: "consultorio",
  users: "administration",
};
const WORKSPACE_HEADER_CONFIG = {
  dashboard: {
    eyebrow: "Panel principal",
    title: "Dashboard",
    description: "Vision general del estado de la clinica.",
  },
  administration: {
    eyebrow: "Gestion interna",
    title: "Administracion",
    description: "Usuarios, permisos y control operativo.",
  },
  agenda: {
    eyebrow: "Atencion diaria",
    title: "Agenda",
    description: "Programacion, disponibilidad y seguimiento de citas.",
  },
  sales: {
    eyebrow: "Operacion comercial",
    title: "Ventas",
    description: "Facturacion, caja, inventario y movimientos comerciales.",
  },
  consultorio: {
    eyebrow: "Historia clinica",
    title: "Consultorio",
    description: "Pacientes, propietarios, consultas y documentos clinicos.",
  },
  consents: {
    eyebrow: "Soporte legal",
    title: "Consentimientos",
    description: "Archivo documental y consentimientos informados.",
  },
  hospamb: {
    eyebrow: "Seguimiento",
    title: "Hosp./Amb.",
    description: "Casos hospitalarios y control ambulatorio.",
  },
  requests: {
    eyebrow: "Bandeja operativa",
    title: "Solicitudes",
    description: "Revision centralizada de pendientes y solicitudes.",
  },
  reports: {
    eyebrow: "Analitica",
    title: "Informes",
    description: "Indicadores, reportes financieros y actividad reciente.",
  },
};
const usersFilters = { query: "", pageSize: 10 };
const ownersFilters = { query: "", petQuery: "" };
const consultorioPatientsFilters = { query: "" };
const authState = { requiresLogin: false, authenticated: false, currentUser: null };
const defaultUserModalContext = { source: "administration", labItemIndex: null };
let userModalContext = { ...defaultUserModalContext };
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
    label: "\u00d3rdenes",
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
    label: "Im\u00e1genes diagn\u00f3sticas",
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
    value: "grooming",
    label: "Peluquería",
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
  "consultorioGroomingFormPanel",
  "consultorioRecordsPanel",
  "consultorioConsultationsPanel",
  "consultorioGroomingPanel",
];
const SALES_PANEL_IDS = [
  "salesProviderFormPanel",
  "salesCatalogFormPanel",
  "salesDocumentFormPanel",
  "salesPaymentFormPanel",
  "salesCashPanel",
  "salesCashFormPanel",
  "salesCashSessionPanel",
  "salesCashMovementsPanel",
  "salesStockFormPanel",
  "salesProvidersPanel",
  "salesClientsPanel",
  "salesDocumentsPanel",
  "salesCatalogPanel",
  "salesStockHistoryPanel",
  "salesDocumentDetailPanel",
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
    "cash_sessions",
    "stock_movements",
    "billing_summary",
  ],
  consultorio: ["owners", "patients"],
  consents: ["owners", "patients", "records", "consultations", "consents"],
  hospamb: ["consultations"],
  requests: ["requests"],
  reports: ["reports"],
};
const SUBSECTION_DATA_REQUIREMENTS = {
  sales: {
    factura: ["patients", "catalog_items", "billing_documents"],
    cotizacion: ["patients", "catalog_items", "billing_documents"],
    inventario: ["providers", "catalog_items", "stock_movements", "billing_summary"],
    precios: ["providers", "catalog_items"],
    caja: ["cash_movements", "cash_sessions", "billing_summary"],
  },
  consultorio: {
    patients: ["owners", "patients"],
    grooming: ["owners", "patients", "grooming_documents"],
  },
};
const SALES_PROVIDER_REFRESH_SECTIONS = ["providers", "catalog_items"];
const SALES_INVENTORY_REFRESH_SECTIONS = [
  "providers",
  "catalog_items",
  "stock_movements",
  "billing_summary",
];
const SALES_PRICING_REFRESH_SECTIONS = ["catalog_items", "billing_summary"];

function getActiveSalesCatalogSubsection() {
  return getActiveSalesSubsectionValue() === "precios" ? "precios" : "inventario";
}

function getSalesCatalogRefreshSections(subsection = getActiveSalesCatalogSubsection()) {
  return subsection === "precios"
    ? SALES_PRICING_REFRESH_SECTIONS
    : SALES_INVENTORY_REFRESH_SECTIONS;
}

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
const CONSULTORIO_PROCEDURE_CUSTOM_OPTION = "__custom__";
const CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION = "__custom__";
const LAB_TEST_CATEGORY_CUSTOM_OPTION = "__custom__";
const LAB_TEST_LABEL_SEPARATOR = " - ";
const DEFAULT_DOCUMENT_EDITOR_FONT_FAMILY = "Plus Jakarta Sans";
const DEFAULT_DOCUMENT_EDITOR_FONT_SIZE = "3";
const DOCUMENT_EDITOR_STYLE_GROUPS = [
  {
    label: "Estilos de parrafo",
    options: [
      { value: "body_text", label: "Body Text" },
      { value: "lead_paragraph", label: "Lead Paragraph" },
      { value: "section_title", label: "Section Title" },
      { value: "italic_title", label: "Italic Title" },
      { value: "subtitle", label: "Subtitle" },
      { value: "special_container", label: "Special Container" },
      { value: "quote_box", label: "Quote Box" },
      { value: "code_block", label: "Code Block" },
      { value: "signature_line", label: "Signature Line" },
    ],
  },
  {
    label: "Estilos de caracter",
    options: [
      { value: "marker", label: "Marker" },
      { value: "important", label: "Important" },
      { value: "small_print", label: "Small Print" },
      { value: "inline_code", label: "Inline Code" },
      { value: "accent_text", label: "Accent Text" },
    ],
  },
];
const DOCUMENT_EDITOR_BLOCK_FORMAT_GROUPS = [
  {
    label: "Formato",
    options: [
      { value: "p", label: "Normal" },
      { value: "div", label: "Division" },
      { value: "h1", label: "Encabezado" },
      { value: "h2", label: "Encabezado 2" },
      { value: "h3", label: "Encabezado 3" },
      { value: "h4", label: "Encabezado 4" },
      { value: "h5", label: "Encabezado 5" },
      { value: "h6", label: "Encabezado 6" },
      { value: "blockquote", label: "Bloque de cita" },
      { value: "address", label: "Direccion" },
      { value: "pre", label: "Con formato" },
    ],
  },
];
const DOCUMENT_EDITOR_FONT_GROUPS = [
  {
    label: "Fuente",
    options: [
      { value: "default", label: "(Default)" },
      { value: "Arial", label: "Arial" },
      { value: "Arial Black", label: "Arial Black" },
      { value: "Book Antiqua", label: "Book Antiqua" },
      { value: "Calibri", label: "Calibri" },
      { value: "Cambria", label: "Cambria" },
      { value: "Comic Sans MS", label: "Comic Sans MS" },
      { value: "Courier New", label: "Courier New" },
      { value: "Georgia", label: "Georgia" },
      { value: "Helvetica", label: "Helvetica" },
      { value: "Impact", label: "Impact" },
      { value: "Lucida Console", label: "Lucida Console" },
      { value: "Lucida Sans Unicode", label: "Lucida Sans Unicode" },
      { value: "Palatino Linotype", label: "Palatino Linotype" },
      { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
      { value: "Sora", label: "Sora" },
      { value: "Tahoma", label: "Tahoma" },
      { value: "Times New Roman", label: "Times New Roman" },
      { value: "Trebuchet MS", label: "Trebuchet MS" },
      { value: "Verdana", label: "Verdana" },
      { value: "sans-serif", label: "Sans Serif" },
      { value: "serif", label: "Serif" },
      { value: "monospace", label: "Monospace" },
    ],
  },
];
const DOCUMENT_EDITOR_SIZE_GROUPS = [
  {
    label: "Tamano",
    options: [
      { value: "default", label: "(Default)" },
      { value: "1", label: "8" },
      { value: "2", label: "9" },
      { value: "3", label: "10" },
      { value: "4", label: "11" },
      { value: "5", label: "12" },
      { value: "6", label: "14" },
      { value: "7", label: "18" },
    ],
  },
];
const CONSULTORIO_DOCUMENT_FORMAT_ALIASES = {
  Certificado: "Certificado / constancia",
  "Resumen clinico": "Informe clinico",
  Autorizacion: "Autorizacion especial",
  Hospitalizacion: "Estancia / hospitalizacion",
  Guarderia: "Estancia / hospitalizacion",
};
const CONSULTORIO_VETERINARY_DOCUMENT_TEMPLATE_GROUPS = [
  {
    id: "general",
    formatLabel: "Documento general",
    templates: [
      {
        id: "general_free",
        label: "Documento libre veterinario",
        documentName: "Documento veterinario",
        description:
          "Base flexible para registrar constancias, comunicaciones internas o formatos personalizados.",
        requiresSignature: false,
        autofillFields: [
          "Propietario y datos de contacto",
          "Mascota, especie y raza",
          "Fecha del documento",
          "Profesional responsable",
        ],
        requiredFields: [
          "Objetivo del documento",
          "Contenido o instrucciones principales",
          "Observaciones finales",
          "Firma si aplica",
        ],
        recommendedSections: [
          "Encabezado del documento",
          "Datos del propietario",
          "Datos de la mascota",
          "Desarrollo principal",
          "Firmas y fecha",
        ],
        buildContent: buildConsultorioFreeDocumentTemplateHtml,
      },
    ],
  },
  {
    id: "consent",
    formatLabel: "Consentimiento informado",
    templates: [
      {
        id: "consent_surgery",
        label: "Consentimiento para cirugia",
        documentName: "Consentimiento informado para cirugia",
        description:
          "Autoriza procedimientos quirurgicos y deja constancia de riesgos, anestesia y posibles complicaciones.",
        requiresSignature: true,
        autofillFields: [
          "Propietario, documento y telefono",
          "Mascota, especie, raza, sexo y peso",
          "Fecha de emision",
          "Medico veterinario responsable",
        ],
        requiredFields: [
          "Diagnostico presuntivo",
          "Procedimiento autorizado",
          "Riesgos explicados",
          "Autorizaciones adicionales y firma",
        ],
        recommendedSections: [
          "Identificacion del propietario",
          "Identificacion del paciente",
          "Procedimiento y motivo",
          "Riesgos y autorizaciones",
          "Firmas",
        ],
        buildContent: buildConsultorioSurgeryConsentTemplateHtml,
      },
      {
        id: "consent_anesthesia",
        label: "Consentimiento para anestesia y sedacion",
        documentName: "Consentimiento para anestesia y sedacion",
        description:
          "Permite documentar anestesia general o sedacion, ayuno, monitoreo y riesgos anestesicos.",
        requiresSignature: true,
        autofillFields: [
          "Datos del propietario",
          "Datos clinicos basicos de la mascota",
          "Fecha del procedimiento",
          "Profesional a cargo",
        ],
        requiredFields: [
          "Tipo de anestesia o sedacion",
          "Valoracion preanestesica",
          "Riesgos discutidos",
          "Medicamentos y firmas",
        ],
        recommendedSections: [
          "Datos generales",
          "Evaluacion preanestesica",
          "Plan anestesico",
          "Riesgos aceptados",
          "Firmas",
        ],
        buildContent: buildConsultorioAnesthesiaConsentTemplateHtml,
      },
      {
        id: "consent_hospitalization",
        label: "Consentimiento para hospitalizacion",
        documentName: "Consentimiento para hospitalizacion",
        description:
          "Formaliza ingreso hospitalario, manejo medico, restricciones de visita y decisiones durante la estancia.",
        requiresSignature: true,
        autofillFields: [
          "Propietario y contacto principal",
          "Mascota y datos de identificacion",
          "Fecha de ingreso",
          "Veterinario tratante",
        ],
        requiredFields: [
          "Motivo de hospitalizacion",
          "Plan de manejo esperado",
          "Contacto secundario",
          "Condiciones economicas y firma",
        ],
        recommendedSections: [
          "Datos del ingreso",
          "Motivo clinico",
          "Alcance de la atencion",
          "Autorizaciones del propietario",
          "Firmas",
        ],
        buildContent: buildConsultorioHospitalizationConsentTemplateHtml,
      },
      {
        id: "consent_diagnostic",
        label: "Consentimiento para procedimiento diagnostico",
        documentName: "Consentimiento para procedimiento diagnostico",
        description:
          "Ideal para endoscopia, biopsia, puncion, toma de muestras o estudios que requieren autorizacion expresa.",
        requiresSignature: true,
        autofillFields: [
          "Propietario y paciente",
          "Fecha programada",
          "Profesional solicitante",
          "Centro veterinario",
        ],
        requiredFields: [
          "Procedimiento diagnostico solicitado",
          "Objetivo del estudio",
          "Riesgos y posibles hallazgos",
          "Autorizacion de toma de muestras y firma",
        ],
        recommendedSections: [
          "Datos del caso",
          "Procedimiento diagnostico",
          "Riesgos y alcances",
          "Destino de muestras",
          "Firmas",
        ],
        buildContent: buildConsultorioDiagnosticConsentTemplateHtml,
      },
      {
        id: "consent_euthanasia",
        label: "Consentimiento para eutanasia",
        documentName: "Consentimiento para eutanasia",
        description:
          "Documenta la solicitud, la justificacion medica y la autorizacion del propietario para eutanasia humanitaria.",
        requiresSignature: true,
        autofillFields: [
          "Propietario identificado",
          "Mascota y datos de identificacion",
          "Fecha y profesional responsable",
          "Centro veterinario",
        ],
        requiredFields: [
          "Motivo clinico o humanitario",
          "Metodo autorizado",
          "Destino del cuerpo o restos",
          "Declaracion y firma del propietario",
        ],
        recommendedSections: [
          "Datos del propietario",
          "Datos del paciente",
          "Justificacion de la decision",
          "Destino final",
          "Firmas",
        ],
        buildContent: buildConsultorioEuthanasiaConsentTemplateHtml,
      },
      {
        id: "consent_boarding",
        label: "Consentimiento para guarderia u hospedaje",
        documentName: "Consentimiento para guarderia veterinaria",
        description:
          "Sirve para guarderia, hotel o estancia corta con reglas de manejo, medicacion y autorizaciones.",
        requiresSignature: true,
        autofillFields: [
          "Propietario y telefonos",
          "Mascota, especie y raza",
          "Fechas de estancia",
          "Contacto de emergencia",
        ],
        requiredFields: [
          "Plan de alimentacion",
          "Medicamentos y cuidados especiales",
          "Objetos entregados",
          "Autorizacion de atencion en urgencias y firma",
        ],
        recommendedSections: [
          "Datos de ingreso",
          "Cuidados especiales",
          "Reglas de la estancia",
          "Autorizacion de emergencias",
          "Firmas",
        ],
        buildContent: buildConsultorioBoardingConsentTemplateHtml,
      },
    ],
  },
  {
    id: "certificate",
    formatLabel: "Certificado / constancia",
    templates: [
      {
        id: "certificate_health",
        label: "Certificado de salud",
        documentName: "Certificado de salud veterinaria",
        description:
          "Constancia del estado general del paciente con destino a tramites, colegio, transporte o archivos.",
        requiresSignature: false,
        autofillFields: [
          "Datos del propietario",
          "Datos completos de la mascota",
          "Fecha de expedicion",
          "Medico veterinario y licencia",
        ],
        requiredFields: [
          "Motivo de expedicion",
          "Hallazgos relevantes del examen",
          "Observaciones o restricciones",
          "Firma y sello si aplica",
        ],
        recommendedSections: [
          "Identificacion del paciente",
          "Evaluacion general",
          "Vacunacion o desparasitacion relevante",
          "Conclusiones",
          "Firma profesional",
        ],
        buildContent: buildConsultorioHealthCertificateTemplateHtml,
      },
      {
        id: "certificate_vaccination",
        label: "Constancia de vacunacion",
        documentName: "Constancia de vacunacion",
        description:
          "Resumen breve del plan vacunal vigente para soporte escolar, viajes o archivo del propietario.",
        requiresSignature: false,
        autofillFields: [
          "Propietario",
          "Mascota y datos basicos",
          "Fecha del documento",
          "Veterinario responsable",
        ],
        requiredFields: [
          "Vacunas aplicadas",
          "Fechas y proximos refuerzos",
          "Lote o laboratorio si se requiere",
          "Observaciones",
        ],
        recommendedSections: [
          "Datos del paciente",
          "Registro de vacunas",
          "Proximo control",
          "Observaciones",
          "Firma profesional",
        ],
        buildContent: buildConsultorioVaccinationCertificateTemplateHtml,
      },
      {
        id: "certificate_travel",
        label: "Certificado para viaje o transporte",
        documentName: "Certificado para viaje o transporte",
        description:
          "Plantilla para soportar traslados nacionales o internos con datos del animal, salud y recomendaciones.",
        requiresSignature: false,
        autofillFields: [
          "Propietario y contacto",
          "Mascota y senas particulares",
          "Fecha de emision",
          "Profesional emisor",
        ],
        requiredFields: [
          "Destino o motivo del traslado",
          "Verificacion sanitaria",
          "Restricciones o cuidados durante el viaje",
          "Firma profesional",
        ],
        recommendedSections: [
          "Datos de identificacion",
          "Estado sanitario",
          "Recomendaciones de transporte",
          "Vigencia del certificado",
          "Firma",
        ],
        buildContent: buildConsultorioTravelCertificateTemplateHtml,
      },
    ],
  },
  {
    id: "clinical",
    formatLabel: "Informe clinico",
    templates: [
      {
        id: "clinical_summary",
        label: "Resumen clinico",
        documentName: "Resumen clinico veterinario",
        description:
          "Sintetiza motivo de consulta, hallazgos, diagnosticos y plan terapeutico para historia o entrega al propietario.",
        requiresSignature: false,
        autofillFields: [
          "Propietario y paciente",
          "Fecha del informe",
          "Profesional tratante",
          "Datos basicos del caso",
        ],
        requiredFields: [
          "Motivo de consulta",
          "Hallazgos clinicos",
          "Impresion diagnostica",
          "Plan y recomendaciones",
        ],
        recommendedSections: [
          "Antecedentes",
          "Evaluacion clinica",
          "Diagnosticos",
          "Plan terapeutico",
          "Seguimiento sugerido",
        ],
        buildContent: buildConsultorioClinicalSummaryTemplateHtml,
      },
      {
        id: "clinical_discharge",
        label: "Alta medica o epicrisis",
        documentName: "Alta medica veterinaria",
        description:
          "Resume la atencion recibida, el estado al egreso y las indicaciones para casa.",
        requiresSignature: true,
        autofillFields: [
          "Propietario y mascota",
          "Fecha de alta",
          "Veterinario tratante",
          "Centro veterinario",
        ],
        requiredFields: [
          "Motivo de ingreso",
          "Tratamientos realizados",
          "Condicion al alta",
          "Indicaciones, controles y firma de recibido",
        ],
        recommendedSections: [
          "Ingreso y diagnostico",
          "Manejo durante la estancia",
          "Estado al alta",
          "Indicaciones para casa",
          "Firmas",
        ],
        buildContent: buildConsultorioDischargeSummaryTemplateHtml,
      },
      {
        id: "clinical_progress",
        label: "Informe de evolucion",
        documentName: "Informe de evolucion veterinaria",
        description:
          "Permite dejar una evolucion estructurada para hospitalizacion, control o llamada de seguimiento.",
        requiresSignature: false,
        autofillFields: [
          "Paciente y propietario",
          "Fecha de la evolucion",
          "Profesional responsable",
          "Datos de identificacion basicos",
        ],
        requiredFields: [
          "Respuesta al tratamiento",
          "Hallazgos de control",
          "Ajustes del plan",
          "Recomendaciones al propietario",
        ],
        recommendedSections: [
          "Estado actual",
          "Hallazgos de seguimiento",
          "Cambios terapeuticos",
          "Alertas o signos de alarma",
          "Proximo control",
        ],
        buildContent: buildConsultorioProgressReportTemplateHtml,
      },
    ],
  },
  {
    id: "referral",
    formatLabel: "Remision",
    templates: [
      {
        id: "referral_specialist",
        label: "Remision a especialista",
        documentName: "Remision veterinaria a especialista",
        description:
          "Para referir pacientes a ortopedia, neurologia, oncologia u otra especialidad con contexto clinico suficiente.",
        requiresSignature: false,
        autofillFields: [
          "Propietario y paciente",
          "Fecha de remision",
          "Profesional remitente",
          "Centro remitente",
        ],
        requiredFields: [
          "Motivo de remision",
          "Resumen clinico",
          "Examenes realizados",
          "Preguntas o expectativas para el especialista",
        ],
        recommendedSections: [
          "Motivo de remision",
          "Antecedentes relevantes",
          "Hallazgos y estudios",
          "Tratamientos instaurados",
          "Firma profesional",
        ],
        buildContent: buildConsultorioSpecialistReferralTemplateHtml,
      },
      {
        id: "referral_emergency",
        label: "Remision a urgencias o centro de mayor complejidad",
        documentName: "Remision a urgencias veterinarias",
        description:
          "Plantilla breve y priorizada para traslado urgente con signos de alarma, estabilizacion y contacto del remitente.",
        requiresSignature: false,
        autofillFields: [
          "Datos del paciente",
          "Propietario y telefono",
          "Hora y fecha del traslado",
          "Profesional remitente",
        ],
        requiredFields: [
          "Motivo de urgencia",
          "Estado actual del paciente",
          "Manejo realizado antes del traslado",
          "Indicaciones para el centro receptor",
        ],
        recommendedSections: [
          "Resumen del evento",
          "Hallazgos criticos",
          "Estabilizacion previa",
          "Informacion para recepcion",
          "Firma profesional",
        ],
        buildContent: buildConsultorioEmergencyReferralTemplateHtml,
      },
    ],
  },
  {
    id: "authorization",
    formatLabel: "Autorizacion especial",
    templates: [
      {
        id: "authorization_procedure",
        label: "Autorizacion de procedimiento o tratamiento",
        documentName: "Autorizacion de procedimiento veterinario",
        description:
          "Autorizacion breve para procedimientos no quirurgicos, tratamientos especiales o decisiones puntuales.",
        requiresSignature: true,
        autofillFields: [
          "Propietario y paciente",
          "Fecha del documento",
          "Profesional responsable",
          "Centro veterinario",
        ],
        requiredFields: [
          "Procedimiento autorizado",
          "Objetivo o beneficio esperado",
          "Costos o condiciones informadas",
          "Firma del propietario",
        ],
        recommendedSections: [
          "Datos generales",
          "Descripcion del procedimiento",
          "Condiciones y alcances",
          "Autorizacion expresa",
          "Firmas",
        ],
        buildContent: buildConsultorioProcedureAuthorizationTemplateHtml,
      },
      {
        id: "authorization_discharge_against_advice",
        label: "Alta bajo responsabilidad del propietario",
        documentName: "Alta bajo responsabilidad",
        description:
          "Deja constancia de retiro voluntario cuando el propietario no acepta continuar con la hospitalizacion o plan sugerido.",
        requiresSignature: true,
        autofillFields: [
          "Propietario y documento",
          "Mascota y diagnostico basico",
          "Fecha y hora de retiro",
          "Profesional que informa",
        ],
        requiredFields: [
          "Recomendacion medica emitida",
          "Riesgos explicados por retiro",
          "Compromisos del propietario",
          "Firma de responsabilidad",
        ],
        recommendedSections: [
          "Contexto del retiro",
          "Recomendacion medica",
          "Riesgos advertidos",
          "Declaracion del propietario",
          "Firmas",
        ],
        buildContent: buildConsultorioDischargeAgainstAdviceTemplateHtml,
      },
    ],
  },
  {
    id: "stay",
    formatLabel: "Estancia / hospitalizacion",
    templates: [
      {
        id: "stay_hospital_admission",
        label: "Ingreso a hospitalizacion",
        documentName: "Formato de ingreso a hospitalizacion",
        description:
          "Registra el estado inicial del paciente, pertenencias, tratamientos activos y responsables durante la estancia.",
        requiresSignature: true,
        autofillFields: [
          "Propietario y contacto principal",
          "Paciente, especie, raza y peso",
          "Fecha de ingreso",
          "Profesional responsable",
        ],
        requiredFields: [
          "Motivo de ingreso",
          "Diagnostico inicial",
          "Medicacion activa",
          "Pertenencias y autorizaciones",
        ],
        recommendedSections: [
          "Datos de ingreso",
          "Estado inicial",
          "Tratamiento actual",
          "Pertenencias y observaciones",
          "Firmas",
        ],
        buildContent: buildConsultorioHospitalAdmissionTemplateHtml,
      },
      {
        id: "stay_boarding_admission",
        label: "Ingreso a guarderia u hospedaje",
        documentName: "Formato de ingreso a guarderia",
        description:
          "Sirve para registrar entradas a hotel o guarderia con alimentacion, objetos personales y contacto de emergencia.",
        requiresSignature: true,
        autofillFields: [
          "Propietario y telefonos",
          "Mascota y datos de identificacion",
          "Fechas de ingreso y salida",
          "Contacto alterno",
        ],
        requiredFields: [
          "Alimento y dosis",
          "Medicamentos o restricciones",
          "Objetos entregados",
          "Condiciones de la estancia y firma",
        ],
        recommendedSections: [
          "Datos de la estancia",
          "Rutina y cuidados",
          "Objetos recibidos",
          "Autorizaciones de emergencia",
          "Firmas",
        ],
        buildContent: buildConsultorioBoardingAdmissionTemplateHtml,
      },
    ],
  },
];
const CONSULTORIO_VETERINARY_DOCUMENT_TEMPLATE_MAP =
  CONSULTORIO_VETERINARY_DOCUMENT_TEMPLATE_GROUPS.reduce((acc, group) => {
    (group.templates || []).forEach((template) => {
      acc[template.id] = { ...template, categoryId: group.id, formatLabel: group.formatLabel };
    });
    return acc;
  }, {});
const LAB_TEST_CATEGORY_OPTIONS = [
  "PERFILES MAS USADOS",
  "PARASITOLOGIA VETERINARIA",
  "SEROLOGIAS EN CANINOS",
  "PRUEBAS SEROLOGICAS EN FELINOS",
  "QUIMICA SANGUINEA",
  "HORMONAS",
  "HEMATOLOGIA VETERINARIA",
  "HEMOPARASITOS",
  "COAGULACION",
  "ANALISIS DE LIQUIDOS Y OTROS",
  "CITOLOGIA VETERINARIA",
  "MICROBIOLOGIA - TRADICIONAL",
  "MICROBIOLOGIA TRADICIONAL - PERFILES",
  "MICROBIOLOGIA - MICROSCAN",
  "MICROBIOLOGIA GRANDES ESPECIES - MICROSCAN",
];
const CONSULTORIO_ORDER_STANDARD_PRIORITY_OPTIONS = ["Baja", "Media", "Alta", "Urgente"];
const CONSULTORIO_HOSPITALIZATION_PRIORITY_OPTIONS = [
  {
    value: "Emergencia",
    description: "Requiere atencion inmediata, en un periodo no mayor a 2 horas.",
    tone: "critical",
  },
  {
    value: "Urgencia",
    description: "Puede tener preparacion/estabilizacion antes del proceso, en un periodo no mayor a 24 horas.",
    tone: "warning",
  },
  {
    value: "Prioritario",
    description: "Si la vida no esta en riesgo, en un periodo no mayor a 7 dias.",
    tone: "info",
  },
  {
    value: "Electiva",
    description: "Segun condiciones, realizar en un periodo no mayor a un mes.",
    tone: "neutral",
  },
];
const CONSULTORIO_ORDER_TYPE_OPTIONS = [
  "Consulta",
  "Cirugia/procedimiento",
  "Prueba/Examen",
  "Imagen diagnostica",
  "Remision",
  "Medicamento",
  "Hospitalizacion",
  "Otro",
];
const CONSULTORIO_ORDER_SEARCHABLE_TYPES = [
  "Consulta",
  "Cirugia/procedimiento",
  "Prueba/Examen",
];
const CONSULTORIO_ORDER_CATALOG = {
  Consulta: [
    "General",
    "Revision/Chequeo",
    "Alergologia",
    "Anestesiologia",
    "Cardiologia",
    "Dermatologia",
    "Urgencias",
    "Endocrinologia",
    "Etologia",
    "Gastroenterologia",
    "Hospitalizacion",
    "Cuidados criticos o intensivos",
    "Cirugia laser",
    "Nefrologia",
    "Neurologia",
    "Nutricion",
    "Reproduccion u obstetricia",
    "Odontologia",
    "Oncologia",
    "Oftalmologia",
    "Ortopedia",
    "Fisioterapia",
    "Neumologia",
    "Consulta preanestesica",
    "Consulta prequirurgica",
    "Psicologia",
    "Cirugia tejidos blandos",
    "Esterilizacion",
    "Otro",
    "Acupuntura",
    "Consulta no programada",
  ],
  "Cirugia/procedimiento": [
    "ABDOMINOCENTESIS ECOGUIDA",
    "ABLACION DEL CONDUCTO AUDITIVO EXTERNO BILATERAL",
    "ABLACION DEL CONDUCTO AUDITIVO EXTERNO UNILATERAL",
    "ABSCESOS O QUISTES PROSTATICOS",
    "ADENOPEXIA EN SOBRE BILATERAL",
    "ADENOPEXIA EN SOBRE UNILATERAL",
    "AMPUTACION DE COLA NO ELECTIVO",
    "AMPUTACION DEL PENE",
    "AMPUTACION FALANGES NO ELECTIVO CON CAUSA PATOLOGICA",
    "ARTROCENTESIS CON SEDACION",
    "ARTROSCOPIA",
    "AVULSION DE CRESTA TIBIAL",
    "BIOPSIA DE CAVIDAD ORAL",
    "BIOPSIA DE PIEL",
    "CESAREA",
    "ESTERILIZACION",
    "LIMPIEZA DENTAL",
    "SUTURA",
  ],
  "Prueba/Examen": [
    "PERFIL DE CHEQUEO I (Hemograma+Alt+Creatinina+Glucosa)",
    "PERFIL DE CHEQUEO II (Hemograma+Alt+Ast+Fosfatasa alcalina ALP)",
    "PERFIL DE CHEQUEO III (Hemograma+Ast+Ggt+Glucosa+Proteinas Sericas)",
    "PERFIL RENAL I (Bun+Urea+Creatinina+Citoquimico de Orina)",
    "PERFIL RENAL II (Hemograma+Creatinina+Urea+Bun)",
    "PERFIL SDMA1 (SDMA + Creatinina)",
    "PERFIL SDMA2 (SDMA + Creatinina + Citoquimico de Orina)",
    "PERFIL RENAL III (Hemograma+Creatinina+Urea+Bun+C. Orina)",
    "PERFIL PREQUIRURGICO I (Hemograma+Alt+Creatinina)",
    "PERFIL PREQUIRURGICO II (Hemograma+Alt+Creatinina+TP+TPT)",
    "HEMOGRAMA",
    "QUIMICA SANGUINEA",
    "UROANALISIS",
    "COPROLOGICO",
    "CITOLOGIA",
  ],
  "Imagen diagnostica": [
    "RADIOGRAFIA",
    "ECOGRAFIA",
    "ECOCARDIOGRAMA",
    "TOMOGRAFIA",
    "RESONANCIA MAGNETICA",
  ],
  Remision: [
    "MEDICINA INTERNA",
    "CIRUGIA",
    "ONCOLOGIA",
    "DERMATOLOGIA",
    "NEUROLOGIA",
  ],
  Medicamento: [
    "ANTIBIOTICO",
    "ANTIINFLAMATORIO",
    "ANALGESICO",
    "FLUIDOTERAPIA",
    "SUPLEMENTO",
  ],
  Hospitalizacion: [
    "OBSERVACION",
    "HOSPITALIZACION 24 HORAS",
    "HOSPITAL DE DIA",
    "CUIDADOS INTENSIVOS",
  ],
  Otro: ["Otra orden"],
};
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
const billingCashAccountLabels = {
  caja_menor: "Caja menor",
  caja_mayor: "Caja mayor",
  transferencia: "Transferencias",
};
const sectionSubsections = {
  dashboard: {
    label: "Vista del dashboard",
    options: [
      { value: "overview", label: "Resumen general", panels: ["dashboardOverviewBlock"] },
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
        value: "factura",
        label: "Factura",
        panels: [
          "salesDocumentFormPanel",
          "salesPaymentFormPanel",
          "salesDocumentsPanel",
        ],
      },
      {
        value: "cotizacion",
        label: "Cotizacion",
        panels: [
          "salesDocumentFormPanel",
          "salesDocumentsPanel",
          "salesDocumentDetailPanel",
          "salesClientsPanel",
        ],
      },
      {
        value: "inventario",
        label: "Inventario",
        panels: ["salesCatalogPanel"],
      },
      {
        value: "precios",
        label: "Precios",
        panels: [
          "salesCatalogPanel",
        ],
      },
      {
        value: "caja",
        label: "Caja",
        panels: [
          "salesCashPanel",
          "salesCashSessionPanel",
          "salesCashFormPanel",
          "salesCashMovementsPanel",
        ],
      },
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
        label: "Peluquería",
        panels: ["consultorioGroomingFormPanel", "consultorioGroomingPanel"],
      },
    ],
  },
  consents: {
    label: "Que quieres revisar en consentimientos",
    options: [
      {
        value: "general",
        label: "Registro y archivo",
        panels: ["consentsFormPanel", "consentsArchivePanel"],
      },
      {
        value: "archive",
        label: "Archivo legal",
        panels: ["consentsArchivePanel"],
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
        panels: [
          "salesReportsFiltersPanel",
          "salesReportsPanel",
          "reportsBillingSummaryPanel",
          "reportsProvidersPanel",
          "reportsCatalogPanel",
          "reportsBillingDocumentsPanel",
          "reportsCashPanel",
        ],
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

function getUserTableActionIconSvg(action) {
  return (
    {
      edit: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
      `,
      delete: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 6h18"></path>
          <path d="M8 6V4.8A1.8 1.8 0 0 1 9.8 3h4.4A1.8 1.8 0 0 1 16 4.8V6"></path>
          <path d="M19 6l-1 13a2 2 0 0 1-2 1.8H8a2 2 0 0 1-2-1.8L5 6"></path>
          <path d="M10 10.5v6"></path>
          <path d="M14 10.5v6"></path>
        </svg>
      `,
    }[action] || ""
  );
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

function roundPricingMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function formatEditableNumber(value) {
  const amount = roundPricingMoney(value);
  return Number.isInteger(amount)
    ? amount.toString()
    : amount.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function computeCatalogSalePrice(purchaseCost, presentationTotal, marginPercent) {
  const units = Number(presentationTotal || 1) > 0 ? Number(presentationTotal || 1) : 1;
  const unitCost = roundPricingMoney(Number(purchaseCost || 0) / units);
  return roundPricingMoney(unitCost * (1 + Number(marginPercent || 0) / 100));
}

function buildCatalogPresentationOptions(selectedValue = "unidad") {
  const normalizedValue = String(selectedValue || "unidad").trim().toLowerCase() || "unidad";
  const options = [...CATALOG_PRESENTATION_OPTIONS];
  if (normalizedValue && !options.some((option) => option.value === normalizedValue)) {
    options.push({ value: normalizedValue, label: capitalizeLabel(normalizedValue) });
  }
  return options
    .map(
      (option) =>
        `<option value="${escapeHtml(option.value)}"${
          option.value === normalizedValue ? " selected" : ""
        }>${escapeHtml(option.label)}</option>`
    )
    .join("");
}

function getCatalogPresentationLabel(value) {
  const normalizedValue = String(value || "").trim().toLowerCase();
  return (
    CATALOG_PRESENTATION_OPTIONS.find((option) => option.value === normalizedValue)?.label ||
    capitalizeLabel(normalizedValue) ||
    "Unidad"
  );
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

function capitalizeLabel(value) {
  const text = String(value || "").trim();
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "";
}

function formatLongDateLabel(value = new Date()) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return capitalizeLabel(
    parsed.toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  );
}

function getWorkspaceDisplayName() {
  return authState.currentUser?.full_name || state.settings?.clinic_name || "Lativet";
}

function getWorkspaceDisplayRole() {
  return authState.currentUser?.role || "Operacion veterinaria";
}

function getWorkspaceDisplayInitials() {
  const words = getWorkspaceDisplayName()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return (words.map((word) => word.charAt(0).toUpperCase()).join("") || "LV").slice(0, 2);
}

function getDashboardGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Buenos dias";
  }
  if (hour < 19) {
    return "Buenas tardes";
  }
  return "Buenas noches";
}

function renderWorkspaceChrome() {
  const sectionId = getNavSectionId(getActiveSectionId());
  const config = WORKSPACE_HEADER_CONFIG[sectionId] || WORKSPACE_HEADER_CONFIG.dashboard;
  if (elements.workspaceHeadingEyebrow) {
    elements.workspaceHeadingEyebrow.textContent = config.eyebrow;
  }
  if (elements.workspaceHeadingLabel) {
    elements.workspaceHeadingLabel.textContent = config.title;
  }
  if (elements.workspaceHeadingMeta) {
    elements.workspaceHeadingMeta.textContent = `${config.description} ${formatLongDateLabel(new Date())}`;
  }
  if (elements.workspaceUserName) {
    elements.workspaceUserName.textContent = getWorkspaceDisplayName();
  }
  if (elements.workspaceUserRole) {
    elements.workspaceUserRole.textContent = getWorkspaceDisplayRole();
  }
  if (elements.workspaceUserAvatar) {
    elements.workspaceUserAvatar.textContent = getWorkspaceDisplayInitials();
  }
}

function renderDashboardHero() {
  if (!elements.dashboardHeroTitle) {
    return;
  }
  const firstName = getWorkspaceDisplayName().split(/\s+/).filter(Boolean)[0] || "Lativet";
  if (elements.dashboardHeroTitle) {
    elements.dashboardHeroTitle.textContent = `${getDashboardGreeting()}, ${firstName}`;
  }
  if (elements.dashboardHeroDescription) {
    elements.dashboardHeroDescription.textContent = `Este es el resumen operativo de ${
      state.settings?.clinic_name || "tu clinica"
    } para hoy.`;
  }
  if (elements.dashboardHeroDate) {
    elements.dashboardHeroDate.textContent = formatLongDateLabel(new Date());
  }
  if (elements.dashboardHeroAppointmentsValue) {
    elements.dashboardHeroAppointmentsValue.textContent = String(state.dashboard?.appointments_today ?? 0);
  }
  if (elements.dashboardHeroPatientsValue) {
    elements.dashboardHeroPatientsValue.textContent = String(state.dashboard?.patients ?? 0);
  }
  if (elements.dashboardHeroConsultationsValue) {
    elements.dashboardHeroConsultationsValue.textContent = String(
      state.dashboard?.consultations_total ?? 0
    );
  }
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

function formatAgendaDurationLabel(value) {
  const duration = Math.max(15, Number(value || 30));
  return `${duration} min`;
}

function getAppointmentStatusMeta(status) {
  return APPOINTMENT_STATUS_META[status] || null;
}

function getGoogleAttendeeResponseLabel(status) {
  return GOOGLE_ATTENDEE_RESPONSE_META[status] || "";
}

function buildAppointmentStatusSelectOptions(selectedStatus = "") {
  return APPOINTMENT_STATUS_ORDER.map((status) => {
    const meta = getAppointmentStatusMeta(status);
    if (!meta) {
      return "";
    }
    return `<option value="${escapeHtml(status)}"${status === selectedStatus ? " selected" : ""}>${escapeHtml(
      meta.label
    )}</option>`;
  }).join("");
}

function buildAppointmentStatusBadgeMarkup(status, { compact = false } = {}) {
  const meta = getAppointmentStatusMeta(status);
  if (!meta) {
    return `<span class="${statusClass(status)}">${escapeHtml(humanStatus(status))}</span>`;
  }
  return `
    <span class="agenda-status-pill agenda-status-pill--${meta.tone}${compact ? " is-compact" : ""}">
      <span class="agenda-status-dot agenda-status-dot--${meta.tone}" aria-hidden="true"></span>
      <span>${escapeHtml(meta.label)}</span>
    </span>
  `;
}

function getAgendaAppointmentTypeMeta(typeKey) {
  return AGENDA_APPOINTMENT_TYPE_META[typeKey] || AGENDA_APPOINTMENT_TYPE_META.default;
}

function detectAgendaAppointmentType(appointment) {
  const source = slugifyConsultorioText(
    [
      appointment?.appointment_type,
      appointment?.reason,
      appointment?.notes,
    ]
      .filter(Boolean)
      .join(" ")
  );
  if (!source) {
    return "default";
  }
  if (/(vacunacion|vacuna|refuerzo)/.test(source)) {
    return "vacunacion";
  }
  if (/(desparasitacion|antiparasitario|desparas)/.test(source)) {
    return "desparasitacion";
  }
  if (
    /(cirugia|quirurg|procedimiento|anestesia|castracion|esterilizacion|operatorio)/.test(source)
  ) {
    return "cirugia";
  }
  if (/(laboratorio|hemograma|perfil|coprologico|coprologia|prueba|examen)/.test(source)) {
    return "laboratorio";
  }
  if (/(imagen|radiografia|ecografia|rayos-x|rayosx|diagnostica|diagnostico)/.test(source)) {
    return "imagen";
  }
  if (/(seguimiento|control|revision|revaloracion|postoperatorio)/.test(source)) {
    return "seguimiento";
  }
  if (/(peluqueria|grooming|spa|bano|bano-medicado|corte|cepillado|deslanado)/.test(source)) {
    return "peluqueria";
  }
  if (/(documento|consentimiento|certificado|constancia)/.test(source)) {
    return "documento";
  }
  if (/(consulta|valoracion|general)/.test(source)) {
    return "consulta";
  }
  return "consulta";
}

function stripAgendaAppointmentTypePrefix(value) {
  return String(value || "")
    .trim()
    .replace(
      /^(consulta|vacunacion|vacunación|desparasitacion|desparasitación|cirugia\s*\/\s*procedimiento|cirugía\s*\/\s*procedimiento|cirugia|cirugía|laboratorio|imagen diagnostica|imagen diagnóstica|seguimiento|peluqueria|peluquería|documento)\s*[-:]\s*/i,
      ""
    )
    .trim();
}

function buildAgendaAppointmentPresentation(appointment) {
  const type = detectAgendaAppointmentType(appointment);
  const meta = getAgendaAppointmentTypeMeta(type);
  const title = String(appointment?.patient_name || "").trim() || meta.label;
  const cleanReason = stripAgendaAppointmentTypePrefix(appointment?.reason || "");
  const subtitle = cleanReason && cleanReason !== title ? cleanReason : meta.label;
  return { type, meta, title, subtitle };
}

function getAgendaAppointmentTypeFormValue(typeKey) {
  return (
    {
      consulta: "Consulta",
      vacunacion: "Vacunacion",
      desparasitacion: "Desparasitacion",
      cirugia: "Cirugia / procedimiento",
      laboratorio: "Laboratorio",
      imagen: "Imagen diagnostica",
      seguimiento: "Seguimiento",
      peluqueria: "Peluquería",
      documento: "Documento",
    }[typeKey] || ""
  );
}

function getAgendaEntityInitials(value, fallback = "CT") {
  const initials = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  return initials || fallback;
}

function getAgendaAppointmentIconPath(typeKey) {
  const safeType = AGENDA_APPOINTMENT_TYPE_META[typeKey] ? typeKey : "default";
  return (
    {
      consulta: "/iconos/agenda/consulta.png",
      vacunacion: "/iconos/agenda/vacunacion.png",
      cirugia: "/iconos/agenda/cirugia.png",
      peluqueria: "/iconos/agenda/peluqueria.png",
      seguimiento: "/iconos/agenda/seguimiento.png",
      laboratorio: "/iconos/agenda/laboratorio.png",
      imagen: "/iconos/agenda/imagen.png",
      desparasitacion: "/iconos/agenda/desparasitacion.png",
      documento: "/iconos/agenda/documento.png",
      default: "/iconos/agenda/default.png",
    }[safeType] || "/iconos/agenda/default.png"
  );
}

function getAgendaAppointmentIconMarkup(typeKey) {
  const safeType = AGENDA_APPOINTMENT_TYPE_META[typeKey] ? typeKey : "default";
  const label = getAgendaAppointmentTypeMeta(safeType).label;
  return `
    <span class="agenda-appointment-icon agenda-appointment-icon--${safeType}" aria-hidden="true">
      <img
        class="agenda-appointment-icon__image"
        src="${escapeHtml(getAgendaAppointmentIconPath(safeType))}"
        alt="${escapeHtml(label)}"
      />
    </span>
  `;
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

function buildAgendaQuickSummaryItems(dateValue) {
  const counts = {};
  listCalendarAppointmentsForDate(dateValue).forEach((appointment) => {
    const type = detectAgendaAppointmentType(appointment);
    counts[type] = (counts[type] || 0) + 1;
  });
  const rankedTypes = Object.entries(counts)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return AGENDA_QUICK_TYPE_ORDER.indexOf(left[0]) - AGENDA_QUICK_TYPE_ORDER.indexOf(right[0]);
    })
    .map(([type]) => type);
  const types = [...rankedTypes, ...AGENDA_QUICK_TYPE_ORDER.filter((type) => !rankedTypes.includes(type))].slice(
    0,
    4
  );
  return types.map((type) => ({
    type,
    count: counts[type] || 0,
    meta: getAgendaAppointmentTypeMeta(type),
  }));
}

function findAgendaNextAppointment(dateValue) {
  const selectedAppointments = listCalendarAppointmentsForDate(dateValue);
  const todayIso = toIsoDate(new Date());
  const now = new Date();
  if (selectedAppointments.length) {
    if (dateValue === todayIso) {
      const upcomingToday = selectedAppointments.find((appointment) => {
        const start = new Date(appointment.appointment_at);
        const end = addMinutes(start, Number(appointment.duration_minutes || 30));
        return end >= now;
      });
      if (upcomingToday) {
        return upcomingToday;
      }
    }
    if (dateValue > todayIso) {
      return selectedAppointments[0];
    }
  }
  return state.appointments
    .filter((item) => !hiddenCalendarStatuses.has(item.status))
    .sort((left, right) => String(left.appointment_at).localeCompare(String(right.appointment_at)))
    .find((appointment) => {
      const start = new Date(appointment.appointment_at);
      return !Number.isNaN(start.getTime()) && start >= now;
    }) || null;
}

function renderAgendaQuickView() {
  if (elements.agendaQuickDateLabel) {
    elements.agendaQuickDateLabel.textContent = parseIsoDate(agendaSelectedDate).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
    });
  }
  if (elements.agendaQuickStats) {
    const items = buildAgendaQuickSummaryItems(agendaSelectedDate);
    elements.agendaQuickStats.innerHTML = items
      .map(
        ({ type, count, meta }) => `
          <article class="agenda-quick-stat agenda-quick-stat--${type}">
            <div class="agenda-quick-stat__icon">
              ${getAgendaAppointmentIconMarkup(type)}
            </div>
            <strong>${escapeHtml(String(count))}</strong>
            <span>${escapeHtml(meta.shortLabel)}</span>
          </article>
        `
      )
      .join("");
  }
  if (!elements.agendaNextAppointment) {
    return;
  }
  const appointment = findAgendaNextAppointment(agendaSelectedDate);
  if (!appointment) {
    elements.agendaNextAppointment.innerHTML = `
      <article class="agenda-next-card agenda-next-card--empty">
        <strong>Sin citas programadas</strong>
        <p>No hay eventos para esta fecha y tampoco una cita futura pendiente.</p>
      </article>
    `;
    return;
  }
  const presentation = buildAgendaAppointmentPresentation(appointment);
  const typeLabel = presentation.meta.label;
  const appointmentDate = toIsoDate(appointment.appointment_at);
  const subtitleParts = [];
  if (appointmentDate !== agendaSelectedDate) {
    subtitleParts.push(
      parseIsoDate(appointmentDate).toLocaleDateString("es-CO", {
        day: "numeric",
        month: "long",
      })
    );
  }
  subtitleParts.push(presentation.subtitle);
  elements.agendaNextAppointment.innerHTML = `
    <button
      type="button"
      class="agenda-next-card agenda-next-card--${presentation.type}"
      data-appointment-id="${escapeHtml(appointment.id)}"
    >
      <div class="agenda-next-card__top">
        <span class="agenda-next-card__avatar">${escapeHtml(
          getAgendaEntityInitials(appointment.patient_name, "CT")
        )}</span>
        <div class="agenda-next-card__copy">
          <strong>${escapeHtml(truncate(presentation.title, 34))}</strong>
          <span>${escapeHtml(truncate(subtitleParts.filter(Boolean).join(" · "), 64))}</span>
        </div>
        <div class="agenda-next-card__time">
          <span>${escapeHtml(formatAgendaTimeShort(appointment.appointment_at))}</span>
          <small>${escapeHtml(formatAgendaDurationLabel(appointment.duration_minutes))}</small>
        </div>
      </div>
      <div class="agenda-next-card__footer">
        <span class="agenda-next-card__tag">
          ${getAgendaAppointmentIconMarkup(presentation.type)}
          <span>${escapeHtml(typeLabel)}</span>
        </span>
        ${buildAppointmentStatusBadgeMarkup(appointment.status, { compact: true })}
        <span class="agenda-next-card__action">Ver detalle</span>
      </div>
    </button>
  `;
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

function filterAvailableAgendaSlots(slots = [], { currentAppointmentId = "" } = {}) {
  return slots.filter((slot) => !slot.occupied || slot.appointment_id === currentAppointmentId);
}

function getAvailableSlotsForDate(dateValue) {
  if (!dateValue) {
    return [];
  }
  const currentAppointmentId = elements.appointmentIdInput?.value || "";
  return filterAvailableAgendaSlots(buildAgendaSlots(dateValue), { currentAppointmentId });
}

function serializeForm(form) {
  const payload = Object.fromEntries(new FormData(form).entries());
  form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    payload[checkbox.name] = checkbox.checked;
  });
  return payload;
}

function humanStatus(status) {
  const appointmentMeta = getAppointmentStatusMeta(status);
  if (appointmentMeta) {
    return appointmentMeta.label;
  }
  const labels = {
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
    getAppointmentStatusMeta(status)?.tone ||
    {
      Pendiente: "scheduled",
      Pagado: "confirmed",
      Cotizacion: "draft",
      ingreso: "confirmed",
      entrada: "confirmed",
      gasto: "cancelled",
      salida: "cancelled",
      invoice: "finalized",
    }[status] ||
    status ||
    "draft";
  return `pill pill--${normalized}`;
}

function cashAccountLabel(value) {
  return billingCashAccountLabels[value] || value || "Sin caja";
}

async function apiRequest(path, options = {}) {
  const requestMethod = String(options.method || "GET").toUpperCase();
  const response = await fetch(path, {
    ...options,
    method: requestMethod,
    cache: options.cache || "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
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
  deleteProvider: (providerId) =>
    apiRequest(`/api/providers/${providerId}`, { method: "DELETE" }),
  savePatient: (payload) =>
    apiRequest("/api/patients", { method: "POST", body: JSON.stringify(payload) }),
  deletePatient: (patientId) =>
    apiRequest(`/api/patients/${patientId}/delete`, { method: "POST", body: "{}" }),
  saveCatalogItem: (payload) =>
    apiRequest("/api/catalog-items", { method: "POST", body: JSON.stringify(payload) }),
  deleteCatalogItem: (itemId) => apiRequest(`/api/catalog-items/${itemId}`, { method: "DELETE" }),
  saveAppointment: (payload) =>
    apiRequest("/api/appointments", { method: "POST", body: JSON.stringify(payload) }),
  sendAppointmentReminder: (appointmentId) =>
    apiRequest(`/api/appointments/${appointmentId}/reminder`, {
      method: "POST",
      body: "{}",
    }),
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
  openCashSession: (payload) =>
    apiRequest("/api/cash-sessions/open", { method: "POST", body: JSON.stringify(payload) }),
  closeCashSession: (payload) =>
    apiRequest("/api/cash-sessions/close", { method: "POST", body: JSON.stringify(payload) }),
  saveStockAdjustment: (payload) =>
    apiRequest("/api/stock-adjustments", { method: "POST", body: JSON.stringify(payload) }),
  saveBillingDocument: (payload) =>
    apiRequest("/api/billing-documents", { method: "POST", body: JSON.stringify(payload) }),
  registerBillingPayment: (payload) =>
    apiRequest("/api/billing-payments", { method: "POST", body: JSON.stringify(payload) }),
  getBillingDocument: (documentId) => apiRequest(`/api/billing-documents/${documentId}`),
  generateBillingDocumentPdf: (documentId) =>
    apiRequest(`/api/billing-documents/${documentId}/pdf`, { method: "POST", body: "{}" }),
  generateBillingPaymentPdf: (documentId, paymentId) =>
    apiRequest(`/api/billing-documents/${documentId}/payments/${paymentId}/pdf`, {
      method: "POST",
      body: "{}",
    }),
  sendBillingDocumentEmail: (documentId, payload) =>
    apiRequest(`/api/billing-documents/${documentId}/email`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getSalesReport: (params = {}) => {
    const query = new URLSearchParams();
    if (params.start_date) {
      query.set("start_date", params.start_date);
    }
    if (params.end_date) {
      query.set("end_date", params.end_date);
    }
    const suffix = query.toString();
    return apiRequest(`/api/sales-report${suffix ? `?${suffix}` : ""}`);
  },
  generateSalesReportPdf: (payload) =>
    apiRequest("/api/sales-report/pdf", { method: "POST", body: JSON.stringify(payload) }),
  generateInventoryReportPdf: (payload) =>
    apiRequest("/api/inventory-report/pdf", { method: "POST", body: JSON.stringify(payload) }),
  saveRecord: (payload, finalize) =>
    apiRequest("/api/records", {
      method: "POST",
      body: JSON.stringify({ ...payload, finalize }),
    }),
  saveConsultation: (payload) =>
    apiRequest("/api/consultations", { method: "POST", body: JSON.stringify(payload) }),
  deleteConsultation: (consultationId) =>
    apiRequest(`/api/consultations/${consultationId}`, { method: "DELETE" }),
  saveEvolution: (payload) =>
    apiRequest("/api/evolutions", { method: "POST", body: JSON.stringify(payload) }),
  saveConsent: (payload) =>
    apiRequest("/api/consents", { method: "POST", body: JSON.stringify(payload) }),
  saveGrooming: (payload) =>
    apiRequest("/api/grooming", { method: "POST", body: JSON.stringify(payload) }),
  saveUser: (payload) =>
    apiRequest("/api/users", { method: "POST", body: JSON.stringify(payload) }),
  deleteUser: (userId) => apiRequest(`/api/users/${userId}`, { method: "DELETE" }),
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

function slugifyConsultorioText(value) {
  const normalized =
    typeof String(value || "").normalize === "function"
      ? String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      : String(value || "");
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "documento";
}

function getConsultorioDocumentCanonicalFormat(formatLabel) {
  const normalized = String(formatLabel || "").trim();
  return CONSULTORIO_DOCUMENT_FORMAT_ALIASES[normalized] || normalized;
}

function getConsultorioDocumentTemplateGroupByFormat(formatLabel) {
  const canonical = getConsultorioDocumentCanonicalFormat(formatLabel);
  return (
    CONSULTORIO_VETERINARY_DOCUMENT_TEMPLATE_GROUPS.find(
      (group) => group.formatLabel === canonical
    ) || null
  );
}

function buildConsultorioCustomDocumentTemplate(formatLabel = "Documento general") {
  const normalizedFormat = String(formatLabel || "").trim() || "Documento general";
  return {
    id: `custom_${slugifyConsultorioText(normalizedFormat)}`,
    categoryId: "custom",
    formatLabel: normalizedFormat,
    label: "Plantilla libre",
    documentName:
      normalizedFormat === "Documento general" ? "Documento veterinario" : normalizedFormat,
    description:
      "Formato abierto para registrar documentos propios de la veterinaria con una estructura base.",
    requiresSignature: false,
    autofillFields: [
      "Propietario y datos de contacto",
      "Mascota y datos basicos",
      "Fecha del documento",
      "Profesional responsable",
    ],
    requiredFields: [
      "Objetivo o asunto del documento",
      "Cuerpo principal del texto",
      "Observaciones relevantes",
      "Firma si aplica",
    ],
    recommendedSections: [
      "Encabezado",
      "Datos del propietario",
      "Datos de la mascota",
      "Contenido principal",
      "Firmas y fecha",
    ],
    buildContent: buildConsultorioFreeDocumentTemplateHtml,
  };
}

function getConsultorioDocumentTemplatesForFormat(formatLabel = "") {
  const group = getConsultorioDocumentTemplateGroupByFormat(formatLabel);
  if (!group) {
    return formatLabel ? [buildConsultorioCustomDocumentTemplate(formatLabel)] : [];
  }
  return (group.templates || [])
    .map((template) => CONSULTORIO_VETERINARY_DOCUMENT_TEMPLATE_MAP[template.id])
    .filter(Boolean);
}

function getConsultorioDocumentTemplateById(templateId, formatLabel = "") {
  const normalizedId = String(templateId || "").trim();
  if (!normalizedId) {
    return null;
  }
  if (CONSULTORIO_VETERINARY_DOCUMENT_TEMPLATE_MAP[normalizedId]) {
    return CONSULTORIO_VETERINARY_DOCUMENT_TEMPLATE_MAP[normalizedId];
  }
  if (normalizedId.startsWith("custom_")) {
    return buildConsultorioCustomDocumentTemplate(formatLabel);
  }
  return null;
}

function buildPatientDocumentTemplateOptions(templates = [], selectedValue = "") {
  const normalizedSelected = String(selectedValue || "").trim();
  return [
    ...templates.map(
      (template) =>
        `<option value="${escapeHtml(template.id)}"${
          template.id === normalizedSelected ? " selected" : ""
        }>${escapeHtml(template.label)}</option>`
    ),
  ].join("");
}

function renderPatientDocumentTemplateOptions(formatLabel = "", selectedValue = "") {
  if (!elements.patientDocumentTemplateSelect) {
    return "";
  }
  const templates = getConsultorioDocumentTemplatesForFormat(formatLabel);
  if (!String(formatLabel || "").trim()) {
    elements.patientDocumentTemplateSelect.innerHTML =
      '<option value="">Selecciona primero un tipo de documento</option>';
    elements.patientDocumentTemplateSelect.value = "";
    elements.patientDocumentTemplateSelect.disabled = true;
    return "";
  }
  const resolvedSelected =
    templates.some((template) => template.id === selectedValue)
      ? String(selectedValue || "").trim()
      : templates[0]?.id || "";
  elements.patientDocumentTemplateSelect.innerHTML = buildPatientDocumentTemplateOptions(
    templates,
    resolvedSelected
  );
  elements.patientDocumentTemplateSelect.disabled = !templates.length;
  if (resolvedSelected) {
    elements.patientDocumentTemplateSelect.value = resolvedSelected;
  }
  return resolvedSelected;
}

function buildPatientDocumentTemplateList(items = [], emptyLabel = "Sin elementos definidos.") {
  if (!items.length) {
    return `<li class="consultorio-document-template__item consultorio-document-template__item--empty">${escapeHtml(
      emptyLabel
    )}</li>`;
  }
  return items
    .map(
      (item) =>
        `<li class="consultorio-document-template__item"><span>${escapeHtml(
          String(item || "").trim()
        )}</span></li>`
    )
    .join("");
}

function buildConsultorioUniqueTemplateItems(...collections) {
  return Array.from(
    new Set(
      collections
        .flat()
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    )
  );
}

function isConsultorioConsentTemplate(template) {
  return ["consent", "authorization"].includes(String(template?.categoryId || "").trim());
}

function getConsultorioTemplateGuideAutofillItems(template) {
  const baseItems = template?.autofillFields || [];
  const legalItems = [
    "Consecutivo o referencia de historia clinica",
    "Fecha y hora de diligenciamiento",
    "Profesional responsable con matricula o registro",
  ];
  if (isConsultorioConsentTemplate(template)) {
    legalItems.push(
      "Clausula de tratamiento de datos personales y biometrico de firma",
      "Constancia de que el consentimiento se anexa a la historia clinica"
    );
  }
  return buildConsultorioUniqueTemplateItems(baseItems, legalItems);
}

function getConsultorioTemplateGuideRequiredItems(template) {
  const baseItems = template?.requiredFields || [];
  const legalItems = [
    "Identificacion completa del propietario o responsable",
    "Identificacion suficiente de la mascota",
    "Motivo, alcance y objetivo del documento",
    "Fecha, ciudad y firma de quien suscribe",
  ];
  if (isConsultorioConsentTemplate(template)) {
    legalItems.push(
      "Alternativas razonables explicadas",
      "Beneficios esperados, riesgos frecuentes y riesgos graves",
      "Pronostico y autorizaciones extraordinarias o de urgencia",
      "Condiciones economicas o alcance de gastos si aplica",
      "Constancia de entrega de informacion y, en lo posible, copia del documento del firmante"
    );
  } else {
    legalItems.push(
      "Soportes, observaciones o anexos relevantes",
      "Firma y datos del profesional emisor"
    );
  }
  return buildConsultorioUniqueTemplateItems(baseItems, legalItems);
}

function getConsultorioTemplateGuideSectionItems(template) {
  const baseItems = template?.recommendedSections || [];
  const legalItems = [
    "Identificacion del documento y del expediente",
    "Proteccion de datos, reserva y custodia documental",
  ];
  if (isConsultorioConsentTemplate(template)) {
    legalItems.push(
      "Declaracion de consentimiento informado",
      "Firmas y constancia de copia entregada"
    );
  } else {
    legalItems.push("Cierre profesional y soporte de emision");
  }
  return buildConsultorioUniqueTemplateItems(baseItems, legalItems);
}

function renderPatientDocumentTemplateGuide(template = null, formatLabel = "") {
  const hasFormat = Boolean(String(formatLabel || "").trim());
  const hasTemplate = Boolean(template);
  if (elements.patientDocumentTemplatePanel) {
    elements.patientDocumentTemplatePanel.classList.toggle("is-hidden", !hasFormat);
  }
  if (elements.patientDocumentApplyTemplateButton) {
    elements.patientDocumentApplyTemplateButton.disabled = !hasTemplate;
  }
  if (elements.patientDocumentTemplateTitle) {
    elements.patientDocumentTemplateTitle.textContent = hasTemplate
      ? template.documentName || template.label || "Plantilla del documento"
      : "Selecciona una plantilla";
  }
  if (elements.patientDocumentTemplateDescription) {
    elements.patientDocumentTemplateDescription.textContent = hasTemplate
      ? template.description || "Esta plantilla te ayudara a registrar el documento."
      : hasFormat
      ? "Selecciona una plantilla para ver que campos debe incluir el documento."
      : "Elige un tipo y una plantilla para que el sistema te proponga el contenido y los elementos que normalmente se solicitan en una veterinaria.";
  }
  if (elements.patientDocumentTemplateAutofillList) {
    elements.patientDocumentTemplateAutofillList.innerHTML = buildPatientDocumentTemplateList(
      getConsultorioTemplateGuideAutofillItems(template),
      "No hay datos automaticos configurados."
    );
  }
  if (elements.patientDocumentTemplateRequiredList) {
    elements.patientDocumentTemplateRequiredList.innerHTML = buildPatientDocumentTemplateList(
      getConsultorioTemplateGuideRequiredItems(template),
      "No hay validaciones especificas para esta plantilla."
    );
  }
  if (elements.patientDocumentTemplateSectionsList) {
    elements.patientDocumentTemplateSectionsList.innerHTML = buildPatientDocumentTemplateList(
      getConsultorioTemplateGuideSectionItems(template),
      "No hay secciones sugeridas."
    );
  }
}

function getPatientDocumentTemplateContext() {
  const patient = getConsultorioPatient();
  const owner = getOwnerById(patient?.owner_id || consultorioOwnerId || "") || getConsultorioOwner();
  const form = elements.patientConsultationForm;
  const consultationAt = String(form?.elements?.consultation_at?.value || "").trim();
  const clinicalRecordNumber = String(form?.elements?.record_id?.value || "").trim();
  const clinicSettings = state.settings || {};
  const compliance = state.compliance || {};
  return {
    clinicName: String(state.settings?.clinic_name || "Lativet").trim() || "Lativet",
    clinicAddress:
      String(
        clinicSettings.clinic_address ||
          clinicSettings.address ||
          clinicSettings.location_address ||
          ""
      ).trim() || buildConsultorioDocumentPlaceholder("direccion del responsable del tratamiento"),
    clinicPhone:
      String(
        clinicSettings.clinic_phone || clinicSettings.phone || clinicSettings.contact_phone || ""
      ).trim() || buildConsultorioDocumentPlaceholder("telefono del responsable del tratamiento"),
    clinicEmail:
      String(
        clinicSettings.clinic_email ||
          clinicSettings.email ||
          clinicSettings.contact_email ||
          clinicSettings.smtp_from ||
          ""
      ).trim() || buildConsultorioDocumentPlaceholder("correo del responsable del tratamiento"),
    jurisdiction:
      String(compliance.jurisdiction || "").trim() ||
      buildConsultorioDocumentPlaceholder("jurisdiccion"),
    retentionNote:
      String(compliance.retention_policy_note || "").trim() ||
      "Este documento hace parte del expediente clinico y debe conservarse conforme a la politica documental aplicable.",
    clinicalRecordNumber:
      clinicalRecordNumber || buildConsultorioDocumentPlaceholder("consecutivo de historia clinica"),
    signatureConfig: getPatientDocumentSignatureConfig(),
    professionalName:
      String(form?.elements?.professional_name?.value || getDefaultConsultorioProfessionalName()).trim() ||
      "Profesional tratante",
    professionalLicense:
      String(
        form?.elements?.professional_license?.value || getDefaultConsultorioProfessionalLicense()
      ).trim() || "No registrada",
    documentDate:
      formatDateTime(consultationAt || new Date().toISOString()) ||
      formatDateTime(new Date().toISOString()),
    documentDateOnly:
      normalizeDateFieldValue(consultationAt || new Date().toISOString()) ||
      normalizeDateFieldValue(new Date().toISOString()),
    patient,
    owner,
  };
}

function syncPatientDocumentTemplateSuggestedValues(template) {
  if (!template) {
    return;
  }
  if (elements.patientDocumentSignatureSelect) {
    elements.patientDocumentSignatureSelect.value = template.requiresSignature
      ? "required"
      : "optional";
  }
  if (
    template.requiresSignature &&
    elements.patientDocumentOwnerSignatureCheckbox &&
    elements.patientDocumentProfessionalSignatureCheckbox &&
    !elements.patientDocumentOwnerSignatureCheckbox.checked &&
    !elements.patientDocumentProfessionalSignatureCheckbox.checked
  ) {
    elements.patientDocumentOwnerSignatureCheckbox.checked = true;
    elements.patientDocumentProfessionalSignatureCheckbox.checked = true;
  }
  if (elements.patientDocumentNameInput) {
    const suggestedName = String(template.documentName || template.label || "").trim();
    const currentName = String(elements.patientDocumentNameInput.value || "").trim();
    if (suggestedName && (!currentName || currentName === patientDocumentLastSuggestedName)) {
      elements.patientDocumentNameInput.value = suggestedName;
      patientDocumentLastSuggestedName = suggestedName;
    }
  }
}

function getPatientDocumentSignatureConfig() {
  const requiresSignature =
    String(elements.patientDocumentSignatureSelect?.value || "").trim() === "required";
  return {
    enabled: requiresSignature,
    owner: requiresSignature ? Boolean(elements.patientDocumentOwnerSignatureCheckbox?.checked) : false,
    professional: requiresSignature
      ? Boolean(elements.patientDocumentProfessionalSignatureCheckbox?.checked)
      : false,
  };
}

function syncPatientDocumentSignatureOptionsVisibility(options = {}) {
  const signatureConfig = getPatientDocumentSignatureConfig();
  if (elements.patientDocumentSignatureOptions) {
    elements.patientDocumentSignatureOptions.classList.toggle(
      "is-hidden",
      !signatureConfig.enabled
    );
  }
  if (elements.patientDocumentOwnerSignatureCheckbox) {
    elements.patientDocumentOwnerSignatureCheckbox.disabled = !signatureConfig.enabled;
  }
  if (elements.patientDocumentProfessionalSignatureCheckbox) {
    elements.patientDocumentProfessionalSignatureCheckbox.disabled = !signatureConfig.enabled;
  }
  if (options.updateTemplate) {
    syncPatientDocumentTemplateSelection({
      forceTemplateReplace: Boolean(options.forceTemplateReplace),
      syncSuggestedValues: false,
    });
  }
  return signatureConfig;
}

function canReplacePatientDocumentWithTemplate() {
  const currentHtml = sanitizeConsultorioDocumentHtml(
    elements.patientDocumentContentInput?.value ||
      elements.patientDocumentSourceEditor?.value ||
      elements.patientDocumentEditor?.innerHTML ||
      ""
  );
  const currentText = consultorioDocumentHtmlToText(currentHtml);
  return !currentText || currentHtml === patientDocumentLastGeneratedHtml;
}

function applyPatientDocumentTemplate(template, options = {}) {
  if (!template || typeof template.buildContent !== "function") {
    return false;
  }
  const nextHtml = sanitizeConsultorioDocumentHtml(template.buildContent(getPatientDocumentTemplateContext()));
  if (!nextHtml) {
    return false;
  }
  if (!options.force && !canReplacePatientDocumentWithTemplate()) {
    const confirmed = window.confirm(
      "Aplicar esta plantilla reemplazara el contenido actual del documento. Deseas continuar?"
    );
    if (!confirmed) {
      return false;
    }
  }
  setPatientDocumentEditorMode("visual");
  setPatientDocumentEditorContent(nextHtml);
  patientDocumentLastGeneratedHtml = nextHtml;
  return true;
}

function syncPatientDocumentTemplateSelection(options = {}) {
  const formatLabel =
    options.format !== undefined
      ? String(options.format || "").trim()
      : String(elements.patientDocumentFormatSelect?.value || "").trim();
  const selectedTemplateId =
    options.templateId !== undefined
      ? String(options.templateId || "").trim()
      : String(elements.patientDocumentTemplateSelect?.value || "").trim();
  const resolvedTemplateId = renderPatientDocumentTemplateOptions(formatLabel, selectedTemplateId);
  const template = getConsultorioDocumentTemplateById(resolvedTemplateId, formatLabel);
  renderPatientDocumentTemplateGuide(template, formatLabel);
  if (!template) {
    return null;
  }
  if (options.syncSuggestedValues !== false) {
    syncPatientDocumentTemplateSuggestedValues(template);
  }
  syncPatientDocumentSignatureOptionsVisibility();
  if (options.applyTemplate === false) {
    return template;
  }
  applyPatientDocumentTemplate(template, {
    force: Boolean(options.forceTemplateReplace),
  });
  return template;
}

function resetPatientDocumentTemplateWorkflowState() {
  patientDocumentLastGeneratedHtml = "";
  patientDocumentLastSuggestedName = "";
  if (elements.patientDocumentOwnerSignatureCheckbox) {
    elements.patientDocumentOwnerSignatureCheckbox.checked = true;
  }
  if (elements.patientDocumentProfessionalSignatureCheckbox) {
    elements.patientDocumentProfessionalSignatureCheckbox.checked = true;
  }
  renderPatientDocumentTemplateOptions("", "");
  renderPatientDocumentTemplateGuide(null, "");
  syncPatientDocumentSignatureOptionsVisibility();
}

function loadConsultorioDocumentFormats() {
  try {
    const raw = localStorage.getItem(CONSULTORIO_DOCUMENT_FORMATS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.from(
      new Set(
        [...DEFAULT_CONSULTORIO_DOCUMENT_FORMATS, ...(Array.isArray(parsed) ? parsed : [])]
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      )
    );
  } catch (error) {
    return [...DEFAULT_CONSULTORIO_DOCUMENT_FORMATS];
  }
}

function saveConsultorioDocumentFormats() {
  try {
    localStorage.setItem(
      CONSULTORIO_DOCUMENT_FORMATS_STORAGE_KEY,
      JSON.stringify(
        (Array.isArray(consultorioDocumentFormats) ? consultorioDocumentFormats : [])
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      )
    );
  } catch (error) {
    // ignore storage write errors
  }
}

function ensureConsultorioDocumentFormatOption(value, options = {}) {
  const { persist = false } = options;
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  if (!consultorioDocumentFormats.length) {
    consultorioDocumentFormats = loadConsultorioDocumentFormats();
  }
  const exists = consultorioDocumentFormats.some((item) => item === normalized);
  if (!exists) {
    consultorioDocumentFormats = [...consultorioDocumentFormats, normalized];
    if (persist) {
      saveConsultorioDocumentFormats();
    }
  }
  return normalized;
}

function renderPatientDocumentFormatOptions(selectedValue = "") {
  if (!elements.patientDocumentFormatSelect) {
    return;
  }
  if (!consultorioDocumentFormats.length) {
    consultorioDocumentFormats = loadConsultorioDocumentFormats();
  }
  const selected = ensureConsultorioDocumentFormatOption(selectedValue) || String(selectedValue || "").trim();
  const suggestedFormats = [...DEFAULT_CONSULTORIO_DOCUMENT_FORMATS];
  const suggestedFormatSet = new Set(suggestedFormats);
  const customFormats = consultorioDocumentFormats.filter((format) => !suggestedFormatSet.has(format));
  elements.patientDocumentFormatSelect.innerHTML = [
    '<option value="">Selecciona un formato</option>',
    suggestedFormats.length
      ? `
        <optgroup label="Documentos veterinarios">
          ${suggestedFormats
            .map(
              (format) => `<option value="${escapeHtml(format)}">${escapeHtml(format)}</option>`
            )
            .join("")}
        </optgroup>
      `
      : "",
    customFormats.length
      ? `
        <optgroup label="Formatos personalizados">
          ${customFormats
            .map(
              (format) => `<option value="${escapeHtml(format)}">${escapeHtml(format)}</option>`
            )
            .join("")}
        </optgroup>
      `
      : "",
  ].join("");
  if (selected) {
    ensureConsultorioSelectOption(elements.patientDocumentFormatSelect, selected);
    elements.patientDocumentFormatSelect.value = selected;
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
    const restoredProfileView =
      parsed.consultorioProfileView === "consents"
        ? "documents"
        : parsed.consultorioProfileView;
    consultorioProfileView = CONSULTORIO_PROFILE_VIEW_MAP[restoredProfileView]
      ? restoredProfileView
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
    if (targetSectionId === "consents") {
      targetSectionId =
        consultorioPatientProfileOpen && consultorioPatientId
          ? CONSULTORIO_PATIENT_PROFILE_SECTION_ID
          : "consultorio";
      if (consultorioPatientId) {
        consultorioProfileView = "documents";
      }
    }
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
    "notificationsButton",
    "notificationsBadge",
    "notificationsPanel",
    "notificationsList",
    "notificationsCopyButton",
    "notificationsClearButton",
    "logoutButton",
    "workspaceHeadingEyebrow",
    "workspaceHeadingLabel",
    "workspaceHeadingMeta",
    "workspaceUserAvatar",
    "workspaceUserName",
    "workspaceUserRole",
    "loginModal",
    "loginForm",
    "loginError",
    "dashboardHeroTitle",
    "dashboardHeroDescription",
    "dashboardHeroDate",
    "dashboardHeroAppointmentsValue",
    "dashboardHeroPatientsValue",
    "dashboardHeroConsultationsValue",
    "dashboardUpdated",
    "dashboardQuickActions",
    "metricOwners",
    "metricPatients",
    "metricRecords",
    "metricConsultations",
    "metricAppointments",
    "metricConsents",
    "metricGrooming",
    "metricAvailability",
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
    "labTestModal",
    "closeLabTestModalButton",
    "cancelLabTestModalButton",
    "labTestForm",
    "labTestCategorySelect",
    "labTestCategoryCustomInput",
    "labTestNameInput",
    "procedureOrderModal",
    "closeProcedureOrderModalButton",
    "cancelProcedureOrderModalButton",
    "procedureOrderForm",
    "procedureOrderNameInput",
    "groomingModal",
    "closeGroomingModalButton",
    "cancelGroomingModalButton",
    "openGroomingModalButton",
    "groomingModalTitle",
    "groomingModalSubtitle",
    "groomingServicesList",
    "groomingAddServiceButton",
    "groomingServicesValue",
    "groomingServiceAtInput",
    "groomingStatusSelect",
    "groomingRabiesStatusSelect",
    "groomingNextVisitInput",
    "groomingNotesInput",
    "groomingBeforePhotoFileInput",
    "groomingBeforePhotoFileButton",
    "groomingBeforePhotosList",
    "groomingBeforePhotosValue",
    "groomingAfterPhotoFileInput",
    "groomingAfterPhotoFileButton",
    "groomingAfterPhotosList",
    "groomingAfterPhotosValue",
    "patientConsultationModalTitle",
    "patientConsultationModalSubtitle",
    "patientConsultationModalBadge",
    "patientConsultationModalIcon",
    "patientConsultationForm",
    "patientDocumentFields",
    "patientDocumentFormatSelect",
    "patientDocumentAddFormatButton",
    "patientDocumentTemplateSelect",
    "patientDocumentNameInput",
    "patientDocumentSignatureSelect",
    "patientDocumentSignatureOptions",
    "patientDocumentOwnerSignatureCheckbox",
    "patientDocumentProfessionalSignatureCheckbox",
    "patientDocumentTemplatePanel",
    "patientDocumentTemplateTitle",
    "patientDocumentTemplateDescription",
    "patientDocumentTemplateAutofillList",
    "patientDocumentTemplateRequiredList",
    "patientDocumentTemplateSectionsList",
    "patientDocumentApplyTemplateButton",
    "patientDocumentToolbar",
    "patientDocumentSourceToggleButton",
    "patientDocumentStyleSelect",
    "patientDocumentBlockFormatSelect",
    "patientDocumentFontFamilySelect",
    "patientDocumentFontSizeSelect",
    "patientDocumentSourceEditor",
    "patientDocumentEditor",
    "patientDocumentContentInput",
    "patientDocumentStatusBar",
    "patientDocumentNotifyOwnerInput",
    "patientFollowupFields",
    "patientFollowupDateInput",
    "patientFollowupTypeSelect",
    "patientFollowupReasonSelect",
    "patientFollowupDetailsInput",
    "patientFollowupNextControlInput",
    "patientFollowupMessageFields",
    "patientFollowupNotifyOwnerInput",
    "patientConsultationClinicalFields",
    "patientConsultationAttachmentsField",
    "patientConsultationExamGeneralSection",
    "patientConsultationExamSpecialSection",
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
    "patientProcedureFields",
    "patientProcedureDateInput",
    "patientProcedureNameSelect",
    "patientProcedureCustomNameInput",
    "patientProcedureRegisterTypeButton",
    "patientProcedureDescriptionInput",
    "patientProcedurePreanestheticInput",
    "patientProcedureAnestheticInput",
    "patientProcedureOtherMedicationsInput",
    "patientProcedureTreatmentInput",
    "patientProcedureObservationsInput",
    "patientProcedureComplicationsInput",
    "patientProcedureAttachmentFileInput",
    "patientProcedureAttachmentFileButton",
    "patientProcedureAttachmentsList",
    "patientProcedureAttachmentsValue",
    "patientLaboratoryFields",
    "patientLaboratoryDateInput",
    "patientLaboratoryItemsList",
    "patientLaboratoryAddButton",
    "patientLaboratoryDiagnosisInput",
    "patientImagingFields",
    "patientImagingDateInput",
    "patientImagingAidSelect",
    "patientImagingProfessionalSelect",
    "patientImagingAddUserButton",
    "patientImagingSignsInput",
    "patientImagingDiagnosisInput",
    "patientImagingStudyTypeInput",
    "patientImagingAttachmentFileInput",
    "patientImagingAttachmentFileButton",
    "patientImagingAttachmentsList",
    "patientImagingAttachmentsValue",
    "patientImagingObservationsInput",
    "patientRemissionFields",
    "patientRemissionDateInput",
    "patientRemissionProfessionalSelect",
    "patientRemissionAddUserButton",
    "patientRemissionDestinationInput",
    "patientRemissionReasonInput",
    "patientRemissionObservationsInput",
    "patientOrderFields",
    "patientOrderDateInput",
    "patientOrderItemsList",
    "patientOrderAddButton",
    "patientOrderReasonInput",
    "patientConsultationReasonSelect",
    "patientConsultationRecordLabel",
    "patientConsultationAttachmentFileInput",
    "patientConsultationAttachmentFileButton",
    "patientConsultationAttachmentHint",
    "patientConsultationAttachmentsList",
    "patientConsultationAttachmentsValue",
    "complianceNotes",
    "complianceSources",
    "appointmentForm",
    "appointmentFormFeedback",
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
    "agendaQuickDateLabel",
    "agendaQuickStats",
    "agendaNextAppointment",
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
    "appointmentDetailStatusSelect",
    "appointmentDetailStatusButton",
    "appointmentDetailQuickCard",
    "appointmentDetailReminderButton",
    "appointmentDetailEditButton",
    "appointmentDetailSummary",
    "appointmentDetailPatientSnapshot",
    "appointmentDetailNotes",
    "appointmentDetailLinks",
    "closeAppointmentDetailButton",
    "patientForm",
    "patientFormTitle",
    "patientFormSubmitButton",
    "cancelPatientEditButton",
    "providerForm",
    "inventoryItemModal",
    "inventoryItemModalBody",
    "inventoryItemModalTitle",
    "inventoryItemModalSummary",
    "closeInventoryItemModalButton",
    "providerDirectoryModal",
    "providerDirectoryModalBody",
    "providerDirectoryModalSummary",
    "closeProviderDirectoryModalButton",
    "catalogForm",
    "billingDocumentForm",
    "billingSettingsForm",
    "billingPaymentForm",
    "cashMovementForm",
    "cashSessionOpenForm",
    "cashSessionCloseForm",
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
    "providersList",
    "catalogItemsList",
    "salesCatalogPanelEyebrow",
    "salesCatalogPanelTitle",
    "billingClientsList",
    "billingDocumentsList",
    "cashSummaryCards",
    "cashAccountsSummary",
    "cashSessionsSummary",
    "salesDocumentDetail",
    "salesReportsContent",
    "salesReportForm",
    "salesReportPdfButton",
    "salesInventoryPdfButton",
    "salesReportSummaryMini",
    "salesDocumentFormTitle",
    "salesDocumentsPanelTitle",
    "billingDocumentTypeField",
    "billingDocumentSubmitButton",
    "billingStepPrevButton",
    "billingStepNextButton",
    "billingWizardSummary",
    "billingWizardReview",
    "billingPaymentStepHint",
    "billingPaymentPanelHint",
    "billingPaymentEmptyState",
    "usersClinicName",
    "usersTableBody",
    "usersSummary",
    "usersSearchInput",
    "usersPageSizeSelect",
    "openUserModalButton",
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
    "billingLineItemSearch",
    "billingLineItemDropdown",
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

function setAppointmentFormFeedback(message = "", tone = "error") {
  if (!elements.appointmentFormFeedback) {
    return;
  }
  const content = String(message || "").trim();
  elements.appointmentFormFeedback.dataset.tone = tone || "error";
  elements.appointmentFormFeedback.textContent = content;
  elements.appointmentFormFeedback.classList.toggle("is-hidden", !content);
}

function clearAppointmentFormFeedback() {
  setAppointmentFormFeedback("");
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
    const visibleChildren = Array.from(container.children).filter(
      (child) => !child.classList.contains("is-hidden")
    );
    const visibleCount = visibleChildren.length;
    container.classList.toggle("is-hidden", visibleCount === 0);
    container.classList.toggle("grid-visible-1", visibleCount === 1);
    container.classList.toggle("grid-visible-2", visibleCount === 2);
    container.classList.toggle("grid-visible-3", visibleCount >= 3);
    Array.from(container.children).forEach((child) => {
      child.classList.toggle(
        "panel-card--solo",
        visibleCount === 1 && !child.classList.contains("is-hidden")
      );
    });
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
  const allPanels =
    sectionId === "sales"
      ? new Set(SALES_PANEL_IDS)
      : new Set(config.options.flatMap((item) => item.panels || []));
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

function ensureSalesReportDefaults(force = false) {
  const today = toIsoDate(new Date());
  const monthStart = new Date();
  monthStart.setDate(1);
  const startDate = toIsoDate(monthStart);

  if (force || !salesReportState.start_date) {
    salesReportState.start_date = startDate;
  }
  if (force || !salesReportState.end_date) {
    salesReportState.end_date = today;
  }
  if (force || !salesReportState.as_of_date) {
    salesReportState.as_of_date = today;
  }

  if (elements.salesReportForm) {
    if (force || !elements.salesReportForm.elements.start_date.value) {
      elements.salesReportForm.elements.start_date.value = salesReportState.start_date;
    }
    if (force || !elements.salesReportForm.elements.end_date.value) {
      elements.salesReportForm.elements.end_date.value = salesReportState.end_date;
    }
    if (force || !elements.salesReportForm.elements.as_of_date.value) {
      elements.salesReportForm.elements.as_of_date.value = salesReportState.as_of_date;
    }
  }
}

function syncSalesReportStateFromForm() {
  ensureSalesReportDefaults();
  if (!elements.salesReportForm) {
    return;
  }
  salesReportState.start_date =
    elements.salesReportForm.elements.start_date.value || salesReportState.start_date;
  salesReportState.end_date =
    elements.salesReportForm.elements.end_date.value || salesReportState.end_date;
  salesReportState.as_of_date =
    elements.salesReportForm.elements.as_of_date.value || salesReportState.as_of_date;
}

function getSalesReportRequestKey() {
  return `${salesReportState.start_date}|${salesReportState.end_date}`;
}

function getActiveSalesSubsectionValue() {
  return getSubsectionOption("sales")?.value || "factura";
}

function getSalesDocumentFilterType() {
  const subsectionValue = getActiveSalesSubsectionValue();
  return SALES_DOCUMENT_SUBSECTIONS.has(subsectionValue) ? subsectionValue : "";
}

function getSalesDocumentModeMeta() {
  const documentType = getSalesDocumentFilterType();
  if (documentType === "cotizacion") {
    return {
      document_type: "cotizacion",
      formTitle: "Nueva cotizacion",
      submitLabel: "Guardar cotizacion",
      listTitle: "Cotizaciones emitidas",
      emptyMessage: "Aun no hay cotizaciones registradas.",
    };
  }
  if (documentType === "factura") {
    return {
      document_type: "factura",
      formTitle: "Nueva factura",
      submitLabel: "Guardar factura",
      listTitle: "Facturas emitidas",
      emptyMessage: "Aun no hay facturas registradas.",
    };
  }
  return {
    document_type: "",
    formTitle: "Nuevo documento",
    submitLabel: "Guardar documento",
    listTitle: "Documentos emitidos",
    emptyMessage: "Aun no hay documentos de facturacion.",
  };
}

function resolveSalesSubsectionForDocument(document) {
  return document?.document_type === "cotizacion" ? "cotizacion" : "factura";
}

function getPendingBillingDocuments(documents = state.billing_documents || []) {
  return documents.filter(
    (document) => document.document_type === "factura" && document.status === "Pendiente"
  );
}

function getSalesCatalogPanelMeta() {
  if (getActiveSalesSubsectionValue() === "precios") {
    return {
      eyebrow: "Precios",
      title: "Tabla de precios de venta",
      content: buildPricingTable(state.catalog_items),
    };
  }
  return {
    eyebrow: "Inventario",
    title: "Tabla de control de inventario",
    content: buildInventoryTable(state.catalog_items),
  };
}

function syncSalesDocumentModeUI() {
  const mode = getSalesDocumentModeMeta();
  const hasFilteredDocumentMode = Boolean(mode.document_type);
  if (elements.billingDocumentTypeSelect && hasFilteredDocumentMode) {
    elements.billingDocumentTypeSelect.value = mode.document_type;
  }
  elements.billingDocumentTypeField?.classList.toggle("is-hidden", hasFilteredDocumentMode);
  if (elements.salesDocumentFormTitle) {
    elements.salesDocumentFormTitle.textContent = mode.formTitle;
  }
  if (elements.billingDocumentSubmitButton) {
    elements.billingDocumentSubmitButton.textContent = mode.submitLabel;
  }
  if (elements.salesDocumentsPanelTitle) {
    elements.salesDocumentsPanelTitle.textContent = mode.listTitle;
  }
  syncBillingDocumentFormState();
}

function openExportUrl(url) {
  if (!url) {
    throw new Error("El servidor no devolvio una URL de descarga.");
  }
  const exportWindow = window.open(url, "_blank", "noopener,noreferrer");
  if (!exportWindow) {
    throw new Error("El navegador bloqueo la apertura del archivo.");
  }
  return exportWindow;
}

function buildSalesHtmlTable(headers, rows, emptyMessage) {
  if (!rows.length) {
    return `<div class="sales-report-empty">${escapeHtml(emptyMessage)}</div>`;
  }
  return `
    <table class="sales-table">
      <thead>
        <tr>${headers.map((header) => `<th class="${header.align === "left" ? "sales-table__left" : ""}">${escapeHtml(header.label)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>${row
                .map(
                  (cell) => `<td class="${cell?.align === "left" ? "sales-table__left" : ""}">${
                    cell?.html ? cell.value : escapeHtml(cell?.value ?? "")
                  }</td>`
                )
                .join("")}</tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function getInventoryItemStatusMeta(item) {
  const stockQuantity = Number(item?.stock_quantity || 0);
  const minStock = Math.max(0, Number(item?.min_stock || 0));
  if (!item?.track_inventory) {
    return {
      key: "no_control",
      label: "Sin control",
      badgeClass: "sales-stock-badge--neutral",
      quantityClass: "sales-stock-neutral",
    };
  }
  if (stockQuantity <= 0) {
    return {
      key: "no_stock",
      label: "Sin stock",
      badgeClass: "sales-stock-badge--alert",
      quantityClass: "sales-stock-alert",
    };
  }
  if (stockQuantity < minStock) {
    return {
      key: "low_stock",
      label: "Bajo stock",
      badgeClass: "sales-stock-badge--info",
      quantityClass: "sales-stock-warning",
    };
  }
  return {
    key: "in_stock",
    label: "En stock",
    badgeClass: "sales-stock-badge--ok",
    quantityClass: "sales-stock-ok",
  };
}

function getInventoryItemInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase())
    .join("") || "PR";
}

function getInventoryFilterOptions(items) {
  return {
    categories: Array.from(
      new Set(
        items
          .map((item) => String(item.category || "").trim())
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right)),
    providers: state.providers
      .map((provider) => ({
        id: String(provider.id || ""),
        name: String(provider.name || "").trim(),
      }))
      .filter((provider) => provider.id && provider.name)
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
}

function getFilteredInventoryItems(items) {
  const searchTerm = String(inventoryUiState.search || "").trim().toLowerCase();
  const statusFilter = String(inventoryUiState.status || "all").trim();
  const filteredItems = items.filter((item) => {
    const itemStatus = getInventoryItemStatusMeta(item);
    if (
      searchTerm &&
      ![
        item.name,
        item.category,
        item.provider_name,
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(searchTerm))
    ) {
      return false;
    }
    if (
      inventoryUiState.category &&
      String(item.category || "").trim() !== String(inventoryUiState.category || "").trim()
    ) {
      return false;
    }
    if (
      inventoryUiState.providerId &&
      String(item.provider_id || "").trim() !== String(inventoryUiState.providerId || "").trim()
    ) {
      return false;
    }
    if (inventoryUiState.lowStockOnly && itemStatus.key !== "low_stock") {
      return false;
    }
    if (statusFilter !== "all" && itemStatus.key !== statusFilter) {
      return false;
    }
    return true;
  });
  const statusWeight = {
    no_stock: 0,
    low_stock: 1,
    in_stock: 2,
    no_control: 3,
  };
  return filteredItems.sort((left, right) => {
    const leftStatus = getInventoryItemStatusMeta(left);
    const rightStatus = getInventoryItemStatusMeta(right);
    return (
      (statusWeight[leftStatus.key] ?? 99) - (statusWeight[rightStatus.key] ?? 99) ||
      String(left.name || "").localeCompare(String(right.name || ""))
    );
  });
}

function getInventoryStats(items) {
  return {
    totalProducts: items.length,
    totalUnits: items.reduce(
      (total, item) => total + (item.track_inventory ? Number(item.stock_quantity || 0) : 0),
      0
    ),
    lowStock: items.filter((item) => getInventoryItemStatusMeta(item).key === "low_stock").length,
    noStock: items.filter((item) => getInventoryItemStatusMeta(item).key === "no_stock").length,
  };
}

function sortCatalogItemsByName(items) {
  return [...(items || [])].sort((left, right) =>
    String(left?.name || "").localeCompare(String(right?.name || ""), "es", {
      sensitivity: "base",
    })
  );
}

function syncBillingSummaryInventorySnapshot() {
  const catalogItems = Array.isArray(state.catalog_items) ? state.catalog_items : [];
  const trackedItems = catalogItems.filter((item) => item?.track_inventory);
  state.billing_summary = {
    ...(state.billing_summary || {}),
    tracked_items_count: trackedItems.length,
    low_stock_count: trackedItems.filter(
      (item) => getInventoryItemStatusMeta(item).key === "low_stock"
    ).length,
    inventory_units: trackedItems.reduce(
      (total, item) => total + Number(item?.stock_quantity || 0),
      0
    ),
  };
}

function upsertCatalogItemInState(item) {
  if (!item?.id) {
    return;
  }
  const currentItems = Array.isArray(state.catalog_items) ? [...state.catalog_items] : [];
  const itemIndex = currentItems.findIndex(
    (entry) => String(entry?.id || "") === String(item.id || "")
  );
  if (itemIndex >= 0) {
    currentItems[itemIndex] = { ...currentItems[itemIndex], ...item };
  } else {
    currentItems.push(item);
  }
  state.catalog_items = sortCatalogItemsByName(currentItems);
  syncBillingSummaryInventorySnapshot();
}

function removeCatalogItemFromState(itemId) {
  if (!itemId) {
    return;
  }
  state.catalog_items = sortCatalogItemsByName(
    (state.catalog_items || []).filter(
      (item) => String(item?.id || "") !== String(itemId || "")
    )
  );
  syncBillingSummaryInventorySnapshot();
}

function sortProvidersByName(providers) {
  return [...(providers || [])].sort((left, right) =>
    String(left?.name || "").localeCompare(String(right?.name || ""), "es", {
      sensitivity: "base",
    })
  );
}

function upsertProviderInState(provider) {
  if (!provider?.id) {
    return;
  }
  const currentProviders = Array.isArray(state.providers) ? [...state.providers] : [];
  const providerIndex = currentProviders.findIndex(
    (entry) => String(entry?.id || "") === String(provider.id || "")
  );
  const nextProvider = { items_count: 0, ...provider };
  if (providerIndex >= 0) {
    currentProviders[providerIndex] = { ...currentProviders[providerIndex], ...nextProvider };
  } else {
    currentProviders.push(nextProvider);
  }
  state.providers = sortProvidersByName(currentProviders);
  state.catalog_items = (state.catalog_items || []).map((item) =>
    String(item?.provider_id || "") === String(provider.id || "")
      ? { ...item, provider_name: nextProvider.name || "" }
      : item
  );
}

function removeProviderFromState(providerId) {
  if (!providerId) {
    return;
  }
  state.providers = sortProvidersByName(
    (state.providers || []).filter(
      (provider) => String(provider?.id || "") !== String(providerId || "")
    )
  );
  state.catalog_items = (state.catalog_items || []).map((item) =>
    String(item?.provider_id || "") === String(providerId || "")
      ? { ...item, provider_id: "", provider_name: "" }
      : item
  );
  if (String(inventoryUiState.providerId || "") === String(providerId || "")) {
    inventoryUiState.providerId = "";
  }
  if (String(inventoryUiState.providerDraftId || "") === String(providerId || "")) {
    inventoryUiState.providerDraftId = "";
  }
}

function getInventoryProviderDraft() {
  return (
    state.providers.find(
      (provider) =>
        String(provider?.id || "") === String(inventoryUiState.providerDraftId || "")
    ) || null
  );
}

function getInventoryDetailForm(itemId) {
  return (
    queryAll("[data-inventory-detail-form]").find(
      (form) => String(form.dataset.inventoryDetailForm || "") === String(itemId || "")
    ) || null
  );
}

function ensureInventorySelection(filteredItems) {
  const hasSelection = filteredItems.some(
    (item) => String(item.id || "") === String(inventoryUiState.selectedItemId || "")
  );
  if (!hasSelection) {
    inventoryUiState.selectedItemId = filteredItems[0]?.id || "";
  }
  return filteredItems.find(
    (item) => String(item.id || "") === String(inventoryUiState.selectedItemId || "")
  ) || filteredItems[0] || null;
}

function buildInventoryDetailPanel(item) {
  if (!item) {
    return `
      <div class="sales-inventory-detail__empty">
        <strong>Sin producto seleccionado</strong>
        <p>Elige un producto de la tabla para revisar su configuracion comercial.</p>
      </div>
    `;
  }
  const itemStatus = getInventoryItemStatusMeta(item);
  const previewPrice = computeCatalogSalePrice(
    Number(item.purchase_cost || 0),
    Number(item.presentation_total || 1) || 1,
    Number(item.margin_percent || 0)
  );
  const presentationOptions = buildCatalogPresentationOptions(item.presentation_type || "unidad");
  const providers = state.providers
    .map(
      (provider) =>
        `<option value="${escapeHtml(String(provider.id || ""))}"${
          String(provider.id || "") === String(item.provider_id || "") ? " selected" : ""
        }>${escapeHtml(provider.name || "Proveedor")}</option>`
    )
    .join("");
  return `
    <div class="sales-inventory-detail__header">
      <div class="sales-inventory-detail__art">${escapeHtml(getInventoryItemInitials(item.name))}</div>
      <div class="sales-inventory-detail__copy">
        <strong>${escapeHtml(item.name || "Producto")}</strong>
        <span>SKU ${escapeHtml(String(item.id || "").slice(0, 8).toUpperCase() || "TEMP")}</span>
        <span>${escapeHtml(getCatalogPresentationLabel(item.presentation_type))} x ${escapeHtml(
          formatEditableNumber(Number(item.presentation_total || 1) || 1)
        )}</span>
      </div>
      <span class="sales-stock-badge ${itemStatus.badgeClass}">${escapeHtml(itemStatus.label)}</span>
    </div>

    <form class="sales-inventory-detail__form" data-inventory-detail-form="${escapeHtml(
      String(item.id || "")
    )}">
      <label>
        <span>Categoria</span>
        <input data-inventory-detail-field="category" name="category" value="${escapeHtml(
          item.category || ""
        )}" />
      </label>
      <label>
        <span>Proveedor</span>
        <select data-inventory-detail-field="provider_id" name="provider_id">
          <option value="">Sin proveedor</option>
          ${providers}
        </select>
      </label>
      <div class="sales-inventory-detail__grid">
        <label>
          <span>Costo base</span>
          <input
            data-inventory-detail-cost="${escapeHtml(String(item.id || ""))}"
            name="purchase_cost"
            type="number"
            step="0.01"
            min="0"
            value="${escapeHtml(formatEditableNumber(Number(item.purchase_cost || 0)))}"
          />
        </label>
        <label>
          <span>Margen %</span>
          <input
            data-inventory-detail-margin="${escapeHtml(String(item.id || ""))}"
            name="margin_percent"
            type="number"
            step="0.01"
            min="0"
            value="${escapeHtml(formatEditableNumber(Number(item.margin_percent || 0)))}"
          />
        </label>
      </div>
      <div class="sales-inventory-detail__grid">
        <label>
          <span>Precio final</span>
          <div class="sales-inventory-detail__readonly" data-inventory-detail-price="${escapeHtml(
            String(item.id || "")
          )}">${escapeHtml(formatMoney(previewPrice))}</div>
        </label>
        <label>
          <span>Contenido</span>
          <input
            data-inventory-detail-field="presentation_total"
            name="presentation_total"
            type="number"
            step="0.01"
            min="0.01"
            value="${escapeHtml(formatEditableNumber(Number(item.presentation_total || 1) || 1))}"
          />
        </label>
      </div>
      <label>
        <span>Presentacion</span>
        <select data-inventory-detail-field="presentation_type" name="presentation_type">
          ${presentationOptions}
        </select>
      </label>
      <label class="checkbox-row sales-inventory-detail__checkbox">
        <input
          data-inventory-detail-field="track_inventory"
          name="track_inventory"
          type="checkbox"
          ${item.track_inventory ? "checked" : ""}
        />
        <span>Controlar inventario</span>
      </label>
      <div class="sales-inventory-detail__grid">
        <div class="sales-inventory-detail__readonly-group">
          <span>Stock actual</span>
          <div class="sales-inventory-detail__readonly">${escapeHtml(
            formatEditableNumber(Number(item.stock_quantity || 0))
          )}</div>
        </div>
        <div class="sales-inventory-detail__readonly-group">
          <span>Stock minimo</span>
          <div class="sales-inventory-detail__readonly">${escapeHtml(
            formatEditableNumber(Number(item.min_stock || 0))
          )}</div>
        </div>
      </div>
      <label>
        <span>Notas</span>
        <textarea data-inventory-detail-field="notes" name="notes" rows="5">${escapeHtml(
          item.notes || ""
        )}</textarea>
      </label>
      <div class="sales-inventory-detail__actions">
        <button class="ghost-button ghost-button--danger" type="button" data-delete-inventory-item="${escapeHtml(
          String(item.id || "")
        )}">Eliminar</button>
        <button class="ghost-button" type="button" data-reset-inventory-detail="${escapeHtml(
          String(item.id || "")
        )}">Cancelar</button>
        <button class="primary-button" type="button" data-save-inventory-detail="${escapeHtml(
          String(item.id || "")
        )}">Guardar cambios</button>
      </div>
    </form>
  `;
}

function buildInventoryProviderQuickForm() {
  const provider = getInventoryProviderDraft();
  const isEditing = Boolean(provider);
  return `
    <article id="salesInventoryProviderCard" class="sales-inventory-form-card">
      <div class="sales-inventory-form-card__header">
        <div>
          <p class="eyebrow">Proveedor</p>
          <h4>${isEditing ? "Editar proveedor" : "Nuevo proveedor"}</h4>
        </div>
        <button class="ghost-button" data-inventory-toggle-panel="provider" type="button">Cerrar</button>
      </div>
      <form class="sales-inventory-inline-form" data-inventory-inline-form="provider">
        <input type="hidden" name="id" value="${escapeHtml(String(provider?.id || ""))}" />
        <div class="sales-inventory-inline-form__grid">
          <label>
            <span>Nombre</span>
            <input name="name" value="${escapeHtml(provider?.name || "")}" required />
          </label>
          <label>
            <span>Contacto</span>
            <input name="contact_name" value="${escapeHtml(provider?.contact_name || "")}" />
          </label>
          <label>
            <span>Telefono</span>
            <input name="phone" value="${escapeHtml(provider?.phone || "")}" />
          </label>
          <label>
            <span>Correo</span>
            <input name="email" type="email" value="${escapeHtml(provider?.email || "")}" />
          </label>
        </div>
        <label>
          <span>Notas</span>
          <textarea name="notes" rows="3" placeholder="Observaciones internas del proveedor.">${escapeHtml(
            provider?.notes || ""
          )}</textarea>
        </label>
        <div class="sales-inventory-inline-form__actions">
          ${
            isEditing
              ? `<button class="ghost-button ghost-button--danger" data-inventory-delete-provider="${escapeHtml(
                  String(provider?.id || "")
                )}" type="button">Eliminar</button>`
              : ""
          }
          <button class="ghost-button" data-inventory-toggle-panel="provider" type="button">Cancelar</button>
          <button class="primary-button" data-inventory-inline-submit="provider" type="submit">${
            isEditing ? "Guardar cambios" : "Guardar proveedor"
          }</button>
        </div>
      </form>
    </article>
  `;
}

function buildInventoryProviderRoster() {
  const providers = sortProvidersByName(state.providers || []);
  const providerItems = providers.length
    ? providers
        .map((provider) => {
          const providerId = String(provider.id || "");
          const isEditing =
            inventoryUiState.showProviderForm &&
            providerId === String(inventoryUiState.providerDraftId || "");
          const itemsCount = Number(provider.items_count || 0);
          const contactName = provider.contact_name || "Sin contacto";
          const phone = provider.phone || "Sin telefono";
          const email = provider.email || "Sin correo";
          const notes = provider.notes || "Sin notas internas.";
          return `
            <article class="provider-directory-list__item${isEditing ? " is-active" : ""}" role="listitem">
              <div class="provider-directory-list__header">
                <div class="provider-directory-list__identity">
                  <span class="provider-directory-list__avatar">${escapeHtml(
                    getInventoryItemInitials(provider.name || "Proveedor")
                  )}</span>
                  <div class="provider-directory-list__copy">
                    <strong>${escapeHtml(provider.name || "Proveedor")}</strong>
                    <small>${escapeHtml(contactName)}</small>
                  </div>
                </div>
                <span class="sales-stock-badge sales-stock-badge--neutral">${escapeHtml(
                  `${itemsCount} ${itemsCount === 1 ? "producto" : "productos"}`
                )}</span>
              </div>
              <div class="provider-directory-list__meta">
                <div class="provider-directory-list__meta-item">
                  <span>Telefono</span>
                  <strong>${escapeHtml(phone)}</strong>
                </div>
                <div class="provider-directory-list__meta-item">
                  <span>Correo</span>
                  <strong>${escapeHtml(email)}</strong>
                </div>
                <div class="provider-directory-list__meta-item">
                  <span>Estado</span>
                  <strong>${itemsCount ? "Con productos asociados" : "Sin productos asociados"}</strong>
                </div>
              </div>
              <p class="provider-directory-list__notes">${escapeHtml(notes)}</p>
              <div class="provider-directory-list__actions">
                <button class="ghost-button" data-inventory-edit-provider="${escapeHtml(
                  providerId
                )}" type="button">Editar</button>
                <button class="ghost-button ghost-button--danger" data-inventory-delete-provider="${escapeHtml(
                  providerId
                )}" type="button">Eliminar</button>
              </div>
            </article>
          `;
        })
        .join("")
    : '<div class="sales-inventory-support__empty">Aun no hay proveedores registrados.</div>';
  return `
    <div class="provider-directory-list" role="list">${providerItems}</div>
  `;
}

function buildInventoryProductQuickForm() {
  const presentationOptions = buildCatalogPresentationOptions("unidad");
  const providers = state.providers
    .map(
      (provider) =>
        `<option value="${escapeHtml(String(provider.id || ""))}">${escapeHtml(
          provider.name || "Proveedor"
        )}</option>`
    )
    .join("");
  return `
    <article id="salesInventoryProductCard" class="sales-inventory-form-card">
      <div class="sales-inventory-form-card__header">
        <div>
          <p class="eyebrow">Precios</p>
          <h4>Nuevo producto comercial</h4>
        </div>
        <button class="ghost-button" data-inventory-toggle-panel="product" type="button">Cerrar</button>
      </div>
      <form class="sales-inventory-inline-form" data-inventory-inline-form="product">
        <div class="sales-inventory-inline-form__grid sales-inventory-inline-form__grid--product">
          <label>
            <span>Proveedor</span>
            <select name="provider_id">
              <option value="">Sin proveedor</option>
              ${providers}
            </select>
          </label>
          <label>
            <span>Categoria</span>
            <input name="category" placeholder="Medicamento, alimento..." required />
          </label>
          <label class="sales-inventory-inline-form__field--wide">
            <span>Nombre</span>
            <input name="name" required />
          </label>
          <label>
            <span>Costo base</span>
            <input name="purchase_cost" type="number" step="0.01" min="0" value="0" />
          </label>
          <label>
            <span>Margen %</span>
            <input name="margin_percent" type="number" step="0.01" min="0" value="0" />
          </label>
          <label>
            <span>Presentacion</span>
            <select name="presentation_type">
              ${presentationOptions}
            </select>
          </label>
          <label>
            <span>Contenido</span>
            <input name="presentation_total" type="number" step="0.01" min="0.01" value="1" />
          </label>
        </div>
        <label class="checkbox-row sales-inventory-inline-form__checkbox">
          <input name="track_inventory" type="checkbox" checked />
          <span>Controlar inventario</span>
        </label>
        <label>
          <span>Notas</span>
          <textarea name="notes" rows="3" placeholder="Notas internas, codigo, lote o detalle adicional."></textarea>
        </label>
        <div class="sales-inventory-inline-form__actions">
          <button class="ghost-button" data-inventory-toggle-panel="product" type="button">Cancelar</button>
          <button class="primary-button" data-inventory-inline-submit="product" type="submit">Guardar producto</button>
        </div>
      </form>
    </article>
  `;
}

function buildInventoryStockQuickForm() {
  const trackableItems = state.catalog_items.filter((item) => item.track_inventory);
  const selectedTrackableItem =
    trackableItems.find(
      (item) => String(item.id || "") === String(inventoryUiState.selectedItemId || "")
    ) ||
    trackableItems[0] ||
    null;
  const selectedTrackableId = String(selectedTrackableItem?.id || "");
  const adjustmentOptions = trackableItems
    .map(
      (item) =>
        `<option value="${escapeHtml(String(item.id || ""))}"${
          String(item.id || "") === String(selectedTrackableId) ? " selected" : ""
        }>${escapeHtml(item.name || "Producto")} / stock ${escapeHtml(
          formatEditableNumber(Number(item.stock_quantity || 0))
        )}</option>`
    )
    .join("");
  return `
    <article id="salesInventoryAdjustCard" class="sales-inventory-form-card">
      <div class="sales-inventory-form-card__header">
        <div>
          <p class="eyebrow">Inventario</p>
          <h4>Ajuste manual</h4>
        </div>
        <button class="ghost-button" data-inventory-close-support="stock" type="button">Cerrar</button>
      </div>
      ${
        !trackableItems.length
          ? '<div class="sales-inventory-support__empty">Aun no hay productos con control de inventario activo.</div>'
          : `
            <form class="sales-inventory-inline-form sales-inventory-inline-form--support" data-inventory-inline-form="stock">
              <div class="sales-inventory-inline-form__grid">
                <label class="sales-inventory-inline-form__field--wide">
                  <span>Producto</span>
                  <select name="item_id" required>
                    ${adjustmentOptions}
                  </select>
                </label>
                <label>
                  <span>Tipo</span>
                  <select name="movement_type">
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                  </select>
                </label>
                <label>
                  <span>Fecha</span>
                  <input name="movement_date" type="date" value="${escapeHtml(
                    toIsoDate(new Date())
                  )}" required />
                </label>
                <label>
                  <span>Cantidad</span>
                  <input name="quantity" type="number" step="0.01" min="0.01" required />
                </label>
              </div>
              <label>
                <span>Nota</span>
                <textarea name="note" rows="3" placeholder="Motivo del ajuste manual."></textarea>
              </label>
              <div class="sales-inventory-inline-form__actions">
                <button class="ghost-button" data-inventory-close-support="stock" type="button">Cancelar</button>
                <button class="primary-button" data-inventory-inline-submit="stock" type="submit">Aplicar ajuste</button>
              </div>
            </form>
          `
      }
    </article>
  `;
}

function buildInventorySupportSection(selectedItem) {
  const trackableItems = state.catalog_items.filter((item) => item.track_inventory);
  const selectedTrackableItem =
    selectedItem && selectedItem.track_inventory
      ? selectedItem
      : trackableItems.find((item) => String(item.id || "") === String(inventoryUiState.selectedItemId || "")) ||
        trackableItems[0] ||
        null;
  const selectedTrackableId = String(selectedTrackableItem?.id || "");
  const adjustmentOptions = trackableItems
    .map(
      (item) =>
        `<option value="${escapeHtml(String(item.id || ""))}"${
          String(item.id || "") === selectedTrackableId ? " selected" : ""
        }>${escapeHtml(item.name || "Producto")} / stock ${escapeHtml(
          formatEditableNumber(Number(item.stock_quantity || 0))
        )}</option>`
    )
    .join("");
  const recentMovements = [...(state.stock_movements || [])]
    .sort(
      (left, right) =>
        new Date(right?.movement_date || 0).getTime() - new Date(left?.movement_date || 0).getTime()
    )
    .slice(0, 6);
  const movementItems = recentMovements.length
    ? recentMovements
        .map((movement) => {
          const isEntry = movement.movement_type === "entrada";
          const quantity = Number(movement.quantity || 0);
          return `
            <article class="sales-inventory-activity__item">
              <div class="sales-inventory-activity__copy">
                <strong>${escapeHtml(movement.item_name || "Movimiento")}</strong>
                <small>${escapeHtml(humanStatus(movement.movement_type))} · ${escapeHtml(
                  formatDateTime(movement.movement_date)
                )}</small>
              </div>
              <div class="sales-inventory-activity__meta">
                <strong class="${isEntry ? "sales-stock-ok" : "sales-stock-alert"}">${
                  isEntry ? "+" : "-"
                }${escapeHtml(formatEditableNumber(quantity))}</strong>
                <small>Saldo ${escapeHtml(
                  formatEditableNumber(Number(movement.balance_after || 0))
                )}</small>
              </div>
            </article>
          `;
        })
        .join("")
    : '<div class="sales-inventory-support__empty">Aun no hay movimientos recientes de inventario.</div>';
  return `
    <div class="sales-inventory-support">
      <article id="salesInventoryAdjustCard" class="sales-inventory-support-card">
        <div class="sales-inventory-support-card__header">
          <div>
            <p class="eyebrow">Inventario</p>
            <h4>Ajuste manual</h4>
          </div>
          ${
            inventoryUiState.showStockForm
              ? '<button class="ghost-button" data-inventory-close-support="stock" type="button">Cerrar</button>'
              : ""
          }
        </div>
        ${
          !trackableItems.length
            ? '<div class="sales-inventory-support__empty">Aun no hay productos con control de inventario activo.</div>'
            : inventoryUiState.showStockForm
            ? `
              <form class="sales-inventory-inline-form sales-inventory-inline-form--support" data-inventory-inline-form="stock">
                <div class="sales-inventory-inline-form__grid">
                  <label class="sales-inventory-inline-form__field--wide">
                    <span>Producto</span>
                    <select name="item_id" required>
                      ${adjustmentOptions}
                    </select>
                  </label>
                  <label>
                    <span>Tipo</span>
                    <select name="movement_type">
                      <option value="entrada">Entrada</option>
                      <option value="salida">Salida</option>
                    </select>
                  </label>
                  <label>
                    <span>Fecha</span>
                    <input name="movement_date" type="date" value="${escapeHtml(
                      toIsoDate(new Date())
                    )}" required />
                  </label>
                  <label>
                    <span>Cantidad</span>
                    <input name="quantity" type="number" step="0.01" min="0.01" required />
                  </label>
                </div>
                <label>
                  <span>Nota</span>
                  <textarea name="note" rows="3" placeholder="Motivo del ajuste manual."></textarea>
                </label>
                <div class="sales-inventory-inline-form__actions">
                  <button class="ghost-button" data-inventory-close-support="stock" type="button">Cancelar</button>
                  <button class="primary-button" data-inventory-inline-submit="stock" type="submit">Aplicar ajuste</button>
                </div>
              </form>
            `
            : `
              <div class="sales-inventory-support__intro">
                <p class="sales-section-note">${
                  selectedTrackableItem
                    ? `Producto sugerido: ${escapeHtml(selectedTrackableItem.name || "Producto")}.`
                    : "Selecciona un producto de la tabla para preparar el ajuste."
                }</p>
                <button class="secondary-button" data-inventory-open-support="stock" type="button">Registrar ajuste</button>
              </div>
            `
        }
      </article>

      <article class="sales-inventory-support-card">
        <div class="sales-inventory-support-card__header">
          <div>
            <p class="eyebrow">Actividad</p>
            <h4>Movimientos recientes</h4>
          </div>
          <span class="sales-section-note">Ultimos 6 registros</span>
        </div>
        <div class="sales-inventory-activity">${movementItems}</div>
      </article>
    </div>
  `;
}

function buildInventoryTable(items) {
  const filterOptions = getInventoryFilterOptions(items);
  const filteredItems = getFilteredInventoryItems(items);
  const stats = getInventoryStats(items);
  const pageSize = Math.max(1, Number(inventoryUiState.pageSize || 10));
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(Math.max(1, Number(inventoryUiState.page || 1)), totalPages);
  inventoryUiState.page = currentPage;
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(pageStart, pageStart + pageSize);
  const pageButtons = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(
      (page) =>
        totalPages <= 5 ||
        Math.abs(page - currentPage) <= 1 ||
        page === 1 ||
        page === totalPages
    )
    .map(
      (page) => `
        <button class="sales-inventory-pagination__button${
          page === currentPage ? " is-active" : ""
        }" data-inventory-page="${page}" type="button">${page}</button>
      `
    )
    .join("");
  const table = buildSalesHtmlTable(
    [
      { label: "Producto", align: "left" },
      { label: "Categoria", align: "left" },
      { label: "Proveedor", align: "left" },
      { label: "Stock actual" },
      { label: "Minimo" },
      { label: "Por pedir" },
      { label: "Estado" },
      { label: "Accion" },
    ],
    paginatedItems.map((item) => {
      const itemStatus = getInventoryItemStatusMeta(item);
      const stockQuantity = Number(item.stock_quantity || 0);
      const minStock = Number(item.min_stock || 0);
      const reorderQuantity = item.track_inventory ? Math.max(0, minStock - stockQuantity) : 0;
      return [
        {
          value: `
            <div class="sales-inventory-table-item sales-inventory-table-item--static">
              <span class="sales-inventory-product__avatar">${escapeHtml(
                getInventoryItemInitials(item.name)
              )}</span>
              <span class="sales-pricing-product">
                <strong>${escapeHtml(item.name || "Producto")}</strong>
                <small>${escapeHtml(item.track_inventory ? "Conteo operativo" : "Sin control de inventario")}</small>
              </span>
            </div>
          `,
          html: true,
          align: "left",
        },
        { value: item.category || "-", align: "left" },
        { value: item.provider_name || "Sin proveedor", align: "left" },
        {
          value: item.track_inventory
            ? `<span class="${itemStatus.quantityClass}">${escapeHtml(
                formatEditableNumber(stockQuantity)
              )}</span>`
            : '<span class="sales-stock-neutral">-</span>',
          html: true,
        },
        {
          value: item.track_inventory ? formatEditableNumber(minStock) : "-",
        },
        {
          value: item.track_inventory
            ? `<span class="${reorderQuantity > 0 ? "sales-stock-alert" : "sales-stock-neutral"}">${escapeHtml(
                formatEditableNumber(reorderQuantity)
              )}</span>`
            : '<span class="sales-stock-neutral">-</span>',
          html: true,
        },
        {
          value: `<span class="sales-stock-badge ${itemStatus.badgeClass}">${escapeHtml(
            itemStatus.label
          )}</span>`,
          html: true,
        },
        {
          value: `
            <div class="sales-inventory-table-actions">
              <button class="secondary-button" data-inventory-adjust-item="${escapeHtml(
                String(item.id || "")
              )}" type="button">Ajustar</button>
            </div>
          `,
          html: true,
        },
      ];
    }),
    "No hay productos que coincidan con los filtros."
  );

  return `
    <div class="sales-inventory-shell sales-inventory-shell--catalog">
      <p class="sales-section-note sales-pricing-note">Aqui llevas el conteo operativo: lo que hay, lo minimo requerido y lo que falta por pedir.</p>

      <div class="sales-inventory-shell__actions">
        ${
          inventoryUiState.showStockForm
            ? '<button class="ghost-button" data-inventory-close-support="stock" type="button">Ocultar ajuste</button>'
            : '<button class="primary-button" data-inventory-open-support="stock" type="button">Registrar ajuste</button>'
        }
      </div>

      <div class="sales-inventory-toolbar">
        <label class="sales-inventory-toolbar__search">
          <span>Buscar</span>
          <input
            data-inventory-filter="search"
            type="search"
            placeholder="Buscar por producto, categoria o proveedor..."
            value="${escapeHtml(inventoryUiState.search)}"
          />
        </label>
        <label>
          <span>Categoria</span>
          <select data-inventory-filter="category">
            <option value="">Todas</option>
            ${filterOptions.categories
              .map(
                (category) =>
                  `<option value="${escapeHtml(category)}"${
                    category === inventoryUiState.category ? " selected" : ""
                  }>${escapeHtml(category)}</option>`
              )
              .join("")}
          </select>
        </label>
        <label>
          <span>Proveedor</span>
          <select data-inventory-filter="providerId">
            <option value="">Todos</option>
            ${filterOptions.providers
              .map(
                (provider) =>
                  `<option value="${escapeHtml(provider.id)}"${
                    provider.id === inventoryUiState.providerId ? " selected" : ""
                  }>${escapeHtml(provider.name)}</option>`
              )
              .join("")}
          </select>
        </label>
        <label>
          <span>Estado</span>
          <select data-inventory-filter="status">
            <option value="all"${inventoryUiState.status === "all" ? " selected" : ""}>Todos</option>
            <option value="in_stock"${inventoryUiState.status === "in_stock" ? " selected" : ""}>En stock</option>
            <option value="low_stock"${inventoryUiState.status === "low_stock" ? " selected" : ""}>Bajo stock</option>
            <option value="no_stock"${inventoryUiState.status === "no_stock" ? " selected" : ""}>Sin stock</option>
            <option value="no_control"${inventoryUiState.status === "no_control" ? " selected" : ""}>Sin control</option>
          </select>
        </label>
        <label class="checkbox-row sales-inventory-toolbar__toggle">
          <input
            data-inventory-filter="lowStockOnly"
            type="checkbox"
            ${inventoryUiState.lowStockOnly ? "checked" : ""}
          />
          <span>Solo bajo stock</span>
        </label>
        <button class="ghost-button" data-inventory-clear-filters type="button">Limpiar</button>
      </div>

      <div class="sales-inventory-stats">
        <article class="sales-inventory-stat">
          <span>Productos totales</span>
          <strong>${escapeHtml(String(stats.totalProducts))}</strong>
          <small>Todos los productos</small>
        </article>
        <article class="sales-inventory-stat">
          <span>Stock total</span>
          <strong>${escapeHtml(formatEditableNumber(stats.totalUnits))}</strong>
          <small>Unidades disponibles</small>
        </article>
        <article class="sales-inventory-stat sales-inventory-stat--warning">
          <span>Bajo stock</span>
          <strong>${escapeHtml(String(stats.lowStock))}</strong>
          <small>Productos</small>
        </article>
        <article class="sales-inventory-stat sales-inventory-stat--danger">
          <span>Sin stock</span>
          <strong>${escapeHtml(String(stats.noStock))}</strong>
          <small>Productos</small>
        </article>
      </div>

      <div class="sales-table-scroll">${table}</div>

      <div class="sales-inventory-footer">
        <p>Mostrando ${filteredItems.length ? pageStart + 1 : 0} a ${Math.min(
          pageStart + pageSize,
          filteredItems.length
        )} de ${filteredItems.length} productos</p>
        <div class="sales-inventory-footer__controls">
          <div class="sales-inventory-pagination">
            <button
              class="sales-inventory-pagination__button"
              data-inventory-page="${Math.max(1, currentPage - 1)}"
              type="button"
              ${currentPage <= 1 ? "disabled" : ""}
            >&lsaquo;</button>
            ${pageButtons}
            <button
              class="sales-inventory-pagination__button"
              data-inventory-page="${Math.min(totalPages, currentPage + 1)}"
              type="button"
              ${currentPage >= totalPages ? "disabled" : ""}
            >&rsaquo;</button>
          </div>
          <label class="sales-inventory-footer__page-size">
            <span>Por pagina</span>
            <select data-inventory-page-size>
              ${[10, 20, 50]
                .map(
                  (size) =>
                    `<option value="${size}"${size === pageSize ? " selected" : ""}>${size}</option>`
                )
                .join("")}
            </select>
          </label>
        </div>
      </div>

      ${buildInventorySupportSection(null)}
    </div>
  `;
}

function buildPricingTable(items) {
  const filterOptions = getInventoryFilterOptions(items);
  const filteredItems = getFilteredInventoryItems(items);
  const pageSize = Math.max(1, Number(inventoryUiState.pageSize || 10));
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(Math.max(1, Number(inventoryUiState.page || 1)), totalPages);
  inventoryUiState.page = currentPage;
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(pageStart, pageStart + pageSize);
  const pageButtons = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter(
      (page) =>
        totalPages <= 5 ||
        Math.abs(page - currentPage) <= 1 ||
        page === 1 ||
        page === totalPages
    )
    .map(
      (page) => `
        <button class="sales-inventory-pagination__button${
          page === currentPage ? " is-active" : ""
        }" data-inventory-page="${page}" type="button">${page}</button>
      `
    )
    .join("");
  const managementPanels = [
    inventoryUiState.showProviderForm ? buildInventoryProviderQuickForm() : "",
    inventoryUiState.showProductForm ? buildInventoryProductQuickForm() : "",
  ]
    .filter(Boolean)
    .join("");
  const table = buildSalesHtmlTable(
    [
      { label: "Producto", align: "left" },
      { label: "Categoria", align: "left" },
      { label: "Proveedor", align: "left" },
      { label: "Inventario" },
      { label: "Costo base" },
      { label: "Margen %" },
      { label: "Precio final" },
      { label: "Accion" },
    ],
    paginatedItems.map((item) => {
      const itemId = String(item.id || "");
      const stockQuantity = Number(item.stock_quantity || 0);
      const minStock = Number(item.min_stock || 0);
      const isLowStock = Boolean(item.track_inventory) && stockQuantity < minStock;
      const purchaseCost = Number(item.purchase_cost || 0);
      const marginPercent = Number(item.margin_percent || 0);
      const previewPrice = computeCatalogSalePrice(
        purchaseCost,
        item.presentation_total,
        marginPercent
      );
      return [
        {
          value: `
            <button class="sales-inventory-table-item" data-open-inventory-item="${escapeHtml(
              itemId
            )}" type="button">
              <span class="sales-inventory-product__avatar">${escapeHtml(
                getInventoryItemInitials(item.name)
              )}</span>
              <span class="sales-pricing-product">
                <strong>${escapeHtml(item.name || "-")}</strong>
                <small>${escapeHtml(
                  `${getCatalogPresentationLabel(item.presentation_type)} x ${formatEditableNumber(
                    Number(item.presentation_total || 1) || 1
                  )}`
                )}</small>
              </span>
            </button>
          `,
          html: true,
          align: "left",
        },
        { value: item.category || "-", align: "left" },
        { value: item.provider_name || "Sin proveedor", align: "left" },
        {
          value: item.track_inventory
            ? `<div class="sales-pricing-product"><strong class="${
                isLowStock ? "sales-stock-alert" : "sales-stock-ok"
              }">${escapeHtml(formatEditableNumber(stockQuantity))}</strong><small>Min ${escapeHtml(
                formatEditableNumber(minStock)
              )}</small></div>`
            : '<span class="sales-stock-neutral">Sin control</span>',
          html: true,
        },
        {
          value: `<input class="sales-pricing-input sales-pricing-input--money" data-pricing-cost="${escapeHtml(
            itemId
          )}" type="number" step="0.01" min="0" value="${escapeHtml(
            formatEditableNumber(purchaseCost)
          )}" />`,
          html: true,
        },
        {
          value: `<input class="sales-pricing-input" data-pricing-margin="${escapeHtml(
            itemId
          )}" type="number" step="0.01" min="0" value="${escapeHtml(
            formatEditableNumber(marginPercent)
          )}" />`,
          html: true,
        },
        {
          value: `<strong class="sales-price-final" data-pricing-final="${escapeHtml(
            itemId
          )}">${escapeHtml(formatMoney(previewPrice))}</strong>`,
          html: true,
        },
        {
          value: `
            <div class="sales-inventory-table-actions">
              <button class="ghost-button" data-open-inventory-item="${escapeHtml(
                itemId
              )}" type="button">Configurar</button>
              <button class="secondary-button sales-pricing-save" data-save-pricing="${escapeHtml(
                itemId
              )}" type="button">Guardar</button>
            </div>
          `,
          html: true,
        },
      ];
    }),
    "Aun no hay productos para configurar precios."
  );
  return `
    <div class="sales-inventory-shell sales-inventory-shell--catalog">
      <p class="sales-section-note sales-pricing-note">Aqui defines costo, margen, presentacion y control comercial. El precio final guardado es el que se usa en la factura.</p>

      <div class="sales-inventory-shell__actions">
        <button
          class="secondary-button"
          data-inventory-toggle-panel="provider"
          type="button"
        >${inventoryUiState.showProviderForm ? "Ocultar proveedor" : "Agregar proveedor"}</button>
        <button
          class="ghost-button"
          data-open-provider-directory="true"
          type="button"
        >Ver directorio</button>
        <button
          class="primary-button"
          data-inventory-toggle-panel="product"
          type="button"
        >${inventoryUiState.showProductForm ? "Ocultar producto" : "Agregar producto"}</button>
      </div>

      ${managementPanels ? `<div class="sales-inventory-management">${managementPanels}</div>` : ""}

      <div class="sales-inventory-toolbar">
        <label class="sales-inventory-toolbar__search">
          <span>Buscar</span>
          <input
            data-inventory-filter="search"
            type="search"
            placeholder="Buscar por producto, categoria o proveedor..."
            value="${escapeHtml(inventoryUiState.search)}"
          />
        </label>
        <label>
          <span>Categoria</span>
          <select data-inventory-filter="category">
            <option value="">Todas</option>
            ${filterOptions.categories
              .map(
                (category) =>
                  `<option value="${escapeHtml(category)}"${
                    category === inventoryUiState.category ? " selected" : ""
                  }>${escapeHtml(category)}</option>`
              )
              .join("")}
          </select>
        </label>
        <label>
          <span>Proveedor</span>
          <select data-inventory-filter="providerId">
            <option value="">Todos</option>
            ${filterOptions.providers
              .map(
                (provider) =>
                  `<option value="${escapeHtml(provider.id)}"${
                    provider.id === inventoryUiState.providerId ? " selected" : ""
                  }>${escapeHtml(provider.name)}</option>`
              )
              .join("")}
          </select>
        </label>
        <label>
          <span>Estado</span>
          <select data-inventory-filter="status">
            <option value="all"${inventoryUiState.status === "all" ? " selected" : ""}>Todos</option>
            <option value="in_stock"${inventoryUiState.status === "in_stock" ? " selected" : ""}>En stock</option>
            <option value="low_stock"${inventoryUiState.status === "low_stock" ? " selected" : ""}>Bajo stock</option>
            <option value="no_stock"${inventoryUiState.status === "no_stock" ? " selected" : ""}>Sin stock</option>
            <option value="no_control"${inventoryUiState.status === "no_control" ? " selected" : ""}>Sin control</option>
          </select>
        </label>
        <label class="checkbox-row sales-inventory-toolbar__toggle">
          <input
            data-inventory-filter="lowStockOnly"
            type="checkbox"
            ${inventoryUiState.lowStockOnly ? "checked" : ""}
          />
          <span>Solo bajo stock</span>
        </label>
        <button class="ghost-button" data-inventory-clear-filters type="button">Limpiar</button>
      </div>

      <div class="sales-table-scroll">${table}</div>

      <div class="sales-inventory-footer">
        <p>Mostrando ${filteredItems.length ? pageStart + 1 : 0} a ${Math.min(
          pageStart + pageSize,
          filteredItems.length
        )} de ${filteredItems.length} productos</p>
        <div class="sales-inventory-footer__controls">
          <div class="sales-inventory-pagination">
            <button
              class="sales-inventory-pagination__button"
              data-inventory-page="${Math.max(1, currentPage - 1)}"
              type="button"
              ${currentPage <= 1 ? "disabled" : ""}
            >&lsaquo;</button>
            ${pageButtons}
            <button
              class="sales-inventory-pagination__button"
              data-inventory-page="${Math.min(totalPages, currentPage + 1)}"
              type="button"
              ${currentPage >= totalPages ? "disabled" : ""}
            >&rsaquo;</button>
          </div>
          <label class="sales-inventory-footer__page-size">
            <span>Por pagina</span>
            <select data-inventory-page-size>
              ${[10, 20, 50]
                .map(
                  (size) =>
                    `<option value="${size}"${size === pageSize ? " selected" : ""}>${size}</option>`
                )
                .join("")}
            </select>
          </label>
        </div>
      </div>
    </div>
  `;
}

function updatePricingPreview(itemId) {
  if (!itemId || !elements.catalogItemsList) {
    return;
  }
  const item = state.catalog_items.find((entry) => String(entry.id) === String(itemId));
  if (!item) {
    return;
  }
  const costInput = elements.catalogItemsList.querySelector(`[data-pricing-cost="${itemId}"]`);
  const marginInput = elements.catalogItemsList.querySelector(`[data-pricing-margin="${itemId}"]`);
  const priceTarget = elements.catalogItemsList.querySelector(`[data-pricing-final="${itemId}"]`);
  if (!costInput || !marginInput || !priceTarget) {
    return;
  }
  const purchaseCost = Math.max(0, Number(costInput.value || 0));
  const marginPercent = Math.max(0, Number(marginInput.value || 0));
  const previewPrice = computeCatalogSalePrice(
    purchaseCost,
    item.presentation_total,
    marginPercent
  );
  priceTarget.textContent = formatMoney(previewPrice);
}

function updateInventoryDetailPreview(itemId) {
  if (!itemId) {
    return;
  }
  const item = state.catalog_items.find((entry) => String(entry.id) === String(itemId));
  if (!item) {
    return;
  }
  const detailForm = getInventoryDetailForm(itemId);
  const costInput = detailForm?.querySelector(`[data-inventory-detail-cost="${itemId}"]`) || null;
  const marginInput =
    detailForm?.querySelector(`[data-inventory-detail-margin="${itemId}"]`) || null;
  const priceTarget = detailForm?.querySelector(`[data-inventory-detail-price="${itemId}"]`) || null;
  if (!detailForm || !costInput || !marginInput || !priceTarget) {
    return;
  }
  const presentationValue =
    detailForm.elements.presentation_total?.value || item.presentation_total || 1;
  const previewPrice = computeCatalogSalePrice(
    Math.max(0, Number(costInput.value || 0)),
    Math.max(0.01, Number(presentationValue || 1)),
    Math.max(0, Number(marginInput.value || 0))
  );
  priceTarget.textContent = formatMoney(previewPrice);
}

function syncInventoryPanelVisibility() {
  if (getActiveSalesSubsectionValue() !== "inventario") {
    return;
  }
  elements.salesCatalogPanel?.classList.remove("is-hidden");
  elements.salesProviderFormPanel?.classList.add("is-hidden");
  elements.salesCatalogFormPanel?.classList.add("is-hidden");
  elements.salesStockFormPanel?.classList.add("is-hidden");
  elements.salesStockHistoryPanel?.classList.add("is-hidden");
  elements.salesProvidersPanel?.classList.add("is-hidden");
  syncSectionContainers("sales");
}

function bindInventoryInlineForms() {
  if (!elements.catalogItemsList) {
    return;
  }
  elements.catalogItemsList
    .querySelectorAll("[data-inventory-inline-form]")
    .forEach((form) => {
      if (form.dataset.inventoryInlineBound === "true") {
        return;
      }
      form.addEventListener("submit", wrapAsync(handleInventoryInlineFormSubmit));
      form.dataset.inventoryInlineBound = "true";
    });
}

async function submitInventoryInlineForm(form) {
  if (!form) {
    return;
  }
  const targetSubsection = getActiveSalesCatalogSubsection();
  const formType = form.dataset.inventoryInlineForm || "";
  const submitButton =
    form.querySelector(`[data-inventory-inline-submit="${formType}"]`) ||
    form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
  }
  try {
    if (formType === "provider") {
      const isProviderUpdate = Boolean(String(form.elements.id?.value || "").trim());
      const savedProvider = await api.saveProvider(serializeForm(form));
      upsertProviderInState(savedProvider);
      inventoryUiState.showProviderForm = false;
      inventoryUiState.providerDraftId = "";
      salesReportState.loaded = false;
      setActiveSection("sales");
      setSectionSubsection("sales", targetSubsection);
      await refreshData({
        sections: SALES_PROVIDER_REFRESH_SECTIONS,
        message: isProviderUpdate ? "Proveedor actualizado." : "Proveedor guardado.",
      });
      return;
    }
    if (formType === "product") {
      const savedItem = await api.saveCatalogItem(serializeForm(form));
      upsertCatalogItemInState(savedItem);
      inventoryUiState.showProductForm = false;
      inventoryUiState.selectedItemId = savedItem?.id || inventoryUiState.selectedItemId;
      salesReportState.loaded = false;
      setActiveSection("sales");
      setSectionSubsection("sales", targetSubsection);
      await refreshData({
        sections: getSalesCatalogRefreshSections(targetSubsection),
        message: "Producto guardado.",
      });
      return;
    }
    if (formType === "stock") {
      await api.saveStockAdjustment(serializeForm(form));
      inventoryUiState.showStockForm = false;
      salesReportState.loaded = false;
      await refreshData({
        sections: SALES_INVENTORY_REFRESH_SECTIONS,
        message: "Ajuste de inventario aplicado.",
      });
      setActiveSection("sales");
      setSectionSubsection("sales", "inventario");
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
    }
  }
}

async function handleInventoryInlineFormSubmit(event) {
  const form = event.target.closest("[data-inventory-inline-form]");
  if (!form) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  await submitInventoryInlineForm(form);
}

async function handleInventoryDetailSave(itemId) {
  if (!itemId) {
    return;
  }
  const targetSubsection = getActiveSalesCatalogSubsection();
  const item = state.catalog_items.find((entry) => String(entry.id) === String(itemId));
  const detailForm = getInventoryDetailForm(itemId);
  if (!item || !detailForm) {
    throw new Error("No se encontro el producto seleccionado para actualizar.");
  }
  const payload = {
    id: item.id,
    name: item.name || "",
    provider_id: detailForm.elements.provider_id?.value || "",
    category: String(detailForm.elements.category?.value || "").trim(),
    purchase_cost: Math.max(0, Number(detailForm.elements.purchase_cost?.value || 0)),
    margin_percent: Math.max(0, Number(detailForm.elements.margin_percent?.value || 0)),
    presentation_type: String(
      detailForm.elements.presentation_type?.value || item.presentation_type || "unidad"
    ).trim(),
    presentation_total: Math.max(
      0.01,
      Number(detailForm.elements.presentation_total?.value || item.presentation_total || 1)
    ),
    stock_quantity: Number(item.stock_quantity || 0),
    min_stock: Math.max(0, Number(item.min_stock || 0)),
    track_inventory: Boolean(detailForm.elements.track_inventory?.checked),
    notes: detailForm.elements.notes?.value || "",
  };
  if (!payload.category) {
    throw new Error("La categoria del producto es obligatoria.");
  }
  const saveButton = detailForm.querySelector(`[data-save-inventory-detail="${itemId}"]`);
  if (saveButton) {
    saveButton.disabled = true;
  }
  try {
    const savedItem = await api.saveCatalogItem(payload);
    upsertCatalogItemInState(savedItem);
    inventoryUiState.selectedItemId = savedItem?.id || item.id;
    inventoryUiState.detailItemId = savedItem?.id || item.id;
    salesReportState.loaded = false;
    setActiveSection("sales");
    setSectionSubsection("sales", targetSubsection);
    await refreshData({
      sections: getSalesCatalogRefreshSections(targetSubsection),
      message:
        targetSubsection === "precios"
          ? "Configuracion comercial actualizada."
          : "Producto de inventario actualizado.",
    });
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
    }
  }
}

async function handleInventoryItemDelete(itemId) {
  if (!itemId) {
    return;
  }
  const targetSubsection = getActiveSalesCatalogSubsection();
  const item = state.catalog_items.find((entry) => String(entry.id) === String(itemId));
  if (!item) {
    throw new Error("No se encontro el producto seleccionado para eliminar.");
  }
  const confirmed = window.confirm(
    `Eliminar "${item.name || "este producto"}" del catalogo? Esta accion no se puede deshacer.`
  );
  if (!confirmed) {
    return;
  }
  const detailForm = getInventoryDetailForm(itemId);
  const deleteButton = detailForm?.querySelector(`[data-delete-inventory-item="${itemId}"]`);
  if (deleteButton) {
    deleteButton.disabled = true;
  }
  try {
    await api.deleteCatalogItem(itemId);
    removeCatalogItemFromState(itemId);
    billingDraft.lines = billingDraft.lines.filter(
      (line) => String(line.catalog_item_id || "") !== String(itemId)
    );
    if (String(inventoryUiState.selectedItemId || "") === String(itemId)) {
      inventoryUiState.selectedItemId = "";
    }
    if (String(inventoryUiState.detailItemId || "") === String(itemId)) {
      closeInventoryItemModal();
    }
    inventoryUiState.showStockForm = false;
    salesReportState.loaded = false;
    setActiveSection("sales");
    setSectionSubsection("sales", targetSubsection);
    await refreshData({
      sections: getSalesCatalogRefreshSections(targetSubsection),
      message:
        targetSubsection === "precios"
          ? "Producto eliminado del catalogo."
          : "Producto eliminado del inventario.",
    });
  } finally {
    if (deleteButton) {
      deleteButton.disabled = false;
    }
  }
}

async function handleInventoryProviderDelete(providerId) {
  if (!providerId) {
    return;
  }
  const targetSubsection = getActiveSalesCatalogSubsection();
  const provider = state.providers.find((entry) => String(entry.id || "") === String(providerId));
  if (!provider) {
    throw new Error("No se encontro el proveedor seleccionado para eliminar.");
  }
  const itemsCount = Number(provider.items_count || 0);
  const confirmed = window.confirm(
    `Eliminar "${provider.name || "este proveedor"}"?${
      itemsCount
        ? ` ${itemsCount} ${itemsCount === 1 ? "producto quedara" : "productos quedaran"} sin proveedor.`
        : ""
    } Esta accion no se puede deshacer.`
  );
  if (!confirmed) {
    return;
  }
  const deleteButtons = queryAll(`[data-inventory-delete-provider="${providerId}"]`);
  deleteButtons.forEach((button) => {
    button.disabled = true;
  });
  try {
    const deleted = await api.deleteProvider(providerId);
    removeProviderFromState(providerId);
    inventoryUiState.showProviderForm = false;
    inventoryUiState.providerDraftId = "";
    salesReportState.loaded = false;
    setActiveSection("sales");
    setSectionSubsection("sales", targetSubsection);
    const detachedItems = Number(deleted?.detached_items_count || 0);
    await refreshData({
      sections: SALES_PROVIDER_REFRESH_SECTIONS,
      message: detachedItems
        ? `Proveedor eliminado. ${detachedItems} ${
            detachedItems === 1 ? "producto quedo" : "productos quedaron"
          } sin proveedor.`
        : "Proveedor eliminado.",
    });
  } finally {
    deleteButtons.forEach((button) => {
      button.disabled = false;
    });
  }
}

async function handleCatalogPricingSave(itemId) {
  if (!itemId || !elements.catalogItemsList) {
    return;
  }
  const item = state.catalog_items.find((entry) => String(entry.id) === String(itemId));
  if (!item) {
    throw new Error("No se encontro el producto para actualizar el precio.");
  }
  const costInput = elements.catalogItemsList.querySelector(`[data-pricing-cost="${itemId}"]`);
  const marginInput = elements.catalogItemsList.querySelector(`[data-pricing-margin="${itemId}"]`);
  const saveButton = elements.catalogItemsList.querySelector(`[data-save-pricing="${itemId}"]`);
  const purchaseCost = Math.max(0, Number(costInput?.value || 0));
  const marginPercent = Math.max(0, Number(marginInput?.value || 0));
  const payload = {
    id: item.id,
    provider_id: item.provider_id || "",
    name: item.name || "",
    category: item.category || "",
    purchase_cost: Number.isFinite(purchaseCost) ? purchaseCost : 0,
    margin_percent: Number.isFinite(marginPercent) ? marginPercent : 0,
    presentation_type: item.presentation_type || "unidad",
    presentation_total: Number(item.presentation_total || 1) || 1,
    stock_quantity: Number(item.stock_quantity || 0) || 0,
    min_stock: Number(item.min_stock || 0) || 0,
    track_inventory: Boolean(item.track_inventory),
    notes: item.notes || "",
  };
  if (saveButton) {
    saveButton.disabled = true;
  }
  try {
    const savedItem = await api.saveCatalogItem(payload);
    upsertCatalogItemInState(savedItem);
    salesReportState.loaded = false;
    setActiveSection("sales");
    setSectionSubsection("sales", "precios");
    await refreshData({
      sections: SALES_PRICING_REFRESH_SECTIONS,
      message: "Precio de venta actualizado.",
    });
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
    }
  }
}

function handleCatalogItemsInput(event) {
  const filterControl = event.target.closest("[data-inventory-filter], [data-inventory-page-size]");
  if (filterControl) {
    if (Object.prototype.hasOwnProperty.call(filterControl.dataset, "inventoryPageSize")) {
      inventoryUiState.pageSize = Math.max(1, Number(filterControl.value || 10));
      inventoryUiState.page = 1;
      renderSales();
      return;
    }
    const filterKey = filterControl.dataset.inventoryFilter || "";
    if (filterKey) {
      inventoryUiState[filterKey] =
        filterControl.type === "checkbox" ? Boolean(filterControl.checked) : filterControl.value || "";
      inventoryUiState.page = 1;
      const caretPosition = typeof filterControl.selectionStart === "number"
        ? filterControl.selectionStart
        : String(filterControl.value || "").length;
      renderSales();
      if (filterKey === "search") {
        const refreshedSearch = elements.catalogItemsList?.querySelector(
          '[data-inventory-filter="search"]'
        );
        if (refreshedSearch) {
          refreshedSearch.focus();
          if (typeof refreshedSearch.setSelectionRange === "function") {
            refreshedSearch.setSelectionRange(caretPosition, caretPosition);
          }
        }
      }
      return;
    }
  }
  const detailInput = event.target.closest(
    '[data-inventory-detail-cost], [data-inventory-detail-margin], [data-inventory-detail-field="presentation_total"]'
  );
  if (detailInput) {
    updateInventoryDetailPreview(
      detailInput.dataset.inventoryDetailCost ||
        detailInput.dataset.inventoryDetailMargin ||
        detailInput.closest("[data-inventory-detail-form]")?.dataset.inventoryDetailForm ||
        ""
    );
  }
  const pricingInput = event.target.closest("[data-pricing-cost], [data-pricing-margin]");
  if (pricingInput) {
    updatePricingPreview(pricingInput.dataset.pricingCost || pricingInput.dataset.pricingMargin || "");
  }
}

async function handleCatalogItemsClick(event) {
  const inlineSubmitButton = event.target.closest("[data-inventory-inline-submit]");
  if (inlineSubmitButton) {
    event.preventDefault();
    const form = inlineSubmitButton.closest("[data-inventory-inline-form]");
    if (!form) {
      return;
    }
    if (typeof form.reportValidity === "function" && !form.reportValidity()) {
      return;
    }
    await submitInventoryInlineForm(form);
    return;
  }
  const togglePanelButton = event.target.closest("[data-inventory-toggle-panel]");
  if (togglePanelButton) {
    const targetPanel = togglePanelButton.dataset.inventoryTogglePanel || "";
    let scrollTarget = "salesCatalogPanel";
    if (targetPanel === "provider") {
      inventoryUiState.providerDraftId = "";
      inventoryUiState.showProviderForm = !inventoryUiState.showProviderForm;
      scrollTarget = inventoryUiState.showProviderForm ? "salesInventoryProviderCard" : "salesCatalogPanel";
    }
    if (targetPanel === "product") {
      inventoryUiState.showProductForm = !inventoryUiState.showProductForm;
      scrollTarget = inventoryUiState.showProductForm ? "salesInventoryProductCard" : "salesCatalogPanel";
    }
    renderSales();
    scrollToDashboardTarget(scrollTarget);
    return;
  }
  const openProviderDirectoryButton = event.target.closest("[data-open-provider-directory]");
  if (openProviderDirectoryButton) {
    openProviderDirectoryModal();
    return;
  }
  const editProviderButton = event.target.closest("[data-inventory-edit-provider]");
  if (editProviderButton) {
    inventoryUiState.providerDraftId = editProviderButton.dataset.inventoryEditProvider || "";
    inventoryUiState.showProviderForm = true;
    renderSales();
    scrollToDashboardTarget("salesInventoryProviderCard");
    return;
  }
  const deleteProviderButton = event.target.closest("[data-inventory-delete-provider]");
  if (deleteProviderButton) {
    await handleInventoryProviderDelete(deleteProviderButton.dataset.inventoryDeleteProvider || "");
    return;
  }
  const openSupportButton = event.target.closest("[data-inventory-open-support]");
  if (openSupportButton) {
    const supportType = openSupportButton.dataset.inventoryOpenSupport || "";
    if (supportType === "stock") {
      const hasTrackableItems = state.catalog_items.some((item) => item.track_inventory);
      if (!hasTrackableItems) {
        showStatus("Primero crea un producto con control de inventario activo.", "info");
        return;
      }
      inventoryUiState.showStockForm = true;
      renderSales();
      scrollToDashboardTarget("salesInventoryAdjustCard");
    }
    return;
  }
  const closeSupportButton = event.target.closest("[data-inventory-close-support]");
  if (closeSupportButton) {
    const supportType = closeSupportButton.dataset.inventoryCloseSupport || "";
    if (supportType === "stock") {
      inventoryUiState.showStockForm = false;
      renderSales();
    }
    return;
  }
  const clearFiltersButton = event.target.closest("[data-inventory-clear-filters]");
  if (clearFiltersButton) {
    inventoryUiState.search = "";
    inventoryUiState.category = "";
    inventoryUiState.providerId = "";
    inventoryUiState.status = "all";
    inventoryUiState.lowStockOnly = false;
    inventoryUiState.page = 1;
    renderSales();
    return;
  }
  const pageButton = event.target.closest("[data-inventory-page]");
  if (pageButton) {
    inventoryUiState.page = Math.max(1, Number(pageButton.dataset.inventoryPage || 1));
    renderSales();
    return;
  }
  const openItemButton = event.target.closest("[data-open-inventory-item]");
  if (openItemButton) {
    openInventoryItemModal(openItemButton.dataset.openInventoryItem || "");
    return;
  }
  const selectButton = event.target.closest("[data-inventory-select-item]");
  if (selectButton) {
    inventoryUiState.selectedItemId = selectButton.dataset.inventorySelectItem || "";
    renderSales();
    return;
  }
  const resetDetailButton = event.target.closest("[data-reset-inventory-detail]");
  if (resetDetailButton) {
    renderSales();
    return;
  }
  const deleteInventoryButton = event.target.closest("[data-delete-inventory-item]");
  if (deleteInventoryButton) {
    await handleInventoryItemDelete(deleteInventoryButton.dataset.deleteInventoryItem || "");
    return;
  }
  const adjustButton = event.target.closest("[data-inventory-adjust-item]");
  if (adjustButton) {
    const itemId = adjustButton.dataset.inventoryAdjustItem || "";
    const item = state.catalog_items.find((entry) => String(entry.id) === String(itemId));
    if (!item) {
      throw new Error("No se encontro el item para aplicar el ajuste.");
    }
    if (!item.track_inventory) {
      showStatus("Activa el control de inventario para registrar ajustes de stock.", "warning");
      return;
    }
    inventoryUiState.selectedItemId = itemId;
    inventoryUiState.showStockForm = true;
    renderSales();
    showStatus(`"${item.name || "Producto"}" listo para ajuste manual.`, "info");
    scrollToDashboardTarget("salesInventoryAdjustCard");
    return;
  }
  const saveInventoryDetailButton = event.target.closest("[data-save-inventory-detail]");
  if (saveInventoryDetailButton) {
    await handleInventoryDetailSave(saveInventoryDetailButton.dataset.saveInventoryDetail || "");
    return;
  }
  const saveButton = event.target.closest("[data-save-pricing]");
  if (!saveButton) {
    return;
  }
  await handleCatalogPricingSave(saveButton.dataset.savePricing || "");
}

async function handleProviderDirectoryModalClick(event) {
  if (event.target.dataset.closeProviderDirectoryModal) {
    closeProviderDirectoryModal();
    return;
  }
  const editProviderButton = event.target.closest("[data-inventory-edit-provider]");
  if (editProviderButton) {
    inventoryUiState.providerDraftId = editProviderButton.dataset.inventoryEditProvider || "";
    inventoryUiState.showProviderForm = true;
    closeProviderDirectoryModal();
    renderSales();
    scrollToDashboardTarget("salesInventoryProviderCard");
    return;
  }
  const deleteProviderButton = event.target.closest("[data-inventory-delete-provider]");
  if (deleteProviderButton) {
    await handleInventoryProviderDelete(deleteProviderButton.dataset.inventoryDeleteProvider || "");
  }
}

function handleInventoryItemModalInput(event) {
  const detailInput = event.target.closest(
    '[data-inventory-detail-cost], [data-inventory-detail-margin], [data-inventory-detail-field="presentation_total"]'
  );
  if (!detailInput) {
    return;
  }
  updateInventoryDetailPreview(
    detailInput.dataset.inventoryDetailCost ||
      detailInput.dataset.inventoryDetailMargin ||
      detailInput.closest("[data-inventory-detail-form]")?.dataset.inventoryDetailForm ||
      ""
  );
}

async function handleInventoryItemModalClick(event) {
  if (event.target.dataset.closeInventoryItemModal) {
    closeInventoryItemModal();
    return;
  }
  const resetDetailButton = event.target.closest("[data-reset-inventory-detail]");
  if (resetDetailButton) {
    renderInventoryItemModal();
    return;
  }
  const deleteInventoryButton = event.target.closest("[data-delete-inventory-item]");
  if (deleteInventoryButton) {
    await handleInventoryItemDelete(deleteInventoryButton.dataset.deleteInventoryItem || "");
    return;
  }
  const saveInventoryDetailButton = event.target.closest("[data-save-inventory-detail]");
  if (saveInventoryDetailButton) {
    await handleInventoryDetailSave(saveInventoryDetailButton.dataset.saveInventoryDetail || "");
  }
}

function getSelectedCashSessionDate() {
  return (
    elements.cashSessionOpenForm?.elements?.session_date?.value ||
    elements.cashSessionCloseForm?.elements?.session_date?.value ||
    new Date().toISOString().slice(0, 10)
  );
}

function getSelectedCashAccount() {
  return (
    elements.cashMovementForm?.elements?.cash_account?.value ||
    elements.cashSessionOpenForm?.elements?.cash_account?.value ||
    elements.cashSessionCloseForm?.elements?.cash_account?.value ||
    state.settings.billing_default_cash_account ||
    "caja_menor"
  );
}

function setCashAccountSelection(cashAccount, { render = true } = {}) {
  if (!cashAccount || !billingCashAccounts.includes(cashAccount)) {
    return;
  }
  [
    elements.cashMovementForm?.elements?.cash_account,
    elements.cashSessionOpenForm?.elements?.cash_account,
    elements.cashSessionCloseForm?.elements?.cash_account,
  ].forEach((field) => {
    if (field) {
      field.value = cashAccount;
    }
  });
  if (render) {
    renderCashAccountsSummary();
    renderCashSessionsSummary();
  }
}

function getCashDayTotals(sessionDate, cashAccount = "") {
  return state.cash_movements.reduce(
    (totals, movement) => {
      if (movement.movement_date !== sessionDate) {
        return totals;
      }
      if (cashAccount && movement.cash_account !== cashAccount) {
        return totals;
      }
      const amount = Number(movement.amount || 0);
      if (movement.movement_type === "ingreso") {
        totals.income += amount;
      } else if (movement.movement_type === "gasto") {
        totals.expense += amount;
      }
      return totals;
    },
    { income: 0, expense: 0 }
  );
}

function getCashAccountTotals(cashAccount = "") {
  return state.cash_movements.reduce(
    (totals, movement) => {
      if (cashAccount && movement.cash_account !== cashAccount) {
        return totals;
      }
      const amount = Number(movement.amount || 0);
      if (movement.movement_type === "ingreso") {
        totals.income += amount;
      } else if (movement.movement_type === "gasto") {
        totals.expense += amount;
      }
      totals.count += 1;
      return totals;
    },
    { income: 0, expense: 0, count: 0 }
  );
}

function getLatestCashSessionForAccount(cashAccount) {
  return (
    state.cash_sessions.find((session) => session.cash_account === cashAccount) || null
  );
}

function getCashSessionStatusMeta(session) {
  if (!session) {
    return {
      label: "Sin apertura",
      className: "sales-cash-status-badge sales-cash-status-badge--neutral",
      detail: "Sin apertura registrada",
    };
  }
  if (session.is_closed) {
    return {
      label: "Cerrada",
      className: "sales-cash-status-badge sales-cash-status-badge--neutral",
      detail: "Cierre registrado",
    };
  }
  return {
    label: "Abierta",
    className: "sales-cash-status-badge sales-cash-status-badge--open",
    detail: "Disponible",
  };
}

function getCurrentCashAccountAmount(cashAccount) {
  const session = getLatestCashSessionForAccount(cashAccount);
  const totals = getCashAccountTotals(cashAccount);
  if (!session) {
    return totals.income - totals.expense;
  }
  if (!session.is_closed) {
    return Number(session.expected_closing_amount ?? session.opening_amount ?? 0);
  }
  if (session.closing_amount !== null && session.closing_amount !== undefined && session.closing_amount !== "") {
    return Number(session.closing_amount);
  }
  return totals.income - totals.expense;
}

function getCashPanelIconMarkup(kind) {
  return (
    {
      income: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 4.5v15"></path>
          <path d="M6.5 13 12 18.5 17.5 13"></path>
        </svg>
      `,
      expense: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 19.5v-15"></path>
          <path d="M6.5 11 12 5.5 17.5 11"></path>
        </svg>
      `,
      balance: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3.5" y="6.5" width="17" height="11" rx="2.5"></rect>
          <path d="M14 12h.01"></path>
          <path d="M7.5 10.5h2"></path>
        </svg>
      `,
      sessions: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="5.5" y="4.5" width="13" height="15" rx="2.5"></rect>
          <path d="M8.5 8h7"></path>
          <path d="M8.5 12h7"></path>
          <path d="M10 16h4"></path>
        </svg>
      `,
      opening: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 19.5v-15"></path>
          <path d="M6.5 11 12 5.5 17.5 11"></path>
        </svg>
      `,
      closing: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 4.5v15"></path>
          <path d="M6.5 13 12 18.5 17.5 13"></path>
        </svg>
      `,
      arrow: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6"></path>
        </svg>
      `,
    }[kind] || ""
  );
}

function getCashMovementTypeLabel(movementType) {
  return (
    {
      ingreso: "Ingreso",
      egreso: "Egreso",
      apertura: "Apertura",
      cierre: "Cierre",
    }[movementType] || capitalizeLabel(movementType)
  );
}

function getCashTrendMeta(currentAmount, previousAmount, { inverse = false } = {}) {
  if (currentAmount === 0 && previousAmount === 0) {
    return {
      text: "Sin movimientos hoy",
      className: "sales-cash-kpi-card__meta sales-cash-kpi-card__meta--neutral",
    };
  }
  if (previousAmount <= 0) {
    return {
      text: currentAmount > 0 ? "Actividad nueva hoy" : "Sin movimientos hoy",
      className: `sales-cash-kpi-card__meta ${
        currentAmount > 0
          ? inverse
            ? "sales-cash-kpi-card__meta--negative"
            : "sales-cash-kpi-card__meta--positive"
          : "sales-cash-kpi-card__meta--neutral"
      }`,
    };
  }
  const delta = currentAmount - previousAmount;
  const percent = Math.round((delta / previousAmount) * 100);
  return {
    text: `${percent > 0 ? "+" : ""}${percent}% vs. ayer`,
    className: `sales-cash-kpi-card__meta ${
      inverse
        ? percent <= 0
          ? "sales-cash-kpi-card__meta--positive"
          : "sales-cash-kpi-card__meta--negative"
        : percent >= 0
        ? "sales-cash-kpi-card__meta--positive"
        : "sales-cash-kpi-card__meta--negative"
    }`,
  };
}

function renderCashSummaryCards() {
  if (!elements.cashSummaryCards) {
    return;
  }
  const today = toIsoDate(new Date());
  const yesterday = toIsoDate(addDays(parseIsoDate(today), -1));
  const todayTotals = getCashDayTotals(today);
  const yesterdayTotals = getCashDayTotals(yesterday);
  const latestSessions = billingCashAccounts.map((cashAccount) => getLatestCashSessionForAccount(cashAccount));
  const openCount = latestSessions.filter((session) => session && !session.is_closed).length;
  const availableBalance = billingCashAccounts.reduce(
    (total, cashAccount) => total + getCurrentCashAccountAmount(cashAccount),
    0
  );
  const incomeTrend = getCashTrendMeta(todayTotals.income, yesterdayTotals.income);
  const expenseTrend = getCashTrendMeta(todayTotals.expense, yesterdayTotals.expense, { inverse: true });
  const cards = [
    {
      key: "income",
      title: "Ingresos del dia",
      value: formatMoney(todayTotals.income),
      detail: incomeTrend.text,
      metaClass: incomeTrend.className,
      helper: todayTotals.income ? `${getCashAccountTotals().count} movimientos acumulados` : "Sin ingresos registrados",
      icon: "income",
    },
    {
      key: "expense",
      title: "Egresos del dia",
      value: formatMoney(todayTotals.expense),
      detail: expenseTrend.text,
      metaClass: expenseTrend.className,
      helper: todayTotals.expense ? "Control de egresos del dia" : "Sin egresos registrados",
      icon: "expense",
    },
    {
      key: "balance",
      title: "Saldo actual",
      value: formatMoney(availableBalance),
      detail: "Disponible en cajas",
      metaClass: "sales-cash-kpi-card__meta sales-cash-kpi-card__meta--neutral",
      helper: `${openCount} caja${openCount === 1 ? "" : "s"} abierta${openCount === 1 ? "" : "s"}`,
      icon: "balance",
    },
    {
      key: "sessions",
      title: "Cajas abiertas",
      value: String(openCount),
      detail: `${openCount} de ${billingCashAccounts.length} cajas activas`,
      metaClass: "sales-cash-kpi-card__meta sales-cash-kpi-card__meta--neutral",
      helper: `Corte de ${formatDateTime(today)}`,
      icon: "sessions",
    },
  ];
  elements.cashSummaryCards.innerHTML = cards
    .map(
      (card) => `
        <article class="sales-cash-kpi-card sales-cash-kpi-card--${escapeHtml(card.key)}">
          <div class="sales-cash-kpi-card__icon">
            ${getCashPanelIconMarkup(card.icon)}
          </div>
          <div class="sales-cash-kpi-card__body">
            <span class="sales-cash-kpi-card__title">${escapeHtml(card.title)}</span>
            <strong class="sales-cash-kpi-card__value">${escapeHtml(card.value)}</strong>
            <span class="${card.metaClass}">${escapeHtml(card.detail)}</span>
            <small class="sales-cash-kpi-card__helper">${escapeHtml(card.helper)}</small>
          </div>
        </article>
      `
    )
    .join("");
}

function renderCashAccountsSummary() {
  if (!elements.cashAccountsSummary) {
    return;
  }
  const selectedCashAccount = getSelectedCashAccount();
  elements.cashAccountsSummary.innerHTML = billingCashAccounts
    .map((cashAccount) => {
      const session = getLatestCashSessionForAccount(cashAccount);
      const statusMeta = getCashSessionStatusMeta(session);
      const accountTotals = getCashAccountTotals(cashAccount);
      const amount = getCurrentCashAccountAmount(cashAccount);
      const movementDetail = session
        ? `${statusMeta.detail} · ${formatDateTime(session.session_date)}`
        : accountTotals.count
        ? `${accountTotals.count} movimiento${accountTotals.count === 1 ? "" : "s"} registrado${accountTotals.count === 1 ? "" : "s"}`
        : "Sin movimientos";
      return `
        <button
          class="sales-cash-account-row${selectedCashAccount === cashAccount ? " is-selected" : ""}"
          type="button"
          data-cash-account-select="${escapeHtml(cashAccount)}"
        >
          <span class="sales-cash-account-row__icon">
            ${getCashPanelIconMarkup("balance")}
          </span>
          <span class="sales-cash-account-row__copy">
            <strong>${escapeHtml(cashAccountLabel(cashAccount))}</strong>
            <span>${escapeHtml(movementDetail)}</span>
          </span>
          <strong class="sales-cash-account-row__amount">${escapeHtml(formatMoney(amount))}</strong>
          <span class="${statusMeta.className}">${escapeHtml(statusMeta.label)}</span>
          <span class="sales-cash-account-row__arrow">
            ${getCashPanelIconMarkup("arrow")}
          </span>
        </button>
      `;
    })
    .join("");
}

function renderCashSessionsSummary() {
  if (!elements.cashSessionsSummary) {
    return;
  }
  const sessionDate = getSelectedCashSessionDate();
  const selectedCashAccount = getSelectedCashAccount();
  const session = state.cash_sessions.find(
    (item) => item.session_date === sessionDate && item.cash_account === selectedCashAccount
  );
  const totals = getCashDayTotals(sessionDate, selectedCashAccount);
  const openingAmount = Number(session?.opening_amount || 0);
  const expectedClosingAmount = Number(
    session?.expected_closing_amount ?? openingAmount + totals.income - totals.expense
  );
  const differenceAmount =
    session?.difference_amount === null ||
    session?.difference_amount === undefined ||
    session?.difference_amount === ""
      ? null
      : Number(session.difference_amount);
  const dateLabel = formatLongDateLabel(parseIsoDate(sessionDate)) || formatDateTime(sessionDate);
  elements.cashSessionsSummary.innerHTML = `
    <div class="sales-cash-session-summary">
      <div class="sales-cash-session-summary__copy">
        <strong>${escapeHtml(dateLabel)}</strong>
        <span>${escapeHtml(cashAccountLabel(selectedCashAccount))} seleccionada para el control diario.</span>
      </div>
      <div class="sales-cash-session-summary__chips">
        <div class="sales-cash-chip">
          <span>Apertura</span>
          <strong>${escapeHtml(formatMoney(openingAmount))}</strong>
        </div>
        <div class="sales-cash-chip">
          <span>Ingresos</span>
          <strong>${escapeHtml(formatMoney(totals.income))}</strong>
        </div>
        <div class="sales-cash-chip">
          <span>Egresos</span>
          <strong>${escapeHtml(formatMoney(totals.expense))}</strong>
        </div>
        <div class="sales-cash-chip">
          <span>${differenceAmount === null ? "Cierre esperado" : "Diferencia"}</span>
          <strong class="${
            differenceAmount === null
              ? ""
              : differenceAmount === 0
              ? "sales-cash-session-difference--balanced"
              : differenceAmount > 0
              ? "sales-cash-session-difference--positive"
              : "sales-cash-session-difference--negative"
          }">${escapeHtml(
            differenceAmount === null ? formatMoney(expectedClosingAmount) : formatMoney(differenceAmount)
          )}</strong>
        </div>
      </div>
    </div>
  `;
}

function getRecentCashRecords(limit = 10) {
  const movementRecords = state.cash_movements.map((movement) => ({
    record_type: movement.movement_type === "gasto" ? "egreso" : "ingreso",
    concept: movement.concept || "Movimiento de caja",
    detail: movement.category || (movement.auto_generated ? "Generado automaticamente" : "Movimiento manual"),
    cash_account: movement.cash_account,
    amount: Number(movement.amount || 0),
    display_at: movement.created_at || movement.movement_date,
    sort_at: movement.created_at || `${movement.movement_date}T00:00:00`,
    status_label: movement.auto_generated ? "Automatico" : "Registrado",
    status_tone: movement.auto_generated ? "neutral" : "ok",
  }));
  const sessionRecords = state.cash_sessions.flatMap((session) => {
    const records = [
      {
        record_type: "apertura",
        concept: "Apertura de caja",
        detail: session.opening_notes || "Inicio de caja registrado",
        cash_account: session.cash_account,
        amount: Number(session.opening_amount || 0),
        display_at: session.opened_at || session.session_date,
        sort_at: session.opened_at || `${session.session_date}T00:00:00`,
        status_label: "Registrado",
        status_tone: "ok",
      },
    ];
    if (session.is_closed) {
      records.push({
        record_type: "cierre",
        concept: "Cierre de caja",
        detail:
          session.difference_amount === null ||
          session.difference_amount === undefined ||
          session.difference_amount === ""
            ? session.closing_notes || "Cierre registrado"
            : `Diferencia ${formatMoney(session.difference_amount)}`,
        cash_account: session.cash_account,
        amount: Number(
          session.closing_amount === null || session.closing_amount === undefined || session.closing_amount === ""
            ? session.expected_closing_amount || 0
            : session.closing_amount || 0
        ),
        display_at: session.closed_at || session.session_date,
        sort_at: session.closed_at || `${session.session_date}T23:59:59`,
        status_label: "Registrado",
        status_tone: "ok",
      });
    }
    return records;
  });
  const allRecords = [...movementRecords, ...sessionRecords];
  return allRecords
    .sort((left, right) => {
      const leftDate = new Date(left.sort_at);
      const rightDate = new Date(right.sort_at);
      const leftTime = Number.isNaN(leftDate.getTime()) ? 0 : leftDate.getTime();
      const rightTime = Number.isNaN(rightDate.getTime()) ? 0 : rightDate.getTime();
      return rightTime - leftTime;
    })
    .slice(0, limit);
}

function renderCashMovementsTable() {
  if (!elements.cashMovementsList) {
    return;
  }
  const rows = getRecentCashRecords().map((record) => {
    const amountClass =
      record.record_type === "ingreso"
        ? "sales-cash-amount sales-cash-amount--positive"
        : record.record_type === "egreso"
        ? "sales-cash-amount sales-cash-amount--negative"
        : "sales-cash-amount sales-cash-amount--info";
    return [
      { value: formatDateTime(record.display_at), align: "left" },
      {
        value: `
          <div class="sales-cash-cell">
            <strong>${escapeHtml(record.concept)}</strong>
            <span>${escapeHtml(record.detail)}</span>
          </div>
        `,
        html: true,
        align: "left",
      },
      {
        value: `
          <span class="sales-cash-record-type sales-cash-record-type--${escapeHtml(record.record_type)}">
            <span class="sales-cash-record-type__icon">${getCashPanelIconMarkup(
              record.record_type === "egreso" ? "expense" : record.record_type === "ingreso" ? "income" : record.record_type
            )}</span>
            <span>${escapeHtml(getCashMovementTypeLabel(record.record_type))}</span>
          </span>
        `,
        html: true,
        align: "left",
      },
      { value: cashAccountLabel(record.cash_account), align: "left" },
      {
        value: `<strong class="${amountClass}">${escapeHtml(formatMoney(Math.abs(record.amount || 0)))}</strong>`,
        html: true,
      },
      {
        value: `<span class="sales-cash-status-badge sales-cash-status-badge--${escapeHtml(
          record.status_tone
        )}">${escapeHtml(record.status_label)}</span>`,
        html: true,
      },
    ];
  });
  elements.cashMovementsList.innerHTML = `
    <div class="sales-table-scroll sales-cash-table-scroll">
      ${buildSalesHtmlTable(
        [
          { label: "Fecha", align: "left" },
          { label: "Concepto", align: "left" },
          { label: "Tipo", align: "left" },
          { label: "Caja", align: "left" },
          { label: "Monto" },
          { label: "Estado", align: "left" },
        ],
        rows,
        "Aun no hay movimientos de caja."
      )}
    </div>
  `;
}

function renderCashSection() {
  renderCashSummaryCards();
  renderCashAccountsSummary();
  renderCashSessionsSummary();
  renderCashMovementsTable();
}

function handleCashAccountSummaryClick(event) {
  const accountButton = event.target.closest("[data-cash-account-select]");
  if (!accountButton) {
    return;
  }
  setCashAccountSelection(accountButton.dataset.cashAccountSelect || "");
}

function renderSalesDocumentDetail() {
  if (!elements.salesDocumentDetail) {
    return;
  }
  if (!salesSelectedDocument) {
    elements.salesDocumentDetail.innerHTML =
      '<div class="sales-detail-empty">Selecciona un documento para ver lineas, pagos, PDF y correo.</div>';
    return;
  }

  const document = salesSelectedDocument;
  const lines = Array.isArray(document.lines) ? document.lines : [];
  const payments = Array.isArray(document.payments) ? document.payments : [];
  const showPaymentsSection =
    document.document_type === "factura" && (document.status === "Pendiente" || payments.length > 0);
  const emailDraft = document.email_draft || {};
  const documentTypeLabel =
    document.document_type === "cotizacion" ? "Cotizacion" : "Factura";
  const linesTable = buildSalesHtmlTable(
    [
      { label: "Item", align: "left" },
      { label: "Categoria" },
      { label: "Cantidad" },
      { label: "Valor U" },
      { label: "Total" },
    ],
    lines.map((line) => [
      { value: line.item_name || "-" , align: "left" },
      { value: line.category || "-" , align: "left" },
      { value: Number(line.quantity || 0).toString() },
      { value: formatMoney(line.unit_price || 0) },
      { value: formatMoney(line.line_total || 0) },
    ]),
    "Este documento no tiene lineas registradas."
  );
  const paymentsTable = buildSalesHtmlTable(
    [
      { label: "Fecha", align: "left" },
      { label: "Metodo", align: "left" },
      { label: "Caja", align: "left" },
      { label: "Monto" },
      { label: "Accion" },
    ],
    payments.map((payment) => [
      { value: payment.payment_date || "-", align: "left" },
      { value: payment.payment_method || "-", align: "left" },
      { value: payment.cash_account || "-", align: "left" },
      { value: formatMoney(payment.amount || 0) },
      {
        value: `<button class="ghost-button" type="button" data-download-billing-payment="${escapeHtml(
          String(payment.id || "")
        )}">PDF</button>`,
        html: true,
      },
    ]),
    "Todavia no hay abonos registrados."
  );

  elements.salesDocumentDetail.innerHTML = `
    <div class="sales-detail-grid">
      <article class="sales-detail-card">
        <h4>${escapeHtml(documentTypeLabel)} ${escapeHtml(document.document_number || "")}</h4>
        <div class="sales-detail-kv">
          <div><span>Paciente</span><strong>${escapeHtml(document.patient_name || document.patient_name_snapshot || "-")}</strong></div>
          <div><span>Propietario</span><strong>${escapeHtml(document.owner_name || document.owner_name_snapshot || "-")}</strong></div>
          <div><span>Emision</span><strong>${escapeHtml(document.issue_date || "-")}</strong></div>
          <div><span>Vencimiento</span><strong>${escapeHtml(document.due_date || "-")}</strong></div>
          <div><span>Estado</span><strong>${escapeHtml(document.status || "-")}</strong></div>
          <div><span>Pago</span><strong>${escapeHtml(document.payment_method || "-")}</strong></div>
          <div><span>Total</span><strong>${escapeHtml(formatMoney(document.total || 0))}</strong></div>
          <div><span>Saldo</span><strong>${escapeHtml(formatMoney(document.balance_due || 0))}</strong></div>
        </div>
        <div class="sales-inline-actions">
          <button class="secondary-button" type="button" data-download-billing-document="${escapeHtml(
            String(document.id || "")
          )}">Generar PDF</button>
          ${
            document.document_type === "factura" && document.status === "Pendiente"
              ? `<button class="ghost-button" type="button" data-select-billing-document="${escapeHtml(
                  String(document.id || "")
                )}">Registrar abono</button>`
              : ""
          }
        </div>
        ${
          document.notes
            ? `<p class="sales-section-note">${escapeHtml(document.notes)}</p>`
            : ""
        }
      </article>
      <article class="sales-detail-card">
        <h4>Enviar por correo</h4>
        <form class="sales-email-form" data-sales-email-form>
          <label>
            <span>Destinatario</span>
            <input name="recipient_email" type="email" value="${escapeHtml(
              emailDraft.recipient_email || ""
            )}" />
          </label>
          <label>
            <span>Asunto</span>
            <input name="subject" value="${escapeHtml(emailDraft.subject || "")}" />
          </label>
          <label>
            <span>Mensaje</span>
            <textarea name="body" rows="8">${escapeHtml(emailDraft.body || "")}</textarea>
          </label>
          <div class="sales-inline-actions">
            <button class="primary-button" type="submit">Enviar correo</button>
          </div>
          <p class="sales-section-note">Variables disponibles: ${escapeHtml(
            Array.isArray(emailDraft.template_variables)
              ? emailDraft.template_variables.map((item) => `{${item}}`).join(", ")
              : ""
          )}</p>
        </form>
      </article>
    </div>
    <article class="sales-detail-card">
      <h4>Lineas del documento</h4>
      ${linesTable}
    </article>
    ${
      showPaymentsSection
        ? `
          <article class="sales-detail-card">
            <h4>Historial de pagos</h4>
            ${paymentsTable}
          </article>
        `
        : ""
    }
  `;
}

function renderSalesReportMiniSummary() {
  if (!elements.salesReportSummaryMini) {
    return;
  }
  const summary = state.sales_report?.summary || null;
  if (!summary) {
    elements.salesReportSummaryMini.innerHTML = "";
    return;
  }
  renderSummary(
    elements.salesReportSummaryMini,
    [
      ["Facturado", formatMoney(summary.total_facturado || 0)],
      ["Cobrado", formatMoney(summary.total_cobrado || 0)],
      ["Cartera", formatMoney(summary.cartera_pendiente || 0)],
      ["Gastos", formatMoney(summary.gastos || 0)],
      ["Utilidad", formatMoney(summary.utilidad || 0)],
      ["Stock bajo", summary.low_stock_count || 0],
    ],
    "Sin resumen disponible."
  );
}

function renderSalesReports() {
  if (!elements.salesReportsContent) {
    return;
  }
  if (salesReportState.loading) {
    elements.salesReportsContent.innerHTML =
      '<div class="sales-report-empty">Cargando reporte de ventas...</div>';
    return;
  }
  if (!state.sales_report?.summary) {
    elements.salesReportsContent.innerHTML =
      '<div class="sales-report-empty">Actualiza el reporte para ver cartera, caja e inventario en informes.</div>';
    return;
  }

  const report = state.sales_report;
  const summary = report.summary || {};
  const summaryCards = [
    ["Total facturado", formatMoney(summary.total_facturado || 0)],
    ["Total cobrado", formatMoney(summary.total_cobrado || 0)],
    ["Abonos", summary.abonos_registrados || 0],
    ["Cartera pendiente", formatMoney(summary.cartera_pendiente || 0)],
    ["Gastos", formatMoney(summary.gastos || 0)],
    ["Utilidad neta", formatMoney(summary.utilidad || 0)],
  ]
    .map(
      ([label, value]) => `
        <article class="sales-report-card">
          <h4>${escapeHtml(String(label))}</h4>
          <div class="sales-report-kv">
            <div><span>Valor</span><strong>${escapeHtml(String(value))}</strong></div>
          </div>
        </article>
      `
    )
    .join("");

  const documentsTable = buildSalesHtmlTable(
    [
      { label: "Numero", align: "left" },
      { label: "Tipo", align: "left" },
      { label: "Paciente", align: "left" },
      { label: "Estado", align: "left" },
      { label: "Total" },
    ],
    (report.documents || []).slice(0, 12).map((document) => [
      {
        value: `<button class="ghost-button" type="button" data-view-billing-document="${escapeHtml(
          String(document.id || "")
        )}">${escapeHtml(document.document_number || "-")}</button>`,
        html: true,
        align: "left",
      },
      { value: document.document_type === "cotizacion" ? "Cotizacion" : "Factura", align: "left" },
      { value: document.patient_name || document.patient_name_snapshot || "-", align: "left" },
      { value: document.status || "-", align: "left" },
      { value: formatMoney(document.total || 0) },
    ]),
    "No hay documentos para el rango seleccionado."
  );

  const outstandingTable = buildSalesHtmlTable(
    [
      { label: "Documento", align: "left" },
      { label: "Paciente", align: "left" },
      { label: "Vence", align: "left" },
      { label: "Saldo" },
      { label: "Mora" },
    ],
    (report.outstanding_invoices || []).slice(0, 12).map((document) => [
      { value: document.document_number || "-", align: "left" },
      { value: document.patient_name || document.patient_name_snapshot || "-", align: "left" },
      { value: document.due_date || "-", align: "left" },
      { value: formatMoney(document.balance_due || 0) },
      { value: Number(document.days_overdue || 0).toString() },
    ]),
    "No hay cartera pendiente al corte."
  );

  const lowStockTable = buildSalesHtmlTable(
    [
      { label: "Item", align: "left" },
      { label: "Categoria", align: "left" },
      { label: "Stock" },
      { label: "Minimo" },
    ],
    (report.low_stock_items || []).slice(0, 12).map((item) => [
      { value: item.name || "-", align: "left" },
      { value: item.category || "-", align: "left" },
      { value: Number(item.stock_quantity || 0).toString() },
      { value: Number(item.min_stock || 0).toString() },
    ]),
    "No hay alertas de inventario."
  );

  elements.salesReportsContent.innerHTML = `
    <div class="sales-report-grid">${summaryCards}</div>
    <article class="sales-report-card">
      <h4>Documentos emitidos</h4>
      ${documentsTable}
    </article>
    <article class="sales-report-card">
      <h4>Cartera pendiente</h4>
      ${outstandingTable}
    </article>
    <article class="sales-report-card">
      <h4>Inventario en alerta</h4>
      ${lowStockTable}
    </article>
  `;
}

async function loadSalesDocumentDetail(documentId, { silent = false } = {}) {
  if (!documentId) {
    salesSelectedDocumentId = "";
    salesSelectedDocument = null;
    renderSalesDocumentDetail();
    return null;
  }
  const detail = await api.getBillingDocument(documentId);
  salesSelectedDocumentId = documentId;
  salesSelectedDocument = detail;
  renderSalesDocumentDetail();
  if (!silent) {
    showStatus(`Documento ${detail.document_number || ""} cargado.`, "info");
  }
  return detail;
}

async function loadSalesReport({ silent = false, force = false } = {}) {
  syncSalesReportStateFromForm();
  const requestKey = getSalesReportRequestKey();
  if (!force && salesReportState.loaded && salesReportState.requestedKey === requestKey) {
    renderSalesReportMiniSummary();
    renderSalesReports();
    return state.sales_report;
  }
  if (
    !force &&
    salesReportState.loading &&
    salesReportState.requestedKey === requestKey &&
    salesReportPromise
  ) {
    return salesReportPromise;
  }
  salesReportState.loading = true;
  salesReportState.requestedKey = requestKey;
  renderSalesReports();
  salesReportPromise = (async () => {
    try {
      const report = await api.getSalesReport({
        start_date: salesReportState.start_date,
        end_date: salesReportState.end_date,
      });
      state.sales_report = report;
      salesReportState.loaded = true;
      renderSalesReportMiniSummary();
      renderSalesReports();
      if (!silent) {
        showStatus("Reporte de ventas actualizado.", "success");
      }
      return report;
    } finally {
      salesReportState.loading = false;
      salesReportPromise = null;
      renderSalesReports();
    }
  })();
  return salesReportPromise;
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

function getBillingDocumentTypeValue() {
  return getSalesDocumentFilterType() || elements.billingDocumentTypeSelect?.value || "factura";
}

function formatBillingLineQuantity(value) {
  const quantity = Number(value || 0);
  if (!Number.isFinite(quantity)) {
    return "0";
  }
  if (Number.isInteger(quantity)) {
    return String(quantity);
  }
  return quantity.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getBillingDraftLineItems() {
  return billingDraft.lines.map((line, index) => {
    const item = state.catalog_items.find((catalogItem) => catalogItem.id === line.catalog_item_id) || {};
    const quantity = Number(line.quantity || 0);
    const unitPrice = Number(item.unit_price || 0);
    const lineTotal = unitPrice * quantity;
    return {
      index,
      quantity,
      quantityLabel: formatBillingLineQuantity(quantity),
      unitPrice,
      lineTotal,
      itemId: line.catalog_item_id,
      itemName: item.name || "Item",
      category: item.category || "Sin categoria",
    };
  });
}

function getBillingDraftSnapshot() {
  const form = elements.billingDocumentForm;
  const values = form ? serializeForm(form) : {};
  const documentType = getBillingDocumentTypeValue();
  const documentTypeLabel = documentType === "cotizacion" ? "Cotizacion" : "Factura";
  const patientId = String(values.patient_id || "").trim();
  const patient = state.patients.find((item) => String(item.id) === patientId) || null;
  const ownerName =
    patient?.owner_name ||
    state.owners.find((owner) => String(owner.id) === String(patient?.owner_id || ""))?.full_name ||
    "";
  const lines = getBillingDraftLineItems();
  const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
  const discount = Math.max(0, Number(values.discount || 0));
  const total = Math.max(0, subtotal - discount);
  const paymentMethod = documentType === "cotizacion" ? "Pendiente" : values.payment_method || "Pendiente";
  const cashAccount =
    documentType === "cotizacion"
      ? ""
      : values.cash_account || state.settings.billing_default_cash_account || "caja_menor";
  const initialPaymentAmount =
    documentType === "factura" && paymentMethod === "Pendiente"
      ? Math.min(Math.max(0, Number(values.initial_payment_amount || 0)), total)
      : 0;
  const balanceAfterCreation = paymentMethod === "Pendiente" ? Math.max(0, total - initialPaymentAmount) : 0;
  return {
    currentStep: billingWizardState.currentStep,
    currentStepMeta:
      BILLING_WIZARD_STEPS.find((item) => item.step === billingWizardState.currentStep) ||
      BILLING_WIZARD_STEPS[0],
    documentType,
    documentTypeLabel,
    patient,
    patientName: patient?.name || "",
    patientMeta: patient ? `${patient.species || "Paciente"}${patient.breed ? ` · ${patient.breed}` : ""}` : "",
    ownerName,
    issueDate: String(values.issue_date || "").trim(),
    dueDate: String(values.due_date || "").trim(),
    recipientEmail: String(values.recipient_email || "").trim(),
    notes: String(values.notes || "").trim(),
    paymentMethod,
    paymentMethodLabel: humanStatus(paymentMethod),
    cashAccount,
    cashAccountLabel: cashAccount ? cashAccountLabel(cashAccount) : "Sin caja",
    initialPaymentAmount,
    initialPaymentDate:
      documentType === "factura" && paymentMethod === "Pendiente"
        ? String(values.initial_payment_date || values.issue_date || "").trim()
        : "",
    initialPaymentMethod:
      documentType === "factura" && paymentMethod === "Pendiente"
        ? String(values.initial_payment_method || paymentMethod || "Efectivo").trim()
        : "",
    initialPaymentMethodLabel:
      documentType === "factura" && paymentMethod === "Pendiente"
        ? humanStatus(String(values.initial_payment_method || paymentMethod || "Efectivo").trim())
        : "",
    initialPaymentCashAccount:
      documentType === "factura" && paymentMethod === "Pendiente"
        ? String(
            values.initial_payment_cash_account ||
              cashAccount ||
              state.settings.billing_default_cash_account ||
              "caja_menor"
          ).trim()
        : "",
    lines,
    linesCount: lines.length,
    subtotal,
    discount,
    total,
    balanceAfterCreation,
  };
}

function renderBillingWizardSummary() {
  if (!elements.billingWizardSummary) {
    return;
  }
  const snapshot = getBillingDraftSnapshot();
  const itemPreview = snapshot.lines.length
    ? snapshot.lines
        .slice(0, 4)
        .map(
          (line) => `
            <div class="sales-billing-summary__item">
              <div>
                <strong>${escapeHtml(line.itemName)}</strong>
                <span>${escapeHtml(line.category)}</span>
              </div>
              <span>${escapeHtml(line.quantityLabel)} u</span>
            </div>
          `
        )
        .join("")
    : `<div class="sales-billing-summary__empty">Aun no has agregado items a este documento.</div>`;
  const paymentCopy =
    snapshot.documentType === "cotizacion"
      ? "La cotizacion no genera abonos ni movimientos de caja."
      : snapshot.paymentMethod === "Pendiente"
      ? `Pendiente por ${escapeHtml(formatMoney(snapshot.balanceAfterCreation))}${
          snapshot.initialPaymentAmount
            ? ` despues de un abono inicial de ${escapeHtml(formatMoney(snapshot.initialPaymentAmount))}.`
            : "."
        }`
      : `Pago completo al emitir por ${escapeHtml(formatMoney(snapshot.total))}.`;

  elements.billingWizardSummary.innerHTML = `
    <div class="sales-billing-summary__card sales-billing-summary__card--hero">
      <span class="sales-billing-summary__eyebrow">Paso ${snapshot.currentStep} de ${BILLING_WIZARD_STEPS.length}</span>
      <h4>${escapeHtml(snapshot.documentTypeLabel)} en proceso</h4>
      <p>${escapeHtml(snapshot.currentStepMeta.label)}</p>
    </div>

    <div class="sales-billing-summary__card">
      <div class="sales-billing-summary__row">
        <span>Paciente</span>
        <strong>${escapeHtml(snapshot.patientName || "Sin seleccionar")}</strong>
      </div>
      <div class="sales-billing-summary__row">
        <span>Propietario</span>
        <strong>${escapeHtml(snapshot.ownerName || "Sin propietario")}</strong>
      </div>
      <div class="sales-billing-summary__row">
        <span>Emision</span>
        <strong>${escapeHtml(snapshot.issueDate || "Pendiente")}</strong>
      </div>
      <div class="sales-billing-summary__row">
        <span>Vencimiento</span>
        <strong>${escapeHtml(snapshot.dueDate || "Sin fecha")}</strong>
      </div>
    </div>

    <div class="sales-billing-summary__card">
      <div class="sales-billing-summary__section-head">
        <h5>Items</h5>
        <span>${escapeHtml(String(snapshot.linesCount))}</span>
      </div>
      <div class="sales-billing-summary__items">${itemPreview}</div>
    </div>

    <div class="sales-billing-summary__card">
      <div class="sales-billing-summary__row">
        <span>Subtotal</span>
        <strong>${escapeHtml(formatMoney(snapshot.subtotal))}</strong>
      </div>
      <div class="sales-billing-summary__row">
        <span>Descuento</span>
        <strong>${escapeHtml(formatMoney(snapshot.discount))}</strong>
      </div>
      <div class="sales-billing-summary__row sales-billing-summary__row--total">
        <span>Total</span>
        <strong>${escapeHtml(formatMoney(snapshot.total))}</strong>
      </div>
    </div>

    <div class="sales-billing-summary__card">
      <div class="sales-billing-summary__section-head">
        <h5>Pago</h5>
        <span>${escapeHtml(snapshot.paymentMethodLabel)}</span>
      </div>
      <p class="sales-billing-summary__copy">${paymentCopy}</p>
    </div>
  `;
}

function renderBillingWizardReview() {
  if (!elements.billingWizardReview) {
    return;
  }
  const snapshot = getBillingDraftSnapshot();
  const linesHtml = snapshot.lines.length
    ? snapshot.lines
        .map(
          (line) => `
            <div class="sales-billing-review__line">
              <div>
                <strong>${escapeHtml(line.itemName)}</strong>
                <span>${escapeHtml(line.category)}</span>
              </div>
              <div class="sales-billing-review__line-meta">
                <span>${escapeHtml(line.quantityLabel)} u</span>
                <strong>${escapeHtml(formatMoney(line.lineTotal))}</strong>
              </div>
            </div>
          `
        )
        .join("")
    : `<div class="sales-billing-summary__empty">Agrega items para completar el resumen.</div>`;
  const paymentSummary =
    snapshot.documentType === "cotizacion"
      ? "Cotizacion sin cobro ni abonos."
      : snapshot.paymentMethod === "Pendiente"
      ? `Factura pendiente. Saldo inicial: ${formatMoney(snapshot.balanceAfterCreation)}`
      : `Factura pagada al emitir mediante ${snapshot.paymentMethodLabel}.`;

  elements.billingWizardReview.innerHTML = `
    <div class="sales-billing-review__grid">
      <article class="sales-billing-review__card">
        <h5>Datos del documento</h5>
        <div class="sales-billing-review__kv">
          <div><span>Tipo</span><strong>${escapeHtml(snapshot.documentTypeLabel)}</strong></div>
          <div><span>Paciente</span><strong>${escapeHtml(snapshot.patientName || "Sin seleccionar")}</strong></div>
          <div><span>Propietario</span><strong>${escapeHtml(snapshot.ownerName || "Sin propietario")}</strong></div>
          <div><span>Emision</span><strong>${escapeHtml(snapshot.issueDate || "Pendiente")}</strong></div>
          <div><span>Vencimiento</span><strong>${escapeHtml(snapshot.dueDate || "Sin fecha")}</strong></div>
          <div><span>Correo</span><strong>${escapeHtml(snapshot.recipientEmail || "Sin correo")}</strong></div>
        </div>
      </article>

      <article class="sales-billing-review__card">
        <h5>Pago</h5>
        <div class="sales-billing-review__kv">
          <div><span>Metodo</span><strong>${escapeHtml(snapshot.paymentMethodLabel)}</strong></div>
          <div><span>Caja</span><strong>${escapeHtml(snapshot.cashAccountLabel)}</strong></div>
          <div><span>Estado esperado</span><strong>${escapeHtml(snapshot.paymentMethod === "Pendiente" ? "Pendiente" : "Pagado")}</strong></div>
          <div><span>Detalle</span><strong>${escapeHtml(paymentSummary)}</strong></div>
        </div>
      </article>
    </div>

    <article class="sales-billing-review__card">
      <h5>Items incluidos</h5>
      <div class="sales-billing-review__lines">${linesHtml}</div>
    </article>

    <article class="sales-billing-review__card">
      <h5>Totales</h5>
      <div class="sales-billing-review__kv sales-billing-review__kv--totals">
        <div><span>Subtotal</span><strong>${escapeHtml(formatMoney(snapshot.subtotal))}</strong></div>
        <div><span>Descuento</span><strong>${escapeHtml(formatMoney(snapshot.discount))}</strong></div>
        <div><span>Total</span><strong>${escapeHtml(formatMoney(snapshot.total))}</strong></div>
        <div><span>Saldo inicial</span><strong>${escapeHtml(formatMoney(snapshot.balanceAfterCreation))}</strong></div>
      </div>
      <p class="sales-billing-review__notes">${escapeHtml(snapshot.notes || "Sin notas adicionales.")}</p>
    </article>
  `;
}

function validateBillingWizardStep(step) {
  const form = elements.billingDocumentForm;
  const snapshot = getBillingDraftSnapshot();
  if (!form) {
    return true;
  }
  if (step === 1) {
    if (!elements.billingPatientSelect?.value) {
      elements.billingPatientSelect?.focus();
      throw new Error("Selecciona un paciente antes de continuar.");
    }
    if (!form.elements.issue_date?.value) {
      form.elements.issue_date?.focus();
      throw new Error("Define la fecha de emision de la factura.");
    }
    const recipientEmail = form.elements.recipient_email;
    if (recipientEmail?.value && typeof recipientEmail.checkValidity === "function" && !recipientEmail.checkValidity()) {
      recipientEmail.reportValidity?.();
      throw new Error("Revisa el correo del receptor antes de continuar.");
    }
  }
  if (step === 2 && !billingDraft.lines.length) {
    elements.billingLineItemSearch?.focus();
    throw new Error("Agrega al menos un item al documento antes de continuar.");
  }
  if (step === 3 && snapshot.documentType === "factura") {
    if (!elements.billingPaymentMethodSelect?.value) {
      elements.billingPaymentMethodSelect?.focus();
      throw new Error("Selecciona el metodo de pago de la factura.");
    }
    const initialPaymentAmount = Number(form.elements.initial_payment_amount?.value || 0);
    if (snapshot.paymentMethod === "Pendiente" && initialPaymentAmount > snapshot.total) {
      form.elements.initial_payment_amount?.focus();
      throw new Error("El abono inicial no puede superar el total del documento.");
    }
  }
  return true;
}

function setBillingWizardStep(targetStep, { skipValidation = false, silent = false } = {}) {
  const normalizedStep = Math.min(
    BILLING_WIZARD_STEPS.length,
    Math.max(1, Number(targetStep || billingWizardState.currentStep))
  );
  if (!skipValidation && normalizedStep > billingWizardState.currentStep) {
    try {
      for (let step = billingWizardState.currentStep; step < normalizedStep; step += 1) {
        validateBillingWizardStep(step);
      }
    } catch (error) {
      if (!silent) {
        showStatus(error.message || "Completa este paso antes de continuar.", "error");
      }
      renderBillingWizard();
      return false;
    }
  }
  billingWizardState.currentStep = normalizedStep;
  renderBillingWizard();
  return true;
}

function renderBillingPaymentFormAvailability() {
  const pendingDocuments = getPendingBillingDocuments();
  const hasPendingDocuments = pendingDocuments.length > 0;
  const activeSalesView = getActiveSalesSubsectionValue();
  const documentType = getBillingDocumentTypeValue();
  const paymentMethod = elements.billingPaymentMethodSelect?.value || "Pendiente";
  const selectedPaymentDocumentId = String(elements.billingPaymentDocumentSelect?.value || "").trim();
  const shouldShowByWizard =
    activeSalesView === "factura" &&
    documentType === "factura" &&
    billingWizardState.currentStep === 3 &&
    paymentMethod === "Pendiente";
  const shouldShowPanel =
    activeSalesView === "factura" &&
    (Boolean(selectedPaymentDocumentId) || (shouldShowByWizard && hasPendingDocuments));

  elements.salesPaymentFormPanel?.classList.toggle("is-hidden", !shouldShowPanel);
  elements.billingPaymentForm?.classList.toggle("is-hidden", !shouldShowPanel || !hasPendingDocuments);
  elements.billingPaymentEmptyState?.classList.toggle("is-hidden", !shouldShowPanel || hasPendingDocuments);

  if (!hasPendingDocuments && elements.billingPaymentDocumentSelect) {
    elements.billingPaymentDocumentSelect.value = "";
    if (elements.billingPaymentForm?.elements?.amount) {
      elements.billingPaymentForm.elements.amount.value = "";
    }
  }
  if (elements.billingPaymentPanelHint) {
    elements.billingPaymentPanelHint.textContent = !shouldShowPanel
      ? "Selecciona pago pendiente en el paso 3 para mostrar el panel de abonos."
      : hasPendingDocuments
      ? `${pendingDocuments.length} factura${pendingDocuments.length === 1 ? "" : "s"} pendiente${
          pendingDocuments.length === 1 ? "" : "s"
        } disponible${pendingDocuments.length === 1 ? "" : "s"} para registrar abonos.`
      : "Los abonos solo se habilitan para facturas pendientes.";
  }
  if (getActiveSectionId() === "sales") {
    syncSectionContainers("sales");
  }
}

function renderBillingWizard() {
  const form = elements.billingDocumentForm;
  if (!form) {
    return;
  }
  const currentStep = billingWizardState.currentStep;
  form.querySelectorAll("[data-billing-stage]").forEach((stage) => {
    stage.classList.toggle("is-hidden", Number(stage.dataset.billingStage) !== currentStep);
  });
  form.querySelectorAll("[data-billing-step]").forEach((button) => {
    const step = Number(button.dataset.billingStep || 0);
    button.classList.toggle("is-active", step === currentStep);
    button.classList.toggle("is-complete", step < currentStep);
    button.setAttribute("aria-current", step === currentStep ? "step" : "false");
  });
  elements.billingStepPrevButton?.classList.toggle("is-hidden", currentStep === 1);
  elements.billingStepNextButton?.classList.toggle("is-hidden", currentStep === BILLING_WIZARD_STEPS.length);
  elements.billingDocumentSubmitButton?.classList.toggle("is-hidden", currentStep !== BILLING_WIZARD_STEPS.length);
  if (elements.billingStepNextButton) {
    elements.billingStepNextButton.textContent =
      currentStep === BILLING_WIZARD_STEPS.length - 1 ? "Ir al resumen" : "Siguiente";
  }
  if (elements.billingPaymentStepHint) {
    const snapshot = getBillingDraftSnapshot();
    elements.billingPaymentStepHint.textContent =
      snapshot.documentType === "cotizacion"
        ? "Las cotizaciones no generan cobro ni abonos. Este paso se mantiene solo como referencia comercial."
        : snapshot.paymentMethod === "Pendiente"
        ? "Puedes dejar la factura pendiente y, si ya recibiste dinero, registrar un abono inicial."
        : "La factura quedara pagada al emitirse y el ingreso se registrara en la caja seleccionada.";
  }
  renderBillingWizardSummary();
  renderBillingWizardReview();
  renderBillingPaymentFormAvailability();
}

function syncBillingDocumentFormState() {
  const defaultCashAccount = state.settings.billing_default_cash_account || "caja_menor";
  const documentType = getBillingDocumentTypeValue();
  const paymentMethod = elements.billingPaymentMethodSelect?.value || "Pendiente";

  [
    elements.billingCashAccountSelect,
    elements.billingPaymentForm?.elements?.cash_account,
    elements.cashMovementForm?.elements?.cash_account,
    elements.cashSessionOpenForm?.elements?.cash_account,
    elements.cashSessionCloseForm?.elements?.cash_account,
    elements.billingDocumentForm?.elements?.initial_payment_cash_account,
  ].forEach((field) => {
    if (field && !field.value) {
      field.value = defaultCashAccount;
    }
  });

  if (documentType === "cotizacion" && elements.billingPaymentMethodSelect) {
    elements.billingPaymentMethodSelect.value = "Pendiente";
  }

  if (elements.billingPaymentMethodSelect) {
    elements.billingPaymentMethodSelect.disabled = documentType === "cotizacion";
  }
  if (elements.billingCashAccountSelect) {
    elements.billingCashAccountSelect.disabled = documentType === "cotizacion";
  }

  const shouldShowInitialPayment = documentType === "factura" && paymentMethod === "Pendiente";
  elements.billingInitialPaymentGroup?.classList.toggle("is-hidden", !shouldShowInitialPayment);
  elements.billingInitialPaymentGroup
    ?.querySelectorAll("input, select")
    .forEach((field) => {
      field.disabled = documentType === "cotizacion" || !shouldShowInitialPayment;
    });
  renderBillingWizard();
}

function renderSales() {
  ensureSalesReportDefaults();
  syncSalesDocumentModeUI();
  renderBillingPaymentFormAvailability();
  const selectedDocument = state.billing_documents.find(
    (item) => String(item.id) === String(salesSelectedDocumentId)
  );
  const activeDocumentType = getSalesDocumentFilterType();
  if (!selectedDocument || (activeDocumentType && selectedDocument.document_type !== activeDocumentType)) {
    salesSelectedDocumentId = "";
    salesSelectedDocument = null;
  }
  const documentMode = getSalesDocumentModeMeta();
  const showDocumentDetailAction = getActiveSalesSubsectionValue() !== "factura";
  const filteredBillingDocuments = state.billing_documents.filter(
    (document) => !activeDocumentType || document.document_type === activeDocumentType
  );
  const summary = state.billing_summary || {};

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

  const catalogPanelMeta = getSalesCatalogPanelMeta();
  if (elements.salesCatalogPanelEyebrow) {
    elements.salesCatalogPanelEyebrow.textContent = catalogPanelMeta.eyebrow;
  }
  if (elements.salesCatalogPanelTitle) {
    elements.salesCatalogPanelTitle.textContent = catalogPanelMeta.title;
  }
  if (elements.catalogItemsList) {
    elements.catalogItemsList.innerHTML = catalogPanelMeta.content;
  }
  renderInventoryItemModal();
  renderProviderDirectoryModal();
  if (getActiveSalesSubsectionValue() === "inventario") {
    bindInventoryInlineForms();
    syncInventoryPanelVisibility();
  }

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
    filteredBillingDocuments,
    (document) => `
      <article class="list-card">
        <header>
          <div>
            <h4>${escapeHtml(document.document_number)} / ${escapeHtml(document.patient_name)}</h4>
            <p>${escapeHtml(document.document_type === "cotizacion" ? "Cotizacion" : "Factura")} / ${formatDateTime(document.issue_date)}</p>
          </div>
          <span class="${statusClass(document.status)}">${escapeHtml(humanStatus(document.status))}</span>
        </header>
        <p>${escapeHtml(document.owner_name)}</p>
        <p>Total: ${formatMoney(document.total || 0)} / Pagado: ${formatMoney(document.amount_paid || 0)}</p>
        <p>Saldo: ${formatMoney(document.balance_due || 0)} / Lineas: ${document.lines_count || 0}</p>
        <div class="item-actions">
          ${
            showDocumentDetailAction
              ? `<button data-view-billing-document="${escapeHtml(document.id)}" type="button">Ver detalle</button>`
              : ""
          }
          <button data-download-billing-document="${escapeHtml(document.id)}" type="button">PDF</button>
          ${
            document.document_type === "factura" && document.status === "Pendiente"
              ? `<button data-select-billing-document="${escapeHtml(document.id)}" type="button">Registrar abono</button>`
              : ""
          }
        </div>
      </article>
    `,
    documentMode.emptyMessage
  );

  renderCashSection();

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

  renderSalesDocumentDetail();
}

function getDashboardPendingBillingDocumentsCount() {
  const pendingDocuments = state.requests?.billing_documents;
  return Array.isArray(pendingDocuments) ? pendingDocuments.length : 0;
}

function getDashboardLowStockCount() {
  return (state.catalog_items || []).filter((item) => {
    if (!item || !item.track_inventory) {
      return false;
    }
    const stock = Number(item.stock_quantity || 0);
    const minStock = Number(item.min_stock || 0);
    return stock <= minStock;
  }).length;
}

function getDashboardQuoteCountText() {
  const count = (state.billing_documents || []).filter(
    (document) => document?.document_type === "cotizacion"
  ).length;
  return count ? `${count} cotizaciones` : "Presupuestos";
}

function getDashboardCashSummaryText() {
  const count = Array.isArray(state.cash_movements) ? state.cash_movements.length : 0;
  return count ? `${count} movimientos` : "Caja operativa";
}

function getDashboardLowStockText() {
  const count = getDashboardLowStockCount();
  return count ? `${count} alertas` : "Stock al dia";
}

function getDashboardUsersText() {
  const count = Array.isArray(state.users) ? state.users.length : 0;
  return count ? `${count} usuarios` : "Gestionar accesos";
}

function isDashboardShortcutAllowed(shortcut, allowed = getAllowedSections()) {
  const requirement = DASHBOARD_SHORTCUT_REQUIREMENTS[shortcut];
  return !requirement || allowed.has(requirement);
}

function getDashboardIconSrc(item) {
  const fileName = item?.image || "";
  return fileName ? `/images/${encodeURIComponent(fileName)}` : "";
}

function renderDashboardQuickActions() {
  if (!elements.dashboardQuickActions) {
    return;
  }
  const allowed = getAllowedSections();
  const items = DASHBOARD_QUICK_ACTIONS.filter((item) =>
    isDashboardShortcutAllowed(item.shortcut, allowed)
  );
  if (!items.length) {
    elements.dashboardQuickActions.innerHTML = emptyState(
      "No hay acciones rapidas disponibles para este perfil."
    );
    return;
  }
  elements.dashboardQuickActions.innerHTML = items
    .map(
      (item) => `
        <button
          class="dashboard-quick-action"
          type="button"
          data-dashboard-shortcut="${escapeHtml(item.shortcut)}"
        >
          <span class="dashboard-quick-action__icon">
            <img
              class="dashboard-quick-action__icon-image"
              src="${escapeHtml(getDashboardIconSrc(item))}"
              alt=""
              loading="lazy"
              decoding="async"
            />
          </span>
          <div class="dashboard-quick-action__content">
            <h4 class="dashboard-quick-action__title">${escapeHtml(item.title)}</h4>
            <p class="dashboard-quick-action__description">${escapeHtml(item.description)}</p>
          </div>
          <div></div>
          <div class="dashboard-quick-action__footer">
            <span class="dashboard-pill">${escapeHtml(item.badge)}</span>
            <span class="dashboard-quick-action__meta">${escapeHtml(item.meta())}</span>
          </div>
        </button>
      `
    )
    .join("");
}

function renderDashboard() {
  const dashboard = state.dashboard || {};
  renderDashboardHero();
  renderDashboardQuickActions();
  elements.metricOwners.textContent = dashboard.owners ?? 0;
  elements.metricPatients.textContent = dashboard.patients ?? 0;
  elements.metricRecords.textContent = dashboard.records_total ?? 0;
  elements.metricConsultations.textContent = dashboard.consultations_total ?? 0;
  elements.metricAppointments.textContent = dashboard.appointments ?? 0;
  elements.metricConsents.textContent = dashboard.consents ?? 0;
  elements.metricGrooming.textContent = dashboard.grooming_total ?? 0;
  elements.metricAvailability.textContent = dashboard.available_slots_next_14_days ?? 0;
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
          ${buildAppointmentStatusBadgeMarkup(appointment.status, { compact: true })}
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
      label: document.service_name || "Peluquería",
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
    const orderDetails = isConsultorioOrderDocument(consultation)
      ? getConsultorioOrderDisplayData(consultation)
      : null;
    const formulaDetails = isFormulaConsultationType(consultation.consultation_type)
      ? parseConsultorioFormulaDetails(consultation)
      : null;
    const procedureDetails = isProcedureConsultationType(consultation.consultation_type)
      ? parseConsultorioProcedureDetails(consultation)
      : null;
    const hospAmbDetails = isHospAmbConsultationType(consultation.consultation_type)
      ? parseConsultorioHospAmbDetails(consultation)
      : null;
    return {
      id: `consultation-${consultation.id}`,
      at: consultation.consultation_at,
      typeLabel: consultation.consultation_type || "Consulta",
      title:
        orderDetails?.preview || consultation.title || consultation.consultation_type || "Consulta clinica",
      tone: consultation.consent_required ? "pill pill--confirmed" : "pill pill--draft",
      attachments: parseConsultorioAttachments(consultation.attachments_summary || ""),
      lines: orderDetails
        ? [
            `Ordenes: ${truncate(orderDetails.preview, 180)}`,
            orderDetails.reason ? `Motivo: ${truncate(orderDetails.reason, 180)}` : "",
            orderDetails.notesPreview
              ? `Notas: ${truncate(orderDetails.notesPreview, 180)}`
              : "",
          ].filter(Boolean)
        : isFormulaConsultationType(consultation.consultation_type)
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
        : isProcedureConsultationType(consultation.consultation_type)
        ? [
            procedureDetails?.description
              ? `Descripci\u00f3n: ${truncate(procedureDetails.description, 180)}`
              : "",
            procedureDetails?.treatment
              ? `Tratamiento: ${truncate(procedureDetails.treatment, 180)}`
              : "",
            procedureDetails?.complications
              ? `Complicaciones: ${truncate(procedureDetails.complications, 180)}`
              : procedureDetails?.observations
              ? `Observaciones: ${truncate(procedureDetails.observations, 180)}`
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
    typeLabel: "Peluquería",
    title: document.service_name || document.document_type || "Servicio de peluquería",
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
  return [
    "consultations",
    "vacunacion",
    "formula",
    "desparasitacion",
    "hospamb",
    "cirugia",
    "orders",
    "laboratorio",
    "documents",
    "seguimiento",
    "remisiones",
    "grooming",
  ].includes(profileConfig?.value || "");
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
      orders: "Orden",
      laboratorio: "Examen de laboratorio",
      imagenes: "Imagen diagnostica",
      seguimiento: "Seguimiento",
      documents: "Documento",
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
      Documento: "Documento",
      Remision: "Remisi\u00f3n",
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

function isProcedureConsultationType(consultationType) {
  return String(consultationType || "").trim() === "Cirugia / procedimiento";
}

function isLaboratoryConsultationType(consultationType) {
  return String(consultationType || "").trim() === "Examen de laboratorio";
}

function isImagingConsultationType(consultationType) {
  return String(consultationType || "").trim() === "Imagen diagnostica";
}

function isFollowupConsultationType(consultationType) {
  return String(consultationType || "").trim() === "Seguimiento";
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

function getConsultorioScopedOrders() {
  return getConsultorioScopedConsultations(["Documento"]).filter((item) =>
    isConsultorioOrderDocument(item)
  );
}

function getConsultorioScopedDocuments() {
  return getConsultorioScopedConsultations(["Documento"]).filter(
    (item) => !isConsultorioOrderDocument(item)
  );
}

function getConsultorioScopedDocumentEntries() {
  return []
    .concat(
      getConsultorioScopedDocuments().map((document) => ({
        kind: "document",
        at: document.consultation_at,
        data: document,
      }))
    )
    .concat(
      getConsultorioScopedConsents().map((consent) => ({
        kind: "consent",
        at: consent.signed_at,
        data: consent,
      }))
    )
    .sort((left, right) => String(right.at || "").localeCompare(String(left.at || "")));
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

function normalizeGroomingServiceItem(item = {}) {
  if (!item || typeof item !== "object") {
    return {
      serviceType: "",
      motive: "",
      professional: "",
      details: "",
    };
  }
  return {
    serviceType: String(item.serviceType || item.type || item.service_type || "").trim(),
    motive: String(item.motive || item.reason || item.service || "").trim(),
    professional: String(item.professional || item.staff || item.stylist || "").trim(),
    details: String(item.details || item.notes || item.description || "").trim(),
  };
}

function hasGroomingServiceItemContent(item = {}) {
  const normalized = normalizeGroomingServiceItem(item);
  return Boolean(
    normalized.serviceType || normalized.motive || normalized.professional || normalized.details
  );
}

function parseGroomingServiceDetails(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => normalizeGroomingServiceItem(item))
      .filter((item) => hasGroomingServiceItemContent(item));
  } catch (error) {
    return [];
  }
}

function serializeGroomingServiceDetails(items = []) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => normalizeGroomingServiceItem(item))
    .filter((item) => hasGroomingServiceItemContent(item));
  return normalizedItems.length ? JSON.stringify(normalizedItems) : "";
}

function getGroomingStaffOptions(selected = "") {
  const values = new Set();
  (state.users || []).forEach((user) => {
    const name = String(user?.full_name || "").trim();
    if (name) {
      values.add(name);
    }
  });
  getProfessionalOptions().forEach((option) => {
    const label = String(option?.label || option?.id || "").trim();
    if (label) {
      values.add(label);
    }
  });
  const normalizedSelected = String(selected || "").trim();
  if (normalizedSelected) {
    values.add(normalizedSelected);
  }
  return Array.from(values).sort((left, right) => left.localeCompare(right, "es"));
}

function buildGroomingServicePrimaryLabel(item = {}) {
  const normalized = normalizeGroomingServiceItem(item);
  return normalized.motive || normalized.serviceType || "Servicio";
}

function buildGroomingServiceSummary(items = [], fallback = "") {
  const labels = (Array.isArray(items) ? items : [])
    .map((item) => buildGroomingServicePrimaryLabel(item))
    .filter(Boolean);
  const joined = labels.join(" / ");
  return joined || String(fallback || "").trim() || "Servicio";
}

function buildGroomingProfessionalSummary(items = [], fallback = "") {
  const labels = Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => normalizeGroomingServiceItem(item).professional)
        .filter(Boolean)
    )
  );
  const joined = labels.join(", ");
  return joined || String(fallback || "").trim() || "Sin responsable";
}

function getGroomingDocumentDetails(item = {}) {
  const parsedServices = parseGroomingServiceDetails(item?.service_details_json);
  const services = parsedServices.length
    ? parsedServices
    : [
        normalizeGroomingServiceItem({
          serviceType: item?.document_type || "",
          motive: item?.service_name || "",
          professional: item?.stylist_name || "",
          details: item?.recommendations || item?.products_used || "",
        }),
      ].filter((service) => hasGroomingServiceItemContent(service));
  const beforePhotos = parseConsultorioAttachments(item?.before_photos || "");
  const afterPhotos = parseConsultorioAttachments(item?.after_photos || "");
  return {
    services,
    beforePhotos,
    afterPhotos,
    summaryName: buildGroomingServiceSummary(services, item?.service_name),
    professionalSummary: buildGroomingProfessionalSummary(services, item?.stylist_name),
    observations:
      item?.notes ||
      item?.recommendations ||
      item?.products_used ||
      "Sin observaciones registradas.",
    rabiesStatus: GROOMING_RABIES_STATUS_LABELS[item?.rabies_status] || "Sin registro",
    nextVisitAt: item?.next_visit_at ? formatDateTime(item.next_visit_at) : "",
  };
}

function getGroomingDocumentById(groomingId) {
  return (state.grooming_documents || []).find((item) => item.id === groomingId) || null;
}

function getConsultorioProfileCount(option) {
  if (!option || !consultorioPatientId) {
    return 0;
  }
  if (option.value === "records") {
    return getConsultorioScopedRecords().length;
  }
  if (option.value === "grooming") {
    return getConsultorioScopedGrooming().length;
  }
  if (option.value === "orders") {
    return getConsultorioScopedOrders().length;
  }
  if (option.value === "documents") {
    return getConsultorioScopedDocumentEntries().length;
  }
  return getConsultorioScopedConsultations(option.consultationTypes).length;
}

function getConsultorioProfileViewIconSvg(value) {
  return (
    {
      records: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3h6l5 5v13H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"></path>
          <path d="M14 3v5h5"></path>
          <path d="M10 13h6"></path>
          <path d="M10 17h6"></path>
          <path d="M10 9h2"></path>
        </svg>
      `,
      consultations: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="11" r="7"></circle>
          <path d="M12 8v6"></path>
          <path d="M9 11h6"></path>
          <path d="M8 19l-2.4 2"></path>
          <path d="M16 19l2.4 2"></path>
        </svg>
      `,
      vacunacion: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="m14 4 6 6"></path>
          <path d="m17 7-8.5 8.5"></path>
          <path d="m12 2 3 3"></path>
          <path d="m4 14 6 6"></path>
          <path d="M2 22l4-4"></path>
          <path d="M7 17l-2-2"></path>
        </svg>
      `,
      formula: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.5 5.5 18.5 13.5a3.54 3.54 0 1 1-5 5l-8-8a3.54 3.54 0 0 1 5-5Z"></path>
          <path d="m8 8 8 8"></path>
        </svg>
      `,
      desparasitacion: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6c0-1.66 1.79-3 4-3s4 1.34 4 3-1.79 3-4 3-4-1.34-4-3Z"></path>
          <path d="M8 18c0-1.66 1.79-3 4-3s4 1.34 4 3-1.79 3-4 3-4-1.34-4-3Z"></path>
          <path d="M12 9v6"></path>
          <path d="M7 12h10"></path>
        </svg>
      `,
      hospamb: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 21V7a2 2 0 0 1 2-2h8v16"></path>
          <path d="M13 10h6a2 2 0 0 1 2 2v9"></path>
          <path d="M8 9h0"></path>
          <path d="M8 13h0"></path>
          <path d="M8 17h0"></path>
          <path d="M16 14h2"></path>
          <path d="M17 13v2"></path>
        </svg>
      `,
      cirugia: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 4V2"></path>
          <path d="M9 4V2"></path>
          <path d="M10 10 4.5 15.5a2.12 2.12 0 1 0 3 3L13 13"></path>
          <path d="m14 9 1-1"></path>
          <path d="M5 8h14"></path>
          <path d="M7 4h10a2 2 0 0 1 2 2v2H5V6a2 2 0 0 1 2-2Z"></path>
        </svg>
      `,
      orders: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
          <path d="M14 2v5h5"></path>
          <path d="M9 12h6"></path>
          <path d="M9 16h6"></path>
          <path d="M9 8h2"></path>
        </svg>
      `,
      laboratorio: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 2v7.31"></path>
          <path d="M14 9.3V2"></path>
          <path d="M8.5 2h7"></path>
          <path d="M14 9.3 19.74 19a2 2 0 0 1-1.72 3H5.98a2 2 0 0 1-1.72-3L10 9.3"></path>
          <path d="M6.85 15h10.3"></path>
        </svg>
      `,
      imagenes: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2"></rect>
          <path d="m3 15 4-4 4 4 3-3 4 4"></path>
          <circle cx="8.5" cy="9.5" r="1.2"></circle>
        </svg>
      `,
      seguimiento: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 21s-6.5-4.35-6.5-10A3.5 3.5 0 0 1 9 7.5c1.28 0 2.42.69 3 1.72A3.34 3.34 0 0 1 15 7.5a3.5 3.5 0 0 1 3.5 3.5c0 5.65-6.5 10-6.5 10Z"></path>
          <path d="M8 13h2l1.1-2 1.8 4 1.1-2H16"></path>
        </svg>
      `,
      documents: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
          <path d="M14 2v5h5"></path>
          <path d="M9 13h6"></path>
          <path d="M9 17h6"></path>
          <path d="M9 9h2"></path>
        </svg>
      `,
      remisiones: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 18V9h8.5L19 13v5"></path>
          <path d="M6 18H4a1 1 0 0 1-1-1v-4a4 4 0 0 1 4-4h1"></path>
          <path d="M14 9v4h5"></path>
          <path d="M9 8V4"></path>
          <path d="M7 6h4"></path>
          <path d="M16.5 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"></path>
          <path d="M7.5 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"></path>
        </svg>
      `,
      consents: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 11l2 2 4-4"></path>
          <rect x="4" y="3" width="16" height="18" rx="2"></rect>
        </svg>
      `,
      grooming: `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="6" cy="7" r="2"></circle>
          <circle cx="6" cy="17" r="2"></circle>
          <path d="M8 8l10 10"></path>
          <path d="M8 16 18 6"></path>
        </svg>
      `,
    }[value] ||
    `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="8"></circle>
      </svg>
    `
  );
}

function buildConsultorioProfileNavMarkup(options = {}) {
  const { diagnosticMode = false } = options;
  return CONSULTORIO_PROFILE_VIEWS.map(
    (option) => `
      <button
        class="consultorio-profile-nav__item${diagnosticMode ? " consultorio-profile-nav__item--diagnostic" : ""}${
          option.value === consultorioProfileView ? " is-active" : ""
        }"
        type="button"
        data-consultorio-profile-view="${escapeHtml(option.value)}"
      >
        <span class="consultorio-profile-nav__main">
          <span class="consultorio-profile-nav__icon" aria-hidden="true">
            ${getConsultorioProfileViewIconSvg(option.value)}
          </span>
          <span class="consultorio-profile-nav__label">${escapeHtml(option.label)}</span>
        </span>
        <strong>${getConsultorioProfileCount(option)}</strong>
      </button>
    `
  ).join("");
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

function parseConsultorioFollowupDetails(consultation) {
  const summary = parseConsultorioStructuredText(consultation?.summary || "", {
    "tipo de seguimiento": "type",
    motivo: "reason",
    "detalles del seguimiento": "details",
    "examen general": "examGeneral",
  });
  const indications = parseConsultorioStructuredText(consultation?.indications || "", {
    "proximo control": "nextControl",
  });
  const genericDetails = parseConsultorioConsultationDetails(consultation);
  let stored = null;
  const rawReference = String(consultation?.document_reference || "").trim();
  if (rawReference.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawReference);
      if (parsed?.kind === "followup") {
        stored = parsed;
      }
    } catch (error) {
      stored = null;
    }
  }
  return {
    followupDate: toInputDateTime(consultation?.consultation_at || new Date().toISOString()),
    type: String(stored?.followupType || "").trim() || summary.type || "",
    reason:
      String(stored?.reason || "").trim() ||
      summary.reason ||
      String(consultation?.title || "").trim() ||
      "No especificado",
    details:
      String(stored?.details || "").trim() ||
      summary.details ||
      genericDetails.objective ||
      genericDetails.subjective ||
      genericDetails.interpretation ||
      "",
    nextControl:
      normalizeDateFieldValue(String(stored?.nextControl || "").trim()) ||
      normalizeDateFieldValue(indications.nextControl || genericDetails.nextControl || ""),
    notifyOwner: Boolean(stored?.notifyOwner),
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

function parseConsultorioProcedureDetails(consultation) {
  const summary = parseConsultorioStructuredText(consultation?.summary || "", {
    "descripci\u00f3n quir\u00fargica": "description",
    "descripcion quirurgica": "description",
    "preanest\u00e9sico": "preanesthetic",
    preanestesico: "preanesthetic",
    "anest\u00e9sico": "anesthetic",
    anestesico: "anesthetic",
    "otros medicamentos": "otherMedications",
  });
  const indications = parseConsultorioStructuredText(consultation?.indications || "", {
    tratamiento: "treatment",
    observaciones: "observations",
    complicaciones: "complications",
  });
  const genericDetails = parseConsultorioConsultationDetails(consultation);
  let stored = null;
  const rawReference = String(consultation?.document_reference || "").trim();
  if (rawReference.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawReference);
      if (parsed && parsed.kind === "procedure") {
        stored = parsed;
      }
    } catch (error) {
      stored = null;
    }
  }
  return {
    procedureDate: normalizeDateFieldValue(consultation?.consultation_at),
    name: String(stored?.name || "").trim() || String(consultation?.title || "").trim(),
    description:
      String(stored?.description || "").trim() ||
      summary.description ||
      genericDetails.objective ||
      genericDetails.subjective ||
      "",
    preanesthetic:
      String(stored?.preanesthetic || "").trim() || summary.preanesthetic || "",
    anesthetic: String(stored?.anesthetic || "").trim() || summary.anesthetic || "",
    otherMedications:
      String(stored?.otherMedications || "").trim() || summary.otherMedications || "",
    treatment:
      String(stored?.treatment || "").trim() ||
      indications.treatment ||
      genericDetails.therapeuticPlan ||
      "",
    observations:
      String(stored?.observations || "").trim() ||
      indications.observations ||
      genericDetails.interpretation ||
      "",
    complications:
      String(stored?.complications || "").trim() ||
      indications.complications ||
      genericDetails.diagnosticPlan ||
      "",
  };
}

function getConsultorioOrderCatalogOptions(type) {
  const normalizedType = normalizeConsultorioOrderType(type);
  const options = Array.isArray(CONSULTORIO_ORDER_CATALOG[normalizedType])
    ? CONSULTORIO_ORDER_CATALOG[normalizedType]
    : [];
  return options
    .map((label) => ({ value: label, label }))
    .concat({ value: CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION, label: "Otra orden" });
}

function normalizeConsultorioOrderType(type) {
  const normalized = String(type || "").trim();
  if (
    normalized === "Cirugia / procedimiento" ||
    normalized === "Cirugia/procedimiento" ||
    normalized === "Cirug\u00eda/procedimiento"
  ) {
    return "Cirugia/procedimiento";
  }
  if (
    normalized === "Examen de laboratorio" ||
    normalized === "Prueba / Examen" ||
    normalized === "Prueba / examen"
  ) {
    return "Prueba/Examen";
  }
  return normalized;
}

function normalizeOrderCatalogLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function registerConsultorioOrderCatalogEntry(type, label) {
  const normalizedType = normalizeConsultorioOrderType(type);
  const normalizedLabel = normalizeOrderCatalogLabel(label);
  if (!normalizedType || !normalizedLabel) {
    return "";
  }
  if (!Array.isArray(CONSULTORIO_ORDER_CATALOG[normalizedType])) {
    CONSULTORIO_ORDER_CATALOG[normalizedType] = [];
  }
  const catalog = CONSULTORIO_ORDER_CATALOG[normalizedType];
  const existing = catalog.find(
    (item) => normalizeOrderCatalogLabel(item) === normalizedLabel
  );
  if (existing) {
    return existing;
  }
  catalog.push(label);
  return label;
}

function buildOrderCatalogLabel(category, name) {
  const cleanCategory = String(category || "").trim();
  const cleanName = String(name || "").trim();
  if (!cleanName) {
    return "";
  }
  if (!cleanCategory) {
    return cleanName;
  }
  return `${cleanCategory}${LAB_TEST_LABEL_SEPARATOR}${cleanName}`;
}

function parseOrderCatalogLabel(label) {
  const text = String(label || "").trim();
  if (!text) {
    return { category: "", name: "" };
  }
  const matchingCategory = LAB_TEST_CATEGORY_OPTIONS.slice()
    .sort((left, right) => right.length - left.length)
    .find((category) => text.startsWith(`${category}${LAB_TEST_LABEL_SEPARATOR}`));
  if (matchingCategory) {
    return {
      category: matchingCategory,
      name: text.slice(`${matchingCategory}${LAB_TEST_LABEL_SEPARATOR}`.length).trim(),
    };
  }
  const separatorIndex = text.lastIndexOf(LAB_TEST_LABEL_SEPARATOR);
  if (separatorIndex > 0) {
    const category = text.slice(0, separatorIndex).trim();
    const name = text.slice(separatorIndex + LAB_TEST_LABEL_SEPARATOR.length).trim();
    if (name) {
      return { category, name };
    }
  }
  return { category: "", name: text };
}

function syncLabTestCategoryCustomField() {
  const showCustom =
    elements.labTestCategorySelect?.value === LAB_TEST_CATEGORY_CUSTOM_OPTION;
  elements.labTestCategoryCustomInput?.classList.toggle("is-hidden", !showCustom);
  if (!showCustom && elements.labTestCategoryCustomInput) {
    elements.labTestCategoryCustomInput.value = "";
  }
}

function setLabTestCategoryValue(value) {
  const normalized = String(value || "").trim();
  if (!elements.labTestCategorySelect) {
    return;
  }
  const matchesPredefined = Array.from(elements.labTestCategorySelect.options || []).some(
    (option) =>
      option.value &&
      option.value !== LAB_TEST_CATEGORY_CUSTOM_OPTION &&
      option.value === normalized
  );
  if (!normalized) {
    elements.labTestCategorySelect.value = "";
    if (elements.labTestCategoryCustomInput) {
      elements.labTestCategoryCustomInput.value = "";
    }
    syncLabTestCategoryCustomField();
    return;
  }
  if (matchesPredefined) {
    elements.labTestCategorySelect.value = normalized;
    if (elements.labTestCategoryCustomInput) {
      elements.labTestCategoryCustomInput.value = "";
    }
    syncLabTestCategoryCustomField();
    return;
  }
  elements.labTestCategorySelect.value = LAB_TEST_CATEGORY_CUSTOM_OPTION;
  if (elements.labTestCategoryCustomInput) {
    elements.labTestCategoryCustomInput.value = normalized;
  }
  syncLabTestCategoryCustomField();
}

function getLabTestCategoryValue() {
  const selected = String(elements.labTestCategorySelect?.value || "").trim();
  if (selected === LAB_TEST_CATEGORY_CUSTOM_OPTION) {
    return String(elements.labTestCategoryCustomInput?.value || "").trim();
  }
  return selected;
}

function isConsultorioOrderSearchableType(type) {
  return CONSULTORIO_ORDER_SEARCHABLE_TYPES.includes(normalizeConsultorioOrderType(type));
}

function isConsultorioHospitalizationOrderType(type) {
  return normalizeConsultorioOrderType(type) === "Hospitalizacion";
}

function isConsultorioOrderCustomRegistrableType(type) {
  return ["Cirugia/procedimiento", "Prueba/Examen"].includes(
    normalizeConsultorioOrderType(type)
  );
}

function getConsultorioOrderPriorityOptions(type) {
  return isConsultorioHospitalizationOrderType(type)
    ? CONSULTORIO_HOSPITALIZATION_PRIORITY_OPTIONS
    : CONSULTORIO_ORDER_STANDARD_PRIORITY_OPTIONS.map((value) => ({
        value,
        description: "",
        tone: "neutral",
      }));
}

function getConsultorioOrderTypeLabel(type) {
  return (
    {
      "Cirugia/procedimiento": "Cirug\u00eda/procedimiento",
      "Prueba/Examen": "Prueba/Examen",
      "Imagen diagnostica": "Imagen diagn\u00f3stica",
      Remision: "Remisi\u00f3n",
      Hospitalizacion: "Hospitalizaci\u00f3n",
    }[normalizeConsultorioOrderType(type)] || normalizeConsultorioOrderType(type)
  );
}

function getConsultorioOrderItemDisplayName(item = {}) {
  const orderType = normalizeConsultorioOrderType(item.type);
  const selectedItem = String(item.item || item.name || "").trim();
  const customItem = String(item.itemCustom || "").trim();
  if (selectedItem === CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION) {
    return customItem || (isConsultorioHospitalizationOrderType(orderType)
      ? getConsultorioOrderTypeLabel(orderType)
      : "");
  }
  return (
    customItem ||
    selectedItem ||
    (isConsultorioHospitalizationOrderType(orderType) ? getConsultorioOrderTypeLabel(orderType) : "")
  );
}

function createConsultorioOrderItem(item = {}) {
  const type = normalizeConsultorioOrderType(item.type);
  const catalogValues = getConsultorioOrderCatalogOptions(type).map((option) => option.value);
  let selectedItem = String(item.item || item.name || "").trim();
  let customItem = String(item.itemCustom || "").trim();
  const normalizedPriority = String(item.priority || "").trim();
  const hospitalizationPriorityValues = CONSULTORIO_HOSPITALIZATION_PRIORITY_OPTIONS.map(
    (option) => option.value
  );
  if (
    selectedItem &&
    selectedItem !== CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION &&
    !catalogValues.includes(selectedItem)
  ) {
    customItem = customItem || selectedItem;
    selectedItem = CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION;
  }
  if (!selectedItem && customItem) {
    selectedItem = CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION;
  }
  return {
    type,
    item: selectedItem,
    itemCustom: customItem,
    quantity: String(item.quantity || "1").trim() || "1",
    priority:
      isConsultorioHospitalizationOrderType(type)
        ? hospitalizationPriorityValues.includes(normalizedPriority)
          ? normalizedPriority
          : "Urgencia"
        : normalizedPriority,
    notes: String(item.notes || "").trim(),
  };
}

function hasConsultorioOrderItemContent(item = {}) {
  const normalized = createConsultorioOrderItem(item);
  return Boolean(
    normalized.type ||
      getConsultorioOrderItemDisplayName(normalized) ||
      normalized.notes ||
      normalized.priority ||
      (normalized.quantity && normalized.quantity !== "1")
  );
}

function buildConsultorioOrderItemLabel(item = {}) {
  const normalized = createConsultorioOrderItem(item);
  const type = getConsultorioOrderTypeLabel(normalized.type);
  const name = getConsultorioOrderItemDisplayName(normalized);
  const quantity = String(normalized.quantity || "").trim();
  const priority = String(normalized.priority || "").trim();
  const parts = [];
  if (type && name && type !== name) {
    parts.push(`${type}: ${name}`);
  } else if (name) {
    parts.push(name);
  } else if (type) {
    parts.push(type);
  }
  if (quantity) {
    parts.push(`x${quantity}`);
  }
  if (priority) {
    parts.push(`(${priority})`);
  }
  return parts.join(" ").trim();
}

function buildConsultorioOrderItemsPreview(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => buildConsultorioOrderItemLabel(item))
    .filter(Boolean)
    .join(" | ");
}

function buildConsultorioOrderNotesPreview(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => String(item?.notes || "").trim())
    .filter(Boolean)
    .join(" | ");
}

function buildConsultorioDocumentHtmlFromText(value) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((block) => String(block || "").trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function sanitizeConsultorioDocumentHtml(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue || typeof DOMParser === "undefined") {
    return "";
  }
  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<div>${rawValue}</div>`, "text/html");
  const root = parsed.body.firstElementChild || parsed.body;
  const allowedTags = new Set([
    "P",
    "BR",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "S",
    "STRIKE",
    "SUB",
    "SUP",
    "UL",
    "OL",
    "LI",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "DIV",
    "ADDRESS",
    "BLOCKQUOTE",
    "PRE",
    "MARK",
    "IMG",
    "TABLE",
    "THEAD",
    "TBODY",
    "TR",
    "TD",
    "TH",
    "HR",
    "FONT",
    "A",
  ]);
  const sanitizeNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return parsed.createTextNode(node.textContent || "");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return parsed.createDocumentFragment();
    }
    const tagName = String(node.tagName || "").toUpperCase();
    if (!allowedTags.has(tagName)) {
      const fragment = parsed.createDocumentFragment();
      Array.from(node.childNodes).forEach((child) => {
        fragment.appendChild(sanitizeNode(child));
      });
      return fragment;
    }
    const cleanNode = parsed.createElement(tagName.toLowerCase());
    if (tagName === "A") {
      const href = String(node.getAttribute("href") || "").trim();
      if (/^(https?:|mailto:|tel:)/i.test(href)) {
        cleanNode.setAttribute("href", href);
        cleanNode.setAttribute("target", "_blank");
        cleanNode.setAttribute("rel", "noreferrer");
      }
    } else if (tagName === "IMG") {
      const src = String(node.getAttribute("src") || "").trim();
      const alt = String(node.getAttribute("alt") || "").trim();
      if (/^(https?:|data:image\/)/i.test(src)) {
        cleanNode.setAttribute("src", src);
        if (alt) {
          cleanNode.setAttribute("alt", alt);
        }
      }
    } else if (tagName === "FONT") {
      const size = String(node.getAttribute("size") || "").trim();
      const face = String(node.getAttribute("face") || "").trim();
      const color = String(node.getAttribute("color") || "").trim();
      if (/^[1-7]$/.test(size)) {
        cleanNode.setAttribute("size", size);
      }
      if (face) {
        cleanNode.setAttribute("face", face);
      }
      if (/^#?[0-9a-f]{3,8}$/i.test(color) || /^[a-z]+$/i.test(color)) {
        cleanNode.setAttribute("color", color.startsWith("#") ? color : color.toLowerCase());
      }
    } else if (tagName === "TD" || tagName === "TH") {
      const colspan = String(node.getAttribute("colspan") || "").trim();
      const rowspan = String(node.getAttribute("rowspan") || "").trim();
      if (/^\d+$/.test(colspan) && Number(colspan) > 1) {
        cleanNode.setAttribute("colspan", colspan);
      }
      if (/^\d+$/.test(rowspan) && Number(rowspan) > 1) {
        cleanNode.setAttribute("rowspan", rowspan);
      }
    }
    Array.from(node.childNodes).forEach((child) => {
      cleanNode.appendChild(sanitizeNode(child));
    });
    return cleanNode;
  };
  const wrapper = parsed.createElement("div");
  Array.from(root.childNodes).forEach((child) => {
    wrapper.appendChild(sanitizeNode(child));
  });
  return wrapper.innerHTML.trim();
}

function consultorioDocumentHtmlToText(value) {
  if (typeof document === "undefined") {
    return String(value || "").trim();
  }
  const container = document.createElement("div");
  container.innerHTML = sanitizeConsultorioDocumentHtml(value);
  return String(container.textContent || "").replace(/\s+/g, " ").trim();
}

function parseConsultorioDocumentDetails(consultation) {
  const indications = parseConsultorioStructuredText(consultation?.indications || "", {
    "tipo de documento": "format",
    formato: "format",
    plantilla: "templateLabel",
    "requiere firma": "requiresSignature",
  });
  let stored = null;
  const rawReference = String(consultation?.document_reference || "").trim();
  if (rawReference.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawReference);
      if (parsed?.kind === "document") {
        stored = parsed;
      }
    } catch (error) {
      stored = null;
    }
  }
  const fallbackText = String(consultation?.summary || "").trim();
  const contentHtml = sanitizeConsultorioDocumentHtml(
    stored?.contentHtml || buildConsultorioDocumentHtmlFromText(stored?.contentText || fallbackText)
  );
  const contentText =
    String(stored?.contentText || "").trim() ||
    consultorioDocumentHtmlToText(contentHtml) ||
    fallbackText;
  const requiresSignature =
    typeof stored?.requiresSignature === "boolean"
      ? stored.requiresSignature
      : /^si/i.test(String(indications.requiresSignature || "").trim());
  const storedTemplate =
    stored?.template && typeof stored.template === "object" ? stored.template : null;
  const storedSignatureConfig =
    stored?.signatureConfig && typeof stored.signatureConfig === "object"
      ? stored.signatureConfig
      : null;
  return {
    kind: stored?.kind || "",
    format: String(stored?.format || "").trim() || String(indications.format || "").trim(),
    name: String(stored?.name || consultation?.title || "Documento").trim(),
    requiresSignature,
    signatureLabel: requiresSignature ? "Si requiere" : "No requiere",
    contentHtml,
    contentText,
    summary: truncate(contentText || "Sin contenido registrado.", 220),
    notifyOwner: Boolean(stored?.notifyOwner),
    templateId: String(storedTemplate?.id || stored?.templateId || "").trim(),
    templateLabel:
      String(storedTemplate?.label || stored?.templateName || indications.templateLabel || "").trim(),
    templateDescription: String(storedTemplate?.description || "").trim(),
    templateAutofillFields: Array.isArray(storedTemplate?.autofillFields)
      ? storedTemplate.autofillFields
      : [],
    templateRequiredFields: Array.isArray(storedTemplate?.requiredFields)
      ? storedTemplate.requiredFields
      : [],
    templateRecommendedSections: Array.isArray(storedTemplate?.recommendedSections)
      ? storedTemplate.recommendedSections
      : [],
    signatureConfig: {
      enabled: requiresSignature,
      owner:
        typeof storedSignatureConfig?.owner === "boolean"
          ? storedSignatureConfig.owner
          : requiresSignature,
      professional:
        typeof storedSignatureConfig?.professional === "boolean"
          ? storedSignatureConfig.professional
          : requiresSignature,
    },
  };
}

function isConsultorioOrderDocument(consultation) {
  const rawReference = String(consultation?.document_reference || "").trim();
  if (rawReference.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawReference);
      if (parsed?.kind === "order") {
        return true;
      }
    } catch (error) {
      // Ignored: fallback to summary/type detection below.
    }
  }
  if (String(consultation?.consultation_type || "").trim() !== "Documento") {
    return false;
  }
  const summary = parseConsultorioStructuredText(consultation?.summary || "", {
    "motivo de la orden": "reason",
    motivo: "reason",
    ordenes: "itemsPreview",
  });
  const indications = parseConsultorioStructuredText(consultation?.indications || "", {
    solicitudes: "requestsPreview",
    notas: "notesPreview",
  });
  return Boolean(summary.reason || summary.itemsPreview || indications.requestsPreview || indications.notesPreview);
}

function getConsultorioOrderDisplayData(consultation) {
  const details = parseConsultorioOrderDetails(consultation);
  return {
    details,
    preview: buildConsultorioOrderItemsPreview(details.items) || consultation?.title || "Orden",
    reason: String(details.reason || "").trim(),
    notesPreview: buildConsultorioOrderNotesPreview(details.items),
  };
}

function buildConsultorioOrderItemsMarkup(items = []) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => hasConsultorioOrderItemContent(item))
    .map((item) => {
      const normalized = createConsultorioOrderItem(item);
      const name = getConsultorioOrderItemDisplayName(normalized) || "Orden";
      const metadata = [
        normalized.type ? `Tipo: ${normalized.type}` : "",
        normalized.quantity ? `Cantidad: ${normalized.quantity}` : "",
        normalized.priority ? `Prioridad: ${normalized.priority}` : "",
        normalized.notes ? `Notas: ${normalized.notes}` : "",
      ].filter(Boolean);
      return `
        <li>
          <strong>${escapeHtml(name)}</strong>
          ${
            metadata.length
              ? `<div>${escapeHtml(metadata.join(" | "))}</div>`
              : ""
          }
        </li>
      `;
    })
    .join("");
}

function parseConsultorioOrderDetails(consultation) {
  const summary = parseConsultorioStructuredText(consultation?.summary || "", {
    "motivo de la orden": "reason",
    motivo: "reason",
    ordenes: "itemsPreview",
  });
  const indications = parseConsultorioStructuredText(consultation?.indications || "", {
    solicitudes: "requestsPreview",
    notas: "notesPreview",
    observaciones: "notesPreview",
  });
  let stored = null;
  const rawReference = String(consultation?.document_reference || "").trim();
  if (rawReference.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawReference);
      if (parsed && parsed.kind === "order") {
        stored = parsed;
      }
    } catch (error) {
      stored = null;
    }
  }
  const inferredType = ["Examen de laboratorio", "Imagen diagnostica", "Remision"].includes(
    consultation?.consultation_type
  )
    ? consultation.consultation_type
    : "";
  const fallbackItems = consultation?.title
    ? [
        createConsultorioOrderItem({
          type: inferredType,
          item: consultation.title,
          notes: indications.notesPreview || "",
        }),
      ]
    : [createConsultorioOrderItem()];
  return {
    orderDate:
      normalizeDateFieldValue(stored?.orderDate || "") ||
      normalizeDateFieldValue(consultation?.consultation_at),
    reason: String(stored?.reason || "").trim() || summary.reason || "",
    items:
      Array.isArray(stored?.items) && stored.items.length
        ? stored.items.map((item) => createConsultorioOrderItem(item))
        : fallbackItems,
  };
}

function buildConsultorioOrderSummary(payload, items = []) {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map((item) => createConsultorioOrderItem(item))
    .filter((item) => hasConsultorioOrderItemContent(item));
  return buildConsultorioStructuredText([
    ["Motivo de la orden", payload.order_reason],
    ["Ordenes", buildConsultorioOrderItemsPreview(items)],
    ...normalizedItems.map((item, index) => [
      `Orden ${index + 1}`,
      buildConsultorioOrderItemLabel(item),
    ]),
  ]);
}

function buildConsultorioOrderIndications(_payload, items = []) {
  const notesPreview = items
    .map((item) => {
      const notes = String(item.notes || "").trim();
      if (!notes) {
        return "";
      }
      const label = buildConsultorioOrderItemLabel(item) || "Orden";
      return `${label}: ${notes}`;
    })
    .filter(Boolean)
    .join(" | ");
  const itemNoteEntries = (Array.isArray(items) ? items : [])
    .map((item, index) => {
      const notes = String(item?.notes || "").trim();
      if (!notes) {
        return null;
      }
      return [`Notas orden ${index + 1}`, notes];
    })
    .filter(Boolean);
  return buildConsultorioStructuredText([["Notas", notesPreview], ...itemNoteEntries]);
}

function buildConsultorioOrderActionMenuMarkup(consultation) {
  const orderId = escapeHtml(consultation.id);
  return `
    <div class="consultorio-order-actions" data-order-actions>
      <button
        class="ghost-button consultorio-order-actions__icon"
        type="button"
        data-edit-patient-consultation="${orderId}"
        aria-label="Editar orden"
        title="Editar orden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
      </button>
      <button
        class="ghost-button consultorio-order-actions__icon"
        type="button"
        data-order-actions-toggle="${orderId}"
        aria-label="Más opciones"
        aria-expanded="false"
        title="Más opciones"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8"></circle>
          <circle cx="12" cy="12" r="1.8"></circle>
          <circle cx="12" cy="19" r="1.8"></circle>
        </svg>
      </button>
      <div class="consultorio-order-actions__menu is-hidden" data-order-actions-menu="${orderId}">
        <button type="button" data-order-action="view" data-order-id="${orderId}">Ver</button>
        <button type="button" data-order-action="print" data-order-id="${orderId}">Impresión</button>
        <button type="button" data-order-action="email" data-order-id="${orderId}">Enviar por email</button>
        <button type="button" data-order-action="followup" data-order-id="${orderId}">Seguimientos</button>
        <button type="button" data-order-action="delete" data-order-id="${orderId}">Eliminar</button>
      </div>
    </div>
  `;
}

function buildConsultorioLaboratoryActionMenuMarkup(consultation) {
  const consultationId = escapeHtml(consultation.id);
  return `
    <div class="consultorio-order-actions" data-lab-actions>
      <button
        class="ghost-button consultorio-order-actions__icon"
        type="button"
        data-edit-patient-consultation="${consultationId}"
        aria-label="Editar examen de laboratorio"
        title="Editar examen de laboratorio"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"></path>
        </svg>
      </button>
      <button
        class="ghost-button consultorio-order-actions__icon"
        type="button"
        data-lab-actions-toggle="${consultationId}"
        aria-label="Mas opciones"
        aria-expanded="false"
        title="Mas opciones"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8"></circle>
          <circle cx="12" cy="12" r="1.8"></circle>
          <circle cx="12" cy="19" r="1.8"></circle>
        </svg>
      </button>
      <div class="consultorio-order-actions__menu is-hidden" data-lab-actions-menu="${consultationId}">
        <button type="button" data-lab-action="view" data-lab-id="${consultationId}">Ver</button>
        <button type="button" data-lab-action="delete" data-lab-id="${consultationId}">Eliminar</button>
      </div>
    </div>
  `;
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

function buildConsultorioFollowupSummary(payload, examGeneralSummary = "") {
  return buildConsultorioStructuredText([
    ["Tipo de seguimiento", payload.followup_type],
    ["Motivo", payload.followup_reason],
    ["Detalles del seguimiento", payload.followup_details],
    ["Examen general", examGeneralSummary],
  ]);
}

function buildConsultorioFollowupIndications(payload) {
  return buildConsultorioStructuredText([["Proximo control", payload.followup_next_control]]);
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

function buildConsultorioProcedureSummary(payload) {
  return buildConsultorioStructuredText([
    ["Descripci\u00f3n quir\u00fargica", payload.procedure_description],
    ["Preanest\u00e9sico", payload.procedure_preanesthetic],
    ["Anest\u00e9sico", payload.procedure_anesthetic],
    ["Otros medicamentos", payload.procedure_other_medications],
  ]);
}

function buildConsultorioProcedureIndications(payload) {
  return buildConsultorioStructuredText([
    ["Tratamiento", payload.procedure_treatment],
    ["Observaciones", payload.procedure_observations],
    ["Complicaciones", payload.procedure_complications],
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

function getConsultorioLaboratoryExamName(consultation) {
  const details = parseConsultorioConsultationDetails(consultation);
  const title = String(consultation?.title || "").trim();
  if (title && title !== "Examen de laboratorio") {
    return title;
  }
  return (
    details.objective ||
    details.examGeneral.exam_general_observations ||
    details.examGeneralSummary ||
    truncate(consultation?.summary || "Sin prueba registrada", 120)
  );
}

function parseConsultorioLaboratoryDetails(consultation) {
  const details = parseConsultorioConsultationDetails(consultation);
  let stored = null;
  const rawReference = String(consultation?.document_reference || "").trim();
  if (rawReference.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawReference);
      if (parsed?.kind === "laboratory") {
        stored = parsed;
      }
    } catch (error) {
      stored = null;
    }
  }
  const fallbackResults = parseConsultorioAttachments(consultation?.attachments_summary || "")
    .map((item) =>
      item?.kind === "image"
        ? {
            name: item.name || "Resultado",
            dataUrl: item.dataUrl || "",
            mimeType: item.mimeType || "image/jpeg",
          }
        : {
            name: item.value || item.name || "Resultado",
            dataUrl: "",
            mimeType: "text/plain",
          }
    )
    .map((item) => normalizeConsultorioLaboratoryResultFile(item))
    .filter(Boolean);
  const fallbackItem = createConsultorioLaboratoryItem({
    professional: String(consultation?.professional_name || "").trim(),
    item: getConsultorioLaboratoryExamName(consultation),
    quantity: "1",
    results: fallbackResults,
  });
  return {
    examDate:
      normalizeDateFieldValue(stored?.examDate || "") ||
      normalizeDateFieldValue(consultation?.consultation_at),
    diagnosis:
      String(stored?.diagnosis || "").trim() ||
      details.interpretation ||
      details.therapeuticPlan ||
      details.diagnosticPlan ||
      "",
    related: String(stored?.related || consultation?.referred_to || "").trim(),
    items:
      Array.isArray(stored?.items) && stored.items.length
        ? stored.items.map((item) => createConsultorioLaboratoryItem(item))
        : hasConsultorioLaboratoryItemContent(fallbackItem)
        ? [fallbackItem]
        : [createConsultorioLaboratoryItem()],
  };
}

function buildConsultorioLaboratorySummary(payload, items = []) {
  return buildConsultorioStructuredText([
    ["Diagnostico presuntivo", payload.laboratory_diagnosis],
    ["Pruebas de laboratorio", buildConsultorioLaboratoryItemsPreview(items)],
  ]);
}

function buildConsultorioLaboratoryIndications(_payload, items = []) {
  return buildConsultorioStructuredText([
    ["Resultados", buildConsultorioLaboratoryResultsPreview(items)],
  ]);
}

function buildConsultorioLaboratoryResultLinksMarkup(items = []) {
  const attachments = (Array.isArray(items) ? items : [])
    .map((item) => normalizeConsultorioLaboratoryResultFile(item))
    .filter(Boolean);
  if (!attachments.length) {
    return '<span class="consultorio-laboratory-entry__muted">Sin resultado adjunto.</span>';
  }
  return attachments
    .map((item) => {
      const label = escapeHtml(
        truncate(item.name || "Resultado", 68)
      );
      if (item.dataUrl) {
        return `<a class="consultorio-laboratory-entry__result-link" href="${escapeHtml(
          item.dataUrl
        )}" target="_blank" rel="noreferrer">${label}</a>`;
      }
      return `<span class="consultorio-laboratory-entry__result-text">${label}</span>`;
    })
    .join('<span class="consultorio-laboratory-entry__separator">, </span>');
}

function buildConsultorioLaboratoryItemsMarkup(items = [], fallbackProfessional = "") {
  return (Array.isArray(items) ? items : [])
    .map((item) => createConsultorioLaboratoryItem(item))
    .filter((item) => hasConsultorioLaboratoryItemContent(item))
    .map(
      (item) => `
        <div class="consultorio-laboratory-entry">
          <div class="consultorio-laboratory-entry__line">
            <strong>Profesional:</strong>
            <span>${escapeHtml(item.professional || fallbackProfessional || "Sin profesional")}</span>
          </div>
          <div class="consultorio-laboratory-entry__line">
            <strong>Prueba/Examen:</strong>
            <span>${escapeHtml(item.item || "Sin examen")}</span>
          </div>
          <div class="consultorio-laboratory-entry__line">
            <strong>Cantidad:</strong>
            <span>${escapeHtml(item.quantity || "1")}</span>
          </div>
          <div class="consultorio-laboratory-entry__line">
            <strong>Resultado:</strong>
            <span>${buildConsultorioLaboratoryResultLinksMarkup(item.results)}</span>
          </div>
        </div>
      `
    )
    .join("");
}

function getConsultorioLaboratoryDetails(consultation) {
  const details = parseConsultorioLaboratoryDetails(consultation);
  const fallbackProfessional = String(consultation?.professional_name || "").trim() || "Sin usuario";
  return {
    date: details.examDate || "Sin fecha",
    diagnosis: details.diagnosis || "-",
    related: details.related || "-",
    user: fallbackProfessional,
    itemsMarkup: buildConsultorioLaboratoryItemsMarkup(details.items, fallbackProfessional),
    items: details.items,
  };
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
  consultorioPatientProfileNotesVisible = false;
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
  consultorioPatientProfileNotesVisible = false;
  consultorioProfileView = consultorioProfileView || "records";
  setSectionSubsection("consultorio", "patients");
  setActiveSection(CONSULTORIO_PATIENT_PROFILE_SECTION_ID);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openConsultorioGroomingSection(patientId = "") {
  pendingGroomingPatientId = String(patientId || "").trim();
  setSectionSubsection("consultorio", "grooming");
  setActiveSection("consultorio");
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => elements.groomingPatientSelect?.focus());
  }
}

function closeConsultorioPatientProfile(options = {}) {
  const { preservePatient = false } = options;
  closePatientConsultationModal();
  consultorioPatientProfileOpen = false;
  consultorioPatientProfileNotesVisible = false;
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

function buildConsultorioDiagnosticImagingProfile({ patient, profileConfig }) {
  return `
    <div class="consultorio-diagnostic-profile">
      <div class="consultorio-diagnostic-profile__body">
        <aside class="consultorio-diagnostic-profile__sidebar">
          <div class="consultorio-profile-nav consultorio-profile-nav--diagnostic">
            ${buildConsultorioProfileNavMarkup({ diagnosticMode: true })}
          </div>
        </aside>
        <div class="consultorio-diagnostic-profile__content">
          ${buildConsultorioImagingWorkspace(patient, profileConfig)}
        </div>
      </div>
    </div>
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
                (consultation) => {
                  const details = parseConsultorioProcedureDetails(consultation);
                  const summaryLabel =
                    details.description ||
                    details.treatment ||
                    details.observations ||
                    details.complications ||
                    "Sin resumen";
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
                      <td>${escapeHtml(consultation.title || "Cirug\u00eda / procedimiento")}</td>
                      <td>${escapeHtml(truncate(summaryLabel, 120))}</td>
                      <td>${escapeHtml(consultation.professional_name || "Sin usuario")}</td>
                    </tr>
                  `;
                }
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

function buildConsultorioOrdersWorkspace(patient, profileConfig) {
  const orders = getConsultorioScopedOrders();
  const content = orders.length
    ? `
      <div class="table-wrapper consultorio-consultations-table-wrapper consultorio-orders-table-wrapper">
        <table class="data-table consultorio-consultations-table">
          <thead>
            <tr>
              <th>Opc.</th>
              <th>Fecha</th>
              <th>Orden</th>
              <th>Detalle</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            ${orders
              .map((consultation) => {
                const orderDisplay = getConsultorioOrderDisplayData(consultation);
                const orderPreview = orderDisplay.preview;
                const detailLabel =
                  orderDisplay.reason ||
                  orderDisplay.notesPreview ||
                  consultation.referred_to ||
                  consultation.summary ||
                  "Sin detalle";
                return `
                  <tr>
                    <td>
                      ${buildConsultorioOrderActionMenuMarkup(consultation)}
                    </td>
                    <td>${escapeHtml(formatDateTime(consultation.consultation_at))}</td>
                    <td>${escapeHtml(truncate(orderPreview, 120))}</td>
                    <td>${escapeHtml(truncate(detailLabel, 120))}</td>
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
      <div class="consultorio-module-empty consultorio-module-empty--orders">
        <span class="consultorio-module-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
            <path d="M14 2v5h5"></path>
            <path d="M9 12h6"></path>
            <path d="M9 16h6"></path>
            <path d="M9 8h2"></path>
          </svg>
        </span>
        <strong>No hay registros de orden</strong>
      </div>
    `;
  return `
    <article class="consultorio-profile-shell consultorio-orders-shell">
      <div class="consultorio-profile-table-toolbar">
        <div class="consultorio-profile-toolbar__group">
          <span class="consultorio-profile-toolbar__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
              <path d="M14 2v5h5"></path>
              <path d="M9 12h6"></path>
              <path d="M9 16h6"></path>
              <path d="M9 8h2"></path>
            </svg>
          </span>
          <div class="consultorio-profile-toolbar__title">
            <h4>\u00d3rdenes de <span class="consultorio-profile-toolbar__accent">${escapeHtml(
              patient?.name || "Paciente"
            )}</span></h4>
          </div>
        </div>
        <div class="form-actions">
          <button
            class="primary-button"
            type="button"
            data-open-patient-consultation-modal="true"
            data-consultation-profile-view="orders"
          >
            + Registrar orden
          </button>
        </div>
      </div>
      ${content}
    </article>
  `;
}

function buildConsultorioLaboratoryWorkspace(patient, profileConfig) {
  const entries = getConsultorioScopedConsultations(profileConfig?.consultationTypes || null);
  const content = entries.length
    ? `
      <div class="table-wrapper consultorio-consultations-table-wrapper consultorio-laboratory-table-wrapper">
        <table class="data-table consultorio-consultations-table consultorio-laboratory-table">
          <thead>
            <tr>
              <th>Opc.</th>
              <th>Fecha</th>
              <th>Diagnostico presuntivo</th>
              <th>Pruebas de laboratorio</th>
              <th>Relacionado</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            ${entries
              .map((consultation) => {
                const details = getConsultorioLaboratoryDetails(consultation);
                return `
                  <tr>
                    <td>${buildConsultorioLaboratoryActionMenuMarkup(consultation)}</td>
                    <td>${escapeHtml(details.date)}</td>
                    <td>${escapeHtml(truncate(details.diagnosis || "-", 120))}</td>
                    <td>${details.itemsMarkup}</td>
                    <td>${escapeHtml(truncate(details.related, 92))}</td>
                    <td>${escapeHtml(details.user)}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : `
      <div class="consultorio-module-empty consultorio-module-empty--laboratory">
        <span class="consultorio-module-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 2v7.31"></path>
            <path d="M14 9.3V2"></path>
            <path d="M8.5 2h7"></path>
            <path d="M14 9.3 19.74 19a2 2 0 0 1-1.72 3H5.98a2 2 0 0 1-1.72-3L10 9.3"></path>
            <path d="M6.85 15h10.3"></path>
          </svg>
        </span>
        <strong>No hay examenes de laboratorio registrados</strong>
      </div>
    `;
  return `
    <article class="consultorio-profile-shell consultorio-laboratory-shell">
      <div class="consultorio-profile-table-toolbar">
        <div class="consultorio-profile-toolbar__group">
          <span class="consultorio-profile-toolbar__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 2v7.31"></path>
              <path d="M14 9.3V2"></path>
              <path d="M8.5 2h7"></path>
              <path d="M14 9.3 19.74 19a2 2 0 0 1-1.72 3H5.98a2 2 0 0 1-1.72-3L10 9.3"></path>
              <path d="M6.85 15h10.3"></path>
            </svg>
          </span>
          <div class="consultorio-profile-toolbar__title">
            <h4>Examenes de laboratorio de <span class="consultorio-profile-toolbar__accent">${escapeHtml(
              patient?.name || "Paciente"
            )}</span></h4>
          </div>
        </div>
        <div class="form-actions">
          <button
            class="primary-button"
            type="button"
            data-open-patient-consultation-modal="true"
            data-consultation-profile-view="laboratorio"
          >
            + Registrar examen de laboratorio
          </button>
        </div>
      </div>
      ${content}
    </article>
  `;
}

function parseConsultorioImagingDetails(consultation) {
  const details = parseConsultorioConsultationDetails(consultation);
  const summary = parseConsultorioStructuredText(consultation?.summary || "", {
    "ayuda diagnostica": "aid",
    "signos clinicos": "signs",
    "diagnostico presuntivo": "diagnosis",
    "tipo de estudio": "studyType",
    observaciones: "observations",
  });
  let stored = null;
  const rawReference = String(consultation?.document_reference || "").trim();
  if (rawReference.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawReference);
      if (parsed?.kind === "imaging") {
        stored = parsed;
      }
    } catch (error) {
      stored = null;
    }
  }
  return {
    imagingDate:
      normalizeDateFieldValue(stored?.imagingDate || "") ||
      normalizeDateFieldValue(consultation?.consultation_at),
    studyDate: formatDateTime(consultation?.consultation_at),
    aid: String(stored?.aid || "").trim() || summary.aid || "",
    signs:
      String(stored?.signs || "").trim() ||
      summary.signs ||
      details.subjective ||
      "",
    diagnosis:
      String(stored?.diagnosis || "").trim() ||
      summary.diagnosis ||
      details.interpretation ||
      "",
    studyType:
      String(stored?.studyType || "").trim() ||
      summary.studyType ||
      String(consultation?.title || "").trim() ||
      "Imagen diagnostica",
    observations:
      String(stored?.observations || "").trim() ||
      summary.observations ||
      details.objective ||
      details.diagnosticPlan ||
      "",
    title:
      String(consultation?.title || "").trim() ||
      String(stored?.studyType || "").trim() ||
      summary.studyType ||
      "Imagen diagnostica",
    summary: truncate(
      String(stored?.diagnosis || "").trim() ||
        summary.diagnosis ||
        details.interpretation ||
        String(stored?.observations || "").trim() ||
        summary.observations ||
        details.objective ||
        details.subjective ||
        consultation?.summary ||
        "Sin resumen clinico",
      180
    ),
    related:
      String(stored?.aid || "").trim() ||
      summary.aid ||
      String(consultation?.referred_to || "").trim() ||
      details.diagnosticPlan ||
      (!stored ? String(consultation?.document_reference || "").trim() : ""),
    attachments: parseConsultorioAttachments(consultation?.attachments_summary || ""),
    professional:
      String(stored?.professional || "").trim() ||
      String(consultation?.professional_name || "").trim() ||
      "Sin usuario",
  };
}

function parseConsultorioReferralDetails(consultation) {
  const details = parseConsultorioConsultationDetails(consultation);
  const summary = parseConsultorioStructuredText(consultation?.summary || "", {
    "procedimiento/razon": "reason",
    observaciones: "observations",
  });
  const indications = parseConsultorioStructuredText(consultation?.indications || "", {
    "centro veterinario destino": "destination",
    "profesional remitente": "professional",
  });
  let stored = null;
  const rawReference = String(consultation?.document_reference || "").trim();
  if (rawReference.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawReference);
      if (parsed?.kind === "remission") {
        stored = parsed;
      }
    } catch (error) {
      stored = null;
    }
  }
  const reason =
    String(stored?.reason || "").trim() ||
    summary.reason ||
    String(consultation?.title || "").trim() ||
    details.subjective ||
    "Remision";
  const observations =
    String(stored?.observations || "").trim() ||
    summary.observations ||
    details.objective ||
    details.interpretation ||
    details.therapeuticPlan ||
    "";
  return {
    referralDate: toInputDateTime(
      String(stored?.referralDate || "").trim() ||
        consultation?.consultation_at ||
        new Date().toISOString()
    ),
    professional:
      String(stored?.professional || "").trim() ||
      indications.professional ||
      String(consultation?.professional_name || "").trim() ||
      getDefaultConsultorioProfessionalName(),
    destination:
      String(stored?.destination || "").trim() ||
      indications.destination ||
      String(consultation?.referred_to || "").trim() ||
      details.diagnosticPlan ||
      "",
    reason,
    observations,
    title: String(consultation?.title || "").trim() || reason,
    summary: truncate(
      observations ||
        reason ||
        String(consultation?.summary || "").trim() ||
        "Sin resumen clinico registrado.",
      220
    ),
  };
}

function buildConsultorioImagingSummary(payload) {
  return buildConsultorioStructuredText([
    ["Ayuda diagnostica", payload.imaging_aid],
    ["Signos clinicos", payload.imaging_signs],
    ["Diagnostico presuntivo", payload.imaging_diagnosis],
    ["Tipo de estudio", payload.imaging_study_type],
    ["Observaciones", payload.imaging_observations],
  ]);
}

function buildConsultorioImagingWorkspace(patient, profileConfig) {
  const entries = getConsultorioScopedConsultations(profileConfig?.consultationTypes || null);
  const content = entries.length
    ? `
      <div class="consultorio-imaging-grid">
        ${entries
          .map((consultation) => {
            const details = parseConsultorioImagingDetails(consultation);
            return `
              <article class="consultorio-imaging-card">
                <div class="consultorio-imaging-card__header">
                  <div>
                    <span class="consultorio-imaging-card__date">${escapeHtml(details.studyDate)}</span>
                    <h5>${escapeHtml(details.studyType || details.title)}</h5>
                  </div>
                  <button
                    class="ghost-button consultorio-imaging-card__action"
                    type="button"
                    data-edit-patient-consultation="${escapeHtml(consultation.id)}"
                  >
                    Editar
                  </button>
                </div>
                <p class="consultorio-imaging-card__summary">${escapeHtml(details.summary)}</p>
                ${
                  details.related
                    ? `<p class="consultorio-imaging-card__meta"><strong>Relacionado:</strong> ${escapeHtml(
                        truncate(details.related, 140)
                      )}</p>`
                    : ""
                }
                ${
                  details.attachments.length
                    ? `
                      <div class="consultorio-imaging-card__gallery">
                        ${buildConsultorioAttachmentPreviewMarkup(details.attachments)}
                      </div>
                    `
                    : `<p class="consultorio-imaging-card__meta">Sin adjuntos cargados.</p>`
                }
                <footer class="consultorio-imaging-card__footer">
                  <span>${escapeHtml(details.professional)}</span>
                </footer>
              </article>
            `;
          })
          .join("")}
      </div>
    `
    : `
      <div class="consultorio-module-empty consultorio-module-empty--imaging">
        <span class="consultorio-module-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 5h16"></path>
            <path d="M6 5v14"></path>
            <path d="M18 5v14"></path>
            <path d="M8 9h8"></path>
            <path d="M8 13h8"></path>
            <path d="M12 9v10"></path>
          </svg>
        </span>
        <strong>No hay registros de imagenologia</strong>
      </div>
    `;
  return `
    <article class="consultorio-profile-shell consultorio-imaging-shell">
      <div class="consultorio-profile-table-toolbar consultorio-imaging-shell__toolbar">
        <div class="consultorio-profile-toolbar__group">
          <span class="consultorio-profile-toolbar__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 5h16"></path>
              <path d="M6 5v14"></path>
              <path d="M18 5v14"></path>
              <path d="M8 9h8"></path>
              <path d="M8 13h8"></path>
              <path d="M12 9v10"></path>
            </svg>
          </span>
          <div class="consultorio-profile-toolbar__title">
            <h4>Im\u00e1genes diagn\u00f3sticas de <span class="consultorio-profile-toolbar__accent">${escapeHtml(
              patient?.name || "Paciente"
            )}</span></h4>
          </div>
        </div>
        <div class="form-actions">
          <button
            class="primary-button consultorio-imaging-shell__button"
            type="button"
            data-open-patient-consultation-modal="true"
            data-consultation-profile-view="imagenes"
          >
            + Registrar imagenologia
          </button>
        </div>
      </div>
      ${content}
    </article>
  `;
}

function buildConsultorioDocumentsWorkspace(patient, profileConfig) {
  const entries = getConsultorioScopedDocumentEntries();
  const content = entries.length
    ? `
      <div class="consultorio-documents-grid">
        ${entries
          .map((entry) => {
            if (entry.kind === "consent") {
              const consent = entry.data;
              return `
                <article class="consultorio-document-card">
                  <div class="consultorio-document-card__header">
                    <div>
                      <span class="consultorio-document-card__date">${escapeHtml(
                        formatDateTime(consent?.signed_at)
                      )}</span>
                      <h5>${escapeHtml(
                        consent?.procedure_name || consent?.consent_type || "Consentimiento"
                      )}</h5>
                    </div>
                  </div>
                  <p class="consultorio-document-card__meta"><strong>Categoria:</strong> Consentimiento</p>
                  <p class="consultorio-document-card__meta"><strong>Tipo:</strong> ${escapeHtml(
                    consent?.consent_type || "Sin tipo"
                  )}</p>
                  <p class="consultorio-document-card__summary">${escapeHtml(
                    truncate(
                      consent?.notes || consent?.owner_statement || "Sin observaciones registradas.",
                      180
                    )
                  )}</p>
                  <p class="consultorio-document-card__meta"><strong>Tutor:</strong> ${escapeHtml(
                    consent?.owner_signature_name || consent?.owner_name || "Sin dato"
                  )}</p>
                  <p class="consultorio-document-card__meta"><strong>Historia:</strong> ${escapeHtml(
                    consent?.record_label || "Sin adjuntar"
                  )}</p>
                  <p class="consultorio-document-card__meta"><strong>Consulta:</strong> ${escapeHtml(
                    consent?.consultation_label || "Sin adjuntar"
                  )}</p>
                  <footer class="consultorio-document-card__footer">
                    <span>${escapeHtml(consent?.professional_name || "Sin usuario")}</span>
                  </footer>
                </article>
              `;
            }
            const consultation = entry.data;
            const details = parseConsultorioDocumentDetails(consultation);
            return `
              <article class="consultorio-document-card">
                <div class="consultorio-document-card__header">
                  <div>
                    <span class="consultorio-document-card__date">${escapeHtml(
                      formatDateTime(consultation?.consultation_at)
                    )}</span>
                    <h5>${escapeHtml(details.name || "Documento")}</h5>
                  </div>
                  <div class="consultorio-document-card__actions">
                    <button
                      class="ghost-button consultorio-document-card__action"
                      type="button"
                      data-edit-patient-consultation="${escapeHtml(consultation.id)}"
                    >
                      Editar
                    </button>
                    <button
                      class="ghost-button consultorio-document-card__action consultorio-document-card__action--danger"
                      type="button"
                      data-delete-patient-document="${escapeHtml(consultation.id)}"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                ${
                  details.format
                    ? `<p class="consultorio-document-card__meta"><strong>Formato:</strong> ${escapeHtml(
                        details.format
                      )}</p>`
                    : ""
                }
                <p class="consultorio-document-card__summary">${escapeHtml(
                  details.summary || "Sin descripcion registrada."
                )}</p>
                <p class="consultorio-document-card__meta"><strong>Firma:</strong> ${escapeHtml(
                  details.signatureLabel
                )}</p>
                <footer class="consultorio-document-card__footer">
                  <span>${escapeHtml(consultation?.professional_name || "Sin usuario")}</span>
                </footer>
              </article>
            `;
          })
          .join("")}
      </div>
    `
    : `
      <div class="consultorio-module-empty consultorio-module-empty--documents">
        <span class="consultorio-module-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
            <path d="M14 2v5h5"></path>
            <path d="M9 13h6"></path>
            <path d="M9 17h6"></path>
            <path d="M9 9h2"></path>
          </svg>
        </span>
        <strong>No hay documentos ni consentimientos registrados</strong>
      </div>
    `;
  return `
    <article class="consultorio-profile-shell consultorio-documents-shell">
      <div class="consultorio-profile-table-toolbar consultorio-documents-shell__toolbar">
        <div class="consultorio-profile-toolbar__group">
          <span class="consultorio-profile-toolbar__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
              <path d="M14 2v5h5"></path>
              <path d="M9 13h6"></path>
              <path d="M9 17h6"></path>
              <path d="M9 9h2"></path>
            </svg>
          </span>
          <div class="consultorio-profile-toolbar__title">
            <h4>Documentos de <span class="consultorio-profile-toolbar__accent">${escapeHtml(
              patient?.name || "Paciente"
            )}</span></h4>
            <p class="meta-copy">Aqui tambien se consolidan los consentimientos del paciente.</p>
          </div>
        </div>
        <div class="form-actions">
          <button
            class="primary-button consultorio-documents-shell__button"
            type="button"
            data-open-patient-consultation-modal="true"
            data-consultation-profile-view="documents"
          >
            + Registrar documento
          </button>
        </div>
      </div>
      ${content}
    </article>
  `;
}

function buildConsultorioReferralsWorkspace(patient, profileConfig) {
  const entries = getConsultorioScopedConsultations(profileConfig?.consultationTypes || null)
    .slice()
    .sort((left, right) => String(right.consultation_at || "").localeCompare(String(left.consultation_at || "")));
  const content = entries.length
    ? `
      <div class="consultorio-remissions-shell__body">
        <div class="consultorio-remissions-grid">
          ${entries
            .map((consultation) => {
              const details = parseConsultorioReferralDetails(consultation);
              const attachments = parseConsultorioAttachments(consultation?.attachments_summary || "");
              return `
                <article class="consultorio-remission-card">
                  <div class="consultorio-remission-card__header">
                    <div>
                      <span class="consultorio-remission-card__date">${escapeHtml(
                        formatDateTime(consultation?.consultation_at)
                      )}</span>
                      <h5>${escapeHtml(details.reason || details.title || "Remision")}</h5>
                    </div>
                    <button
                      class="ghost-button consultorio-remission-card__action"
                      type="button"
                      data-edit-patient-consultation="${escapeHtml(consultation.id)}"
                    >
                      Editar
                    </button>
                  </div>
                  <p class="consultorio-remission-card__summary">${escapeHtml(details.summary)}</p>
                  ${
                    attachments.length
                      ? `
                        <div class="consultorio-remission-card__gallery">
                          ${buildConsultorioAttachmentPreviewMarkup(attachments)}
                        </div>
                      `
                      : ""
                  }
                  <footer class="consultorio-remission-card__footer">
                    <span>${escapeHtml(details.professional || "Sin usuario")}</span>
                    <span>${escapeHtml(details.destination || consultation?.consultation_type || "Remision")}</span>
                  </footer>
                </article>
              `;
            })
            .join("")}
        </div>
      </div>
    `
    : `
      <div class="consultorio-remissions-empty">
        <span class="consultorio-remissions-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 18V9h8.5L19 13v5"></path>
            <path d="M6 18H4a1 1 0 0 1-1-1v-4a4 4 0 0 1 4-4h1"></path>
            <path d="M14 9v4h5"></path>
            <path d="M9 8V4"></path>
            <path d="M7 6h4"></path>
            <path d="M16.5 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"></path>
            <path d="M7.5 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"></path>
          </svg>
        </span>
        <strong>No hay registros de remisi\u00f3n</strong>
      </div>
    `;
  return `
    <article class="consultorio-profile-shell consultorio-remissions-shell">
      <div class="consultorio-profile-table-toolbar consultorio-remissions-shell__toolbar">
        <div class="consultorio-profile-toolbar__group">
          <span class="consultorio-profile-toolbar__icon consultorio-remissions-shell__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 18V9h8.5L19 13v5"></path>
              <path d="M6 18H4a1 1 0 0 1-1-1v-4a4 4 0 0 1 4-4h1"></path>
              <path d="M14 9v4h5"></path>
              <path d="M9 8V4"></path>
              <path d="M7 6h4"></path>
              <path d="M16.5 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"></path>
              <path d="M7.5 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"></path>
            </svg>
          </span>
          <div class="consultorio-profile-toolbar__title">
            <h4>Remisiones de <span class="consultorio-profile-toolbar__accent">${escapeHtml(
              patient?.name || "Paciente"
            )}</span></h4>
          </div>
        </div>
        <div class="form-actions">
          <button
            class="consultorio-remissions-shell__button"
            type="button"
            data-open-patient-consultation-modal="true"
            data-consultation-profile-view="remisiones"
          >
            <span aria-hidden="true">+</span>
            Registrar remisi\u00f3n
          </button>
        </div>
      </div>
      ${content}
    </article>
  `;
}

function buildConsultorioGroomingWorkspace(patient) {
  const entries = getConsultorioScopedGrooming()
    .slice()
    .sort((left, right) => String(right.service_at || "").localeCompare(String(left.service_at || "")));
  const content = entries.length
    ? `
      <div class="consultorio-grooming-grid">
        ${entries
          .map(
            (item) => `
              <article class="consultorio-grooming-card">
                <div class="consultorio-grooming-card__header">
                  <div>
                    <span class="consultorio-grooming-card__date">${escapeHtml(
                      formatDateTime(item?.service_at)
                    )}</span>
                    <h5>${escapeHtml(item?.service_name || item?.document_type || "Servicio")}</h5>
                  </div>
                  <span class="${statusClass(item?.status)}">${escapeHtml(
                    humanStatus(item?.status)
                  )}</span>
                </div>
                <p class="consultorio-grooming-card__meta"><strong>Documento:</strong> ${escapeHtml(
                  item?.document_type || "Sin tipo"
                )}</p>
                <p class="consultorio-grooming-card__meta"><strong>Responsable:</strong> ${escapeHtml(
                  item?.stylist_name || "Sin responsable"
                )}</p>
                ${
                  item?.next_visit_at
                    ? `<p class="consultorio-grooming-card__meta"><strong>Proxima visita:</strong> ${escapeHtml(
                        formatDateTime(item.next_visit_at)
                      )}</p>`
                    : ""
                }
                <p class="consultorio-grooming-card__summary">${escapeHtml(
                  truncate(
                    item?.recommendations ||
                      item?.products_used ||
                      item?.notes ||
                      "Sin observaciones registradas.",
                    180
                  )
                )}</p>
              </article>
            `
          )
          .join("")}
      </div>
    `
    : `
      <div class="consultorio-module-empty consultorio-module-empty--grooming">
        <span class="consultorio-module-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="6" cy="7" r="2"></circle>
            <circle cx="6" cy="17" r="2"></circle>
            <path d="M8 8l10 10"></path>
            <path d="M8 16 18 6"></path>
          </svg>
        </span>
        <strong>No hay registros de peluquería</strong>
      </div>
    `;
  return `
    <article class="consultorio-profile-shell consultorio-grooming-shell">
      <div class="consultorio-profile-table-toolbar consultorio-grooming-shell__toolbar">
        <div class="consultorio-profile-toolbar__group">
          <span class="consultorio-profile-toolbar__icon consultorio-grooming-shell__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="6" cy="7" r="2"></circle>
              <circle cx="6" cy="17" r="2"></circle>
              <path d="M8 8l10 10"></path>
              <path d="M8 16 18 6"></path>
            </svg>
          </span>
          <div class="consultorio-profile-toolbar__title">
            <h4>Peluquería de <span class="consultorio-profile-toolbar__accent">${escapeHtml(
              patient?.name || "Paciente"
            )}</span></h4>
          </div>
        </div>
        <div class="form-actions">
          <button
            class="consultorio-grooming-shell__button"
            type="button"
            data-open-grooming-section="true"
          >
            <span aria-hidden="true">+</span>
            Registrar servicio
          </button>
        </div>
      </div>
      <div class="consultorio-grooming-shell__body">
        ${content}
      </div>
    </article>
  `;
}

function buildConsultorioFollowupWorkspace(patient, profileConfig) {
  const entries = getConsultorioScopedConsultations(profileConfig?.consultationTypes || null);
  const content = entries.length
    ? `
      <div class="consultorio-followup-grid">
        ${entries
          .map((consultation) => {
            const followupDetails = parseConsultorioFollowupDetails(consultation);
            const attachments = parseConsultorioAttachments(consultation?.attachments_summary || "");
            const summary = truncate(
              followupDetails.details ||
                consultation?.summary ||
                "Sin resumen registrado.",
              200
            );
            const nextControl = normalizeDateFieldValue(followupDetails.nextControl || "");
            return `
              <article class="consultorio-followup-card">
                <div class="consultorio-followup-card__header">
                  <div>
                    <span class="consultorio-followup-card__date">${escapeHtml(
                      formatDateTime(consultation?.consultation_at)
                    )}</span>
                    <h5>${escapeHtml(
                      consultation?.title ||
                        followupDetails.reason ||
                        followupDetails.type ||
                        consultation?.consultation_type ||
                        "Seguimiento"
                    )}</h5>
                  </div>
                  <button
                    class="ghost-button consultorio-followup-card__action"
                    type="button"
                    data-edit-patient-consultation="${escapeHtml(consultation.id)}"
                  >
                    Editar
                  </button>
                </div>
                <p class="consultorio-followup-card__summary">${escapeHtml(summary)}</p>
                ${
                  followupDetails.type
                    ? `<p class="consultorio-followup-card__meta"><strong>Tipo:</strong> ${escapeHtml(
                        followupDetails.type
                      )}</p>`
                    : ""
                }
                ${
                  nextControl
                    ? `<p class="consultorio-followup-card__meta"><strong>Proximo control:</strong> ${escapeHtml(
                        nextControl
                      )}</p>`
                    : ""
                }
                ${
                  attachments.length
                    ? `
                      <div class="consultorio-followup-card__gallery">
                        ${buildConsultorioAttachmentPreviewMarkup(attachments)}
                      </div>
                    `
                    : `<p class="consultorio-followup-card__meta">Sin adjuntos cargados.</p>`
                }
                <footer class="consultorio-followup-card__footer">
                  <span>${escapeHtml(consultation?.professional_name || "Sin usuario")}</span>
                </footer>
              </article>
            `;
          })
          .join("")}
      </div>
    `
    : `
      <div class="consultorio-module-empty consultorio-module-empty--followup">
        <span class="consultorio-module-empty__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 21s-6.5-4.35-6.5-10A3.5 3.5 0 0 1 9 7.5c1.28 0 2.42.69 3 1.72A3.34 3.34 0 0 1 15 7.5a3.5 3.5 0 0 1 3.5 3.5c0 5.65-6.5 10-6.5 10Z"></path>
            <path d="M8 13h2l1.1-2 1.8 4 1.1-2H16"></path>
          </svg>
        </span>
        <strong>No hay registros de seguimiento</strong>
      </div>
    `;
  return `
    <article class="consultorio-profile-shell consultorio-followup-shell">
      <div class="consultorio-profile-table-toolbar consultorio-followup-shell__toolbar">
        <div class="consultorio-profile-toolbar__group">
          <span class="consultorio-profile-toolbar__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 21s-6.5-4.35-6.5-10A3.5 3.5 0 0 1 9 7.5c1.28 0 2.42.69 3 1.72A3.34 3.34 0 0 1 15 7.5a3.5 3.5 0 0 1 3.5 3.5c0 5.65-6.5 10-6.5 10Z"></path>
              <path d="M8 13h2l1.1-2 1.8 4 1.1-2H16"></path>
            </svg>
          </span>
          <div class="consultorio-profile-toolbar__title">
            <h4>Seguimiento de <span class="consultorio-profile-toolbar__accent">${escapeHtml(
              patient?.name || "Paciente"
            )}</span></h4>
          </div>
        </div>
        <div class="form-actions">
          <button
            class="primary-button consultorio-followup-shell__button"
            type="button"
            data-open-patient-consultation-modal="true"
            data-consultation-profile-view="seguimiento"
          >
            + Registrar seguimiento
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
  const profileLayout = elements.consultorioPatientProfilePanel.querySelector(
    ".consultorio-profile-layout"
  );
  if (!isConsultorioPatientProfileActive()) {
    elements.consultorioPatientProfilePanel.classList.add("is-hidden");
    elements.consultorioPatientProfilePanel.setAttribute("aria-hidden", "true");
    elements.consultorioPatientProfilePanel.classList.remove(
      "consultorio-profile-panel--diagnostic"
    );
    profileLayout?.classList.remove("consultorio-profile-layout--diagnostic");
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
  const isDiagnosticImagingView = profileConfig?.value === "imagenes";
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
  elements.consultorioPatientProfilePanel.classList.toggle(
    "consultorio-profile-panel--diagnostic",
    isDiagnosticImagingView
  );
  profileLayout?.classList.toggle("consultorio-profile-layout--diagnostic", isDiagnosticImagingView);
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
    elements.consultorioPatientProfileNav.innerHTML = isDiagnosticImagingView
      ? ""
      : buildConsultorioProfileNavMarkup();
  }
  if (elements.consultorioPatientProfileSubtitle) {
    const ownerLabel = owner?.full_name || patient?.owner_name || "Sin propietario";
    elements.consultorioPatientProfileSubtitle.textContent = `${patient?.species || "Paciente"}${
      patient?.breed ? ` / ${patient.breed}` : ""
    } | Tutor: ${ownerLabel} | Seccion activa: ${profileConfig?.label || "Historia clinica"}`;
  }
  if (elements.consultorioPatientProfileSummary) {
    if (isDiagnosticImagingView) {
      elements.consultorioPatientProfileSummary.innerHTML = buildConsultorioDiagnosticImagingProfile({
        owner,
        patient,
        ownerPatients,
        profileConfig,
      });
      return;
    }
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
        : profileConfig?.value === "orders"
        ? buildConsultorioOrdersWorkspace(patient, profileConfig)
        : profileConfig?.value === "laboratorio"
        ? buildConsultorioLaboratoryWorkspace(patient, profileConfig)
        : profileConfig?.value === "imagenes"
        ? buildConsultorioImagingWorkspace(patient, profileConfig)
        : profileConfig?.value === "documents"
        ? buildConsultorioDocumentsWorkspace(patient, profileConfig)
        : profileConfig?.value === "remisiones"
        ? buildConsultorioReferralsWorkspace(patient, profileConfig)
        : profileConfig?.value === "grooming"
        ? buildConsultorioGroomingWorkspace(patient)
        : profileConfig?.value === "seguimiento"
        ? buildConsultorioFollowupWorkspace(patient, profileConfig)
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
            ${buildAppointmentStatusBadgeMarkup(appointment.status, { compact: true })}
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
  renderAgendaQuickView();
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
    const availableSlots = filterAvailableAgendaSlots(slots);
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

function buildAgendaProgramSlotMarkup(slot) {
  const appointment = slot?.appointment_id ? getAppointmentById(slot.appointment_id) : null;
  if (!appointment) {
    return `
      <button
        type="button"
        class="agenda-slot agenda-slot--available"
        data-slot-at="${escapeHtml(slot.slot_at)}"
        data-slot-minutes="${escapeHtml(String(slot.duration_minutes || 30))}"
        data-drop-slot="true"
      >
        <span class="agenda-slot-time">${escapeHtml(slot.label)}</span>
        <span class="agenda-slot-duration">${escapeHtml(
          String(slot.duration_minutes || 30)
        )} min</span>
        <span class="agenda-slot-helper">Disponible</span>
      </button>
    `;
  }
  const presentation = buildAgendaAppointmentPresentation(appointment);
  return `
    <button
      type="button"
      class="agenda-slot agenda-slot--occupied agenda-slot--${presentation.type}"
      data-slot-at="${escapeHtml(slot.slot_at)}"
      data-slot-minutes="${escapeHtml(String(slot.duration_minutes || 30))}"
      data-appointment-id="${escapeHtml(appointment.id)}"
      draggable="true"
    >
      <span class="agenda-slot-time">${escapeHtml(slot.label)}</span>
      <span class="agenda-slot-status">${buildAppointmentStatusBadgeMarkup(appointment.status, {
        compact: true,
      })}</span>
      <span class="agenda-slot-patient">${escapeHtml(
        truncate(appointment.patient_name || slot.patient_name || "Cita", 22)
      )}</span>
      <span class="agenda-slot-service">${escapeHtml(
        truncate(presentation.subtitle || appointment.reason || "Servicio", 28)
      )}</span>
    </button>
  `;
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
    const slots = buildAgendaSlots(currentIso);
    const slotMarkup = slots.length
      ? slots.map((slot) => buildAgendaProgramSlotMarkup(slot)).join("")
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
  const height = Math.max(52, minutesDuration * minuteHeight);
  const presentation = buildAgendaAppointmentPresentation(appointment);
  const tone = presentation.type;
  return `
    <div class="agenda-timeline-event agenda-timeline-event--${tone}" data-appointment-id="${escapeHtml(
      appointment.id
    )}" role="button" tabindex="0" draggable="true" style="top:${top}px;height:${height}px">
      <div class="agenda-timeline-event__row">
        <div class="agenda-timeline-event__identity">
          ${getAgendaAppointmentIconMarkup(presentation.type)}
          <div class="agenda-timeline-event__copy">
            <strong class="agenda-timeline-event__patient">${buildAppointmentStatusBadgeMarkup(
              appointment.status,
              { compact: true }
            )}${escapeHtml(
              truncate(presentation.title, 24)
            )}</strong>
            <span class="agenda-timeline-event__text">${escapeHtml(
              truncate(presentation.subtitle, 34)
            )}</span>
          </div>
        </div>
        <div class="agenda-timeline-event__meta">
          <span class="agenda-timeline-event__time">${escapeHtml(formatAgendaTimeShort(start))}</span>
          <span class="agenda-timeline-event__duration">${escapeHtml(
            formatAgendaDurationLabel(duration)
          )}</span>
        </div>
      </div>
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
            const presentation = buildAgendaAppointmentPresentation(appointment);
            return `
              <div class="agenda-list-item" data-appointment-id="${escapeHtml(
                appointment.id
              )}" role="button" tabindex="0" draggable="true">
                <div class="agenda-list-time">${escapeHtml(timeLabel)}</div>
                <div class="agenda-list-title agenda-list-title--${presentation.type}">
                  <div class="agenda-list-title__main">
                    ${getAgendaAppointmentIconMarkup(presentation.type)}
                    <strong>${escapeHtml(truncate(presentation.title, 40))}</strong>
                  </div>
                  ${buildAppointmentStatusBadgeMarkup(appointment.status, { compact: true })}
                  <span>${escapeHtml(
                    truncate(
                      [presentation.subtitle, appointment.owner_name || ""].filter(Boolean).join(" · "),
                      68
                    )
                  )}</span>
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
        const presentation = buildAgendaAppointmentPresentation(appointment);
        const label = truncate(presentation.title, 24);
        const tone = presentation.type;
        return `
          <div class="agenda-event-chip agenda-event-chip--${tone}" data-appointment-id="${escapeHtml(
            appointment.id
          )}" role="button" tabindex="0" draggable="true">
            ${getAgendaAppointmentIconMarkup(presentation.type)}
            <span class="agenda-event-time">${escapeHtml(timeLabel)}</span>
            ${buildAppointmentStatusBadgeMarkup(appointment.status, { compact: true })}
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
  if (!hasBadge) {
    return;
  }
  elements.agendaConnectionBadge.textContent = info.connected ? "Google conectado" : "Google pendiente";
  elements.agendaConnectionBadge.className = `pill ${info.connected ? "pill--confirmed" : "pill--draft"}`;
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
        const createdLabel = user.created_at ? formatDateTime(user.created_at) : "N/D";
        const permissionsLabel = buildUserPermissionsSummary(user.permissions);
        return `
          <tr>
            <td>
              <div class="table-actions users-table-actions">
                ${
                  isAdmin
                    ? `
                <button class="table-action-pill table-action-pill--edit" type="button" data-user-edit="${escapeHtml(
                  user.id
                )}">
                  <span class="table-action-pill__icon">${getUserTableActionIconSvg("edit")}</span>
                  <span>Editar</span>
                </button>
                <button class="table-action-pill table-action-pill--danger" type="button" data-user-delete="${escapeHtml(
                  user.id
                )}">
                  <span class="table-action-pill__icon">${getUserTableActionIconSvg("delete")}</span>
                  <span>Eliminar</span>
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
      const orderDetails = isConsultorioOrderDocument(consultation)
        ? getConsultorioOrderDisplayData(consultation)
        : null;
      const hospAmbDetails = isHospAmbConsultationType(consultation.consultation_type)
        ? parseConsultorioHospAmbDetails(consultation)
        : null;
      return `
        <article class="list-card">
          <header>
            <div>
              <h4>${escapeHtml(orderDetails?.preview || consultation.title)}</h4>
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
            orderDetails
              ? truncate(
                  [orderDetails.reason, orderDetails.notesPreview].filter(Boolean).join(" | ") ||
                    "Sin detalle"
                )
              : isFormulaConsultationType(consultation.consultation_type)
              ? getConsultorioFormulaMedicationLabel(consultation)
              : hospAmbDetails
              ? truncate([hospAmbDetails.reason, hospAmbDetails.observations].filter(Boolean).join(" | "))
              : truncate(consultation.summary)
          )}</p>
          <p>${escapeHtml(
            orderDetails
              ? truncate(buildConsultorioOrderItemsPreview(orderDetails.details.items))
              : isFormulaConsultationType(consultation.consultation_type)
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
      ? "Este paciente aun no tiene documentos de peluquería."
      : "Aun no hay documentos de peluquería."
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
    (consultation) => {
      const orderDetails = getConsultorioOrderDisplayData(consultation);
      return `
        <article class="list-card">
          <h4>${escapeHtml(consultation.patient_name)}</h4>
          <p>${escapeHtml(truncate(orderDetails.preview, 160))}</p>
          <p>${escapeHtml(
            truncate(orderDetails.reason || orderDetails.notesPreview || "Sin detalle", 160)
          )}</p>
        </article>
      `;
    },
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
  const activeReportsView = getSubsectionOption("reports")?.value || "classic";
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
    "Sin datos de peluquería."
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
  renderSalesReportMiniSummary();
  renderSalesReports();
  if (activeReportsView === "financial" && !salesReportState.loaded && !salesReportState.loading) {
    void loadSalesReport({ silent: true });
  }
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

function getAppointmentById(appointmentId) {
  return (state.appointments || []).find((appointment) => appointment.id === appointmentId) || null;
}

function getAppointmentOwner(appointment) {
  if (!appointment) {
    return null;
  }
  return getOwnerById(appointment.owner_id) || null;
}

function getAppointmentPatient(appointment) {
  if (!appointment) {
    return null;
  }
  return getPatientById(appointment.patient_id) || null;
}

function formatPatientAgeLabel(patient) {
  const ageYears = Number(patient?.age_years);
  if (Number.isFinite(ageYears) && ageYears > 0) {
    const rounded = Math.round(ageYears * 10) / 10;
    return `${String(rounded).replace(".0", "").replace(".", ",")} anos`;
  }
  const birthDate = String(patient?.birth_date || "").trim();
  if (!birthDate) {
    return "Sin dato";
  }
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) {
    return "Sin dato";
  }
  const now = new Date();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }
  if (months <= 0) {
    return "Menos de 1 mes";
  }
  if (months < 12) {
    return `${months} mes${months === 1 ? "" : "es"}`;
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths
    ? `${years} ano${years === 1 ? "" : "s"} ${remainingMonths} mes${remainingMonths === 1 ? "" : "es"}`
    : `${years} ano${years === 1 ? "" : "s"}`;
}

function normalizeWhatsappPhone(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (digits.length === 10) {
    return `57${digits}`;
  }
  return digits;
}

function buildAppointmentReminderText(appointment) {
  const owner = getAppointmentOwner(appointment);
  const patient = getAppointmentPatient(appointment);
  const presentation = buildAgendaAppointmentPresentation(appointment);
  const start = new Date(appointment?.appointment_at || "");
  const timeLabel = Number.isNaN(start.getTime())
    ? formatDateTime(appointment?.appointment_at || "")
    : `${start.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })} a las ${formatAgendaTimeShort(start)}`;
  const clinicName = state.settings?.clinic_name || "Lativet";
  return [
    `Hola ${owner?.full_name || appointment?.owner_name || ""},`,
    "",
    `Te recordamos la cita de ${patient?.name || appointment?.patient_name || "tu mascota"} para ${timeLabel}.`,
    `Servicio: ${presentation.subtitle || appointment?.reason || "Cita veterinaria"}.`,
    `Encargado: ${appointment?.professional_name || "Agenda general"}.`,
    "",
    `Si necesitas confirmar o reprogramar, responde a este mensaje. ${clinicName}.`,
  ].join("\n");
}

function buildAppointmentWhatsappUrl(appointment) {
  const owner = getAppointmentOwner(appointment);
  const phone = normalizeWhatsappPhone(owner?.phone || owner?.alternate_phone || "");
  if (!phone) {
    return "";
  }
  return `https://wa.me/${encodeURIComponent(phone)}?text=${encodeURIComponent(
    buildAppointmentReminderText(appointment)
  )}`;
}

function isTerminalAppointmentStatus(status) {
  return ["completed", "cancelled", "no_show"].includes(status);
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

function normalizeBillingCatalogSearchText(value) {
  const normalized =
    typeof String(value || "").normalize === "function"
      ? String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      : String(value || "");
  return normalized.toLowerCase().trim();
}

function tokenizeBillingCatalogSearch(value) {
  return normalizeBillingCatalogSearchText(value)
    .split(/[\s/]+/)
    .filter(Boolean);
}

function getBillingCatalogItemById(itemId) {
  const normalizedId = String(itemId || "").trim();
  if (!normalizedId) {
    return null;
  }
  return (
    (state.catalog_items || []).find((item) => String(item.id || "").trim() === normalizedId) || null
  );
}

function buildBillingCatalogItemLabel(item) {
  return `${item.name || "Item"} / ${formatMoney(item.unit_price || 0)}`;
}

function buildBillingCatalogItemMeta(item) {
  return [item.category || "Sin categoria", item.provider_name || "Sin proveedor"].join(" · ");
}

function matchesBillingCatalogItem(item, query) {
  const tokens = tokenizeBillingCatalogSearch(query);
  if (!tokens.length) {
    return true;
  }
  const haystack = normalizeBillingCatalogSearchText(
    [
      item.name,
      item.category,
      item.provider_name,
      getCatalogPresentationLabel(item.presentation_type),
      item.id,
    ]
      .filter(Boolean)
      .join(" ")
  );
  return tokens.every((token) => haystack.includes(token));
}

function syncBillingLineItemSearch({ preserveQuery = false } = {}) {
  if (!elements.billingLineItemSearch || !elements.billingLineItemSelect) {
    return;
  }
  const selectedItem = getBillingCatalogItemById(elements.billingLineItemSelect.value);
  if (selectedItem) {
    elements.billingLineItemSearch.value = buildBillingCatalogItemLabel(selectedItem);
    return;
  }
  if (!preserveQuery) {
    elements.billingLineItemSearch.value = "";
  }
}

function selectBillingLineItem(itemId) {
  if (!elements.billingLineItemSearch || !elements.billingLineItemSelect) {
    return;
  }
  const selectedItem = getBillingCatalogItemById(itemId);
  elements.billingLineItemSelect.value = selectedItem ? String(selectedItem.id || "") : "";
  elements.billingLineItemSearch.value = selectedItem ? buildBillingCatalogItemLabel(selectedItem) : "";
  elements.billingLineItemDropdown?.classList.add("is-hidden");
  elements.billingLineItemSelect.dispatchEvent(new Event("change", { bubbles: true }));
}

function renderBillingLineItemDropdown({ showAll = false } = {}) {
  const input = elements.billingLineItemSearch;
  const dropdown = elements.billingLineItemDropdown;
  if (!input || !dropdown) {
    return;
  }
  const query = showAll ? "" : String(input.value || "").trim();
  const catalogItems = state.catalog_items || [];
  const filteredItems = query
    ? catalogItems.filter((item) => matchesBillingCatalogItem(item, query))
    : catalogItems;
  const visibleItems = filteredItems.slice(0, 8);
  const selectedItemId = String(elements.billingLineItemSelect?.value || "").trim();
  if (!catalogItems.length) {
    dropdown.innerHTML =
      '<div class="sales-autocomplete__item is-muted">Aun no hay productos o servicios registrados.</div>';
  } else if (!visibleItems.length) {
    dropdown.innerHTML = '<div class="sales-autocomplete__item is-muted">Sin resultados</div>';
  } else {
    dropdown.innerHTML = [
      ...visibleItems.map((item) => {
        const normalizedItemId = String(item.id || "");
        return `
          <button
            type="button"
            class="sales-autocomplete__item${
              normalizedItemId === selectedItemId ? " is-selected" : ""
            }"
            data-billing-line-item-id="${escapeHtml(normalizedItemId)}"
          >
            <strong>${escapeHtml(buildBillingCatalogItemLabel(item))}</strong>
            <small>${escapeHtml(buildBillingCatalogItemMeta(item))}</small>
          </button>
        `;
      }),
      filteredItems.length > visibleItems.length
        ? '<div class="sales-autocomplete__item is-muted">Sigue escribiendo para ver menos coincidencias.</div>'
        : "",
    ].join("");
  }
  dropdown.classList.toggle("is-hidden", document.activeElement !== input);
}

function resolveBillingCatalogItemIdFromSearch() {
  const selectedItemId = String(elements.billingLineItemSelect?.value || "").trim();
  if (selectedItemId) {
    return selectedItemId;
  }
  const query = String(elements.billingLineItemSearch?.value || "").trim();
  if (!query) {
    return "";
  }
  const exactMatches = (state.catalog_items || []).filter(
    (item) => normalizeBillingCatalogSearchText(item.name) === normalizeBillingCatalogSearchText(query)
  );
  if (exactMatches.length === 1) {
    selectBillingLineItem(exactMatches[0].id);
    return String(exactMatches[0].id || "");
  }
  const matches = (state.catalog_items || []).filter((item) => matchesBillingCatalogItem(item, query));
  if (matches.length === 1) {
    selectBillingLineItem(matches[0].id);
    return String(matches[0].id || "");
  }
  if (matches.length > 1) {
    throw new Error("Hay varios items que coinciden. Elige uno de la lista.");
  }
  throw new Error("No encontramos ese item en el catalogo.");
}

function renderSelects() {
  const activeSection = getActiveSectionId();
  const consultorioSubsection = getSubsectionOption("consultorio")?.value || "";
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
  const consentSelectedPatientId = scopedPatient?.id
    ? String(scopedPatient.id)
    : activeSection === "consents"
    ? String(elements.consentPatientSelect?.value || pendingConsentPatientId || "").trim()
    : "";
  const groomingSelectedPatientId = scopedPatient?.id
    ? String(scopedPatient.id)
    : activeSection === "consultorio" && consultorioSubsection === "grooming"
    ? String(elements.groomingPatientSelect?.value || pendingGroomingPatientId || "").trim()
    : "";
  const consentScopedRecords = consentSelectedPatientId
    ? state.records.filter((record) => record.patient_id === consentSelectedPatientId)
    : state.records;
  const consentScopedConsultations = consentSelectedPatientId
    ? state.consultations.filter((consultation) => consultation.patient_id === consentSelectedPatientId)
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
  [elements.consultationRecordSelect, elements.evolutionRecordSelect].forEach((select) =>
    populateSelect(select, scopedRecords, recordLabel, "Selecciona historia")
  );
  populateSelect(
    elements.consentRecordSelect,
    consentScopedRecords,
    recordLabel,
    "Selecciona historia"
  );
  populateSelect(
    elements.consultationConsentSelect,
    scopedConsents,
    (consent) => `${consent.patient_name} / ${consent.procedure_name}`,
    "Consentimiento opcional"
  );
  populateSelect(
    elements.consentConsultationSelect,
    consentScopedConsultations,
    (consultation) => `${consultation.patient_name} / ${consultation.title}`,
    "Consulta opcional"
  );
  populateSelect(
    elements.billingLineItemSelect,
    state.catalog_items,
    (item) => buildBillingCatalogItemLabel(item),
    "Selecciona item"
  );
  syncBillingLineItemSearch({
    preserveQuery:
      document.activeElement === elements.billingLineItemSearch &&
      !String(elements.billingLineItemSelect?.value || "").trim(),
  });
  populateSelect(
    elements.stockAdjustmentItemSelect,
    state.catalog_items.filter((item) => item.track_inventory),
    (item) => `${item.name} / stock ${Number(item.stock_quantity || 0)}`,
    "Selecciona item"
  );
  populateSelect(
    elements.billingPaymentDocumentSelect,
    getPendingBillingDocuments(),
    (document) =>
      `${document.document_number} / ${document.patient_name} / saldo ${formatMoney(
        document.balance_due || 0
      )}`,
    "Selecciona factura pendiente"
  );
  if (elements.consentPatientSelect) {
    elements.consentPatientSelect.disabled = Boolean(scopedPatient);
  }
  if (scopedPatient) {
    [elements.recordPatientSelect, elements.consentPatientSelect, elements.groomingPatientSelect].forEach(
      (select) => {
        if (select) {
          select.value = scopedPatient.id;
        }
      }
    );
    pendingConsentPatientId = "";
    pendingGroomingPatientId = "";
    return;
  }
  if (consentSelectedPatientId && elements.consentPatientSelect) {
    elements.consentPatientSelect.value = consentSelectedPatientId;
    if (activeSection === "consents" && pendingConsentPatientId === consentSelectedPatientId) {
      pendingConsentPatientId = "";
    }
  }
  if (groomingSelectedPatientId && elements.groomingPatientSelect) {
    elements.groomingPatientSelect.value = groomingSelectedPatientId;
    if (
      activeSection === "consultorio" &&
      consultorioSubsection === "grooming" &&
      pendingGroomingPatientId === groomingSelectedPatientId
    ) {
      pendingGroomingPatientId = "";
    }
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
    "cashSessionOpenForm",
    "cashSessionCloseForm",
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
    case "consents":
      renderConsents();
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
  renderWorkspaceChrome();
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

function isElementVisible(element) {
  return Boolean(element && !element.classList.contains("is-hidden"));
}

function getOpenAppointmentDetailId() {
  if (!isElementVisible(elements.appointmentDetailModal)) {
    return "";
  }
  return String(elements.appointmentDetailModal?.dataset?.appointmentId || "").trim();
}

async function runAgendaAutoSync() {
  if (agendaAutoSyncInFlight || !bootstrapReadyForSectionLoads) {
    return;
  }
  if (document.hidden || getActiveSectionId() !== "agenda" || !state.google_calendar?.connected) {
    return;
  }
  if (
    isElementVisible(elements.appointmentModal) ||
    isElementVisible(elements.availabilityModal) ||
    agendaDragState.appointmentId
  ) {
    return;
  }
  agendaAutoSyncInFlight = true;
  const openDetailId = getOpenAppointmentDetailId();
  try {
    await refreshData({ sections: AGENDA_REFRESH_SECTIONS, render: true });
    if (openDetailId && getAppointmentById(openDetailId)) {
      openAppointmentDetailModal(openDetailId);
    }
  } catch (error) {
    console.warn("Sincronizacion automatica de agenda omitida:", error);
  } finally {
    agendaAutoSyncInFlight = false;
  }
}

function startAgendaAutoSync() {
  if (agendaAutoSyncTimerId) {
    window.clearInterval(agendaAutoSyncTimerId);
  }
  agendaAutoSyncTimerId = window.setInterval(() => {
    void runAgendaAutoSync();
  }, 60000);
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
  const configuredSlots = buildAgendaSlots(dateValue);
  const slots = getAvailableSlotsForDate(dateValue);
  const selectedValue = startValue ? toInputDateTime(startValue) : "";
  const currentDuration = Number(elements.appointmentDurationInput?.value || 30);
  const hasSelectedAvailableSlot = selectedValue
    ? slots.some((slot) => toInputDateTime(slot.slot_at) === selectedValue)
    : false;
  if (!slots.length && !selectedValue) {
    const emptyMessage = configuredSlots.length
      ? "No hay horarios libres para este dia."
      : "No hay horarios configurados para este dia.";
    elements.appointmentSlotsStrip.innerHTML =
      `<div class="appointment-slots-empty">${escapeHtml(emptyMessage)}</div>`;
    elements.appointmentSlotsStrip.classList.remove("is-hidden");
    return;
  }
  const options = [
    `<option value="" disabled${selectedValue ? "" : " selected"}>Selecciona una hora disponible</option>`,
  ];
  if (selectedValue && !hasSelectedAvailableSlot) {
    options.push(
      `<option value="${escapeHtml(selectedValue)}" data-slot-minutes="${escapeHtml(
        String(currentDuration || 30)
      )}" selected>${escapeHtml(
        `${formatAgendaTimeShort(selectedValue)} - ${currentDuration || 30} min (hora actual)`
      )}</option>`
    );
  }
  slots.forEach((slot) => {
    const duration = Number(slot.duration_minutes || 30);
    const localValue = toInputDateTime(slot.slot_at);
    const isSelected = selectedValue && localValue === selectedValue;
    const label = `${slot.label} - ${duration} min`;
    options.push(
      `<option value="${escapeHtml(localValue)}" data-slot-minutes="${escapeHtml(
        String(duration)
      )}"${isSelected ? " selected" : ""}>${escapeHtml(label)}</option>`
    );
  });
  const helper =
    !slots.length && selectedValue
      ? `<div class="appointment-slots-empty">${escapeHtml(
          configuredSlots.length
            ? "No hay horarios libres para este dia. Conservas la hora actual hasta que elijas una nueva."
            : "No hay horarios configurados para este dia. Conservas la hora actual hasta que elijas una nueva."
        )}</div>`
      : "";
  elements.appointmentSlotsStrip.innerHTML = `
    <select
      class="appointment-slot-select"
      data-appointment-slot-select="true"
      aria-label="Horas disponibles"
    >
      ${options.join("")}
    </select>
    ${helper}
  `;
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
  openAppointmentModal("", Number(elements.appointmentDurationInput?.value || 30), {
    allowBlankStart: true,
  });
  setAppointmentFormFeedback(
    buildAgendaSlots(targetDate).length
      ? "No hay horarios libres para este dia. Elige otra fecha o ajusta la hora."
      : "No hay horarios configurados para este dia. Crea disponibilidad o elige otra fecha.",
    "info"
  );
}

function openAppointmentModalForSlot(slotAt, durationMinutes) {
  const targetDate = toIsoDate(slotAt);
  if (targetDate) {
    setAgendaSelectedDate(targetDate);
  }
  openAppointmentModal(slotAt, durationMinutes);
}

function buildAppointmentRescheduleFeedback(targetDate) {
  const normalizedDate = toIsoDate(targetDate);
  if (!normalizedDate) {
    return "Selecciona la nueva hora para reprogramar la cita.";
  }
  const availableSlots = getAvailableSlotsForDate(normalizedDate);
  const configuredSlots = buildAgendaSlots(normalizedDate);
  const dateLabel = formatAgendaDateLabel(normalizedDate);
  if (availableSlots.length) {
    return `Reprogramando para ${dateLabel}. Selecciona la nueva hora.`;
  }
  if (configuredSlots.length) {
    return `Reprogramando para ${dateLabel}. No hay horarios libres; ajusta la hora o elige otro dia.`;
  }
  return `Reprogramando para ${dateLabel}. No hay horarios configurados; elige la hora manualmente o crea disponibilidad.`;
}

function openAppointmentModal(initialDateTime = "", durationMinutes = 30, options = {}) {
  const { allowBlankStart = false } = options;
  const hasInitialDateTime = Boolean(initialDateTime);
  const dateTimeValue = hasInitialDateTime ? initialDateTime : `${agendaSelectedDate}T08:00`;
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
    elements.appointmentStartInput.value =
      allowBlankStart && !hasInitialDateTime ? "" : toInputDateTime(dateTimeValue);
  }
  if (elements.appointmentEndInput) {
    elements.appointmentEndInput.value =
      allowBlankStart && !hasInitialDateTime
        ? ""
        : buildAppointmentEndValue(dateTimeValue, durationMinutes);
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
  clearAppointmentFormFeedback();
  renderAppointmentPatientDropdown();
  syncAppointmentSelectedDate();
}

function openAppointmentModalForEdit(appointment, options = {}) {
  if (!appointment) {
    return;
  }
  const { targetDate = "", requireNewTime = false } = options;
  const normalizedTargetDate = toIsoDate(targetDate);
  if (normalizedTargetDate) {
    setAgendaSelectedDate(normalizedTargetDate);
  }
  openAppointmentModal(
    requireNewTime ? "" : appointment.appointment_at,
    Number(appointment.duration_minutes || 30),
    { allowBlankStart: requireNewTime }
  );
  if (elements.appointmentModalTitle) {
    elements.appointmentModalTitle.textContent = requireNewTime ? "Reprogramar cita" : "Editar cita";
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
    elements.appointmentTypeSelect.value = getAgendaAppointmentTypeFormValue(
      detectAgendaAppointmentType(appointment)
    );
  }
  if (elements.appointmentForm?.elements?.reason) {
    elements.appointmentForm.elements.reason.value =
      stripAgendaAppointmentTypePrefix(appointment.reason) || appointment.reason || "";
  }
  if (elements.appointmentForm?.elements?.notes) {
    elements.appointmentForm.elements.notes.value = appointment.notes || "";
  }
  renderAppointmentPatientDropdown();
  syncAppointmentSelectedDate();
  if (requireNewTime) {
    setAppointmentFormFeedback(buildAppointmentRescheduleFeedback(normalizedTargetDate), "info");
  }
}

function openAppointmentModalForRescheduleDate(appointmentId, targetDate) {
  const appointment = getAppointmentById(appointmentId);
  const normalizedTargetDate = toIsoDate(targetDate);
  if (!appointment || !normalizedTargetDate) {
    return;
  }
  closeAppointmentDetailModal();
  openAppointmentModalForEdit(appointment, {
    targetDate: normalizedTargetDate,
    requireNewTime: true,
  });
}

function closeAppointmentModal() {
  elements.appointmentModal.classList.add("is-hidden");
  elements.appointmentModal.setAttribute("aria-hidden", "true");
  clearAppointmentFormFeedback();
}

function buildAppointmentDetailPatientSnapshotMarkup(appointment) {
  const owner = getAppointmentOwner(appointment);
  const patient = getAppointmentPatient(appointment);
  const presentation = buildAgendaAppointmentPresentation(appointment);
  const phone = owner?.phone || owner?.alternate_phone || "Sin telefono";
  const cards = [
    ["Paciente", patient?.name || appointment.patient_name || "Sin dato"],
    ["Tutor", owner?.full_name || appointment.owner_name || "Sin dato"],
    ["Telefono", phone],
    ["Edad", formatPatientAgeLabel(patient)],
    ["Servicio", presentation.subtitle || appointment.reason || "Sin dato"],
  ];
  return cards
    .map(
      ([label, value]) => `
        <article class="appointment-detail-patient-card">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </article>
      `
    )
    .join("");
}

function openAppointmentDetailModal(appointmentId) {
  if (!elements.appointmentDetailModal) {
    return;
  }
  const appointment = getAppointmentById(appointmentId);
  if (!appointment) {
    showStatus("No se encontro la cita seleccionada.", "error");
    return;
  }
  const owner = getAppointmentOwner(appointment);
  const patient = getAppointmentPatient(appointment);
  const presentation = buildAgendaAppointmentPresentation(appointment);
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
    elements.appointmentDetailStatus.innerHTML = buildAppointmentStatusBadgeMarkup(appointment.status);
  }
  if (elements.appointmentDetailQuickCard) {
    elements.appointmentDetailQuickCard.innerHTML = `
      <div class="appointment-detail-quick-card__avatar">${escapeHtml(
        getAgendaEntityInitials(patient?.name || appointment.patient_name, "CT")
      )}</div>
      <div class="appointment-detail-quick-card__copy">
        <strong>${escapeHtml(patient?.name || appointment.patient_name || "Paciente")}</strong>
        <span>${escapeHtml(owner?.full_name || appointment.owner_name || "Sin tutor")}</span>
        <small>${escapeHtml(
          [presentation.subtitle || presentation.meta.label, `${duration} min`].filter(Boolean).join(" · ")
        )}</small>
      </div>
    `;
  }
  const summary = [
    ["Propietario", owner?.full_name || appointment.owner_name || "Sin dato"],
    ["Correo", owner?.email || "Sin dato"],
    ["Encargado", appointment.professional_name || "Agenda general"],
    ["Duracion", `${duration} min`],
  ];
  const googleInvitationLabel = appointment.google_event_id
    ? getGoogleAttendeeResponseLabel(appointment.google_attendee_response_status) || "Invitacion enviada"
    : "";
  if (googleInvitationLabel) {
    summary.push(["Invitacion Google", googleInvitationLabel]);
  }
  renderSummary(elements.appointmentDetailSummary, summary, "Sin informacion disponible.");
  if (elements.appointmentDetailPatientSnapshot) {
    elements.appointmentDetailPatientSnapshot.innerHTML = buildAppointmentDetailPatientSnapshotMarkup(
      appointment
    );
  }
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
  if (elements.appointmentDetailStatusSelect) {
    elements.appointmentDetailStatusSelect.innerHTML = buildAppointmentStatusSelectOptions(
      appointment.status
    );
    elements.appointmentDetailStatusSelect.value = appointment.status || "scheduled";
  }
  if (elements.appointmentDetailStatusButton) {
    elements.appointmentDetailStatusButton.dataset.appointmentId = appointment.id || "";
  }
  if (elements.appointmentDetailReminderButton) {
    const hasEmail = Boolean(owner?.email);
    elements.appointmentDetailReminderButton.dataset.appointmentId = appointment.id || "";
    elements.appointmentDetailReminderButton.disabled =
      isTerminalAppointmentStatus(appointment.status) || !hasEmail;
  }
  if (elements.appointmentDetailEditButton) {
    elements.appointmentDetailEditButton.dataset.appointmentId = appointment.id || "";
  }
  elements.appointmentDetailModal.dataset.appointmentId = appointment.id || "";
  elements.appointmentDetailModal.classList.remove("is-hidden");
  elements.appointmentDetailModal.setAttribute("aria-hidden", "false");
}

function closeAppointmentDetailModal() {
  if (!elements.appointmentDetailModal) {
    return;
  }
  elements.appointmentDetailModal.classList.add("is-hidden");
  elements.appointmentDetailModal.setAttribute("aria-hidden", "true");
  delete elements.appointmentDetailModal.dataset.appointmentId;
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

function renderInventoryItemModal() {
  if (!elements.inventoryItemModalBody) {
    return;
  }
  const itemId = String(inventoryUiState.detailItemId || "");
  if (!itemId) {
    elements.inventoryItemModalBody.innerHTML = "";
    if (elements.inventoryItemModalSummary) {
      elements.inventoryItemModalSummary.textContent =
        "Selecciona un producto para revisar su configuracion comercial.";
    }
    return;
  }
  const item = state.catalog_items.find((entry) => String(entry.id || "") === itemId);
  if (!item) {
    closeInventoryItemModal();
    return;
  }
  const previewPrice = computeCatalogSalePrice(
    Number(item.purchase_cost || 0),
    Number(item.presentation_total || 1) || 1,
    Number(item.margin_percent || 0)
  );
  elements.inventoryItemModalBody.innerHTML = buildInventoryDetailPanel(item);
  if (elements.inventoryItemModalTitle) {
    elements.inventoryItemModalTitle.textContent = item.name || "Configuracion comercial";
  }
  if (elements.inventoryItemModalSummary) {
    elements.inventoryItemModalSummary.textContent = `${
      item.category || "Sin categoria"
    } · ${item.provider_name || "Sin proveedor"} · ${formatMoney(previewPrice)}`;
  }
}

function openInventoryItemModal(itemId) {
  if (!elements.inventoryItemModal) {
    return;
  }
  inventoryUiState.detailItemId = String(itemId || "");
  inventoryUiState.selectedItemId = String(itemId || inventoryUiState.selectedItemId || "");
  renderInventoryItemModal();
  elements.inventoryItemModal.parentElement?.appendChild(elements.inventoryItemModal);
  elements.inventoryItemModal.classList.remove("is-hidden");
  elements.inventoryItemModal.setAttribute("aria-hidden", "false");
  syncModalOpenState();
}

function closeInventoryItemModal() {
  if (!elements.inventoryItemModal) {
    return;
  }
  elements.inventoryItemModal.classList.add("is-hidden");
  elements.inventoryItemModal.setAttribute("aria-hidden", "true");
  inventoryUiState.detailItemId = "";
  syncModalOpenState();
}

function renderProviderDirectoryModal() {
  if (!elements.providerDirectoryModalBody) {
    return;
  }
  elements.providerDirectoryModalBody.innerHTML = buildInventoryProviderRoster();
  if (elements.providerDirectoryModalSummary) {
    const providers = Array.isArray(state.providers) ? state.providers.length : 0;
    elements.providerDirectoryModalSummary.textContent = providers
      ? `${providers} ${providers === 1 ? "proveedor registrado" : "proveedores registrados"}`
      : "Aun no hay proveedores registrados.";
  }
}

function openProviderDirectoryModal() {
  if (!elements.providerDirectoryModal) {
    return;
  }
  renderProviderDirectoryModal();
  elements.providerDirectoryModal.parentElement?.appendChild(elements.providerDirectoryModal);
  elements.providerDirectoryModal.classList.remove("is-hidden");
  elements.providerDirectoryModal.setAttribute("aria-hidden", "false");
  syncModalOpenState();
}

function closeProviderDirectoryModal() {
  if (!elements.providerDirectoryModal) {
    return;
  }
  elements.providerDirectoryModal.classList.add("is-hidden");
  elements.providerDirectoryModal.setAttribute("aria-hidden", "true");
  syncModalOpenState();
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

function ensureConsultorioSelectOption(selectElement, value) {
  if (!selectElement || !value) {
    return;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return;
  }
  const exists = Array.from(selectElement.options).some((option) => option.value === normalized);
  if (!exists) {
    const dynamicOption = document.createElement("option");
    dynamicOption.value = normalized;
    dynamicOption.textContent = normalized;
    selectElement.appendChild(dynamicOption);
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

async function addPatientImagingAttachmentImages(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) {
    return;
  }
  const currentItems = getPatientImagingAttachments();
  for (const file of files) {
    currentItems.push(await buildConsultorioImageAttachment(file));
  }
  setPatientImagingAttachments(currentItems);
}

function setPatientImagingAttachments(items = []) {
  renderConsultorioAttachmentFieldState(
    elements.patientImagingAttachmentsValue,
    elements.patientImagingAttachmentsList,
    items
  );
}

function getPatientImagingAttachments() {
  return getConsultorioAttachmentFieldItems(elements.patientImagingAttachmentsValue);
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

async function addPatientProcedureAttachmentImages(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) {
    return;
  }
  const currentItems = getPatientProcedureAttachments();
  for (const file of files) {
    currentItems.push(await buildConsultorioImageAttachment(file));
  }
  setPatientProcedureAttachments(currentItems);
}

function setPatientProcedureAttachments(items = []) {
  renderConsultorioAttachmentFieldState(
    elements.patientProcedureAttachmentsValue,
    elements.patientProcedureAttachmentsList,
    items
  );
}

function getPatientProcedureAttachments() {
  return getConsultorioAttachmentFieldItems(elements.patientProcedureAttachmentsValue);
}

async function addGroomingBeforeAttachmentImages(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) {
    return;
  }
  const currentItems = getGroomingBeforeAttachments();
  for (const file of files) {
    currentItems.push(await buildConsultorioImageAttachment(file));
  }
  setGroomingBeforeAttachments(currentItems);
}

function setGroomingBeforeAttachments(items = []) {
  renderConsultorioAttachmentFieldState(
    elements.groomingBeforePhotosValue,
    elements.groomingBeforePhotosList,
    items
  );
}

function getGroomingBeforeAttachments() {
  return getConsultorioAttachmentFieldItems(elements.groomingBeforePhotosValue);
}

async function addGroomingAfterAttachmentImages(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) {
    return;
  }
  const currentItems = getGroomingAfterAttachments();
  for (const file of files) {
    currentItems.push(await buildConsultorioImageAttachment(file));
  }
  setGroomingAfterAttachments(currentItems);
}

function setGroomingAfterAttachments(items = []) {
  renderConsultorioAttachmentFieldState(
    elements.groomingAfterPhotosValue,
    elements.groomingAfterPhotosList,
    items
  );
}

function getGroomingAfterAttachments() {
  return getConsultorioAttachmentFieldItems(elements.groomingAfterPhotosValue);
}

function renderGroomingServiceItems(items = []) {
  if (!elements.groomingServicesList || !elements.groomingServicesValue) {
    return;
  }
  const normalizedItems = (Array.isArray(items) ? items : []).map((item) =>
    normalizeGroomingServiceItem(item)
  );
  const rows = normalizedItems.length ? normalizedItems : [normalizeGroomingServiceItem()];
  elements.groomingServicesValue.value = serializeGroomingServiceDetails(
    rows.filter((item) => hasGroomingServiceItemContent(item))
  );
  elements.groomingServicesList.innerHTML = rows
    .map((item, index) => {
      const staffOptions = getGroomingStaffOptions(item.professional);
      return `
        <article class="consultorio-order-item grooming-service-item" data-grooming-service-item="${escapeHtml(
          String(index)
        )}">
          <div class="consultorio-order-item__header grooming-service-item__header">
            <div class="consultorio-order-item__title grooming-service-item__title">
              <span class="consultorio-order-item__icon grooming-service-item__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="6" cy="7" r="2"></circle>
                  <circle cx="6" cy="17" r="2"></circle>
                  <path d="M8 8l10 10"></path>
                  <path d="M8 16 18 6"></path>
                </svg>
              </span>
              <strong>${rows.length > 1 ? `Servicio ${index + 1}` : "Servicio"}</strong>
            </div>
            <div class="consultorio-order-item__actions">
              <button
                class="inline-link consultorio-order-item__remove grooming-service-item__remove"
                type="button"
                data-remove-grooming-service-item="${escapeHtml(String(index))}"
              >
                × Eliminar
              </button>
            </div>
          </div>

          <div class="consultorio-order-item__grid grooming-service-item__grid">
            <label class="consultorio-consultation-form__field">
              <span>Tipo de servicio</span>
              <select data-grooming-service-field="serviceType">
                <option value="">Selecciona una opcion</option>
                ${GROOMING_SERVICE_TYPE_OPTIONS.map(
                  (option) =>
                    `<option value="${escapeHtml(option)}"${
                      option === item.serviceType ? " selected" : ""
                    }>${escapeHtml(option)}</option>`
                ).join("")}
              </select>
            </label>

            <label class="consultorio-consultation-form__field">
              <span>Motivo / servicio</span>
              <input
                data-grooming-service-field="motive"
                type="text"
                value="${escapeHtml(item.motive)}"
                placeholder="Opcional. Motivo o especificacion del servicio"
              />
            </label>

            <label class="consultorio-consultation-form__field">
              <span>Encargado</span>
              <select data-grooming-service-field="professional">
                <option value="">Opcional. Selecciona una opcion</option>
                ${staffOptions
                  .map(
                    (option) =>
                      `<option value="${escapeHtml(option)}"${
                        option === item.professional ? " selected" : ""
                      }>${escapeHtml(option)}</option>`
                  )
                  .join("")}
              </select>
            </label>

            <label class="consultorio-consultation-form__field full grooming-service-item__details">
              <span>Detalles</span>
              <textarea
                data-grooming-service-field="details"
                rows="2"
                placeholder="Detalles y observaciones"
              >${escapeHtml(item.details)}</textarea>
            </label>
          </div>
        </article>
      `;
    })
    .join("");
}

function getGroomingServiceItems({ includeEmpty = false } = {}) {
  if (!elements.groomingServicesList) {
    return [];
  }
  const items = Array.from(
    elements.groomingServicesList.querySelectorAll("[data-grooming-service-item]")
  ).map((item) =>
    normalizeGroomingServiceItem({
      serviceType:
        item.querySelector('[data-grooming-service-field="serviceType"]')?.value || "",
      motive: item.querySelector('[data-grooming-service-field="motive"]')?.value || "",
      professional:
        item.querySelector('[data-grooming-service-field="professional"]')?.value || "",
      details: item.querySelector('[data-grooming-service-field="details"]')?.value || "",
    })
  );
  return includeEmpty ? items : items.filter((item) => hasGroomingServiceItemContent(item));
}

function syncGroomingServiceItemsValue() {
  if (!elements.groomingServicesValue || !elements.groomingForm) {
    return;
  }
  const services = getGroomingServiceItems();
  elements.groomingServicesValue.value = serializeGroomingServiceDetails(services);
  const serviceNameField = elements.groomingForm.elements?.service_name;
  if (serviceNameField) {
    serviceNameField.value = buildGroomingServiceSummary(services, "");
  }
  const stylistField = elements.groomingForm.elements?.stylist_name;
  if (stylistField) {
    stylistField.value = buildGroomingProfessionalSummary(services, "");
  }
}

function buildConsultorioDocumentPlaceholder(label = "por completar") {
  const normalized = String(label || "").trim().toLowerCase();
  return `[Completar ${normalized || "este campo"}]`;
}

function getConsultorioDocumentValue(value, label = "por completar") {
  const normalized = String(value ?? "").trim();
  return normalized || buildConsultorioDocumentPlaceholder(label);
}

function getConsultorioDocumentJoinedValue(values = [], label = "por completar") {
  const normalized = values.map((item) => String(item || "").trim()).filter(Boolean).join(" / ");
  return normalized || buildConsultorioDocumentPlaceholder(label);
}

function buildConsultorioDocumentTitleBlock(title, context, intro = "") {
  return [
    `<h2>${escapeHtml(title)}</h2>`,
    `<p><strong>Centro veterinario:</strong> ${escapeHtml(
      getConsultorioDocumentValue(context?.clinicName, "centro veterinario")
    )}</p>`,
    `<p><strong>Fecha:</strong> ${escapeHtml(
      getConsultorioDocumentValue(context?.documentDate, "fecha del documento")
    )}</p>`,
    intro ? `<p>${escapeHtml(intro)}</p>` : "",
  ].join("");
}

function buildConsultorioDocumentTable(items = [], columns = 2) {
  const normalizedItems = items
    .map((item) =>
      Array.isArray(item)
        ? { label: String(item[0] || "").trim(), value: String(item[1] || "").trim() }
        : {
            label: String(item?.label || "").trim(),
            value: String(item?.value || "").trim(),
          }
    )
    .filter((item) => item.label);
  if (!normalizedItems.length) {
    return "";
  }
  const safeColumns = Math.max(1, Math.min(Number(columns) || 2, 4));
  const rows = [];
  for (let index = 0; index < normalizedItems.length; index += safeColumns) {
    const slice = normalizedItems.slice(index, index + safeColumns);
    const cells = slice
      .map(
        (item) =>
          `<td><strong>${escapeHtml(item.label)}:</strong><br>${escapeHtml(
            item.value || buildConsultorioDocumentPlaceholder(item.label)
          )}</td>`
      )
      .join("");
    rows.push(
      `<tr>${cells}${Array.from({ length: safeColumns - slice.length }, () => "<td></td>").join(
        ""
      )}</tr>`
    );
  }
  return `<table><tbody>${rows.join("")}</tbody></table>`;
}

function buildConsultorioDocumentSection(title, bodyHtml) {
  return `<h3>${escapeHtml(title)}</h3>${bodyHtml}`;
}

function buildConsultorioDocumentList(items = []) {
  if (!items.length) {
    return "";
  }
  return `<ul>${items
    .map((item) => `<li>${escapeHtml(String(item || "").trim())}</li>`)
    .join("")}</ul>`;
}

function buildConsultorioDocumentParagraph(label, value) {
  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(
    getConsultorioDocumentValue(value, label)
  )}</p>`;
}

function getConsultorioDocumentOwnerName(context) {
  return getConsultorioDocumentValue(
    context?.owner?.full_name || context?.patient?.owner_name || "",
    "nombre del propietario"
  );
}

function getConsultorioDocumentOwnerId(context) {
  return getConsultorioDocumentJoinedValue(
    [context?.owner?.identification_type, context?.owner?.identification_number],
    "documento del propietario"
  );
}

function getConsultorioDocumentOwnerPhone(context) {
  return getConsultorioDocumentJoinedValue(
    [context?.owner?.phone, context?.owner?.alternate_phone],
    "telefono del propietario"
  );
}

function getConsultorioDocumentOwnerEmail(context) {
  return getConsultorioDocumentValue(context?.owner?.email || "", "correo del propietario");
}

function getConsultorioDocumentOwnerAddress(context) {
  return getConsultorioDocumentValue(
    context?.owner?.address || "",
    "direccion del propietario"
  );
}

function getConsultorioDocumentPatientName(context) {
  return getConsultorioDocumentValue(context?.patient?.name || "", "nombre de la mascota");
}

function getConsultorioDocumentPatientSpecies(context) {
  return getConsultorioDocumentValue(context?.patient?.species || "", "especie");
}

function getConsultorioDocumentPatientBreed(context) {
  return getConsultorioDocumentValue(context?.patient?.breed || "", "raza");
}

function getConsultorioDocumentPatientSex(context) {
  return getConsultorioDocumentValue(context?.patient?.sex || "", "sexo");
}

function getConsultorioDocumentPatientAge(context) {
  return context?.patient?.age_years
    ? `${context.patient.age_years} anos`
    : buildConsultorioDocumentPlaceholder("edad");
}

function getConsultorioDocumentPatientWeight(context) {
  return context?.patient?.weight_kg
    ? `${context.patient.weight_kg} kg`
    : buildConsultorioDocumentPlaceholder("peso");
}

function getConsultorioDocumentPatientMicrochip(context) {
  return getConsultorioDocumentValue(context?.patient?.microchip || "", "microchip");
}

function getConsultorioDocumentClinicAddress(context) {
  return getConsultorioDocumentValue(
    context?.clinicAddress,
    "direccion del responsable del tratamiento"
  );
}

function getConsultorioDocumentClinicPhone(context) {
  return getConsultorioDocumentValue(
    context?.clinicPhone,
    "telefono del responsable del tratamiento"
  );
}

function getConsultorioDocumentClinicEmail(context) {
  return getConsultorioDocumentValue(
    context?.clinicEmail,
    "correo del responsable del tratamiento"
  );
}

function getConsultorioDocumentClinicalRecordNumber(context) {
  return getConsultorioDocumentValue(
    context?.clinicalRecordNumber,
    "consecutivo de historia clinica"
  );
}

function buildConsultorioDocumentOwnerSection(context) {
  return buildConsultorioDocumentSection(
    "Datos del propietario",
    buildConsultorioDocumentTable(
      [
        ["Nombre completo", getConsultorioDocumentOwnerName(context)],
        ["Documento", getConsultorioDocumentOwnerId(context)],
        ["Telefono", getConsultorioDocumentOwnerPhone(context)],
        ["Correo", getConsultorioDocumentOwnerEmail(context)],
        ["Direccion", getConsultorioDocumentOwnerAddress(context)],
      ],
      2
    )
  );
}

function buildConsultorioDocumentPatientSection(context) {
  return buildConsultorioDocumentSection(
    "Datos de la mascota",
    buildConsultorioDocumentTable(
      [
        ["Nombre", getConsultorioDocumentPatientName(context)],
        ["Especie", getConsultorioDocumentPatientSpecies(context)],
        ["Raza", getConsultorioDocumentPatientBreed(context)],
        ["Sexo", getConsultorioDocumentPatientSex(context)],
        ["Edad", getConsultorioDocumentPatientAge(context)],
        ["Peso", getConsultorioDocumentPatientWeight(context)],
        ["Microchip", getConsultorioDocumentPatientMicrochip(context)],
      ],
      3
    )
  );
}

function buildConsultorioDocumentProfessionalSection(context) {
  return buildConsultorioDocumentSection(
    "Profesional responsable",
    buildConsultorioDocumentTable(
      [
        ["Nombre", getConsultorioDocumentValue(context?.professionalName, "profesional responsable")],
        ["Registro", getConsultorioDocumentValue(context?.professionalLicense, "registro profesional")],
      ],
      2
    )
  );
}

function buildConsultorioDocumentTraceabilitySection(context) {
  return buildConsultorioDocumentSection(
    "Identificacion del documento y trazabilidad",
    buildConsultorioDocumentTable(
      [
        ["Historia clinica / consecutivo", getConsultorioDocumentClinicalRecordNumber(context)],
        ["Fecha y hora", getConsultorioDocumentValue(context?.documentDate, "fecha y hora")],
        ["Jurisdiccion", getConsultorioDocumentValue(context?.jurisdiction, "jurisdiccion")],
        ["Institucion responsable", getConsultorioDocumentValue(context?.clinicName, "institucion responsable")],
      ],
      2
    )
  );
}

function buildConsultorioDocumentDataProtectionSection(
  context,
  { includeSensitiveData = true, includeImages = false } = {}
) {
  const notes = [
    "El propietario es informado de la finalidad asistencial, clinica, administrativa y de contacto para la cual se recolectan sus datos personales dentro de la atencion veterinaria.",
    "Se informa el caracter facultativo de las respuestas sobre datos sensibles cuando no sean estrictamente necesarias para la atencion o para soportar la autorizacion.",
    "Se informa que puede ejercer los derechos de conocer, actualizar, rectificar, solicitar prueba de la autorizacion, revocar cuando proceda y acceder gratuitamente a sus datos personales.",
    `Datos de contacto del responsable del tratamiento: direccion ${getConsultorioDocumentClinicAddress(
      context
    )}, correo ${getConsultorioDocumentClinicEmail(context)} y telefono ${getConsultorioDocumentClinicPhone(
      context
    )}.`,
  ];
  if (includeSensitiveData) {
    notes.push(
      "Se solicita autorizacion expresa para el tratamiento de datos sensibles y biometrico de firma que sean necesarios para la atencion, soporte contractual y custodia del documento."
    );
  }
  if (includeImages) {
    notes.push(
      "Si se recolectan imagenes o videos del paciente o del procedimiento, cualquier uso diferente a la atencion clinica debera contar con autorizacion expresa y separada del propietario."
    );
  }
  return buildConsultorioDocumentSection("Proteccion de datos y reserva", buildConsultorioDocumentList(notes));
}

function buildConsultorioDocumentCustodySection(context) {
  return buildConsultorioDocumentSection(
    "Custodia documental",
    buildConsultorioDocumentList([
      "Este documento forma parte de los anexos de la historia clinica veterinaria del paciente.",
      getConsultorioDocumentValue(
        context?.retentionNote,
        "nota de retencion documental"
      ),
      "El acceso al expediente debe mantenerse con reserva y solo para fines legalmente procedentes.",
    ])
  );
}

function buildConsultorioDocumentConsentComplianceSection(
  context,
  { includeEconomicScope = true, includeImages = false } = {}
) {
  const tableRows = [
    ["Alternativas explicadas", buildConsultorioDocumentPlaceholder("alternativas razonables explicadas")],
    ["Beneficios esperados", buildConsultorioDocumentPlaceholder("beneficios esperados")],
    ["Riesgos frecuentes y graves", buildConsultorioDocumentPlaceholder("riesgos frecuentes y riesgos graves")],
    ["Pronostico con y sin procedimiento", buildConsultorioDocumentPlaceholder("pronostico con y sin procedimiento")],
    ["Calidad del firmante", buildConsultorioDocumentPlaceholder("si firma como propietario o responsable")],
    [
      "Copia del documento del firmante",
      buildConsultorioDocumentPlaceholder("si se adjunta copia del documento de identificacion"),
    ],
  ];
  if (includeEconomicScope) {
    tableRows.push([
      "Condiciones economicas y limite de gasto",
      buildConsultorioDocumentPlaceholder("condiciones economicas y limite de gasto autorizado"),
    ]);
  }
  if (includeImages) {
    tableRows.push([
      "Autorizacion de imagenes o videos",
      buildConsultorioDocumentPlaceholder("alcance de la autorizacion de imagenes o videos"),
    ]);
  }
  return buildConsultorioDocumentSection(
    "Minimos del consentimiento informado",
    [
      buildConsultorioDocumentTable(tableRows, 2),
      buildConsultorioDocumentList([
        "El profesional deja constancia de haber brindado informacion suficiente, clara y comprensible sobre el procedimiento o decision clinica.",
        "El propietario manifiesta haber tenido oportunidad de formular preguntas y recibir respuesta.",
        "Si se entrega copia del documento al propietario, debe dejarse constancia en este formato.",
      ]),
    ].join("")
  );
}

function buildConsultorioDocumentProfessionalSignatureSection(
  context,
  label = "Medico veterinario o MVZ"
) {
  if (!context?.signatureConfig?.enabled || !context?.signatureConfig?.professional) {
    return "";
  }
  return buildConsultorioDocumentSection(
    "Cierre profesional",
    `
      <table>
        <tbody>
          <tr>
            <td><strong>Firma ${escapeHtml(label)}:</strong><br><br>____________________________</td>
            <td><strong>Nombre:</strong><br>${escapeHtml(
              getConsultorioDocumentValue(context?.professionalName, "profesional responsable")
            )}</td>
            <td><strong>Matricula / registro:</strong><br>${escapeHtml(
              getConsultorioDocumentValue(context?.professionalLicense, "registro profesional")
            )}</td>
          </tr>
          <tr>
            <td><strong>Institucion:</strong><br>${escapeHtml(
              getConsultorioDocumentValue(context?.clinicName, "institucion responsable")
            )}</td>
            <td><strong>Fecha:</strong><br>${escapeHtml(
              getConsultorioDocumentValue(context?.documentDate, "fecha del documento")
            )}</td>
            <td><strong>Historia clinica:</strong><br>${escapeHtml(
              getConsultorioDocumentClinicalRecordNumber(context)
            )}</td>
          </tr>
        </tbody>
      </table>
    `
  );
}

function buildConsultorioDocumentSignatureSection(
  context,
  {
    ownerLabel = "Propietario o responsable",
    professionalLabel = "Profesional tratante",
  } = {}
) {
  const ownerEnabled = Boolean(context?.signatureConfig?.enabled && context?.signatureConfig?.owner);
  const professionalEnabled = Boolean(
    context?.signatureConfig?.enabled && context?.signatureConfig?.professional
  );
  const cells = [];
  const names = [];
  const details = [];
  const footer = [];
  if (ownerEnabled) {
    cells.push(
      `<td><strong>Firma ${escapeHtml(ownerLabel)}:</strong><br><br>____________________________</td>`
    );
    names.push(
      `<td><strong>Nombre:</strong> ${escapeHtml(getConsultorioDocumentOwnerName(context))}</td>`
    );
    details.push(
      `<td><strong>Documento:</strong> ${escapeHtml(getConsultorioDocumentOwnerId(context))}</td>`
    );
    footer.push(
      `<td><strong>Fecha:</strong> ${escapeHtml(
        getConsultorioDocumentValue(context?.documentDate, "fecha del documento")
      )}</td>`
    );
  }
  if (professionalEnabled) {
    cells.push(
      `<td><strong>Firma ${escapeHtml(professionalLabel)}:</strong><br><br>____________________________</td>`
    );
    names.push(
      `<td><strong>Nombre:</strong> ${escapeHtml(
        getConsultorioDocumentValue(context?.professionalName, "profesional responsable")
      )}</td>`
    );
    details.push(
      `<td><strong>Matricula / registro:</strong> ${escapeHtml(
        getConsultorioDocumentValue(context?.professionalLicense, "registro profesional")
      )}</td>`
    );
    footer.push(
      `<td><strong>Constancia:</strong> ${escapeHtml(
        buildConsultorioDocumentPlaceholder("si se entrega copia al propietario")
      )}</td>`
    );
  }
  if (!cells.length) {
    return "";
  }
  return buildConsultorioDocumentSection(
    "Firmas",
    `
      <table>
        <tbody>
          <tr>${cells.join("")}</tr>
          <tr>${names.join("")}</tr>
          <tr>${details.join("")}</tr>
          <tr>${footer.join("")}</tr>
        </tbody>
      </table>
    `
  );
}

function buildConsultorioVaccineRecordPlaceholderTable() {
  return `
    <table>
      <tbody>
        <tr>
          <td><strong>Vacuna:</strong><br>${escapeHtml(buildConsultorioDocumentPlaceholder("vacuna aplicada"))}</td>
          <td><strong>Fecha:</strong><br>${escapeHtml(buildConsultorioDocumentPlaceholder("fecha de aplicacion"))}</td>
          <td><strong>Lote / laboratorio:</strong><br>${escapeHtml(
            buildConsultorioDocumentPlaceholder("lote o laboratorio")
          )}</td>
        </tr>
        <tr>
          <td><strong>Refuerzo:</strong><br>${escapeHtml(
            buildConsultorioDocumentPlaceholder("fecha de refuerzo")
          )}</td>
          <td><strong>Via de aplicacion:</strong><br>${escapeHtml(
            buildConsultorioDocumentPlaceholder("via de aplicacion")
          )}</td>
          <td><strong>Observaciones:</strong><br>${escapeHtml(
            buildConsultorioDocumentPlaceholder("observaciones del plan vacunal")
          )}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function buildConsultorioFreeDocumentTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Documento veterinario",
      context,
      "Utiliza esta plantilla para redactar constancias, conceptos o comunicaciones internas."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Asunto y objetivo",
      buildConsultorioDocumentTable(
        [
          ["Asunto", buildConsultorioDocumentPlaceholder("asunto del documento")],
          ["Objetivo", buildConsultorioDocumentPlaceholder("objetivo del documento")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Contenido principal",
      `<p>${escapeHtml(buildConsultorioDocumentPlaceholder("desarrollo del documento"))}</p>`
    ),
    buildConsultorioDocumentSection(
      "Observaciones",
      `<p>${escapeHtml(buildConsultorioDocumentPlaceholder("observaciones finales"))}</p>`
    ),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentSignatureSection(context),
  ].join("");
}

function buildConsultorioSurgeryConsentTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Consentimiento informado para cirugia",
      context,
      "El propietario declara que ha recibido informacion suficiente sobre el procedimiento, la anestesia, los riesgos y las alternativas terapeuticas."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Procedimiento y motivo",
      buildConsultorioDocumentTable(
        [
          ["Diagnostico presuntivo", buildConsultorioDocumentPlaceholder("diagnostico presuntivo")],
          ["Procedimiento autorizado", buildConsultorioDocumentPlaceholder("procedimiento quirurgico autorizado")],
          ["Fecha programada", getConsultorioDocumentValue(context?.documentDateOnly, "fecha programada")],
          ["Ayuno / preparacion", buildConsultorioDocumentPlaceholder("instrucciones de ayuno o preparacion")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Riesgos y autorizaciones",
      buildConsultorioDocumentList([
        "Se explicaron riesgos anestesicos y quirurgicos, incluidos sangrado, infeccion, dehiscencia, reaccion a medicamentos y muerte.",
        "Se autoriza la realizacion de procedimientos adicionales si son necesarios para preservar la vida o el bienestar del paciente.",
        "Se autoriza el uso de analgesia, fluidoterapia, monitoreo y medicamentos de soporte segun criterio medico.",
        `Riesgos puntuales explicados: ${buildConsultorioDocumentPlaceholder("riesgos particulares del caso")}`,
      ])
    ),
    buildConsultorioDocumentSection(
      "Autorizaciones adicionales",
      buildConsultorioDocumentTable(
        [
          ["Examenes preoperatorios", buildConsultorioDocumentPlaceholder("si o no, y cuales")],
          ["Transfusion si se requiere", buildConsultorioDocumentPlaceholder("autorizacion de transfusion")],
          ["Manejo de muestras", buildConsultorioDocumentPlaceholder("manejo de biopsias o muestras")],
          ["Observaciones del propietario", buildConsultorioDocumentPlaceholder("restricciones o solicitudes especiales")],
        ],
        2
      )
    ),
    buildConsultorioDocumentConsentComplianceSection(context, {
      includeEconomicScope: true,
      includeImages: true,
    }),
    buildConsultorioDocumentDataProtectionSection(context, {
      includeSensitiveData: true,
      includeImages: true,
    }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentSignatureSection(context),
  ].join("");
}

function buildConsultorioAnesthesiaConsentTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Consentimiento para anestesia y sedacion",
      context,
      "Esta autorizacion cubre sedacion o anestesia general, monitoreo perioperatorio y maniobras de soporte asociadas."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Evaluacion preanestesica",
      buildConsultorioDocumentTable(
        [
          ["Procedimiento asociado", buildConsultorioDocumentPlaceholder("procedimiento o estudio asociado")],
          ["Valoracion preanestesica", buildConsultorioDocumentPlaceholder("hallazgos de la valoracion preanestesica")],
          ["Ayuno reportado", buildConsultorioDocumentPlaceholder("horas de ayuno")],
          ["ASA o nivel de riesgo", buildConsultorioDocumentPlaceholder("clasificacion de riesgo anestesico")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Plan anestesico",
      buildConsultorioDocumentTable(
        [
          ["Tipo de anestesia", buildConsultorioDocumentPlaceholder("tipo de anestesia o sedacion")],
          ["Medicacion prevista", buildConsultorioDocumentPlaceholder("farmacos estimados")],
          ["Monitoreo", buildConsultorioDocumentPlaceholder("parametros a monitorizar")],
          ["Recuperacion", buildConsultorioDocumentPlaceholder("indicaciones de recuperacion")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Riesgos discutidos",
      buildConsultorioDocumentList([
        "Se explico la posibilidad de hipotension, hipoventilacion, arritmias, reacciones adversas, aspiracion y paro cardiorrespiratorio.",
        `Consideraciones especiales del caso: ${buildConsultorioDocumentPlaceholder("consideraciones especiales")}`,
        "El propietario entiende que la ausencia de complicaciones no puede garantizarse.",
      ])
    ),
    buildConsultorioDocumentConsentComplianceSection(context, {
      includeEconomicScope: true,
    }),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentSignatureSection(context),
  ].join("");
}

function buildConsultorioHospitalizationConsentTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Consentimiento para hospitalizacion",
      context,
      "El propietario autoriza la permanencia del paciente en hospitalizacion y la atencion medica necesaria durante la estancia."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Datos de la hospitalizacion",
      buildConsultorioDocumentTable(
        [
          ["Motivo de ingreso", buildConsultorioDocumentPlaceholder("motivo de hospitalizacion")],
          ["Diagnostico inicial", buildConsultorioDocumentPlaceholder("diagnostico inicial")],
          ["Fecha de ingreso", getConsultorioDocumentValue(context?.documentDateOnly, "fecha de ingreso")],
          ["Contacto secundario", buildConsultorioDocumentPlaceholder("contacto secundario autorizado")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Alcance de la atencion",
      buildConsultorioDocumentList([
        "Se autoriza la administracion de medicamentos, fluidoterapia, monitoreo, alimentacion asistida y manejo del dolor segun criterio medico.",
        "Se autoriza la realizacion de examenes complementarios si son necesarios para ajustar el plan terapeutico.",
        `Condiciones economicas informadas: ${buildConsultorioDocumentPlaceholder("condiciones economicas y autorizacion de gastos")}`,
      ])
    ),
    buildConsultorioDocumentSection(
      "Indicaciones del propietario",
      buildConsultorioDocumentTable(
        [
          ["Medicamentos previos", buildConsultorioDocumentPlaceholder("medicamentos que recibe actualmente")],
          ["Alergias conocidas", buildConsultorioDocumentPlaceholder("alergias o reacciones previas")],
          ["Restricciones o instrucciones", buildConsultorioDocumentPlaceholder("instrucciones del propietario")],
          ["Visitas o comunicacion", buildConsultorioDocumentPlaceholder("acuerdos de visita o reporte")],
        ],
        2
      )
    ),
    buildConsultorioDocumentConsentComplianceSection(context, {
      includeEconomicScope: true,
    }),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentSignatureSection(context),
  ].join("");
}

function buildConsultorioDiagnosticConsentTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Consentimiento para procedimiento diagnostico",
      context,
      "El propietario autoriza la realizacion del estudio diagnostico, toma de muestras y procedimientos complementarios necesarios."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Procedimiento diagnostico",
      buildConsultorioDocumentTable(
        [
          ["Estudio solicitado", buildConsultorioDocumentPlaceholder("procedimiento diagnostico")],
          ["Objetivo del estudio", buildConsultorioDocumentPlaceholder("objetivo del procedimiento")],
          ["Muestras a obtener", buildConsultorioDocumentPlaceholder("muestras o tejidos a recolectar")],
          ["Fecha programada", getConsultorioDocumentValue(context?.documentDateOnly, "fecha programada")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Riesgos y alcances",
      buildConsultorioDocumentList([
        "Se explicaron riesgos de sedacion, sangrado, dolor, infeccion y posibilidad de hallazgos no concluyentes.",
        "Se autoriza el envio de muestras a laboratorio externo si el caso lo requiere.",
        `Autorizaciones adicionales: ${buildConsultorioDocumentPlaceholder("autorizaciones adicionales")}`,
      ])
    ),
    buildConsultorioDocumentSection(
      "Destino de muestras e informe",
      buildConsultorioDocumentTable(
        [
          ["Laboratorio destino", buildConsultorioDocumentPlaceholder("laboratorio destino")],
          ["Medio de entrega del informe", buildConsultorioDocumentPlaceholder("correo, fisico o digital")],
          ["Tiempo estimado", buildConsultorioDocumentPlaceholder("tiempo de entrega")],
          ["Observaciones", buildConsultorioDocumentPlaceholder("observaciones del estudio")],
        ],
        2
      )
    ),
    buildConsultorioDocumentConsentComplianceSection(context, {
      includeEconomicScope: true,
      includeImages: true,
    }),
    buildConsultorioDocumentDataProtectionSection(context, {
      includeSensitiveData: true,
      includeImages: true,
    }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentSignatureSection(context),
  ].join("");
}

function buildConsultorioEuthanasiaConsentTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Consentimiento para eutanasia",
      context,
      "El propietario manifiesta haber recibido explicacion sobre el estado del paciente y autoriza la eutanasia humanitaria."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Justificacion medica o humanitaria",
      buildConsultorioDocumentTable(
        [
          ["Motivo de la decision", buildConsultorioDocumentPlaceholder("motivo clinico o humanitario")],
          ["Diagnostico principal", buildConsultorioDocumentPlaceholder("diagnostico principal")],
          ["Pronostico", buildConsultorioDocumentPlaceholder("pronostico del paciente")],
          ["Metodo autorizado", buildConsultorioDocumentPlaceholder("metodo o protocolo de eutanasia")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Declaracion del propietario",
      buildConsultorioDocumentList([
        "Se explicaron alternativas disponibles, alcance del procedimiento y caracter irreversible de la decision.",
        "El propietario declara ser titular legitimo del animal y tener autoridad para autorizar el procedimiento.",
        `Destino del cuerpo o restos: ${buildConsultorioDocumentPlaceholder("destino final del cuerpo o cremacion")}`,
      ])
    ),
    buildConsultorioDocumentConsentComplianceSection(context, {
      includeEconomicScope: false,
    }),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentSignatureSection(context),
  ].join("");
}

function buildConsultorioBoardingConsentTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Consentimiento para guarderia veterinaria",
      context,
      "El propietario autoriza la estancia del paciente en guarderia u hospedaje y declara haber informado los cuidados especiales requeridos."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Datos de la estancia",
      buildConsultorioDocumentTable(
        [
          ["Fecha de ingreso", getConsultorioDocumentValue(context?.documentDateOnly, "fecha de ingreso")],
          ["Fecha estimada de salida", buildConsultorioDocumentPlaceholder("fecha de salida")],
          ["Contacto de emergencia", buildConsultorioDocumentPlaceholder("contacto de emergencia")],
          ["Persona autorizada para recoger", buildConsultorioDocumentPlaceholder("persona autorizada")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Cuidados especiales",
      buildConsultorioDocumentTable(
        [
          ["Plan de alimentacion", buildConsultorioDocumentPlaceholder("alimentacion y horarios")],
          ["Medicamentos", buildConsultorioDocumentPlaceholder("medicamentos, dosis y horarios")],
          ["Conducta o restricciones", buildConsultorioDocumentPlaceholder("conducta, miedos o restricciones")],
          ["Objetos entregados", buildConsultorioDocumentPlaceholder("objetos entregados con la mascota")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Autorizaciones",
      buildConsultorioDocumentList([
        "Se autoriza atencion veterinaria inmediata en caso de urgencia durante la estancia.",
        `Limite de gasto autorizado: ${buildConsultorioDocumentPlaceholder("limite de gasto autorizado")}`,
        "El propietario acepta las reglas internas de convivencia, higiene y horarios del servicio.",
      ])
    ),
    buildConsultorioDocumentConsentComplianceSection(context, {
      includeEconomicScope: true,
      includeImages: true,
    }),
    buildConsultorioDocumentDataProtectionSection(context, {
      includeSensitiveData: true,
      includeImages: true,
    }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentSignatureSection(context),
  ].join("");
}

function buildConsultorioHealthCertificateTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Certificado de salud veterinaria",
      context,
      "Se expide a solicitud del propietario con base en la valoracion clinica practicada al paciente."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Evaluacion general",
      buildConsultorioDocumentTable(
        [
          ["Motivo de expedicion", buildConsultorioDocumentPlaceholder("motivo del certificado")],
          ["Estado general", buildConsultorioDocumentPlaceholder("estado general del paciente")],
          ["Vacunacion relevante", buildConsultorioDocumentPlaceholder("vacunas vigentes")],
          ["Desparasitacion relevante", buildConsultorioDocumentPlaceholder("desparasitacion vigente")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Conclusiones",
      buildConsultorioDocumentList([
        `Hallazgos relevantes: ${buildConsultorioDocumentPlaceholder("hallazgos relevantes del examen")}`,
        `Restricciones o recomendaciones: ${buildConsultorioDocumentPlaceholder("restricciones o recomendaciones")}`,
        "Este certificado se expide para los fines que el propietario estime convenientes.",
      ])
    ),
    buildConsultorioDocumentProfessionalSection(context),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentProfessionalSignatureSection(context),
  ].join("");
}

function buildConsultorioVaccinationCertificateTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Constancia de vacunacion",
      context,
      "Resumen del plan vacunal vigente del paciente segun la informacion disponible en la historia clinica."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection("Registro de vacunas", buildConsultorioVaccineRecordPlaceholderTable()),
    buildConsultorioDocumentSection(
      "Observaciones",
      buildConsultorioDocumentList([
        `Proximo refuerzo sugerido: ${buildConsultorioDocumentPlaceholder("proximo refuerzo")}`,
        `Observaciones del plan vacunal: ${buildConsultorioDocumentPlaceholder("observaciones del plan vacunal")}`,
      ])
    ),
    buildConsultorioDocumentProfessionalSection(context),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentProfessionalSignatureSection(context),
  ].join("");
}

function buildConsultorioTravelCertificateTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Certificado para viaje o transporte",
      context,
      "Documento emitido para soportar el traslado del paciente y dejar constancia del estado sanitario reportado."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Destino y vigencia",
      buildConsultorioDocumentTable(
        [
          ["Destino o trayecto", buildConsultorioDocumentPlaceholder("destino o trayecto")],
          ["Motivo del traslado", buildConsultorioDocumentPlaceholder("motivo del traslado")],
          ["Vigencia del certificado", buildConsultorioDocumentPlaceholder("vigencia del certificado")],
          ["Senas particulares", buildConsultorioDocumentPlaceholder("senas particulares del paciente")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Condicion sanitaria y recomendaciones",
      buildConsultorioDocumentList([
        `Estado sanitario al momento de la valoracion: ${buildConsultorioDocumentPlaceholder("estado sanitario")}`,
        `Cuidados durante el viaje: ${buildConsultorioDocumentPlaceholder("cuidados durante el traslado")}`,
        `Restricciones reportadas: ${buildConsultorioDocumentPlaceholder("restricciones o advertencias")}`,
      ])
    ),
    buildConsultorioDocumentProfessionalSection(context),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentProfessionalSignatureSection(context),
  ].join("");
}

function buildConsultorioClinicalSummaryTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Resumen clinico veterinario",
      context,
      "Documento de apoyo para historia clinica, entrega al propietario o referencia posterior."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Motivo de consulta y antecedentes",
      buildConsultorioDocumentTable(
        [
          ["Motivo de consulta", buildConsultorioDocumentPlaceholder("motivo de consulta")],
          ["Antecedentes relevantes", buildConsultorioDocumentPlaceholder("antecedentes relevantes")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Hallazgos clinicos e impresion diagnostica",
      buildConsultorioDocumentTable(
        [
          ["Hallazgos clinicos", buildConsultorioDocumentPlaceholder("hallazgos clinicos")],
          ["Impresion diagnostica", buildConsultorioDocumentPlaceholder("impresion diagnostica")],
          ["Examenes realizados", buildConsultorioDocumentPlaceholder("examenes realizados")],
          ["Plan terapeutico", buildConsultorioDocumentPlaceholder("plan terapeutico")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Recomendaciones y seguimiento",
      buildConsultorioDocumentList([
        `Recomendaciones al propietario: ${buildConsultorioDocumentPlaceholder("recomendaciones")}`,
        `Proximo control sugerido: ${buildConsultorioDocumentPlaceholder("fecha o criterio de control")}`,
      ])
    ),
    buildConsultorioDocumentProfessionalSection(context),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentProfessionalSignatureSection(context),
  ].join("");
}

function buildConsultorioDischargeSummaryTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Alta medica veterinaria",
      context,
      "Se deja constancia del egreso del paciente y de las recomendaciones entregadas al propietario."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Resumen de la atencion",
      buildConsultorioDocumentTable(
        [
          ["Motivo de ingreso", buildConsultorioDocumentPlaceholder("motivo de ingreso")],
          ["Diagnostico de egreso", buildConsultorioDocumentPlaceholder("diagnostico de egreso")],
          ["Tratamientos realizados", buildConsultorioDocumentPlaceholder("tratamientos realizados")],
          ["Estado al alta", buildConsultorioDocumentPlaceholder("condicion al alta")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Indicaciones para casa",
      buildConsultorioDocumentList([
        `Medicacion formulada: ${buildConsultorioDocumentPlaceholder("medicacion formulada")}`,
        `Cuidados en casa: ${buildConsultorioDocumentPlaceholder("cuidados en casa")}`,
        `Signos de alarma: ${buildConsultorioDocumentPlaceholder("signos de alarma")}`,
        `Proximo control: ${buildConsultorioDocumentPlaceholder("fecha del proximo control")}`,
      ])
    ),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentSignatureSection(context, {
      ownerLabel: "Propietario que recibe al paciente",
    }),
  ].join("");
}

function buildConsultorioProgressReportTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Informe de evolucion veterinaria",
      context,
      "Registro estructurado de seguimiento para hospitalizacion, control ambulatorio o contacto con el propietario."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Estado actual",
      buildConsultorioDocumentTable(
        [
          ["Respuesta al tratamiento", buildConsultorioDocumentPlaceholder("respuesta al tratamiento")],
          ["Hallazgos de control", buildConsultorioDocumentPlaceholder("hallazgos de control")],
          ["Cambios del plan", buildConsultorioDocumentPlaceholder("cambios del plan terapeutico")],
          ["Compromiso del propietario", buildConsultorioDocumentPlaceholder("compromiso o adherencia del propietario")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Seguimiento sugerido",
      buildConsultorioDocumentList([
        `Recomendaciones actuales: ${buildConsultorioDocumentPlaceholder("recomendaciones actuales")}`,
        `Fecha o criterio del proximo control: ${buildConsultorioDocumentPlaceholder("proximo control")}`,
      ])
    ),
    buildConsultorioDocumentProfessionalSection(context),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentProfessionalSignatureSection(context),
  ].join("");
}

function buildConsultorioSpecialistReferralTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Remision veterinaria a especialista",
      context,
      "El paciente se remite para valoracion complementaria por una especialidad o servicio de mayor complejidad."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Motivo de remision",
      buildConsultorioDocumentTable(
        [
          ["Especialidad solicitada", buildConsultorioDocumentPlaceholder("especialidad o servicio solicitado")],
          ["Motivo de remision", buildConsultorioDocumentPlaceholder("motivo de remision")],
          ["Pregunta clinica", buildConsultorioDocumentPlaceholder("pregunta clinica para el especialista")],
          ["Urgencia del caso", buildConsultorioDocumentPlaceholder("nivel de urgencia")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Resumen clinico y manejo previo",
      buildConsultorioDocumentTable(
        [
          ["Antecedentes relevantes", buildConsultorioDocumentPlaceholder("antecedentes relevantes")],
          ["Hallazgos actuales", buildConsultorioDocumentPlaceholder("hallazgos actuales")],
          ["Examenes realizados", buildConsultorioDocumentPlaceholder("examenes realizados")],
          ["Tratamientos instaurados", buildConsultorioDocumentPlaceholder("tratamientos instaurados")],
        ],
        2
      )
    ),
    buildConsultorioDocumentProfessionalSection(context),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentProfessionalSignatureSection(context),
  ].join("");
}

function buildConsultorioEmergencyReferralTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Remision a urgencias veterinarias",
      context,
      "El paciente requiere traslado a un centro de mayor complejidad y se comparte la informacion esencial para su recepcion."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Resumen del evento y condicion actual",
      buildConsultorioDocumentTable(
        [
          ["Motivo de la urgencia", buildConsultorioDocumentPlaceholder("motivo de urgencia")],
          ["Hora del evento", buildConsultorioDocumentPlaceholder("hora del evento")],
          ["Estado actual del paciente", buildConsultorioDocumentPlaceholder("estado actual del paciente")],
          ["Centro receptor", buildConsultorioDocumentPlaceholder("centro receptor o destino")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Manejo previo al traslado",
      buildConsultorioDocumentList([
        `Estabilizacion realizada: ${buildConsultorioDocumentPlaceholder("estabilizacion realizada")}`,
        `Medicamentos administrados: ${buildConsultorioDocumentPlaceholder("medicamentos administrados")}`,
        `Examenes o soportes enviados: ${buildConsultorioDocumentPlaceholder("soportes enviados")}`,
        `Indicaciones para recepcion: ${buildConsultorioDocumentPlaceholder("indicaciones para el receptor")}`,
      ])
    ),
    buildConsultorioDocumentProfessionalSection(context),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentProfessionalSignatureSection(context),
  ].join("");
}

function buildConsultorioProcedureAuthorizationTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Autorizacion de procedimiento veterinario",
      context,
      "El propietario autoriza la realizacion del procedimiento o tratamiento aqui descrito."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Procedimiento autorizado",
      buildConsultorioDocumentTable(
        [
          ["Procedimiento o tratamiento", buildConsultorioDocumentPlaceholder("procedimiento autorizado")],
          ["Objetivo esperado", buildConsultorioDocumentPlaceholder("objetivo del procedimiento")],
          ["Condiciones informadas", buildConsultorioDocumentPlaceholder("condiciones, costos o alcances informados")],
          ["Fecha estimada", getConsultorioDocumentValue(context?.documentDateOnly, "fecha estimada")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Declaracion del propietario",
      buildConsultorioDocumentList([
        "El propietario confirma haber recibido informacion suficiente y tener oportunidad de resolver dudas.",
        `Observaciones adicionales: ${buildConsultorioDocumentPlaceholder("observaciones adicionales")}`,
      ])
    ),
    buildConsultorioDocumentConsentComplianceSection(context, {
      includeEconomicScope: true,
    }),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentSignatureSection(context),
  ].join("");
}

function buildConsultorioDischargeAgainstAdviceTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Alta bajo responsabilidad",
      context,
      "El propietario solicita el retiro voluntario del paciente en contra de la recomendacion medica o antes de completar el manejo sugerido."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Contexto del retiro",
      buildConsultorioDocumentTable(
        [
          ["Motivo del retiro", buildConsultorioDocumentPlaceholder("motivo del retiro voluntario")],
          ["Diagnostico actual", buildConsultorioDocumentPlaceholder("diagnostico actual")],
          ["Recomendacion medica emitida", buildConsultorioDocumentPlaceholder("recomendacion medica")],
          ["Fecha y hora de retiro", getConsultorioDocumentValue(context?.documentDate, "fecha y hora de retiro")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Riesgos advertidos",
      buildConsultorioDocumentList([
        `Riesgos explicados al propietario: ${buildConsultorioDocumentPlaceholder("riesgos explicados")}`,
        "El propietario asume la responsabilidad por el retiro anticipado y se compromete a buscar atencion inmediata ante signos de alarma.",
        `Compromisos asumidos: ${buildConsultorioDocumentPlaceholder("compromisos asumidos por el propietario")}`,
      ])
    ),
    buildConsultorioDocumentConsentComplianceSection(context, {
      includeEconomicScope: false,
    }),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentSignatureSection(context),
  ].join("");
}

function buildConsultorioHospitalAdmissionTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Formato de ingreso a hospitalizacion",
      context,
      "Registro inicial del paciente al momento de ingresar a hospitalizacion."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Datos del ingreso",
      buildConsultorioDocumentTable(
        [
          ["Fecha de ingreso", getConsultorioDocumentValue(context?.documentDateOnly, "fecha de ingreso")],
          ["Motivo de ingreso", buildConsultorioDocumentPlaceholder("motivo de ingreso")],
          ["Diagnostico inicial", buildConsultorioDocumentPlaceholder("diagnostico inicial")],
          ["Responsable durante la estancia", buildConsultorioDocumentPlaceholder("responsable durante la estancia")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Estado inicial y manejo activo",
      buildConsultorioDocumentTable(
        [
          ["Estado inicial", buildConsultorioDocumentPlaceholder("estado inicial del paciente")],
          ["Medicacion activa", buildConsultorioDocumentPlaceholder("medicacion activa")],
          ["Plan de monitoreo", buildConsultorioDocumentPlaceholder("plan de monitoreo")],
          ["Observaciones", buildConsultorioDocumentPlaceholder("observaciones del ingreso")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Pertenencias y autorizaciones",
      buildConsultorioDocumentTable(
        [
          ["Objetos recibidos", buildConsultorioDocumentPlaceholder("objetos o insumos entregados")],
          ["Autorizaciones vigentes", buildConsultorioDocumentPlaceholder("autorizaciones vigentes")],
        ],
        2
      )
    ),
    buildConsultorioDocumentDataProtectionSection(context, { includeSensitiveData: true }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentSignatureSection(context),
  ].join("");
}

function buildConsultorioBoardingAdmissionTemplateHtml(context) {
  return [
    buildConsultorioDocumentTitleBlock(
      "Formato de ingreso a guarderia",
      context,
      "Registro operativo del ingreso del paciente a guarderia, hotel o estancia corta."
    ),
    buildConsultorioDocumentTraceabilitySection(context),
    buildConsultorioDocumentOwnerSection(context),
    buildConsultorioDocumentPatientSection(context),
    buildConsultorioDocumentSection(
      "Datos de la estancia",
      buildConsultorioDocumentTable(
        [
          ["Fecha de ingreso", getConsultorioDocumentValue(context?.documentDateOnly, "fecha de ingreso")],
          ["Fecha de salida estimada", buildConsultorioDocumentPlaceholder("fecha de salida estimada")],
          ["Contacto alterno", buildConsultorioDocumentPlaceholder("contacto alterno")],
          ["Persona autorizada para recoger", buildConsultorioDocumentPlaceholder("persona autorizada")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Rutina y cuidados",
      buildConsultorioDocumentTable(
        [
          ["Alimento", buildConsultorioDocumentPlaceholder("alimento y cantidad")],
          ["Horarios", buildConsultorioDocumentPlaceholder("horarios de alimentacion")],
          ["Medicacion", buildConsultorioDocumentPlaceholder("medicacion y horarios")],
          ["Restricciones", buildConsultorioDocumentPlaceholder("restricciones o cuidados especiales")],
        ],
        2
      )
    ),
    buildConsultorioDocumentSection(
      "Objetos y observaciones",
      buildConsultorioDocumentTable(
        [
          ["Objetos recibidos", buildConsultorioDocumentPlaceholder("objetos entregados")],
          ["Condiciones del ingreso", buildConsultorioDocumentPlaceholder("condiciones observadas al ingreso")],
          ["Autorizacion de urgencias", buildConsultorioDocumentPlaceholder("alcance de la autorizacion de urgencias")],
          ["Observaciones finales", buildConsultorioDocumentPlaceholder("observaciones finales")],
        ],
        2
      )
    ),
    buildConsultorioDocumentDataProtectionSection(context, {
      includeSensitiveData: true,
      includeImages: true,
    }),
    buildConsultorioDocumentCustodySection(context),
    buildConsultorioDocumentSignatureSection(context),
  ].join("");
}

function syncPatientDocumentEditorState() {
  if (!elements.patientDocumentEditor || !elements.patientDocumentContentInput) {
    return;
  }
  const sanitized = sanitizeConsultorioDocumentHtml(elements.patientDocumentEditor.innerHTML);
  const plainText = consultorioDocumentHtmlToText(sanitized);
  elements.patientDocumentContentInput.value = plainText ? sanitized : "";
  if (sanitized !== elements.patientDocumentEditor.innerHTML) {
    elements.patientDocumentEditor.innerHTML = sanitized;
  }
  elements.patientDocumentEditor.classList.toggle("is-empty", !plainText);
}

function setPatientDocumentEditorContent(value) {
  if (!elements.patientDocumentEditor || !elements.patientDocumentContentInput) {
    return;
  }
  const sanitized = sanitizeConsultorioDocumentHtml(value);
  elements.patientDocumentEditor.innerHTML = sanitized;
  elements.patientDocumentContentInput.value = sanitized;
  if (elements.patientDocumentSourceEditor) {
    elements.patientDocumentSourceEditor.value = sanitized;
  }
  elements.patientDocumentEditor.classList.toggle(
    "is-empty",
    !consultorioDocumentHtmlToText(sanitized)
  );
  updatePatientDocumentStatusBar();
}

function buildPatientDocumentSelectOptions(placeholder, groups = []) {
  return [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...groups.map(
      (group) => `
        <optgroup label="${escapeHtml(group.label || "")}">
          ${(group.options || [])
            .map(
              (option) =>
                `<option value="${escapeHtml(option.value || "")}">${escapeHtml(option.label || "")}</option>`
            )
            .join("")}
        </optgroup>
      `
    ),
  ].join("");
}

function renderPatientDocumentEditorSelectOptions() {
  if (elements.patientDocumentStyleSelect) {
    elements.patientDocumentStyleSelect.innerHTML = buildPatientDocumentSelectOptions(
      "Estilo",
      DOCUMENT_EDITOR_STYLE_GROUPS
    );
  }
  if (elements.patientDocumentBlockFormatSelect) {
    elements.patientDocumentBlockFormatSelect.innerHTML = buildPatientDocumentSelectOptions(
      "Normal",
      DOCUMENT_EDITOR_BLOCK_FORMAT_GROUPS
    );
    elements.patientDocumentBlockFormatSelect.value = "p";
  }
  if (elements.patientDocumentFontFamilySelect) {
    elements.patientDocumentFontFamilySelect.innerHTML = buildPatientDocumentSelectOptions(
      "Fuente",
      DOCUMENT_EDITOR_FONT_GROUPS
    );
  }
  if (elements.patientDocumentFontSizeSelect) {
    elements.patientDocumentFontSizeSelect.innerHTML = buildPatientDocumentSelectOptions(
      "Tamano",
      DOCUMENT_EDITOR_SIZE_GROUPS
    );
  }
}

function isPatientDocumentSourceMode() {
  return patientDocumentEditorMode === "source";
}

function syncPatientDocumentSourceState(value = null) {
  if (!elements.patientDocumentContentInput) {
    return;
  }
  const nextValue =
    value !== null
      ? String(value)
      : String(elements.patientDocumentSourceEditor?.value || elements.patientDocumentContentInput.value || "");
  elements.patientDocumentContentInput.value = nextValue;
  if (elements.patientDocumentSourceEditor) {
    elements.patientDocumentSourceEditor.value = nextValue;
  }
}

function setPatientDocumentEditorMode(mode = "visual") {
  const normalizedMode = mode === "source" ? "source" : "visual";
  patientDocumentEditorMode = normalizedMode;
  if (normalizedMode === "source") {
    syncPatientDocumentEditorState();
    syncPatientDocumentSourceState(elements.patientDocumentContentInput?.value || "");
  } else if (elements.patientDocumentSourceEditor) {
    setPatientDocumentEditorContent(elements.patientDocumentSourceEditor.value || "");
  }
  elements.patientDocumentSourceToggleButton?.classList.toggle(
    "is-active",
    normalizedMode === "source"
  );
  elements.patientDocumentSourceToggleButton?.setAttribute(
    "aria-pressed",
    normalizedMode === "source" ? "true" : "false"
  );
  elements.patientDocumentSourceEditor?.classList.toggle("is-hidden", normalizedMode !== "source");
  elements.patientDocumentEditor?.classList.toggle("is-hidden", normalizedMode === "source");
  updatePatientDocumentStatusBar();
}

function updatePatientDocumentStatusBar() {
  if (!elements.patientDocumentStatusBar) {
    return;
  }
  if (isPatientDocumentSourceMode()) {
    elements.patientDocumentStatusBar.textContent = "source html";
    return;
  }
  const range = getPatientDocumentSelectionRange();
  let blockTag = "p";
  let node = range?.commonAncestorContainer || elements.patientDocumentEditor;
  if (node?.nodeType === Node.TEXT_NODE) {
    node = node.parentElement;
  }
  while (node && node !== elements.patientDocumentEditor) {
    const tagName = String(node.tagName || "").toLowerCase();
    if (["p", "div", "blockquote", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "address"].includes(tagName)) {
      blockTag = tagName;
      break;
    }
    node = node.parentElement;
  }
  elements.patientDocumentStatusBar.textContent = `body ${blockTag}`;
}

function getPatientDocumentSelectionRange() {
  if (
    !elements.patientDocumentEditor ||
    isPatientDocumentSourceMode() ||
    typeof window?.getSelection !== "function"
  ) {
    return null;
  }
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    return null;
  }
  const range = selection.getRangeAt(0);
  if (!elements.patientDocumentEditor.contains(range.commonAncestorContainer)) {
    return null;
  }
  return range;
}

function wrapPatientDocumentSelectionWithHtml(builder) {
  if (typeof document?.execCommand !== "function" || typeof builder !== "function") {
    return false;
  }
  const range = getPatientDocumentSelectionRange();
  if (!range || range.collapsed) {
    return false;
  }
  const selectedText = String(range.toString() || "").trim();
  if (!selectedText) {
    return false;
  }
  const fragmentContainer = document.createElement("div");
  fragmentContainer.appendChild(range.cloneContents());
  const selectedHtml = fragmentContainer.innerHTML;
  document.execCommand("insertHTML", false, builder(selectedText, selectedHtml));
  syncPatientDocumentEditorState();
  return true;
}

function applyPatientDocumentStylePreset(value) {
  const preset = String(value || "").trim();
  if (!preset) {
    return;
  }
  if (preset === "body_text") {
    applyPatientDocumentEditorCommand("formatBlock", "p");
    return;
  }
  if (preset === "lead_paragraph") {
    applyPatientDocumentEditorCommand("formatBlock", "p");
    applyPatientDocumentEditorCommand("fontSize", "4");
    return;
  }
  if (preset === "section_title") {
    applyPatientDocumentEditorCommand("formatBlock", "h2");
    applyPatientDocumentEditorCommand("bold");
    return;
  }
  if (preset === "italic_title") {
    applyPatientDocumentEditorCommand("formatBlock", "h2");
    applyPatientDocumentEditorCommand("italic");
    return;
  }
  if (preset === "subtitle") {
    applyPatientDocumentEditorCommand("formatBlock", "h3");
    return;
  }
  if (preset === "special_container") {
    applyPatientDocumentEditorCommand("formatBlock", "blockquote");
    return;
  }
  if (preset === "quote_box") {
    applyPatientDocumentEditorCommand("formatBlock", "blockquote");
    applyPatientDocumentEditorCommand("italic");
    return;
  }
  if (preset === "code_block") {
    applyPatientDocumentEditorCommand("formatBlock", "pre");
    return;
  }
  if (preset === "signature_line") {
    insertPatientDocumentTextAtCursor("____________________________");
    return;
  }
  if (preset === "marker") {
    const applied = wrapPatientDocumentSelectionWithHtml(
      (selectedText, selectedHtml) => `<mark>${selectedHtml || escapeHtml(selectedText)}</mark>`
    );
    if (!applied) {
      showStatus("Selecciona un texto para aplicar Marker.", "info");
    }
    return;
  }
  if (preset === "important") {
    applyPatientDocumentEditorCommand("bold");
    return;
  }
  if (preset === "small_print") {
    applyPatientDocumentEditorCommand("fontSize", "2");
    return;
  }
  if (preset === "inline_code") {
    const applied = wrapPatientDocumentSelectionWithHtml(
      (selectedText, selectedHtml) =>
        `<font face="Courier New">${selectedHtml || escapeHtml(selectedText)}</font>`
    );
    if (!applied) {
      showStatus("Selecciona un texto para aplicar Inline Code.", "info");
    }
    return;
  }
  if (preset === "accent_text") {
    const applied = wrapPatientDocumentSelectionWithHtml(
      (selectedText, selectedHtml) =>
        `<font color="#1d4ed8">${selectedHtml || escapeHtml(selectedText)}</font>`
    );
    if (!applied) {
      showStatus("Selecciona un texto para aplicar Accent Text.", "info");
    }
  }
}

function applyPatientDocumentEditorCommand(command, value = null) {
  if (
    !elements.patientDocumentEditor ||
    isPatientDocumentSourceMode() ||
    typeof document?.execCommand !== "function"
  ) {
    return;
  }
  elements.patientDocumentEditor.focus();
  try {
    if (command === "formatBlock") {
      const normalizedBlock = String(value || "p")
        .replace(/[<>]/g, "")
        .trim()
        .toLowerCase() || "p";
      document.execCommand("formatBlock", false, `<${normalizedBlock}>`);
    } else if (command === "createLink") {
      document.execCommand("createLink", false, value || "");
    } else if (value !== null) {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false);
    }
  } catch (error) {
    // ignore editor command errors
  }
  syncPatientDocumentEditorState();
}

function insertPatientDocumentTextAtCursor(value) {
  const text = String(value || "");
  if (!text) {
    return;
  }
  if (isPatientDocumentSourceMode() && elements.patientDocumentSourceEditor) {
    const source = elements.patientDocumentSourceEditor;
    const start = Number(source.selectionStart || 0);
    const end = Number(source.selectionEnd || 0);
    const current = source.value || "";
    source.value = `${current.slice(0, start)}${text}${current.slice(end)}`;
    source.selectionStart = source.selectionEnd = start + text.length;
    syncPatientDocumentSourceState(source.value);
    source.focus();
    return;
  }
  elements.patientDocumentEditor?.focus();
  if (typeof document?.execCommand === "function") {
    document.execCommand("insertText", false, text);
    syncPatientDocumentEditorState();
  }
}

async function handlePatientDocumentClipboardCommand(command) {
  const normalized = String(command || "").trim().toLowerCase();
  if (!normalized) {
    return;
  }
  if (normalized === "paste") {
    let text = "";
    try {
      text = (await navigator.clipboard?.readText?.()) || "";
    } catch (error) {
      text = "";
    }
    if (!text) {
      text = window.prompt("Pega aqui el contenido que deseas insertar:", "") || "";
    }
    if (!text) {
      return;
    }
    insertPatientDocumentTextAtCursor(text);
    return;
  }
  if (isPatientDocumentSourceMode() && elements.patientDocumentSourceEditor) {
    const source = elements.patientDocumentSourceEditor;
    const start = Number(source.selectionStart || 0);
    const end = Number(source.selectionEnd || 0);
    const text = source.value.slice(start, end);
    if (!text) {
      return;
    }
    await navigator.clipboard?.writeText?.(text);
    if (normalized === "cut") {
      source.value = `${source.value.slice(0, start)}${source.value.slice(end)}`;
      source.selectionStart = source.selectionEnd = start;
      syncPatientDocumentSourceState(source.value);
    }
    return;
  }
  elements.patientDocumentEditor?.focus();
  try {
    const success = document.execCommand(normalized);
    if (success) {
      syncPatientDocumentEditorState();
      return;
    }
  } catch (error) {
    // fallback below
  }
  const range = getPatientDocumentSelectionRange();
  const text = String(range?.toString() || "").trim();
  if (!text) {
    return;
  }
  await navigator.clipboard?.writeText?.(text);
  if (normalized === "cut") {
    document.execCommand("delete", false);
    syncPatientDocumentEditorState();
  }
}

function insertPatientDocumentImageFromPrompt() {
  const url = String(window.prompt("Ingresa la URL de la imagen:", "") || "").trim();
  if (!url) {
    return;
  }
  const alt = String(window.prompt("Texto alternativo de la imagen:", "Imagen") || "Imagen").trim();
  if (isPatientDocumentSourceMode()) {
    insertPatientDocumentTextAtCursor(`<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}">`);
    return;
  }
  elements.patientDocumentEditor?.focus();
  document.execCommand(
    "insertHTML",
    false,
    `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}">`
  );
  syncPatientDocumentEditorState();
}

function insertPatientDocumentTableFromPrompt() {
  const rows = Number(window.prompt("Numero de filas:", "2") || 0);
  const columns = Number(window.prompt("Numero de columnas:", "2") || 0);
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || columns < 1) {
    return;
  }
  const safeRows = Math.min(rows, 10);
  const safeColumns = Math.min(columns, 10);
  const tableHtml = [
    "<table><tbody>",
    ...Array.from({ length: safeRows }, () =>
      `<tr>${Array.from({ length: safeColumns }, () => "<td>Celda</td>").join("")}</tr>`
    ),
    "</tbody></table>",
  ].join("");
  if (isPatientDocumentSourceMode()) {
    insertPatientDocumentTextAtCursor(tableHtml);
    return;
  }
  elements.patientDocumentEditor?.focus();
  document.execCommand("insertHTML", false, tableHtml);
  syncPatientDocumentEditorState();
}

function insertPatientDocumentSpecialCharacter() {
  const character = String(window.prompt("Ingresa el caracter especial:", "Ω") || "").trim();
  if (!character) {
    return;
  }
  insertPatientDocumentTextAtCursor(character);
}

function applyPatientDocumentTextColorPrompt() {
  const color = String(window.prompt("Color de texto (ej: #1d4ed8):", "#1d4ed8") || "").trim();
  if (!color) {
    return;
  }
  const applied = wrapPatientDocumentSelectionWithHtml(
    (selectedText, selectedHtml) =>
      `<font color="${escapeHtml(color)}">${selectedHtml || escapeHtml(selectedText)}</font>`
  );
  if (!applied) {
    showStatus("Selecciona un texto para cambiar el color.", "info");
  }
}

function applyPatientDocumentHighlightPrompt() {
  const applied = wrapPatientDocumentSelectionWithHtml(
    (selectedText, selectedHtml) => `<mark>${selectedHtml || escapeHtml(selectedText)}</mark>`
  );
  if (!applied) {
    showStatus("Selecciona un texto para resaltar.", "info");
  }
}

function togglePatientDocumentSpellcheck() {
  const nextValue = !(elements.patientDocumentEditor?.spellcheck ?? true);
  if (elements.patientDocumentEditor) {
    elements.patientDocumentEditor.spellcheck = nextValue;
  }
  if (elements.patientDocumentSourceEditor) {
    elements.patientDocumentSourceEditor.spellcheck = nextValue;
  }
  return nextValue;
}

async function togglePatientDocumentFullscreen() {
  const container = elements.patientDocumentEditor?.closest(".consultorio-document-editor");
  if (!container) {
    return;
  }
  if (document.fullscreenElement === container && document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }
  if (typeof container.requestFullscreen === "function") {
    try {
      await container.requestFullscreen();
      return;
    } catch (error) {
      // fall through to local expanded mode
    }
  }
  container.classList.toggle("consultorio-document-editor--expanded");
}

async function handlePatientDocumentToolbarClick(event) {
  const button = event.target.closest("[data-document-command]");
  if (!button) {
    return;
  }
  event.preventDefault();
  const command = button.dataset.documentCommand || "";
  if (!command) {
    return;
  }
  if (command === "clipboardCut") {
    await handlePatientDocumentClipboardCommand("cut");
    return;
  }
  if (command === "clipboardCopy") {
    await handlePatientDocumentClipboardCommand("copy");
    return;
  }
  if (command === "clipboardPaste") {
    await handlePatientDocumentClipboardCommand("paste");
    return;
  }
  if (command === "toggleSpellcheck") {
    togglePatientDocumentSpellcheck();
    return;
  }
  if (command === "toggleSourceMode") {
    setPatientDocumentEditorMode(isPatientDocumentSourceMode() ? "visual" : "source");
    return;
  }
  if (command === "createLink") {
    const url = window.prompt("Ingresa la URL del enlace:");
    if (!url) {
      return;
    }
    applyPatientDocumentEditorCommand(command, url);
    return;
  }
  if (command === "insertImagePrompt") {
    insertPatientDocumentImageFromPrompt();
    return;
  }
  if (command === "insertTablePrompt") {
    insertPatientDocumentTableFromPrompt();
    return;
  }
  if (command === "insertSpecialCharPrompt") {
    insertPatientDocumentSpecialCharacter();
    return;
  }
  if (command === "applyTextColorPrompt") {
    applyPatientDocumentTextColorPrompt();
    return;
  }
  if (command === "applyHighlightPrompt") {
    applyPatientDocumentHighlightPrompt();
    return;
  }
  if (command === "toggleDocumentFullscreen") {
    await togglePatientDocumentFullscreen();
    return;
  }
  applyPatientDocumentEditorCommand(command, button.dataset.documentCommandValue || null);
}

function handlePatientDocumentAddFormatClick() {
  const formatName = window.prompt("Escribe el nombre del nuevo formato:");
  const normalized = ensureConsultorioDocumentFormatOption(formatName, { persist: true });
  if (!normalized) {
    return;
  }
  renderPatientDocumentFormatOptions(normalized);
  if (elements.patientDocumentFormatSelect) {
    elements.patientDocumentFormatSelect.value = normalized;
  }
  syncPatientDocumentTemplateSelection({
    format: normalized,
  });
  showStatus(`Formato "${normalized}" agregado.`, "success");
}

function closePatientConsultationModal() {
  if (!elements.patientConsultationModal) {
    return;
  }
  elements.patientConsultationModal.classList.add("is-hidden");
  elements.patientConsultationModal.setAttribute("aria-hidden", "true");
  document.body?.classList.remove("modal-open");
}

function syncModalOpenState() {
  const anyModalOpen = queryAll(".modal-shell").some(
    (modal) => !modal.classList.contains("is-hidden")
  );
  document.body?.classList.toggle("modal-open", anyModalOpen);
}

function getPreferredGroomingPatientId(patientId = "") {
  const normalizedPatientId = String(patientId || "").trim();
  if (normalizedPatientId) {
    return normalizedPatientId;
  }
  if (isConsultorioPatientProfileActive() && consultorioPatientId) {
    return String(consultorioPatientId || "").trim();
  }
  const consultorioSubsection = getSubsectionOption("consultorio")?.value || "";
  if (getActiveSectionId() === "consultorio" && consultorioSubsection === "grooming") {
    return String(pendingGroomingPatientId || "").trim();
  }
  return "";
}

function openGroomingModal(options = {}) {
  if (!elements.groomingModal || !elements.groomingForm) {
    return;
  }
  const { patientId = "" } = options || {};
  const resolvedPatientId = getPreferredGroomingPatientId(patientId);
  const patient = resolvedPatientId ? getPatientById(resolvedPatientId) : null;
  const patientName = String(patient?.name || "").trim();
  resetForm(elements.groomingForm);
  setDateTimeDefaults();
  renderSelects();
  renderGroomingServiceItems([]);
  syncGroomingServiceItemsValue();
  setGroomingBeforeAttachments([]);
  setGroomingAfterAttachments([]);
  if (elements.groomingPatientSelect && resolvedPatientId) {
    elements.groomingPatientSelect.value = resolvedPatientId;
  }
  if (elements.groomingModalTitle) {
    elements.groomingModalTitle.textContent = patientName
      ? `${GROOMING_DOCUMENT_TYPE_LABEL} - ${patientName.toUpperCase()}`
      : GROOMING_DOCUMENT_TYPE_LABEL;
  }
  if (elements.groomingModalSubtitle) {
    elements.groomingModalSubtitle.textContent = patientName
      ? `Paciente: ${patientName}`
      : "Selecciona el paciente para registrar el servicio.";
  }
  elements.groomingModal.classList.toggle("grooming-modal-shell--patient-locked", Boolean(patientName));
  elements.groomingModal.classList.remove("is-hidden");
  elements.groomingModal.setAttribute("aria-hidden", "false");
  syncModalOpenState();
  const focusTarget = resolvedPatientId
    ? elements.groomingServiceAtInput || elements.groomingPatientSelect
    : elements.groomingPatientSelect || elements.groomingServiceAtInput;
  focusTarget?.focus();
}

function closeGroomingModal() {
  if (!elements.groomingModal) {
    return;
  }
  elements.groomingModal.classList.remove("grooming-modal-shell--patient-locked");
  elements.groomingModal.classList.add("is-hidden");
  elements.groomingModal.setAttribute("aria-hidden", "true");
  if (elements.groomingForm) {
    resetForm(elements.groomingForm);
  }
  renderGroomingServiceItems([]);
  syncGroomingServiceItemsValue();
  setGroomingBeforeAttachments([]);
  setGroomingAfterAttachments([]);
  setDateTimeDefaults();
  if (elements.groomingModalTitle) {
    elements.groomingModalTitle.textContent = GROOMING_DOCUMENT_TYPE_LABEL;
  }
  if (elements.groomingModalSubtitle) {
    elements.groomingModalSubtitle.textContent =
      "Captura detallada del servicio realizado al paciente.";
  }
  syncModalOpenState();
}

function openLabTestModal({ index = null, category = "", name = "", target = "order" } = {}) {
  if (!elements.labTestModal) {
    return;
  }
  pendingLabTestContext = {
    target: target === "laboratory" ? "laboratory" : "order",
    index: Number.isFinite(index) ? index : null,
  };
  setLabTestCategoryValue(category);
  if (elements.labTestNameInput) {
    elements.labTestNameInput.value = name;
  }
  closePatientOrderPickerPanels();
  elements.labTestModal.classList.remove("is-hidden");
  elements.labTestModal.setAttribute("aria-hidden", "false");
  syncModalOpenState();
  const selectedCategoryOption = String(elements.labTestCategorySelect?.value || "").trim();
  const focusTarget =
    selectedCategoryOption === LAB_TEST_CATEGORY_CUSTOM_OPTION
      ? elements.labTestCategoryCustomInput || elements.labTestNameInput
      : getLabTestCategoryValue()
        ? elements.labTestNameInput
        : elements.labTestCategorySelect || elements.labTestNameInput;
  focusTarget?.focus();
}

function closeLabTestModal() {
  if (!elements.labTestModal) {
    return;
  }
  elements.labTestModal.classList.add("is-hidden");
  elements.labTestModal.setAttribute("aria-hidden", "true");
  pendingLabTestContext = null;
  if (elements.labTestForm) {
    elements.labTestForm.reset();
  }
  if (elements.labTestCategorySelect) {
    elements.labTestCategorySelect.value = "";
  }
  if (elements.labTestCategoryCustomInput) {
    elements.labTestCategoryCustomInput.value = "";
  }
  if (elements.labTestNameInput) {
    elements.labTestNameInput.value = "";
  }
  syncLabTestCategoryCustomField();
  syncModalOpenState();
}

function openProcedureOrderModal({ index = null, name = "" } = {}) {
  if (!elements.procedureOrderModal) {
    return;
  }
  pendingProcedureOrderItemIndex = Number.isFinite(index) ? index : null;
  if (elements.procedureOrderNameInput) {
    elements.procedureOrderNameInput.value = name;
  }
  closePatientOrderPickerPanels();
  elements.procedureOrderModal.classList.remove("is-hidden");
  elements.procedureOrderModal.setAttribute("aria-hidden", "false");
  syncModalOpenState();
  elements.procedureOrderNameInput?.focus();
}

function closeProcedureOrderModal() {
  if (!elements.procedureOrderModal) {
    return;
  }
  elements.procedureOrderModal.classList.add("is-hidden");
  elements.procedureOrderModal.setAttribute("aria-hidden", "true");
  pendingProcedureOrderItemIndex = null;
  if (elements.procedureOrderForm) {
    elements.procedureOrderForm.reset();
  }
  if (elements.procedureOrderNameInput) {
    elements.procedureOrderNameInput.value = "";
  }
  syncModalOpenState();
}

function handleLabTestSubmit(event) {
  event.preventDefault();
  const category = getLabTestCategoryValue();
  const name = String(elements.labTestNameInput?.value || "").trim();
  if (
    elements.labTestCategorySelect?.value === LAB_TEST_CATEGORY_CUSTOM_OPTION &&
    !category
  ) {
    elements.labTestCategoryCustomInput?.focus();
    return;
  }
  if (!name) {
    elements.labTestNameInput?.focus();
    return;
  }
  const label = buildOrderCatalogLabel(category, name);
  if (!label) {
    return;
  }
  const resolvedLabel = registerConsultorioOrderCatalogEntry("Prueba/Examen", label) || label;
  const context = pendingLabTestContext || { target: "order", index: null };
  const index = context.index;
  if (context.target === "laboratory" && Number.isFinite(index)) {
    const items = getPatientLaboratoryItems({ includeEmpty: true });
    if (items[index]) {
      items[index].item = resolvedLabel;
      renderPatientLaboratoryItems(items);
      elements.patientLaboratoryItemsList
        ?.querySelector(`[data-lab-item="${index}"] [data-lab-item-field="item"]`)
        ?.focus();
    }
  } else if (Number.isFinite(index)) {
    const items = getPatientOrderItems({ includeEmpty: true });
    if (items[index]) {
      items[index].item = resolvedLabel;
      items[index].itemCustom = "";
      renderPatientOrderItems(items);
      elements.patientOrderItemsList
        ?.querySelector(`[data-order-item="${index}"] [data-order-picker-trigger]`)
        ?.focus();
    }
  }
  closeLabTestModal();
}

function handleProcedureOrderSubmit(event) {
  event.preventDefault();
  const name = String(elements.procedureOrderNameInput?.value || "").trim();
  if (!name) {
    elements.procedureOrderNameInput?.focus();
    return;
  }
  const label = name;
  if (!label) {
    return;
  }
  const resolvedLabel =
    registerConsultorioOrderCatalogEntry("Cirugia/procedimiento", label) || label;
  const index = pendingProcedureOrderItemIndex;
  if (Number.isFinite(index)) {
    const items = getPatientOrderItems({ includeEmpty: true });
    if (items[index]) {
      items[index].item = resolvedLabel;
      items[index].itemCustom = "";
      renderPatientOrderItems(items);
      elements.patientOrderItemsList
        ?.querySelector(`[data-order-item="${index}"] [data-order-picker-trigger]`)
        ?.focus();
    }
  }
  closeProcedureOrderModal();
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

function syncPatientProcedureCustomField() {
  const showCustom =
    elements.patientProcedureNameSelect?.value === CONSULTORIO_PROCEDURE_CUSTOM_OPTION;
  elements.patientProcedureCustomNameInput?.classList.toggle("is-hidden", !showCustom);
  if (!showCustom && elements.patientProcedureCustomNameInput) {
    elements.patientProcedureCustomNameInput.value = "";
  }
}

function setPatientProcedureNameValue(value) {
  const normalized = String(value || "").trim();
  if (!elements.patientProcedureNameSelect) {
    return;
  }
  const matchesPredefined = Array.from(elements.patientProcedureNameSelect.options).some(
    (option) =>
      option.value &&
      option.value !== CONSULTORIO_PROCEDURE_CUSTOM_OPTION &&
      option.value === normalized
  );
  if (!normalized) {
    elements.patientProcedureNameSelect.value = "";
    if (elements.patientProcedureCustomNameInput) {
      elements.patientProcedureCustomNameInput.value = "";
    }
    syncPatientProcedureCustomField();
    return;
  }
  if (matchesPredefined) {
    elements.patientProcedureNameSelect.value = normalized;
    if (elements.patientProcedureCustomNameInput) {
      elements.patientProcedureCustomNameInput.value = "";
    }
    syncPatientProcedureCustomField();
    return;
  }
  elements.patientProcedureNameSelect.value = CONSULTORIO_PROCEDURE_CUSTOM_OPTION;
  if (elements.patientProcedureCustomNameInput) {
    elements.patientProcedureCustomNameInput.value = normalized;
  }
  syncPatientProcedureCustomField();
}

function getPatientProcedureNameValue(form) {
  const selected = String(form?.elements?.procedure_name?.value || "").trim();
  if (selected === CONSULTORIO_PROCEDURE_CUSTOM_OPTION) {
    return String(form?.elements?.procedure_name_custom?.value || "").trim();
  }
  return selected;
}

function resetUserModalContext() {
  userModalContext = { ...defaultUserModalContext };
}

function getConsultorioLaboratoryProfessionalOptions(currentProfessional = "") {
  const names = new Set();
  (state.users || []).forEach((user) => {
    const name = String(user?.full_name || "").trim();
    if (name) {
      names.add(name);
    }
  });
  const currentUserName = String(authState.currentUser?.full_name || "").trim();
  if (currentUserName) {
    names.add(currentUserName);
  }
  const selectedName = String(currentProfessional || "").trim();
  if (selectedName) {
    names.add(selectedName);
  }
  return Array.from(names).sort((left, right) => left.localeCompare(right, "es"));
}

function renderPatientImagingProfessionalOptions(currentProfessional = "") {
  if (!elements.patientImagingProfessionalSelect) {
    return;
  }
  const selected = String(currentProfessional || "").trim();
  const options = getConsultorioLaboratoryProfessionalOptions(selected);
  elements.patientImagingProfessionalSelect.innerHTML = [
    '<option value="">Selecciona un profesional</option>',
    ...options.map(
      (name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
    ),
  ].join("");
  elements.patientImagingProfessionalSelect.value = selected;
}

function renderPatientRemissionProfessionalOptions(currentProfessional = "") {
  if (!elements.patientRemissionProfessionalSelect) {
    return;
  }
  const selected = String(currentProfessional || "").trim();
  const options = getConsultorioLaboratoryProfessionalOptions(selected);
  elements.patientRemissionProfessionalSelect.innerHTML = [
    '<option value="">Selecciona un profesional</option>',
    ...options.map(
      (name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
    ),
  ].join("");
  elements.patientRemissionProfessionalSelect.value = selected;
}

function loadConsultorioLaboratoryUsersIfNeeded() {
  if (
    loadedBootstrapSections.has("users") ||
    pendingBootstrapSections.has("users") ||
    !elements.patientConsultationForm ||
    !["laboratory", "imaging", "remission"].includes(
      elements.patientConsultationForm.dataset.consultationMode
    )
  ) {
    return;
  }
  markBootstrapSectionsPending(["users"]);
  refreshData({ sections: ["users"], render: false })
    .then(() => {
      if (
        !elements.patientConsultationModal ||
        elements.patientConsultationModal.classList.contains("is-hidden") ||
        !["laboratory", "imaging", "remission"].includes(
          elements.patientConsultationForm?.dataset.consultationMode
        )
      ) {
        return;
      }
      if (elements.patientConsultationForm?.dataset.consultationMode === "laboratory") {
        const items = getPatientLaboratoryItems({ includeEmpty: true });
        renderPatientLaboratoryItems(items);
        return;
      }
      if (elements.patientConsultationForm?.dataset.consultationMode === "remission") {
        renderPatientRemissionProfessionalOptions(
          elements.patientRemissionProfessionalSelect?.value ||
            elements.patientConsultationForm?.elements?.referral_professional?.value ||
            ""
        );
        return;
      }
      renderPatientImagingProfessionalOptions(
        elements.patientImagingProfessionalSelect?.value ||
          elements.patientConsultationForm?.elements?.imaging_professional?.value ||
          ""
      );
    })
    .catch((error) => {
      clearBootstrapSectionsPending(["users"]);
      console.warn("No fue posible cargar los usuarios del consultorio:", error);
    });
}

function normalizeConsultorioLaboratoryResultFile(item) {
  if (!item) {
    return null;
  }
  if (typeof item === "string") {
    const value = item.trim();
    return value
      ? {
          name: value,
          dataUrl: "",
          mimeType: "text/plain",
        }
      : null;
  }
  if (typeof item !== "object") {
    return null;
  }
  const dataUrl = String(item.dataUrl || item.url || "").trim();
  const name = String(item.name || item.label || item.value || "Resultado").trim() || "Resultado";
  if (dataUrl) {
    return {
      name,
      dataUrl,
      mimeType: String(item.mimeType || item.mime_type || "application/octet-stream").trim() ||
        "application/octet-stream",
    };
  }
  return name
    ? {
        name,
        dataUrl: "",
        mimeType: "text/plain",
      }
    : null;
}

async function buildConsultorioLaboratoryResultFile(file) {
  if (!file) {
    return null;
  }
  return {
    name: String(file.name || "resultado").trim() || "resultado",
    dataUrl: await readConsultorioFileAsDataUrl(file),
    mimeType: String(file.type || "application/octet-stream").trim() || "application/octet-stream",
  };
}

function createConsultorioLaboratoryItem(item = {}) {
  const professional = String(item.professional || item.professionalName || "").trim();
  const resolvedItem =
    registerConsultorioOrderCatalogEntry(
      "Prueba/Examen",
      String(item.item || item.name || "").trim()
    ) || String(item.item || item.name || "").trim();
  const quantityValue = Number(item.quantity || 1);
  const results = (Array.isArray(item.results) ? item.results : [])
    .map((result) => normalizeConsultorioLaboratoryResultFile(result))
    .filter(Boolean);
  return {
    professional,
    item: resolvedItem,
    quantity:
      Number.isFinite(quantityValue) && quantityValue >= 1
        ? String(Math.max(1, Math.trunc(quantityValue)))
        : "1",
    results,
  };
}

function hasConsultorioLaboratoryItemContent(item = {}) {
  const normalized = createConsultorioLaboratoryItem(item);
  return Boolean(normalized.professional || normalized.item || normalized.results.length);
}

function buildConsultorioLaboratoryItemLabel(item = {}) {
  const normalized = createConsultorioLaboratoryItem(item);
  const parts = [];
  if (normalized.professional) {
    parts.push(normalized.professional);
  }
  if (normalized.item) {
    parts.push(normalized.item);
  }
  if (normalized.quantity) {
    parts.push(`x${normalized.quantity}`);
  }
  return parts.join(" - ").trim();
}

function buildConsultorioLaboratoryItemsPreview(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((item) => buildConsultorioLaboratoryItemLabel(item))
    .filter(Boolean)
    .join(" | ");
}

function buildConsultorioLaboratoryResultsPreview(items = []) {
  return (Array.isArray(items) ? items : [])
    .flatMap((item) => createConsultorioLaboratoryItem(item).results)
    .map((result) => String(result?.name || "").trim())
    .filter(Boolean)
    .join(" | ");
}

function renderPatientLaboratoryItems(items = []) {
  if (!elements.patientLaboratoryItemsList) {
    return;
  }
  const normalizedItems = (Array.isArray(items) ? items : []).map((item) =>
    createConsultorioLaboratoryItem(item)
  );
  const rows = normalizedItems.length ? normalizedItems : [createConsultorioLaboratoryItem()];
  const examOptions = getConsultorioOrderCatalogOptions("Prueba/Examen").filter(
    (option) => option.value !== CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION
  );
  elements.patientLaboratoryItemsList.innerHTML = rows
    .map((item, index) => {
      const professionalOptions = getConsultorioLaboratoryProfessionalOptions(item.professional);
      const resultsJson = JSON.stringify(item.results || []);
      const resultsMarkup = item.results.length
        ? item.results
            .map(
              (result, resultIndex) => `
                <span class="consultorio-laboratory-item__result-tag">
                  <span>${escapeHtml(truncate(result.name || "Resultado", 28))}</span>
                  <button
                    type="button"
                    class="consultorio-laboratory-item__result-remove"
                    data-remove-lab-item-result="${escapeHtml(String(index))}"
                    data-lab-item-result-index="${escapeHtml(String(resultIndex))}"
                    aria-label="Quitar resultado"
                  >
                    ×
                  </button>
                </span>
              `
            )
            .join("")
        : `<span class="consultorio-laboratory-item__result-placeholder">Sin archivo seleccionado</span>`;
      return `
        <article class="consultorio-order-item consultorio-laboratory-item" data-lab-item="${escapeHtml(
          String(index)
        )}">
          <div class="consultorio-order-item__header">
            <div class="consultorio-order-item__title">
              <span class="consultorio-order-item__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 2v7.31"></path>
                  <path d="M14 9.3V2"></path>
                  <path d="M8.5 2h7"></path>
                  <path d="M14 9.3 19.74 19a2 2 0 0 1-1.72 3H5.98a2 2 0 0 1-1.72-3L10 9.3"></path>
                  <path d="M6.85 15h10.3"></path>
                </svg>
              </span>
              <strong>${rows.length > 1 ? `Prueba ${index + 1}` : "Prueba de laboratorio"}</strong>
            </div>
            <div class="consultorio-order-item__actions">
              <button
                class="inline-link consultorio-order-item__remove"
                type="button"
                data-remove-patient-laboratory-item="${escapeHtml(String(index))}"
              >
                Eliminar
              </button>
            </div>
          </div>

          <div class="consultorio-laboratory-item__grid">
            <label class="consultorio-consultation-form__field">
              <div class="consultorio-order-item__label-row">
                <span>Profesional</span>
                <button
                  class="inline-link consultorio-order-item__link"
                  type="button"
                  data-lab-item-add-user="${escapeHtml(String(index))}"
                >
                  + Registrar usuario
                </button>
              </div>
              <select data-lab-item-field="professional">
                <option value="">Selecciona un profesional</option>
                ${professionalOptions
                  .map(
                    (option) =>
                      `<option value="${escapeHtml(option)}"${
                        option === item.professional ? " selected" : ""
                      }>${escapeHtml(option)}</option>`
                  )
                  .join("")}
              </select>
            </label>

            <label class="consultorio-consultation-form__field">
              <div class="consultorio-order-item__label-row">
                <span>Prueba/Examen</span>
                <button
                  class="inline-link consultorio-order-item__link"
                  type="button"
                  data-lab-item-register-custom="${escapeHtml(String(index))}"
                >
                  + Registrar nuevo
                </button>
              </div>
              <select data-lab-item-field="item">
                <option value="">Selecciona un examen</option>
                ${examOptions
                  .map(
                    (option) =>
                      `<option value="${escapeHtml(option.value)}"${
                        option.value === item.item ? " selected" : ""
                      }>${escapeHtml(option.label)}</option>`
                  )
                  .join("")}
              </select>
            </label>

            <label class="consultorio-consultation-form__field consultorio-laboratory-item__quantity">
              <span>Cantidad</span>
              <input
                data-lab-item-field="quantity"
                type="number"
                min="1"
                step="1"
                value="${escapeHtml(String(item.quantity || "1"))}"
              />
            </label>

            <div class="consultorio-consultation-form__field consultorio-laboratory-item__results-field">
              <span>Resultado</span>
              <div class="consultorio-consultation-form__attachment-row">
                <input
                  class="is-hidden"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                  multiple
                  data-lab-item-result-input="${escapeHtml(String(index))}"
                />
                <button
                  class="consultorio-consultation-form__add consultorio-consultation-form__add--file"
                  type="button"
                  data-lab-item-select-result="${escapeHtml(String(index))}"
                >
                  Seleccionar
                </button>
              </div>
              <div class="consultorio-laboratory-item__results">${resultsMarkup}</div>
              <input
                data-lab-item-field="results"
                type="hidden"
                value="${escapeHtml(resultsJson)}"
              />
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function getPatientLaboratoryItems({ includeEmpty = false } = {}) {
  const rows = Array.from(
    elements.patientLaboratoryItemsList?.querySelectorAll("[data-lab-item]") || []
  ).map((row) => {
    let results = [];
    const rawResults = String(row.querySelector('[data-lab-item-field="results"]')?.value || "").trim();
    if (rawResults) {
      try {
        const parsed = JSON.parse(rawResults);
        results = Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        results = [];
      }
    }
    return createConsultorioLaboratoryItem({
      professional: row.querySelector('[data-lab-item-field="professional"]')?.value || "",
      item: row.querySelector('[data-lab-item-field="item"]')?.value || "",
      quantity: row.querySelector('[data-lab-item-field="quantity"]')?.value || "1",
      results,
    });
  });
  return includeEmpty ? rows : rows.filter((item) => hasConsultorioLaboratoryItemContent(item));
}

function renderConsultorioOrderNameField({
  index,
  orderType,
  searchOptions,
  itemOptions,
  itemSelectValue,
  pickerLabel,
  isSearchableType,
}) {
  if (isSearchableType) {
    const canRegisterCustom = isConsultorioOrderCustomRegistrableType(orderType);
    return `
      <div class="consultorio-consultation-form__field consultorio-order-item__picker-field">
        <div class="consultorio-order-item__label-row">
          <span>${escapeHtml(getConsultorioOrderTypeLabel(orderType))}</span>
          ${
            canRegisterCustom
              ? `
          <button
            class="inline-link consultorio-order-item__link"
            type="button"
            data-order-item-register-custom="${escapeHtml(String(index))}"
          >
            + Registrar nuevo
          </button>
          `
              : ""
          }
        </div>
        <div class="consultorio-order-picker" data-order-picker="${escapeHtml(String(index))}">
          <button
            class="consultorio-order-picker__trigger"
            type="button"
            data-order-picker-trigger="${escapeHtml(String(index))}"
            aria-expanded="false"
          >
            <span>${escapeHtml(pickerLabel || "Seleccione una opcion")}</span>
            <span class="consultorio-order-picker__chevron" aria-hidden="true"></span>
          </button>
          <div class="consultorio-order-picker__panel is-hidden" data-order-picker-panel="${escapeHtml(
            String(index)
          )}">
            <input
              class="consultorio-order-picker__search"
              type="text"
              data-order-picker-search="${escapeHtml(String(index))}"
              placeholder="Buscar una opcion"
              autocomplete="off"
            />
            <div class="consultorio-order-picker__options">
              ${searchOptions
                .map(
                  (option) => `
                    <button
                      class="consultorio-order-picker__option${
                        option.value === itemSelectValue ? " is-selected" : ""
                      }"
                      type="button"
                      data-order-item-option="${escapeHtml(String(index))}"
                      data-option-value="${escapeHtml(option.value)}"
                    >
                      ${escapeHtml(option.label)}
                    </button>
                  `
                )
                .join("")}
              <div class="consultorio-order-picker__empty is-hidden" data-order-picker-empty>
                No se encontraron opciones
              </div>
            </div>
          </div>
          <input
            data-order-item-field="item"
            type="hidden"
            value="${escapeHtml(itemSelectValue)}"
          />
        </div>
      </div>
    `;
  }
  return `
    <label class="consultorio-consultation-form__field">
      <span>Orden</span>
      <select data-order-item-field="item">
        <option value="">Seleccione una opcion</option>
        ${itemOptions
          .map(
            (option) =>
              `<option value="${escapeHtml(option.value)}"${
                option.value === itemSelectValue ? " selected" : ""
              }>${escapeHtml(option.label)}</option>`
          )
          .join("")}
      </select>
    </label>
  `;
}

function renderConsultorioHospitalizationPriorityField(item, index) {
  const priorityOptions = getConsultorioOrderPriorityOptions("Hospitalizacion");
  const selectedOption =
    priorityOptions.find((option) => option.value === String(item.priority || "").trim()) || null;
  return `
    <div class="consultorio-consultation-form__field consultorio-order-item__priority-field">
      <span>Prioridad</span>
      <div class="consultorio-order-picker consultorio-order-priority-picker" data-order-picker="${escapeHtml(
        `priority-${index}`
      )}">
        <button
          class="consultorio-order-picker__trigger"
          type="button"
          data-order-priority-trigger="${escapeHtml(String(index))}"
          aria-expanded="false"
        >
          <span>${escapeHtml(selectedOption?.value || "Seleccione una opcion")}</span>
          <span class="consultorio-order-picker__chevron" aria-hidden="true"></span>
        </button>
        <div
          class="consultorio-order-picker__panel consultorio-order-priority-picker__panel is-hidden"
          data-order-priority-panel="${escapeHtml(String(index))}"
        >
          <input
            class="consultorio-order-picker__search consultorio-order-priority-picker__search"
            type="text"
            data-order-priority-search="${escapeHtml(String(index))}"
            placeholder=""
            autocomplete="off"
          />
          <div class="consultorio-order-picker__options consultorio-order-priority-picker__options">
            ${priorityOptions
              .map(
                (option) => `
                  <button
                    class="consultorio-order-priority-picker__option${
                      option.value === selectedOption?.value ? " is-selected" : ""
                    }"
                    type="button"
                    data-order-priority-option="${escapeHtml(String(index))}"
                    data-priority-value="${escapeHtml(option.value)}"
                  >
                    <span
                      class="consultorio-order-priority-picker__dot consultorio-order-priority-picker__dot--${escapeHtml(
                        option.tone
                      )}"
                      aria-hidden="true"
                    ></span>
                    <span class="consultorio-order-priority-picker__content">
                      <span class="consultorio-order-priority-picker__label">${escapeHtml(
                        option.value
                      )}</span>
                      <span class="consultorio-order-priority-picker__description">${escapeHtml(
                        option.description
                      )}</span>
                    </span>
                  </button>
                `
              )
              .join("")}
            <div class="consultorio-order-picker__empty is-hidden" data-order-priority-empty>
              No se encontraron opciones
            </div>
          </div>
        </div>
        <input
          data-order-item-field="priority"
          type="hidden"
          value="${escapeHtml(String(item.priority || ""))}"
        />
      </div>
    </div>
  `;
}

function renderPatientOrderItems(items = []) {
  if (!elements.patientOrderItemsList) {
    return;
  }
  const normalizedItems = (Array.isArray(items) ? items : []).map((item) =>
    createConsultorioOrderItem(item)
  );
  const rows = normalizedItems.length ? normalizedItems : [createConsultorioOrderItem()];
  elements.patientOrderItemsList.innerHTML = rows
    .map((item, index) => {
      const orderType = normalizeConsultorioOrderType(item.type);
      const orderName = getConsultorioOrderItemDisplayName(item);
      const itemOptions = getConsultorioOrderCatalogOptions(orderType);
      const searchOptions = itemOptions.filter(
        (option) => option.value !== CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION
      );
      const isSearchableType = isConsultorioOrderSearchableType(orderType);
      const isHospitalizationType = isConsultorioHospitalizationOrderType(orderType);
      const showCustomField = item.item === CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION || Boolean(item.itemCustom);
      const itemSelectValue = showCustomField
        ? CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION
        : String(item.item || "").trim();
      const selectedOption = searchOptions.find((option) => option.value === itemSelectValue);
      const pickerLabel = selectedOption?.label || (showCustomField ? orderName : "");
      return `
        <article class="consultorio-order-item" data-order-item="${escapeHtml(String(index))}">
          <div class="consultorio-order-item__header">
            <div class="consultorio-order-item__title">
              <span class="consultorio-order-item__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
                  <path d="M14 2v5h5"></path>
                  <path d="M12 18v-6"></path>
                  <path d="M9 15h6"></path>
                </svg>
              </span>
              <strong>${rows.length > 1 ? `Orden ${index + 1}` : "Orden"}</strong>
            </div>
            <div class="consultorio-order-item__actions">
              <button
                class="inline-link consultorio-order-item__remove${rows.length === 1 ? " is-hidden" : ""}"
                type="button"
                data-remove-patient-order-item="${escapeHtml(String(index))}"
              >
                Eliminar
              </button>
            </div>
          </div>

          <div class="consultorio-order-item__grid${
            isHospitalizationType ? " consultorio-order-item__grid--hospitalization" : ""
          }">
            <label class="consultorio-consultation-form__field">
              <span>Tipo de orden</span>
              <select data-order-item-field="type">
                <option value="">Seleccione una opcion</option>
                ${CONSULTORIO_ORDER_TYPE_OPTIONS.map(
                  (option) =>
                    `<option value="${escapeHtml(option)}"${
                      option === orderType ? " selected" : ""
                    }>${escapeHtml(getConsultorioOrderTypeLabel(option))}</option>`
                ).join("")}
              </select>
            </label>

            ${
              isHospitalizationType
                ? ""
                : renderConsultorioOrderNameField({
                    index,
                    orderType,
                    searchOptions,
                    itemOptions,
                    itemSelectValue,
                    pickerLabel,
                    isSearchableType,
                  })
            }

            <label class="consultorio-consultation-form__field consultorio-order-item__quantity">
              <span>Cantidad</span>
              <input
                data-order-item-field="quantity"
                type="number"
                min="1"
                step="1"
                value="${escapeHtml(String(item.quantity || "1"))}"
              />
            </label>

            ${
              isHospitalizationType
                ? renderConsultorioHospitalizationPriorityField(item, index)
                : `
            <label class="consultorio-consultation-form__field">
              <span>Prioridad</span>
              <select data-order-item-field="priority">
                <option value="">Seleccione (opcional)</option>
                ${CONSULTORIO_ORDER_STANDARD_PRIORITY_OPTIONS
                  .map(
                    (option) =>
                      `<option value="${escapeHtml(option)}"${
                        option === item.priority ? " selected" : ""
                      }>${escapeHtml(option)}</option>`
                  )
                  .join("")}
              </select>
            </label>
            `
            }

            ${
              isHospitalizationType
                ? `
            <label class="consultorio-consultation-form__field consultorio-order-item__notes-inline">
              <span>Notas</span>
              <input
                data-order-item-field="notes"
                type="text"
                value="${escapeHtml(item.notes || "")}"
                placeholder="Notas u observaciones"
              />
            </label>
            `
                : ""
            }
          </div>

          <label class="consultorio-consultation-form__field consultorio-order-item__custom${
            showCustomField && !isHospitalizationType ? "" : " is-hidden"
          }">
            <span>Orden personalizada</span>
            <input
              data-order-item-field="item_custom"
              type="text"
              value="${escapeHtml(item.itemCustom || (showCustomField ? orderName : ""))}"
              placeholder="Describe la orden"
            />
          </label>

          ${
            isHospitalizationType
              ? ""
              : `
          <label class="consultorio-consultation-form__field">
            <span>Notas</span>
            <input
              data-order-item-field="notes"
              type="text"
              value="${escapeHtml(item.notes || "")}"
              placeholder="Notas u observaciones"
            />
          </label>
          `
          }
        </article>
      `;
    })
    .join("");
}

function getPatientOrderItems({ includeEmpty = false } = {}) {
  const rows = Array.from(
    elements.patientOrderItemsList?.querySelectorAll("[data-order-item]") || []
  ).map((row) =>
    createConsultorioOrderItem({
      type: row.querySelector('[data-order-item-field="type"]')?.value || "",
      item: row.querySelector('[data-order-item-field="item"]')?.value || "",
      itemCustom: row.querySelector('[data-order-item-field="item_custom"]')?.value || "",
      quantity: row.querySelector('[data-order-item-field="quantity"]')?.value || "1",
      priority: row.querySelector('[data-order-item-field="priority"]')?.value || "",
      notes: row.querySelector('[data-order-item-field="notes"]')?.value || "",
    })
  );
  if (includeEmpty) {
    return rows;
  }
  return rows.filter((item) => hasConsultorioOrderItemContent(item));
}

function closePatientOrderPickerPanels() {
  elements.patientOrderItemsList
    ?.querySelectorAll("[data-order-picker-panel]")
    .forEach((panel) => panel.classList.add("is-hidden"));
  elements.patientOrderItemsList
    ?.querySelectorAll("[data-order-picker-trigger]")
    .forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
  elements.patientOrderItemsList
    ?.querySelectorAll("[data-order-priority-panel]")
    .forEach((panel) => panel.classList.add("is-hidden"));
  elements.patientOrderItemsList
    ?.querySelectorAll("[data-order-priority-trigger]")
    .forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
}

function filterPatientOrderPickerOptions(searchInput) {
  const panel = searchInput?.closest("[data-order-picker-panel]");
  if (!panel) {
    return;
  }
  const query = String(searchInput.value || "").trim().toLowerCase();
  let visibleCount = 0;
  panel.querySelectorAll("[data-order-item-option]").forEach((button) => {
    const matches = !query || button.textContent.toLowerCase().includes(query);
    button.classList.toggle("is-hidden", !matches);
    if (matches) {
      visibleCount += 1;
    }
  });
  panel
    .querySelector("[data-order-picker-empty]")
    ?.classList.toggle("is-hidden", visibleCount > 0);
}

function filterPatientOrderPriorityOptions(searchInput) {
  const panel = searchInput?.closest("[data-order-priority-panel]");
  if (!panel) {
    return;
  }
  const query = String(searchInput.value || "").trim().toLowerCase();
  let visibleCount = 0;
  panel.querySelectorAll("[data-order-priority-option]").forEach((button) => {
    const matches = !query || button.textContent.toLowerCase().includes(query);
    button.classList.toggle("is-hidden", !matches);
    if (matches) {
      visibleCount += 1;
    }
  });
  panel
    .querySelector("[data-order-priority-empty]")
    ?.classList.toggle("is-hidden", visibleCount > 0);
}

function closeConsultorioOrderActionMenus() {
  elements.consultorioPatientProfileSummary
    ?.querySelectorAll("[data-order-actions-menu]")
    .forEach((menu) => {
      menu.classList.add("is-hidden");
      menu.style.removeProperty("top");
      menu.style.removeProperty("left");
    });
  elements.consultorioPatientProfileSummary
    ?.querySelectorAll("[data-order-actions-toggle]")
    .forEach((button) => button.setAttribute("aria-expanded", "false"));
}

function positionConsultorioOrderActionMenu(menu, button) {
  if (!menu || !button) {
    return;
  }
  const shell =
    button.closest(".consultorio-orders-shell, .consultorio-laboratory-shell") ||
    elements.consultorioPatientProfileSummary;
  if (!shell) {
    return;
  }
  if (menu.parentElement !== shell) {
    shell.appendChild(menu);
  }
  const buttonRect = button.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();
  const spacing = 8;
  const viewportPadding = 12;
  const menuWidth = menu.offsetWidth || 168;
  const menuHeight = menu.offsetHeight || 0;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const availableBelow = viewportHeight - buttonRect.bottom - viewportPadding;
  const shouldOpenUpward = menuHeight > availableBelow && buttonRect.top > menuHeight + viewportPadding;
  const shellWidth = shell.clientWidth || shellRect.width || viewportWidth;
  const resolvedTop = shouldOpenUpward
    ? Math.max(viewportPadding, buttonRect.top - shellRect.top - menuHeight - spacing)
    : Math.max(viewportPadding, buttonRect.bottom - shellRect.top + spacing);
  const preferredLeft = buttonRect.right - shellRect.left - menuWidth;
  const resolvedLeft = Math.min(
    Math.max(viewportPadding, preferredLeft),
    Math.max(viewportPadding, shellWidth - menuWidth - viewportPadding)
  );
  menu.style.top = `${Math.max(viewportPadding, resolvedTop)}px`;
  menu.style.left = `${resolvedLeft}px`;
}

function toggleConsultorioOrderActionMenu(orderId) {
  if (!orderId || !elements.consultorioPatientProfileSummary) {
    return;
  }
  const menu = elements.consultorioPatientProfileSummary.querySelector(
    `[data-order-actions-menu="${orderId}"]`
  );
  const button = elements.consultorioPatientProfileSummary.querySelector(
    `[data-order-actions-toggle="${orderId}"]`
  );
  if (!menu || !button) {
    return;
  }
  const willOpen = menu.classList.contains("is-hidden");
  closeConsultorioOrderActionMenus();
  closeConsultorioLaboratoryActionMenus();
  if (willOpen) {
    menu.classList.remove("is-hidden");
    positionConsultorioOrderActionMenu(menu, button);
    button.setAttribute("aria-expanded", "true");
    return;
  }
  menu.classList.add("is-hidden");
  button.setAttribute("aria-expanded", "false");
}

function closeConsultorioLaboratoryActionMenus() {
  elements.consultorioPatientProfileSummary
    ?.querySelectorAll("[data-lab-actions-menu]")
    .forEach((menu) => {
      menu.classList.add("is-hidden");
      menu.style.removeProperty("top");
      menu.style.removeProperty("left");
    });
  elements.consultorioPatientProfileSummary
    ?.querySelectorAll("[data-lab-actions-toggle]")
    .forEach((button) => button.setAttribute("aria-expanded", "false"));
}

function toggleConsultorioLaboratoryActionMenu(consultationId) {
  if (!consultationId || !elements.consultorioPatientProfileSummary) {
    return;
  }
  const menu = elements.consultorioPatientProfileSummary.querySelector(
    `[data-lab-actions-menu="${consultationId}"]`
  );
  const button = elements.consultorioPatientProfileSummary.querySelector(
    `[data-lab-actions-toggle="${consultationId}"]`
  );
  if (!menu || !button) {
    return;
  }
  const willOpen = menu.classList.contains("is-hidden");
  closeConsultorioOrderActionMenus();
  closeConsultorioLaboratoryActionMenus();
  if (willOpen) {
    menu.classList.remove("is-hidden");
    positionConsultorioOrderActionMenu(menu, button);
    button.setAttribute("aria-expanded", "true");
    return;
  }
  menu.classList.add("is-hidden");
  button.setAttribute("aria-expanded", "false");
}

async function handleConsultorioLaboratoryAction(action, consultationId) {
  const consultation = getConsultationById(consultationId || "");
  if (!consultation) {
    showStatus("No se encontro el examen de laboratorio seleccionado.", "error");
    return;
  }
  closeConsultorioLaboratoryActionMenus();
  if (action === "view") {
    openPatientConsultationModal(consultation);
    return;
  }
  if (action === "delete") {
    const confirmed = window.confirm(
      "¿Eliminar este examen de laboratorio? Esta accion no se puede deshacer."
    );
    if (!confirmed) {
      return;
    }
    await api.deleteConsultation(consultation.id);
    await refreshData({
      sections: ["consultations", "records"],
      message: "Examen de laboratorio eliminado.",
    });
    consultorioPatientProfileOpen = true;
    consultorioProfileView = "laboratorio";
    setActiveSection(CONSULTORIO_PATIENT_PROFILE_SECTION_ID);
  }
}

async function handleConsultorioDocumentDeleteAction(consultationId) {
  const consultation = getConsultationById(consultationId || "");
  if (!consultation) {
    showStatus("No se encontro el documento seleccionado.", "error");
    return;
  }
  const confirmed = window.confirm("¿Eliminar este documento? Esta accion no se puede deshacer.");
  if (!confirmed) {
    return;
  }
  await api.deleteConsultation(consultation.id);
  await refreshData({
    sections: ["consultations", "records"],
    message: "Documento eliminado.",
  });
  consultorioPatientProfileOpen = true;
  consultorioProfileView = "documents";
  setActiveSection(CONSULTORIO_PATIENT_PROFILE_SECTION_ID);
}

function openConsultorioOrderPrintView(consultation) {
  const patient = getPatientById(consultation?.patient_id || "") || getConsultorioPatient();
  const owner = getOwnerById(consultation?.owner_id || patient?.owner_id || "");
  const orderDetails = parseConsultorioOrderDetails(consultation);
  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=860,height=720");
  if (!printWindow) {
    showStatus("El navegador bloqueó la ventana de impresión.", "error");
    return;
  }
  const itemsMarkup =
    buildConsultorioOrderItemsMarkup(orderDetails.items) || "<li>Sin items registrados.</li>";
  printWindow.document.write(`
    <html>
      <head>
        <title>Orden ${escapeHtml(patient?.name || "Paciente")}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 28px; color: #24324a; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          h2 { margin: 22px 0 10px; font-size: 16px; }
          p { margin: 4px 0; line-height: 1.5; }
          ul { margin: 10px 0 0; padding-left: 18px; }
          li { margin-bottom: 10px; }
          li div { margin-top: 3px; color: #5a667d; font-size: 13px; }
          .meta { color: #5a667d; font-size: 13px; }
          .card { margin-top: 18px; padding-top: 18px; border-top: 1px solid #d7deea; }
        </style>
      </head>
      <body>
        <h1>Orden</h1>
        <p class="meta">Paciente: ${escapeHtml(patient?.name || consultation?.patient_name || "Paciente")}</p>
        <p class="meta">Propietario: ${escapeHtml(owner?.full_name || consultation?.owner_name || "Sin propietario")}</p>
        <p class="meta">Fecha: ${escapeHtml(formatDateTime(consultation?.consultation_at || ""))}</p>
        <p class="meta">Usuario: ${escapeHtml(consultation?.professional_name || "Sin usuario")}</p>
        <div class="card">
          <h2>Ordenes</h2>
          <ul>${itemsMarkup}</ul>
        </div>
        <div class="card">
          <h2>Motivo de la orden</h2>
          <p>${escapeHtml(orderDetails.reason || "Sin motivo registrado.")}</p>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function openConsultorioOrderEmailDraft(consultation) {
  const patient = getPatientById(consultation?.patient_id || "") || getConsultorioPatient();
  const owner = getOwnerById(consultation?.owner_id || patient?.owner_id || "");
  if (!owner?.email) {
    showStatus("El propietario no tiene correo registrado para enviar esta orden.", "error");
    return;
  }
  const orderDetails = parseConsultorioOrderDetails(consultation);
  const itemsText =
    (Array.isArray(orderDetails.items) ? orderDetails.items : [])
      .filter((item) => hasConsultorioOrderItemContent(item))
      .map((item, index) => `${index + 1}. ${buildConsultorioOrderItemLabel(item)}`)
      .join("\n") || "Sin items registrados.";
  const subject = `Orden para ${patient?.name || consultation?.patient_name || "Paciente"}`;
  const body = [
    `Hola ${owner.full_name || ""},`,
    "",
    `Te compartimos la orden registrada para ${patient?.name || consultation?.patient_name || "tu mascota"}.`,
    "",
    `Fecha: ${formatDateTime(consultation?.consultation_at || "")}`,
    `Veterinario: ${consultation?.professional_name || "Sin usuario"}`,
    "",
    "Ordenes:",
    itemsText,
    "",
    `Motivo de la orden: ${orderDetails.reason || "Sin motivo registrado."}`,
  ].join("\n");
  window.location.href = `mailto:${encodeURIComponent(owner.email)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

async function handleConsultorioOrderAction(action, consultationId) {
  const consultation = getConsultationById(consultationId || "");
  if (!consultation) {
    showStatus("No se encontro la orden seleccionada.", "error");
    return;
  }
  closeConsultorioOrderActionMenus();
  if (action === "view") {
    openPatientConsultationModal(consultation);
    return;
  }
  if (action === "print") {
    openConsultorioOrderPrintView(consultation);
    return;
  }
  if (action === "email") {
    openConsultorioOrderEmailDraft(consultation);
    return;
  }
  if (action === "followup") {
    consultorioProfileView = "seguimiento";
    renderConsultorioPatientProfile();
    showStatus("Vista de seguimientos abierta para esta mascota.", "info");
    return;
  }
  if (action === "delete") {
    const confirmed = window.confirm("¿Eliminar esta orden? Esta accion no se puede deshacer.");
    if (!confirmed) {
      return;
    }
    await api.deleteConsultation(consultation.id);
    await refreshData({
      sections: ["consultations", "records"],
      message: "Orden eliminada.",
    });
    consultorioPatientProfileOpen = true;
    consultorioProfileView = "orders";
    setActiveSection(CONSULTORIO_PATIENT_PROFILE_SECTION_ID);
  }
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
  const isProcedureMode =
    isProcedureConsultationType(defaultConsultationType) || profileConfig?.value === "cirugia";
  const isHospAmbMode =
    isHospAmbConsultationType(defaultConsultationType) || profileConfig?.value === "hospamb";
  const isLaboratoryMode =
    isLaboratoryConsultationType(defaultConsultationType) || profileConfig?.value === "laboratorio";
  const isImagingMode =
    isImagingConsultationType(defaultConsultationType) || profileConfig?.value === "imagenes";
  const isRemissionMode =
    defaultConsultationType === "Remision" || profileConfig?.value === "remisiones";
  const isOrderMode =
    (defaultConsultationType === "Documento" && profileConfig?.value === "orders") ||
    false;
  const documentDetails = parseConsultorioDocumentDetails(consultation);
  const isDocumentMode =
    !isOrderMode &&
    defaultConsultationType === "Documento" &&
    (profileConfig?.value === "documents" || documentDetails.kind === "document");
  const isFollowupMode =
    isFollowupConsultationType(defaultConsultationType) || profileConfig?.value === "seguimiento";
  const defaultTitle =
    consultation?.title || getConsultorioProfileDefaultConsultationTitle(profileConfig);
  form.reset();
  form.dataset.consultationMode = isOrderMode
    ? "orders"
    : isProcedureMode
    ? "procedure"
    : isHospAmbMode
    ? "hospamb"
    : isLaboratoryMode
    ? "laboratory"
    : isImagingMode
    ? "imaging"
    : isRemissionMode
    ? "remission"
    : isDocumentMode
    ? "documents"
    : isFollowupMode
    ? "followup"
    : isVaccinationMode
    ? "vaccination"
    : isFormulaMode
    ? "formula"
    : isDewormingMode
    ? "deworming"
    : "clinical";
  const details = parseConsultorioConsultationDetails(consultation);
  const vaccinationDetails = parseConsultorioVaccinationDetails(consultation);
  const formulaDetails = parseConsultorioFormulaDetails(consultation);
  const dewormingDetails = parseConsultorioDewormingDetails(consultation);
  const procedureDetails = parseConsultorioProcedureDetails(consultation);
  const hospAmbDetails = parseConsultorioHospAmbDetails(consultation);
  const laboratoryDetails = parseConsultorioLaboratoryDetails(consultation);
  const imagingDetails = parseConsultorioImagingDetails(consultation);
  const remissionDetails = parseConsultorioReferralDetails(consultation);
  const followupDetails = parseConsultorioFollowupDetails(consultation);
  const orderDetails = parseConsultorioOrderDetails(consultation);
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
  if (form.elements.procedure_date) {
    form.elements.procedure_date.value =
      procedureDetails.procedureDate || normalizeDateFieldValue(new Date().toISOString());
  }
  if (form.elements.procedure_description) {
    form.elements.procedure_description.value = procedureDetails.description || "";
  }
  if (form.elements.procedure_preanesthetic) {
    form.elements.procedure_preanesthetic.value = procedureDetails.preanesthetic || "";
  }
  if (form.elements.procedure_anesthetic) {
    form.elements.procedure_anesthetic.value = procedureDetails.anesthetic || "";
  }
  if (form.elements.procedure_other_medications) {
    form.elements.procedure_other_medications.value = procedureDetails.otherMedications || "";
  }
  if (form.elements.procedure_treatment) {
    form.elements.procedure_treatment.value = procedureDetails.treatment || "";
  }
  if (form.elements.procedure_observations) {
    form.elements.procedure_observations.value = procedureDetails.observations || "";
  }
  if (form.elements.procedure_complications) {
    form.elements.procedure_complications.value = procedureDetails.complications || "";
  }
  if (form.elements.order_date) {
    form.elements.order_date.value =
      orderDetails.orderDate || normalizeDateFieldValue(new Date().toISOString());
  }
  if (form.elements.order_reason) {
    form.elements.order_reason.value = orderDetails.reason || "";
  }
  renderPatientOrderItems(orderDetails.items);
  if (form.elements.laboratory_date) {
    form.elements.laboratory_date.value =
      laboratoryDetails.examDate || normalizeDateFieldValue(new Date().toISOString());
  }
  if (form.elements.laboratory_diagnosis) {
    form.elements.laboratory_diagnosis.value = laboratoryDetails.diagnosis || "";
  }
  renderPatientLaboratoryItems(laboratoryDetails.items);
  if (form.elements.imaging_date) {
    form.elements.imaging_date.value =
      imagingDetails.imagingDate || normalizeDateFieldValue(new Date().toISOString());
  }
  if (form.elements.imaging_aid) {
    form.elements.imaging_aid.value = imagingDetails.aid || "";
  }
  renderPatientImagingProfessionalOptions(
    imagingDetails.professional ||
      consultation?.professional_name ||
      getDefaultConsultorioProfessionalName()
  );
  if (form.elements.imaging_signs) {
    form.elements.imaging_signs.value = imagingDetails.signs || "";
  }
  if (form.elements.imaging_diagnosis) {
    form.elements.imaging_diagnosis.value = imagingDetails.diagnosis || "";
  }
  if (form.elements.imaging_study_type) {
    form.elements.imaging_study_type.value = imagingDetails.studyType || "";
  }
  if (form.elements.imaging_observations) {
    form.elements.imaging_observations.value = imagingDetails.observations || "";
  }
  setPatientImagingAttachments(imagingDetails.attachments || []);
  if (form.elements.referral_date) {
    form.elements.referral_date.value =
      remissionDetails.referralDate || toInputDateTime(new Date().toISOString());
  }
  renderPatientRemissionProfessionalOptions(
    remissionDetails.professional ||
      consultation?.professional_name ||
      getDefaultConsultorioProfessionalName()
  );
  if (form.elements.referral_professional) {
    form.elements.referral_professional.value = remissionDetails.professional || "";
  }
  if (form.elements.referral_destination) {
    form.elements.referral_destination.value = remissionDetails.destination || "";
  }
  if (form.elements.referral_reason) {
    form.elements.referral_reason.value = remissionDetails.reason || "";
  }
  if (form.elements.referral_observations) {
    form.elements.referral_observations.value = remissionDetails.observations || "";
  }
  if (isLaboratoryMode || isImagingMode || isRemissionMode) {
    loadConsultorioLaboratoryUsersIfNeeded();
  }
  resetPatientDocumentTemplateWorkflowState();
  renderPatientDocumentFormatOptions(documentDetails.format || "");
  if (form.elements.document_format) {
    form.elements.document_format.value = documentDetails.format || "";
  }
  if (form.elements.document_name) {
    form.elements.document_name.value = documentDetails.name || defaultTitle;
  }
  if (form.elements.document_requires_signature) {
    form.elements.document_requires_signature.value = documentDetails.requiresSignature
      ? "required"
      : "optional";
  }
  if (elements.patientDocumentOwnerSignatureCheckbox) {
    elements.patientDocumentOwnerSignatureCheckbox.checked = Boolean(
      documentDetails.signatureConfig?.owner
    );
  }
  if (elements.patientDocumentProfessionalSignatureCheckbox) {
    elements.patientDocumentProfessionalSignatureCheckbox.checked = Boolean(
      documentDetails.signatureConfig?.professional
    );
  }
  syncPatientDocumentSignatureOptionsVisibility();
  if (elements.patientDocumentStyleSelect) {
    elements.patientDocumentStyleSelect.value = "";
  }
  if (elements.patientDocumentBlockFormatSelect) {
    elements.patientDocumentBlockFormatSelect.value = "p";
  }
  if (elements.patientDocumentFontFamilySelect) {
    elements.patientDocumentFontFamilySelect.value = "";
  }
  if (elements.patientDocumentFontSizeSelect) {
    elements.patientDocumentFontSizeSelect.value = "";
  }
  syncPatientDocumentTemplateSelection({
    format: documentDetails.format || "",
    templateId: documentDetails.templateId || "",
    applyTemplate: false,
    syncSuggestedValues: false,
  });
  setPatientDocumentEditorMode("visual");
  setPatientDocumentEditorContent(documentDetails.contentHtml);
  patientDocumentLastGeneratedHtml = "";
  patientDocumentLastSuggestedName = "";
  if (form.elements.document_notify_owner) {
    form.elements.document_notify_owner.checked = Boolean(documentDetails.notifyOwner);
  }
  if (form.elements.followup_date) {
    form.elements.followup_date.value =
      followupDetails.followupDate || toInputDateTime(new Date().toISOString());
  }
  if (form.elements.followup_type) {
    ensureConsultorioSelectOption(form.elements.followup_type, followupDetails.type);
    form.elements.followup_type.value = followupDetails.type || "";
  }
  if (form.elements.followup_reason) {
    ensureConsultorioSelectOption(form.elements.followup_reason, followupDetails.reason);
    form.elements.followup_reason.value = followupDetails.reason || "No especificado";
  }
  if (form.elements.followup_details) {
    form.elements.followup_details.value = followupDetails.details || "";
  }
  if (form.elements.followup_next_control) {
    form.elements.followup_next_control.value = followupDetails.nextControl || "";
  }
  if (form.elements.followup_notify_owner) {
    form.elements.followup_notify_owner.checked = Boolean(followupDetails.notifyOwner);
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
  if (elements.patientProcedureAttachmentFileInput) {
    elements.patientProcedureAttachmentFileInput.value = "";
  }
  if (elements.patientImagingAttachmentFileInput) {
    elements.patientImagingAttachmentFileInput.value = "";
  }
  setPatientConsultationAttachments(parseConsultorioAttachments(consultation?.attachments_summary || ""));
  setPatientDewormingAttachments(parseConsultorioAttachments(consultation?.attachments_summary || ""));
  setPatientProcedureAttachments(parseConsultorioAttachments(consultation?.attachments_summary || ""));
  setPatientProcedureNameValue(procedureDetails.name || "");
  if (elements.patientConsultationModalTitle) {
    const entityLabel = isImagingMode
      ? "Imagenologia"
      : isHospAmbMode
      ? "Hospitalizaci\u00f3n/ambulatorio"
      : isRemissionMode
      ? "Remisi\u00f3n"
      : profileConfig?.value === "orders" && defaultConsultationType === "Documento"
      ? "Orden"
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
  if (elements.patientConsultationAttachmentFileButton) {
    elements.patientConsultationAttachmentFileButton.textContent = isFollowupMode
      ? "+ Agregar"
      : "Adjuntar archivo";
  }
  if (elements.patientConsultationAttachmentHint) {
    elements.patientConsultationAttachmentHint.classList.toggle("is-hidden", isFollowupMode);
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
  if (elements.patientProcedureFields) {
    elements.patientProcedureFields.classList.toggle("is-hidden", !isProcedureMode);
  }
  if (elements.patientOrderFields) {
    elements.patientOrderFields.classList.toggle("is-hidden", !isOrderMode);
  }
  if (elements.patientLaboratoryFields) {
    elements.patientLaboratoryFields.classList.toggle("is-hidden", !isLaboratoryMode);
  }
  if (elements.patientImagingFields) {
    elements.patientImagingFields.classList.toggle("is-hidden", !isImagingMode);
  }
  if (elements.patientRemissionFields) {
    elements.patientRemissionFields.classList.toggle("is-hidden", !isRemissionMode);
  }
  if (elements.patientDocumentFields) {
    elements.patientDocumentFields.classList.toggle("is-hidden", !isDocumentMode);
  }
  if (elements.patientFollowupFields) {
    elements.patientFollowupFields.classList.toggle("is-hidden", !isFollowupMode);
  }
  if (elements.patientConsultationClinicalFields) {
    elements.patientConsultationClinicalFields.classList.toggle(
      "consultorio-consultation-mode--followup",
      isFollowupMode
    );
    elements.patientConsultationClinicalFields.classList.toggle(
      "is-hidden",
      isVaccinationMode ||
        isFormulaMode ||
        isDewormingMode ||
        isHospAmbMode ||
        isProcedureMode ||
        isLaboratoryMode ||
        isImagingMode ||
        isRemissionMode ||
        isDocumentMode ||
        isOrderMode
    );
  }
  if (elements.patientFollowupMessageFields) {
    elements.patientFollowupMessageFields.classList.toggle("is-hidden", !isFollowupMode);
  }
  const modalCard = elements.patientConsultationModal.querySelector(".modal-card");
  const defaultModalIconSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 21V5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V21"></path>
      <path d="M3 21h18"></path>
      <path d="M9 8h1"></path>
      <path d="M14 8h1"></path>
      <path d="M9 12h1"></path>
      <path d="M14 12h1"></path>
      <path d="M12 7v6"></path>
      <path d="M9 10h6"></path>
      <path d="M10 21v-4h4v4"></path>
    </svg>
  `;
  const procedureModalIconSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 4V2"></path>
      <path d="M9 4V2"></path>
      <path d="M10 10 4.5 15.5a2.12 2.12 0 1 0 3 3L13 13"></path>
      <path d="m14 9 1-1"></path>
      <path d="M5 8h14"></path>
      <path d="M7 4h10a2 2 0 0 1 2 2v2H5V6a2 2 0 0 1 2-2Z"></path>
    </svg>
  `;
  const orderModalIconSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
      <path d="M14 2v5h5"></path>
      <path d="M9 12h6"></path>
      <path d="M12 9v6"></path>
    </svg>
  `;
  const laboratoryModalIconSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 2v7.5"></path>
      <path d="M14 9.5V2"></path>
      <path d="M8.5 2h7"></path>
      <path d="M9.2 9.5 4.36 18a2 2 0 0 0 1.74 3h11.8a2 2 0 0 0 1.74-3L14.8 9.5"></path>
      <path d="M7.5 14h9"></path>
    </svg>
  `;
  const imagingModalIconSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 5h16"></path>
      <path d="M6 5v14"></path>
      <path d="M18 5v14"></path>
      <path d="M8 9h8"></path>
      <path d="M8 13h8"></path>
      <path d="M12 9v10"></path>
    </svg>
  `;
  const remissionModalIconSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 18V9h8.5L19 13v5"></path>
      <path d="M6 18H4a1 1 0 0 1-1-1v-4a4 4 0 0 1 4-4h1"></path>
      <path d="M14 9v4h5"></path>
      <path d="M9 8V4"></path>
      <path d="M7 6h4"></path>
      <circle cx="7.5" cy="18" r="1.5"></circle>
      <circle cx="16.5" cy="18" r="1.5"></circle>
    </svg>
  `;
  const documentModalIconSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"></path>
      <path d="M14 2v5h5"></path>
      <path d="M9 11h6"></path>
      <path d="M9 15h6"></path>
      <path d="M9 19h4"></path>
    </svg>
  `;
  const followupModalIconSvg = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 21s-6.5-4.35-6.5-10A3.5 3.5 0 0 1 9 7.5c1.28 0 2.42.69 3 1.72A3.34 3.34 0 0 1 15 7.5a3.5 3.5 0 0 1 3.5 3.5c0 5.65-6.5 10-6.5 10Z"></path>
      <path d="M8 13h2l1.1-2 1.8 4 1.1-2H16"></path>
    </svg>
  `;
  elements.patientConsultationModal.classList.toggle("modal-shell--hospamb", isHospAmbMode);
  elements.patientConsultationModal.classList.toggle("modal-shell--procedure", isProcedureMode);
  elements.patientConsultationModal.classList.toggle("modal-shell--orders", isOrderMode);
  elements.patientConsultationModal.classList.toggle("modal-shell--laboratory", isLaboratoryMode);
  elements.patientConsultationModal.classList.toggle("modal-shell--imaging", isImagingMode);
  elements.patientConsultationModal.classList.toggle("modal-shell--remission", isRemissionMode);
  elements.patientConsultationModal.classList.toggle("modal-shell--documents", isDocumentMode);
  elements.patientConsultationModal.classList.toggle("modal-shell--followup", isFollowupMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--hospamb", isHospAmbMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--procedure", isProcedureMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--orders", isOrderMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--laboratory", isLaboratoryMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--imaging", isImagingMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--remission", isRemissionMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--documents", isDocumentMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--followup", isFollowupMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--vaccination", isVaccinationMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--formula", isFormulaMode);
  modalCard?.classList.toggle("consultorio-consultation-modal--deworming", isDewormingMode);
  if (elements.patientConsultationModalIcon) {
    elements.patientConsultationModalIcon.innerHTML = isOrderMode
      ? orderModalIconSvg
      : isRemissionMode
      ? remissionModalIconSvg
      : isImagingMode
      ? imagingModalIconSvg
      : isDocumentMode
      ? documentModalIconSvg
      : isFollowupMode
      ? followupModalIconSvg
      : isLaboratoryMode
      ? laboratoryModalIconSvg
      : isProcedureMode
      ? procedureModalIconSvg
      : defaultModalIconSvg;
  }
  elements.patientConsultationModalIcon?.classList.toggle("is-hospamb", isHospAmbMode);
  if (elements.closePatientConsultationModalButton) {
    elements.closePatientConsultationModalButton.innerHTML = "&times;";
  }
  if (elements.patientConsultationRecordLabel) {
    elements.patientConsultationRecordLabel.textContent = "";
    elements.patientConsultationRecordLabel.classList.add("is-hidden");
  }
  form
    .querySelector(".consultorio-consultation-form__footer")
    ?.classList.add("consultorio-consultation-form__footer--align-end");
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
  } else if (isProcedureMode && form.elements.procedure_date) {
    form.elements.procedure_date.focus();
  } else if (isHospAmbMode && form.elements.hospamb_type) {
    form.elements.hospamb_type.focus();
  } else if (isLaboratoryMode && form.elements.laboratory_date) {
    form.elements.laboratory_date.focus();
  } else if (isImagingMode && form.elements.imaging_date) {
    form.elements.imaging_date.focus();
  } else if (isRemissionMode && form.elements.referral_date) {
    form.elements.referral_date.focus();
  } else if (isDocumentMode && form.elements.document_format) {
    form.elements.document_format.focus();
  } else if (isFollowupMode && form.elements.followup_date) {
    form.elements.followup_date.focus();
  } else if (isOrderMode && form.elements.order_date) {
    form.elements.order_date.focus();
  } else {
    form.elements.consultation_at.focus();
  }
}

function openUserModal(user = null, options = {}) {
  if (!elements.userModal || !elements.userForm) {
    return;
  }
  const { source = "administration", labItemIndex = null } = options || {};
  userModalContext = {
    source,
    labItemIndex: Number.isInteger(labItemIndex) ? labItemIndex : null,
  };
  elements.userForm.reset();
  if (elements.userFormError) {
    elements.userFormError.textContent = "";
    elements.userFormError.classList.add("is-hidden");
  }
  elements.userForm.elements.id.value = user?.id || "";
  elements.userForm.elements.full_name.value = user?.full_name || "";
  elements.userForm.elements.email.value = user?.email || "";
  elements.userForm.elements.role.value = user?.role || "Veterinario";
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
  elements.userModal.parentElement?.appendChild(elements.userModal);
  elements.userModal.classList.remove("is-hidden");
  elements.userModal.setAttribute("aria-hidden", "false");
  syncModalOpenState();
  elements.userForm.elements.full_name?.focus();
}

function setUserFormError(message) {
  if (!elements.userFormError) {
    return;
  }
  elements.userFormError.textContent = message || "";
  elements.userFormError.classList.toggle("is-hidden", !message);
  if (message && typeof elements.userFormError.scrollIntoView === "function") {
    elements.userFormError.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function closeUserModal(options = {}) {
  if (!elements.userModal) {
    return;
  }
  const { preserveContext = false } = options || {};
  elements.userModal.classList.add("is-hidden");
  elements.userModal.setAttribute("aria-hidden", "true");
  syncModalOpenState();
  if (!preserveContext) {
    resetUserModalContext();
  }
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
  renderWorkspaceChrome();
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
  if (salesSelectedDocumentId) {
    await loadSalesDocumentDetail(salesSelectedDocumentId, { silent: true });
  }
  setActiveSection("sales");
}

function addDraftBillingLine() {
  const catalogItemId = resolveBillingCatalogItemIdFromSearch();
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
  renderBillingWizard();
}

function buildBillingDocumentPayload(form) {
  if (!billingDraft.lines.length) {
    throw new Error("Agrega al menos un item al documento.");
  }
  const payload = serializeForm(form);
  payload.document_type = getSalesDocumentFilterType() || payload.document_type || "factura";
  payload.lines = billingDraft.lines.map((line) => ({
    catalog_item_id: line.catalog_item_id,
    quantity: line.quantity,
  }));
  payload.payment_method = payload.payment_method || "Pendiente";
  payload.cash_account = payload.cash_account || state.settings.billing_default_cash_account || "caja_menor";
  payload.send_email_on_save =
    payload.document_type === "factura" && Boolean(String(payload.recipient_email || "").trim());
  if (payload.document_type === "cotizacion") {
    payload.payment_method = "Pendiente";
    payload.cash_account = "";
    payload.initial_payment_amount = 0;
    payload.initial_payment_date = "";
    payload.initial_payment_method = "";
    payload.initial_payment_cash_account = "";
    payload.send_email_on_save = false;
  } else {
    payload.initial_payment_amount = Number(payload.initial_payment_amount || 0);
    payload.initial_payment_method =
      payload.initial_payment_method || payload.payment_method || "Efectivo";
    payload.initial_payment_cash_account =
      payload.initial_payment_cash_account || payload.cash_account || "caja_menor";
  }
  return payload;
}

function describeBillingSaveResult(savedDocument = {}, payload = {}) {
  const documentTypeLabel = savedDocument?.document_type === "cotizacion" ? "Cotizacion" : "Factura";
  const parts = [`${documentTypeLabel} guardada`];
  let tone = "success";
  if (savedDocument?.pdf?.url) {
    parts.push("PDF generado");
  }
  const emailResult = savedDocument?.email || null;
  if (emailResult?.sent) {
    parts.push(`correo enviado a ${emailResult.to}`);
  } else if (emailResult?.error) {
    tone = "warning";
    parts.push("el PDF quedo listo, pero el correo no se pudo enviar");
  } else if (payload?.send_email_on_save && emailResult?.reason === "smtp_disabled") {
    tone = "warning";
    parts.push("el PDF quedo listo, pero SMTP esta deshabilitado");
  } else if (payload?.send_email_on_save && emailResult?.reason === "smtp_from_missing") {
    tone = "warning";
    parts.push("el PDF quedo listo, pero falta el correo remitente");
  } else if (payload?.send_email_on_save && emailResult?.reason === "smtp_password_missing") {
    tone = "warning";
    parts.push("el PDF quedo listo, pero falta la app password SMTP");
  } else if (payload?.send_email_on_save && emailResult?.reason === "recipient_missing") {
    tone = "warning";
    parts.push("el PDF quedo listo, pero no hay correo destinatario");
  }
  return {
    tone,
    message: `${parts.join(". ")}.`,
  };
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
  const isInventoryView = getActiveSalesSubsectionValue() === "inventario";
  const isProviderUpdate = Boolean(String(event.currentTarget.elements.id?.value || "").trim());
  const savedProvider = await api.saveProvider(serializeForm(event.currentTarget));
  upsertProviderInState(savedProvider);
  resetForm(event.currentTarget);
  if (isInventoryView) {
    inventoryUiState.showProviderForm = false;
  }
  inventoryUiState.providerDraftId = "";
  salesReportState.loaded = false;
  setActiveSection("sales");
  if (isInventoryView) {
    setSectionSubsection("sales", "inventario");
  }
  await refreshData({
    sections: SALES_PROVIDER_REFRESH_SECTIONS,
    message: isProviderUpdate ? "Proveedor actualizado." : "Proveedor guardado.",
  });
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
  const isInventoryView = getActiveSalesSubsectionValue() === "inventario";
  const savedItem = await api.saveCatalogItem(serializeForm(event.currentTarget));
  upsertCatalogItemInState(savedItem);
  resetForm(event.currentTarget);
  if (event.currentTarget.elements.track_inventory) {
    event.currentTarget.elements.track_inventory.checked = true;
  }
  if (event.currentTarget.elements.purchase_cost) {
    event.currentTarget.elements.purchase_cost.value = "0";
  }
  if (event.currentTarget.elements.margin_percent) {
    event.currentTarget.elements.margin_percent.value = "0";
  }
  if (event.currentTarget.elements.presentation_total) {
    event.currentTarget.elements.presentation_total.value = "1";
  }
  if (event.currentTarget.elements.presentation_type) {
    event.currentTarget.elements.presentation_type.value = "unidad";
  }
  if (event.currentTarget.elements.stock_quantity) {
    event.currentTarget.elements.stock_quantity.value = "0";
  }
  if (event.currentTarget.elements.min_stock) {
    event.currentTarget.elements.min_stock.value = "0";
  }
  if (isInventoryView) {
    inventoryUiState.showProductForm = false;
    inventoryUiState.selectedItemId = savedItem?.id || inventoryUiState.selectedItemId;
  }
  salesReportState.loaded = false;
  setActiveSection("sales");
  if (isInventoryView) {
    setSectionSubsection("sales", "inventario");
  }
  await refreshData({
    sections: SALES_INVENTORY_REFRESH_SECTIONS,
    message: "Item de catalogo guardado.",
  });
}

async function handleAppointmentSubmit(event) {
  event.preventDefault();
  clearAppointmentFormFeedback();
  try {
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
    const savedAppointment = await api.saveAppointment(payload);
    agendaSelectedDate = toIsoDate(payload.appointment_at) || agendaSelectedDate;
    resetForm(event.currentTarget);
    closeAppointmentModal();
    setDateTimeDefaults();
    const refreshSections = savedAppointment?.google_calendar?.error
      ? [...new Set([...AGENDA_REFRESH_SECTIONS, "settings"])]
      : AGENDA_REFRESH_SECTIONS;
    await refreshData({
      sections: refreshSections,
      message: savedAppointment?.google_calendar?.error
        ? ""
        : buildAppointmentSaveMessage(savedAppointment),
    });
    if (savedAppointment?.google_calendar?.error) {
      showStatus(
        `Cita guardada, pero Google Calendar no sincronizo: ${savedAppointment.google_calendar.error}`,
        "warning"
      );
    }
    setActiveSection("agenda");
  } catch (error) {
    const message = error?.message || "No fue posible guardar la cita.";
    setAppointmentFormFeedback(message);
    showStatus(message, "error");
  }
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
  };
  payload.full_name = String(payload.full_name || "").trim();
  payload.email = String(payload.email || "").trim().toLowerCase();
  const password = form.elements.password?.value?.trim();
  if (!payload.id && !password) {
    throw new Error("La contrasena es obligatoria para nuevos usuarios.");
  }
  if (password) {
    payload.password = password;
  }
  const duplicateUser = (state.users || []).find(
    (user) =>
      String(user?.email || "").trim().toLowerCase() === payload.email &&
      String(user?.id || "") !== String(payload.id || "")
  );
  if (duplicateUser) {
    throw new Error(
      `Ya existe un usuario con ese correo. Usa Editar para modificar a ${duplicateUser.full_name || duplicateUser.email}.`
    );
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
  const modalContext = { ...userModalContext };
  const laboratoryItems =
    modalContext.source === "laboratory" ? getPatientLaboratoryItems({ includeEmpty: true }) : null;
  try {
    const payload = buildUserPayload();
    await api.saveUser(payload);
    closeUserModal({ preserveContext: true });
    await refreshData({ sections: ["users"], render: false, message: "Usuario guardado." });
    renderUsers();
    if (
      modalContext.source === "laboratory" &&
      laboratoryItems &&
      Number.isInteger(modalContext.labItemIndex) &&
      laboratoryItems[modalContext.labItemIndex]
    ) {
      laboratoryItems[modalContext.labItemIndex].professional = payload.full_name;
      renderPatientLaboratoryItems(laboratoryItems);
      elements.patientLaboratoryItemsList
        ?.querySelector(`[data-lab-item="${modalContext.labItemIndex}"] [data-lab-item-field="professional"]`)
        ?.focus();
    }
    if (modalContext.source === "imaging" && elements.patientImagingProfessionalSelect) {
      renderPatientImagingProfessionalOptions(payload.full_name);
      elements.patientImagingProfessionalSelect.value = payload.full_name;
      elements.patientImagingProfessionalSelect.focus();
    }
    if (modalContext.source === "remission" && elements.patientRemissionProfessionalSelect) {
      renderPatientRemissionProfessionalOptions(payload.full_name);
      elements.patientRemissionProfessionalSelect.value = payload.full_name;
      elements.patientRemissionProfessionalSelect.focus();
    }
    resetUserModalContext();
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
  const deleteButton = event.target.closest("button[data-user-delete]");
  if (deleteButton) {
    const userId = deleteButton.dataset.userDelete;
    const user = state.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("No se encontro el usuario seleccionado.");
    }
    const confirmed = window.confirm(
      `Eliminar al usuario ${user.full_name || user.email || ""}? Esta accion no se puede deshacer.`
    );
    if (!confirmed) {
      return;
    }
    await api.deleteUser(userId);
    if (elements.userForm?.elements?.id?.value === userId) {
      closeUserModal();
    }
    await refreshData({ sections: ["users"], render: false, message: "Usuario eliminado." });
    renderUsers();
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

async function handleBillingDocumentSubmit(event) {
  event.preventDefault();
  if (billingWizardState.currentStep < BILLING_WIZARD_STEPS.length) {
    setBillingWizardStep(billingWizardState.currentStep + 1);
    return;
  }
  for (let step = 1; step < BILLING_WIZARD_STEPS.length; step += 1) {
    validateBillingWizardStep(step);
  }
  const payload = buildBillingDocumentPayload(event.currentTarget);
  const savedDocument = await api.saveBillingDocument(payload);
  let pdfOpenError = null;
  if (savedDocument?.pdf?.url) {
    try {
      openExportUrl(savedDocument.pdf.url);
    } catch (error) {
      pdfOpenError = error;
    }
  }
  billingDraft.lines = [];
  billingWizardState.currentStep = 1;
  resetForm(event.currentTarget);
  setDateTimeDefaults();
  syncBillingDocumentFormState();
  renderBillingDraftLines();
  salesReportState.loaded = false;
  await refreshData();
  if (savedDocument?.id) {
    salesSelectedDocumentId = savedDocument.id;
    await loadSalesDocumentDetail(savedDocument.id, { silent: true });
  }
  setActiveSection("sales");
  setSectionSubsection("sales", resolveSalesSubsectionForDocument(savedDocument));
  const saveStatus = describeBillingSaveResult(savedDocument, payload);
  if (pdfOpenError) {
    showStatus(
      `${saveStatus.message} El navegador bloqueo la apertura automatica del PDF.`,
      "warning"
    );
    return;
  }
  showStatus(saveStatus.message, saveStatus.tone);
}

async function handleBillingPaymentSubmit(event) {
  event.preventDefault();
  const payload = serializeForm(event.currentTarget);
  const pendingDocumentIds = new Set(
    getPendingBillingDocuments().map((document) => String(document.id))
  );
  if (!pendingDocumentIds.has(String(payload.document_id || ""))) {
    throw new Error("Solo puedes registrar abonos sobre facturas pendientes.");
  }
  await api.registerBillingPayment(payload);
  resetForm(event.currentTarget);
  setDateTimeDefaults();
  salesReportState.loaded = false;
  await refreshData("Abono registrado.");
  if (payload.document_id) {
    salesSelectedDocumentId = payload.document_id;
    await loadSalesDocumentDetail(payload.document_id, { silent: true });
  }
  setActiveSection("sales");
  setSectionSubsection("sales", "factura");
}

async function handleCashMovementSubmit(event) {
  event.preventDefault();
  await api.saveCashMovement(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  setDateTimeDefaults();
  salesReportState.loaded = false;
  await refreshData("Movimiento de caja guardado.");
  setActiveSection("sales");
  setSectionSubsection("sales", "caja");
}

async function handleCashSessionOpenSubmit(event) {
  event.preventDefault();
  const payload = serializeForm(event.currentTarget);
  const session = await api.openCashSession(payload);
  if (event.currentTarget.elements.opening_amount) {
    event.currentTarget.elements.opening_amount.value = "0";
  }
  if (event.currentTarget.elements.opening_notes) {
    event.currentTarget.elements.opening_notes.value = "";
  }
  if (elements.cashSessionCloseForm?.elements?.session_date) {
    elements.cashSessionCloseForm.elements.session_date.value = session.session_date || payload.session_date;
  }
  if (elements.cashSessionCloseForm?.elements?.cash_account) {
    elements.cashSessionCloseForm.elements.cash_account.value = session.cash_account || payload.cash_account;
  }
  salesReportState.loaded = false;
  await refreshData(`Apertura registrada en ${cashAccountLabel(session.cash_account)}.`);
  setActiveSection("sales");
  setSectionSubsection("sales", "caja");
}

async function handleCashSessionCloseSubmit(event) {
  event.preventDefault();
  const payload = serializeForm(event.currentTarget);
  const session = await api.closeCashSession(payload);
  if (event.currentTarget.elements.closing_amount) {
    event.currentTarget.elements.closing_amount.value = "0";
  }
  if (event.currentTarget.elements.closing_notes) {
    event.currentTarget.elements.closing_notes.value = "";
  }
  salesReportState.loaded = false;
  await refreshData(`Cierre registrado en ${cashAccountLabel(session.cash_account)}.`);
  setActiveSection("sales");
  setSectionSubsection("sales", "caja");
}

async function handleStockAdjustmentSubmit(event) {
  event.preventDefault();
  const isInventoryView = getActiveSalesSubsectionValue() === "inventario";
  await api.saveStockAdjustment(serializeForm(event.currentTarget));
  resetForm(event.currentTarget);
  setDateTimeDefaults();
  if (isInventoryView) {
    inventoryUiState.showStockForm = false;
  }
  salesReportState.loaded = false;
  await refreshData("Ajuste de inventario aplicado.");
  setActiveSection("sales");
  if (isInventoryView) {
    setSectionSubsection("sales", "inventario");
  }
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
  if (form.dataset.consultationMode === "documents") {
    syncPatientDocumentEditorState();
  }
  const payload = serializeForm(form);
  const patient = getConsultorioPatient();
  if (!patient) {
    throw new Error("No se encontro la mascota seleccionada.");
  }
  const examGeneralSummary = buildConsultorioExamGeneralSummary(payload);
  const examSpecialSummary = buildConsultorioExamSpecialSummary(payload);
  const isOrderMode = form.dataset.consultationMode === "orders";
  const isLaboratoryMode = form.dataset.consultationMode === "laboratory";
  const isImagingMode = form.dataset.consultationMode === "imaging";
  const isRemissionMode = form.dataset.consultationMode === "remission";
  const isDocumentMode = form.dataset.consultationMode === "documents";
  const isFollowupMode = form.dataset.consultationMode === "followup";
  payload.consultation_type =
    payload.consultation_type ||
    getConsultorioProfileViewConfig()?.formConsultationType ||
    "Consulta";
  if (isDocumentMode) {
    const documentFormat = ensureConsultorioDocumentFormatOption(payload.document_format, {
      persist: true,
    });
    const documentTemplateId = String(elements.patientDocumentTemplateSelect?.value || "").trim();
    const documentTemplate = getConsultorioDocumentTemplateById(
      documentTemplateId,
      documentFormat
    );
    const documentSignatureConfig = getPatientDocumentSignatureConfig();
    const documentName = String(payload.document_name || "").trim();
    const documentHtml = sanitizeConsultorioDocumentHtml(payload.document_content_html || "");
    const documentText = consultorioDocumentHtmlToText(documentHtml);
    if (!documentFormat) {
      throw new Error("Selecciona el tipo de documento.");
    }
    if (!documentName) {
      throw new Error("Escribe el nombre del documento.");
    }
    if (!documentText) {
      throw new Error("Escribe el contenido del documento.");
    }
    if (
      documentSignatureConfig.enabled &&
      !documentSignatureConfig.owner &&
      !documentSignatureConfig.professional
    ) {
      throw new Error("Selecciona al menos una opcion de firma para este documento.");
    }
    payload.consultation_type = "Documento";
    payload.title = documentName;
    payload.consultation_at = payload.consultation_at || toInputDateTime(new Date().toISOString());
    payload.next_control = "";
    payload.summary = documentText;
    payload.indications = buildConsultorioStructuredText([
      ["Tipo de documento", documentFormat],
      ["Plantilla", documentTemplate?.label || "Plantilla libre"],
      [
        "Requiere firma",
        documentSignatureConfig.enabled ? "Si requiere" : "No requiere",
      ],
    ]);
    payload.attachments_summary = "";
    payload.document_reference = JSON.stringify({
      kind: "document",
      format: documentFormat,
      name: documentName,
      requiresSignature: documentSignatureConfig.enabled,
      signatureConfig: documentSignatureConfig,
      template: documentTemplate
        ? {
            id: documentTemplate.id,
            label: documentTemplate.label,
            description: documentTemplate.description,
            categoryId: documentTemplate.categoryId,
            categoryLabel: documentTemplate.formatLabel,
            autofillFields: getConsultorioTemplateGuideAutofillItems(documentTemplate),
            requiredFields: getConsultorioTemplateGuideRequiredItems(documentTemplate),
            recommendedSections: getConsultorioTemplateGuideSectionItems(documentTemplate),
          }
        : null,
      contentHtml: documentHtml,
      contentText: documentText,
      notifyOwner: Boolean(payload.document_notify_owner),
    });
  } else if (isOrderMode) {
    const orderItems = getPatientOrderItems({ includeEmpty: true }).filter((item) =>
      hasConsultorioOrderItemContent(item)
    );
    if (!payload.order_date) {
      throw new Error("Selecciona la fecha de la orden.");
    }
    if (!orderItems.length) {
      throw new Error("Agrega al menos una orden.");
    }
    const invalidItemIndex = orderItems.findIndex((item) => {
      const quantity = Number(item.quantity || 1);
      return (
        !item.type ||
        !getConsultorioOrderItemDisplayName(item) ||
        Number.isNaN(quantity) ||
        quantity < 1
      );
    });
    if (invalidItemIndex !== -1) {
      throw new Error(
        `Completa tipo, orden y cantidad valida en la orden ${invalidItemIndex + 1}.`
      );
    }
    if (!String(payload.order_reason || "").trim()) {
      throw new Error("Escribe el motivo de la orden.");
    }
    payload.consultation_type = "Documento";
    payload.title = getConsultorioOrderItemDisplayName(orderItems[0]) || "Orden";
    payload.consultation_at = `${payload.order_date}T12:00`;
    payload.next_control = "";
    payload.summary = buildConsultorioOrderSummary(payload, orderItems);
    payload.indications = buildConsultorioOrderIndications(payload, orderItems);
    payload.attachments_summary = "";
    payload.document_reference = JSON.stringify({
      kind: "order",
      orderDate: String(payload.order_date || "").trim(),
      reason: String(payload.order_reason || "").trim(),
      items: orderItems.map((item) => ({
        type: item.type,
        item: item.item,
        itemCustom: item.itemCustom,
        quantity: item.quantity,
        priority: item.priority,
        notes: item.notes,
      })),
    });
  } else if (isLaboratoryMode) {
    const laboratoryItems = getPatientLaboratoryItems({ includeEmpty: true }).filter((item) =>
      hasConsultorioLaboratoryItemContent(item)
    );
    if (!payload.laboratory_date) {
      throw new Error("Selecciona la fecha del examen de laboratorio.");
    }
    if (!laboratoryItems.length) {
      throw new Error("Agrega al menos una prueba de laboratorio.");
    }
    const invalidItemIndex = laboratoryItems.findIndex((item) => {
      const quantity = Number(item.quantity || 1);
      return (
        !String(item.professional || "").trim() ||
        !String(item.item || "").trim() ||
        Number.isNaN(quantity) ||
        quantity < 1
      );
    });
    if (invalidItemIndex !== -1) {
      throw new Error(
        `Completa profesional, prueba/examen y cantidad valida en la prueba ${invalidItemIndex + 1}.`
      );
    }
    payload.consultation_type = "Examen de laboratorio";
    payload.title = laboratoryItems[0]?.item || "Examen de laboratorio";
    payload.consultation_at = `${payload.laboratory_date}T12:00`;
    payload.next_control = "";
    payload.summary = buildConsultorioLaboratorySummary(payload, laboratoryItems);
    payload.indications = buildConsultorioLaboratoryIndications(payload, laboratoryItems);
    payload.attachments_summary = "";
    payload.document_reference = JSON.stringify({
      kind: "laboratory",
      examDate: String(payload.laboratory_date || "").trim(),
      diagnosis: String(payload.laboratory_diagnosis || "").trim(),
      related: String(payload.referred_to || "").trim(),
      items: laboratoryItems.map((item) => ({
        professional: String(item.professional || "").trim(),
        item: String(item.item || "").trim(),
        quantity: String(item.quantity || "1").trim() || "1",
        results: (Array.isArray(item.results) ? item.results : [])
          .map((result) => normalizeConsultorioLaboratoryResultFile(result))
          .filter(Boolean),
      })),
    });
  } else if (isImagingMode) {
    if (!payload.imaging_date) {
      throw new Error("Selecciona la fecha del registro de imagenologia.");
    }
    if (!String(payload.imaging_aid || "").trim()) {
      throw new Error("Selecciona la ayuda diagnostica.");
    }
    if (!String(payload.imaging_professional || "").trim()) {
      throw new Error("Selecciona el profesional.");
    }
    if (!String(payload.imaging_study_type || "").trim()) {
      throw new Error("Escribe el tipo de estudio.");
    }
    payload.consultation_type = "Imagen diagnostica";
    payload.title = String(payload.imaging_study_type || payload.imaging_aid || "").trim();
    payload.consultation_at = `${payload.imaging_date}T12:00`;
    payload.professional_name = String(payload.imaging_professional || "").trim();
    payload.next_control = "";
    payload.summary = buildConsultorioImagingSummary(payload);
    payload.indications = "";
    payload.attachments_summary = serializeConsultorioAttachments(
      getPatientImagingAttachments()
    );
    payload.document_reference = JSON.stringify({
      kind: "imaging",
      imagingDate: String(payload.imaging_date || "").trim(),
      aid: String(payload.imaging_aid || "").trim(),
      signs: String(payload.imaging_signs || "").trim(),
      diagnosis: String(payload.imaging_diagnosis || "").trim(),
      studyType: String(payload.imaging_study_type || "").trim(),
      observations: String(payload.imaging_observations || "").trim(),
      professional: String(payload.imaging_professional || "").trim(),
    });
  } else if (isRemissionMode) {
    const referralDate = String(payload.referral_date || "").trim();
    const referralProfessional = String(payload.referral_professional || "").trim();
    const referralDestination = String(payload.referral_destination || "").trim();
    const referralReason = String(payload.referral_reason || "").trim();
    const referralObservations = String(payload.referral_observations || "").trim();
    if (!referralDate) {
      throw new Error("Selecciona la fecha y hora de la remision.");
    }
    if (!referralProfessional) {
      throw new Error("Selecciona el profesional que realiza la remision.");
    }
    if (!referralDestination) {
      throw new Error("Escribe el centro veterinario destino.");
    }
    if (!referralReason) {
      throw new Error("Escribe el procedimiento o razon de la remision.");
    }
    payload.consultation_type = "Remision";
    payload.title = referralReason;
    payload.consultation_at = referralDate;
    payload.professional_name = referralProfessional;
    payload.referred_to = referralDestination;
    payload.next_control = "";
    payload.summary = buildConsultorioStructuredText([
      ["Procedimiento/Razon", referralReason],
      ["Observaciones", referralObservations],
    ]);
    payload.indications = buildConsultorioStructuredText([
      ["Centro veterinario destino", referralDestination],
      ["Profesional remitente", referralProfessional],
    ]);
    payload.attachments_summary = "";
    payload.document_reference = JSON.stringify({
      kind: "remission",
      referralDate,
      professional: referralProfessional,
      destination: referralDestination,
      reason: referralReason,
      observations: referralObservations,
    });
  } else if (isFollowupMode) {
    if (!payload.followup_date) {
      throw new Error("Selecciona la fecha y hora del seguimiento.");
    }
    if (!String(payload.followup_type || "").trim()) {
      throw new Error("Selecciona el tipo de seguimiento.");
    }
    if (!String(payload.followup_details || "").trim()) {
      throw new Error("Escribe los detalles del seguimiento.");
    }
    payload.consultation_type = "Seguimiento";
    payload.followup_reason = String(payload.followup_reason || "").trim() || "No especificado";
    payload.title =
      payload.followup_reason && payload.followup_reason !== "No especificado"
        ? payload.followup_reason
        : String(payload.followup_type || "").trim();
    payload.consultation_at = payload.followup_date;
    payload.next_control = payload.followup_next_control || "";
    payload.summary = buildConsultorioFollowupSummary(payload, examGeneralSummary);
    payload.indications = buildConsultorioFollowupIndications(payload);
    payload.attachments_summary = serializeConsultorioAttachments(
      getPatientConsultationAttachments()
    );
    payload.document_reference = JSON.stringify({
      kind: "followup",
      followupType: String(payload.followup_type || "").trim(),
      reason: payload.followup_reason,
      details: String(payload.followup_details || "").trim(),
      nextControl: String(payload.followup_next_control || "").trim(),
      notifyOwner: Boolean(payload.followup_notify_owner),
    });
  } else if (isHospAmbConsultationType(payload.consultation_type)) {
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
  } else if (isProcedureConsultationType(payload.consultation_type)) {
    const procedureName = getPatientProcedureNameValue(form);
    if (!payload.procedure_date) {
      throw new Error("Selecciona la fecha de la cirug\u00eda/procedimiento.");
    }
    if (!procedureName) {
      throw new Error("Selecciona o escribe la cirug\u00eda/procedimiento.");
    }
    payload.title = procedureName;
    payload.consultation_at = `${payload.procedure_date}T12:00`;
    payload.next_control = "";
    payload.summary = buildConsultorioProcedureSummary(payload);
    payload.indications = buildConsultorioProcedureIndications(payload);
    payload.attachments_summary = serializeConsultorioAttachments(
      getPatientProcedureAttachments()
    );
    payload.document_reference = JSON.stringify({
      kind: "procedure",
      name: procedureName,
      description: String(payload.procedure_description || "").trim(),
      preanesthetic: String(payload.procedure_preanesthetic || "").trim(),
      anesthetic: String(payload.procedure_anesthetic || "").trim(),
      otherMedications: String(payload.procedure_other_medications || "").trim(),
      treatment: String(payload.procedure_treatment || "").trim(),
      observations: String(payload.procedure_observations || "").trim(),
      complications: String(payload.procedure_complications || "").trim(),
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
  payload.referred_to = isRemissionMode ? String(payload.referral_destination || "").trim() : "";
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
  const entityLabel = isOrderMode
    ? "Orden"
    : isDocumentMode
    ? "Documento"
    : isImagingMode
    ? "Imagenologia"
    : isRemissionMode
    ? "Remisi\u00f3n"
    : isLaboratoryMode
    ? "Examen de laboratorio"
    : getConsultorioProfileModalEntityLabel(payload.consultation_type);
  let statusMessage = payload.id
    ? `${entityLabel} actualizada.`
    : `${entityLabel} registrada.`;
  if (isDocumentMode && payload.document_notify_owner) {
    const owner = getConsultorioOwner();
    const ownerLabel = owner?.full_name || patient?.owner_name || "el propietario";
    addNotification(
      `Documento de ${patient?.name || "la mascota"} listo para notificar a ${ownerLabel}.`,
      "info"
    );
    statusMessage += " Se genero una notificacion para el propietario.";
  }
  if (isFollowupMode && payload.followup_notify_owner) {
    const owner = getConsultorioOwner();
    const ownerLabel = owner?.full_name || patient?.owner_name || "el propietario";
    addNotification(
      `Seguimiento de ${patient?.name || "la mascota"} listo para notificar a ${ownerLabel}.`,
      "info"
    );
    statusMessage += " Se genero una notificacion para el propietario.";
  }
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
  consultorioProfileView = isOrderMode
    ? "orders"
    : isDocumentMode
    ? "documents"
    : CONSULTORIO_PROFILE_VIEWS.find(
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
  const payload = serializeForm(event.currentTarget);
  if (isConsultorioPatientProfileActive() && consultorioPatientId) {
    payload.patient_id = consultorioPatientId;
  }
  const result = await api.saveConsent(payload);
  resetForm(event.currentTarget);
  setDateTimeDefaults();
  await refreshData();
  if (isConsultorioPatientProfileActive()) {
    setConsultorioProfileView("documents");
  } else {
    setActiveSection("consents");
  }
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
  const services = getGroomingServiceItems();
  if (!services.length) {
    throw new Error("Agrega al menos un servicio de peluquería.");
  }
  syncGroomingServiceItemsValue();
  await api.saveGrooming(serializeForm(event.currentTarget));
  closeGroomingModal();
  await refreshData({
    sections: ["grooming_documents"],
    message: "Documento de peluquería guardado.",
  });
}

function handleBillingDraftClick(event) {
  const button = event.target.closest("button[data-remove-billing-line]");
  if (!button) {
    return;
  }
  billingDraft.lines.splice(Number(button.dataset.removeBillingLine), 1);
  renderBillingDraftLines();
  renderBillingWizard();
}

function handleBillingWizardClick(event) {
  const stepButton = event.target.closest("button[data-billing-step]");
  if (stepButton) {
    setBillingWizardStep(Number(stepButton.dataset.billingStep || 1));
    return;
  }
  if (event.target.closest("#billingStepPrevButton")) {
    setBillingWizardStep(billingWizardState.currentStep - 1, { skipValidation: true });
    return;
  }
  if (event.target.closest("#billingStepNextButton")) {
    setBillingWizardStep(billingWizardState.currentStep + 1);
  }
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

function describeAppointmentReminderEmailResult(emailResult) {
  if (emailResult?.sent) {
    return `Correo enviado a ${emailResult.to}.`;
  }
  const reasons = {
    smtp_disabled: "El correo SMTP esta deshabilitado.",
    smtp_from_missing: "Falta configurar el correo remitente.",
    smtp_password_missing: "Falta configurar la app password SMTP.",
    owner_email_missing: "El tutor no tiene correo registrado.",
  };
  if (emailResult?.reason && reasons[emailResult.reason]) {
    return reasons[emailResult.reason];
  }
  if (emailResult?.error) {
    return `No se pudo enviar el correo: ${emailResult.error}`;
  }
  return "";
}

function buildAppointmentSaveMessage(savedAppointment) {
  if (savedAppointment?.google_calendar?.invite_sent) {
    return "Cita guardada e invitacion de Google Calendar enviada.";
  }
  return "Cita guardada.";
}

async function sendAppointmentReminder(appointmentId) {
  const appointment = getAppointmentById(appointmentId);
  if (!appointment) {
    throw new Error("No se encontro la cita seleccionada.");
  }
  const reminder = await api.sendAppointmentReminder(appointmentId);
  const emailMessage = describeAppointmentReminderEmailResult(reminder?.email);
  showStatus(
    emailMessage || "No fue posible enviar el recordatorio por correo.",
    reminder?.email?.sent ? "success" : "warning"
  );
}

async function updateAppointmentDetailStatus(appointmentId, status) {
  if (!appointmentId || !status) {
    return;
  }
  await api.updateAppointmentStatus(appointmentId, status);
  await refreshData({
    sections: AGENDA_REFRESH_SECTIONS,
    render: true,
  });
  if (getAppointmentById(appointmentId)) {
    openAppointmentDetailModal(appointmentId);
  }
  showStatus("Estado de la cita actualizado.", "success");
}

async function handleAppointmentDetailClick(event) {
  const reminderButton = event.target.closest("#appointmentDetailReminderButton");
  if (reminderButton?.dataset?.appointmentId) {
    await sendAppointmentReminder(reminderButton.dataset.appointmentId);
    return;
  }
  const editButton = event.target.closest("#appointmentDetailEditButton");
  if (editButton?.dataset?.appointmentId) {
    const appointment = getAppointmentById(editButton.dataset.appointmentId);
    if (!appointment) {
      throw new Error("No se encontro la cita seleccionada.");
    }
    closeAppointmentDetailModal();
    openAppointmentModalForEdit(appointment);
    return;
  }
  const statusButton = event.target.closest("#appointmentDetailStatusButton");
  if (statusButton?.dataset?.appointmentId) {
    const nextStatus = elements.appointmentDetailStatusSelect?.value || "";
    if (!nextStatus) {
      throw new Error("Selecciona un estado para la cita.");
    }
    await updateAppointmentDetailStatus(statusButton.dataset.appointmentId, nextStatus);
  }
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

function getAgendaDraggedAppointmentElement(target) {
  return target.closest(
    ".agenda-slot--occupied[data-appointment-id], .agenda-event-chip[data-appointment-id], .agenda-timeline-event[data-appointment-id], .agenda-list-item[data-appointment-id]"
  );
}

function resolveAgendaDropTarget(event) {
  const slot = event.target.closest(".agenda-slot[data-slot-at]");
  if (slot) {
    return {
      dateValue: toIsoDate(slot.dataset.slotAt || ""),
      highlightElement: slot,
    };
  }
  const timelineColumn = event.target.closest(".agenda-timeline__day-column[data-agenda-date]");
  if (timelineColumn) {
    return {
      dateValue: timelineColumn.dataset.agendaDate || "",
      highlightElement: timelineColumn,
    };
  }
  const listDay = event.target.closest(".agenda-list-day[data-agenda-date]");
  if (listDay) {
    return {
      dateValue: listDay.dataset.agendaDate || "",
      highlightElement: listDay,
    };
  }
  const monthDay = event.target.closest(".agenda-large-day[data-agenda-date]");
  if (monthDay) {
    return {
      dateValue: monthDay.dataset.agendaDate || "",
      highlightElement: monthDay,
    };
  }
  const programDay = event.target.closest(".agenda-week-day[data-agenda-date]");
  if (programDay) {
    return {
      dateValue: programDay.dataset.agendaDate || "",
      highlightElement: programDay,
    };
  }
  const genericDateTarget = event.target.closest("[data-agenda-date]");
  if (genericDateTarget) {
    return {
      dateValue: genericDateTarget.dataset.agendaDate || "",
      highlightElement: genericDateTarget,
    };
  }
  return null;
}

function clearAgendaDropTargets() {
  document
    .querySelectorAll(
      ".agenda-slot.is-drop-target, .agenda-slot.is-dragging, .agenda-event-chip.is-dragging, .agenda-list-item.is-dragging, .agenda-timeline-event.is-dragging, .agenda-large-day.is-drop-target, .agenda-list-day.is-drop-target, .agenda-timeline__day-column.is-drop-target, .agenda-week-day.is-drop-target"
    )
    .forEach((item) => {
      item.classList.remove("is-drop-target", "is-dragging");
    });
}

function handleAgendaAppointmentDragStart(event) {
  const appointmentElement = getAgendaDraggedAppointmentElement(event.target);
  if (!appointmentElement) {
    return;
  }
  agendaDragState.appointmentId = appointmentElement.dataset.appointmentId || "";
  agendaDragState.sourceSlotAt = appointmentElement.dataset.slotAt || "";
  appointmentElement.classList.add("is-dragging");
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", agendaDragState.appointmentId);
  }
}

function handleAgendaAppointmentDragOver(event) {
  if (!agendaDragState.appointmentId) {
    return;
  }
  const dropTarget = resolveAgendaDropTarget(event);
  if (!dropTarget?.dateValue || !dropTarget.highlightElement) {
    return;
  }
  event.preventDefault();
  clearAgendaDropTargets();
  dropTarget.highlightElement.classList.add("is-drop-target");
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

function handleAgendaAppointmentDragEnd() {
  clearAgendaDropTargets();
  agendaDragState.appointmentId = "";
  agendaDragState.sourceSlotAt = "";
}

async function handleAgendaAppointmentDrop(event) {
  if (!agendaDragState.appointmentId) {
    return;
  }
  const dropTarget = resolveAgendaDropTarget(event);
  if (!dropTarget?.dateValue) {
    return;
  }
  event.preventDefault();
  const appointmentId = agendaDragState.appointmentId;
  clearAgendaDropTargets();
  agendaDragState.appointmentId = "";
  agendaDragState.sourceSlotAt = "";
  openAppointmentModalForRescheduleDate(appointmentId, dropTarget.dateValue);
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

async function handleBillingDocumentsClick(event) {
  const viewButton = event.target.closest("button[data-view-billing-document]");
  if (viewButton) {
    const detail = await loadSalesDocumentDetail(viewButton.dataset.viewBillingDocument);
    setActiveSection("sales");
    setSectionSubsection("sales", resolveSalesSubsectionForDocument(detail));
    return;
  }
  const pdfButton = event.target.closest("button[data-download-billing-document]");
  if (pdfButton) {
    const result = await api.generateBillingDocumentPdf(pdfButton.dataset.downloadBillingDocument);
    openExportUrl(result?.url);
    showStatus("PDF del documento generado.", "success");
    return;
  }
  const button = event.target.closest("button[data-select-billing-document]");
  if (!button) {
    return;
  }
  const document = state.billing_documents.find((item) => item.id === button.dataset.selectBillingDocument);
  elements.billingPaymentDocumentSelect.value = button.dataset.selectBillingDocument;
  if (document) {
    elements.billingPaymentForm.elements.amount.value = Number(document.balance_due || 0);
  }
  if (elements.billingPaymentMethodSelect) {
    elements.billingPaymentMethodSelect.value = "Pendiente";
  }
  syncBillingDocumentFormState();
  setBillingWizardStep(3, { skipValidation: true, silent: true });
  await loadSalesDocumentDetail(button.dataset.selectBillingDocument, { silent: true });
  showStatus("Factura pendiente seleccionada para registrar abono.", "info");
  setActiveSection("sales");
  setSectionSubsection("sales", "factura");
}

async function handleSalesDocumentDetailClick(event) {
  const pdfButton = event.target.closest("button[data-download-billing-document]");
  if (pdfButton) {
    const result = await api.generateBillingDocumentPdf(pdfButton.dataset.downloadBillingDocument);
    openExportUrl(result?.url);
    showStatus("PDF del documento generado.", "success");
    return;
  }
  const paymentPdfButton = event.target.closest("button[data-download-billing-payment]");
  if (paymentPdfButton && salesSelectedDocumentId) {
    const result = await api.generateBillingPaymentPdf(
      salesSelectedDocumentId,
      paymentPdfButton.dataset.downloadBillingPayment
    );
    openExportUrl(result?.url);
    showStatus("PDF del abono generado.", "success");
    return;
  }
  const selectPaymentButton = event.target.closest("button[data-select-billing-document]");
  if (selectPaymentButton) {
    await handleBillingDocumentsClick(event);
  }
}

async function handleSalesDocumentEmailSubmit(event) {
  const form = event.target.closest("form[data-sales-email-form]");
  if (!form || !salesSelectedDocumentId) {
    return;
  }
  event.preventDefault();
  const payload = serializeForm(form);
  const result = await api.sendBillingDocumentEmail(salesSelectedDocumentId, payload);
  showStatus(`Correo enviado a ${result.to}.`, "success");
}

async function handleSalesReportSubmit(event) {
  event.preventDefault();
  setSectionSubsection("sales", "caja");
  await loadSalesReport();
}

async function handleSalesReportPdfClick() {
  syncSalesReportStateFromForm();
  const result = await api.generateSalesReportPdf({
    start_date: salesReportState.start_date,
    end_date: salesReportState.end_date,
  });
  openExportUrl(result?.url);
  showStatus("PDF del reporte generado.", "success");
}

async function handleSalesInventoryPdfClick() {
  syncSalesReportStateFromForm();
  const result = await api.generateInventoryReportPdf({
    as_of_date: salesReportState.as_of_date,
  });
  openExportUrl(result?.url);
  showStatus("PDF de inventario generado.", "success");
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
      const labTestModalOpen = Boolean(
        elements.labTestModal && !elements.labTestModal.classList.contains("is-hidden")
      );
      if (labTestModalOpen) {
        closeLabTestModal();
        return;
      }
      const procedureOrderModalOpen = Boolean(
        elements.procedureOrderModal &&
          !elements.procedureOrderModal.classList.contains("is-hidden")
      );
      if (procedureOrderModalOpen) {
        closeProcedureOrderModal();
        return;
      }
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

function scrollToDashboardTarget(targetId = "") {
  const target = targetId ? getElement(targetId) : null;
  if (!target || typeof target.scrollIntoView !== "function") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return;
  }
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function runDashboardShortcut(shortcut) {
  if (!isDashboardShortcutAllowed(shortcut)) {
    showStatus("Tu perfil no tiene acceso a esta accion.", "info");
    return;
  }
  let targetId = "";
  switch (shortcut) {
    case "dashboard-home":
      setSectionSubsection("dashboard", "overview");
      setActiveSection("dashboard");
      targetId = "dashboardQuickActions";
      break;
    case "agenda":
      setSectionSubsection("agenda", "general");
      setActiveSection("agenda");
      targetId = "agendaGeneralPanel";
      break;
    case "sales":
    case "factura":
      setSectionSubsection("sales", "factura");
      setActiveSection("sales");
      targetId = "salesDocumentFormPanel";
      break;
    case "cotizacion":
      setSectionSubsection("sales", "cotizacion");
      setActiveSection("sales");
      targetId = "salesDocumentFormPanel";
      break;
    case "abono":
      setSectionSubsection("sales", "factura");
      setActiveSection("sales");
      if (elements.billingPaymentMethodSelect) {
        elements.billingPaymentMethodSelect.value = "Pendiente";
      }
      syncBillingDocumentFormState();
      setBillingWizardStep(3, { skipValidation: true, silent: true });
      targetId = getPendingBillingDocuments().length ? "salesPaymentFormPanel" : "salesDocumentFormPanel";
      break;
    case "caja":
      setSectionSubsection("sales", "caja");
      setActiveSection("sales");
      targetId = "salesCashFormPanel";
      break;
    case "inventory":
      setSectionSubsection("sales", "inventario");
      setActiveSection("sales");
      targetId = "salesCatalogPanel";
      break;
    case "consultorio":
    case "patients":
      setSectionSubsection("consultorio", "patients");
      setActiveSection("consultorio");
      targetId = "consultorioOwnersPanel";
      break;
    case "consents":
      setSectionSubsection("consents", "general");
      setActiveSection("consents");
      targetId = "consentsFormPanel";
      break;
    case "grooming":
      openConsultorioGroomingSection();
      return;
    case "reports":
      setSectionSubsection("reports", "classic");
      setActiveSection("reports");
      targetId = "reportsStatsBlock";
      break;
    case "administration":
    case "users":
      setSectionSubsection("administration", "users");
      setActiveSection("administration");
      targetId = "administrationUsersPanel";
      break;
    default:
      return;
  }
  scrollToDashboardTarget(targetId);
}

async function handleDashboardShortcutClick(event) {
  const trigger = event.target.closest("[data-dashboard-shortcut]");
  if (!trigger) {
    return;
  }
  await runDashboardShortcut(trigger.dataset.dashboardShortcut || "");
}

function bindForms() {
  const dashboardSection = getElement("dashboard");
  if (dashboardSection) {
    dashboardSection.addEventListener("click", wrapAsync(handleDashboardShortcutClick));
  }
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
  if (elements.closeInventoryItemModalButton) {
    elements.closeInventoryItemModalButton.addEventListener("click", closeInventoryItemModal);
  }
  if (elements.inventoryItemModal) {
    elements.inventoryItemModal.addEventListener("input", handleInventoryItemModalInput);
    elements.inventoryItemModal.addEventListener("click", wrapAsync(handleInventoryItemModalClick));
  }
  if (elements.closeProviderDirectoryModalButton) {
    elements.closeProviderDirectoryModalButton.addEventListener("click", closeProviderDirectoryModal);
  }
  if (elements.providerDirectoryModal) {
    elements.providerDirectoryModal.addEventListener(
      "click",
      wrapAsync(handleProviderDirectoryModalClick)
    );
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
    elements.consultorioPatientProfileSummary.addEventListener("click", wrapAsync(async (event) => {
      if (!event.target.closest("[data-order-actions], [data-lab-actions]")) {
        closeConsultorioOrderActionMenus();
        closeConsultorioLaboratoryActionMenus();
      }
      const profileViewButton = event.target.closest("[data-consultorio-profile-view]");
      if (profileViewButton) {
        setConsultorioProfileView(profileViewButton.dataset.consultorioProfileView || "records");
        return;
      }
      const closeProfileButton = event.target.closest("[data-consultorio-profile-close]");
      if (closeProfileButton) {
        closeConsultorioPatientProfile({ preservePatient: true });
        return;
      }
      const ownerEditButton = event.target.closest("[data-consultorio-owner-edit]");
      if (ownerEditButton) {
        const owner = getConsultorioOwner();
        if (owner) {
          openOwnerModal(owner);
        }
        return;
      }
      const toggleNotesButton = event.target.closest("[data-consultorio-profile-notes-toggle]");
      if (toggleNotesButton) {
        consultorioPatientProfileNotesVisible = !consultorioPatientProfileNotesVisible;
        renderConsultorioPatientProfile();
        return;
      }
      const newPatientButton = event.target.closest("[data-consultorio-new-patient]");
      if (newPatientButton) {
        closeConsultorioPatientProfile({ preservePatient: true });
        openNewPatientEditor();
        return;
      }
      const openGroomingSectionButton = event.target.closest("[data-open-grooming-section]");
      if (openGroomingSectionButton) {
        openGroomingModal({ patientId: consultorioPatientId });
        return;
      }
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
      const orderActionsToggle = event.target.closest("[data-order-actions-toggle]");
      if (orderActionsToggle) {
        toggleConsultorioOrderActionMenu(orderActionsToggle.dataset.orderActionsToggle || "");
        return;
      }
      const labActionsToggle = event.target.closest("[data-lab-actions-toggle]");
      if (labActionsToggle) {
        toggleConsultorioLaboratoryActionMenu(labActionsToggle.dataset.labActionsToggle || "");
        return;
      }
      const orderActionButton = event.target.closest("[data-order-action]");
      if (orderActionButton) {
        await handleConsultorioOrderAction(
          orderActionButton.dataset.orderAction || "",
          orderActionButton.dataset.orderId || ""
        );
        return;
      }
      const labActionButton = event.target.closest("[data-lab-action]");
      if (labActionButton) {
        await handleConsultorioLaboratoryAction(
          labActionButton.dataset.labAction || "",
          labActionButton.dataset.labId || ""
        );
        return;
      }
      const deleteDocumentButton = event.target.closest("[data-delete-patient-document]");
      if (deleteDocumentButton) {
        await handleConsultorioDocumentDeleteAction(
          deleteDocumentButton.dataset.deletePatientDocument || ""
        );
        return;
      }
      const editConsultationButton = event.target.closest("[data-edit-patient-consultation]");
      if (editConsultationButton) {
        const consultation = getConsultationById(editConsultationButton.dataset.editPatientConsultation || "");
        if (consultation) {
          closeConsultorioOrderActionMenus();
          closeConsultorioLaboratoryActionMenus();
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
    }));
  }
  window.addEventListener("resize", () => {
    closeConsultorioOrderActionMenus();
    closeConsultorioLaboratoryActionMenus();
  });
  window.addEventListener(
    "scroll",
    () => {
      closeConsultorioOrderActionMenus();
      closeConsultorioLaboratoryActionMenus();
    },
    true
  );
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
  if (elements.patientDocumentAddFormatButton) {
    elements.patientDocumentAddFormatButton.addEventListener(
      "click",
      handlePatientDocumentAddFormatClick
    );
  }
  if (elements.patientDocumentToolbar) {
    elements.patientDocumentToolbar.addEventListener("mousedown", (event) => {
      if (event.target.closest("button[data-document-command]")) {
        event.preventDefault();
      }
    });
    elements.patientDocumentToolbar.addEventListener(
      "click",
      wrapAsync(handlePatientDocumentToolbarClick)
    );
  }
  if (elements.patientDocumentStyleSelect) {
    elements.patientDocumentStyleSelect.addEventListener("change", (event) => {
      applyPatientDocumentStylePreset(event.target.value || "");
      event.target.value = "";
    });
  }
  if (elements.patientDocumentBlockFormatSelect) {
    elements.patientDocumentBlockFormatSelect.addEventListener("change", (event) => {
      const value = String(event.target.value || "").trim();
      if (!value) {
        return;
      }
      applyPatientDocumentEditorCommand("formatBlock", value);
    });
  }
  if (elements.patientDocumentFontFamilySelect) {
    elements.patientDocumentFontFamilySelect.addEventListener("change", (event) => {
      const value = String(event.target.value || "").trim();
      if (!value) {
        return;
      }
      applyPatientDocumentEditorCommand(
        "fontName",
        value === "default" ? DEFAULT_DOCUMENT_EDITOR_FONT_FAMILY : value
      );
    });
  }
  if (elements.patientDocumentFontSizeSelect) {
    elements.patientDocumentFontSizeSelect.addEventListener("change", (event) => {
      const value = String(event.target.value || "").trim();
      if (!value) {
        return;
      }
      applyPatientDocumentEditorCommand(
        "fontSize",
        value === "default" ? DEFAULT_DOCUMENT_EDITOR_FONT_SIZE : value
      );
    });
  }
  if (elements.patientDocumentEditor) {
    elements.patientDocumentEditor.addEventListener("input", syncPatientDocumentEditorState);
    elements.patientDocumentEditor.addEventListener("blur", syncPatientDocumentEditorState);
    elements.patientDocumentEditor.addEventListener("click", updatePatientDocumentStatusBar);
    elements.patientDocumentEditor.addEventListener("keyup", updatePatientDocumentStatusBar);
    elements.patientDocumentEditor.addEventListener("focus", updatePatientDocumentStatusBar);
    elements.patientDocumentEditor.addEventListener("paste", (event) => {
      event.preventDefault();
      const plainText = event.clipboardData?.getData("text/plain") || "";
      if (typeof document?.execCommand === "function") {
        document.execCommand("insertText", false, plainText);
      }
      syncPatientDocumentEditorState();
    });
  }
  if (elements.patientDocumentSourceEditor) {
    elements.patientDocumentSourceEditor.addEventListener("input", (event) => {
      syncPatientDocumentSourceState(event.target.value || "");
      updatePatientDocumentStatusBar();
    });
    elements.patientDocumentSourceEditor.addEventListener("blur", (event) => {
      syncPatientDocumentSourceState(event.target.value || "");
      updatePatientDocumentStatusBar();
    });
  }
  if (elements.patientDocumentFormatSelect) {
    elements.patientDocumentFormatSelect.addEventListener("change", (event) => {
      syncPatientDocumentTemplateSelection({
        format: String(event.target.value || "").trim(),
      });
    });
  }
  if (elements.patientDocumentTemplateSelect) {
    elements.patientDocumentTemplateSelect.addEventListener("change", (event) => {
      syncPatientDocumentTemplateSelection({
        templateId: String(event.target.value || "").trim(),
      });
    });
  }
  if (elements.patientDocumentSignatureSelect) {
    elements.patientDocumentSignatureSelect.addEventListener("change", () => {
      syncPatientDocumentSignatureOptionsVisibility({
        updateTemplate: true,
      });
    });
  }
  if (elements.patientDocumentOwnerSignatureCheckbox) {
    elements.patientDocumentOwnerSignatureCheckbox.addEventListener("change", () => {
      syncPatientDocumentSignatureOptionsVisibility({
        updateTemplate: true,
      });
    });
  }
  if (elements.patientDocumentProfessionalSignatureCheckbox) {
    elements.patientDocumentProfessionalSignatureCheckbox.addEventListener("change", () => {
      syncPatientDocumentSignatureOptionsVisibility({
        updateTemplate: true,
      });
    });
  }
  if (elements.patientDocumentApplyTemplateButton) {
    elements.patientDocumentApplyTemplateButton.addEventListener("click", () => {
      syncPatientDocumentTemplateSelection({
        forceTemplateReplace: true,
      });
    });
  }
  if (elements.closeLabTestModalButton) {
    elements.closeLabTestModalButton.addEventListener("click", closeLabTestModal);
  }
  if (elements.cancelLabTestModalButton) {
    elements.cancelLabTestModalButton.addEventListener("click", closeLabTestModal);
  }
  if (elements.labTestModal) {
    elements.labTestModal.addEventListener("click", (event) => {
      if (event.target.dataset.closeLabTestModal) {
        closeLabTestModal();
      }
    });
  }
  if (elements.labTestForm) {
    elements.labTestForm.addEventListener("submit", handleLabTestSubmit);
  }
  if (elements.labTestCategorySelect) {
    elements.labTestCategorySelect.addEventListener("change", () => {
      syncLabTestCategoryCustomField();
      if (elements.labTestCategorySelect?.value === LAB_TEST_CATEGORY_CUSTOM_OPTION) {
        elements.labTestCategoryCustomInput?.focus();
      }
    });
  }
  if (elements.closeProcedureOrderModalButton) {
    elements.closeProcedureOrderModalButton.addEventListener("click", closeProcedureOrderModal);
  }
  if (elements.cancelProcedureOrderModalButton) {
    elements.cancelProcedureOrderModalButton.addEventListener("click", closeProcedureOrderModal);
  }
  if (elements.procedureOrderModal) {
    elements.procedureOrderModal.addEventListener("click", (event) => {
      if (event.target.dataset.closeProcedureOrderModal) {
        closeProcedureOrderModal();
      }
    });
  }
  if (elements.procedureOrderForm) {
    elements.procedureOrderForm.addEventListener("submit", handleProcedureOrderSubmit);
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
  if (elements.patientProcedureRegisterTypeButton && elements.patientProcedureNameSelect) {
    elements.patientProcedureRegisterTypeButton.addEventListener("click", () => {
      elements.patientProcedureNameSelect.value = CONSULTORIO_PROCEDURE_CUSTOM_OPTION;
      syncPatientProcedureCustomField();
      elements.patientProcedureCustomNameInput?.focus();
    });
  }
  if (elements.patientProcedureNameSelect) {
    elements.patientProcedureNameSelect.addEventListener("change", syncPatientProcedureCustomField);
  }
  if (elements.patientProcedureAttachmentFileButton && elements.patientProcedureAttachmentFileInput) {
    elements.patientProcedureAttachmentFileButton.addEventListener("click", () => {
      elements.patientProcedureAttachmentFileInput.click();
    });
    elements.patientProcedureAttachmentFileInput.addEventListener(
      "change",
      wrapAsync(async (event) => {
        try {
          await addPatientProcedureAttachmentImages(event.currentTarget.files);
        } finally {
          event.currentTarget.value = "";
        }
      })
    );
  }
  if (elements.patientProcedureAttachmentsList) {
    elements.patientProcedureAttachmentsList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-patient-consultation-attachment]");
      if (!removeButton) {
        return;
      }
      const index = Number(removeButton.dataset.removePatientConsultationAttachment);
      const items = getPatientProcedureAttachments();
      items.splice(index, 1);
      setPatientProcedureAttachments(items);
    });
  }
  if (elements.patientOrderAddButton) {
    elements.patientOrderAddButton.addEventListener("click", () => {
      const items = getPatientOrderItems({ includeEmpty: true });
      items.push(createConsultorioOrderItem());
      renderPatientOrderItems(items);
      elements.patientOrderItemsList
        ?.querySelector('[data-order-item]:last-child [data-order-item-field="type"]')
        ?.focus();
    });
  }
  if (elements.patientOrderItemsList) {
    elements.patientOrderItemsList.addEventListener("click", (event) => {
      const pickerTrigger = event.target.closest("[data-order-picker-trigger]");
      if (pickerTrigger) {
        const row = pickerTrigger.closest("[data-order-item]");
        const panel = row?.querySelector("[data-order-picker-panel]");
        const searchInput = row?.querySelector("[data-order-picker-search]");
        const willOpen = panel?.classList.contains("is-hidden");
        closePatientOrderPickerPanels();
        if (willOpen && panel) {
          panel.classList.remove("is-hidden");
          pickerTrigger.setAttribute("aria-expanded", "true");
          if (searchInput) {
            searchInput.value = "";
            filterPatientOrderPickerOptions(searchInput);
            searchInput.focus();
          }
        }
        return;
      }
      const priorityTrigger = event.target.closest("[data-order-priority-trigger]");
      if (priorityTrigger) {
        const row = priorityTrigger.closest("[data-order-item]");
        const panel = row?.querySelector("[data-order-priority-panel]");
        const searchInput = row?.querySelector("[data-order-priority-search]");
        const willOpen = panel?.classList.contains("is-hidden");
        closePatientOrderPickerPanels();
        if (willOpen && panel) {
          panel.classList.remove("is-hidden");
          priorityTrigger.setAttribute("aria-expanded", "true");
          if (searchInput) {
            searchInput.value = "";
            filterPatientOrderPriorityOptions(searchInput);
            searchInput.focus();
          }
        }
        return;
      }
      const optionButton = event.target.closest("[data-order-item-option]");
      if (optionButton) {
        const index = Number(optionButton.dataset.orderItemOption);
        const items = getPatientOrderItems({ includeEmpty: true });
        if (!items[index]) {
          return;
        }
        items[index].item = optionButton.dataset.optionValue || "";
        items[index].itemCustom = "";
        renderPatientOrderItems(items);
        return;
      }
      const priorityOptionButton = event.target.closest("[data-order-priority-option]");
      if (priorityOptionButton) {
        const index = Number(priorityOptionButton.dataset.orderPriorityOption);
        const items = getPatientOrderItems({ includeEmpty: true });
        if (!items[index]) {
          return;
        }
        items[index].priority = priorityOptionButton.dataset.priorityValue || "";
        renderPatientOrderItems(items);
        return;
      }
      const registerCustomButton = event.target.closest("[data-order-item-register-custom]");
      if (registerCustomButton) {
        const index = Number(registerCustomButton.dataset.orderItemRegisterCustom);
        const items = getPatientOrderItems({ includeEmpty: true });
        if (!items[index]) {
          return;
        }
        const orderType = normalizeConsultorioOrderType(items[index].type);
        if (orderType === "Cirugia/procedimiento") {
          const hasCustom =
            items[index].item === CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION ||
            Boolean(items[index].itemCustom);
          const existingLabel = hasCustom ? getConsultorioOrderItemDisplayName(items[index]) : "";
          openProcedureOrderModal({ index, name: existingLabel });
          return;
        }
        if (orderType === "Prueba/Examen") {
          const hasCustom =
            items[index].item === CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION ||
            Boolean(items[index].itemCustom);
          const existingLabel = hasCustom ? getConsultorioOrderItemDisplayName(items[index]) : "";
          const parsed = parseOrderCatalogLabel(existingLabel);
          openLabTestModal({ index, category: parsed.category, name: parsed.name });
          return;
        }
        items[index].item = CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION;
        items[index].itemCustom = items[index].itemCustom || "";
        renderPatientOrderItems(items);
        elements.patientOrderItemsList
          ?.querySelector(`[data-order-item="${index}"] [data-order-item-field="item_custom"]`)
          ?.focus();
        return;
      }
      const removeButton = event.target.closest("[data-remove-patient-order-item]");
      if (!removeButton) {
        if (!event.target.closest("[data-order-picker]")) {
          closePatientOrderPickerPanels();
        }
        return;
      }
      const index = Number(removeButton.dataset.removePatientOrderItem);
      const items = getPatientOrderItems({ includeEmpty: true });
      items.splice(index, 1);
      renderPatientOrderItems(items);
    });
    elements.patientOrderItemsList.addEventListener("input", (event) => {
      const searchInput = event.target.closest("[data-order-picker-search]");
      if (searchInput) {
        filterPatientOrderPickerOptions(searchInput);
        return;
      }
      const prioritySearchInput = event.target.closest("[data-order-priority-search]");
      if (!prioritySearchInput) {
        return;
      }
      filterPatientOrderPriorityOptions(prioritySearchInput);
    });
    elements.patientOrderItemsList.addEventListener("change", (event) => {
      const field = event.target.closest("[data-order-item-field]");
      if (!field) {
        return;
      }
      const row = field.closest("[data-order-item]");
      if (!row) {
        return;
      }
      const index = Number(row.dataset.orderItem);
      const items = getPatientOrderItems({ includeEmpty: true });
      if (!items[index]) {
        return;
      }
      if (field.dataset.orderItemField === "type") {
        items[index].type = field.value || "";
        items[index].item = "";
        items[index].itemCustom = "";
        if (
          isConsultorioHospitalizationOrderType(items[index].type) &&
          !CONSULTORIO_HOSPITALIZATION_PRIORITY_OPTIONS.some(
            (option) => option.value === items[index].priority
          )
        ) {
          items[index].priority = "Urgencia";
        }
        renderPatientOrderItems(items);
        elements.patientOrderItemsList
          ?.querySelector(
            isConsultorioHospitalizationOrderType(items[index].type)
              ? `[data-order-item="${index}"] [data-order-priority-trigger]`
              : `[data-order-item="${index}"] [data-order-picker-trigger], [data-order-item="${index}"] [data-order-item-field="item"]`
          )
          ?.focus();
        return;
      }
      if (field.dataset.orderItemField === "item") {
        items[index].item = field.value || "";
        if (field.value !== CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION) {
          items[index].itemCustom = "";
        }
        renderPatientOrderItems(items);
        if (field.value === CONSULTORIO_ORDER_ITEM_CUSTOM_OPTION) {
          elements.patientOrderItemsList
            ?.querySelector(`[data-order-item="${index}"] [data-order-item-field="item_custom"]`)
            ?.focus();
        }
      }
    });
  }
  if (elements.patientLaboratoryAddButton) {
    elements.patientLaboratoryAddButton.addEventListener("click", () => {
      const items = getPatientLaboratoryItems({ includeEmpty: true });
      items.push(createConsultorioLaboratoryItem());
      renderPatientLaboratoryItems(items);
      elements.patientLaboratoryItemsList
        ?.querySelector('[data-lab-item]:last-child [data-lab-item-field="professional"]')
        ?.focus();
    });
  }
  if (elements.patientLaboratoryItemsList) {
    elements.patientLaboratoryItemsList.addEventListener("click", (event) => {
      const addUserButton = event.target.closest("[data-lab-item-add-user]");
      if (addUserButton) {
        const index = Number(addUserButton.dataset.labItemAddUser);
        openUserModal(null, {
          source: "laboratory",
          labItemIndex: Number.isFinite(index) ? index : null,
        });
        if (!isAdminUser()) {
          setUserFormError("Solo los administradores pueden registrar usuarios.");
        }
        return;
      }
      const registerCustomButton = event.target.closest("[data-lab-item-register-custom]");
      if (registerCustomButton) {
        const index = Number(registerCustomButton.dataset.labItemRegisterCustom);
        const items = getPatientLaboratoryItems({ includeEmpty: true });
        if (!items[index]) {
          return;
        }
        const parsed = parseOrderCatalogLabel(items[index].item || "");
        openLabTestModal({
          index,
          category: parsed.category,
          name: parsed.name,
          target: "laboratory",
        });
        return;
      }
      const selectResultButton = event.target.closest("[data-lab-item-select-result]");
      if (selectResultButton) {
        const index = Number(selectResultButton.dataset.labItemSelectResult);
        elements.patientLaboratoryItemsList
          ?.querySelector(`[data-lab-item-result-input="${index}"]`)
          ?.click();
        return;
      }
      const removeResultButton = event.target.closest("[data-remove-lab-item-result]");
      if (removeResultButton) {
        const index = Number(removeResultButton.dataset.removeLabItemResult);
        const resultIndex = Number(removeResultButton.dataset.labItemResultIndex);
        const items = getPatientLaboratoryItems({ includeEmpty: true });
        if (!items[index]) {
          return;
        }
        items[index].results.splice(resultIndex, 1);
        renderPatientLaboratoryItems(items);
        return;
      }
      const removeButton = event.target.closest("[data-remove-patient-laboratory-item]");
      if (!removeButton) {
        return;
      }
      const index = Number(removeButton.dataset.removePatientLaboratoryItem);
      const items = getPatientLaboratoryItems({ includeEmpty: true });
      items.splice(index, 1);
      renderPatientLaboratoryItems(items);
    });
    elements.patientLaboratoryItemsList.addEventListener(
      "change",
      wrapAsync(async (event) => {
        const resultInput = event.target.closest("[data-lab-item-result-input]");
        if (!resultInput) {
          return;
        }
        const files = Array.from(resultInput.files || []);
        if (!files.length) {
          return;
        }
        const index = Number(resultInput.dataset.labItemResultInput);
        const items = getPatientLaboratoryItems({ includeEmpty: true });
        if (!items[index]) {
          resultInput.value = "";
          return;
        }
        try {
          const resultFiles = (
            await Promise.all(files.map((file) => buildConsultorioLaboratoryResultFile(file)))
          ).filter(Boolean);
          items[index].results = [...items[index].results, ...resultFiles];
          renderPatientLaboratoryItems(items);
        } finally {
          resultInput.value = "";
        }
      })
    );
  }
  if (elements.patientImagingAddUserButton) {
    elements.patientImagingAddUserButton.addEventListener("click", () => {
      openUserModal(null, { source: "imaging" });
      if (!isAdminUser()) {
        setUserFormError("Solo los administradores pueden registrar usuarios.");
      }
    });
  }
  if (elements.patientRemissionAddUserButton) {
    elements.patientRemissionAddUserButton.addEventListener("click", () => {
      openUserModal(null, { source: "remission" });
      if (!isAdminUser()) {
        setUserFormError("Solo los administradores pueden registrar usuarios.");
      }
    });
  }
  if (elements.patientImagingAttachmentFileButton && elements.patientImagingAttachmentFileInput) {
    elements.patientImagingAttachmentFileButton.addEventListener("click", () => {
      elements.patientImagingAttachmentFileInput.click();
    });
    elements.patientImagingAttachmentFileInput.addEventListener(
      "change",
      wrapAsync(async (event) => {
        try {
          await addPatientImagingAttachmentImages(event.currentTarget.files);
        } finally {
          event.currentTarget.value = "";
        }
      })
    );
  }
  if (elements.patientImagingAttachmentsList) {
    elements.patientImagingAttachmentsList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-patient-consultation-attachment]");
      if (!removeButton) {
        return;
      }
      const index = Number(removeButton.dataset.removePatientConsultationAttachment);
      const items = getPatientImagingAttachments();
      items.splice(index, 1);
      setPatientImagingAttachments(items);
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
  if (elements.billingSettingsForm) {
    elements.billingSettingsForm.addEventListener("submit", wrapAsync(handleBillingSettingsSubmit));
  }
  elements.ownerForm.addEventListener("submit", wrapAsync(handleOwnerSubmit));
  elements.providerForm.addEventListener("submit", wrapAsync(handleProviderSubmit));
  elements.patientForm.addEventListener("submit", wrapAsync(handlePatientSubmit));
  elements.catalogForm.addEventListener("submit", wrapAsync(handleCatalogSubmit));
  if (elements.catalogItemsList) {
    elements.catalogItemsList.addEventListener("input", handleCatalogItemsInput);
    elements.catalogItemsList.addEventListener("change", handleCatalogItemsInput);
    elements.catalogItemsList.addEventListener("click", wrapAsync(handleCatalogItemsClick));
    elements.catalogItemsList.addEventListener("submit", wrapAsync(handleInventoryInlineFormSubmit));
  }
  elements.appointmentForm.addEventListener("submit", wrapAsync(handleAppointmentSubmit));
  elements.appointmentForm.addEventListener("input", clearAppointmentFormFeedback);
  elements.appointmentForm.addEventListener("change", clearAppointmentFormFeedback);
  if (elements.availabilityForm) {
    elements.availabilityForm.addEventListener("submit", wrapAsync(handleAvailabilitySubmit));
  }
  if (elements.availabilityRulesList) {
    elements.availabilityRulesList.addEventListener(
      "click",
      wrapAsync(handleAvailabilityListClick)
    );
  }
  elements.billingDocumentForm.addEventListener("submit", wrapAsync(handleBillingDocumentSubmit));
  elements.billingDocumentForm.addEventListener("click", handleBillingWizardClick);
  elements.billingDocumentForm.addEventListener("input", renderBillingWizard);
  elements.billingDocumentForm.addEventListener("change", renderBillingWizard);
  elements.billingPaymentForm.addEventListener("submit", wrapAsync(handleBillingPaymentSubmit));
  elements.cashMovementForm.addEventListener("submit", wrapAsync(handleCashMovementSubmit));
  elements.cashMovementForm.addEventListener("change", (event) => {
    const field = event.target.closest('select[name="cash_account"]');
    if (!field) {
      return;
    }
    setCashAccountSelection(field.value || "");
  });
  if (elements.cashAccountsSummary) {
    elements.cashAccountsSummary.addEventListener("click", handleCashAccountSummaryClick);
  }
  if (elements.cashSessionOpenForm) {
    elements.cashSessionOpenForm.addEventListener("submit", wrapAsync(handleCashSessionOpenSubmit));
    elements.cashSessionOpenForm.addEventListener("change", (event) => {
      const dateField = event.target.closest('input[name="session_date"]');
      if (dateField) {
        if (elements.cashSessionCloseForm?.elements?.session_date) {
          elements.cashSessionCloseForm.elements.session_date.value = dateField.value || "";
        }
        renderCashSessionsSummary();
        return;
      }
      const accountField = event.target.closest('select[name="cash_account"]');
      if (accountField) {
        setCashAccountSelection(accountField.value || "");
      }
    });
  }
  if (elements.cashSessionCloseForm) {
    elements.cashSessionCloseForm.addEventListener("submit", wrapAsync(handleCashSessionCloseSubmit));
    elements.cashSessionCloseForm.addEventListener("change", (event) => {
      const dateField = event.target.closest('input[name="session_date"]');
      if (dateField) {
        if (elements.cashSessionOpenForm?.elements?.session_date) {
          elements.cashSessionOpenForm.elements.session_date.value = dateField.value || "";
        }
        renderCashSessionsSummary();
        return;
      }
      const accountField = event.target.closest('select[name="cash_account"]');
      if (accountField) {
        setCashAccountSelection(accountField.value || "");
      }
    });
  }
  elements.stockAdjustmentForm.addEventListener("submit", wrapAsync(handleStockAdjustmentSubmit));
  elements.consultationForm.addEventListener("submit", wrapAsync(handleConsultationSubmit));
  elements.evolutionForm.addEventListener("submit", wrapAsync(handleEvolutionSubmit));
  elements.consentForm.addEventListener("submit", wrapAsync(handleConsentSubmit));
  elements.groomingForm.addEventListener("submit", wrapAsync(handleGroomingSubmit));
  elements.saveDraftButton.addEventListener("click", wrapAsync(() => submitRecord(false)));
  elements.finalizeRecordButton.addEventListener("click", wrapAsync(() => submitRecord(true)));
  elements.addBillingLineButton.addEventListener("click", wrapAsync(async () => addDraftBillingLine()));
  elements.billingDraftLines.addEventListener("click", handleBillingDraftClick);
  elements.billingDocumentsList.addEventListener("click", wrapAsync(handleBillingDocumentsClick));
  if (elements.salesDocumentDetail) {
    elements.salesDocumentDetail.addEventListener("click", wrapAsync(handleSalesDocumentDetailClick));
    elements.salesDocumentDetail.addEventListener("submit", wrapAsync(handleSalesDocumentEmailSubmit));
  }
  if (elements.salesReportsContent) {
    elements.salesReportsContent.addEventListener("click", wrapAsync(handleBillingDocumentsClick));
  }
  if (elements.salesReportForm) {
    elements.salesReportForm.addEventListener("submit", wrapAsync(handleSalesReportSubmit));
  }
  if (elements.salesReportPdfButton) {
    elements.salesReportPdfButton.addEventListener("click", wrapAsync(handleSalesReportPdfClick));
  }
  if (elements.salesInventoryPdfButton) {
    elements.salesInventoryPdfButton.addEventListener("click", wrapAsync(handleSalesInventoryPdfClick));
  }
  if (elements.appointmentsList) {
    elements.appointmentsList.addEventListener("click", wrapAsync(handleAppointmentsClick));
  }
  if (elements.agendaMonthGrid) {
    elements.agendaMonthGrid.addEventListener("click", handleAgendaMiniCalendarClick);
  }
  if (elements.agendaMonthGridLarge) {
    elements.agendaMonthGridLarge.addEventListener("click", handleAgendaMonthClick);
    elements.agendaMonthGridLarge.addEventListener("dragstart", handleAgendaAppointmentDragStart);
    elements.agendaMonthGridLarge.addEventListener("dragover", handleAgendaAppointmentDragOver);
    elements.agendaMonthGridLarge.addEventListener("dragend", handleAgendaAppointmentDragEnd);
    elements.agendaMonthGridLarge.addEventListener("drop", wrapAsync(handleAgendaAppointmentDrop));
  }
  if (elements.agendaWeekSlots) {
    elements.agendaWeekSlots.addEventListener("click", handleAgendaWeekClick);
    elements.agendaWeekSlots.addEventListener("dragstart", handleAgendaAppointmentDragStart);
    elements.agendaWeekSlots.addEventListener("dragover", handleAgendaAppointmentDragOver);
    elements.agendaWeekSlots.addEventListener("dragend", handleAgendaAppointmentDragEnd);
    elements.agendaWeekSlots.addEventListener("drop", wrapAsync(handleAgendaAppointmentDrop));
  }
  if (elements.agendaWeekTimeline) {
    elements.agendaWeekTimeline.addEventListener("click", handleAgendaTimelineClick);
    elements.agendaWeekTimeline.addEventListener("dragstart", handleAgendaAppointmentDragStart);
    elements.agendaWeekTimeline.addEventListener("dragover", handleAgendaAppointmentDragOver);
    elements.agendaWeekTimeline.addEventListener("dragend", handleAgendaAppointmentDragEnd);
    elements.agendaWeekTimeline.addEventListener("drop", wrapAsync(handleAgendaAppointmentDrop));
  }
  if (elements.agendaDayTimeline) {
    elements.agendaDayTimeline.addEventListener("click", handleAgendaTimelineClick);
    elements.agendaDayTimeline.addEventListener("dragstart", handleAgendaAppointmentDragStart);
    elements.agendaDayTimeline.addEventListener("dragover", handleAgendaAppointmentDragOver);
    elements.agendaDayTimeline.addEventListener("dragend", handleAgendaAppointmentDragEnd);
    elements.agendaDayTimeline.addEventListener("drop", wrapAsync(handleAgendaAppointmentDrop));
  }
  if (elements.agendaListItems) {
    elements.agendaListItems.addEventListener("click", handleAgendaMonthClick);
    elements.agendaListItems.addEventListener("dragstart", handleAgendaAppointmentDragStart);
    elements.agendaListItems.addEventListener("dragover", handleAgendaAppointmentDragOver);
    elements.agendaListItems.addEventListener("dragend", handleAgendaAppointmentDragEnd);
    elements.agendaListItems.addEventListener("drop", wrapAsync(handleAgendaAppointmentDrop));
  }
  if (elements.agendaNextAppointment) {
    elements.agendaNextAppointment.addEventListener("click", handleAgendaMonthClick);
  }
  elements.recordsList.addEventListener("click", handleRecordsClick);
  elements.openAppointmentModalButton.addEventListener("click", () =>
    openAppointmentModalForDate(agendaSelectedDate)
  );
  elements.closeAppointmentModalButton.addEventListener("click", closeAppointmentModal);
  if (elements.closeAppointmentDetailButton) {
    elements.closeAppointmentDetailButton.addEventListener("click", closeAppointmentDetailModal);
  }
  if (elements.openGroomingModalButton) {
    elements.openGroomingModalButton.addEventListener("click", () => openGroomingModal());
  }
  if (elements.closeGroomingModalButton) {
    elements.closeGroomingModalButton.addEventListener("click", closeGroomingModal);
  }
  if (elements.cancelGroomingModalButton) {
    elements.cancelGroomingModalButton.addEventListener("click", closeGroomingModal);
  }
  if (elements.groomingModal) {
    elements.groomingModal.addEventListener("click", (event) => {
      if (event.target.dataset.closeGroomingModal) {
        closeGroomingModal();
      }
    });
  }
  if (elements.groomingAddServiceButton) {
    elements.groomingAddServiceButton.addEventListener("click", () => {
      const items = getGroomingServiceItems({ includeEmpty: true });
      items.push(normalizeGroomingServiceItem());
      renderGroomingServiceItems(items);
      syncGroomingServiceItemsValue();
      elements.groomingServicesList
        ?.querySelector('[data-grooming-service-item]:last-child [data-grooming-service-field="serviceType"]')
        ?.focus();
    });
  }
  if (elements.groomingServicesList) {
    elements.groomingServicesList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-grooming-service-item]");
      if (!removeButton) {
        return;
      }
      const index = Number(removeButton.dataset.removeGroomingServiceItem);
      const items = getGroomingServiceItems({ includeEmpty: true });
      items.splice(index, 1);
      renderGroomingServiceItems(items);
      syncGroomingServiceItemsValue();
    });
    elements.groomingServicesList.addEventListener("input", syncGroomingServiceItemsValue);
    elements.groomingServicesList.addEventListener("change", syncGroomingServiceItemsValue);
  }
  if (elements.groomingBeforePhotoFileButton && elements.groomingBeforePhotoFileInput) {
    elements.groomingBeforePhotoFileButton.addEventListener("click", () => {
      elements.groomingBeforePhotoFileInput.click();
    });
    elements.groomingBeforePhotoFileInput.addEventListener(
      "change",
      wrapAsync(async (event) => {
        try {
          await addGroomingBeforeAttachmentImages(event.currentTarget.files);
        } finally {
          event.currentTarget.value = "";
        }
      })
    );
  }
  if (elements.groomingAfterPhotoFileButton && elements.groomingAfterPhotoFileInput) {
    elements.groomingAfterPhotoFileButton.addEventListener("click", () => {
      elements.groomingAfterPhotoFileInput.click();
    });
    elements.groomingAfterPhotoFileInput.addEventListener(
      "change",
      wrapAsync(async (event) => {
        try {
          await addGroomingAfterAttachmentImages(event.currentTarget.files);
        } finally {
          event.currentTarget.value = "";
        }
      })
    );
  }
  if (elements.groomingBeforePhotosList) {
    elements.groomingBeforePhotosList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-patient-consultation-attachment]");
      if (!removeButton) {
        return;
      }
      const index = Number(removeButton.dataset.removePatientConsultationAttachment);
      const items = getGroomingBeforeAttachments();
      items.splice(index, 1);
      setGroomingBeforeAttachments(items);
    });
  }
  if (elements.groomingAfterPhotosList) {
    elements.groomingAfterPhotosList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-patient-consultation-attachment]");
      if (!removeButton) {
        return;
      }
      const index = Number(removeButton.dataset.removePatientConsultationAttachment);
      const items = getGroomingAfterAttachments();
      items.splice(index, 1);
      setGroomingAfterAttachments(items);
    });
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
  if (elements.billingLineItemSearch) {
    elements.billingLineItemSearch.addEventListener("input", () => {
      const selectedItem = getBillingCatalogItemById(elements.billingLineItemSelect?.value);
      if (
        selectedItem &&
        String(elements.billingLineItemSearch.value || "").trim() !==
          buildBillingCatalogItemLabel(selectedItem)
      ) {
        elements.billingLineItemSelect.value = "";
      }
      renderBillingLineItemDropdown();
      elements.billingLineItemDropdown?.classList.remove("is-hidden");
    });
    elements.billingLineItemSearch.addEventListener("focus", () => {
      const selectedItem = getBillingCatalogItemById(elements.billingLineItemSelect?.value);
      const query = String(elements.billingLineItemSearch.value || "").trim();
      renderBillingLineItemDropdown({
        showAll: !query || (selectedItem && query === buildBillingCatalogItemLabel(selectedItem)),
      });
      elements.billingLineItemDropdown?.classList.remove("is-hidden");
    });
    elements.billingLineItemSearch.addEventListener("blur", () => {
      setTimeout(() => {
        elements.billingLineItemDropdown?.classList.add("is-hidden");
      }, 120);
    });
    elements.billingLineItemSearch.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }
      const firstMatch = elements.billingLineItemDropdown?.querySelector("[data-billing-line-item-id]");
      if (!firstMatch) {
        return;
      }
      event.preventDefault();
      selectBillingLineItem(firstMatch.dataset.billingLineItemId || "");
    });
  }
  if (elements.billingLineItemDropdown) {
    elements.billingLineItemDropdown.addEventListener("click", (event) => {
      const button = event.target.closest("[data-billing-line-item-id]");
      if (!button) {
        return;
      }
      selectBillingLineItem(button.dataset.billingLineItemId || "");
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
    elements.appointmentSlotsStrip.addEventListener("change", (event) => {
      const select = event.target.closest("select[data-appointment-slot-select]");
      if (!select || !select.value) {
        return;
      }
      const selectedOption = select.selectedOptions?.[0] || null;
      const minutes = Number(
        selectedOption?.dataset.slotMinutes || elements.appointmentDurationInput?.value || 30
      );
      selectAppointmentSlot(select.value, minutes);
    });
  }
  elements.appointmentModal.addEventListener("click", (event) => {
    if (event.target.dataset.closeAppointmentModal) {
      closeAppointmentModal();
    }
  });
  if (elements.appointmentDetailModal) {
    elements.appointmentDetailModal.addEventListener("click", wrapAsync(handleAppointmentDetailClick));
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
  elements.billingDocumentTypeSelect.addEventListener("change", syncBillingDocumentFormState);
  elements.billingPaymentMethodSelect.addEventListener("change", syncBillingDocumentFormState);
  elements.consentTypeSelect.addEventListener("change", () =>
    applyConsentTemplate(elements.consentTypeSelect.value)
  );
  elements.consentPatientSelect?.addEventListener("change", renderSelects);
  elements.groomingPatientSelect?.addEventListener("change", renderSelects);
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
    const activeLoaded = await ensureSectionData(activeSectionId, { showError: false });
    const activeReady = getSectionDataRequirements(activeSectionId).every((section) =>
      loadedBootstrapSections.has(section)
    );
    if (activeReady) {
      showStatus("Datos operativos cargados.", "success");
      return;
    }
    showStatus(
      activeLoaded
        ? "Configuracion cargada. Algunos modulos se cargaran al abrirlos."
        : "No fue posible cargar por completo este modulo. Recarga la pagina o cambia de seccion.",
      activeLoaded ? "info" : "error"
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
  renderPatientDocumentEditorSelectOptions();
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
  startAgendaAutoSync();
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
