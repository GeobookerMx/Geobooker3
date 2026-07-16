import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Download, QrCode, Smartphone } from 'lucide-react';
import AppQRCode from './AppQRCode';
import { APP_LINKS, buildTrackedDownloadUrl } from '../../config/appLinks';
import { IS_IOS_NATIVE } from '../../utils/iosStore';

const qrValue = buildTrackedDownloadUrl({
    platform: 'generic',
    source: 'homepage',
    medium: 'launch_banner',
    campaign: 'app_launch_home',
    target: 'hub'
});

const storeButtons = [
    {
        id: 'android',
        label: 'Google Play',
        href: APP_LINKS.androidStoreUrl,
        className: 'bg-emerald-500 text-white hover:bg-emerald-400',
    },
    {
        id: 'ios',
        label: 'App Store',
        href: APP_LINKS.iosStoreUrl,
        className: 'bg-slate-900 text-white hover:bg-slate-700',
    },
];

export default function AppStoresLaunchBanner() {
    if (IS_IOS_NATIVE) return null;

    return (
        <section className="container mx-auto px-4 py-6">
            <div className="relative overflow-hidden rounded-[32px] border border-cyan-200/60 bg-[linear-gradient(135deg,_rgba(8,145,178,0.16),_rgba(59,130,246,0.14),_rgba(255,255,255,0.98))] shadow-[0_24px_70px_-35px_rgba(8,145,178,0.65)]">
                <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-300/30 blur-3xl" aria-hidden="true" />
                <div className="absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-blue-300/25 blur-3xl" aria-hidden="true" />

                <div className="relative grid gap-8 px-6 py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-9">
                    <div className="flex flex-col justify-center">
                        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300 bg-white/85 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-700 shadow-sm animate-pulse">
                            <Smartphone className="h-4 w-4" />
                            Ya estamos en iOS y Android
                        </div>

                        <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight text-slate-900 md:text-4xl">
                            Descarga Geobooker con un clic desde App Store, Google Play o QR universal.
                        </h2>

                        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                            Haz visible que Geobooker ya tiene app oficial. El usuario puede entrar al hub de descargas, abrir su tienda o escanear el QR principal desde cualquier dispositivo.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                to="/download"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-600/25 transition hover:-translate-y-0.5 hover:bg-cyan-500"
                            >
                                <Download className="h-4 w-4" />
                                Ver centro de descargas
                                <ArrowRight className="h-4 w-4" />
                            </Link>

                            {storeButtons.map((button) => (
                                <a
                                    key={button.id}
                                    href={button.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${button.className}`}
                                >
                                    {button.label}
                                </a>
                            ))}
                        </div>

                        <div className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
                            <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                                <p className="font-bold text-slate-900">QR maestro</p>
                                <p className="mt-1 text-xs leading-5 text-slate-600">Un solo QR principal para Android, iPhone y PWA.</p>
                            </div>
                            <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                                <p className="font-bold text-slate-900">Tiendas oficiales</p>
                                <p className="mt-1 text-xs leading-5 text-slate-600">Links directos a Google Play y App Store como respaldo inmediato.</p>
                            </div>
                            <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                                <p className="font-bold text-slate-900">Listo para CRM</p>
                                <p className="mt-1 text-xs leading-5 text-slate-600">El hub de descarga ya sirve para anuncios, flyers, CRM y postventa.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center">
                        <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Escanea para descargar</p>
                                    <h3 className="mt-2 text-2xl font-black">QR principal</h3>
                                </div>
                                <div className="rounded-2xl bg-white/10 p-3 text-cyan-300">
                                    <QrCode className="h-7 w-7" />
                                </div>
                            </div>

                            <div className="mt-5 flex justify-center">
                                <AppQRCode
                                    size={170}
                                    darkMode={true}
                                    value={qrValue}
                                    label="Android, iPhone y PWA"
                                    subtitle="QR primero · respaldo: geobooker.com.mx/download"
                                />
                            </div>

                            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                                <p className="font-semibold text-white">Comparte Geobooker</p>
                                <p className="mt-2 leading-6">
                                    Si un usuario ve este bloque desde desktop, puede escanear el QR con su celular. Si ya esta en movil, entra directo al centro de descargas o a la tienda correspondiente.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
