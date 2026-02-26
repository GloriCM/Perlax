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

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => navigate('/'), 800);
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
                        <TextInput
                            label="Usuario"
                            placeholder="Introduce tu usuario"
                            size="md"
                            required
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
