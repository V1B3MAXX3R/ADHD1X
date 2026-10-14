import type { z } from 'zod';
import {
  AiDayTunerOutputSchema,
  AskAssignmentOutputSchema,
  BrainDumpOutputSchema,
  CustomPaletteOutputSchema,
  FirstMoveOutputSchema,
  MajorProfileOutputSchema,
  MakeItClearOutputSchema,
  MicroUnstickOutputSchema,
  MilestonePlannerOutputSchema,
  PracticeQuizOutputSchema,
  PreFlightCheckOutputSchema,
  PresetName,
  ProfEmailOutputSchema,
  StudyStrategyOutputSchema,
  SyllabusOutputSchema,
  VibePersonalizerOutputSchema,
} from './presets';

export type PromptSpec =
  | { ok: true; contents: unknown; schema: z.ZodTypeAny }
  | { ok: false; status: number; reason: 'too_large' | 'unsupported_file' };

// Text from the person is put in as a quoted JSON string, so quotes inside it cannot break out of the prompt.
const q = (value: unknown, max: number): string => JSON.stringify(String(value ?? '').slice(0, max));

// Only these fields are ever kept from lists sent by the browser, whatever else is in them (A36).
function pickTasks(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).map((t) => {
    const x = (t ?? {}) as Record<string, unknown>;
    return {
      id: String(x.id ?? '').slice(0, 60),
      name: String(x.name ?? '').slice(0, 120),
      type: String(x.type ?? '').slice(0, 20),
      dueDate: String(x.dueDate ?? '').slice(0, 10),
      estimateMinutes: Number(x.estimateMinutes) || 0,
    };
  });
}

function pickCourses(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((c) => {
    const x = (c ?? {}) as Record<string, unknown>;
    return { name: String(x.name ?? '').slice(0, 120), isMajor: Boolean(x.isMajor) };
  });
}

const FILE_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];
const MAX_FILE_BYTES = 4 * 1024 * 1024;

