/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: { brand: { 600: "#2563eb" } },
            borderRadius: { "2xl": "1rem" },
        },
    },
    darkMode: "class",
    plugins: [],
};
