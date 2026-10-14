import { openDB, IDBPDatabase } from 'idb';
import {
  Assignment,
  CalendarItem,
  Course,
  CURRENT_SCHEMA_VERSION,
  ExportFile,
  ExportFileSchema,
  FirstMoveRecord,
  LogbookRecord,
  QuizAnswerRecord,
  SessionRecord,
  Settings,
  SettingsSchema,
  StudyDay,
  VoyageRecord,
} from './schemas';

const DB_NAME = 'adhd1x';
let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, CURRENT_SCHEMA_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
        if (!db.objectStoreNames.contains('quizAnswers')) db.createObjectStore('quizAnswers', { keyPath: 'questionId' });
        if (!db.objectStoreNames.contains('courses')) db.createObjectStore('courses', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('assignments')) db.createObjectStore('assignments', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('firstMoves')) db.createObjectStore('firstMoves', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('studyDays')) db.createObjectStore('studyDays', { keyPath: 'date' });
        if (!db.objectStoreNames.contains('voyage')) db.createObjectStore('voyage');
        if (!db.objectStoreNames.contains('logbook')) db.createObjectStore('logbook', { keyPath: 'semesterKey' });
        if (!db.objectStoreNames.contains('deviceSecret')) db.createObjectStore('deviceSecret');
        if (!db.objectStoreNames.contains('calendarItems')) db.createObjectStore('calendarItems', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function getSettings(): Promise<Settings> {
  const db = await getDB();
  const raw = await db.get('settings', 'current');
  if (!raw) {
    const defaults = SettingsSchema.parse({});
    await db.put('settings', defaults, 'current');
    await db.put('meta', { schemaVersion: CURRENT_SCHEMA_VERSION, createdAt: new Date().toISOString() }, 'main');
    return defaults;
  }
  return SettingsSchema.parse(raw);
}

export async function saveSettings(next: Settings): Promise<Settings> {
  const validated = SettingsSchema.parse(next);
  const db = await getDB();
  await db.put('settings', validated, 'current');
  return validated;
}

export async function getQuizAnswers(): Promise<QuizAnswerRecord[]> {
  const db = await getDB();
  return db.getAll('quizAnswers');
}

export async function saveQuizAnswer(record: QuizAnswerRecord): Promise<void> {
  const db = await getDB();
  await db.put('quizAnswers', record);
}

export async function getCourses(): Promise<Course[]> {
  const db = await getDB();
  return db.getAll('courses');
}

export async function saveCourse(course: Course): Promise<void> {
  const db = await getDB();
  await db.put('courses', course);
}

export async function deleteCourse(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('courses', id);
}

export async function getAssignments(): Promise<Assignment[]> {
  const db = await getDB();
  return db.getAll('assignments');
}

export async function saveAssignment(assignment: Assignment): Promise<void> {
  const db = await getDB();
  await db.put('assignments', assignment);
}

export async function deleteAssignment(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('assignments', id);
}

export async function getStudyDay(date: string): Promise<StudyDay | undefined> {
  const db = await getDB();
  return db.get('studyDays', date);
}

export async function saveStudyDay(day: StudyDay): Promise<void> {
  const db = await getDB();
  await db.put('studyDays', day);
}

export async function getFirstMoves(): Promise<FirstMoveRecord[]> {
  const db = await getDB();
  return db.getAll('firstMoves');
}

export async function saveFirstMove(record: FirstMoveRecord): Promise<void> {
  const db = await getDB();
  await db.put('firstMoves', record);
}

export async function getSessions(): Promise<SessionRecord[]> {
  const db = await getDB();
  return db.getAll('sessions');
}

export async function saveSession(record: SessionRecord): Promise<void> {
  const db = await getDB();
  await db.put('sessions', record);
}

export async function getVoyage(): Promise<VoyageRecord | null> {
  const db = await getDB();
  return (await db.get('voyage', 'current')) ?? null;
}

export async function saveVoyage(record: VoyageRecord): Promise<void> {
  const db = await getDB();
  await db.put('voyage', record, 'current');
}

export async function getLogbook(): Promise<LogbookRecord[]> {
  const db = await getDB();
  return db.getAll('logbook');
}

export async function getCalendarItems(): Promise<CalendarItem[]> {
  const db = await getDB();
  return db.getAll('calendarItems');
}

export async function saveCalendarItems(items: CalendarItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('calendarItems', 'readwrite');
  for (const item of items) await tx.store.put(item);
  await tx.done;
}

export async function clearCalendarItems(): Promise<void> {
  const db = await getDB();
  await db.clear('calendarItems');
}

export async function getAccessCode(): Promise<string> {
  const db = await getDB();
  return (await db.get('deviceSecret', 'accessCode')) ?? '';
}

export async function saveAccessCode(code: string): Promise<void> {
  const db = await getDB();
  await db.put('deviceSecret', code, 'accessCode');
}

export async function exportAllData(): Promise<ExportFile> {
  const [settings, quizAnswers, courses, assignments, sessions, firstMoves, studyDays, voyage, logbook, calendarItems] =
    await Promise.all([
      getSettings(),
      getQuizAnswers(),
      getCourses(),
      getAssignments(),
      getSessions(),
      getFirstMoves(),
      (await getDB()).getAll('studyDays'),
      getVoyage(),
      getLogbook(),
      getCalendarItems(),
    ]);

  return {
    app: 'ADHD1X',
    exportSchemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      settings,
      quizAnswers,
      courses,
      assignments,
      sessions,
      firstMoves,
      studyDays,
      voyage,
      logbook,
      calendarItems,
    },
  };
}

