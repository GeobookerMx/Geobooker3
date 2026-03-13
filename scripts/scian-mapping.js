export const mapScianToGeobooker = (codigoScian, nombreActividad) => {
    // Convierte a string por si acaso
    const scian = String(codigoScian);
    const activity = String(nombreActividad).toLowerCase();

    // 1. Restaurantes y Comida (722: Servicios de preparación de alimentos y bebidas)
    if (scian.startsWith('722')) {
        if (activity.includes('bar') || activity.includes('cantina') || activity.includes('cerve') || activity.includes('centro nocturno')) {
            return { category: 'bares', subcategory: activity };
        }
        if (activity.includes('cafeter') || activity.includes('café')) {
            return { category: 'cafeterias', subcategory: activity };
        }
        return { category: 'restaurantes', subcategory: activity };
    }

    // Alojamiento (721)
    if (scian.startsWith('721')) {
        return { category: 'hoteles', subcategory: activity };
    }

    // 2. Salud y Belleza (62: Salud, 8121: Belleza)
    if (scian.startsWith('62')) {
        if (activity.includes('dental') || activity.includes('dentista')) return { category: 'salud', subcategory: 'dentista' };
        if (activity.includes('farmacia')) return { category: 'salud', subcategory: 'farmacia' };
        if (activity.includes('hospital') || activity.includes('clínica')) return { category: 'salud', subcategory: 'hospital' };
        return { category: 'salud', subcategory: activity };
    }
    if (scian.startsWith('8121')) { // Salones y clínicas de belleza
        if (activity.includes('barber')) return { category: 'salud', subcategory: 'barberia' };
        return { category: 'salud', subcategory: 'belleza' };
    }

    // 3. Tiendas y Comercio (46: Menor, 43: Mayor)
    if (scian.startsWith('46') || scian.startsWith('43')) {
        if (activity.includes('abarrote') || activity.includes('minisúper')) return { category: 'tiendas', subcategory: 'abarrotes' };
        if (activity.includes('ropa') || activity.includes('zapato')) return { category: 'tiendas', subcategory: 'ropa_calzado' };
        if (activity.includes('ferreter')) return { category: 'hogar_autos', subcategory: 'ferreteria' };
        if (activity.includes('papeler')) return { category: 'tiendas', subcategory: 'papeleria' };
        return { category: 'tiendas', subcategory: activity };
    }

    // 4. Educación (61)
    if (scian.startsWith('61')) {
        return { category: 'educacion', subcategory: activity };
    }

    // 5. Entretenimiento (71)
    if (scian.startsWith('71')) {
        if (activity.includes('gimnasio') || activity.includes('deport')) return { category: 'entretenimiento', subcategory: 'gimnasio' };
        return { category: 'entretenimiento', subcategory: activity };
    }

    // 6. Hogar, Reparaciones y Autos (811: Reparación y mantenimiento)
    if (scian.startsWith('811')) {
        if (activity.includes('mecánic') || activity.includes('automotriz') || activity.includes('llanta')) {
            return { category: 'hogar_autos', subcategory: 'mecanico' };
        }
        return { category: 'hogar_autos', subcategory: activity };
    }

    // 7. Servicios Profesionales y Financieros (54, 52, 53)
    if (scian.startsWith('54') || scian.startsWith('52') || scian.startsWith('53')) {
        if (activity.includes('abogad') || activity.includes('legal')) return { category: 'servicios', subcategory: 'legal' };
        if (activity.includes('contad') || activity.includes('contable')) return { category: 'servicios', subcategory: 'contable' };
        if (activity.includes('inmobiliar') || activity.includes('bienes raíces')) return { category: 'servicios', subcategory: 'inmobiliaria' };
        return { category: 'servicios', subcategory: activity };
    }

    // Default genérico
    return { category: 'servicios', subcategory: activity };
};
