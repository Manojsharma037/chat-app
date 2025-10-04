/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // ye line add karni hai
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // This line is crucial!
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}