"use client";

import { useState, useTransition } from "react";
import { Plus, Check, Trash2, Calendar, BookOpen } from "lucide-react";
import { createHomework, markHomeworkDone, deleteHomework } from "@/app/actions/homework";
import type { Class } from "@prisma/client";

type HomeworkWithClasses = {
  id: string;
  title: string;
  subject: string;
  dueDate: Date;
  isSubmitted: boolean;
  classes: { id: string; name: string; level: string }[];
};

const SUBJECTS = [
  "Mathematics","English Language","Physics","Chemistry","Biology",
  "Agricultural Science","Economics","Government","Literature in English",
  "Geography","History","Civic Education","Christian Religious Studies",
  "Islamic Studies","Further Mathematics","Technical Drawing",
  "Food and Nutrition","Computer Studies","French",
];

function isOverdue(dueDate: Date): boolean {
  return new Date(dueDate) < new Date() && !false;
}

function formatDueDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 7) return `Due in ${days}d`;
  return `Due ${d.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}`;
}

export function HomeworkClient({
  homework,
  classes,
}: {
  homework: HomeworkWithClasses[];
  classes: Class[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    subject: "",
    dueDate: "",
    classIds: [] as string[],
  });

  function toggleClass(id: string) {
    setForm((f) => ({
      ...f,
      classIds: f.classIds.includes(id)
        ? f.classIds.filter((c) => c !== id)
        : [...f.classIds, id],
    }));
  }

  function handleCreate() {
    if (!form.title || !form.subject || !form.dueDate || form.classIds.length === 0) return;
    startTransition(async () => {
      await createHomework({
        title: form.title,
        subject: form.subject,
        dueDate: new Date(form.dueDate),
        classIds: form.classIds,
      });
      setForm({ title: "", subject: "", dueDate: "", classIds: [] });
      setShowForm(false);
    });
  }

  const pending = homework.filter((h) => !h.isSubmitted);
  const done = homework.filter((h) => h.isSubmitted);

  return (
    <div className="space-y-4">
      {/* Add button */}
      <button
        onClick={() => setShowForm((v) => !v)}
        className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
      >
        <Plus size={15} />
        {showForm ? "Cancel" : "Assign Homework"}
      </button>

      {/* Create form */}
      {showForm && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-text">New Homework</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-2 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Practice exercises on quadratic equations"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1">Subject *</label>
              <select
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
              >
                <option value="">Select...</option>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1">Due Date *</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-2 mb-2">Assign to Classes *</label>
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleClass(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.classIds.includes(c.id)
                      ? "bg-primary text-white border-primary"
                      : "bg-bg text-text-2 border-border hover:border-primary/40"
                  }`}
                >
                  {c.name || c.level}
                </button>
              ))}
            </div>
            {classes.length === 0 && (
              <p className="text-xs text-muted">No classes found. Create a class first.</p>
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={isPending || !form.title || !form.subject || !form.dueDate || form.classIds.length === 0}
            className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Assign Homework"}
          </button>
        </div>
      )}

      {/* Pending homework */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-2">
            Pending ({pending.length})
          </h3>
          {pending.map((hw) => (
            <HomeworkRow
              key={hw.id}
              homework={hw}
              onDone={() => startTransition(() => markHomeworkDone(hw.id))}
              onDelete={() => startTransition(() => deleteHomework(hw.id))}
            />
          ))}
        </div>
      )}

      {/* Done homework */}
      {done.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-2">
            Completed ({done.length})
          </h3>
          {done.map((hw) => (
            <HomeworkRow
              key={hw.id}
              homework={hw}
              onDone={() => {}}
              onDelete={() => startTransition(() => deleteHomework(hw.id))}
            />
          ))}
        </div>
      )}

      {homework.length === 0 && !showForm && (
        <div className="bg-surface border border-border rounded-xl p-10 text-center">
          <BookOpen size={32} className="text-muted mx-auto mb-3" />
          <p className="text-sm text-text-2">No homework assigned yet.</p>
        </div>
      )}
    </div>
  );
}

function HomeworkRow({
  homework,
  onDone,
  onDelete,
}: {
  homework: HomeworkWithClasses;
  onDone: () => void;
  onDelete: () => void;
}) {
  const overdue = !homework.isSubmitted && new Date(homework.dueDate) < new Date();

  return (
    <div className={`bg-surface border rounded-xl px-4 py-3 flex items-center gap-3 ${
      homework.isSubmitted ? "opacity-60 border-border" : overdue ? "border-danger/30" : "border-border"
    }`}>
      <button
        onClick={onDone}
        disabled={homework.isSubmitted}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          homework.isSubmitted
            ? "bg-success border-success"
            : "border-border hover:border-success"
        }`}
      >
        {homework.isSubmitted && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${homework.isSubmitted ? "line-through text-muted" : "text-text"}`}>
          {homework.title}
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-text-2">{homework.subject}</span>
          {homework.classes.map((c) => (
            <span key={c.id} className="text-xs text-muted">{c.name || c.level}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`flex items-center gap-1 text-xs ${
          homework.isSubmitted ? "text-muted" : overdue ? "text-danger" : "text-text-2"
        }`}>
          <Calendar size={11} />
          {formatDueDate(homework.dueDate)}
        </span>
        <button
          onClick={onDelete}
          className="text-muted hover:text-danger transition-colors p-1"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}