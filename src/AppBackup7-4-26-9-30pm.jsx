import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  LogOut, Home, ClipboardList, BarChart3, Plus, Search,
  Pencil, Trash2, X, Check, Timer, Wrench, User, ChevronRight,
  Settings as SettingsIcon, Wifi, WifiOff, RefreshCw, Camera,
  Download, FileSpreadsheet, FileText, AlertTriangle
} from "lucide-react";
import * as XLSX from "xlsx";
import easyBrainLogo from "./assets/easybrain-logo.png";
import {
  GOOGLE_SCRIPT_URL,
  LABOR_TYPES,
  VEHICLES,
  APPROVAL_STATUSES,
  DEFAULT_SETTINGS,
} from "./constants/config";
//import LoginScreen from "./components/LoginScreen";
// ---------------------------------------------------------------------------
// CONFIG
// STORAGE
// NOTE: This standalone build uses plain localStorage instead of the
// Claude-Artifacts-only `window.storage` API (which does not exist outside
// the artifact sandbox). Behavior is otherwise identical: get/set JSON
// values under a namespaced key, async-wrapped for API compatibility.
// ---------------------------------------------------------------------------
async function storageGet(key, _shared = false) {
  try {
    const raw = localStorage.getItem(`pp-worklog:${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
async function storageSet(key, value, _shared = false) {
  try {
    localStorage.setItem(`pp-worklog:${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// API CALLS
// ---------------------------------------------------------------------------
async function apiGet(scriptUrl, action) {
  if (!scriptUrl) throw new Error("NO_URL");
  const res = await fetch(`${scriptUrl}?action=${action}`, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return Array.isArray(data) ? data : data.rows || [];
}

async function apiPost(scriptUrl, action, payload) {
  if (!scriptUrl) throw new Error("NO_URL");
  const res = await fetch(scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return data;
}

async function loadEmployees(scriptUrl) {
  const rows = await apiGet(scriptUrl, "employees");
  return rows.filter((e) => e.id && String(e.id).trim() && e.name && String(e.name).trim());
}
async function loadCustomers(scriptUrl) {
  const rows = await apiGet(scriptUrl, "customers");
  return rows.filter((c) => c.id && String(c.id).trim() && c.name && String(c.name).trim());
}
async function loadProjects(scriptUrl) {
  const rows = await apiGet(scriptUrl, "projects");
  return rows.filter((p) => p.id && String(p.id).trim() && p.name && String(p.name).trim());
}
async function loadWorkLogs(scriptUrl) {
  return apiGet(scriptUrl, "workLogs");
}
async function saveWorkLog(scriptUrl, entry) {
  return apiPost(scriptUrl, "saveWorkLog", entry);
}
async function deleteWorkLogRemote(scriptUrl, id) {
  return apiPost(scriptUrl, "deleteWorkLog", { id });
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function calcHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const [ih, im] = clockIn.split(":").map(Number);
  const [oh, om] = clockOut.split(":").map(Number);
  let start = ih * 60 + im;
  let end = oh * 60 + om;
  if (end < start) end += 24 * 60;
  return Math.round(((end - start) / 60) * 100) / 100;
}
function fmtHours(h) {
  return (Math.round((h || 0) * 100) / 100).toFixed(2);
}
function fmtDate(value) {
  if (!value) return "";

  const d = new Date(value);

  if (isNaN(d.getTime())) {
    return String(value);
  }

  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function startOfWeek(dstr) {
  const d = new Date(dstr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function monthKey(dstr) {
  return dstr.slice(0, 7);
}

// ---------------------------------------------------------------------------
// UI COMPONENTS
// ---------------------------------------------------------------------------
const RulerDivider = () => (
  <div
    className="h-3 w-full"
    style={{
      backgroundImage: "repeating-linear-gradient(90deg, #ea580c 0px, #ea580c 2px, transparent 2px, transparent 14px)",
      backgroundPosition: "bottom",
      backgroundSize: "14px 12px",
      backgroundRepeat: "repeat-x",
      opacity: 0.85,
    }}
  />
);

function Card({ children, className = "" }) {
  return (
    <div className={`bg-stone-50 border-2 border-stone-900 rounded-sm shadow-[3px_3px_0_0_#1c1917] ${className}`}>
      {children}
    </div>
  );
}

function BigButton({ children, onClick, tone = "orange", className = "", disabled }) {
  const tones = {
    orange: "bg-orange-600 hover:bg-orange-700 text-white border-orange-900",
    dark: "bg-stone-900 hover:bg-stone-800 text-white border-stone-950",
    outline: "bg-stone-50 hover:bg-stone-100 text-stone-900 border-stone-900",
    danger: "bg-red-700 hover:bg-red-800 text-white border-red-950",
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`min-h-[52px] px-5 py-3 border-2 rounded-sm font-bold uppercase tracking-wide text-sm active:translate-y-[1px] transition disabled:opacity-40 flex items-center justify-center gap-2 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-stone-400 mt-1 normal-case font-normal">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full min-h-[48px] px-3 border-2 border-stone-900 rounded-sm bg-white text-stone-900 font-mono text-base focus:outline-none focus:ring-2 focus:ring-orange-500";

function AlertBox({ type = "info", children }) {
  const colors = {
    success: "bg-emerald-50 border-emerald-700 text-emerald-800",
    error: "bg-red-50 border-red-700 text-red-800",
    warning: "bg-orange-50 border-orange-700 text-orange-800",
  };
  return (
    <div className={`text-xs border-2 rounded-sm p-3 mb-4 ${colors[type]}`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SETTINGS MODAL
// ---------------------------------------------------------------------------
function SettingsModal({ settings, onSave, onClose, onTestConnection, testStatus }) {
  const [form, setForm] = useState(settings);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-stone-50 border-b-2 border-stone-900 p-4 flex items-center justify-between">
          <h2 className="font-extrabold uppercase text-stone-900">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-stone-200 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <Field label="Company Name">
            <input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className={`${inputCls} font-sans`} />
          </Field>

          <Field label="Google Script URL" hint="Required to load your work data">
            <textarea value={form.googleScriptUrl} onChange={(e) => set("googleScriptUrl", e.target.value)} className={`${inputCls} font-sans text-xs min-h-[80px] py-2`} placeholder="https://script.google.com/macros/s/…/exec" />
          </Field>

          <Field label="Mileage Rate ($/mile)">
            <input type="number" min="0" step="0.01" value={form.mileageRate} onChange={(e) => set("mileageRate", parseFloat(e.target.value) || 0)} className={inputCls} />
          </Field>

          {testStatus && (
            <AlertBox type={testStatus.ok ? "success" : "error"}>
              {testStatus.message}
            </AlertBox>
          )}

          {saved && <AlertBox type="success">✓ Settings saved!</AlertBox>}

          <div className="flex gap-2">
            <BigButton tone="outline" className="flex-1" onClick={() => onTestConnection(form.googleScriptUrl)}>
              <RefreshCw size={14} /> Test
            </BigButton>
            <BigButton tone="orange" className="flex-1" onClick={handleSave}>
              <Check size={14} /> Save
            </BigButton>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LOGIN SCREEN
function LoginScreen({
  employees,
  settings,
  onLogin,
  loading,
  connectionStatus,
  loadErrors = [],
  onOpenSettings,
}) {
  const [selected, setSelected] = useState(null);
  const activeEmployees = employees.filter((e) => e.active !== false);

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center px-5">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="mb-10 text-center">
          <img
            src={easyBrainLogo}
            alt="EasyBrain"
            className="w-28 h-auto mx-auto mb-5"
          />

          <h1 className="text-3xl font-extrabold tracking-wide text-white uppercase">
            EasyBrain Crew
          </h1>

          <p className="text-orange-500 font-semibold mt-2">
            Operational Intelligence Platform
          </p>

          <p className="text-stone-500 text-sm mt-3">
            Powered by
          </p>

          <p className="text-white font-bold">
            P&amp;P Remodeling Services
          </p>
        </div>

        {/* Connection Status */}

        {connectionStatus === "connected" && (
          <AlertBox type="success">
            ✓ Connected to server
          </AlertBox>
        )}

        {connectionStatus === "partial" && (
          <AlertBox type="warning">
            ⚠ Employees loaded, but some data failed:
            <ul className="mt-1 ml-3 list-disc">
              {loadErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </AlertBox>
        )}

        {connectionStatus === "error" && (
          <AlertBox type="error">
            ✗ Cannot reach server. Check Settings.
            {loadErrors.length > 0 && (
              <ul className="mt-1 ml-3 list-disc">
                {loadErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </AlertBox>
        )}

        {connectionStatus === "offline" && (
          <AlertBox type="warning">
            ⚠ Offline mode
          </AlertBox>
        )}

        {/* Login Card */}

        <div className="bg-stone-50 border-2 border-stone-900 rounded-sm p-4 shadow-[4px_4px_0_0_#ea580c]">

          {loading && (
            <p className="text-stone-500 text-sm mb-3 flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin" />
              Loading...
            </p>
          )}

          <p className="text-xs font-bold uppercase text-stone-500 mb-3">
            Select your name
          </p>

          <div className="grid grid-cols-1 gap-2 mb-4 max-h-64 overflow-y-auto">
            {activeEmployees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => setSelected(emp.id)}
                className={`min-h-[52px] px-4 rounded-sm border-2 flex items-center gap-2 font-semibold transition ${
                  selected === emp.id
                    ? "bg-orange-600 border-orange-900 text-white"
                    : "bg-white border-stone-300 text-stone-900 hover:border-stone-900"
                }`}
              >
                <User size={18} />
                {emp.name}
              </button>
            ))}

            {activeEmployees.length === 0 && (
              <p className="text-stone-500 text-sm">
                No employees loaded.
              </p>
            )}
          </div>

          <BigButton
            tone="orange"
            className="w-full"
            disabled={!selected}
            onClick={() => onLogin(selected)}
          >
            <Check size={18} />
            Continue
          </BigButton>

        </div>

        <button
          onClick={onOpenSettings}
          className="text-stone-500 text-xs text-center mt-6 hover:text-orange-500 flex items-center justify-center gap-1 w-full"
        >
          <SettingsIcon size={12} />
          App Settings
        </button>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HEADER
// ---------------------------------------------------------------------------
function Header({ employee, onLogout, dateLabel, settings }) {
  return (
    <div className="bg-stone-900 text-white sticky top-0 z-20">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <p className="font-extrabold uppercase leading-none">{settings.companyName}</p>
          <p className="text-stone-400 text-xs">{dateLabel}</p>
        </div>
        <button onClick={onLogout} className="p-2 rounded-sm border-2 border-stone-700 hover:border-orange-500 hover:text-orange-500">
          <LogOut size={18} />
        </button>
      </div>
      <RulerDivider />
    </div>
  );
}

function BottomNav({ view, setView }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "clock", label: "Clock", icon: Timer },
    { id: "records", label: "Records", icon: ClipboardList },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];
  return (
    <div className="fixed bottom-0 inset-x-0 z-20 bg-stone-900 border-t-2 border-stone-950">
      <div className="max-w-3xl mx-auto grid grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => setView(it.id)}
              className={`flex flex-col items-center justify-center gap-1 py-3 border-t-2 transition ${
                view === it.id ? "border-orange-500 text-orange-500" : "border-transparent text-stone-400"
              }`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-bold uppercase">{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------
function Dashboard({ logs, customers, projects, currentEmployee, setView }) {
  const today = todayStr();
  const wkStart = startOfWeek(today);

  const mine = logs.filter((l) => l.employeeId === currentEmployee.id);
  const todaysHours = mine.filter((l) => l.date === today).reduce((s, l) => s + calcHours(l.clockIn, l.clockOut), 0);
  const weeklyHours = mine.filter((l) => l.date >= wkStart && l.date <= today).reduce((s, l) => s + calcHours(l.clockIn, l.clockOut), 0);

  const nameOf = (arr, id) => arr.find((x) => x.id === id)?.name || "—";

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-28 space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase text-stone-500">Today</p>
          <p className="text-3xl font-mono font-bold text-stone-900 mt-1">{fmtHours(todaysHours)}<span className="text-sm text-stone-400"> hrs</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold upfunction LoginScreenpercase text-stone-500">This Week</p>
          <p className="text-3xl font-mono font-bold text-orange-600 mt-1">{fmtHours(weeklyHours)}<span className="text-sm text-stone-400"> hrs</span></p>
        </Card>
      </div>

      <BigButton tone="orange" className="w-full" onClick={() => setView("clock")}>
        <Timer size={18} /> Go to Time Clock
      </BigButton>

      <div>
        <h2 className="font-extrabold uppercase text-stone-900 text-sm mb-2">Today's Entries ({mine.filter((l) => l.date === today).length})</h2>
        <div className="space-y-2">
          {mine.filter((l) => l.date === today).map((l) => (
            <Card key={l.id} className="p-3">
              <p className="font-semibold text-sm">{nameOf(projects, l.projectId)}</p>
              <p className="text-xs text-stone-500">{l.clockIn}–{l.clockOut} · {fmtHours(calcHours(l.clockIn, l.clockOut))} hrs</p>
            </Card>
          ))}
          {mine.filter((l) => l.date === today).length === 0 && <Card className="p-4 text-stone-500 text-sm">No entries today.</Card>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TIME CLOCK
// ---------------------------------------------------------------------------
function TimeClock({ activeClock, onClockIn, onClockOut }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    if (!activeClock) return;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [activeClock]);

  const elapsed = useMemo(() => {
    if (!activeClock) return "00:00:00";
    const diff = Math.max(0, now - activeClock.startedAt);
    const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
    const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
    const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [now, activeClock]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-28 flex flex-col items-center">
      <Card className="p-6 text-center w-full max-w-xs">
        {activeClock ? (
          <>
            <span className="inline-block bg-orange-600 text-white text-[10px] font-bold uppercase px-2 py-1 rounded-sm border-2 border-orange-900 mb-3">On The Clock</span>
            <p className="font-mono text-4xl font-bold text-stone-900 tabular-nums">{elapsed}</p>
          </>
        ) : (
          <>
            <span className="inline-block bg-stone-200 text-stone-600 text-[10px] font-bold uppercase px-2 py-1 rounded-sm border-2 border-stone-400 mb-3">Off The Clock</span>
            <p className="font-mono text-4xl font-bold text-stone-300">00:00:00</p>
          </>
        )}
      </Card>

      <div className="w-full max-w-xs mt-6">
        {activeClock ? (
          <BigButton tone="danger" className="w-full py-4" onClick={onClockOut}>
            <Timer size={20} /> Clock Out
          </BigButton>
        ) : (
          <BigButton tone="orange" className="w-full py-4" onClick={onClockIn}>
            <Timer size={20} /> Clock In
          </BigButton>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ENTRY FORM
// ---------------------------------------------------------------------------
function EntryForm({ draft, employees, customers, projects, onSave, onCancel, isEditing, saving, saveError }) {
  const [form, setForm] = useState(draft);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const hours = calcHours(form.clockIn, form.clockOut);
  const filteredProjects = projects.filter((p) => p.customerId === form.customerId);
  const canSave = form.employeeId && form.customerId && form.projectId && form.date && form.clockIn && form.clockOut;

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set("photo", reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-28">
      <Card className="p-4">
        <h2 className="font-extrabold uppercase text-stone-900 mb-4">
          {isEditing ? "Edit Entry" : "New Work Entry"}
        </h2>

        {saveError && <AlertBox type="error">✗ Save failed: {saveError}</AlertBox>}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Employee">
            <select value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Customer">
            <select
              value={form.customerId}
              onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value, projectId: "" }))}
              className={inputCls}
            >
              <option value="">Select…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Project">
            <select value={form.projectId} onChange={(e) => set("projectId", e.target.value)} className={inputCls} disabled={!form.customerId}>
              <option value="">Select…</option>
              {filteredProjects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Clock In">
            <input type="time" value={form.clockIn} onChange={(e) => set("clockIn", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Clock Out">
            <input type="time" value={form.clockOut} onChange={(e) => set("clockOut", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Total Hours">
            <div className={`${inputCls} flex items-center bg-stone-100 text-orange-600 font-bold`}>{fmtHours(hours)}</div>
          </Field>
          <Field label="Mileage">
            <input type="number" min="0" step="0.1" value={form.mileage} onChange={(e) => set("mileage", e.target.value)} className={inputCls} placeholder="0" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Labor Type">
            <select value={form.laborType} onChange={(e) => set("laborType", e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {LABOR_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Vehicle">
            <select value={form.vehicle} onChange={(e) => set("vehicle", e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {VEHICLES.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Supervisor Approval">
          <div className="flex gap-2">
            {APPROVAL_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("approval", s)}
                className={`flex-1 min-h-[44px] rounded-sm border-2 font-bold uppercase text-xs tracking-wide transition ${
                  form.approval === s
                    ? s === "Approved"
                      ? "bg-emerald-700 border-emerald-900 text-white"
                      : "bg-stone-700 border-stone-900 text-white"
                    : "bg-white border-stone-300 text-stone-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Work Description">
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} className={`${inputCls} font-sans min-h-[80px] py-2`} placeholder="What was done today…" />
        </Field>

        <Field label="Materials Used">
          <textarea value={form.materials} onChange={(e) => set("materials", e.target.value)} className={`${inputCls} font-sans min-h-[60px] py-2`} placeholder="Materials, supplies…" />
        </Field>

        <Field label="Notes">
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className={`${inputCls} font-sans min-h-[60px] py-2`} placeholder="Anything else to flag…" />
        </Field>

        <Field label="Photo Attachment (optional)">
          <label className="flex items-center gap-2 min-h-[48px] px-3 border-2 border-dashed border-stone-400 rounded-sm cursor-pointer text-stone-500 hover:border-orange-500 hover:text-orange-600 transition">
            <Camera size={18} />
            <span className="text-sm font-semibold">{form.photo ? "Replace photo" : "Attach a job photo"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          </label>
          {form.photo && (
            <div className="mt-2 flex items-center gap-2">
              <img src={form.photo} alt="Attachment preview" className="h-16 w-16 object-cover rounded-sm border-2 border-stone-900" />
              <button type="button" onClick={() => set("photo", "")} className="text-xs text-red-700 font-bold uppercase">Remove</button>
            </div>
          )}
        </Field>

        <div className="flex gap-3 mt-2">
          <BigButton tone="outline" className="flex-1" onClick={onCancel} disabled={saving}>
            <X size={18} /> Cancel
          </BigButton>
          <BigButton tone="orange" className="flex-1" disabled={!canSave || saving} onClick={() => onSave(form)}>
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />} {saving ? "Saving…" : "Save"}
          </BigButton>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RECORDS
// ---------------------------------------------------------------------------
//function Records({ logs, employees, customers, projects, onEdit, onDelete, onNew }) {
  const [query, setQuery] = useState("");
  const nameOf = (arr, id) => arr.find((x) => x.id === id)?.name || "—";

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return logs.filter((l) => {
      const hay = [l.date, nameOf(employees, l.employeeId), nameOf(customers, l.customerId)].join(" ").toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [logs, query]);
     console.log(logs);
  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-28">
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className={`${inputCls} pl-9 font-sans`} />
        </div>
        <BigButton tone="orange" onClick={onNew} className="!px-4">
          <Plus size={18} />
        </BigButton>
      </div>

      <p className="text-xs text-stone-500 mb-2">{filtered.length} records</p>

      <div className="space-y-2">
        {filtered.map((l) => (
          console.log(l.clockIn, typeof l.clockIn);
          console.log(l.clockOut, typeof l.clockOut);
          return (
          <Card key={l.id} className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-stone-500">{fmtDate(l.date)} · {nameOf(employees, l.employeeId)}</p>
                <p className="font-semibold text-sm">{nameOf(projects, l.projectId)}</p>
                <p className="text-xs text-stone-400">{l.clockIn}–{l.clockOut} · {fmtHours(calcHours(l.clockIn, l.clockOut))} hrs</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onEdit(l)} className="p-2 border-2 border-stone-900 rounded-sm hover:bg-stone-900 hover:text-white transition">
                  <Pencil size={14} />
                </button>
                <button onClick={() => onDelete(l.id)} className="p-2 border-2 border-red-800 text-red-800 rounded-sm hover:bg-red-800 hover:text-white transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </Card>
          );
        ))}
        {filtered.length === 0 && <Card className="p-6 text-center text-stone-500 text-sm">No records found.</Card>}
      </div>
    </div>
  );
}

 ---------------------------------------------------------------------------
// SETTINGS PAGE
// ---------------------------------------------------------------------------
function SettingsPage({ settings, onSave, onTestConnection, testStatus, connectionStatus }) {
  const [form, setForm] = useState(settings);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 pb-28">
      <Card className="p-4 mb-4">
        <h2 className="font-extrabold uppercase text-stone-900 mb-4">App Settings</h2>

        {connectionStatus === "connected" && <AlertBox type="success">✓ Connected to server</AlertBox>}
        {connectionStatus === "error" && <AlertBox type="error">✗ Cannot reach server</AlertBox>}

        <Field label="Company Name">
          <input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className={`${inputCls} font-sans`} />
        </Field>

        <Field label="Google Script URL">
          <textarea value={form.googleScriptUrl} onChange={(e) => set("googleScriptUrl", e.target.value)} className={`${inputCls} font-sans text-xs min-h-[60px] py-2`} />
        </Field>

        {testStatus && <AlertBox type={testStatus.ok ? "success" : "error"}>{testStatus.message}</AlertBox>}
        {saved && <AlertBox type="success">✓ Settings saved!</AlertBox>}

        <div className="flex gap-2">
          <BigButton tone="outline" className="flex-1" onClick={() => onTestConnection(form.googleScriptUrl)}>
            <RefreshCw size={14} /> Test
          </BigButton>
          <BigButton tone="orange" className="flex-1" onClick={handleSave}>
            <Check size={14} /> Save
          </BigButton>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN APP
// ---------------------------------------------------------------------------
export default function App() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [logs, setLogs] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("loading");
  const [loadErrors, setLoadErrors] = useState([]);

  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [view, setView] = useState("dashboard");
  const [activeClock, setActiveClock] = useState(null);
  const [testStatus, setTestStatus] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(null);

  const currentEmployee = employees.find((e) => e.id === currentEmployeeId);

  // Load settings and data on startup
  useEffect(() => {
    (async () => {
      const saved = await storageGet("pp-settings", true);
      const settings = saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
      setSettings(settings);
      await refreshAllData(settings.googleScriptUrl);
    })();
  }, []);

  const refreshAllData = useCallback(async (scriptUrl) => {
    setDataLoading(true);
    setConnectionStatus("loading");

    if (!scriptUrl) {
      setConnectionStatus("error");
      setEmployees([]);
      setCustomers([]);
      setProjects([]);
      setLogs([]);
      setDataLoading(false);
      return;
    }

    const [empResult, custResult, projResult, wlResult] = await Promise.allSettled([
      loadEmployees(scriptUrl),
      loadCustomers(scriptUrl),
      loadProjects(scriptUrl),
      loadWorkLogs(scriptUrl),
    ]);

    const errors = [];
    if (empResult.status === "fulfilled") setEmployees(empResult.value);
    else { setEmployees([]); errors.push(`employees: ${empResult.reason.message}`); }

    if (custResult.status === "fulfilled") setCustomers(custResult.value);
    else { setCustomers([]); errors.push(`customers: ${custResult.reason.message}`); }

    if (projResult.status === "fulfilled") setProjects(projResult.value);
    else { setProjects([]); errors.push(`projects: ${projResult.reason.message}`); }

    if (wlResult.status === "fulfilled") setLogs(wlResult.value);
    else { setLogs([]); errors.push(`workLogs: ${wlResult.reason.message}`); }

    if (errors.length > 0) {
      console.error("API errors:", errors);
      setLoadErrors(errors);
      // Still "connected" if at least employees loaded, since login can proceed
      setConnectionStatus(empResult.status === "fulfilled" ? "partial" : "error");
    } else {
      setLoadErrors([]);
      setConnectionStatus("connected");
    }

    setDataLoading(false);
  }, []);

  const handleTestConnection = async (scriptUrl) => {
    setTestStatus({ ok: false, message: "Testing…" });
    try {
      await loadEmployees(scriptUrl);
      setTestStatus({ ok: true, message: "✓ Connected! Employees loaded." });
    } catch (err) {
      setTestStatus({ ok: false, message: `✗ Error: ${err.message}` });
    }
  };

  const handleSaveSettings = async (newSettings) => {
    setSettings(newSettings);
    await storageSet("pp-settings", newSettings, true);
    refreshAllData(newSettings.googleScriptUrl);
  };

  const handleClockIn = () => {
    const now = new Date();
    setActiveClock({ startedAt: now, clockIn: now.toTimeString().slice(0, 5) });
  };

  const blankDraft = (overrides = {}) => ({
    id: null,
    date: todayStr(),
    employeeId: currentEmployeeId,
    customerId: "",
    projectId: "",
    clockIn: "",
    clockOut: "",
    mileage: "",
    laborType: "",
    vehicle: "",
    approval: "Pending",
    description: "",
    materials: "",
    notes: "",
    photo: "",
    ...overrides,
  });

  const handleClockOut = () => {
    const now = new Date();
    const draft = blankDraft({ clockIn: activeClock.clockIn, clockOut: now.toTimeString().slice(0, 5) });
    setActiveClock(null);
    setEditingLog(draft);
    setSaveError(null);
    setShowForm(true);
  };

  const handleNewEntry = () => {
    setEditingLog(blankDraft());
    setSaveError(null);
    setShowForm(true);
  };

  const handleEditEntry = (log) => {
    setEditingLog({ ...log, mileage: String(log.mileage ?? "") });
    setSaveError(null);
    setShowForm(true);
  };

  const handleDeleteEntry = async (id) => {
    const prevLogs = logs;
    setLogs((prev) => prev.filter((l) => l.id !== id));
    try {
      await deleteWorkLogRemote(settings.googleScriptUrl, id);
    } catch (err) {
      console.error("Delete failed:", err);
      setLogs(prevLogs); // roll back if the delete didn't actually happen server-side
      alert(`Couldn't delete this entry: ${err.message}`);
    }
  };

  const handleSaveEntry = async (form) => {
    setSaving(true);
    setSaveError(null);
    const cleaned = { ...form, mileage: parseFloat(form.mileage) || 0 };
    try {
      const result = await saveWorkLog(settings.googleScriptUrl, cleaned);
      const savedId = result && result.id ? result.id : cleaned.id;
      setLogs((prev) => {
        const exists = prev.some((l) => l.id === cleaned.id);
        const savedRecord = { ...cleaned, id: savedId };
        return exists ? prev.map((l) => (l.id === cleaned.id ? savedRecord : l)) : [...prev, savedRecord];
      });
      setShowForm(false);
      setEditingLog(null);
      setView("dashboard");
      setSaveSuccess("✓ Entry saved successfully.");
      setTimeout(() => setSaveSuccess(null), 3000);
      // Pull the authoritative copy back from the sheet (server-calculated
      // TotalHours, generated LogID, etc.) so Today's Entries reflects
      // exactly what's in WorkLogs, not just the optimistic local copy.
      refreshAllData(settings.googleScriptUrl);
    } catch (err) {
      console.error("Save failed:", err);
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingLog(null);
    setSaveError(null);
  };

  // Loading screen
  if (dataLoading && !currentEmployee) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center text-stone-400">
          <RefreshCw size={32} className="animate-spin mx-auto mb-3 text-orange-500" />
          <p className="uppercase text-xs font-bold">Initializing…</p>
        </div>
      </div>
    );
  }

  // Login screen
  if (!currentEmployee) {
    return (
      <>
        <LoginScreen
          employees={employees}
          settings={settings}
          onLogin={(empId) => setCurrentEmployeeId(empId)}
          loading={dataLoading}
          connectionStatus={connectionStatus}
          loadErrors={loadErrors}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
        {showSettingsModal && (
          <SettingsModal
            settings={settings}
            onSave={handleSaveSettings}
            onClose={() => setShowSettingsModal(false)}
            onTestConnection={handleTestConnection}
            testStatus={testStatus}
          />
        )}
      </>
    );
  }

  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  // Main app (after login)
  return (
    <div className="min-h-screen bg-stone-100">
      <Header employee={currentEmployee} onLogout={() => setCurrentEmployeeId(null)} dateLabel={dateLabel} settings={settings} />

      {saveSuccess && (
        <div className="max-w-3xl mx-auto px-4 pt-3">
          <AlertBox type="success">{saveSuccess}</AlertBox>
        </div>
      )}

      {showForm ? (
        <EntryForm
          draft={editingLog}
          employees={employees}
          customers={customers}
          projects={projects}
          onSave={handleSaveEntry}
          onCancel={handleCancelForm}
          isEditing={!!editingLog.id}
          saving={saving}
          saveError={saveError}
        />
      ) : (
        <>
          {view === "dashboard" && <Dashboard logs={logs} customers={customers} projects={projects} currentEmployee={currentEmployee} setView={setView} />}
          {view === "clock" && <TimeClock activeClock={activeClock} onClockIn={handleClockIn} onClockOut={handleClockOut} />}
          {view === "records" && (
            <Records
              logs={logs}
              employees={employees}
              customers={customers}
              projects={projects}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
              onNew={handleNewEntry}
            />
          )}
          {view === "settings" && <SettingsPage settings={settings} onSave={handleSaveSettings} onTestConnection={handleTestConnection} testStatus={testStatus} connectionStatus={connectionStatus} />}
        </>
      )}

      {!showForm && <BottomNav view={view} setView={setView} />}
    </div>
  );
}
