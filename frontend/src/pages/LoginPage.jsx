import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TextInput,
    PasswordInput,
    Button,
    Text,
    Title,
    Stack,
    Group,
    ActionIcon,
    Divider,
    Box,
} from '@mantine/core';
import {
    // IconBrandGoogle,
    // IconBrandWindows,
    // IconBrandApple,
} from '@tabler/icons-react';
import './LoginPage.css';

export default function LoginPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`https://${window.location.hostname}:5263/api/users/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('user', JSON.stringify(data));
                navigate('/');
            } else {
                const errorData = await response.text();
                setError(errorData || 'Credenciales inválidas');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
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
                    Bienvenido
                </Title>
                <Text size="sm" c="dimmed" ta="center" mb="xl">
                    Sistema Unificado de Producción
                </Text>

                <form onSubmit={handleSubmit}>
                    <Stack gap="md">
                        {error && (
                            <Text c="red" size="sm" ta="center" fw={500}>
                                {error}
                            </Text>
                        )}
                        <TextInput
                            label="Usuario"
                            placeholder="Introduce tu usuario"
                            size="md"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.currentTarget.value)}
                            styles={{
                                input: {
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                },
                                label: { color: '#94a3b8', marginBottom: 6 },
                            }}
                        />
                        <PasswordInput
                            label="Contraseña"
                            placeholder="••••••••"
                            size="md"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.currentTarget.value)}
                            styles={{
                                input: {
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                },
                                label: { color: '#94a3b8', marginBottom: 6 },
                                innerInput: { color: 'white' },
                            }}
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
            </div>
        </div>
    );
}
