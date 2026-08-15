import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Check, Eye, EyeOff, Lock, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [sessionStatus, setSessionStatus] = useState('checking');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [validations, setValidations] = useState({
        minLength: false,
        hasNumber: false,
        hasLowercase: false,
        hasUppercase: false,
        passwordsMatch: false
    });

    useEffect(() => {
        let active = true;
        let timeoutId;

        const markReady = (session) => {
            if (!active || !session) return;
            clearTimeout(timeoutId);
            setSessionStatus('ready');
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                markReady(session);
            }
        });

        supabase.auth.getSession()
            .then(({ data: { session }, error }) => {
                if (!active) return;
                if (error) throw error;
                if (session) markReady(session);
            })
            .catch((error) => {
                console.error('Error validating recovery session:', error);
                if (active) setSessionStatus('invalid');
            });

        timeoutId = setTimeout(() => {
            if (active) {
                setSessionStatus((current) => current === 'ready' ? current : 'invalid');
            }
        }, 5000);

        return () => {
            active = false;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const { password, confirmPassword } = formData;

        setValidations({
            minLength: password.length >= 8,
            hasNumber: /\d/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasUppercase: /[A-Z]/.test(password),
            passwordsMatch: password === confirmPassword && password.length > 0
        });
    }, [formData]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((previous) => ({ ...previous, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (sessionStatus !== 'ready') {
            toast.error('El enlace de recuperación no es válido o expiró');
            return;
        }

        if (!Object.values(validations).every(Boolean)) {
            toast.error('La contraseña no cumple con todos los requisitos');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password: formData.password });
            if (error) throw error;

            const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
            if (signOutError) {
                console.warn('Password updated but local sign out failed:', signOutError);
            }

            toast.success('¡Contraseña actualizada exitosamente!');
            setTimeout(() => navigate('/login'), 1500);
        } catch (error) {
            console.error('Error updating password:', error);
            toast.error(error.message || 'Error al actualizar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    const ValidationItem = ({ valid, text }) => (
        <div className={`flex items-center gap-2 text-xs ${valid ? 'text-green-600' : 'text-gray-500'}`}>
            {valid ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            <span>{text}</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <Link to="/welcome" className="inline-block mb-4">
                        <img
                            src="/images/geobooker-logo.png"
                            alt="Geobooker"
                            className="h-16 w-auto mx-auto"
                        />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Nueva contraseña
                    </h1>
                    <p className="text-gray-600">
                        Crea una contraseña segura para tu cuenta
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {sessionStatus === 'checking' && (
                        <div className="py-8 text-center" role="status">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4" />
                            <p className="text-gray-600">Validando el enlace de recuperación…</p>
                        </div>
                    )}

                    {sessionStatus === 'invalid' && (
                        <div className="py-4 text-center" role="alert">
                            <X className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                Enlace no válido o expirado
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Solicita un nuevo correo para restablecer tu contraseña.
                            </p>
                            <Link
                                to="/forgot-password"
                                className="inline-flex justify-center rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                            >
                                Solicitar otro enlace
                            </Link>
                        </div>
                    )}

                    {sessionStatus === 'ready' && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">
                                    Nueva contraseña
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        autoComplete="new-password"
                                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                        placeholder="Ingresa tu nueva contraseña"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-gray-700 font-medium mb-2">
                                    Confirmar contraseña
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        autoComplete="new-password"
                                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                        placeholder="Confirma tu nueva contraseña"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                        aria-label={showConfirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                    Tu contraseña debe cumplir con:
                                </p>
                                <ValidationItem valid={validations.minLength} text="Mínimo 8 caracteres" />
                                <ValidationItem valid={validations.hasLowercase} text="Al menos una letra minúscula" />
                                <ValidationItem valid={validations.hasUppercase} text="Al menos una letra mayúscula" />
                                <ValidationItem valid={validations.hasNumber} text="Al menos un número" />
                                <ValidationItem valid={validations.passwordsMatch} text="Las contraseñas coinciden" />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !Object.values(validations).every(Boolean)}
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Actualizando…' : 'Actualizar contraseña'}
                            </button>
                        </form>
                    )}
                </div>

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-blue-600 hover:underline text-sm">
                        ← Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
