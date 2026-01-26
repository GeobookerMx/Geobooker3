import React from 'react';

const PageLoader = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
            <p className="text-gray-500 font-medium animate-pulse">Cargando...</p>
        </div>
    );
};

export default PageLoader;
