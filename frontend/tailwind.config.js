/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	darkMode: "class",
	theme: {
		extend: {
			animation: {
				"pulse-slow": "pulse 3s infinite",
				"bounce-slow": "bounce 2s infinite",
			},
			colors: {
				primary: {
					50: "#eff6ff",
					500: "#3b82f6",
					600: "#2563eb",
					700: "#1d4ed8",
				},
			},
		},
	},
	plugins: [],
};
