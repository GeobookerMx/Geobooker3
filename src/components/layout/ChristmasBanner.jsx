import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const START = new Date(2026, 10, 23);
const END = new Date(2027, 0, 7);

export default function ChristmasBanner() {
  const { i18n } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const now = new Date();
  const english = i18n.language?.startsWith("en");

  if (dismissed || now < START || now >= END) return null;

  return (
    <section
      aria-label={english ? "Christmas season 2026" : "Temporada navideña 2026"}
      className="relative overflow-hidden bg-gradient-to-r from-[#183d36] via-[#255549] to-[#183d36] text-white"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full border border-amber-300/25" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 -bottom-16 h-40 w-40 rounded-full border border-amber-300/25" />
      <div className="container relative mx-auto px-4 py-3 sm:py-4">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={english ? "Close Christmas message" : "Cerrar mensaje navideño"}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          ×
        </button>
        <div className="pr-8 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-200">✦ {english ? "Christmas" : "Navidad"} 2026 ✦</p>
          <p className="mt-1 text-sm font-semibold sm:text-base">
            {english ? "Turn what you know into a new business idea." : "Convierte lo que sabes en una nueva idea de negocio."}
          </p>
        </div>
        <div className="mt-2 flex flex-col items-center justify-center gap-2 text-center text-xs leading-snug text-white/90 sm:flex-row sm:gap-4">
          <p>
            <strong className="text-amber-200">95.4 %</strong>{" "}
            {english
              ? "of Mexico's private and state-owned enterprise economic units were microbusinesses in 2023."
              : "de las unidades económicas del sector privado y empresas paraestatales en México eran micronegocios en 2023."}
            {" "}<a
              href="https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2025/ce/CE2024_def.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/50 underline-offset-2 hover:text-amber-200"
            >
              {english ? "INEGI, 2024 Economic Census" : "INEGI, Censos Económicos 2024"}
            </a>
          </p>
          <Link to="/emprende" className="shrink-0 rounded-full bg-amber-300 px-3 py-1.5 font-bold text-[#183d36] hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            {english ? "Practice a business idea →" : "Practica una idea de negocio →"}
          </Link>
        </div>
      </div>
    </section>
  );
}
