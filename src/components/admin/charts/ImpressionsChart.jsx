// src/components/admin/charts/ImpressionsChart.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ImpressionsChart({ data }) {
    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
                📈 Impresiones en los Últimos 7 Días
            </h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="impressions"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        name="Impresiones"
                    />
                    <Line
                        type="monotone"
                        dataKey="clicks"
                        stroke="#10B981"
                        strokeWidth={2}
                        name="Clics"
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
