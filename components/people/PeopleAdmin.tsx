"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  LoaderCircle,
  Plus,
  Search,
  Shirt,
  UserRound,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"] as const;
const OTHER_SIZE = "__other_ask__";
const ROLES = ["Staff", "Job Coach", "Client"] as const;
const WORK_LOCATIONS = ["Main Office", "Thrift Shop", "SLS"] as const;

type Contact = { name: string; email: string; phone: string };
type Person = {
  id: string;
  full_name: string;
  role: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
  call_number: string | null;
  department_id: string | null;
  work_location: string | null;
  additional_contacts: Contact[] | null;
  updated_at: string | null;
};
type ShirtRecord = {
  person_id: string;
  shirt_size: string | null;
  preferred_color: string | null;
  shirt_received: boolean;
  photo_done: boolean;
  notes: string | null;
  updated_at: string | null;
};
type Department = { id: string; label: string };
type PersonForm = Omit<Person, "id" | "updated_at">;
type ShirtForm = Omit<ShirtRecord, "person_id" | "updated_at">;
type View = "list" | "edit" | "quick";

const emptyPerson: PersonForm = {
  full_name: "",
  role: "Staff",
  email: "",
  phone: "",
  notes: "",
  is_active: true,
  call_number: "",
  department_id: "",
  work_location: "Main Office",
  additional_contacts: [],
};
const emptyShirt: ShirtForm = {
  shirt_size: null,
  preferred_color: "",
  shirt_received: false,
  photo_done: false,
  notes: "",
};

function isStandardSize(size: string | null | undefined) {
  return !!size && (SHIRT_SIZES as readonly string[]).includes(size);
}

function contactRows(value: unknown): Contact[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    if (typeof item === "string") return { name: item, email: "", phone: "" };
    if (!item || typeof item !== "object") return { name: "", email: "", phone: "" };
    const contact = item as Record<string, unknown>;
    return {
      name: String(contact.name ?? ""),
      email: String(contact.email ?? ""),
      phone: String(contact.phone ?? ""),
    };
  });
}

function displayTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "The request failed. Please try again.";
}

