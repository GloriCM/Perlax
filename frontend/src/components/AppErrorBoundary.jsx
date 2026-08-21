import React from 'react';
import { Alert, Button, Group, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error) {
        // Mantener el error visible en consola para diagnóstico.
        console.error('Error de render capturado por AppErrorBoundary:', error);
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <Stack align="center" justify="center" style={{ minHeight: '100vh' }} p="xl">
                <Alert icon={<IconAlertTriangle size={18} />} color="red" title="Se detectó un error inesperado" w="100%" maw={620}>
                    <Stack gap="xs">
                        <Title order={4}>La pantalla se recuperó para evitar que quede en blanco.</Title>
                        <Text size="sm">
                            Recarga la página. Si vuelve a pasar, ya quedará registrado en consola para corregirlo.
                        </Text>
                        <Group>
                            <Button color="red" onClick={this.handleReload}>Recargar</Button>
                        </Group>
                    </Stack>
                </Alert>
            </Stack>
        );
    }
}

export default AppErrorBoundary;
