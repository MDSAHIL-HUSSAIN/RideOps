import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import type { KnownIssue } from "../../domain/workspace";
import { createKnownIssue } from "../../services/rideops-api";
import { FormField } from "../../components/ui/form";

export function KnowledgeBaseView({
  issues,
  onCreate,
}: {
  issues: KnownIssue[];
  onCreate: () => void;
}) {
  return (
    <section className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="eyebrow">Reusable operational knowledge</p>
          <h2 className="text-xl font-bold">
            Known issues and verified workarounds
          </h2>
        </div>
        <button onClick={onCreate} className="btn-primary">
          <Plus size={16} />
          Create known issue
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
        {issues.map((issue) => (
          <article key={issue.id} className="panel p-5">
            <div className="flex justify-between">
              <span className="badge badge-blue">{issue.id}</span>
              <span className="badge badge-amber">{issue.status}</span>
            </div>
            <h3 className="mt-4 text-lg font-bold">{issue.title}</h3>
            <p className="mt-2 text-xs font-semibold text-blue-700">
              {issue.category}
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <p className="label">Symptoms</p>
              <p className="mt-1 text-sm leading-5">{issue.symptoms}</p>
            </div>
            <div className="mt-3 rounded-xl bg-emerald-50 p-3">
              <p className="label text-emerald-700">Verified workaround</p>
              <p className="mt-1 text-sm leading-5 text-emerald-900">
                {issue.workaround || "No workaround recorded"}
              </p>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Engineering:{" "}
              {issue.engineeringRef || issue.engineering_ref || "Not linked"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function KnownIssueModal({
  categories,
  onClose,
  onSaved,
}: {
  categories: string[];
  onClose: () => void;
  onSaved: (issue: KnownIssue) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    category: categories[0],
    status: "investigating",
    engineeringRef: "",
    symptoms: "",
    workaround: "",
  });
  const [isSaving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    try {
      const { item } = await createKnownIssue(form);
      onSaved(item);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6">
        <div className="section-head">
          <div>
            <p className="eyebrow">Engineering knowledge</p>
            <h2>Create a known issue</h2>
          </div>
          <button onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <FormField label="Title" wide>
            <input
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
          </FormField>
          <FormField label="Category">
            <select
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value })
              }
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Status">
            <select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
            >
              <option>investigating</option>
              <option>identified</option>
              <option>monitoring</option>
              <option>resolved</option>
            </select>
          </FormField>
          <FormField label="Engineering reference">
            <input
              value={form.engineeringRef}
              onChange={(event) =>
                setForm({ ...form, engineeringRef: event.target.value })
              }
            />
          </FormField>
          <FormField label="Symptoms" wide>
            <textarea
              rows={3}
              value={form.symptoms}
              onChange={(event) =>
                setForm({ ...form, symptoms: event.target.value })
              }
            />
          </FormField>
          <FormField label="Verified workaround" wide>
            <textarea
              rows={3}
              value={form.workaround}
              onChange={(event) =>
                setForm({ ...form, workaround: event.target.value })
              }
            />
          </FormField>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => void submit()}
            disabled={
              isSaving || form.title.length < 4 || form.symptoms.length < 3
            }
          >
            {isSaving ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Plus size={16} />
            )}
            Create issue
          </button>
        </div>
      </div>
    </div>
  );
}