export default function PeopleAdmin() {
  const [people, setPeople] = useState<Person[]>([]);
  const [shirts, setShirts] = useState<Record<string, ShirtRecord>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [colorSuggestions, setColorSuggestions] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissionReady, setPermissionReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [personForm, setPersonForm] = useState<PersonForm>(emptyPerson);
  const [shirtForm, setShirtForm] = useState<ShirtForm>(emptyShirt);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [receivedFilter, setReceivedFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");
  const [quickValues, setQuickValues] = useState<Record<string, { size: string; received: boolean }>>({});
  const [quickDirty, setQuickDirty] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    try {
      const [peopleResult, shirtsResult, departmentResult, adminResult] = await Promise.all([
        supabase
          .from("people")
          .select("id,full_name,role,email,phone,notes,is_active,call_number,department_id,work_location,additional_contacts,updated_at")
          .order("full_name"),
        supabase
          .from("people_photo_status")
          .select("person_id,shirt_size,preferred_color,shirt_received,photo_done,notes,updated_at"),
        supabase.from("departments").select("*"),
        supabase.rpc("is_people_admin"),
      ]);

      if (peopleResult.error) throw peopleResult.error;
      if (shirtsResult.error) throw shirtsResult.error;
      if (departmentResult.error) throw departmentResult.error;
      if (adminResult.error) throw new Error(`Could not verify admin permissions: ${adminResult.error.message}`);

      const nextPeople = (peopleResult.data ?? []) as Person[];
      const nextShirts = (shirtsResult.data ?? []) as ShirtRecord[];
      const departmentsData = (departmentResult.data ?? []) as Record<string, unknown>[];
      setPeople(nextPeople);
      setShirts(Object.fromEntries(nextShirts.map((shirt) => [shirt.person_id, shirt])));
      setDepartments(
        departmentsData.map((department) => ({
          id: String(department.id),
          label: String(department.name ?? department.department_name ?? department.label ?? department.id),
        })),
      );
      setColorSuggestions(
        Array.from(
          new Set(nextShirts.map((shirt) => shirt.preferred_color?.trim()).filter((value): value is string => !!value)),
        ).sort((a, b) => a.localeCompare(b)),
      );
      setIsAdmin(adminResult.data === true);
      setPermissionReady(true);
    } catch (loadError) {
      setError(messageFrom(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const departmentNames = useMemo(
    () => new Map(departments.map((department) => [department.id, department.label])),
    [departments],
  );
  const visiblePeople = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return people.filter((person) => {
      const shirt = shirts[person.id];
      return (
        (!normalizedSearch || person.full_name.toLocaleLowerCase().includes(normalizedSearch)) &&
        (!roleFilter || person.role === roleFilter) &&
        (!locationFilter || person.work_location === locationFilter) &&
        (!departmentFilter || person.department_id === departmentFilter) &&
        (!sizeFilter ||
          (sizeFilter === "__no_size__" ? !shirt?.shirt_size : shirt?.shirt_size === sizeFilter)) &&
        (!receivedFilter || String(shirt?.shirt_received === true) === receivedFilter) &&
        (!activeFilter || String(person.is_active) === activeFilter)
      );
    });
  }, [people, shirts, search, roleFilter, locationFilter, departmentFilter, sizeFilter, receivedFilter, activeFilter]);
  const noSizeCount = people.filter((person) => !shirts[person.id]?.shirt_size).length;
  const legacySizes = Array.from(
    new Set(
      Object.values(shirts)
        .map((shirt) => shirt.shirt_size)
        .filter((size): size is string => !!size && !isStandardSize(size)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const openNewPerson = () => {
    setEditingId(null);
    setPersonForm({ ...emptyPerson, additional_contacts: [] });
    setShirtForm({ ...emptyShirt });
    setView("edit");
    setError("");
    setNotice("");
  };

  const openPerson = (person: Person) => {
    const shirt = shirts[person.id];
    setEditingId(person.id);
    setPersonForm({
      ...person,
      email: person.email ?? "",
      phone: person.phone ?? "",
      notes: person.notes ?? "",
      call_number: person.call_number ?? "",
      department_id: person.department_id ?? "",
      work_location: person.work_location ?? "",
      additional_contacts: contactRows(person.additional_contacts),
    });
    setShirtForm({
      ...emptyShirt,
      ...shirt,
      preferred_color: shirt?.preferred_color ?? "",
      notes: shirt?.notes ?? "",
    });
    setView("edit");
    setError("");
    setNotice("");
  };

  const setPersonField = <K extends keyof PersonForm>(key: K, value: PersonForm[K]) => {
    setPersonForm((current) => ({ ...current, [key]: value }));
  };
  const setShirtField = <K extends keyof ShirtForm>(key: K, value: ShirtForm[K]) => {
    setShirtForm((current) => ({ ...current, [key]: value }));
  };

  const validate = () => {
    if (!personForm.full_name.trim()) return "Full name is required.";
    if (personForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personForm.email.trim())) {
      return "Enter a valid email address.";
    }
    if (personForm.phone && !/^\+?[0-9\s().-]{7,20}$/.test(personForm.phone.trim())) {
      return "Enter a valid phone number.";
    }
    for (const contact of personForm.additional_contacts ?? []) {
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
        return "Enter a valid email address for each additional contact.";
      }
      if (contact.phone && !/^\+?[0-9\s().-]{7,20}$/.test(contact.phone.trim())) {
        return "Enter a valid phone number for each additional contact.";
      }
    }
    return "";
  };

  const savePerson = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (editingId && !isAdmin && personForm.role !== people.find((person) => person.id === editingId)?.role) {
      setError("Only admins can change a person's role.");
      return;
    }
    if (editingId && !isAdmin && personForm.is_active !== people.find((person) => person.id === editingId)?.is_active) {
      setError("Only admins can deactivate or restore a person.");
      return;
    }

    const normalizedName = personForm.full_name.trim().toLocaleLowerCase();
    if (!editingId && people.some((person) => person.full_name.trim().toLocaleLowerCase() === normalizedName)) {
      if (!window.confirm(`A person named "${personForm.full_name.trim()}" already exists. Create another record?`)) {
        return;
      }
    }

    setSaving(true);
    try {
      let shirtSize = shirtForm.shirt_size;
      let shirtNotes = shirtForm.notes?.trim() ?? "";
      if (shirtSize === OTHER_SIZE) {
        shirtSize = null;
        if (!shirtNotes.toLowerCase().includes("size not confirmed (other / ask)")) {
          shirtNotes = [shirtNotes, "Size not confirmed (Other / Ask)."].filter(Boolean).join("\n");
        }
      } else {
        shirtNotes = shirtNotes
          .split("\n")
          .filter((line) => line.trim().toLowerCase() !== "size not confirmed (other / ask).")
          .join("\n")
          .trim();
      }

      const supabase = createClient();
      const { error: saveError } = await supabase.rpc("save_person_with_shirt", {
        p_person: {
          ...(editingId ? { id: editingId } : {}),
          ...personForm,
          full_name: personForm.full_name.trim(),
          email: personForm.email?.trim() || null,
          phone: personForm.phone?.trim() || null,
          notes: personForm.notes?.trim() || null,
          call_number: personForm.call_number?.trim() || "",
          department_id: personForm.department_id || null,
          work_location: personForm.work_location || null,
          additional_contacts: (personForm.additional_contacts ?? []).filter(
            (contact) => contact.name.trim() || contact.email.trim() || contact.phone.trim(),
          ),
        },
        p_shirt: {
          shirt_size: shirtSize || null,
          preferred_color: shirtForm.preferred_color?.trim() || null,
          shirt_received: shirtForm.shirt_received,
          photo_done: shirtForm.photo_done,
          notes: shirtNotes || null,
          size_needs_confirmation: shirtForm.shirt_size === OTHER_SIZE,
        },
      });
      if (saveError) throw saveError;

      setNotice(editingId ? "Person and shirt details saved." : "Person added.");
      await loadData();
      if (!editingId) {
        setPersonForm({ ...emptyPerson, additional_contacts: [] });
        setShirtForm({ ...emptyShirt });
        setView("list");
      }
    } catch (saveError) {
      setError(messageFrom(saveError));
    } finally {
      setSaving(false);
    }
  };

  const deactivatePerson = async () => {
    if (!editingId || !isAdmin) return;
    const name = personForm.full_name.trim();
    if (!window.confirm(`Deactivate ${name}? This will keep the record but mark it inactive.`)) return;

    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("people")
        .update({ is_active: false })
        .eq("id", editingId);
      if (updateError) throw updateError;
      setPersonField("is_active", false);
      setNotice(`${name} was deactivated.`);
      await loadData();
    } catch (updateError) {
      setError(messageFrom(updateError));
    } finally {
      setSaving(false);
    }
  };

  const updateQuickValue = (personId: string, value: Partial<{ size: string; received: boolean }>) => {
    const current = quickValues[personId] ?? {
      size: shirts[personId]?.shirt_size ?? "",
      received: shirts[personId]?.shirt_received ?? false,
    };
    setQuickValues((items) => ({ ...items, [personId]: { ...current, ...value } }));
    setQuickDirty((items) => ({ ...items, [personId]: true }));
  };

  const saveQuickUpdates = async () => {
    const changes = Object.keys(quickDirty).map((personId) => {
      const value = quickValues[personId] ?? {
        size: shirts[personId]?.shirt_size ?? "",
        received: shirts[personId]?.shirt_received ?? false,
      };
      return {
        person_id: personId,
        shirt_size: value.size === OTHER_SIZE ? null : value.size || null,
        shirt_received: value.received,
        size_needs_confirmation: value.size === OTHER_SIZE,
      };
    });
    if (!changes.length) return;

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.rpc("save_shirt_updates", { p_changes: changes });
      if (updateError) throw updateError;
      setQuickDirty({});
      setQuickValues({});
      setNotice(`${changes.length} shirt record${changes.length === 1 ? "" : "s"} saved.`);
      await loadData();
    } catch (updateError) {
      setError(messageFrom(updateError));
    } finally {
      setSaving(false);
    }
  };

  const renderMessages = () => (
    <>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}
    </>
  );

  const renderSizeSelect = (value: string | null, onChange: (value: string) => void, id?: string) => {
    const isLegacy = !!value && value !== OTHER_SIZE && !isStandardSize(value);
    return (
      <>
        <select
          id={id}
          value={value === null ? "" : value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-[#10264b] focus:outline-none focus:ring-2 focus:ring-[#10264b]/20"
        >
          <option value="" disabled>Select size</option>
          {SHIRT_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
          {isLegacy && <option value={value}>{value} (legacy)</option>}
          <option value={OTHER_SIZE}>Other / Ask</option>
        </select>
        {isLegacy && (
          <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
            non-standard size, please confirm
          </span>
        )}
      </>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 px-3 py-5 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ae8616]">DART CRM</p>
            <h1 className="mt-1 text-2xl font-bold text-[#10264b] sm:text-3xl">People & Shirt Sizes</h1>
            <p className="mt-1 text-sm text-slate-600">Manage people, shirt details, and received status.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setView("quick"); setError(""); setNotice(""); }} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#10264b] px-4 py-2 font-semibold text-[#10264b] hover:bg-slate-100">
              <Shirt className="h-4 w-4" aria-hidden="true" /> Shirt day
            </button>
            <button onClick={openNewPerson} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#10264b] px-4 py-2 font-semibold text-white hover:bg-[#183965]">
              <Plus className="h-4 w-4" aria-hidden="true" /> Add person
            </button>
          </div>
        </header>

        {renderMessages()}

        {view === "edit" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <button onClick={() => setView("list")} className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#10264b]">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to people
            </button>
            <h2 className="mb-5 text-xl font-bold text-[#10264b]">{editingId ? "Edit person" : "Add person"}</h2>
            <form onSubmit={savePerson} className="space-y-6">
              <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm font-medium">Full name *
                  <input required value={personForm.full_name} onChange={(event) => setPersonField("full_name", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base" />
                </label>
                <label className="text-sm font-medium">Role *
                  <select required disabled={!!editingId && !isAdmin} value={personForm.role} onChange={(event) => setPersonField("role", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base">
                    {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                  {!!editingId && !isAdmin && <span className="text-xs text-slate-500">Role changes require an admin.</span>}
                </label>
                <label className="text-sm font-medium">Department
                  <select value={personForm.department_id ?? ""} onChange={(event) => setPersonField("department_id", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base">
                    <option value="">Select department</option>
                    {departments.map((department) => <option key={department.id} value={department.id}>{department.label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">Work location
                  <select value={personForm.work_location ?? ""} onChange={(event) => setPersonField("work_location", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base">
                    <option value="">Select location</option>
                    {WORK_LOCATIONS.map((location) => <option key={location} value={location}>{location}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">Call number
                  <input value={personForm.call_number ?? ""} onChange={(event) => setPersonField("call_number", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base" />
                </label>
                <label className="text-sm font-medium">Email
                  <input type="email" value={personForm.email ?? ""} onChange={(event) => setPersonField("email", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base" />
                </label>
                <label className="text-sm font-medium">Phone
                  <input type="tel" value={personForm.phone ?? ""} onChange={(event) => setPersonField("phone", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base" />
                </label>
                <label className={`flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm ${personForm.is_active ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-100"}`}>
                  <input type="checkbox" checked={personForm.is_active} disabled={!!editingId && !isAdmin} onChange={(event) => setPersonField("is_active", event.target.checked)} className="h-5 w-5 accent-[#10264b]" />
                  Active
                  {!!editingId && !isAdmin && <span className="text-xs text-slate-500">Admin only</span>}
                </label>
                <label className="text-sm font-medium sm:col-span-2 lg:col-span-3">Person notes
                  <textarea rows={3} value={personForm.notes ?? ""} onChange={(event) => setPersonField("notes", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base" />
                </label>
              </fieldset>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold text-[#10264b]"><UserRound className="h-4 w-4" aria-hidden="true" /> Additional contacts</div>
                <div className="space-y-3">
                  {(personForm.additional_contacts ?? []).map((contact, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      <input aria-label="Contact name" placeholder="Name" value={contact.name} onChange={(event) => {
                        const next = [...(personForm.additional_contacts ?? [])]; next[index] = { ...contact, name: event.target.value }; setPersonField("additional_contacts", next);
                      }} className="min-h-11 rounded-lg border border-slate-300 px-3 text-base" />
                      <input aria-label="Contact email" placeholder="Email" type="email" value={contact.email} onChange={(event) => {
                        const next = [...(personForm.additional_contacts ?? [])]; next[index] = { ...contact, email: event.target.value }; setPersonField("additional_contacts", next);
                      }} className="min-h-11 rounded-lg border border-slate-300 px-3 text-base" />
                      <input aria-label="Contact phone" placeholder="Phone" type="tel" value={contact.phone} onChange={(event) => {
                        const next = [...(personForm.additional_contacts ?? [])]; next[index] = { ...contact, phone: event.target.value }; setPersonField("additional_contacts", next);
                      }} className="min-h-11 rounded-lg border border-slate-300 px-3 text-base" />
                      <button type="button" onClick={() => setPersonField("additional_contacts", (personForm.additional_contacts ?? []).filter((_, row) => row !== index))} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm text-red-700">Remove</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setPersonField("additional_contacts", [...(personForm.additional_contacts ?? []), { name: "", email: "", phone: "" }])} className="mt-3 min-h-10 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-[#10264b]">Add contact</button>
              </div>

              <section className="rounded-xl border border-[#d8bd69] bg-amber-50/40 p-4">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-[#10264b]"><Shirt className="h-4 w-4" aria-hidden="true" /> Shirt & photo details</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="text-sm font-medium">Shirt size
                    <span className="mt-1 block">
                      {renderSizeSelect(shirtForm.shirt_size, (value) => setShirtField("shirt_size", value || null), "shirt-size")}
                    </span>
                  </label>
                  <label className="text-sm font-medium">Preferred color
                    <input list="people-color-suggestions" value={shirtForm.preferred_color ?? ""} onChange={(event) => setShirtField("preferred_color", event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base" />
                    <datalist id="people-color-suggestions">{colorSuggestions.map((color) => <option key={color} value={color} />)}</datalist>
                  </label>
                  <div className="flex flex-col gap-3 sm:pt-6">
                    <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={shirtForm.shirt_received} onChange={(event) => setShirtField("shirt_received", event.target.checked)} className="h-5 w-5 accent-[#10264b]" /> Shirt received</label>
                    <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={shirtForm.photo_done} onChange={(event) => setShirtField("photo_done", event.target.checked)} className="h-5 w-5 accent-[#10264b]" /> Photo done</label>
                  </div>
                  <label className="text-sm font-medium sm:col-span-2 lg:col-span-3">Shirt notes
                    <textarea rows={2} value={shirtForm.notes ?? ""} onChange={(event) => setShirtField("notes", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base" />
                  </label>
                </div>
              </section>

              {editingId && (
                <p className="text-xs text-slate-500">
                  Last updated: {displayTime(people.find((person) => person.id === editingId)?.updated_at ?? shirts[editingId]?.updated_at)}
                </p>
              )}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                {editingId && isAdmin ? (
                  <button type="button" onClick={deactivatePerson} disabled={saving || !personForm.is_active} className="min-h-11 rounded-lg border border-red-300 px-4 font-semibold text-red-700 disabled:opacity-50">
                    Deactivate person
                  </button>
                ) : <span />}
                <button type="submit" disabled={saving || !permissionReady} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#10264b] px-5 font-semibold text-white hover:bg-[#183965] disabled:opacity-60">
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {editingId ? "Save changes" : "Add person"}
                </button>
              </div>
            </form>
          </section>
        ) : view === "quick" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <button onClick={() => setView("list")} className="mb-2 inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-[#10264b]"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to people</button>
                <h2 className="text-xl font-bold text-[#10264b]">Quick shirt update</h2>
              </div>
              <button onClick={saveQuickUpdates} disabled={saving || !Object.keys(quickDirty).length} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#10264b] px-4 font-semibold text-white disabled:opacity-50">
                <Check className="h-4 w-4" aria-hidden="true" /> {saving ? "Saving..." : `Save all changes${Object.keys(quickDirty).length ? ` (${Object.keys(quickDirty).length})` : ""}`}
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-600">Use Tab to move through size and received fields. Changes save together.</p>
            <div className="space-y-3 sm:hidden">
              {people.filter((person) => person.is_active).map((person) => {
                const value = quickValues[person.id] ?? {
                  size: shirts[person.id]?.shirt_size ?? "",
                  received: shirts[person.id]?.shirt_received ?? false,
                };
                return (
                  <article key={person.id} className="rounded-xl border border-slate-200 p-3">
                    <h3 className="font-semibold text-[#10264b]">{person.full_name}</h3>
                    <p className="mb-3 text-xs text-slate-500">{person.role}</p>
                    <div className="grid gap-3">
                      <label className="text-sm font-medium">Shirt size
                        <span className="mt-1 block">{renderSizeSelect(value.size || null, (size) => updateQuickValue(person.id, { size }), `quick-mobile-${person.id}`)}</span>
                      </label>
                      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                        <input aria-label={`${person.full_name} shirt received`} type="checkbox" checked={value.received} onChange={(event) => updateQuickValue(person.id, { received: event.target.checked })} className="h-6 w-6 accent-[#10264b]" />
                        Shirt received
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="p-3">Name</th><th className="p-3">Size</th><th className="p-3">Received</th></tr></thead>
                <tbody>
                  {people.filter((person) => person.is_active).map((person) => {
                    const value = quickValues[person.id] ?? { size: shirts[person.id]?.shirt_size ?? "", received: shirts[person.id]?.shirt_received ?? false };
                    return (
                      <tr key={person.id} className="border-b border-slate-100">
                        <td className="p-3 font-medium text-[#10264b]">{person.full_name}<span className="block text-xs font-normal text-slate-500">{person.role}</span></td>
                        <td className="w-56 p-3">{renderSizeSelect(value.size || null, (size) => updateQuickValue(person.id, { size }), `quick-${person.id}`)}</td>
                        <td className="p-3"><input aria-label={`${person.full_name} shirt received`} type="checkbox" checked={value.received} onChange={(event) => updateQuickValue(person.id, { received: event.target.checked })} className="h-6 w-6 accent-[#10264b]" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <>
            <section className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">Results</p>
                <p className="mt-1 text-2xl font-bold text-[#10264b]">{visiblePeople.length} <span className="text-sm font-normal text-slate-500">of {people.length} people</span></p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-600">No shirt size on file</p>
                <p className="mt-1 text-2xl font-bold text-[#10264b]">{noSizeCount}</p>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="relative block sm:col-span-2 lg:col-span-1">
                  <span className="sr-only">Search name</span>
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name..." className="min-h-11 w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-base" />
                </label>
                <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter} options={ROLES.map((role) => [role, role])} />
                <FilterSelect label="Work location" value={locationFilter} onChange={setLocationFilter} options={WORK_LOCATIONS.map((location) => [location, location])} />
                <FilterSelect label="Department" value={departmentFilter} onChange={setDepartmentFilter} options={departments.map((department) => [department.id, department.label])} />
                <FilterSelect label="Shirt size" value={sizeFilter} onChange={setSizeFilter} options={[...SHIRT_SIZES.map((size) => [size, size] as [string, string]), ...legacySizes.map((size) => [size, `${size} (legacy)`] as [string, string]), ["__no_size__", "No size on file"]]} />
                <FilterSelect label="Shirt received" value={receivedFilter} onChange={setReceivedFilter} options={[["true", "Yes"], ["false", "No"]]} />
                <FilterSelect label="Active" value={activeFilter} onChange={setActiveFilter} options={[["true", "Active"], ["false", "Inactive"]]} />
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                  <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="p-3">Name</th><th className="p-3">Role</th><th className="p-3">Department</th><th className="p-3">Work location</th><th className="p-3">Shirt size</th><th className="p-3">Received</th><th className="p-3">Active</th>
                  </tr></thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-500"><LoaderCircle className="mx-auto h-5 w-5 animate-spin" aria-label="Loading people" /></td></tr>
                    ) : visiblePeople.map((person) => {
                      const shirt = shirts[person.id];
                      return (
                        <tr key={person.id} onClick={() => openPerson(person)} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-semibold text-[#10264b]">{person.full_name}</td>
                          <td className="p-3">{person.role}</td>
                          <td className="p-3">{person.department_id ? departmentNames.get(person.department_id) ?? "—" : "—"}</td>
                          <td className="p-3">{person.work_location || "—"}</td>
                          <td className="p-3">{shirt?.shirt_size || <span className="text-slate-400">No size</span>}{shirt?.shirt_size && !isStandardSize(shirt.shirt_size) && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Confirm</span>}</td>
                          <td className="p-3">{shirt?.shirt_received ? "✓" : "—"}</td>
                          <td className="p-3">{person.is_active ? "✓" : "—"}</td>
                        </tr>
                      );
                    })}
                    {!loading && !visiblePeople.length && <tr><td colSpan={7} className="p-8 text-center text-slate-500">No people match the selected filters.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
        {permissionReady && !isAdmin && <p className="mt-4 text-xs text-slate-500">Signed in staff can read and edit records. Admin privileges are required for deactivation and role changes.</p>}
      </div>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-9 text-base">
        <option value="">All {label}</option>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" aria-hidden="true" />
    </label>
  );
}
