import React, { useState } from 'react';
import { FileUp, CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react';
import { bulkImportBusinesses } from '../../services/importService';
import toast from 'react-hot-toast';

const BulkImport = () => {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [mapping, setMapping] = useState({});
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState(0);

    const [defaultTier, setDefaultTier] = useState('A');

    const targetFields = [
        { key: 'name', label: 'Compañía / Nombre del Negocio' },
        { key: 'manager_name', label: 'Nombre del Contacto' },
        { key: 'manager_role', label: 'Puesto' },
        { key: 'address', label: 'Dirección Completa' },
        { key: 'city', label: 'Ciudad' },
        { key: 'postal_code', label: 'Código Postal' },
        { key: 'suburb', label: 'Colonia' },
        { key: 'phone', label: 'Teléfono' },
        { key: 'website', label: 'Página Web (www)' },
        { key: 'employee_count', label: 'Número de Personal' },
        { key: 'category', label: 'Tipo de Empresa / Categoría' },
        { key: 'email', label: 'Email Corporativo / Contacto' },
        { key: 'tier', label: 'Tamaño (AAA, AA, A, B)' }
    ];

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const rows = text.split('\n').filter(row => row.trim() !== '');
            const csvHeaders = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));

            setHeaders(csvHeaders);

            // Preview first 5 rows
            const preview = rows.slice(1, 6).map(row => {
                const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
                const obj = {};
                csvHeaders.forEach((h, i) => obj[h] = values[i]);
                return obj;
            });
            setPreviewData(preview);

            // Auto-mapping suggestion
            const newMapping = {};
            targetFields.forEach(field => {
                const match = csvHeaders.find(h =>
                    h.toLowerCase().includes(field.key.toLowerCase()) ||
                    field.label.toLowerCase().includes(h.toLowerCase())
                );
                if (match) newMapping[field.key] = match;
            });
            setMapping(newMapping);
        };
        reader.readAsText(file);
    };

    const runImport = async () => {
        if (!file || Object.keys(mapping).length === 0) {
            toast.error('Selecciona un archivo y mapea las columnas');
            return;
        }

        setIsImporting(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const text = event.target.result;
                const rows = text.split('\n').filter(row => row.trim() !== '').slice(1);

                const BATCH_SIZE = 100;
                const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

                for (let i = 0; i < totalBatches; i++) {
                    const batchRows = rows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE).map(row => {
                        const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
                        const normalizedRow = {};
                        targetFields.forEach(field => {
                            const csvHeader = mapping[field.key];
                            const headerIndex = headers.indexOf(csvHeader);
                            normalizedRow[field.key] = headerIndex !== -1 ? values[headerIndex] : (field.key === 'tier' ? defaultTier : null);
                        });
                        return normalizedRow;
                    });

                    const result = await bulkImportBusinesses(batchRows);
                    if (!result.success) throw new Error(result.error);

                    setProgress(Math.round(((i + 1) / totalBatches) * 100));
                }

                toast.success(`¡Importación completada! ${rows.length} registros procesados.`);
                setIsImporting(false);
            };
            reader.readAsText(file);
        } catch (error) {
            toast.error('Error durante la importación: ' + error.message);
            setIsImporting(false);
        }
    };

    return (
        <div className="p-8">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-purple-100 rounded-xl">
                    <Database className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Importación Masiva de Negocios</h1>
                    <p className="text-gray-600">Sube tu base de datos CSV para crear miles de perfiles instantáneamente.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Paso 1: Carga */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FileUp className="w-5 h-5 text-blue-500" /> 1. Subir Archivo CSV
                    </h2>
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />

                    {headers.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Columnas detectadas en el CSV:</h3>
                            <div className="flex flex-wrap gap-2">
                                {headers.map(h => (
                                    <span key={h} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                        {h}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Paso 2: Mapeo */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" /> 2. Mapear Columnas
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl mb-4">
                            <div>
                                <p className="text-sm font-bold text-blue-900">Nivel por defecto</p>
                                <p className="text-xs text-blue-700">Se usará si el CSV no tiene una columna de nivel</p>
                            </div>
                            <select
                                className="p-2 border rounded-lg text-sm bg-white"
                                value={defaultTier}
                                onChange={(e) => setDefaultTier(e.target.value)}
                            >
                                <option value="A">Nivel A (General)</option>
                                <option value="AA">Nivel AA (Importante)</option>
                                <option value="AAA">Nivel AAA (Empresa VIP)</option>
                            </select>
                        </div>
                        {targetFields.map(field => (
                            <div key={field.key} className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-600">{field.label}</label>
                                <select
                                    className="ml-4 p-2 border rounded-lg text-sm bg-gray-50"
                                    value={mapping[field.key] || ''}
                                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                >
                                    <option value="">Selecciona columna...</option>
                                    {headers.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Previsualización y Ejecución */}
            {previewData.length > 0 && (
                <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold mb-4">3. Previsualización (Primeras 5 filas)</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 uppercase font-medium">
                                <tr>
                                    {targetFields.map(f => (
                                        <th key={f.key} className="px-4 py-3">{f.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((row, i) => (
                                    <tr key={i} className="border-t">
                                        {targetFields.map(f => (
                                            <td key={f.key} className="px-4 py-3 text-gray-600">
                                                {row[mapping[f.key]] || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t pt-6">
                        <div className="text-sm text-gray-500 italic">
                            Nota: Los negocios se importarán como "No Reclamados" y se les generará un token de seguridad único.
                        </div>
                        <button
                            onClick={runImport}
                            disabled={isImporting}
                            className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all ${isImporting ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-purple-200'
                                }`}
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Procesando {progress}%...
                                </>
                            ) : (
                                <>
                                    <Database className="w-5 h-5" />
                                    Iniciar Importación Masiva
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkImport;
