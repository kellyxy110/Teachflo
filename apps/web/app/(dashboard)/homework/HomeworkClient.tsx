"use client";

import { useState, useTransition } from "react";
import { Plus, Check, Trash2, Calendar, BookOpen } from "lucide-react";
import { createHomework, closeHomework, deleteHomework } from "@/app/actions/homework";
import type { Class } from "@prisma/client";

type HomeworkWithClass = {
  id: string;
  title: string;
  subject: string;
  description: string;
  dueDate: Date | null;
  status: "ACTIVE" | "CLOSED" | "ARCHIVED";
  class: { id: string; name: string; level: string };
};

const SUBJECTS = [
  "Mathematics","English Language","Physics","Chemistry","Biology",
  "Agricultural Science","Economics","Government","Literature in English",
  "Geography","History","Civic Education","Christian Religious Studies",
  "Islamic Studies","Further Mathematics","Technical Drawing",
  "Food and Nutrition","Computer Studies","French",
];

function formatDueDate(date: Date | null): string {
  if (!date) return "No deadline";
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
  homework: HomeworkWithClass[];
  classes: Class[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    subject: "",
    description: "",
    dueDate: "",
    classId: "",
  });

  function handleCreate() {
    if (!form.title || !form.subject || !form.classId) return;
    startTransition(async () => {
      await createHomework({
        title: form.title,
        subject: form.subject,
        description: form.description,
        dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
        classId: form.classId,
      });
      setForm({ title: "", subject: "", description: "", dueDate: "", classId: "" });
      setShowForm(false);
    });
  }

  const active = homework.filter((h) => h.status === "ACTIVE");
  const closed = homework.filter((h) => h.status !== "ACTIVE");

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowForm((v) => !v)}
        className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
      >
        <Plus size={15} />
        {showForm ? "Cancel" : "Assign Homework"}
      </button>

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
                placeholder="e.g. Practice questions on quadratic equations"
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
              <label className="block text-xs font-medium text-text-2 mb-1">Class *</label>
              <select
                value={form.classId}
                onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
              >
                <option value="">Select...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name || c.level}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-text-2 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Instructions or details for students..."
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface resize-none"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={isPending || !form.title || !form.subject || !form.classId}
            className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Assign Homework"}
          </button>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-2">Active ({active.length})</h3>
          {active.map((hw) => (
            <HomeworkRow
              key={hw.id}
              homework={hw}
              onClose={() => startTransition(() => closeHomework(hw.id))}
              onDelete={() => startTransition(() => deleteHomework(hw.id))}
            />
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-2">Closed ({closed.length})</h3>
          {closed.map((hw) => (
            <HomeworkRow
              key={hw.id}
              homework={hw}
              onClose={() => {}}
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
  onClose,
  onDelete,
}: {
  homework: HomeworkWithClass;
  onClose: () => void;
  onDelete: () => void;
}) {
  const isClosed = homework.status !== "ACTIVE";
  const overdue = !isClosed && homework.dueDate && new Date(homework.dueDate) < new Date();

  return (
    <div className={`bg-surface border rounded-xl px-4 py-3 flex items-start gap-3 ${
      isClosed ? "opacity-60 border-border" : overdue ? "border-danger/30" : "border-border"
    }`}>
      <button
        onClick={onClose}
        disabled={isClosed}
        title="Mark as closed"
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          isClosed ? "bg-success border-success" : "border-border hover:border-success"
        }`}
      >
        {isClosed && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${isClosed ? "line-through text-muted" : "text-text"}`}>
          {homework.title}
        </p>
        {homework.description && (
          <p className="text-xs text-text-2 mt-0.5 line-clamp-1">{homework.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-xs text-muted">{homework.subject}</span>
          <span className="text-xs text-muted">{homework.class.name || homework.class.level}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className={`flex items-center gap-1 text-xs ${
          isClosed ? "text-muted" : overdue ? "text-danger" : "text-text-2"
        }`}>
          <Calendar size={11} />
          {formatDueDate(homework.dueDate)}
        </span>
        <button onClick={onDelete} className="text-muted hover:text-danger transition-colors p-1">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
