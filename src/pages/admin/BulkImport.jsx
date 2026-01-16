import React, { useState } from 'react';
import { FileUp, CheckCircle, AlertCircle, Loader2, Database, FileSpreadsheet, AlertTriangle, Download, Eye } from 'lucide-react';
import { bulkImportBusinesses } from '../../services/importService';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const BulkImport = () => {
    const [file, setFile] = useState(null);
    const [fileType, setFileType] = useState(null); // 'csv' or 'excel'
    const [previewData, setPreviewData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [mapping, setMapping] = useState({});
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [validationErrors, setValidationErrors] = useState([]);
    const [importStats, setImportStats] = useState(null);

    const [defaultTier, setDefaultTier] = useState('A');
    const [defaultCountry, setDefaultCountry] = useState('Mexico');

    const targetFields = [
        { key: 'name', label: 'Compañía / Nombre del Negocio *', required: true },
        { key: 'email', label: 'Email de Contacto *', required: true },
        { key: 'phone', label: 'Número de Teléfono *', required: true },
        { key: 'category', label: 'Categoría (opcional)', required: false },
        { key: 'city', label: 'Ciudad (opcional)', required: false }
    ];

    /**
     * Procesar archivo CSV o Excel
     */
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileExt = file.name.split('.').pop().toLowerCase();

        if (!['csv', 'xlsx', 'xls'].includes(fileExt)) {
            toast.error('Formato no soportado. Usa CSV, XLSX o XLS');
            return;
        }

        setFile(file);
        setFileType(fileExt === 'csv' ? 'csv' : 'excel');

        const reader = new FileReader();

        if (fileExt === 'csv') {
            // Procesar CSV
            reader.onload = (event) => {
                const text = event.target.result;
                parseCSV(text);
            };
            reader.readAsText(file);
        } else {
            // Procesar Excel
            reader.onload = (event) => {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                parseExcel(jsonData);
            };
            reader.readAsArrayBuffer(file);
        }
    };

    /**
     * Parsear CSV
     */
    const parseCSV = (text) => {
        const rows = text.split('\n').filter(row => row.trim() !== '');
        const csvHeaders = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));

        setHeaders(csvHeaders);

        // Preview first 10 rows
        const preview = rows.slice(1, 11).map(row => {
            const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
            const obj = {};
            csvHeaders.forEach((h, i) => obj[h] = values[i]);
            return obj;
        });
        setPreviewData(preview);

        autoMapColumns(csvHeaders);
        validateData(preview);
    };

    /**
     * Parsear Excel
     */
    const parseExcel = (jsonData) => {
        if (jsonData.length === 0) {
            toast.error('El archivo Excel está vacío');
            return;
        }

        const excelHeaders = jsonData[0].map(h => String(h || '').trim());
        setHeaders(excelHeaders);

        // Preview first 10 rows
        const preview = jsonData.slice(1, 11).map(row => {
            const obj = {};
            excelHeaders.forEach((h, i) => {
                obj[h] = row[i] !== undefined ? String(row[i]).trim() : '';
            });
            return obj;
        });
        setPreviewData(preview);

        autoMapColumns(excelHeaders);
        validateData(preview);
    };

    /**
     * Auto-mapeo inteligente de columnas
     */
    const autoMapColumns = (fileHeaders) => {
        const newMapping = {};

        targetFields.forEach(field => {
            // Buscar coincidencias exactas o parciales
            const match = fileHeaders.find(h => {
                const headerLower = h.toLowerCase();
                const keyLower = field.key.toLowerCase();
                const labelLower = field.label.toLowerCase();

                return headerLower === keyLower ||
                    headerLower.includes(keyLower) ||
                    keyLower.includes(headerLower) ||
                    labelLower.includes(headerLower) ||
                    headerLower.includes(labelLower.split(' /')[0].trim());
            });

            if (match) newMapping[field.key] = match;
        });

        setMapping(newMapping);

        // Notificar si el mapeo está completo
        const requiredFields = targetFields.filter(f => f.required);
        const mappedRequired = requiredFields.filter(f => newMapping[f.key]);

        if (mappedRequired.length === requiredFields.length) {
            toast.success(`Auto-mapeo completado: ${Object.keys(newMapping).length} campos mapeados`);
        } else {
            toast(`Mapeo parcial: ${mappedRequired.length}/${requiredFields.length} campos requeridos`, { icon: '⚠️' });
        }
    };

    /**
     * Validar datos del preview
     */
    const validateData = (preview) => {
        const errors = [];

        preview.forEach((row, index) => {
            // Validar teléfono (requerido)
            const phone = row[mapping.phone] || row.phone || row.Phone || row.telefono || row.Telefono;
            if (!phone || phone.trim() === '') {
                errors.push(`Fila ${index + 2}: Falta teléfono`);
            }

            // Validar nombre (requerido)
            const name = row[mapping.name] || row.name || row.Name || row.empresa || row.Empresa;
            if (!name || name.trim() === '') {
                errors.push(`Fila ${index + 2}: Falta nombre de empresa`);
            }

            // Validar formato de email si existe
            const email = row[mapping.email] || row.email || row.Email;
            if (email && !email.includes('@')) {
                errors.push(`Fila ${index + 2}: Email inválido`);
            }
        });

        setValidationErrors(errors.slice(0, 20)); // Mostrar max 20 errores
    };

    /**
     * Ejecutar importación
     */
    const runImport = async () => {
        // Validar requisitos
        const requiredFields = targetFields.filter(f => f.required);
        const missingFields = requiredFields.filter(f => !mapping[f.key]);

        if (missingFields.length > 0) {
            toast.error(`Faltan campos requeridos: ${missingFields.map(f => f.label).join(', ')}`);
            return;
        }

        if (!file) {
            toast.error('Selecciona un archivo primero');
            return;
        }

        setIsImporting(true);
        setImportStats(null);

        try {
            let allRows = [];

            if (fileType === 'csv') {
                // Leer CSV completo
                const reader = new FileReader();
                const text = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsText(file);
                });
                const rows = text.split('\n').filter(row => row.trim() !== '').slice(1);
                allRows = rows.map(row => {
                    const values = row.split(',').map(v => v.trim().replace(/^\"|\"$/g, '').replace(/\"\"/g, '"'));
                    return values;
                });
            } else {
                // Leer Excel completo
                const reader = new FileReader();
                const buffer = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsArrayBuffer(file);
                });
                const data = new Uint8Array(buffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                allRows = jsonData.slice(1);
            }

            const BATCH_SIZE = 100;
            const totalBatches = Math.ceil(allRows.length / BATCH_SIZE);
            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < totalBatches; i++) {
                const batchRows = allRows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE).map(values => {
                    const normalizedRow = {};
                    targetFields.forEach(field => {
                        const csvHeader = mapping[field.key];
                        const headerIndex = headers.indexOf(csvHeader);
                        const value = headerIndex !== -1 ? values[headerIndex] : null;

                        // Aplicar defaults
                        if (!value || value === '') {
                            if (field.key === 'tier') normalizedRow[field.key] = defaultTier;
                            else if (field.key === 'country') normalizedRow[field.key] = defaultCountry;
                            else normalizedRow[field.key] = null;
                        } else {
                            normalizedRow[field.key] = value;
                        }
                    });
                    return normalizedRow;
                });

                const result = await bulkImportBusinesses(batchRows);
                if (result.success) {
                    successCount += batchRows.length;
                } else {
                    errorCount += batchRows.length;
                }

                setProgress(Math.round(((i + 1) / totalBatches) * 100));
            }

            setImportStats({
                total: allRows.length,
                success: successCount,
                errors: errorCount
            });

            if (errorCount === 0) {
                toast.success(`¡Importación completada! ${successCount} registros procesados.`);
            } else {
                toast(`Importación completada con ${errorCount} errores. ${successCount} registros exitosos.`, { icon: '⚠️', duration: 6000 });
            }

            setIsImporting(false);
        } catch (error) {
            console.error('Import error:', error);
            toast.error('Error durante la importación: ' + error.message);
            setIsImporting(false);
        }
    };

    /**
     * Descargar plantilla
     */
    const downloadTemplate = () => {
        const headers = targetFields.map(f => f.label);
        const sampleRow = [
            'Ejemplo S.A. de C.V.',
            'Juan Pérez',
            'Director General',
            'Av. Reforma 123',
            'Ciudad de México',
            '06600',
            'Juárez',
            '+525512345678',
            'www.ejemplo.com',
            '50',
            'Tecnología',
            'contacto@ejemplo.com',
            'AA',
            'Mexico'
        ];

        const csvContent = headers.join(',') + '\n' + sampleRow.join(',');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_importacion_geobooker.csv';
        a.click();

        toast.success('Plantilla descargada');
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-xl">
                        <Database className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Importación Masiva de Negocios</h1>
                        <p className="text-gray-600">Sube tu base de datos CSV o Excel para crear miles de perfiles instantáneamente.</p>
                    </div>
                </div>
                <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Download className="w-4 h-4" />
                    Descargar Plantilla
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Paso 1: Carga */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-blue-500" /> 1. Subir Archivo CSV o Excel
                    </h2>
                    <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-2">Formatos soportados: CSV, XLSX, XLS</p>

                    {file && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                                <p className="text-sm font-medium text-green-900">{file.name}</p>
                                <p className="text-xs text-green-700">Tipo: {fileType.toUpperCase()} • {(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                        </div>
                    )}

                    {headers.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Columnas detectadas ({headers.length}):</h3>
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
                        {/* Configuración por defecto */}
                        <div className="space-y-3 p-3 bg-blue-50 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-blue-900">Nivel por defecto</p>
                                    <p className="text-xs text-blue-700">Si no hay columna de nivel</p>
                                </div>
                                <select
                                    className="p-2 border rounded-lg text-sm bg-white"
                                    value={defaultTier}
                                    onChange={(e) => setDefaultTier(e.target.value)}
                                >
                                    <option value="B">Nivel B (Pequeña)</option>
                                    <option value="A">Nivel A (General)</option>
                                    <option value="AA">Nivel AA (Importante)</option>
                                    <option value="AAA">Nivel AAA (Empresa VIP)</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-blue-900">País por defecto</p>
                                    <p className="text-xs text-blue-700">Si no hay columna de país</p>
                                </div>
                                <select
                                    className="p-2 border rounded-lg text-sm bg-white"
                                    value={defaultCountry}
                                    onChange={(e) => setDefaultCountry(e.target.value)}
                                >
                                    <option value="Mexico">🇲🇽 México</option>
                                    <option value="USA">🇺🇸 Estados Unidos</option>
                                    <option value="Spain">🇪🇸 España</option>
                                    <option value="Colombia">🇨🇴 Colombia</option>
                                    <option value="Argentina">🇦🇷 Argentina</option>
                                </select>
                            </div>
                        </div>

                        {/* Mapeo de campos */}
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {targetFields.map(field => (
                                <div key={field.key} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                                    <label className={`text-sm font-medium ${field.required ? 'text-gray-900' : 'text-gray-600'}`}>
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    <select
                                        className={`ml-4 p-2 border rounded-lg text-sm ${mapping[field.key] ? 'bg-green-50 border-green-300' : 'bg-gray-50'}`}
                                        value={mapping[field.key] || ''}
                                        onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                    >
                                        <option value="">Selecciona...</option>
                                        {headers.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Validación */}
            {validationErrors.length > 0 && (
                <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <h3 className="font-bold text-yellow-900">Advertencias de Validación ({validationErrors.length})</h3>
                    </div>
                    <ul className="text-sm text-yellow-800 space-y-1 ml-7">
                        {validationErrors.map((error, i) => (
                            <li key={i}>• {error}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Previsualización */}
            {previewData.length > 0 && (
                <div className="mt-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Eye className="w-5 h-5 text-purple-600" />
                        <h2 className="text-lg font-semibold">3. Previsualización (Primeras 10 filas)</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 uppercase font-medium">
                                <tr>
                                    {targetFields.filter(f => mapping[f.key]).map(f => (
                                        <th key={f.key} className="px-4 py-3">{f.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewData.map((row, i) => (
                                    <tr key={i} className="border-t hover:bg-gray-50">
                                        {targetFields.filter(f => mapping[f.key]).map(f => (
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
                        <div className="text-sm text-gray-500 italic max-w-2xl">
                            <p>📌 <strong>Nota:</strong> Los negocios se importarán como "No Reclamados" y se les generará un token de seguridad único.</p>
                            <p className="mt-1">Los propietarios podrán reclamar su perfil usando el email/teléfono registrado.</p>
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

            {/* Estadísticas finales */}
            {importStats && (
                <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
                    <h3 className="font-bold text-green-900 mb-4 flex items-center gap-2">
                        <CheckCircle className="w-6 h-6" />
                        Importación Completada
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Total Procesados</p>
                            <p className="text-2xl font-bold text-gray-900">{importStats.total}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Exitosos</p>
                            <p className="text-2xl font-bold text-green-600">{importStats.success}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Con Errores</p>
                            <p className="text-2xl font-bold text-red-600">{importStats.errors}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkImport;
