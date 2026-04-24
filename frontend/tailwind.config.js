/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cars24: "#E63946",
        teambhp: "#2D6A4F",
        bikes24: "#F4A261"
      }
    }
  },
  plugins: []
};
