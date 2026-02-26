import { createTheme } from '@mantine/core';

export const theme = createTheme({
    fontFamily: 'Outfit, sans-serif',
    primaryColor: 'indigo',
    colors: {
        dark: [
            '#C1C2C5',
            '#A6A7AB',
            '#909296',
            '#5c5f66',
            '#373A40',
            '#2C2E33',
            '#1A1B1E',
            '#141517',
            '#101113',
            '#0f172a',
        ],
    },
    defaultRadius: 'md',
    components: {
        Card: {
            defaultProps: {
                padding: 'xl',
                radius: 'lg',
            },
        },
        Button: {
            defaultProps: {
                radius: 'md',
            },
        },
        TextInput: {
            defaultProps: {
                radius: 'md',
            },
        },
        PasswordInput: {
            defaultProps: {
                radius: 'md',
            },
        },
    },
});
