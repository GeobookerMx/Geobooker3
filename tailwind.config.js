/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#5558c4",
        "primary-dark": "#4548a5",
        secondary: "#e33a60",
        "secondary-dark": "#c92e50",
        accent: "#f3dc2a",
        light: "#ffc3c5",
      },
      fontFamily: {
        nunito: ["'Nunito Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
}
