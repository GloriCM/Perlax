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
    IconBrandGoogle,
    IconBrandWindows,
    IconBrandApple,
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
                        src="/Perlax-sinFondo.png"
                        alt="Perlax Logo"
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
                            label="Correo Electrónico"
                            placeholder="admin@perla.com"
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

                <Divider
                    label="o continúa con"
                    labelPosition="center"
                    my="lg"
                    styles={{
                        label: { color: '#64748b', fontSize: 12 },
                        root: { borderColor: 'rgba(255,255,255,0.1)' },
                    }}
                />

                <Group justify="center" gap="md">
                    <ActionIcon
                        variant="subtle"
                        size="xl"
                        radius="md"
                        className="social-icon"
                    >
                        <IconBrandGoogle size={22} />
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        size="xl"
                        radius="md"
                        className="social-icon"
                    >
                        <IconBrandWindows size={22} />
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        size="xl"
                        radius="md"
                        className="social-icon"
                    >
                        <IconBrandApple size={22} />
                    </ActionIcon>
                </Group>
            </div>
        </div>
    );
}
