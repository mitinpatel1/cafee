
// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// export default defineConfig({
//   plugins: [react()],

//   server: {
//     host: "http://146.101.46.205:5006",
//     port: 5173,
//     strictPort: true,

//     proxy: {
//       "/api": {
//         target: "http://146.101.46.205:5006",
//         changeOrigin: true,
//       },

//       "/uploads": {
//         target: "http://146.101.46.205:5006",
//         changeOrigin: true,
//       },

//       "/socket.io": {
//         target: "http://146.101.46.205:5006",
//         changeOrigin: true,
//         ws: true,
//       },
//     },
//   },
// });

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://146.101.46.205:5006',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://146.101.46.205:5006',
        changeOrigin: true,
        ws: true,
        secure: false,
      },
    },
  },
});
