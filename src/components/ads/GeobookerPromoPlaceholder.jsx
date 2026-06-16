import React, { useEffect, useState } from 'react';
import { ArrowRight, Megaphone } from 'lucide-react';
import { HOUSE_AD_CAMPAIGNS, getHouseAdMessage } from '../../config/houseAds';

/**
 * @param {Object} props
 * @param {'banner'|'card'|'inline'|'small'|'sticky'} props.variant
 * @param {boolean} props.rotate
 * @param {number} props.initialIndex
 */
export default function GeobookerPromoPlaceholder({
    variant = 'banner',
    rotate = true,
    initialIndex = 0
}) {
    const [messageIndex, setMessageIndex] = useState(initialIndex);

    useEffect(() => {
        setMessageIndex(initialIndex);
    }, [initialIndex]);

    useEffect(() => {
        if (!rotate) return undefined;
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % HOUSE_AD_CAMPAIGNS.length);
        }, 6500);
        return () => clearInterval(interval);
    }, [rotate]);

    const message = getHouseAdMessage(messageIndex);
    const Icon = message.icon;
    const href = message.targetHref || '/advertise';
    const detailPills = message.proofPoints || message.chips || [];

    if (variant === 'banner') {
        return (
            <div className="w-full py-4">
                <div className="max-w-6xl mx-auto px-4">
                    <a
                        href={href}
                        className={`relative block overflow-hidden rounded-[28px] bg-gradient-to-r ${message.gradient} p-6 md:p-8 text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_80px_rgba(0,0,0,0.24)]`}
                    >
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute left-[8%] top-1/2 h-20 w-20 -translate-y-1/2 rounded-full border-4 border-white/45" />
                            <div className="absolute right-[7%] top-1/2 h-28 w-28 -translate-y-1/2 rounded-full border border-white/30" />
                            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/30" />
                            <div className="absolute right-20 top-6 rounded-full bg-white/10 px-4 py-2 text-3xl font-black tracking-[0.25em]">
                                {message.score}
                            </div>
                        </div>
                        <div className="absolute inset-x-5 bottom-5 h-14 rounded-[20px] border border-white/10 bg-black/10 backdrop-blur-sm" />

                        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start gap-4">
                                <div className="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/15 backdrop-blur md:flex">
                                    <Icon className="h-8 w-8" />
                                </div>
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90">
                                        <span className="inline-flex h-2 w-2 rounded-full bg-lime-300" />
                                        {message.badge}
                                    </div>
                                    <h3 className="mt-3 max-w-3xl text-2xl font-black leading-tight md:text-3xl">
                                        {message.title}
                                    </h3>
                                    <p className="mt-2 max-w-2xl text-sm text-white/90 md:text-base">
                                        {message.subtitle}
                                    </p>
                                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                                        {message.slot} • {message.placement}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col items-start gap-3 md:items-end">
                                <div className="flex flex-wrap gap-2 md:justify-end">
                                    {message.chips?.map((chip) => (
                                        <span
                                            key={chip}
                                            className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur"
                                        >
                                            {chip}
                                        </span>
                                    ))}
                                </div>
                                <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-lg">
                                    {message.cta}
                                    <ArrowRight className="h-4 w-4" />
                                </span>
                            </div>
                        </div>

                        <div className="relative mt-6 grid gap-3 md:grid-cols-3">
                            {detailPills.slice(0, 3).map((item) => (
                                <div
                                    key={item}
                                    className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm"
                                >
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                                        Entregable
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-white">{item}</p>
                                </div>
                            ))}
                        </div>
                    </a>
                </div>
            </div>
        );
    }

    if (variant === 'card') {
        return (
            <a
                href={href}
                className="flex w-72 shrink-0 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
                <div className={`relative h-44 bg-gradient-to-br ${message.gradient} p-5 text-white`}>
                    <div className="absolute inset-0 opacity-20">
                        <div className="absolute left-5 top-1/2 h-16 w-16 -translate-y-1/2 rounded-full border-2 border-white/40" />
                        <div className="absolute right-5 top-1/2 h-20 w-20 -translate-y-1/2 rounded-full border border-white/25" />
                        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/30" />
                    </div>
                    <div className="relative flex h-full flex-col justify-between">
                        <div className="flex items-center justify-between gap-3">
                            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur">
                                {message.badge}
                            </span>
                            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black backdrop-blur">
                                {message.score}
                            </span>
                        </div>
                        <div>
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                                <Icon className="h-6 w-6" />
                            </div>
                            <p className="text-lg font-black leading-tight">{message.title}</p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                                {message.slot}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                    <p className="text-sm font-bold text-slate-900">Campana interna Geobooker</p>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                        {message.subtitle}
                    </p>
                    <p className="mt-3 text-xs font-medium text-slate-500">
                        {message.metricHook}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                            {message.chips?.slice(0, 2).map((chip) => (
                                <span
                                    key={chip}
                                    className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-black text-blue-700">
                            {message.cta}
                            <ArrowRight className="h-4 w-4" />
                        </span>
                    </div>
                </div>
            </a>
        );
    }

    if (variant === 'inline') {
        return (
            <a
                href={href}
                className="mb-3 block overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm transition-all hover:shadow-md"
            >
                <div className="flex items-center gap-4 p-4">
                    <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${message.gradient} text-white`}>
                        <span className="absolute -right-1 -top-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-800">
                            {message.score}
                        </span>
                        <Icon className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 inline-flex rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700">
                            Publicidad interna
                        </div>
                        <h3 className="truncate font-bold text-slate-900">{message.title}</h3>
                        <p className="text-sm text-slate-600 line-clamp-2">{message.subtitle}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{message.slot}</p>
                    </div>
                    <span className="hidden items-center gap-1 whitespace-nowrap text-sm font-black text-blue-700 md:inline-flex">
                        {message.cta}
                        <ArrowRight className="h-4 w-4" />
                    </span>
                </div>
            </a>
        );
    }

    if (variant === 'sticky' || variant === 'small') {
        return (
            <a
                href={href}
                className={`relative block overflow-hidden rounded-2xl bg-gradient-to-r ${message.gradient} p-3 text-white shadow-lg`}
            >
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute left-3 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border-2 border-white/40" />
                    <div className="absolute right-3 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full border border-white/25" />
                    <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/25" />
                </div>
                <div className="relative flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                        {variant === 'small' ? <Megaphone className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                            {message.badge}
                        </p>
                        <p className="truncate text-sm font-black">{message.title}</p>
                        <p className="truncate text-[11px] text-white/75">{message.metricHook}</p>
                    </div>
                    <span className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-900">
                        {message.cta}
                    </span>
                </div>
            </a>
        );
    }

    return null;
}
