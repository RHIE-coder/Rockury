import path from 'path';

export const alias = {
    '~': path.resolve(__dirname, 'src'),
    '@': path.resolve(__dirname, 'src', 'renderer'),
    '#': path.resolve(__dirname, 'src', 'main'),
}

export const buildOutputPath = path.resolve(__dirname, '.vite/build')
export const rendererOutputPath = path.resolve(__dirname, '.vite/renderer')