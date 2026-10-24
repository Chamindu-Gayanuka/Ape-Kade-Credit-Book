/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                ink: '#260059',
                dark_amethyst: {
                    DEFAULT: '#10002b', 100: '#030008', 200: '#060010', 300: '#090018',
                    400: '#0c0021', 500: '#10002b', 600: '#310087', 700: '#5400e4',
                    800: '#8843ff', 900: '#c4a1ff',
                },
                deep_amethyst: {
                    DEFAULT: '#240046', 100: '#07000e', 200: '#0f001d', 300: '#16002b',
                    400: '#1e0039', 500: '#240046', 600: '#52009f', 700: '#8000f7',
                    800: '#aa50ff', 900: '#d5a7ff',
                },
                indigo_ink: {
                    DEFAULT: '#3c096c', 100: '#0c0216', 200: '#18042b', 300: '#240541',
                    400: '#300757', 500: '#3c096c', 600: '#650fb5', 700: '#8d25ed',
                    800: '#b36ef3', 900: '#d9b6f9',
                },
                indigo_velvet: {
                    DEFAULT: '#5a189a', 100: '#12051f', 200: '#240a3e', 300: '#360e5d',
                    400: '#47137c', 500: '#5a189a', 600: '#7a21d4', 700: '#9c53e4',
                    800: '#bd8ced', 900: '#dec6f6',
                },
                royal_violet: {
                    DEFAULT: '#7b2cbf', 100: '#180926', 200: '#31114c', 300: '#491a73',
                    400: '#622399', 500: '#7b2cbf', 600: '#954bd6', 700: '#b078e0',
                    800: '#caa5eb', 900: '#e5d2f5',
                },
                lavender_purple: {
                    DEFAULT: '#9d4edd', 100: '#200a33', 200: '#401365', 300: '#601d98',
                    400: '#8127ca', 500: '#9d4edd', 600: '#b172e4', 700: '#c596eb',
                    800: '#d8b9f2', 900: '#ecdcf8',
                },
                mauve_magic: {
                    DEFAULT: '#c77dff', 100: '#2b004d', 200: '#570099', 300: '#8200e6',
                    400: '#a733ff', 500: '#c77dff', 600: '#d399ff', 700: '#deb3ff',
                    800: '#e9ccff', 900: '#f4e5ff',
                },
                mauve: {
                    DEFAULT: '#e0aaff', 100: '#360055', 200: '#6b00a9', 300: '#a100fe',
                    400: '#c054ff', 500: '#e0aaff', 600: '#e6baff', 700: '#eccbff',
                    800: '#f2dcff', 900: '#f9eeff',
                },
                thistle: {
                    DEFAULT: '#dec9e9', 100: '#31193e', 200: '#62327b', 300: '#924eb7',
                    400: '#b88bd0', 500: '#dec9e9', 600: '#e4d4ed', 700: '#ebdef2',
                    800: '#f2e9f6', 900: '#f8f4fb',
                },
                soft_thistle: {
                    DEFAULT: '#dac3e8', 100: '#2f183e', 200: '#5f2f7c', 300: '#8e48b9',
                    400: '#b486d1', 500: '#dac3e8', 600: '#e2d0ed', 700: '#e9dcf2',
                    800: '#f0e7f6', 900: '#f8f3fb',
                },
                wisteria: {
                    DEFAULT: '#d2b7e5', 100: '#2d163d', 200: '#592c79', 300: '#8642b6',
                    400: '#ac7bcf', 500: '#d2b7e5', 600: '#dbc6ea', 700: '#e4d4f0',
                    800: '#ede3f5', 900: '#f6f1fa',
                },
                deep_wisteria: {
                    DEFAULT: '#c19ee0', 100: '#28123a', 200: '#4f2574', 300: '#7737ae',
                    400: '#9d64ce', 500: '#c19ee0', 600: '#ceb1e7', 700: '#dac5ed',
                    800: '#e6d8f3', 900: '#f3ecf9',
                },
                bright_lavender: {
                    DEFAULT: '#b185db', 100: '#241036', 200: '#48206c', 300: '#6b31a3',
                    400: '#8f4fca', 500: '#b185db', 600: '#c19ee2', 700: '#d0b6e9',
                    800: '#e0cef0', 900: '#efe7f8',
                },
                light_lavender: {
                    DEFAULT: '#a06cd5', 100: '#200e32', 200: '#401c64', 300: '#602a96',
                    400: '#813ac7', 500: '#a06cd5', 600: '#b489de', 700: '#c6a7e6',
                    800: '#d9c4ee', 900: '#ece2f7',
                },
                soft_lavender: {
                    DEFAULT: '#9163cb', 100: '#1d0f2d', 200: '#391e5a', 300: '#562d87',
                    400: '#723cb5', 500: '#9163cb', 600: '#a782d5', 700: '#bda1e0',
                    800: '#d3c0ea', 900: '#e9e0f5',
                },
                deep_lilac: {
                    DEFAULT: '#815ac0', 100: '#190f29', 200: '#321f51', 300: '#4b2e7a',
                    400: '#643ea3', 500: '#815ac0', 600: '#9a7acd', 700: '#b39bd9',
                    800: '#ccbce6', 900: '#e6def2',
                },
                deep_lilac_2: {
                    DEFAULT: '#7251b5', 100: '#171024', 200: '#2d1f49', 300: '#442f6d',
                    400: '#5a3e92', 500: '#7251b5', 600: '#8e73c3', 700: '#aa96d2',
                    800: '#c6b9e1', 900: '#e3dcf0',
                },
                deep_lilac_3: {
                    DEFAULT: '#6247aa', 100: '#130e22', 200: '#271c44', 300: '#3a2a65',
                    400: '#4e3987', 500: '#6247aa', 600: '#7e67bf', 700: '#9e8dcf',
                    800: '#bfb3df', 900: '#dfd9ef',
                },
                light_indigo: {
                    DEFAULT: '#461873', 100: '#0e0517', 200: '#1c0a2d', 300: '#290e44',
                    400: '#37135b', 500: '#461873', 600: '#6a25af', 700: '#8f47d8',
                    800: '#b584e5', 900: '#dac2f2',
                },
                deep_indigo_light: {
                    DEFAULT: '#58148e', 100: '#12041d', 200: '#230839', 300: '#350c56',
                    400: '#461072', 500: '#58148e', 600: '#7d1dcb', 700: '#9f49e5',
                    800: '#bf86ee', 900: '#dfc2f6',
                },
                indigo_bloom: {
                    DEFAULT: '#6910a8', 100: '#150322', 200: '#2a0643', 300: '#3f0965',
                    400: '#540c86', 500: '#6910a8', 600: '#8e15e4', 700: '#ab4cee',
                    800: '#c788f4', 900: '#e3c3f9',
                },
                dark_violet_light: {
                    DEFAULT: '#8c07dd', 100: '#1c012d', 200: '#380359', 300: '#540486',
                    400: '#7006b2', 500: '#8c07dd', 600: '#a725f8', 700: '#bd5cfa',
                    800: '#d392fc', 900: '#e9c9fd',
                },
                purple_x11: {
                    DEFAULT: '#9f21e3', 100: '#20062e', 200: '#400b5d', 300: '#60118b',
                    400: '#8017b9', 500: '#9f21e3', 600: '#b24de9', 700: '#c67aef',
                    800: '#d9a6f4', 900: '#ecd3fa',
                },
                hyper_magenta: {
                    DEFAULT: '#b333e9', 100: '#260534', 200: '#4c0b67', 300: '#71109b',
                    400: '#9716cf', 500: '#b333e9', 600: '#c25dee', 700: '#d185f2',
                    800: '#e1aef6', 900: '#f0d6fb',
                },
                light_mauve_magic: {
                    DEFAULT: '#cb5df1', 100: '#2f053d', 200: '#5e0b7a', 300: '#8d10b7',
                    400: '#b81eeb', 500: '#cb5df1', 600: '#d67cf4', 700: '#e09cf6',
                    800: '#eabdf9', 900: '#f5defc',
                },
                light_violet: {
                    DEFAULT: '#dc93f6', 100: '#370649', 200: '#6e0c91', 300: '#a512da',
                    400: '#c44af0', 500: '#dc93f6', 600: '#e3a8f8', 700: '#eabefa',
                    800: '#f1d4fb', 900: '#f8e9fd',
                },
                light_mauve: {
                    DEFAULT: '#eabffa', 100: '#3d0652', 200: '#7b0ca3', 300: '#b519ee',
                    400: '#cf6bf4', 500: '#eabffa', 600: '#eecafb', 700: '#f2d7fc',
                    800: '#f6e4fd', 900: '#fbf2fe',
                },
                lavender_veil: {
                    DEFAULT: '#f7ebfd', 100: '#3e0959', 200: '#7d12b2', 300: '#b03aec',
                    400: '#d493f4', 500: '#f7ebfd', 600: '#f9f0fe', 700: '#fbf4fe',
                    800: '#fcf8fe', 900: '#fefbff',
                },
                pink_orchid: {
                    DEFAULT: '#ffcbf2', 100: '#5c0045', 200: '#b8008a', 300: '#ff14c4',
                    400: '#ff70db', 500: '#ffcbf2', 600: '#ffd6f5', 700: '#ffe0f7',
                    800: '#ffebfa', 900: '#fff5fc',
                },
                pastel_mauve_1: {
                    DEFAULT: '#f3c4fb', 100: '#480654', 200: '#900ca8', 300: '#d01eef',
                    400: '#e172f5', 500: '#f3c4fb', 600: '#f5d1fc', 700: '#f8ddfd',
                    800: '#fae8fd', 900: '#fdf4fe',
                },
                pastel_mauve_2: {
                    DEFAULT: '#ecbcfd', 100: '#3f0355', 200: '#7e05aa', 300: '#ba10f8',
                    400: '#d265fa', 500: '#ecbcfd', 600: '#efc8fd', 700: '#f3d5fe',
                    800: '#f7e3fe', 900: '#fbf1ff',
                },
                pastel_mauve_3: {
                    DEFAULT: '#e5b3fe', 100: '#390155', 200: '#7303ab', 300: '#aa09fb',
                    400: '#c85efd', 500: '#e5b3fe', 600: '#eac3fe', 700: '#efd2fe',
                    800: '#f5e1ff', 900: '#faf0ff',
                },
                pastel_mauve_4: {
                    DEFAULT: '#e2afff', 100: '#360056', 200: '#6d00ab', 300: '#a202ff',
                    400: '#c258ff', 500: '#e2afff', 600: '#e7beff', 700: '#edceff',
                    800: '#f3deff', 900: '#f9efff',
                },
                pastel_mauve_5: {
                    DEFAULT: '#deaaff', 100: '#340055', 200: '#6800a9', 300: '#9d00fe',
                    400: '#bd54ff', 500: '#deaaff', 600: '#e4baff', 700: '#ebcbff',
                    800: '#f2dcff', 900: '#f8eeff',
                },
                pastel_mauve_6: {
                    DEFAULT: '#d8bbff', 100: '#260059', 200: '#4d00b1', 300: '#750bff',
                    400: '#a764ff', 500: '#d8bbff', 600: '#e1caff', 700: '#e8d7ff',
                    800: '#f0e4ff', 900: '#f7f2ff',
                },
                periwinkle: {
                    DEFAULT: '#d0d1ff', 100: '#00025d', 200: '#0003ba', 300: '#171bff',
                    400: '#7477ff', 500: '#d0d1ff', 600: '#dadbff', 700: '#e3e4ff',
                    800: '#ededff', 900: '#f6f6ff',
                },
                pale_sky: {
                    DEFAULT: '#c8e7ff', 100: '#00335b', 200: '#0067b6', 300: '#1198ff',
                    400: '#6cbfff', 500: '#c8e7ff', 600: '#d2ecff', 700: '#ddf0ff',
                    800: '#e9f5ff', 900: '#f4faff',
                },
                icy_aqua: {
                    DEFAULT: '#c0fdff', 100: '#00575a', 200: '#00aeb4', 300: '#0ef7ff',
                    400: '#68faff', 500: '#c0fdff', 600: '#cefdff', 700: '#dafeff',
                    800: '#e7feff', 900: '#f3ffff',
                },
                /* Existing utility names now map to the supplied pastel light palette. */
                forest: {50: '#f8eeff', 100: '#f2dcff', 500: '#bd54ff', 600: '#9d00fe', 700: '#6800a9', 900: '#340055'},
                gold: '#d8bbff',
            },
            boxShadow: {soft: '0 8px 30px rgba(60,9,108,.10)'},
            fontFamily: {sans: ['Noto Sans Sinhala', 'Inter', 'system-ui', 'sans-serif']},
        },
    },
    plugins: [],
};