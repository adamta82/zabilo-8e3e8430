/* Shift planner — utilities and translations (he / en / fr) */

export type PlannerLang = 'he' | 'en' | 'fr';

export interface PlannerSlot {
  id: string;
  start_time: string;
  end_time: string;
  sort_order: number;
}

export interface PlannerRole {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  is_off: boolean;
}

export interface PlannerCell {
  date: string;
  employee_id: string;
  slot_id: string;
  role_id: string;
}

/** grid[date][employeeId][slotId] = roleId */
export type PlannerGrid = Record<string, Record<string, Record<string, string>>>;

export const ROLE_PALETTE = [
  '#2fe171',
  '#f6a623',
  '#d8cbf2',
  '#84f0e9',
  '#ffe08a',
  '#ff9db0',
  '#9ecbff',
  '#c9e78b',
  '#ffcf9e',
  '#e6b8f5',
  '#b8e0d2',
  '#cfcfcf',
];

/* ---------------- dates & time ---------------- */

export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDaysTo(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function sundayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function slotHours(slot: PlannerSlot): number {
  let d = toMinutes(slot.end_time) - toMinutes(slot.start_time);
  if (d < 0) d += 24 * 60;
  return d / 60;
}

export function addMinutesStr(hhmm: string, add: number): string {
  const total = (toMinutes(hhmm) + add + 24 * 60) % (24 * 60);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(total / 60))}:${p(total % 60)}`;
}

export function shortDate(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
}

export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabel(mk: string, locale: string): string {
  const [y, m] = mk.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function makeHourFormatter(lang: PlannerLang) {
  return (h: number) => {
    if (!h) return lang === 'he' ? '0' : '0';
    const full = Math.floor(h);
    const rest = Math.round((h - full) * 60);
    const p = (n: number) => String(n).padStart(2, '0');
    if (lang === 'he') return rest ? `${full}:${p(rest)} שע׳` : `${full} שע׳`;
    return rest ? `${full}h${p(rest)}` : `${full}h`;
  };
}

export function makeDeltaFormatter(fmtH: (h: number) => string) {
  return (d: number) => (!d ? '=' : (d > 0 ? '+' : '−') + fmtH(Math.abs(d)));
}

/** Readable text color over an arbitrary role color */
export function textOn(hex: string): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#16181d' : '#ffffff';
}

/* ---------------- stats ---------------- */

export interface PlannerStats {
  total: number;
  headcount: number;
  byEmp: Record<string, number>;
  byEmpDay: Record<string, Record<string, number>>;
  byRole: Record<string, number>;
  dayTotals: Record<string, number>;
  peak: Record<string, number>;
}

export function computeStats(
  grid: PlannerGrid,
  dates: string[],
  employeeIds: string[],
  roles: PlannerRole[],
  slots: PlannerSlot[]
): PlannerStats {
  const working = new Set(roles.filter((r) => !r.is_off).map((r) => r.id));
  const byEmp: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  const byEmpDay: Record<string, Record<string, number>> = {};
  const dayTotals: Record<string, number> = {};
  const peak: Record<string, number> = {};
  employeeIds.forEach((e) => (byEmp[e] = 0));

  dates.forEach((date) => {
    byEmpDay[date] = {};
    let dayTotal = 0;
    const dg = grid[date] || {};
    slots.forEach((slot) => {
      const h = slotHours(slot);
      const counts: Record<string, number> = {};
      employeeIds.forEach((emp) => {
        const roleId = dg[emp]?.[slot.id];
        if (roleId && working.has(roleId)) {
          byEmp[emp] = (byEmp[emp] || 0) + h;
          byEmpDay[date][emp] = (byEmpDay[date][emp] || 0) + h;
          byRole[roleId] = (byRole[roleId] || 0) + h;
          counts[roleId] = (counts[roleId] || 0) + 1;
          dayTotal += h;
        }
      });
      Object.entries(counts).forEach(([r, c]) => {
        peak[r] = Math.max(peak[r] || 0, c);
      });
    });
    dayTotals[date] = dayTotal;
  });

  const total = Object.values(byEmp).reduce((a, b) => a + b, 0);
  const headcount = Object.values(byEmp).filter((h) => h > 0).length;
  return { total, headcount, byEmp, byEmpDay, byRole, dayTotals, peak };
}

export interface PlannerBlock {
  roleId: string;
  start: string;
  end: string;
  hours: number;
}

export function blocksFor(
  dayGrid: Record<string, Record<string, string>>,
  employeeId: string,
  roles: PlannerRole[],
  slots: PlannerSlot[]
): PlannerBlock[] {
  const working = new Set(roles.filter((r) => !r.is_off).map((r) => r.id));
  const cells = dayGrid?.[employeeId] || {};
  const out: PlannerBlock[] = [];
  let cur: PlannerBlock | null = null;
  slots.forEach((slot) => {
    const roleId = cells[slot.id];
    if (roleId && working.has(roleId)) {
      if (cur && cur.roleId === roleId && cur.end === slot.start_time) {
        cur.end = slot.end_time;
        cur.hours += slotHours(slot);
      } else {
        if (cur) out.push(cur);
        cur = { roleId, start: slot.start_time, end: slot.end_time, hours: slotHours(slot) };
      }
    }
  });
  if (cur) out.push(cur);
  return out;
}

/* ---------------- translations ---------------- */

export interface PlannerStrings {
  locale: string;
  rtl: boolean;
  days: string[];
  daysShort: string[];
  weekOf: (a: string, b: string) => string;
  planned: string;
  people: string;
  vsPrevWeek: string;
  noCompare: string;
  thisWeek: string;
  prevWeek: string;
  nextWeek: string;
  planning: string;
  history: string;
  shareView: string;
  empty: string;
  brush: string;
  erase: string;
  copyYesterday: string;
  dupPrevWeek: string;
  clearDay: string;
  editStructure: string;
  doneEditing: string;
  manageRoles: string;
  dayTotal: string;
  weekTotal: string;
  fillCol: string;
  addSlot: string;
  insertSlot: string;
  removeSlot: string;
  editHint: string;
  recap: string;
  person: string;
  week: string;
  lastWeek: string;
  gap: string;
  needs: string;
  upTo: (n: number) => string;
  notePlaceholder: string;
  hoursPerWeek: string;
  weeksSaved: (n: number) => string;
  perMonth: string;
  month: string;
  weeks: string;
  total: string;
  gapPrevMonth: string;
  peak: string;
  pastNotes: string;
  weekOfShort: (d: string) => string;
  openWeek: (d: string) => string;
  noHistory: string;
  noNotes: string;
  rolesTitle: string;
  roleName: string;
  remove: string;
  add: string;
  backToEdit: string;
  copyAsText: string;
  present: (n: number, h: string) => string;
  copiedFrom: (d: string) => string;
  noPrevWeek: string;
  duplicated: string;
  textCopied: string;
  clipboardDenied: string;
  waTitle: (d: string, date: string) => string;
  waTotal: string;
  language: string;
  noEmployees: string;
  readOnly: string;
}

export const PLANNER_STRINGS: Record<PlannerLang, PlannerStrings> = {
  he: {
    locale: 'he-IL',
    rtl: true,
    days: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
    daysShort: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'],
    weekOf: (a, b) => `שבוע ${a} – ${b}`,
    planned: 'שעות מתוכננות',
    people: 'עובדים',
    vsPrevWeek: 'לעומת שבוע שעבר',
    noCompare: 'אין נתונים להשוואה',
    thisWeek: 'השבוע',
    prevWeek: 'שבוע קודם',
    nextWeek: 'שבוע הבא',
    planning: 'סידור עבודה',
    history: 'היסטוריה',
    shareView: 'תצוגה לשיתוף',
    empty: 'ריק',
    brush: 'תפקיד לשיבוץ',
    erase: 'מחיקה',
    copyYesterday: 'העתקה מהיום הקודם',
    dupPrevWeek: 'שכפול השבוע הקודם',
    clearDay: 'ניקוי היום',
    editStructure: 'עריכת משבצות שעה',
    doneEditing: 'סיום עריכה',
    manageRoles: 'תפקידים',
    dayTotal: 'סה"כ ליום',
    weekTotal: 'סה"כ לשבוע',
    fillCol: 'לחיצה משבצת את התפקיד לכל היום',
    addSlot: 'הוספת משבצת שעה',
    insertSlot: 'הוספת משבצת מתחת',
    removeSlot: 'מחיקת המשבצת',
    editHint: 'אפשר לערוך שעות ישירות בטבלה. + מוסיף משבצת, × מוחק.',
    recap: 'סיכום שבועי',
    person: 'עובד',
    week: 'שבוע',
    lastWeek: 'שבוע קודם',
    gap: 'הפרש',
    needs: 'צרכי כוח אדם',
    upTo: (n) => `עד ${n} במקביל`,
    notePlaceholder: 'מה קרה השבוע: עומס, מבצע, חג, תגבור שהיה חסר…',
    hoursPerWeek: 'שעות לפי שבוע',
    weeksSaved: (n) => `${n} שבועות שמורים`,
    perMonth: 'לפי חודש',
    month: 'חודש',
    weeks: 'שבועות',
    total: 'סה"כ',
    gapPrevMonth: 'הפרש מהחודש הקודם',
    peak: 'שיא',
    pastNotes: 'הערות משבועות קודמים',
    weekOfShort: (d) => `שבוע של ${d}`,
    openWeek: (d) => `פתיחת השבוע של ${d}`,
    noHistory: 'אין עדיין מה להשוות. שבצו שבוע ראשון והוא יופיע כאן.',
    noNotes: 'אין עדיין הערות. הוסיפו אחת ב״צרכי כוח אדם״.',
    rolesTitle: 'תפקידים',
    roleName: 'שם התפקיד',
    remove: 'הסרה',
    add: 'הוספה',
    backToEdit: 'חזרה לעריכה',
    copyAsText: 'העתקה כטקסט',
    present: (n, h) => `נוכחים: ${n} עובדים · ${h} סך הכול ביום`,
    copiedFrom: (d) => `היום הועתק מיום ${d}`,
    noPrevWeek: 'אין נתונים לשבוע הקודם',
    duplicated: 'השבוע הקודם שוכפל',
    textCopied: 'הטקסט הועתק, הדביקו בוואטסאפ',
    clipboardDenied: 'הדפדפן חסם את ההעתקה',
    waTitle: (d, date) => `*סידור עבודה ${d} ${date}*`,
    waTotal: 'סה"כ צוות',
    language: 'שפה',
    noEmployees: 'אין עובדים להצגה בסידור',
    readOnly: 'צפייה בלבד',
  },
  en: {
    locale: 'en-GB',
    rtl: false,
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    weekOf: (a, b) => `Week of ${a} – ${b}`,
    planned: 'scheduled',
    people: 'people',
    vsPrevWeek: 'vs last week',
    noCompare: 'no comparison available',
    thisWeek: 'This week',
    prevWeek: 'Previous week',
    nextWeek: 'Next week',
    planning: 'Schedule',
    history: 'History',
    shareView: 'Share view',
    empty: 'empty',
    brush: 'Role to apply',
    erase: 'Erase',
    copyYesterday: 'Copy previous day',
    dupPrevWeek: 'Duplicate last week',
    clearDay: 'Clear day',
    editStructure: 'Edit time slots',
    doneEditing: 'Done editing',
    manageRoles: 'Roles',
    dayTotal: 'Day total',
    weekTotal: 'Week total',
    fillCol: 'Click to apply the role to the whole day',
    addSlot: 'Add a time slot',
    insertSlot: 'Insert a slot below',
    removeSlot: 'Remove this slot',
    editHint: 'Edit times straight in the table. + adds a slot, × removes one.',
    recap: 'Week summary',
    person: 'Person',
    week: 'Week',
    lastWeek: 'Last week',
    gap: 'Change',
    needs: 'Staffing this week',
    upTo: (n) => `up to ${n} at the same time`,
    notePlaceholder: 'Footfall, promotion, holiday, extra cover needed…',
    hoursPerWeek: 'Hours per week',
    weeksSaved: (n) => `${n} week(s) saved`,
    perMonth: 'By month',
    month: 'Month',
    weeks: 'Weeks',
    total: 'Total',
    gapPrevMonth: 'Change vs previous month',
    peak: 'peak',
    pastNotes: 'Notes from past weeks',
    weekOfShort: (d) => `Week of ${d}`,
    openWeek: (d) => `Open the week of ${d}`,
    noHistory: 'Nothing to compare yet. Schedule a first week and it will show up here.',
    noNotes: 'No notes yet. Add one under “Staffing this week”.',
    rolesTitle: 'Roles',
    roleName: 'Role name',
    remove: 'Remove',
    add: 'Add',
    backToEdit: 'Back to editing',
    copyAsText: 'Copy as text',
    present: (n, h) => `On shift: ${n} people · ${h} across the day`,
    copiedFrom: (d) => `Day copied from ${d}`,
    noPrevWeek: 'No data for last week',
    duplicated: 'Last week duplicated',
    textCopied: 'Text copied, paste it into WhatsApp',
    clipboardDenied: 'The browser blocked the copy',
    waTitle: (d, date) => `*Schedule ${d} ${date}*`,
    waTotal: 'Team total',
    language: 'Language',
    noEmployees: 'No employees to show in the schedule',
    readOnly: 'View only',
  },
  fr: {
    locale: 'fr-FR',
    rtl: false,
    days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    daysShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    weekOf: (a, b) => `Semaine du ${a} au ${b}`,
    planned: 'planifiées',
    people: 'personnes',
    vsPrevWeek: 'vs semaine précédente',
    noCompare: 'pas de comparaison disponible',
    thisWeek: 'Cette semaine',
    prevWeek: 'Semaine précédente',
    nextWeek: 'Semaine suivante',
    planning: 'Planning',
    history: 'Historique',
    shareView: 'Vue à partager',
    empty: 'vide',
    brush: 'Poste à appliquer',
    erase: 'Effacer',
    copyYesterday: 'Copier la veille',
    dupPrevWeek: 'Dupliquer la semaine précédente',
    clearDay: 'Vider la journée',
    editStructure: 'Modifier les créneaux',
    doneEditing: 'Terminer les modifications',
    manageRoles: 'Postes',
    dayTotal: 'Total du jour',
    weekTotal: 'Total de la semaine',
    fillCol: 'Cliquer pour appliquer le poste à toute la journée',
    addSlot: 'Ajouter un créneau',
    insertSlot: 'Insérer un créneau en dessous',
    removeSlot: 'Supprimer ce créneau',
    editHint: 'Modifiez les heures directement dans le tableau. + ajoute un créneau, × supprime.',
    recap: 'Récapitulatif de la semaine',
    person: 'Personne',
    week: 'Semaine',
    lastWeek: 'S-1',
    gap: 'Écart',
    needs: 'Besoins de la semaine',
    upTo: (n) => `jusqu'à ${n} en même temps`,
    notePlaceholder: 'Affluence, promo, jour férié, renfort nécessaire…',
    hoursPerWeek: 'Heures par semaine',
    weeksSaved: (n) => `${n} semaine(s) enregistrée(s)`,
    perMonth: 'Par mois',
    month: 'Mois',
    weeks: 'Semaines',
    total: 'Total',
    gapPrevMonth: 'Écart mois précédent',
    peak: 'pic',
    pastNotes: 'Notes des semaines passées',
    weekOfShort: (d) => `Semaine du ${d}`,
    openWeek: (d) => `Ouvrir la semaine du ${d}`,
    noHistory: "Rien à comparer pour l'instant. Planifiez une première semaine.",
    noNotes: "Aucune note pour l'instant. Ajoutez-en une dans « Besoins de la semaine ».",
    rolesTitle: 'Postes',
    roleName: 'Nom du poste',
    remove: 'Retirer',
    add: 'Ajouter',
    backToEdit: "Retour à l'édition",
    copyAsText: 'Copier en texte',
    present: (n, h) => `Équipe présente : ${n} personnes · ${h} sur la journée`,
    copiedFrom: (d) => `Journée copiée depuis ${d}`,
    noPrevWeek: 'Aucune donnée la semaine précédente',
    duplicated: 'Semaine précédente dupliquée',
    textCopied: 'Texte copié, collez-le dans WhatsApp',
    clipboardDenied: 'Copie refusée par le navigateur',
    waTitle: (d, date) => `*Planning ${d} ${date}*`,
    waTotal: 'Total équipe',
    language: 'Langue',
    noEmployees: 'Aucun employé à afficher',
    readOnly: 'Lecture seule',
  },
};

export const PLANNER_LANG_BUTTONS: { id: PlannerLang; label: string }[] = [
  { id: 'he', label: 'עב' },
  { id: 'en', label: 'EN' },
  { id: 'fr', label: 'FR' },
];
