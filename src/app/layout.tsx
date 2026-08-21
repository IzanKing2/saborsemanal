import type { Metadata, Viewport } from "next";
import "./globals.css";

import { CustomCursor } from "@/components/ui/custom-cursor";
import { WhatsNewPopup } from "@/components/ui/whats-new-popup";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { PwaInstall } from "@/components/pwa/pwa-install";

export const metadata: Metadata = {
  title: {
    default: "SaborSemanal",
    template: "%s | SaborSemanal",
  },
  description:
    "Recetas verificadas, planificación semanal y lista de la compra.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#022c22",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <CustomCursor />
        <PwaRegister />
        <PwaInstall />
        <WhatsNewPopup />
        {children}
      </body>
    </html>
  );
}
