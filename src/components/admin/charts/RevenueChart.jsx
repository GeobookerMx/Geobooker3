// src/components/admin/charts/RevenueChart.jsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DollarSign } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

export default function RevenueChart({ data, totalRevenue }) {
    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Ingresos por Espacio Publicitario
            </h3>

            {data.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    No hay datos de ingresos todavía
                </div>
            ) : (
                <>
                    <div className="mb-4 text-center">
                        <div className="text-3xl font-bold text-gray-900">
                            ${totalRevenue.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Total de Ingresos</div>
                    </div>

                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) => `$${value.toLocaleString()}`}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </>
            )}
        </div>
    );
}
