import type { Metadata } from "next";
import "./globals.css";

import { CustomCursor } from "@/components/ui/custom-cursor";

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
      <body>
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
