// src/pages/admin/UsersPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Users,
    Search,
    Filter,
    Mail,
    Calendar,
    Shield,
    Ban,
    CheckCircle,
    Edit,
    Trash2
} from 'lucide-react';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        admins: 0
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);

            // Cargar usuarios de auth.users
            const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

            if (authError) throw authError;

            // Cargar perfiles adicionales si existen
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*');

            // Cargar admins
            const { data: admins } = await supabase
                .from('admin_users')
                .select('*');

            // Combinar datos
            const combinedUsers = authUsers.users.map(user => {
                const profile = profiles?.find(p => p.id === user.id);
                const isAdmin = admins?.some(a => a.id === user.id);

                return {
                    id: user.id,
                    email: user.email,
                    created_at: user.created_at,
                    last_sign_in: user.last_sign_in_at,
                    confirmed: user.email_confirmed_at !== null,
                    isAdmin,
                    ...profile
                };
            });

            setUsers(combinedUsers);

            // Calcular stats
            setStats({
                total: combinedUsers.length,
                active: combinedUsers.filter(u => u.last_sign_in).length,
                inactive: combinedUsers.filter(u => !u.last_sign_in).length,
                admins: admins?.length || 0
            });

            setLoading(false);
        } catch (error) {
            console.error('Error loading users:', error);
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter =
            filterStatus === 'all' ? true :
                filterStatus === 'active' ? user.last_sign_in :
                    filterStatus === 'inactive' ? !user.last_sign_in :
                        filterStatus === 'admins' ? user.isAdmin : true;

        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
                <p className="text-gray-600 mt-1">Administra las cuentas de usuario</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatsCard title="Total Usuarios" value={stats.total} icon={Users} color="blue" />
                <StatsCard title="Activos" value={stats.active} icon={CheckCircle} color="green" />
                <StatsCard title="Inactivos" value={stats.inactive} icon={Ban} color="orange" />
                <StatsCard title="Administradores" value={stats.admins} icon={Shield} color="purple" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                        >
                            <option value="all">Todos</option>
                            <option value="active">Activos</option>
                            <option value="inactive">Inactivos</option>
                            <option value="admins">Administradores</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Registro</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Último Acceso</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron usuarios
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                <span className="font-medium text-gray-900">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.isAdmin ? (
                                                <span className="flex items-center gap-1 text-purple-600 font-semibold">
                                                    <Shield className="w-4 h-4" />
                                                    Admin
                                                </span>
                                            ) : (
                                                <span className="text-gray-600">Usuario</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.confirmed ? (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                                    Confirmado
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                                                    Pendiente
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {new Date(user.created_at).toLocaleDateString('es-MX')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {user.last_sign_in ? new Date(user.last_sign_in).toLocaleDateString('es-MX') : 'Nunca'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Results Count */}
            <div className="text-center text-sm text-gray-600">
                Mostrando {filteredUsers.length} de {users.length} usuarios
            </div>
        </div>
    );
}

function StatsCard({ title, value, icon: Icon, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        purple: 'bg-purple-50 text-purple-600',
    };

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`p-3 rounded-full ${colors[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}
