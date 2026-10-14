import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../../components/AppShell';
import { useApp, getTodayDateString } from '../../app/AppContext';
import { AssignmentType, AssignmentTypeSchema } from '../../data/schemas';
import { getDefaultEstimate } from '../../logic/estimates';
import { callSyllabusPreset, getCalmErrorMessage, AiFailureReason } from '../../ai/client';

interface DraftSyllabusRow {
  tempId: string;
  name: string;
  type: AssignmentType;
  dueDate: string;
  points: string;
  percentOfGrade: string;
}

export const CourseSetupPage: React.FC = () => {
  const { upsertCourse, upsertAssignment, requestGeminiWithNotice } = useApp();
  const navigate = useNavigate();

  const [courseName, setCourseName] = useState('');
  const [isMajor, setIsMajor] = useState(false);
  const [courseError, setCourseError] = useState('');

  const [mode, setMode] = useState<'choose' | 'manual' | 'upload' | 'review'>('choose');
  const [pastedText, setPastedText] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [draftRows, setDraftRows] = useState<DraftSyllabusRow[]>([]);

  const [aName, setAName] = useState('');
  const [aType, setAType] = useState<AssignmentType>('homework');
  const [aDueDate, setADueDate] = useState(getTodayDateString());
  const [aEstimate, setAEstimate] = useState<number>(getDefaultEstimate('homework'));
  const [estimateTouched, setEstimateTouched] = useState(false);
  const [aPoints, setAPoints] = useState('');
  const [aPercent, setAPercent] = useState('');
  const [aDetails, setADetails] = useState('');

  const ensureCourseName = (): boolean => {
    if (!courseName.trim()) {
      setCourseError('Please enter a course name first.');
      return false;
    }
    setCourseError('');
    return true;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ensureCourseName()) return;

    if (file.size > 4 * 1024 * 1024) {
      setAiError(getCalmErrorMessage('too_large'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result ?? '').split(',')[1] ?? '';
      requestGeminiWithNotice(async () => {
        setLoadingAi(true);
        setAiError('');
        const res = await callSyllabusPreset({
          courseName: courseName.trim(),
          today: getTodayDateString(),
          fileBase64: base64,
          mimeType: file.type || 'application/pdf',
        });
        setLoadingAi(false);
        if (!res.ok) {
          setAiError(getCalmErrorMessage(res.reason as AiFailureReason));
          return;
        }
        const items = res.data.assignments ?? [];
        setWarnings(res.data.warnings ?? []);
        if (items.length === 0) {
          setAiError('Gemini found no assignments in that file. You can add them by hand below.');
          return;
        }
        setDraftRows(
          items.map((item: Record<string, unknown>, idx: number) => ({
            tempId: `row-${idx}`,
            name: String(item.name ?? ''),
            type: (item.type as AssignmentType) ?? 'other',
            dueDate: String(item.dueDate ?? ''),
            points: item.points !== undefined ? String(item.points) : '',
            percentOfGrade: item.percentOfGrade !== undefined ? String(item.percentOfGrade) : '',
          })),
        );
        setMode('review');
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePasteExtract = () => {
    if (!ensureCourseName()) return;
    if (!pastedText.trim()) {
      setAiError('Please paste syllabus text first.');
      return;
    }
    requestGeminiWithNotice(async () => {
      setLoadingAi(true);
      setAiError('');
      const res = await callSyllabusPreset({
        courseName: courseName.trim(),
        today: getTodayDateString(),
        text: pastedText,
      });
      setLoadingAi(false);
      if (!res.ok) {
        setAiError(getCalmErrorMessage(res.reason as AiFailureReason));
        return;
      }
      const items = res.data.assignments ?? [];
      setWarnings(res.data.warnings ?? []);
      if (items.length === 0) {
        setAiError('Gemini found no assignments in that text. You can add them by hand.');
        return;
      }
      setDraftRows(
        items.map((item: Record<string, unknown>, idx: number) => ({
          tempId: `row-${idx}`,
          name: String(item.name ?? ''),
          type: (item.type as AssignmentType) ?? 'other',
          dueDate: String(item.dueDate ?? ''),
          points: item.points !== undefined ? String(item.points) : '',
          percentOfGrade: item.percentOfGrade !== undefined ? String(item.percentOfGrade) : '',
        })),
      );
      setMode('review');
    });
  };

  const handleSaveReviewedRows = async () => {
    if (!ensureCourseName()) return;
    const courseId = crypto.randomUUID();
    await upsertCourse({
      id: courseId,
      name: courseName.trim(),
      isMajor,
      createdAt: new Date().toISOString(),
    });
    for (const r of draftRows) {
      if (!r.name.trim()) continue;
      await upsertAssignment({
        id: crypto.randomUUID(),
        courseId,
        name: r.name.trim(),
        type: r.type,
        dueDate: r.dueDate || getTodayDateString(),
        points: r.points ? Number(r.points) : undefined,
        percentOfGrade: r.percentOfGrade ? Number(r.percentOfGrade) : undefined,
        estimateMinutes: getDefaultEstimate(r.type),
        estimateSource: 'default',
        minutesLogged: 0,
        status: 'todo',
        notNow: false,
        addedLate: false,
        source: 'syllabus',
        createdAt: new Date().toISOString(),
      });
    }
    navigate('/today');
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureCourseName() || !aName.trim()) return;
    const courseId = crypto.randomUUID();
    await upsertCourse({
      id: courseId,
      name: courseName.trim(),
      isMajor,
      createdAt: new Date().toISOString(),
    });
    await upsertAssignment({
      id: crypto.randomUUID(),
      courseId,
      name: aName.trim(),
      type: aType,
      dueDate: aDueDate,
      points: aPoints ? Number(aPoints) : undefined,
      percentOfGrade: aPercent ? Number(aPercent) : undefined,
      detailsText: aDetails.trim() || undefined,
      estimateMinutes: aEstimate,
      estimateSource: estimateTouched ? 'user' : 'default',
      minutesLogged: 0,
      status: 'todo',
      notNow: false,
      addedLate: false,
      source: 'manual',
      createdAt: new Date().toISOString(),
    });
    navigate('/today');
  };

  return (
    <AppShell title="Add a course">
      <div className="space-y-6 bg-surface p-6 rounded border border-border">
        <div>
          <label htmlFor="course-name" className="block font-medium mb-1">
            Course name
          </label>
          <input
            id="course-name"
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            aria-describedby={courseError ? 'course-name-err' : undefined}
            className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
          />
          {courseError && (
            <p id="course-name-err" className="text-sm text-due-soon mt-1">
              {courseError}
            </p>
          )}
          <label className="flex items-center gap-2 mt-3 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              checked={isMajor}
              onChange={(e) => setIsMajor(e.target.checked)}
              className="w-5 h-5"
            />
            <span>This course is part of my major</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => ensureCourseName() && setMode('upload')}
            className="min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
          >
            Upload syllabus (Uses Gemini)
          </button>
          <button
            type="button"
            onClick={() => ensureCourseName() && setMode('manual')}
            className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text font-medium"
          >
            Add assignments by hand
          </button>
          <button
            type="button"
            onClick={() => navigate('/today')}
            className="min-h-[44px] px-4 py-2 underline text-muted"
          >
            Skip to Today
          </button>
        </div>

        {aiError && (
          <div role="status" className="p-3 rounded border border-border bg-bg text-sm">
            {aiError}
          </div>
        )}

        {mode === 'upload' && (
          <div className="space-y-4 border-t border-border pt-4">
            <p className="text-sm text-muted">
              Allowed types: PDF or plain text (.pdf, .txt, .md), up to 4 MB. Gemini reads the syllabus and discards the file. See Privacy for what is sent.
            </p>
            <div>
              <label htmlFor="syllabus-file" className="block font-medium mb-1">
                Choose syllabus file (Uses Gemini)
              </label>
              <input
                id="syllabus-file"
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain"
                onChange={handleFileSelect}
                className="block w-full text-sm"
              />
            </div>

            <div>
              <label htmlFor="syllabus-paste" className="block font-medium mb-1">
                Or paste syllabus text
              </label>
              <textarea
                id="syllabus-paste"
                rows={4}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full p-3 rounded border border-border bg-bg text-text"
              />
              <button
                type="button"
                onClick={handlePasteExtract}
                disabled={loadingAi}
                className="mt-2 min-h-[44px] px-4 py-2 rounded bg-accent text-on-accent font-medium"
              >
                {loadingAi ? 'Reading syllabus...' : 'Read pasted text (Uses Gemini)'}
              </button>
            </div>
          </div>
        )}

        {mode === 'review' && (
          <div className="space-y-4 border-t border-border pt-4">
            <h2 className="text-lg font-bold">
              Here&apos;s what we found. Check it before we save:
            </h2>
            {warnings.map((w, i) => (
              <p key={i} className="text-sm text-due-soon">
                Note: {w}
              </p>
            ))}
            <div className="space-y-3">
              {draftRows.map((row, idx) => (
                <div key={row.tempId} className="p-3 rounded border border-border bg-bg space-y-2">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <label className="text-sm font-medium">
                      Assignment {idx + 1} name
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => {
                          const copy = [...draftRows];
                          copy[idx].name = e.target.value;
                          setDraftRows(copy);
                        }}
                        className="block mt-1 px-2 py-1 rounded border border-border bg-surface text-text"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Due date {!row.dueDate && <span className="text-due-soon">(No due date found)</span>}
                      <input
                        type="date"
                        value={row.dueDate}
                        onChange={(e) => {
                          const copy = [...draftRows];
                          copy[idx].dueDate = e.target.value;
                          setDraftRows(copy);
                        }}
                        className="block mt-1 px-2 py-1 rounded border border-border bg-surface text-text"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setDraftRows(draftRows.filter((r) => r.tempId !== row.tempId))}
                      className="min-h-[44px] px-3 py-1 rounded border border-border text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => void handleSaveReviewedRows()}
                className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-medium"
              >
                Save these
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftRows([]);
                  setMode('choose');
                }}
                className="min-h-[44px] px-4 py-2 rounded border border-border bg-bg text-text"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {mode === 'manual' && (
          <form onSubmit={handleSaveManual} className="space-y-4 border-t border-border pt-4">
            <h2 className="text-lg font-bold">Add assignment by hand</h2>
            <div>
              <label htmlFor="assign-name" className="block font-medium mb-1">
                Assignment name
              </label>
              <input
                id="assign-name"
                type="text"
                required
                value={aName}
                onChange={(e) => setAName(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="assign-type" className="block font-medium mb-1">
                  Type
                </label>
                <select
                  id="assign-type"
                  value={aType}
                  onChange={(e) => {
                    const nextType = AssignmentTypeSchema.parse(e.target.value);
                    setAType(nextType);
                    if (!estimateTouched) setAEstimate(getDefaultEstimate(nextType));
                  }}
                  className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                >
                  {AssignmentTypeSchema.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="assign-due" className="block font-medium mb-1">
                  Due date
                </label>
                <input
                  id="assign-due"
                  type="date"
                  required
                  value={aDueDate}
                  onChange={(e) => setADueDate(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="assign-est" className="block font-medium mb-1">
                  Estimate (minutes, {estimateTouched ? 'yours' : 'default'})
                </label>
                <input
                  id="assign-est"
                  type="number"
                  min={5}
                  max={2400}
                  value={aEstimate}
                  onChange={(e) => {
                    setAEstimate(Number(e.target.value));
                    setEstimateTouched(true);
                  }}
                  className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                />
              </div>
              <div>
                <label htmlFor="assign-pts" className="block font-medium mb-1">
                  Points (optional)
                </label>
                <input
                  id="assign-pts"
                  type="number"
                  min={0}
                  max={1000}
                  value={aPoints}
                  onChange={(e) => setAPoints(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                />
              </div>
              <div>
                <label htmlFor="assign-pct" className="block font-medium mb-1">
                  % of grade (optional)
                </label>
                <input
                  id="assign-pct"
                  type="number"
                  min={0}
                  max={100}
                  value={aPercent}
                  onChange={(e) => setAPercent(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded border border-border bg-bg text-text"
                />
              </div>
            </div>

            <div>
              <label htmlFor="assign-details" className="block font-medium mb-1">
                Assignment details / instructions (optional)
              </label>
              <textarea
                id="assign-details"
                rows={3}
                value={aDetails}
                onChange={(e) => setADetails(e.target.value)}
                className="w-full p-3 rounded border border-border bg-bg text-text"
              />
            </div>

            <button
              type="submit"
              className="min-h-[44px] px-6 py-2 rounded bg-accent text-on-accent font-medium"
            >
              Save course &amp; assignment
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
};
