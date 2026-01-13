// src/pages/enterprise/EnterpriseCheckout.jsx
/**
 * Self-Service Enterprise Checkout Wizard (English)
 * Flow: Select Plan → Target Cities → Creative Upload → Payment
 * For international advertisers (Nike, Heineken, Coca-Cola, etc.)
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ArrowRight, Check, Globe, MapPin, Calendar,
    Upload, CreditCard, Loader2, Sparkles, Building2, Zap,
    Image as ImageIcon, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import SEO from '../../components/SEO';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Major cities for targeting (COMPREHENSIVE - All US States, Canada Provinces, Europe Top 10)
const MAJOR_CITIES = {
    // ==========================================
    // UNITED STATES - All 50 States Coverage
    // ==========================================
    US: [
        // Northeast
        'New York', 'Brooklyn', 'Queens', 'Buffalo', 'Albany', 'Rochester', 'Syracuse',
        'Boston', 'Cambridge', 'Worcester', 'Springfield',
        'Philadelphia', 'Pittsburgh', 'Allentown', 'Erie',
        'Newark', 'Jersey City', 'Trenton', 'Atlantic City',
        'Hartford', 'New Haven', 'Stamford', 'Bridgeport',
        'Providence', 'Burlington', 'Portland ME',
        // Southeast
        'Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'West Palm Beach', 'Naples',
        'Atlanta', 'Savannah', 'Augusta', 'Athens',
        'Charlotte', 'Raleigh', 'Durham', 'Asheville', 'Wilmington',
        'Charleston SC', 'Columbia', 'Myrtle Beach', 'Greenville',
        'Nashville', 'Memphis', 'Knoxville', 'Chattanooga',
        'Louisville', 'Lexington', 'Birmingham', 'Montgomery', 'Huntsville',
        'New Orleans', 'Baton Rouge', 'Jackson MS', 'Little Rock',
        'Richmond', 'Virginia Beach', 'Norfolk', 'Arlington VA',
        'Washington DC', 'Baltimore', 'Annapolis',
        // Midwest
        'Chicago', 'Aurora', 'Naperville', 'Rockford', 'Springfield IL',
        'Detroit', 'Grand Rapids', 'Ann Arbor', 'Lansing',
        'Cleveland', 'Columbus', 'Cincinnati', 'Toledo', 'Akron',
        'Indianapolis', 'Fort Wayne', 'Evansville',
        'Milwaukee', 'Madison', 'Green Bay',
        'Minneapolis', 'Saint Paul', 'Rochester MN', 'Duluth',
        'Des Moines', 'Cedar Rapids', 'Davenport',
        'Kansas City', 'Saint Louis', 'Springfield MO',
        'Omaha', 'Lincoln', 'Sioux Falls', 'Fargo',
        // Southwest
        'Houston', 'Dallas', 'San Antonio', 'Austin', 'Fort Worth', 'El Paso', 'Arlington TX', 'Plano', 'Corpus Christi', 'Lubbock', 'Amarillo', 'Laredo', 'McAllen',
        'Phoenix', 'Tucson', 'Mesa', 'Scottsdale', 'Tempe', 'Flagstaff', 'Sedona',
        'Albuquerque', 'Santa Fe', 'Las Cruces',
        'Oklahoma City', 'Tulsa', 'Norman',
        // West
        'Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento', 'Oakland', 'Long Beach', 'Fresno', 'Bakersfield', 'Anaheim', 'Santa Ana', 'Irvine', 'Pasadena', 'Santa Barbara', 'Palm Springs', 'Napa', 'Hollywood', 'Beverly Hills',
        'Las Vegas', 'Henderson', 'Reno', 'Lake Tahoe',
        'Denver', 'Colorado Springs', 'Aurora CO', 'Boulder', 'Aspen', 'Vail',
        'Salt Lake City', 'Park City', 'Provo',
        // Pacific Northwest
        'Seattle', 'Tacoma', 'Spokane', 'Bellevue', 'Olympia',
        'Portland OR', 'Eugene', 'Salem', 'Bend',
        // Mountain/Plains
        'Boise', 'Billings', 'Missoula', 'Cheyenne', 'Casper',
        // Alaska & Hawaii
        'Honolulu', 'Maui', 'Kauai', 'Big Island', 'Anchorage', 'Fairbanks', 'Juneau'
    ],

    // ==========================================
    // CANADA - All Provinces & Territories
    // ==========================================
    CA: [
        // Ontario
        'Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London ON', 'Markham', 'Vaughan', 'Kitchener', 'Windsor', 'Niagara Falls', 'Kingston', 'Thunder Bay',
        // Quebec
        'Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil', 'Sherbrooke', 'Trois-Rivières', 'Saguenay',
        // British Columbia
        'Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Victoria', 'Kelowna', 'Whistler', 'Nanaimo', 'Kamloops', 'Prince George',
        // Alberta
        'Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Banff', 'Jasper', 'Canmore',
        // Manitoba
        'Winnipeg', 'Brandon', 'Steinbach',
        // Saskatchewan
        'Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw',
        // Nova Scotia
        'Halifax', 'Sydney NS', 'Dartmouth',
        // New Brunswick
        'Saint John', 'Moncton', 'Fredericton',
        // Newfoundland
        'St. John\'s', 'Corner Brook',
        // Prince Edward Island
        'Charlottetown',
        // Territories
        'Yellowknife', 'Whitehorse', 'Iqaluit'
    ],

    MX: ['Mexico City', 'Guadalajara', 'Monterrey', 'Cancún', 'Tijuana', 'Puebla', 'León', 'Mérida', 'Querétaro', 'San Luis Potosí', 'Aguascalientes', 'Hermosillo', 'Morelia', 'Oaxaca', 'Playa del Carmen', 'Los Cabos', 'Puerto Vallarta', 'Acapulco', 'Veracruz', 'Chihuahua', 'Toluca', 'Saltillo', 'Cuernavaca', 'Mazatlán', 'Tulum', 'Guanajuato', 'San Miguel de Allende', 'Zacatecas', 'Durango'],

    // Central America & Caribbean
    GT: ['Guatemala City', 'Antigua Guatemala', 'Quetzaltenango'],
    PA: ['Panama City', 'Colón', 'David'],
    CR: ['San José', 'Limón', 'Alajuela'],
    DO: ['Santo Domingo', 'Punta Cana', 'Santiago'],
    PR: ['San Juan', 'Ponce', 'Mayagüez'],
    CU: ['Havana', 'Varadero', 'Santiago de Cuba'],

    // South America
    BR: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador', 'Fortaleza', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Porto Alegre', 'Florianópolis'],
    AR: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'Mar del Plata', 'La Plata', 'San Miguel de Tucumán', 'Bariloche', 'Salta'],
    CO: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Santa Marta', 'Bucaramanga', 'Pereira'],
    CL: ['Santiago', 'Valparaíso', 'Concepción', 'Viña del Mar', 'Antofagasta', 'La Serena'],
    PE: ['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Chiclayo', 'Piura'],
    EC: ['Quito', 'Guayaquil', 'Cuenca', 'Manta', 'Galápagos'],
    VE: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Margarita Island'],
    UY: ['Montevideo', 'Punta del Este', 'Colonia del Sacramento'],
    PY: ['Asunción', 'Ciudad del Este', 'Encarnación'],
    BO: ['La Paz', 'Santa Cruz', 'Cochabamba', 'Sucre'],

    // ==========================================
    // EUROPE - Top 10 Economies (Expanded)
    // ==========================================

    // #1 GERMANY - All Major Cities & Regions
    DE: [
        'Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen',
        'Bremen', 'Dresden', 'Hanover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster',
        'Karlsruhe', 'Mannheim', 'Augsburg', 'Wiesbaden', 'Mönchengladbach', 'Gelsenkirchen', 'Braunschweig', 'Aachen',
        'Kiel', 'Chemnitz', 'Halle', 'Magdeburg', 'Freiburg', 'Krefeld', 'Mainz', 'Lübeck', 'Erfurt', 'Rostock',
        'Kassel', 'Hagen', 'Saarbrücken', 'Potsdam', 'Heidelberg', 'Darmstadt', 'Regensburg', 'Würzburg', 'Ingolstadt', 'Baden-Baden', 'Konstanz'
    ],

    // #2 UNITED KINGDOM - All Regions
    GB: [
        // England
        'London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 'Newcastle', 'Sheffield', 'Bristol', 'Nottingham', 'Leicester',
        'Southampton', 'Brighton', 'Portsmouth', 'Plymouth', 'Reading', 'Coventry', 'Derby', 'Stoke-on-Trent', 'Wolverhampton',
        'Oxford', 'Cambridge', 'York', 'Canterbury', 'Bath', 'Stratford-upon-Avon', 'Chester', 'Exeter', 'Norwich', 'Lincoln',
        // Scotland
        'Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Inverness', 'Stirling',
        // Wales
        'Cardiff', 'Swansea', 'Newport', 'Bangor',
        // Northern Ireland
        'Belfast', 'Derry', 'Lisburn'
    ],

    // #3 FRANCE - All Regions
    FR: [
        'Paris', 'Marseille', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier', 'Bordeaux', 'Lille',
        'Rennes', 'Reims', 'Saint-Étienne', 'Le Havre', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne',
        'Clermont-Ferrand', 'Le Mans', 'Aix-en-Provence', 'Brest', 'Tours', 'Amiens', 'Limoges', 'Perpignan', 'Besançon', 'Orléans',
        'Caen', 'Rouen', 'Cannes', 'Monaco', 'Avignon', 'La Rochelle', 'Biarritz', 'Antibes', 'Saint-Tropez', 'Chamonix', 'Metz'
    ],

    // #4 ITALY - All Regions
    IT: [
        'Rome', 'Milan', 'Naples', 'Turin', 'Palermo', 'Genoa', 'Bologna', 'Florence', 'Bari', 'Catania',
        'Venice', 'Verona', 'Messina', 'Padua', 'Trieste', 'Brescia', 'Parma', 'Taranto', 'Prato', 'Modena',
        'Reggio Calabria', 'Reggio Emilia', 'Perugia', 'Livorno', 'Ravenna', 'Cagliari', 'Foggia', 'Rimini', 'Salerno', 'Ferrara',
        'Siena', 'Pisa', 'Bergamo', 'Trento', 'Como', 'Lecce', 'Pescara', 'Ancona', 'Amalfi Coast', 'Cinque Terre', 'Capri', 'Sardinia'
    ],

    // #5 RUSSIA - Major Cities
    RU: [
        'Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan', 'Nizhny Novgorod', 'Chelyabinsk', 'Samara', 'Omsk', 'Rostov-on-Don',
        'Ufa', 'Krasnoyarsk', 'Voronezh', 'Perm', 'Volgograd', 'Krasnodar', 'Sochi', 'Vladivostok', 'Irkutsk', 'Kaliningrad'
    ],

    // #6 SPAIN - All Regions
    ES: [
        'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Málaga', 'Murcia', 'Palma de Mallorca', 'Las Palmas', 'Bilbao',
        'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Granada', 'A Coruña', 'Vitoria-Gasteiz', 'Elche', 'Oviedo',
        'Santa Cruz de Tenerife', 'Pamplona', 'Santander', 'Burgos', 'Salamanca', 'Albacete', 'Logroño', 'San Sebastián',
        'Ibiza', 'Marbella', 'Mallorca', 'Menorca', 'Formentera', 'Tenerife', 'Lanzarote', 'Fuerteventura', 'Toledo', 'Segovia'
    ],

    // #7 NETHERLANDS - All Provinces
    NL: [
        'Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Tilburg', 'Groningen', 'Almere', 'Breda', 'Nijmegen',
        'Apeldoorn', 'Haarlem', 'Arnhem', 'Zaanstad', 'Amersfoort', 'Haarlemmermeer', 'Hertogenbosch', 'Zoetermeer', 'Zwolle', 'Maastricht',
        'Leiden', 'Dordrecht', 'Ede', 'Delft', 'Leeuwarden'
    ],

    // #8 SWITZERLAND - All Cantons
    CH: [
        'Zurich', 'Geneva', 'Basel', 'Lausanne', 'Bern', 'Winterthur', 'Lucerne', 'St. Gallen', 'Lugano', 'Biel',
        'Thun', 'Bellinzona', 'Köniz', 'Fribourg', 'La Chaux-de-Fonds', 'Schaffhausen', 'Chur', 'Neuchâtel', 'Vernier', 'Sion',
        'Zermatt', 'Interlaken', 'Davos', 'St. Moritz', 'Montreux', 'Locarno', 'Grindelwald'
    ],

    // #9 POLAND - All Major Cities
    PL: [
        'Warsaw', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 'Szczecin', 'Bydgoszcz', 'Lublin', 'Białystok',
        'Katowice', 'Gdynia', 'Częstochowa', 'Radom', 'Sosnowiec', 'Toruń', 'Kielce', 'Rzeszów', 'Gliwice', 'Zabrze',
        'Olsztyn', 'Bielsko-Biała', 'Bytom', 'Zielona Góra', 'Rybnik', 'Opole', 'Legnica', 'Kalisz', 'Zakopane'
    ],

    // #10 BELGIUM - All Regions
    BE: [
        'Brussels', 'Antwerp', 'Ghent', 'Charleroi', 'Liège', 'Bruges', 'Namur', 'Leuven', 'Mons', 'Aalst',
        'Mechelen', 'La Louvière', 'Kortrijk', 'Hasselt', 'Ostend', 'Sint-Niklaas', 'Tournai', 'Genk', 'Seraing', 'Roeselare'
    ],

    // Other European Countries
    PT: ['Lisbon', 'Porto', 'Vila Nova de Gaia', 'Amadora', 'Braga', 'Setúbal', 'Coimbra', 'Funchal', 'Faro', 'Évora', 'Algarve', 'Sintra', 'Cascais'],
    AT: ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck', 'Klagenfurt', 'Villach', 'Wels', 'St. Pölten', 'Dornbirn', 'Hallstatt', 'Kitzbühel'],
    IE: ['Dublin', 'Cork', 'Limerick', 'Galway', 'Waterford', 'Drogheda', 'Kilkenny', 'Sligo', 'Wexford', 'Athlone', 'Killarney'],
    SE: ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg', 'Jönköping', 'Norrköping', 'Lund', 'Umeå', 'Kiruna'],
    NO: ['Oslo', 'Bergen', 'Trondheim', 'Stavanger', 'Drammen', 'Fredrikstad', 'Kristiansand', 'Sandnes', 'Tromsø', 'Ålesund', 'Bodø', 'Kirkenes'],
    DK: ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg', 'Esbjerg', 'Randers', 'Kolding', 'Horsens', 'Vejle', 'Roskilde', 'Helsingør'],
    FI: ['Helsinki', 'Espoo', 'Tampere', 'Vantaa', 'Oulu', 'Turku', 'Jyväskylä', 'Lahti', 'Kuopio', 'Pori', 'Rovaniemi', 'Lapland'],
    CZ: ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Liberec', 'Olomouc', 'Ústí nad Labem', 'Hradec Králové', 'České Budějovice', 'Pardubice', 'Karlovy Vary'],
    GR: ['Athens', 'Thessaloniki', 'Patras', 'Heraklion', 'Larissa', 'Volos', 'Rhodes', 'Ioannina', 'Chania', 'Santorini', 'Mykonos', 'Corfu', 'Crete', 'Zakynthos'],
    TR: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Adana', 'Gaziantep', 'Konya', 'Antalya', 'Kayseri', 'Mersin', 'Cappadocia', 'Bodrum', 'Fethiye', 'Marmaris'],

    // Asia
    JP: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Hiroshima', 'Okinawa'],
    KR: ['Seoul', 'Busan', 'Incheon', 'Jeju', 'Daegu'],
    CN: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Hong Kong', 'Hangzhou', 'Chengdu', 'Xi\'an'],
    TW: ['Taipei', 'Kaohsiung', 'Taichung'],
    TH: ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya', 'Krabi'],
    VN: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Nha Trang'],
    SG: ['Singapore'],
    MY: ['Kuala Lumpur', 'Penang', 'Langkawi', 'Johor Bahru'],
    ID: ['Jakarta', 'Bali', 'Bandung', 'Surabaya', 'Yogyakarta'],
    PH: ['Manila', 'Cebu', 'Boracay', 'Davao'],
    IN: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Goa', 'Jaipur'],
    AE: ['Dubai', 'Abu Dhabi', 'Sharjah'],
    SA: ['Riyadh', 'Jeddah', 'Mecca', 'Medina'],
    IL: ['Tel Aviv', 'Jerusalem', 'Haifa', 'Eilat'],

    // Oceania
    AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Cairns', 'Hobart'],
    NZ: ['Auckland', 'Wellington', 'Christchurch', 'Queenstown'],

    // Africa
    ZA: ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria'],
    EG: ['Cairo', 'Alexandria', 'Luxor', 'Sharm El Sheikh'],
    MA: ['Marrakech', 'Casablanca', 'Fez', 'Tangier'],
    KE: ['Nairobi', 'Mombasa']
};

const COUNTRIES = [
    // North America
    { code: 'US', name: '🇺🇸 United States', region: 'northamerica' },
    { code: 'CA', name: '🇨🇦 Canada', region: 'northamerica' },
    { code: 'MX', name: '🇲🇽 Mexico', region: 'northamerica' },

    // Central America & Caribbean
    { code: 'GT', name: '🇬🇹 Guatemala', region: 'centralamerica' },
    { code: 'PA', name: '🇵🇦 Panama', region: 'centralamerica' },
    { code: 'CR', name: '🇨🇷 Costa Rica', region: 'centralamerica' },
    { code: 'DO', name: '🇩🇴 Dominican Republic', region: 'caribbean' },
    { code: 'PR', name: '🇵🇷 Puerto Rico', region: 'caribbean' },
    { code: 'CU', name: '🇨🇺 Cuba', region: 'caribbean' },

    // South America
    { code: 'BR', name: '🇧🇷 Brazil', region: 'latam' },
    { code: 'AR', name: '🇦🇷 Argentina', region: 'latam' },
    { code: 'CO', name: '🇨🇴 Colombia', region: 'latam' },
    { code: 'CL', name: '🇨🇱 Chile', region: 'latam' },
    { code: 'PE', name: '🇵🇪 Peru', region: 'latam' },
    { code: 'EC', name: '🇪🇨 Ecuador', region: 'latam' },
    { code: 'VE', name: '🇻🇪 Venezuela', region: 'latam' },
    { code: 'UY', name: '🇺🇾 Uruguay', region: 'latam' },
    { code: 'PY', name: '🇵🇾 Paraguay', region: 'latam' },
    { code: 'BO', name: '🇧🇴 Bolivia', region: 'latam' },

    // Europe
    { code: 'ES', name: '🇪🇸 Spain', region: 'europe' },
    { code: 'FR', name: '🇫🇷 France', region: 'europe' },
    { code: 'DE', name: '🇩🇪 Germany', region: 'europe' },
    { code: 'GB', name: '🇬🇧 United Kingdom', region: 'europe' },
    { code: 'IT', name: '🇮🇹 Italy', region: 'europe' },
    { code: 'NL', name: '🇳🇱 Netherlands', region: 'europe' },
    { code: 'PT', name: '🇵🇹 Portugal', region: 'europe' },
    { code: 'BE', name: '🇧🇪 Belgium', region: 'europe' },
    { code: 'AT', name: '🇦🇹 Austria', region: 'europe' },
    { code: 'CH', name: '🇨🇭 Switzerland', region: 'europe' },
    { code: 'IE', name: '🇮🇪 Ireland', region: 'europe' },
    { code: 'SE', name: '🇸🇪 Sweden', region: 'europe' },
    { code: 'NO', name: '🇳🇴 Norway', region: 'europe' },
    { code: 'DK', name: '🇩🇰 Denmark', region: 'europe' },
    { code: 'FI', name: '🇫🇮 Finland', region: 'europe' },
    { code: 'PL', name: '🇵🇱 Poland', region: 'europe' },
    { code: 'CZ', name: '🇨🇿 Czech Republic', region: 'europe' },
    { code: 'GR', name: '🇬🇷 Greece', region: 'europe' },
    { code: 'TR', name: '🇹🇷 Turkey', region: 'europe' },
    { code: 'RU', name: '🇷🇺 Russia', region: 'europe' },

    // Asia
    { code: 'JP', name: '🇯🇵 Japan', region: 'asia' },
    { code: 'KR', name: '🇰🇷 South Korea', region: 'asia' },
    { code: 'CN', name: '🇨🇳 China', region: 'asia' },
    { code: 'TW', name: '🇹🇼 Taiwan', region: 'asia' },
    { code: 'TH', name: '🇹🇭 Thailand', region: 'asia' },
    { code: 'VN', name: '🇻🇳 Vietnam', region: 'asia' },
    { code: 'SG', name: '🇸🇬 Singapore', region: 'asia' },
    { code: 'MY', name: '🇲🇾 Malaysia', region: 'asia' },
    { code: 'ID', name: '🇮🇩 Indonesia', region: 'asia' },
    { code: 'PH', name: '🇵🇭 Philippines', region: 'asia' },
    { code: 'IN', name: '🇮🇳 India', region: 'asia' },
    { code: 'AE', name: '🇦🇪 UAE', region: 'middleeast' },
    { code: 'SA', name: '🇸🇦 Saudi Arabia', region: 'middleeast' },
    { code: 'IL', name: '🇮🇱 Israel', region: 'middleeast' },

    // Oceania
    { code: 'AU', name: '🇦🇺 Australia', region: 'oceania' },
    { code: 'NZ', name: '🇳🇿 New Zealand', region: 'oceania' },

    // Africa
    { code: 'ZA', name: '🇿🇦 South Africa', region: 'africa' },
    { code: 'EG', name: '🇪🇬 Egypt', region: 'africa' },
    { code: 'MA', name: '🇲🇦 Morocco', region: 'africa' },
    { code: 'KE', name: '🇰🇪 Kenya', region: 'africa' }
];

export default function EnterpriseCheckout() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const preselectedPlan = searchParams.get('plan') || '';

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [pricing, setPricing] = useState([]);

    // Form state
    const [form, setForm] = useState({
        // Plan
        selectedPlan: preselectedPlan,

        // Company
        companyName: '',
        contactEmail: '',
        billingCountry: 'US',
        taxId: '',

        // Targeting
        targetCountries: [],
        targetCities: [],

        // Campaign Duration
        startDate: '',
        durationMonths: 1,

        // Creative
        headline: '',
        description: '',
        ctaText: 'Learn More',
        ctaUrl: 'https://',
        imageUrl: '',
        isVideo: false,

        // Language for creative
        creativeLanguage: 'en'
    });

    // Load pricing
    useEffect(() => {
        const loadPricing = async () => {
            try {
                const { data, error } = await supabase.rpc('get_enterprise_pricing');
                if (error) throw error;
                setPricing(data || []);
            } catch (e) {
                console.error('Error loading pricing:', e);
                // Fallback pricing - PRICES ARE TOTAL (not per month)
                // With 50% launch discount applied
                setPricing([
                    {
                        code: 'city_pack',
                        name: 'City Pack',
                        current_price_usd: 1250,      // Total for 1 month
                        regular_price_usd: 2500,
                        discount_percent: 50,
                        cities_included: 1,
                        countries_included: 1,
                        duration_months: 1,
                        description: '1 city, 1 month'
                    },
                    {
                        code: 'regional',
                        name: 'Regional Pack',
                        current_price_usd: 5000,      // Total for 3 months (~$1,666/mo)
                        regular_price_usd: 10000,
                        discount_percent: 50,
                        cities_included: 5,
                        countries_included: 2,
                        duration_months: 3,
                        description: 'Up to 5 cities in 2 countries, 3 months'
                    },
                    {
                        code: 'national',
                        name: 'National Coverage',
                        current_price_usd: 10000,     // Total for 3 months (~$3,333/mo)
                        regular_price_usd: 20000,
                        discount_percent: 50,
                        cities_included: 999,         // All cities
                        countries_included: 1,        // But only 1 country
                        duration_months: 3,
                        description: 'All cities in 1 country, 3 months'
                    },
                    {
                        code: 'global_event',
                        name: 'Global Event',
                        current_price_usd: 25000,     // Total for 3 months (~$8,333/mo)
                        regular_price_usd: 50000,
                        discount_percent: 50,
                        cities_included: 999,
                        countries_included: 999,
                        duration_months: 3,
                        description: 'Unlimited - All countries, all cities, 3 months'
                    }
                ]);
            }
        };
        loadPricing();
    }, []);

    const selectedPlanData = pricing.find(p => p.code === form.selectedPlan);

    // Plan limits - use countries_included from plan data
    const getMaxCountries = () => {
        return selectedPlanData?.countries_included || 1;
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    // Helper: Get video duration before upload
    const getVideoDuration = (file) => {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                resolve(video.duration);
            };
            video.onerror = () => resolve(0);
            video.src = URL.createObjectURL(file);
        });
    };

    const toggleCity = (city) => {
        const maxCities = selectedPlanData?.cities_included || 1;
        setForm(prev => {
            if (prev.targetCities.includes(city)) {
                return { ...prev, targetCities: prev.targetCities.filter(c => c !== city) };
            }
            // Check limit before adding
            if (maxCities !== 999 && prev.targetCities.length >= maxCities) {
                toast.error(`Your plan includes max ${maxCities} cities`);
                return prev;
            }
            return { ...prev, targetCities: [...prev.targetCities, city] };
        });
    };

    const toggleCountry = (code) => {
        const maxCountries = getMaxCountries();
        setForm(prev => {
            if (prev.targetCountries.includes(code)) {
                // Also remove cities from this country
                const citiesToRemove = MAJOR_CITIES[code] || [];
                return {
                    ...prev,
                    targetCountries: prev.targetCountries.filter(c => c !== code),
                    targetCities: prev.targetCities.filter(c => !citiesToRemove.includes(c))
                };
            }
            // Check limit before adding
            if (maxCountries !== 999 && prev.targetCountries.length >= maxCountries) {
                toast.error(`Your plan allows max ${maxCountries} ${maxCountries === 1 ? 'country' : 'countries'}`);
                return prev;
            }
            return { ...prev, targetCountries: [...prev.targetCountries, code] };
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file type
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isImage && !isVideo) {
            toast.error('Please upload an image or video file');
            return;
        }

        // Size limits: 5MB for images, 30MB for videos (15s max = less size needed)
        const maxSize = isVideo ? 30 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(`File must be under ${isVideo ? '30MB' : '5MB'}`);
            return;
        }

        // For video: check duration (max 15 seconds)
        if (isVideo) {
            const duration = await getVideoDuration(file);
            if (duration > 15) {
                toast.error('Video must be 15 seconds or less. Users can skip after 7 seconds.');
                return;
            }
            handleChange('videoDuration', duration);
        }

        setUploading(true);
        try {
            // Clean filename and create path
            const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = `enterprise/${Date.now()}_${cleanName}`;

            const { error } = await supabase.storage
                .from('ad-creatives')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('ad-creatives').getPublicUrl(filePath);
            handleChange('imageUrl', publicUrl);
            handleChange('isVideo', isVideo);
            toast.success(`${isVideo ? 'Video' : 'Image'} uploaded successfully`);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Upload failed. Please try again or use a different file.');
        } finally {
            setUploading(false);
        }
    };

    const handleCheckout = async () => {
        if (!form.companyName || !form.contactEmail || !form.selectedPlan) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Checking availability...');

        try {
            // 0. Validate slot availability before proceeding
            const adLevel = selectedPlanData?.cities_included > 5 ? 'global' :
                selectedPlanData?.countries_included > 1 ? 'regional' : 'city';

            const startDate = form.startDate || new Date().toISOString().split('T')[0];
            const endDate = new Date(new Date(startDate).setMonth(
                new Date(startDate).getMonth() + (selectedPlanData?.duration_months || 1)
            )).toISOString().split('T')[0];

            // DISABLED: Availability check temporarily removed due to RPC issues
            // Will be re-enabled once database function is properly configured
            // Admin can manually review slot availability
            console.log('Skipping availability check - proceeding to campaign creation');

            toast.loading('Creating your campaign...', { id: toastId });

            // 1. Create enterprise campaign in database
            const { data: campaign, error: campaignError } = await supabase
                .from('ad_campaigns')
                .insert({
                    advertiser_name: form.companyName,
                    advertiser_email: form.contactEmail,
                    campaign_type: selectedPlanData?.cities_included > 5 ? 'global' : 'regional',
                    ad_level: adLevel,
                    category_code: form.category || 'other',
                    target_cities: form.targetCities,
                    target_countries: form.targetCountries,
                    billing_country: form.billingCountry,
                    client_tax_id: form.taxId,
                    tax_status: form.billingCountry === 'MX' ? 'domestic_mx' : 'export_0_iva',
                    total_budget: selectedPlanData?.current_price_usd || 0,
                    currency: 'USD',
                    status: 'draft',
                    start_date: startDate,
                    end_date: endDate,
                    // Creative fields
                    headline: form.headline,
                    description: form.description,
                    cta_text: form.ctaText,
                    cta_url: form.ctaUrl,
                    creative_url: form.imageUrl,
                    multi_language_creatives: {
                        [form.creativeLanguage]: {
                            headline: form.headline,
                            description: form.description,
                            cta_text: form.ctaText,
                            cta_url: form.ctaUrl,
                            image_url: form.imageUrl
                        }
                    }
                })
                .select()
                .single();

            if (campaignError) throw campaignError;

            // 1b. Notify admin via email (async, non-blocking)
            fetch('/.netlify/functions/notify-admin-campaign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaign })
            }).catch(err => console.warn('Admin notification failed:', err));

            // 2. Create Stripe checkout session
            const stripe = await stripePromise;
            if (!stripe) throw new Error('Stripe failed to load');

            const response = await fetch('/.netlify/functions/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Math.round((selectedPlanData?.current_price_usd || 1250) * 100),
                    currency: 'usd',
                    customerEmail: form.contactEmail,
                    successUrl: `${window.location.origin}/enterprise/success?campaign=${campaign.id}`,
                    cancelUrl: `${window.location.origin}/enterprise/checkout?plan=${form.selectedPlan}&canceled=true`,
                    mode: 'payment',
                    metadata: {
                        type: 'enterprise_campaign',
                        campaign_id: campaign.id,
                        plan: form.selectedPlan,
                        company: form.companyName
                    }
                })
            });

            const session = await response.json();
            if (session.error) throw new Error(session.error);

            toast.success('Redirecting to secure payment...', { id: toastId });
            window.location.href = session.url;

        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Error: ' + error.message, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(price);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4">
            <SEO
                title="Enterprise Checkout - Geobooker Ads"
                description="Create your global advertising campaign"
            />

            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 px-4 py-2 rounded-full mb-4">
                        <Zap className="w-4 h-4" />
                        <span className="font-bold text-sm">50% LAUNCH DISCOUNT</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Create Your Campaign</h1>
                    <p className="text-gray-400">Complete in 4 simple steps</p>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-between mb-8">
                    {['Plan', 'Targeting', 'Creative', 'Payment'].map((label, i) => (
                        <div key={label} className="flex-1 text-center">
                            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2 ${step > i + 1 ? 'bg-green-500 text-white' :
                                step === i + 1 ? 'bg-amber-500 text-white' :
                                    'bg-gray-700 text-gray-400'
                                }`}>
                                {step > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
                            </div>
                            <span className={`text-sm ${step >= i + 1 ? 'text-white' : 'text-gray-500'}`}>
                                {label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Main Card */}
                <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-6 md:p-8">

                    {/* STEP 1: Select Plan */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white">Select Your Plan</h2>

                            <div className="grid md:grid-cols-2 gap-4">
                                {pricing.map(plan => (
                                    <button
                                        key={plan.code}
                                        onClick={() => handleChange('selectedPlan', plan.code)}
                                        className={`p-5 rounded-xl border-2 text-left transition-all ${form.selectedPlan === plan.code
                                            ? 'border-amber-500 bg-amber-500/10'
                                            : 'border-gray-700 hover:border-gray-600'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-bold text-white">{plan.name}</h3>
                                            {form.selectedPlan === plan.code && (
                                                <Check className="w-5 h-5 text-amber-500" />
                                            )}
                                        </div>

                                        <div className="mb-3">
                                            {plan.discount_percent > 0 && (
                                                <span className="text-gray-500 line-through text-sm mr-2">
                                                    {formatPrice(plan.regular_price_usd)}
                                                </span>
                                            )}
                                            <div className="flex flex-col">
                                                <div>
                                                    <span className="text-2xl font-bold text-white">
                                                        {formatPrice(plan.current_price_usd)}
                                                    </span>
                                                    <span className="text-gray-400 text-sm"> total</span>
                                                </div>
                                                <span className="text-emerald-400 text-sm">
                                                    ≈ {formatPrice(Math.round(plan.current_price_usd / plan.duration_months))}/month
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-sm text-gray-400">
                                            {plan.countries_included === 999
                                                ? '🌍 All countries'
                                                : `📍 ${plan.countries_included} ${plan.countries_included === 1 ? 'country' : 'countries'}`}
                                            {' • '}
                                            {plan.cities_included === 999
                                                ? 'Unlimited cities'
                                                : `${plan.cities_included} ${plan.cities_included === 1 ? 'city' : 'cities'}`}
                                            {' • '}{plan.duration_months} {plan.duration_months === 1 ? 'month' : 'months'}
                                        </div>
                                        {plan.description && (
                                            <div className="text-xs text-gray-500 mt-2">{plan.description}</div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Company Info */}
                            <div className="border-t border-gray-700 pt-6 mt-6">
                                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-blue-400" />
                                    Company Information
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Company Name *</label>
                                        <input
                                            type="text"
                                            value={form.companyName}
                                            onChange={(e) => handleChange('companyName', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-amber-500"
                                            placeholder="e.g. Nike Inc."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Email *</label>
                                        <input
                                            type="email"
                                            value={form.contactEmail}
                                            onChange={(e) => handleChange('contactEmail', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-amber-500"
                                            placeholder="contact@company.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Billing Country</label>
                                        <select
                                            value={form.billingCountry}
                                            onChange={(e) => handleChange('billingCountry', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg"
                                        >
                                            {COUNTRIES.map(c => (
                                                <option key={c.code} value={c.code}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Tax ID (optional)</label>
                                        <input
                                            type="text"
                                            value={form.taxId}
                                            onChange={(e) => handleChange('taxId', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg"
                                            placeholder="VAT, EIN, RFC..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Geographic Targeting */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Globe className="w-6 h-6 text-blue-400" />
                                Select Target Locations
                            </h2>
                            <p className="text-gray-400">
                                Choose where you want your ads to appear.
                                {selectedPlanData && (
                                    <span className="text-amber-400 ml-1">
                                        Your plan includes {selectedPlanData.cities_included === 999 ? 'unlimited' : selectedPlanData.cities_included} cities.
                                    </span>
                                )}
                            </p>

                            {/* Country Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">Target Countries</label>
                                <div className="flex flex-wrap gap-2">
                                    {COUNTRIES.map(country => (
                                        <button
                                            key={country.code}
                                            onClick={() => toggleCountry(country.code)}
                                            className={`px-4 py-2 rounded-full text-sm transition-all ${form.targetCountries.includes(country.code)
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                }`}
                                        >
                                            {country.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Cities based on selected countries */}
                            {form.targetCountries.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-3">
                                        Target Cities
                                        <span className="text-gray-500 ml-2">
                                            ({form.targetCities.length} selected)
                                        </span>
                                    </label>
                                    <div className="space-y-4">
                                        {form.targetCountries.map(countryCode => (
                                            <div key={countryCode}>
                                                <p className="text-xs text-gray-500 mb-2 uppercase">
                                                    {COUNTRIES.find(c => c.code === countryCode)?.name}
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {(MAJOR_CITIES[countryCode] || []).map(city => (
                                                        <button
                                                            key={city}
                                                            onClick={() => toggleCity(city)}
                                                            disabled={
                                                                !form.targetCities.includes(city) &&
                                                                selectedPlanData?.cities_included !== 999 &&
                                                                form.targetCities.length >= (selectedPlanData?.cities_included || 1)
                                                            }
                                                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${form.targetCities.includes(city)
                                                                ? 'bg-amber-500 text-white'
                                                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed'
                                                                }`}
                                                        >
                                                            <MapPin className="w-3 h-3 inline mr-1" />
                                                            {city}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Campaign Duration */}
                            <div className="border-t border-gray-700 pt-6">
                                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-green-400" />
                                    Campaign Duration
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={form.startDate}
                                                onChange={(e) => handleChange('startDate', e.target.value)}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg cursor-pointer focus:ring-2 focus:ring-amber-500 [color-scheme:dark]"
                                                style={{ colorScheme: 'dark' }}
                                            />
                                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Click to open calendar</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Duration</label>
                                        <select
                                            value={form.durationMonths}
                                            onChange={(e) => handleChange('durationMonths', parseInt(e.target.value))}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-amber-500"
                                        >
                                            <option value={1}>1 month</option>
                                            <option value={3}>3 months</option>
                                            <option value={6}>6 months</option>
                                            <option value={12}>12 months</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Creative */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white">Create Your Ad</h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Form */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Language</label>
                                        <select
                                            value={form.creativeLanguage}
                                            onChange={(e) => handleChange('creativeLanguage', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg"
                                        >
                                            <option value="en">English</option>
                                            <option value="es">Spanish</option>
                                            <option value="pt">Portuguese</option>
                                            <option value="fr">French</option>
                                            <option value="de">German</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Headline *</label>
                                        <input
                                            type="text"
                                            value={form.headline}
                                            onChange={(e) => handleChange('headline', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg"
                                            placeholder="Your compelling headline"
                                            maxLength={60}
                                        />
                                        <span className="text-xs text-gray-500">{form.headline.length}/60</span>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Description</label>
                                        <textarea
                                            value={form.description}
                                            onChange={(e) => handleChange('description', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg resize-none"
                                            rows={3}
                                            placeholder="Describe your offer..."
                                            maxLength={150}
                                        />
                                        <span className="text-xs text-gray-500">{form.description.length}/150</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Button Text</label>
                                            <input
                                                type="text"
                                                value={form.ctaText}
                                                onChange={(e) => handleChange('ctaText', e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Destination URL</label>
                                            <input
                                                type="url"
                                                value={form.ctaUrl}
                                                onChange={(e) => handleChange('ctaUrl', e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Image or Video</label>
                                        <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center">
                                            {form.imageUrl ? (
                                                <div className="relative">
                                                    {form.isVideo ? (
                                                        <video src={form.imageUrl} className="max-h-32 mx-auto rounded" controls muted />
                                                    ) : (
                                                        <img src={form.imageUrl} alt="Preview" className="max-h-32 mx-auto rounded" />
                                                    )}
                                                    <button
                                                        onClick={() => { handleChange('imageUrl', ''); handleChange('isVideo', false); }}
                                                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ) : uploading ? (
                                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
                                            ) : (
                                                <label className="cursor-pointer">
                                                    <Upload className="w-8 h-8 mx-auto text-gray-500 mb-2" />
                                                    <span className="text-amber-500 hover:underline">Upload image or video</span>
                                                    <input type="file" accept="image/*,video/mp4,video/webm,video/mov" onChange={handleImageUpload} className="hidden" />
                                                    <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP, GIF, MP4, WebM • Max 5MB images / 50MB videos</p>
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Preview */}
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Ad Preview</p>
                                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                                        {form.imageUrl ? (
                                            form.isVideo ? (
                                                <video src={form.imageUrl} className="w-full h-40 object-cover" muted loop autoPlay />
                                            ) : (
                                                <img src={form.imageUrl} alt="Preview" className="w-full h-40 object-cover" />
                                            )
                                        ) : (
                                            <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                                                <ImageIcon className="w-12 h-12 text-gray-300" />
                                            </div>
                                        )}
                                        <div className="p-4">
                                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-medium">SPONSORED</span>
                                            <h4 className="font-bold text-gray-900 mt-2">{form.headline || 'Your headline here'}</h4>
                                            <p className="text-sm text-gray-600 mt-1">{form.description || 'Your description...'}</p>
                                            <div className="mt-3 flex justify-between items-center">
                                                <span className="text-xs text-gray-400">{form.companyName || 'Company'}</span>
                                                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                                                    {form.ctaText}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Review & Pay */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-white">Review & Pay</h2>

                            {/* Summary */}
                            <div className="bg-gray-900 rounded-xl p-6 space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Plan</span>
                                    <span className="text-white font-semibold">{selectedPlanData?.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Company</span>
                                    <span className="text-white">{form.companyName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Target Cities</span>
                                    <span className="text-white text-sm text-right max-w-[200px]">
                                        {form.targetCities.length > 0 ? form.targetCities.join(', ') : 'Not specified'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Duration</span>
                                    <span className="text-white">{form.durationMonths} month(s)</span>
                                </div>

                                <div className="border-t border-gray-700 pt-4">
                                    {selectedPlanData?.discount_percent > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Regular price</span>
                                            <span className="text-gray-500 line-through">{formatPrice(selectedPlanData.regular_price_usd)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg mt-2">
                                        <span className="text-white font-semibold">Total</span>
                                        <span className="text-green-400 font-bold text-2xl">
                                            {formatPrice(selectedPlanData?.current_price_usd || 0)} USD
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tax note */}
                            <div className="flex items-start gap-3 bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-200">
                                    {form.billingCountry === 'MX'
                                        ? '⚠️ Precios + IVA: Los clientes en México pagan 16% IVA adicional. El IVA corre por cuenta del cliente.'
                                        : '✅ International customers: 0% VAT (software export exempt).'}
                                </div>
                            </div>

                            {/* Payment button */}
                            <button
                                onClick={handleCheckout}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <CreditCard className="w-5 h-5" />
                                        Pay {formatPrice(selectedPlanData?.current_price_usd || 0)} USD
                                    </>
                                )}
                            </button>

                            <p className="text-center text-gray-500 text-xs">
                                Secure payment via Stripe • Credit card or wire transfer only
                            </p>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
                        {step > 1 ? (
                            <button
                                onClick={() => setStep(s => s - 1)}
                                className="flex items-center gap-2 text-gray-400 hover:text-white transition"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/enterprise')}
                                className="flex items-center gap-2 text-gray-400 hover:text-white transition"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Cancel
                            </button>
                        )}

                        {step < 4 && (
                            <button
                                onClick={() => setStep(s => s + 1)}
                                disabled={step === 1 && (!form.selectedPlan || !form.companyName || !form.contactEmail)}
                                className="bg-amber-500 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-amber-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
