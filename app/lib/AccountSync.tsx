"use client";

import { useEffect } from "react";
import { initSync } from "./sync";

// À mettre une fois par page : démarre la synchronisation avec le compte (si la personne est connectée).
export default function AccountSync() {
  useEffect(() => { initSync(); }, []);
  return null;
}