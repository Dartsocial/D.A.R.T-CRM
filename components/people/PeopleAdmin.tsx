"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, LoaderCircle, Printer, Search, Shirt } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const ASK_SIZE = "Ask";
const SIZE_CUT_ORDER = ["standard", "plus", "tall", "unknown", "unlisted"];
const sizeCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

type SizeOption = { label: string; cut: string };

type Person = {
  id: string;
  full_name: string;
  role: string;
  work_location: string | null;
};

type ShirtStatus = {
  person_id: string;
  shirt_size: string | null;
  preferred_color: string | null;
  shirt_made: boolean;
  shirt_made_at: string | null;
  shirt_received: boolean;
  shirt_received_at: string | null;
  notes: string | null;
};

type Entry = { person: Person; shirt: ShirtStatus };
type Filter = "all" | "needs-size" | "made-not-received" | "received";
type SaveState = "saved" | "saving" | "error";

const EMPTY_SHIRT = (personId: string): ShirtStatus => ({
  person_id: personId,
  shirt_size: null,
  preferred_color: "",
  shirt_made: false,
  shirt_made_at: null,
  shirt_received: false,
  shirt_received_at: null,
  notes: "",
});

function needsSize(value: string | null): boolean {
  return !value || value === ASK_SIZE;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Could not save this row. Please try again.";
}

