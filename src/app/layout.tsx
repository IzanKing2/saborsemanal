import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SaborSemanal",
    template: "%s | SaborSemanal",
  },
  description:
    "Recetas verificadas, planificación semanal y lista de la compra.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
