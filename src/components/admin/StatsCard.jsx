// src/components/admin/StatsCard.jsx
import React from 'react';

const StatsCard = ({ title, value, icon: Icon, trend, trendValue, color = 'blue' }) => {
    const colorClasses = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500',
        red: 'bg-red-500'
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    {trend && (
                        <p className={`text-sm mt-2 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {trend === 'up' ? '↑' : '↓'} {trendValue}
                        </p>
                    )}
                </div>
                <div className={`${colorClasses[color]} p-4 rounded-full`}>
                    <Icon className="w-8 h-8 text-white" />
                </div>
            </div>
        </div>
    );
};

export default StatsCard;
