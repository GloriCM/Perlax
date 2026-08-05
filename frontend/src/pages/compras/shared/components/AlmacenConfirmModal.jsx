import { Button, Group, Modal, Text } from '@mantine/core';

export default function AlmacenConfirmModal({
    opened,
    onClose,
    onConfirm,
    title = 'Confirmar',
    message = '¿Está seguro de continuar?',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    confirmColor = 'red',
    loading = false,
}) {
    return (
        <Modal opened={opened} onClose={onClose} title={title} centered radius="md" size="sm">
            <Text size="sm" mb="lg">{message}</Text>
            <Group justify="flex-end" gap="sm">
                <Button variant="default" onClick={onClose} disabled={loading}>
                    {cancelLabel}
                </Button>
                <Button color={confirmColor} onClick={onConfirm} loading={loading}>
                    {confirmLabel}
                </Button>
            </Group>
        </Modal>
    );
}
