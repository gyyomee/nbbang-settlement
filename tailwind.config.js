/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        receipt: {
          bg: "#f2e8d3",
          paper: "#fffaf0",
          ink: "#312a21",
          muted: "#746555",
          line: "#c8b899",
          button: "#eee0bf",
          buttonDark: "#d4bf8f",
          danger: "#9f3f34",
          success: "#2f6b4f",
        },
      },
      boxShadow: {
        receipt: "0 18px 48px rgba(75, 58, 31, 0.16)",
        key: "inset 0 -3px 0 rgba(49, 42, 33, 0.18), 0 2px 0 rgba(255, 255, 255, 0.65)",
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
