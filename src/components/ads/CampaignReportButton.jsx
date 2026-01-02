// src/components/ads/CampaignReportButton.jsx
/**
 * Botón para descargar o ver el informe de rendimiento de una campaña
 */
import React, { useState } from 'react';
import { FileText, Download, Loader2, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getCampaignReportData, downloadReportAsPDF, generateReportHTML } from '../../services/reportService';

export default function CampaignReportButton({
    campaignId,
    campaignName,
    variant = 'button', // 'button' | 'icon' | 'text'
    className = ''
}) {
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [reportData, setReportData] = useState(null);

    const handleGenerateReport = async () => {
        if (loading) return;
        setLoading(true);

        try {
            const data = await getCampaignReportData(campaignId);
            setReportData(data);
            toast.success('Informe generado');
            return data;
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Error generando informe');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        const data = reportData || await handleGenerateReport();
        if (data) {
            downloadReportAsPDF(data);
            toast.success('Abriendo informe para imprimir/guardar como PDF');
        }
    };

    const handlePreview = async () => {
        const data = reportData || await handleGenerateReport();
        if (data) {
            setShowPreview(true);
        }
    };

    // Renderizar según variante
    if (variant === 'icon') {
        return (
            <button
                onClick={handleDownload}
                disabled={loading}
                className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
                title="Descargar informe PDF"
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : (
                    <FileText className="w-4 h-4 text-blue-600" />
                )}
            </button>
        );
    }

    if (variant === 'text') {
        return (
            <button
                onClick={handleDownload}
                disabled={loading}
                className={`text-blue-600 hover:text-blue-700 hover:underline text-sm ${className}`}
            >
                {loading ? 'Generando...' : '📄 Ver informe'}
            </button>
        );
    }

    // Variante por defecto: botón completo
    return (
        <>
            <div className={`flex gap-2 ${className}`}>
                <button
                    onClick={handleDownload}
                    disabled={loading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generando...
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4" />
                            Descargar PDF
                        </>
                    )}
                </button>
                <button
                    onClick={handlePreview}
                    disabled={loading}
                    className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    <Eye className="w-4 h-4" />
                    Vista previa
                </button>
            </div>

            {/* Modal de vista previa */}
            {showPreview && reportData && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">
                                📊 Informe: {campaignName || reportData.campaign.advertiserName}
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                                >
                                    <Download className="w-4 h-4" />
                                    Descargar PDF
                                </button>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                        <div
                            className="p-6"
                            dangerouslySetInnerHTML={{ __html: generateReportHTML(reportData) }}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
