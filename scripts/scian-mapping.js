export const mapScianToGeobooker = (codigoScian, nombreActividad) => {
    const scian = String(codigoScian);
    const activity = String(nombreActividad).toLowerCase();

    // 1. Restaurantes y Comida (722)
    if (scian.startsWith('722') || activity.includes('restaur') || activity.includes('fonda') || activity.includes('comedor') || activity.includes('taqueria') || activity.includes('taquería') || activity.includes('loncheria') || activity.includes('lonchería')) {
        if (activity.includes('bar') || activity.includes('cantina') || activity.includes('cerve') || activity.includes('centro nocturno') || activity.includes('discote')) {
            return { category: 'bares', subcategory: activity };
        }
        if (activity.includes('cafeter') || activity.includes('café') || activity.includes('cafe ') || activity.includes('pasteleria') || activity.includes('pastelería')) {
            return { category: 'cafeterias', subcategory: activity };
        }
        return { category: 'restaurantes', subcategory: activity };
    }

    // Panaderías y pastelerías (311)
    if (scian.startsWith('311') || activity.includes('panader') || activity.includes('pasteleria') || activity.includes('pastelería')) {
        return { category: 'restaurantes', subcategory: 'panaderia' };
    }

    // Bares y cantinas sin código SCIAN (detectar por nombre)
    if (activity.includes('bar ') || activity.includes('cantina') || activity.includes('cerveceria') || activity.includes('cervecería') || activity.includes('mezcaleria') || activity.includes('pulqueria')) {
        return { category: 'bares', subcategory: activity };
    }

    // Alojamiento (721)
    if (scian.startsWith('721') || activity.includes('hotel') || activity.includes('motel') || activity.includes('hostal') || activity.includes('posada') || activity.includes('airbnb')) {
        return { category: 'hoteles', subcategory: activity };
    }

    // 2. Salud (62) y Belleza (8121)
    if (scian.startsWith('62') || activity.includes('clínica') || activity.includes('clinica') || activity.includes('hospital') || activity.includes('consultorio') || activity.includes('médico') || activity.includes('medico')) {
        if (activity.includes('dental') || activity.includes('dentista') || activity.includes('odontolog')) return { category: 'salud', subcategory: 'dentista' };
        if (activity.includes('farmacia') || activity.includes('botica') || activity.includes('drogueria')) return { category: 'salud', subcategory: 'farmacia' };
        if (activity.includes('hospital') || activity.includes('clínica') || activity.includes('clinica')) return { category: 'salud', subcategory: 'hospital' };
        if (activity.includes('veterinar')) return { category: 'salud', subcategory: 'veterinaria' };
        if (activity.includes('óptica') || activity.includes('optica')) return { category: 'salud', subcategory: 'optica' };
        return { category: 'salud', subcategory: activity };
    }
    if (scian.startsWith('8121') || activity.includes('salon de bell') || activity.includes('salón de bell') || activity.includes('estetica') || activity.includes('estética') || activity.includes('spa') || activity.includes('barber')) {
        if (activity.includes('barber')) return { category: 'belleza', subcategory: 'barberia' };
        return { category: 'belleza', subcategory: 'salon' };
    }
    // Farmacias sin código SCIAN
    if (activity.includes('farmacia') || activity.includes('botica')) {
        return { category: 'salud', subcategory: 'farmacia' };
    }

    // 3. Gasolineras (468)
    if (scian.startsWith('468') || activity.includes('gasoliner') || activity.includes('expendio de gasolina') || activity.includes('pemex') || activity.includes('gas natural') || activity.includes('bp ') || activity.includes('shell ')) {
        return { category: 'gasolineras', subcategory: 'gasolinera' };
    }

    // 4. Bancos y Servicios Financieros (52)
    if (scian.startsWith('52') || activity.includes('banco ') || activity.includes('cajero') || activity.includes('bbva') || activity.includes('banamex') || activity.includes('santander') || activity.includes('banorte') || activity.includes('inbursa') || activity.includes('hsbc') || activity.includes('scotiabank') || activity.includes('caja popular') || activity.includes('cooperativa')) {
        if (activity.includes('cajero autom') || activity.includes('atm')) return { category: 'bancos', subcategory: 'cajero' };
        if (activity.includes('seguros') || activity.includes('aseguradora')) return { category: 'servicios', subcategory: 'seguros' };
        if (activity.includes('casa de cambio') || activity.includes('divisas')) return { category: 'bancos', subcategory: 'casa_de_cambio' };
        return { category: 'bancos', subcategory: 'banco' };
    }

    // 5. Tiendas y Comercio (46: Menor, 43: Mayor)
    if (scian.startsWith('46') || scian.startsWith('43')) {
        if (activity.includes('supermer') || activity.includes('supermercado') || activity.includes('walmart') || activity.includes('chedraui') || activity.includes('soriana') || activity.includes('oxxo') || activity.includes('seven') || activity.includes('7-eleven')) {
            return { category: 'tiendas', subcategory: 'supermercado' };
        }
        if (activity.includes('abarrote') || activity.includes('minisúper') || activity.includes('minisuper') || activity.includes('miscelánea') || activity.includes('miscelanea')) {
            return { category: 'tiendas', subcategory: 'abarrotes' };
        }
        if (activity.includes('ropa') || activity.includes('zapato') || activity.includes('calzado') || activity.includes('boutique')) {
            return { category: 'tiendas', subcategory: 'ropa_calzado' };
        }
        if (activity.includes('ferreter') || activity.includes('tlapaleria') || activity.includes('tlapalería')) {
            return { category: 'hogar_autos', subcategory: 'ferreteria' };
        }
        if (activity.includes('papeler') || activity.includes('libreria') || activity.includes('librería')) {
            return { category: 'tiendas', subcategory: 'papeleria' };
        }
        if (activity.includes('farmacia') || activity.includes('botica')) {
            return { category: 'salud', subcategory: 'farmacia' };
        }
        if (activity.includes('elect') || activity.includes('tecnolog') || activity.includes('cómputo') || activity.includes('computo') || activity.includes('celular')) {
            return { category: 'tiendas', subcategory: 'electronica' };
        }
        return { category: 'tiendas', subcategory: activity };
    }

    // 6. Educación (61)
    if (scian.startsWith('61') || activity.includes('escuela') || activity.includes('colegio') || activity.includes('universidad') || activity.includes('academia') || activity.includes('instituto') || activity.includes('preescolar') || activity.includes('kinder')) {
        return { category: 'educacion', subcategory: activity };
    }

    // 7. Entretenimiento (71)
    if (scian.startsWith('71') || activity.includes('gimnasio') || activity.includes('deportivo') || activity.includes('cine') || activity.includes('teatro') || activity.includes('museo')) {
        if (activity.includes('gimnasio') || activity.includes('deport') || activity.includes('crossfit') || activity.includes('yoga') || activity.includes('pilates')) {
            return { category: 'entretenimiento', subcategory: 'gimnasio' };
        }
        if (activity.includes('cine') || activity.includes('teatro') || activity.includes('auditorio')) {
            return { category: 'entretenimiento', subcategory: 'cine_teatro' };
        }
        return { category: 'entretenimiento', subcategory: activity };
    }

    // 8. Hogar, Reparaciones y Autos (811)
    if (scian.startsWith('811') || activity.includes('mecánic') || activity.includes('mecanica') || activity.includes('taller') || activity.includes('llantazo') || activity.includes('vulcanizadora')) {
        if (activity.includes('mecánic') || activity.includes('mecanica') || activity.includes('automotriz') || activity.includes('llanta') || activity.includes('vulcani') || activity.includes('taller auto')) {
            return { category: 'hogar_autos', subcategory: 'mecanico' };
        }
        if (activity.includes('lavado') || activity.includes('autolavado')) {
            return { category: 'hogar_autos', subcategory: 'autolavado' };
        }
        return { category: 'hogar_autos', subcategory: activity };
    }

    // Agencias de autos
    if (activity.includes('agencia') && (activity.includes('auto') || activity.includes('vehículo') || activity.includes('vehiculo') || activity.includes('carro'))) {
        return { category: 'hogar_autos', subcategory: 'agencia_autos' };
    }

    // 9. Servicios Profesionales (54, 53)
    if (scian.startsWith('54') || scian.startsWith('53')) {
        if (activity.includes('abogad') || activity.includes('legal') || activity.includes('notari') || activity.includes('despacho jurídico')) return { category: 'servicios', subcategory: 'legal' };
        if (activity.includes('contad') || activity.includes('contable') || activity.includes('fiscal') || activity.includes('despacho contable')) return { category: 'servicios', subcategory: 'contable' };
        if (activity.includes('inmobiliar') || activity.includes('bienes raíces') || activity.includes('bienes raices')) return { category: 'servicios', subcategory: 'inmobiliaria' };
        if (activity.includes('arquitect') || activity.includes('ingeniería') || activity.includes('ingenieria') || activity.includes('constructora')) return { category: 'servicios', subcategory: 'construccion' };
        return { category: 'servicios', subcategory: activity };
    }

    // Default genérico
    return { category: 'servicios', subcategory: activity };
};

