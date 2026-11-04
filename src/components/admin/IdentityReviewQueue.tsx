import { IdentityDocumentPreview } from "@/components/profile/IdentityDocumentPreview";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, RefreshCw, ShieldCheck, X } from "lucide-react";
import {
  identityRequest,
  viewIdentityDocument,
  type IdentityCase,
} from "@/lib/identityApi";
import {
  identityButton,
  identityInput,
} from "@/components/profile/AccountProfilePanel";

export function IdentityReviewQueue() {
  const [cases, setCases] = useState<IdentityCase[]>([]),
    [selected, setSelected] = useState<IdentityCase | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [note, setNote] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [preview, setPreview] = useState<string | null>(null);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setCases(
        (await identityRequest<{ cases: IdentityCase[] }>("queue")).cases,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const choose = (item: IdentityCase) => {
    setSelected(item);
    setNote("");
    setConfirmed(false);
    setMessage("");
    setError("");
    setPreview(null);
  };
  async function review(decision: "Verified" | "Rejected" | "reset") {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await identityRequest(decision === "reset" ? "reset" : "review", {
        userId: selected.user_id,
        revision: selected.revision,
        decision,
        note,
        confirmed,
      });
      setSelected(null);
      setPreview(null);
      setMessage(
        decision === "reset"
          ? "Verification reopened. The account must submit fresh documents."
          : "Review saved. The account status has been updated.",
      );
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-6 p-4 text-white sm:p-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            Private staff workspace
          </p>
          <h1 className="mt-2 text-2xl font-bold">Identity review</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Review the saved identity snapshot and each image before deciding.
            This is manual review, not automated authenticity or biometric
            verification.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={busy || loading}
          className={identityButton}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh queue
        </button>
      </header>
      <Link
        to="/admin/users"
        className="inline-block min-h-11 text-sm text-slate-400 underline"
      >
        Back to user management
      </Link>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-400/10 p-4 text-sm text-rose-200"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl bg-emerald-400/10 p-4 text-sm text-emerald-200"
        >
          {message}
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          {loading ? (
            <p role="status">Loading review queue…</p>
          ) : !cases.length ? (
            <p className="rounded-2xl border border-white/10 p-6 text-sm text-slate-400">
              No identity submissions to review.
            </p>
          ) : (
            cases.map((item) => (
              <button
                disabled={busy}
                onClick={() => choose(item)}
                key={item.user_id}
                className={`block w-full rounded-2xl border p-4 text-left transition ${selected?.user_id === item.user_id ? "border-emerald-400/50 bg-emerald-400/5" : "border-white/10 bg-[#17202d] hover:border-white/25"}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <strong className="truncate text-sm">
                    {item.username || item.user_id.slice(0, 8)}
                  </strong>
                  <span className="text-xs text-emerald-300">
                    {item.status}
                  </span>
                </span>
                <span className="mt-2 block text-xs text-slate-500">
                  Revision {item.revision} ·{" "}
                  {item.submitted_at
                    ? new Date(item.submitted_at).toLocaleDateString()
                    : "Legacy verification"}
                </span>
              </button>
            ))
          )}
          <p className="text-xs leading-5 text-slate-500">
            Latest 100 cases, with submissions awaiting review first. Refresh
            after another reviewer takes action.
          </p>
        </aside>
        {!selected ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-slate-400">
            <ShieldCheck className="mx-auto mb-4 h-8 w-8 text-emerald-300" />
            Select an account to inspect its submission.
          </div>
        ) : (
          <article className="min-w-0 space-y-5 rounded-2xl border border-white/10 bg-[#17202d] p-5 sm:p-7">
            <h2 className="text-lg font-bold">Submission details</h2>
            <p className="break-all text-xs text-slate-500">
              Account {selected.user_id} · Revision {selected.revision}
            </p>
            <dl className="grid gap-4 sm:grid-cols-2">
              {Object.entries({
                ...selected.identity?.details,
                documentType: selected.identity?.documentType,
                documentNumber: selected.identity?.documentNumber,
              }).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs text-slate-500">
                    {key.replace(/([A-Z])/g, " $1")}
                  </dt>
                  <dd className="mt-1 break-words text-sm text-slate-200">
                    {String(value || "Not supplied")}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-white/10 pt-5">
              <h3 className="font-semibold">Private document images</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {selected.documents?.length ? (
                  selected.documents.map((doc) => (
                    <button
                      key={doc.slot}
                      disabled={busy}
                      className={identityButton}
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        try {
                          setPreview(
                            await viewIdentityDocument(
                              doc.slot,
                              selected.user_id,
                            ),
                          );
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Inspect{" "}
                      {doc.slot === "front"
                        ? "front / photo page"
                        : "back side"}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-amber-200">
                    No private documents. Legacy verifications can be reopened
                    for fresh submission.
                  </p>
                )}
              </div>
            </div>
            {selected.review_note && (
              <p className="whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-sm text-slate-300">
                Previous reviewer: {selected.review_note}
              </p>
            )}
            <label className="block text-sm text-slate-300">
              Message to the account holder
              <textarea
                maxLength={1000}
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={busy}
                className={identityInput}
                placeholder="Give clear, actionable corrections. Required when requesting changes or reopening verification."
              />
            </label>
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
              <input
                type="checkbox"
                checked={confirmed}
                disabled={busy}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 accent-emerald-400"
              />
              I have reviewed the legal details and required document sides. My
              decision reflects that review.
            </label>
            {selected.status === "Submitted" ? (
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={busy || !confirmed}
                  onClick={() => void review("Verified")}
                  className={identityButton}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve identity
                </button>
                <button
                  disabled={busy || !confirmed || note.trim().length < 10}
                  onClick={() => void review("Rejected")}
                  className="min-h-11 rounded-xl border border-amber-400/30 px-5 text-sm font-semibold text-amber-200 disabled:opacity-40"
                >
                  Request changes
                </button>
              </div>
            ) : (
              <button
                disabled={busy || !confirmed || note.trim().length < 10}
                onClick={() => void review("reset")}
                className="min-h-11 rounded-xl border border-amber-400/30 px-5 text-sm font-semibold text-amber-200 disabled:opacity-40"
              >
                Reopen for fresh verification
              </button>
            )}
          </article>
        )}
      </div>
      {preview && (
        <IdentityDocumentPreview
          url={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  );
}
