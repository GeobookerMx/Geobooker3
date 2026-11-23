import React, { useState } from "react";
import { useTranslation } from "react-i18next";

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
          <p className="mt-1 text-sm font-semibold sm:text-base">{english ? "This season, discover what connects us." : "Esta temporada, descubre lo que nos conecta."}</p>
        </div>
        <div className="mt-2 grid gap-1.5 text-center text-xs leading-snug text-white/90 md:grid-cols-2 md:gap-4">
          <p>
            {english ? "“Love is the only sane and satisfactory answer to the problem of human existence.”" : "“El amor es la única respuesta sensata y satisfactoria al problema de la existencia humana.”"}
            <span className="ml-1 font-semibold text-amber-200">— Erich Fromm, <i>{english ? "The Art of Loving" : "El arte de amar"}</i></span>
          </p>
          <p>
            {english ? "“Who looks outside dreams; who looks inside awakes.”" : "“Quien mira hacia afuera, sueña; quien mira hacia adentro, despierta.”"}
            <span className="ml-1 font-semibold text-amber-200">— Carl Gustav Jung, {english ? "1916 letter" : "carta de 1916"}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