export default function PeopleAdmin() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [sizeOptions, setSizeOptions] = useState<SizeOption[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError("");
      const supabase = createClient();
      const [peopleResult, shirtResult, sizesResult] = await Promise.all([
        supabase
          .from("people")
          .select("id,full_name,role,work_location")
          .eq("is_active", true)
          .order("full_name"),
        supabase
          .from("people_photo_status")
          .select("person_id,shirt_size,preferred_color,shirt_made,shirt_made_at,shirt_received,shirt_received_at,notes"),
        supabase.from("shirt_sizes").select("label,cut"),
      ]);

      if (!active) return;
      if (peopleResult.error) {
        setLoadError(peopleResult.error.message);
        setLoading(false);
        return;
      }
      if (shirtResult.error) {
        setLoadError(shirtResult.error.message);
        setLoading(false);
        return;
      }
      if (sizesResult.error) {
        setLoadError(`Could not load shirt size catalog: ${sizesResult.error.message}`);
        setLoading(false);
        return;
      }

      const catalog = ((sizesResult.data ?? []) as SizeOption[]).sort((a, b) => {
        const cutDifference = SIZE_CUT_ORDER.indexOf(a.cut) - SIZE_CUT_ORDER.indexOf(b.cut);
        return (cutDifference || sizeCollator.compare(a.label, b.label));
      });
      setSizeOptions(catalog);

      const shirtByPerson = new Map(
        (shirtResult.data ?? []).map((shirt) => [
          shirt.person_id,
          shirt as ShirtStatus,
        ]),
      );
      setEntries(
        ((peopleResult.data ?? []) as Person[]).map((person) => ({
          person,
          shirt: shirtByPerson.get(person.id) ?? EMPTY_SHIRT(person.id),
        })),
      );
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const updateEntry = useCallback((personId: string, shirt: ShirtStatus) => {
    setEntries((current) =>
      current.map((entry) => (entry.person.id === personId ? { ...entry, shirt } : entry)),
    );
  }, []);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return entries.filter(({ person, shirt }) => {
      const matchesSearch = !query || person.full_name.toLocaleLowerCase().includes(query);
      const matchesFilter =
        filter === "all" ||
        (filter === "needs-size" && needsSize(shirt.shirt_size)) ||
        (filter === "made-not-received" && shirt.shirt_made && !shirt.shirt_received) ||
        (filter === "received" && shirt.shirt_received);
      return matchesSearch && matchesFilter;
    });
  }, [entries, search, filter]);

  const summary = useMemo(
    () => ({
      needsSize: entries.filter(({ shirt }) => needsSize(shirt.shirt_size)).length,
      madeNotReceived: entries.filter(({ shirt }) => shirt.shirt_made && !shirt.shirt_received).length,
      received: entries.filter(({ shirt }) => shirt.shirt_received).length,
    }),
    [entries],
  );

  const printGroups = useMemo(() => {
    const groups = new Map<string, Entry[]>();
    for (const entry of filteredEntries) {
      const size = entry.shirt.shirt_size || "No size";
      groups.set(size, [...(groups.get(size) ?? []), entry]);
    }
    const cutBySize = new Map(sizeOptions.map(({ label, cut }) => [label, cut]));
    return [...groups.entries()].sort(([left], [right]) => {
      const leftCut = cutBySize.get(left) ?? (left === ASK_SIZE ? "unknown" : "unlisted");
      const rightCut = cutBySize.get(right) ?? (right === ASK_SIZE ? "unknown" : "unlisted");
      const cutDifference = SIZE_CUT_ORDER.indexOf(leftCut) - SIZE_CUT_ORDER.indexOf(rightCut);
      return cutDifference || sizeCollator.compare(left, right);
    });
  }, [filteredEntries, sizeOptions]);

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 0.5in; }
          body { background: white !important; color: black !important; }
          .shirt-day-print { display: block !important; }
          .shirt-day-screen { display: none !important; }
        }
      `}</style>

      <main className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 sm:px-6 sm:py-8">
        <div className="shirt-day-screen mx-auto max-w-7xl">
          <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ae8616]">DART CRM</p>
              <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[#10264b] sm:text-3xl">
                <Shirt className="h-7 w-7 text-[#ae8616]" aria-hidden="true" />
                Shirt Day
              </h1>
              <p className="mt-1 text-sm text-slate-600">Update sizes, colors, and shirt status.</p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border border-[#10264b] px-4 py-2 font-semibold text-[#10264b] hover:bg-slate-100"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print list
            </button>
          </header>

          <section aria-label="Shirt day summary" className="mb-5 grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Needs a size" value={summary.needsSize} />
            <SummaryCard label="Made, not received" value={summary.madeNotReceived} />
            <SummaryCard label="Received" value={summary.received} />
          </section>

          {loadError && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Could not load shirt records: {loadError}</span>
              <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="ml-auto shrink-0 font-semibold underline">
                Retry
              </button>
            </div>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
            <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto] sm:items-center">
              <label className="relative block">
                <span className="sr-only">Search by name</span>
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name..."
                  className="min-h-11 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-base outline-none focus:border-[#10264b] focus:ring-2 focus:ring-[#10264b]/20"
                />
              </label>
              <div role="group" aria-label="Filter shirt list" className="grid grid-cols-2 gap-2 sm:flex">
                <FilterButton label="All" active={filter === "all"} onClick={() => setFilter("all")} />
                <FilterButton label="Needs size" active={filter === "needs-size"} onClick={() => setFilter("needs-size")} />
                <FilterButton label="Made not received" active={filter === "made-not-received"} onClick={() => setFilter("made-not-received")} />
                <FilterButton label="Received" active={filter === "received"} onClick={() => setFilter("received")} />
              </div>
            </div>

            <p className="mb-3 text-sm text-slate-500">
              Showing {filteredEntries.length} of {entries.length} active people
            </p>

            {loading ? (
              <div className="flex min-h-40 items-center justify-center text-[#10264b]">
                <LoaderCircle className="h-6 w-6 animate-spin" aria-label="Loading shirt records" />
              </div>
            ) : !loadError && filteredEntries.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-8 text-center text-slate-600">No people match this search or filter.</p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {filteredEntries.map((entry) => (
                    <ShirtDayRow key={entry.person.id} entry={entry} sizeOptions={sizeOptions} onChange={updateEntry} />
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">Name</th>
                        <th className="px-3 py-3">Role</th>
                        <th className="px-3 py-3">Work location</th>
                        <th className="px-3 py-3">Size</th>
                        <th className="px-3 py-3">Cut</th>
                        <th className="px-3 py-3">Preferred color</th>
                        <th className="px-3 py-3 text-center">Made</th>
                        <th className="px-3 py-3 text-center">Received</th>
                        <th className="px-3 py-3">Notes</th>
                        <th className="px-3 py-3">Save status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((entry) => (
                        <ShirtDayRow key={entry.person.id} entry={entry} sizeOptions={sizeOptions} onChange={updateEntry} tableRow />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
          <p className="mt-4 text-xs text-slate-500">Changes save automatically. Unsaved fields are kept if a save fails.</p>
        </div>

        <section className="shirt-day-print hidden print:block">
          <h1 className="mb-1 text-2xl font-bold">DART Shirt Day</h1>
          <p className="mb-6 text-sm text-gray-600">Printed {new Date().toLocaleDateString()}</p>
          {printGroups.map(([size, group]) => (
            <div key={size} className="mb-6 break-inside-avoid">
              <h2 className="mb-2 border-b border-gray-500 pb-1 text-lg font-bold">{size}</h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-400 p-2 text-left">Name</th>
                    <th className="border border-gray-400 p-2 text-left">Size / cut</th>
                    <th className="border border-gray-400 p-2 text-left">Color</th>
                    <th className="w-20 border border-gray-400 p-2">Check</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map(({ person, shirt }) => (
                    <tr key={person.id}>
                      <td className="border border-gray-400 p-2">{person.full_name}</td>
                      <td className="border border-gray-400 p-2">
                        {shirt.shirt_size || ""}
                        {shirt.shirt_size && ` — ${sizeOptions.find((option) => option.label === shirt.shirt_size)?.cut ?? (shirt.shirt_size === ASK_SIZE ? "unknown" : "unlisted")}`}
                      </td>
                      <td className="border border-gray-400 p-2">{shirt.preferred_color || ""}</td>
                      <td className="border border-gray-400 p-2">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#10264b]">{value}</p>
    </div>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 rounded-lg border px-3 text-sm font-semibold ${
        active
          ? "border-[#10264b] bg-[#10264b] text-white"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function ShirtDayRow({
  entry,
  sizeOptions,
  onChange,
  tableRow = false,
}: {
  entry: Entry;
  sizeOptions: SizeOption[];
  onChange: (personId: string, shirt: ShirtStatus) => void;
  tableRow?: boolean;
}) {
  const { person } = entry;
  const [status, setStatus] = useState<SaveState>("saved");
  const [error, setError] = useState("");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const version = useRef(0);
  const latest = useRef(entry.shirt);

  useEffect(() => {
    latest.current = entry.shirt;
  }, [entry.shirt]);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  const save = useCallback(
    (snapshot: ShirtStatus, saveVersion: number) => {
      setStatus("saving");
      setError("");

      const runSave = async () => {
        try {
          const supabase = createClient();
          const { data, error: saveError } = await supabase
            .from("people_photo_status")
            .update(snapshot)
            .eq("person_id", person.id)
            .select("person_id")
            .maybeSingle();
          if (saveError) throw saveError;
          if (!data) {
            const { error: insertError } = await supabase
              .from("people_photo_status")
              .insert(snapshot);
            if (insertError) throw insertError;
          }

          if (version.current === saveVersion) {
            setStatus("saved");
            setError("");
          }
        } catch (saveError) {
          if (version.current === saveVersion) {
            setStatus("error");
            setError(errorText(saveError));
          }
        }
      };

      saveQueue.current = saveQueue.current.then(runSave, runSave);
    },
    [],
  );

  const change = (patch: Partial<ShirtStatus>, immediate: boolean) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    onChange(person.id, next);
    const currentVersion = ++version.current;

    if (timeout.current) clearTimeout(timeout.current);
    if (immediate) {
      save(next, currentVersion);
    } else {
      setStatus("saving");
      setError("");
      timeout.current = setTimeout(() => save(latest.current, currentVersion), 600);
    }
  };

  const catalogOption = sizeOptions.find((option) => option.label === entry.shirt.shirt_size);
  const isUnlisted = !!entry.shirt.shirt_size && entry.shirt.shirt_size !== ASK_SIZE && !catalogOption;
  const sizeCut = catalogOption?.cut ?? (entry.shirt.shirt_size === ASK_SIZE ? "unknown" : "unlisted");
  const sizeSelect = (
    <div>
      <select
        aria-label={`${person.full_name} shirt size`}
        value={entry.shirt.shirt_size ?? ""}
        onChange={(event) => change({ shirt_size: event.target.value || null }, true)}
        className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-base focus:border-[#10264b] focus:outline-none focus:ring-2 focus:ring-[#10264b]/20"
      >
        <option value="">Select size</option>
        {sizeOptions.map(({ label, cut }) => (
          <option key={label} value={label}>{label} — {cut}</option>
        ))}
        {isUnlisted && <option value={entry.shirt.shirt_size!}>{entry.shirt.shirt_size} — unlisted</option>}
        <option value={ASK_SIZE}>Ask</option>
      </select>
      {isUnlisted && (
        <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">unlisted — confirm</span>
      )}
    </div>
  );

  const colorInput = (
    <input
      aria-label={`${person.full_name} preferred color`}
      type="text"
      value={entry.shirt.preferred_color ?? ""}
      onChange={(event) => change({ preferred_color: event.target.value }, false)}
      onBlur={() => {
        if (timeout.current) {
          clearTimeout(timeout.current);
          timeout.current = null;
          save(latest.current, version.current);
        }
      }}
      placeholder="Color"
      className="min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base"
    />
  );

  const notesInput = (
    <textarea
      aria-label={`${person.full_name} shirt notes`}
      value={entry.shirt.notes ?? ""}
      onChange={(event) => change({ notes: event.target.value }, false)}
      onBlur={() => {
        if (timeout.current) {
          clearTimeout(timeout.current);
          timeout.current = null;
          save(latest.current, version.current);
        }
      }}
      placeholder="Notes"
      rows={2}
      className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
    />
  );

  const madeCheck = (
    <input
      aria-label={`${person.full_name} shirt made`}
      type="checkbox"
      checked={entry.shirt.shirt_made}
      onChange={(event) => {
        const made = event.target.checked;
        change({ shirt_made: made, shirt_made_at: made ? new Date().toISOString() : null }, true);
      }}
      className="h-6 w-6 accent-[#10264b]"
    />
  );

  const receivedCheck = (
    <input
      aria-label={`${person.full_name} shirt received`}
      type="checkbox"
      checked={entry.shirt.shirt_received}
      onChange={(event) => {
        const received = event.target.checked;
        change({ shirt_received: received, shirt_received_at: received ? new Date().toISOString() : null }, true);
      }}
      className="h-6 w-6 accent-[#10264b]"
    />
  );

  const saveIndicator = (
    <span
      role={status === "error" ? "alert" : "status"}
      title={status === "error" ? error : status === "saved" ? "Saved" : "Saving"}
      className={`inline-flex items-center gap-1 text-xs ${
        status === "error" ? "text-red-700" : status === "saved" ? "text-green-700" : "text-slate-500"
      }`}
    >
      {status === "saving" ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : status === "saved" ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
      )}
      <span>{status === "saved" ? "Saved" : status === "saving" ? "Saving" : "Save failed"}</span>
      {status === "error" && (
        <>
          <span className="sr-only">{error}</span>
          <button type="button" onClick={() => save(latest.current, version.current)} className="font-semibold underline">
            Retry
          </button>
        </>
      )}
    </span>
  );

  if (tableRow) {
    return (
      <tr className="border-b border-slate-100 align-top hover:bg-slate-50">
        <td className="px-3 py-3 font-semibold text-[#10264b]">{person.full_name}</td>
        <td className="px-3 py-3">{person.role}</td>
        <td className="px-3 py-3">{person.work_location || "—"}</td>
        <td className="w-40 px-3 py-3">{sizeSelect}</td>
        <td className="px-3 py-3">{entry.shirt.shirt_size ? sizeCut : "—"}</td>
        <td className="w-44 px-3 py-3">{colorInput}</td>
        <td className="px-3 py-3 text-center">{madeCheck}</td>
        <td className="px-3 py-3 text-center">{receivedCheck}</td>
        <td className="w-56 px-3 py-3">{notesInput}</td>
        <td className="px-3 py-3">{saveIndicator}</td>
      </tr>
    );
  }

  return (
    <article className="rounded-xl border border-slate-200 p-3">
      <header className="mb-3">
        <h2 className="font-semibold text-[#10264b]">{person.full_name}</h2>
        <p className="text-xs text-slate-500">{person.role}{person.work_location ? ` · ${person.work_location}` : ""}</p>
      </header>
      <div className="grid gap-3">
        <label className="text-sm font-medium">
          Size{sizeSelect}
          {entry.shirt.shirt_size && <span className="mt-1 block text-xs font-normal text-slate-500">Cut: {sizeCut}</span>}
        </label>
        <label className="text-sm font-medium">Preferred color{colorInput}</label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">{madeCheck} Made</label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">{receivedCheck} Received</label>
        </div>
        <label className="text-sm font-medium">Notes{notesInput}</label>
        <div className="min-h-5">{saveIndicator}</div>
      </div>
    </article>
  );
}
