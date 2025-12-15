/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        brand: ["Nunito Sans", "sans-serif"],
      },
      colors: {
        geoYellow: "#f4d32a",
        geoPink: "#e93353",
        geoPurple: "#555bc4",
        geoGreen: "#78bd67",
        geoOrange: "#ff6cc5",
        geoNavy: "#3f3dbf",
      },
      boxShadow: {
        brand: "0 4px 12px rgba(0,0,0,0.15)",
      }
    },
  },
  plugins: [],
};
