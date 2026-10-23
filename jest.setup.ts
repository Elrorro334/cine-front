import '@testing-library/jest-dom';

// Polyfill para crypto.getRandomValues en entorno JSDOM
if (typeof window !== 'undefined' && !window.crypto) {
  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: (arr: Uint32Array) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 4294967295);
        }
        return arr;
      },
    },
  });
}