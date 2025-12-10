import React, { useState } from 'react';
import { Phone, ChevronDown } from 'lucide-react';

// Lista de países con códigos más comunes en Latinoamérica
const COUNTRY_CODES = [
    { code: '+52', country: 'México', flag: '🇲🇽' },
    { code: '+1', country: 'Estados Unidos', flag: '🇺🇸' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷' },
    { code: '+55', country: 'Brasil', flag: '🇧🇷' },
    { code: '+56', country: 'Chile', flag: '🇨🇱' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴' },
    { code: '+506', country: 'Costa Rica', flag: '🇨🇷' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
    { code: '+503', country: 'El Salvador', flag: '🇸🇻' },
    { code: '+502', country: 'Guatemala', flag: '🇬🇹' },
    { code: '+504', country: 'Honduras', flag: '🇭🇳' },
    { code: '+505', country: 'Nicaragua', flag: '🇳🇮' },
    { code: '+507', country: 'Panamá', flag: '🇵🇦' },
    { code: '+51', country: 'Perú', flag: '🇵🇪' },
    { code: '+595', country: 'Paraguay', flag: '🇵🇾' },
    { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪' },
    { code: '+34', country: 'España', flag: '🇪🇸' },
];

/**
 * PhoneInput - Componente de entrada de teléfono con selector de código de país
 * 
 * @param {Object} props
 * @param {string} props.value - Valor completo del teléfono (con código de país)
 * @param {function} props.onChange - Callback cuando cambia el valor
 * @param {string} props.name - Nombre del campo
 * @param {string} props.placeholder - Texto placeholder
 * @param {string} props.className - Clases adicionales para el contenedor
 */
const PhoneInput = ({
    value = '',
    onChange,
    name = 'phone',
    placeholder = '55 1234 5678',
    className = ''
}) => {
    // Extraer código de país del valor actual
    const parseValue = (val) => {
        if (!val) return { countryCode: '+52', number: '' };

        // Buscar si el valor comienza con algún código de país conocido
        for (const country of COUNTRY_CODES) {
            if (val.startsWith(country.code)) {
                return {
                    countryCode: country.code,
                    number: val.substring(country.code.length).trim()
                };
            }
        }

        // Si no encontramos código, asumimos México y el valor es solo el número
        return { countryCode: '+52', number: val };
    };

    const parsed = parseValue(value);
    const [countryCode, setCountryCode] = useState(parsed.countryCode);
    const [phoneNumber, setPhoneNumber] = useState(parsed.number);
    const [isOpen, setIsOpen] = useState(false);

    const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

    const handleCountryChange = (code) => {
        setCountryCode(code);
        setIsOpen(false);
        // Notificar cambio completo
        if (onChange) {
            const fullValue = phoneNumber ? `${code}${phoneNumber}` : '';
            onChange({ target: { name, value: fullValue } });
        }
    };

    const handlePhoneChange = (e) => {
        // Limpiar el número: solo permitir dígitos y espacios
        const cleaned = e.target.value.replace(/[^\d\s]/g, '');
        setPhoneNumber(cleaned);

        // Notificar cambio completo
        if (onChange) {
            const fullValue = cleaned ? `${countryCode}${cleaned}` : '';
            onChange({ target: { name, value: fullValue } });
        }
    };

    return (
        <div className={`relative ${className}`}>
            <div className="flex">
                {/* Selector de código de país */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-1 px-3 py-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-lg hover:bg-gray-200 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors min-w-[100px]"
                    >
                        <span className="text-xl">{selectedCountry.flag}</span>
                        <span className="text-gray-700 font-medium">{selectedCountry.code}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown de países */}
                    {isOpen && (
                        <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {COUNTRY_CODES.map((country) => (
                                <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => handleCountryChange(country.code)}
                                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-blue-50 transition-colors ${country.code === countryCode ? 'bg-blue-100' : ''
                                        }`}
                                >
                                    <span className="text-xl">{country.flag}</span>
                                    <span className="flex-1 text-left text-gray-700">{country.country}</span>
                                    <span className="text-gray-500 font-mono text-sm">{country.code}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Campo de número */}
                <div className="relative flex-1">
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={handlePhoneChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        placeholder={placeholder}
                    />
                    <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Cerrar dropdown al hacer clic fuera */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default PhoneInput;
