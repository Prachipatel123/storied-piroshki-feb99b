import "./styles.css";
import "./host.css";

interface Rsvp {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  attending: boolean;
  guestCount: number;
  adults: number;
  children: number;
  attendeeNames: string | null;
  comments: string | null;
  createdAt: string;
  updatedAt: string | null;
}

const STORAGE_KEY = "host-password";
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const login = $<HTMLElement>("login");
const dashboard = $<HTMLElement>("dashboard");
const loginForm = $<HTMLFormElement>("login-form");
const password = $<HTMLInputElement>("password");
const passwordError = $<HTMLParagraphElement>("password-error");
const loginBtn = $<HTMLButtonElement>("login-btn");

let rows: Rsvp[] = [];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function cell(text: string, className?: string) {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  return td;
}

function render() {
  const going = rows.filter((r) => r.attending);
  const sum = (k: "guestCount" | "adults" | "children") => going.reduce((n, r) => n + r[k], 0);
  const stats: [string, number][] = [
    ["Total guests", sum("guestCount")],
    ["Adults", sum("adults")],
    ["Children", sum("children")],
    ["Replies attending", going.length],
    ["Can't make it", rows.length - going.length],
  ];
  $("stats").replaceChildren(
    ...stats.map(([label, value]) => {
      const li = document.createElement("li");
      li.className = "stat";
      const v = document.createElement("span");
      v.className = "stat-value";
      v.textContent = String(value);
      const l = document.createElement("span");
      l.className = "stat-label";
      l.textContent = label;
      li.append(v, l);
      return li;
    }),
  );

  const tbody = $("table").querySelector("tbody")!;
  tbody.replaceChildren(
    ...rows.map((r) => {
      const tr = document.createElement("tr");
      const status = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `badge ${r.attending ? "badge--yes" : "badge--no"}`;
      badge.textContent = r.attending ? "Attending" : "Can't make it";
      status.append(badge);
      // Older replies may still have an email address from before the field was removed.
      const contact = [r.phone, r.email].filter(Boolean).join("\n");
      const received = fmtDate(r.createdAt) + (r.updatedAt ? `\nChanged ${fmtDate(r.updatedAt)}` : "");
      tr.append(
        cell(r.name, "strong"),
        status,
        cell(r.attending ? String(r.guestCount) : "–", "num"),
        cell(r.attending ? String(r.adults) : "–", "num"),
        cell(r.attending ? String(r.children) : "–", "num"),
        cell(r.attendeeNames ?? "", "wrap"),
        cell(contact, "wrap"),
        cell(r.comments ?? "", "wrap"),
        cell(received, "nowrap"),
      );
      return tr;
    }),
  );
  $("empty").hidden = rows.length > 0;
  $("table").hidden = rows.length === 0;
}

async function load(pw: string): Promise<boolean> {
  const res = await fetch("/api/host/rsvps", { headers: { Authorization: `Bearer ${pw}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    sessionStorage.removeItem(STORAGE_KEY);
    showLogin(body.error || "Something went wrong loading RSVPs. Please try again.");
    return false;
  }
  rows = body.rsvps;
  sessionStorage.setItem(STORAGE_KEY, pw);
  login.hidden = true;
  dashboard.hidden = false;
  render();
  return true;
}

function showLogin(error = "") {
  dashboard.hidden = true;
  login.hidden = false;
  passwordError.textContent = error;
  if (error) password.setAttribute("aria-invalid", "true");
  else password.removeAttribute("aria-invalid");
  password.focus();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pw = password.value;
  if (!pw) return showLogin("Please enter the host password.");
  loginBtn.disabled = true;
  loginBtn.classList.add("is-busy");
  try {
    if (await load(pw)) password.value = "";
  } catch {
    showLogin("We couldn't reach the server. Please check your connection and try again.");
  } finally {
    loginBtn.disabled = false;
    loginBtn.classList.remove("is-busy");
  }
});

$("refresh").addEventListener("click", async () => {
  const pw = sessionStorage.getItem(STORAGE_KEY);
  if (!pw) return showLogin();
  const btn = $<HTMLButtonElement>("refresh");
  btn.disabled = true;
  btn.textContent = "Refreshing…";
  try {
    await load(pw);
  } catch {
    alert("We couldn't refresh just now. Please try again.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Refresh";
  }
});

$("logout").addEventListener("click", () => {
  sessionStorage.removeItem(STORAGE_KEY);
  rows = [];
  showLogin();
});

$("export").addEventListener("click", () => {
  const header = ["Name", "Status", "Guests", "Adults", "Children", "Attendee names", "Phone", "Email", "Comments", "Received", "Last changed"];
  const esc = (v: string | number) => {
    let s = String(v);
    // Neutralise spreadsheet formulas in guest-provided text (plain phone numbers are left alone).
    if (/^[=@\t\r]/.test(s) || /^[+-](?![\d\s().-]+$)/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [
      r.name, r.attending ? "Attending" : "Can't make it", r.guestCount, r.adults, r.children,
      r.attendeeNames ?? "", r.phone ?? "", r.email ?? "",
      r.comments ?? "", new Date(r.createdAt).toISOString(), r.updatedAt ? new Date(r.updatedAt).toISOString() : "",
    ].map(esc).join(","),
  );
  const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `baby-shower-rsvps-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

const saved = sessionStorage.getItem(STORAGE_KEY);
if (saved) load(saved).catch(() => showLogin());
else showLogin();
