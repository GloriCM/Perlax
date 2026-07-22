import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getDefaultPostLoginPath } from '../utils/permissions';
import {
    TextInput,
    PasswordInput,
    Button,
    Text,
    Title,
    Stack,
} from '@mantine/core';
import './LoginPage.css';

function persistUser(data) {
    localStorage.setItem('user', JSON.stringify(data));
}

export default function LoginPage() {
    const navigate = useNavigate();
    const currentPasswordRef = useRef('');
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState(null);
    const [mustChangePassword, setMustChangePassword] = useState(() => {
        try {
            const raw = localStorage.getItem('user');
            const u = raw ? JSON.parse(raw) : null;
            return !!(u?.mustChangePassword ?? u?.MustChangePassword);
        } catch {
            return false;
        }
    });

    const finishLogin = (data) => {
        persistUser(data);
        const needsChange = !!(data.mustChangePassword ?? data.MustChangePassword);
        if (needsChange) {
            setMustChangePassword(true);
            setNewPassword('');
            setConfirmPassword('');
            return;
        }
        setMustChangePassword(false);
        currentPasswordRef.current = '';
        navigate(getDefaultPostLoginPath(data));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const data = await api.post('/users/auth/login', { username, password });
            if (data) {
                currentPasswordRef.current = password;
                finishLogin(data);
                return;
            }
            setError('No se pudo iniciar sesión. Verifique usuario y contraseña.');
        } catch (err) {
            setError(err.message || 'Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (newPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.');
            setLoading(false);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('La confirmación no coincide con la nueva contraseña.');
            setLoading(false);
            return;
        }

        const current = currentPasswordRef.current || password || username;
        if (newPassword === current || newPassword === username) {
            setError('La nueva contraseña no puede ser igual a la cédula / contraseña temporal.');
            setLoading(false);
            return;
        }

        try {
            const data = await api.post('/users/auth/change-password', {
                currentPassword: current,
                newPassword,
            });
            if (data) {
                finishLogin({ ...data, mustChangePassword: false, MustChangePassword: false });
                return;
            }
            setError('No se pudo cambiar la contraseña.');
        } catch (err) {
            setError(err.message || 'Error al cambiar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    const inputStyles = {
        input: {
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
        },
        label: { color: '#94a3b8', marginBottom: 6 },
        innerInput: { color: 'white' },
    };

    return (
        <div className="login-wrapper">
            <div className="login-card glass-card">
                <div className="login-logo-wrapper">
                    <img
                        src="/Nuevo-perla-Sinfondo.png"
                        alt="PerlaLogo"
                        className="login-logo"
                        style={{ maxHeight: '120px', width: 'auto', objectFit: 'contain' }}
                    />
                </div>

                <Title order={2} ta="center" mt="sm" mb={4} fw={600} c="white">
                    {mustChangePassword ? 'Cambiar contraseña' : 'Bienvenido'}
                </Title>
                <Text size="sm" c="dimmed" ta="center" mb="xl">
                    {mustChangePassword
                        ? 'Por seguridad, defina una contraseña distinta a su cédula antes de continuar.'
                        : 'Sistema Unificado de Producción'}
                </Text>

                {mustChangePassword ? (
                    <form onSubmit={handleChangePassword}>
                        <Stack gap="md">
                            {error && (
                                <Text c="red" size="sm" ta="center" fw={500}>
                                    {error}
                                </Text>
                            )}
                            {!currentPasswordRef.current && (
                                <PasswordInput
                                    label="Contraseña temporal (cédula)"
                                    placeholder="••••••••"
                                    size="md"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.currentTarget.value)}
                                    styles={inputStyles}
                                />
                            )}
                            <PasswordInput
                                label="Nueva contraseña"
                                placeholder="Mínimo 6 caracteres"
                                size="md"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.currentTarget.value)}
                                styles={inputStyles}
                            />
                            <PasswordInput
                                label="Confirmar nueva contraseña"
                                placeholder="Repita la nueva contraseña"
                                size="md"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                                styles={inputStyles}
                            />
                            <Button
                                type="submit"
                                fullWidth
                                size="lg"
                                loading={loading}
                                mt="sm"
                                styles={{
                                    root: {
                                        background: '#6366f1',
                                        boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                                    },
                                }}
                            >
                                Guardar y continuar
                            </Button>
                        </Stack>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <Stack gap="md">
                            {error && (
                                <Text c="red" size="sm" ta="center" fw={500}>
                                    {error}
                                </Text>
                            )}
                            <TextInput
                                label="Usuario (cédula)"
                                placeholder="Número de cédula"
                                size="md"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.currentTarget.value)}
                                styles={inputStyles}
                            />
                            <PasswordInput
                                label="Contraseña"
                                placeholder="••••••••"
                                size="md"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.currentTarget.value)}
                                styles={inputStyles}
                            />
                            <Button
                                type="submit"
                                fullWidth
                                size="lg"
                                loading={loading}
                                mt="sm"
                                styles={{
                                    root: {
                                        background: '#6366f1',
                                        boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                                        transition: 'transform 0.2s, background 0.3s',
                                        '&:hover': {
                                            background: '#4f46e5',
                                            transform: 'translateY(-2px)',
                                        },
                                    },
                                }}
                            >
                                Entrar
                            </Button>
                        </Stack>
                    </form>
                )}
            </div>
        </div>
    );
}
