// src/components/admin/charts/SpacePerformanceChart.jsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SpacePerformanceChart({ data }) {
    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
                🎯 Rendimiento por Espacio Publicitario
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="space_name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="impressions" fill="#3B82F6" name="Impresiones" />
                    <Bar dataKey="clicks" fill="#10B981" name="Clics" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