export function validateImportFile(rawJson: unknown): {
  ok: true;
  parsed: ExportFile;
  summary: { courses: number; assignments: number };
} | {
  ok: false;
  error: string;
} {
  if (typeof rawJson === 'object' && rawJson !== null && 'exportSchemaVersion' in rawJson) {
    const ver = (rawJson as { exportSchemaVersion: unknown }).exportSchemaVersion;
    if (typeof ver === 'number' && ver > CURRENT_SCHEMA_VERSION) {
      return {
        ok: false,
        error: 'This file was made by a newer version of ADHD1X and cannot be imported here.',
      };
    }
  }
  const result = ExportFileSchema.safeParse(rawJson);
  if (!result.success) {
    return {
      ok: false,
      error: 'That file does not look like a valid ADHD1X export.',
    };
  }
  return {
    ok: true,
    parsed: result.data,
    summary: {
      courses: result.data.data.courses.length,
      assignments: result.data.data.assignments.length,
    },
  };
}

export async function importReplaceData(file: ExportFile): Promise<void> {
  const db = await getDB();
  const storesToClear = [
    'settings',
    'quizAnswers',
    'courses',
    'assignments',
    'sessions',
    'firstMoves',
    'studyDays',
    'voyage',
    'logbook',
    'calendarItems',
  ];
  for (const s of storesToClear) {
    await db.clear(s);
  }
  await db.put('settings', file.data.settings, 'current');
  for (const q of file.data.quizAnswers) await db.put('quizAnswers', q);
  for (const c of file.data.courses) await db.put('courses', c);
  for (const a of file.data.assignments) await db.put('assignments', a);
  for (const s of file.data.sessions) await db.put('sessions', s);
  for (const f of file.data.firstMoves) await db.put('firstMoves', f);
  for (const d of file.data.studyDays) await db.put('studyDays', d);
  if (file.data.voyage) await db.put('voyage', file.data.voyage, 'current');
  for (const l of file.data.logbook) await db.put('logbook', l);
  for (const c of file.data.calendarItems) await db.put('calendarItems', c);
}

export async function deleteAllData(): Promise<void> {
  const db = await getDB();
  for (const name of Array.from(db.objectStoreNames)) {
    await db.clear(name);
  }
  localStorage.clear();
}
