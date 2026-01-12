import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Componente que fuerza el scroll al inicio (top) cada vez que cambia la ruta.
 * Útil para SPAs donde el scroll se mantiene entre navegaciones.
 */
function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Forzamos el scroll al inicio (0,0) de forma inmediata
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant", // Usamos instant para que el usuario no vea el salto
        });
    }, [pathname]);

    return null;
}

export default ScrollToTop;
