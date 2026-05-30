import { useState } from "react";
import { STORAGE_KEY } from "./constants.js";

export function useAudits() {
  const load = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
    catch { return []; }
  };
  const [audits, setAudits] = useState(load);

  const save = (audit) => {
    setAudits(prev => {
      const next = [audit, ...prev.filter(a => a.id !== audit.id)];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const remove = (id) => {
    setAudits(prev => {
      const next = prev.filter(a => a.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  return { audits, save, remove };
}