// Never put grades, scores or personal notes in a prompt (A36). Only the fields named here are used.
export function buildPromptSpec(preset: PresetName, body: Record<string, unknown>): PromptSpec {
  switch (preset) {
    case 'syllabus': {
      const { courseName, today, text, fileBase64, mimeType } = body as Record<string, string | undefined>;
      if (fileBase64 && Buffer.byteLength(fileBase64, 'base64') > MAX_FILE_BYTES) {
        return { ok: false, status: 413, reason: 'too_large' };
      }
      if (mimeType && !FILE_TYPES.includes(mimeType)) {
        return { ok: false, status: 415, reason: 'unsupported_file' };
      }
      const prompt = `Extract assignments for course ${q(courseName ?? 'Course', 120)}. Today is ${q(today ?? '', 10)}. Return JSON: { "assignments": [{ "name", "type" ("discussion"|"reading"|"homework"|"quiz"|"lab"|"essay"|"exam"|"project"|"other"), "dueDate" ("YYYY-MM-DD", optional), "points" (optional), "percentOfGrade" (optional) }], "courseEndDate" (optional), "warnings": [] }. Never guess missing dates.`;
      const contents = fileBase64
        ? [{ inlineData: { data: fileBase64, mimeType: mimeType || 'application/pdf' } }, prompt]
        : `${prompt}\n\nSyllabus text:\n${String(text ?? '').slice(0, 100_000)}`;
      return { ok: true, contents, schema: SyllabusOutputSchema };
    }

    case 'firstMove': {
      const { title, courseName, taskType, major, sizeChoice, detailsText } = body;
      const stepCount = sizeChoice === 'bite' ? '3 to 5' : sizeChoice === 'half' ? '2' : '2 to 4';
      return {
        ok: true,
        schema: FirstMoveOutputSchema,
        contents: `Assignment: ${q(title, 120)} (${q(taskType, 20)}) for course ${q(courseName, 120)}. Student major: ${q(major || 'general', 120)}. Breakdown size: ${q(sizeChoice, 10)}. Details: ${q(detailsText, 8000)}. Return JSON: { "firstMove": "one concrete action taking about 2 minutes (max 160 chars)", "steps": [${stepCount} short follow-up steps (max 120 chars each)] }.`,
      };
    }

    case 'makeItClear':
      return {
        ok: true,
        schema: MakeItClearOutputSchema,
        contents: `Rewrite these assignment instructions as an explicit checklist. Only restate what is in the text; never invent requirements. Return JSON: { "checklist": [{ "kind": "handIn"|"format"|"length"|"dueDate"|"grading"|"other", "text": "short clear requirement (max 200 chars)" }] }.\n\nInstructions:\n${String(body.detailsText ?? '').slice(0, 15_000)}`,
      };

    case 'profEmail': {
      const { assignmentName, courseName, requestKind, userNote, tone } = body;
      return {
        ok: true,
        schema: ProfEmailOutputSchema,
        contents: `Draft a polite student email to a professor for course ${q(courseName, 120)} about the assignment ${q(assignmentName, 120)}. Request kind: ${q(requestKind, 20)}. Tone: ${q(tone, 10)} (neutral, formal or friendly). Student note: ${q(userNote, 300)}. Use [Professor Name] and [Your Name] as placeholders. Return JSON: { "subject": "short subject line", "body": "polite email body (max 1200 chars)" }.`,
      };
    }

    case 'brainDump':
      return {
        ok: true,
        schema: BrainDumpOutputSchema,
        contents: `Sort this student brain dump into separate school tasks. Known courses: ${JSON.stringify(Array.isArray(body.knownCourses) ? body.knownCourses.slice(0, 20).map((c) => String(c).slice(0, 120)) : [])}. Return JSON: { "items": [{ "title": "task title", "guessedCourse": "matching course name (optional)", "guessedType": "discussion"|"reading"|"homework"|"quiz"|"lab"|"essay"|"exam"|"project"|"other" }] }.\n\nBrain dump:\n${String(body.dumpText ?? '').slice(0, 2000)}`,
      };

    case 'askAssignment': {
      const { assignmentName, detailsText, question } = body;
      return {
        ok: true,
        schema: AskAssignmentOutputSchema,
        contents: `Answer the student's question about ${q(assignmentName, 120)} using ONLY the assignment instructions below. If the instructions do not state the answer, set "foundInInstructions" to false and say plainly that the instructions do not mention it. Return JSON: { "answer": "plain answer (max 500 chars)", "foundInInstructions": true|false }.\n\nInstructions:\n${String(detailsText ?? '').slice(0, 10_000)}\n\nQuestion: ${q(question, 400)}`,
      };
    }

    case 'majorProfile':
      return {
        ok: true,
        schema: MajorProfileOutputSchema,
        contents: `Personalize a school planner for a college student majoring in ${q(body.major, 120)}. Return JSON: { "summary": "1-2 plain sentences on how the workspace is tuned for this major", "recommendedSettings": { "majorWeighting": true, "spacingEarly": true, "heavyBlock": "Morning"|"Evening" }, "starterMoves": [{ "taskType": "lab"|"essay"|"quiz"|"project"|"reading", "firstMove": "2-minute starter tailored to this major", "steps": ["step 1", "step 2", "step 3"] }], "savedRoutines": [{ "id": "r-1", "title": "routine name for this major", "taskType": "lab"|"quiz"|"project"|"homework", "steps": ["step 1", "step 2", "step 3"] }] }.`,
      };

    case 'vibePersonalizer':
      return {
        ok: true,
        schema: VibePersonalizerOutputSchema,
        contents: `Map this student's description of how they work to planner settings. They wrote: ${q(body.userPrompt, 600)}. Only include settings the description clearly asks for. Return JSON: { "explanation": "plain summary of the settings chosen", "settingsPatch": { "interfaceStyle": "space"|"regular", "theme": "low"|"normal", "dim": boolean, "motion": boolean, "todayView": "list"|"card", "timerDisplay": "number"|"bar"|"hidden", "tone": "warm"|"short", "starterMinutes": number, "fewerOnScreen": boolean } }.`,
      };

    case 'customPalette':
      return {
        ok: true,
        schema: CustomPaletteOutputSchema,
        contents: `Create a calm, high-contrast color palette for the idea ${q(body.vibePrompt, 300)}. Use 6-digit hex codes. Text on bg and surface needs at least 7:1 contrast. Return JSON: { "name": "Palette Name", "bg": "#HEX", "surface": "#HEX", "text": "#HEX", "muted": "#HEX", "accent": "#HEX", "onAccent": "#HEX", "focus": "#HEX", "dueSoon": "#HEX", "border": "#HEX" }.`,
      };

    case 'aiDayTuner':
      return {
        ok: true,
        schema: AiDayTunerOutputSchema,
        contents: `The student describes today: ${q(body.userContext, 500)}. Active tasks: ${JSON.stringify(pickTasks(body.tasks))}. Propose a realistic study plan for today. Only use task ids from the list. Return JSON: { "summary": "kind, plain explanation of today's plan", "recommendedBlocks": ["Morning"|"Evening"|"Night"], "orderedTaskIds": ["task-id-1", "task-id-2"], "recommendedStarterMinutes": 2|5|10|15 }.`,
      };

    case 'studyStrategy':
      return {
        ok: true,
        schema: StudyStrategyOutputSchema,
        contents: `Create a weekly study split across courses for a student majoring in ${q(body.major || 'general', 120)} with these courses: ${JSON.stringify(pickCourses(body.courses))} (${Number(body.upcomingCount) || 0} active tasks). Return JSON: { "strategyName": "short name", "summary": "plain explanation of how to batch small tasks and prioritize major work", "allocations": [{ "courseName": "name", "percentOfStudyTime": 40, "focusTip": "short concrete tip" }], "recommendedPrefs": { "majorWeighting": true, "spacingEarly": true } }.`,
      };

    case 'milestonePlanner': {
      const { assignmentName, dueDate, today, detailsText, estimateMinutes } = body;
      return {
        ok: true,
        schema: MilestonePlannerOutputSchema,
        contents: `Break the big assignment ${q(assignmentName, 120)} (about ${Number(estimateMinutes) || 180} minutes in total, due ${q(dueDate, 10)}, today is ${q(today, 10)}) into 3 to 5 dated mini-milestones between today and the due date. Details: ${q(detailsText, 4000)}. Return JSON: { "milestones": [{ "title": "milestone title", "dueDate": "YYYY-MM-DD", "estimateMinutes": 45 }] }.`,
      };
    }

    case 'microUnstick': {
      const { assignmentName, stuckStep, major } = body;
      return {
        ok: true,
        schema: MicroUnstickOutputSchema,
        contents: `The student is stuck on this single step: ${q(stuckStep, 300)} for the assignment ${q(assignmentName, 120)} (major: ${q(major || 'general', 120)}). Break ONLY this step into 3 tiny actions of about a minute each. Return JSON: { "microSteps": ["tiny action 1", "tiny action 2", "tiny action 3"] }.`,
      };
    }

    case 'preFlightCheck': {
      const { assignmentName, detailsText } = body;
      return {
        ok: true,
        schema: PreFlightCheckOutputSchema,
        contents: `Write a 3-question self-check to do before submitting, based ONLY on the instructions for ${q(assignmentName, 120)}: ${q(detailsText, 6000)}. Return JSON: { "questions": ["Did you ...?", "Is ...?", "Did you include ...?"] }.`,
      };
    }

    case 'practiceQuiz': {
      const { assignmentName, courseName, detailsText } = body;
      return {
        ok: true,
        schema: PracticeQuizOutputSchema,
        contents: `Write 3 warm-up practice questions for ${q(assignmentName, 120)} in the course ${q(courseName, 120)}, based on these topics or notes: ${q(detailsText, 6000)}. Return JSON: { "questions": [{ "question": "question text", "hint": "short helpful hint", "answer": "clear concise answer" }] }.`,
      };
    }
  }
}
