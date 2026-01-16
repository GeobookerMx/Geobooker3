import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RedirectToMarketing = () => {
    const navigate = useNavigate();
    useEffect(() => {
        navigate('/admin/marketing', { replace: true });
    }, [navigate]);
    return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-gray-800">Actualizando a la nueva plataforma...</h2>
                <p className="text-gray-500">Estamos moviendo tus herramientas de marketing a un solo lugar.</p>
            </div>
        </div>
    );
};

export default RedirectToMarketing;
