import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./types/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      cursor: {
        fieldpicked:
          'url(data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220.5%200.05%201%201.5%22%20xml%3Aspace%3D%22preserve%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22m.545%201.302-.07-.062a.3.3%200%200%201-.079-.114L.295.848A.05.05%200%200%201%20.32.787.1.1%200%200%201%20.357.779a.09.09%200%200%201%20.078.047l.092.185A.12.12%200%200%200%20.576.913V.325C.576.283.61.251.651.251s.075.034.075.075v.4a.075.075%200%201%201%20.15%200v.025a.075.075%200%201%201%20.15%200v.016a.075.075%200%201%201%20.15%200v.405a.16.16%200%200%201-.029.094%22%20fill%3D%22%23fff%22%20stroke%3D%22%23455A64%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-miterlimit%3D%2210%22%20stroke-width%3D%22.016%22%2F%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%23455A64%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-miterlimit%3D%2210%22%20d%3D%22M.509.184.474.149M.651.125V.074m.141.109L.827.148M.85.325h.016m-.5%200h.016%22%20stroke-width%3D%22.016%22%2F%3E%3Cpath%20fill%3D%22%23fff%22%20stroke%3D%22%23455A64%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-miterlimit%3D%2210%22%20d%3D%22M.525%201.525v-.15h.65v.15%22%20stroke-width%3D%22.016%22%2F%3E%3C%2Fsvg%3E), pointer',
      },
    },
  },
  plugins: [],
} satisfies Config;
