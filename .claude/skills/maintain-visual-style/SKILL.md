---
name: maintain-visual-style
description: Instrucciones estrictas para mantener la consistencia visual, paleta de colores y componentes en SaborSemanal V2.
---

# Mantener Estilo Visual V2 (SaborSemanal)

Cuando construyas o modifiques interfaces de usuario (Next.js + Tailwind) en este proyecto, DEBES adherirte a las siguientes reglas sin excepción. Nunca improvises estilos que contradigan esta guía.

## 1. Filosofía Base
- **Mobile-First Real:** Diseña pensando en que el usuario tiene el móvil en una mano (en el súper o la cocina). Los botones y áreas táctiles deben ser amplios (mínimo `h-10` o `p-3`).
- **Espaciado y Contraste:** Usa padding holgado (ej. `p-4`, `p-6`). No satures la interfaz.
- **Utilidad Limpia:** Descarta gráficos superfluos. No uses patrones de fondo, gradientes extremos, mallas ni bordes brillantes.

## 2. Paleta de Colores Oficial
- **Primary (Acciones principales, Salud, Completado):** Verde Fresco.
  - Botones principales: `bg-emerald-500 hover:bg-emerald-600`.
  - Texto destacado/Títulos clave: `text-emerald-700`.
- **Accent (Llamadas a la acción secundarias, Alertas):** Naranja.
  - Botones secundarios/Notificaciones: `bg-orange-500` / `text-orange-500`.
- **Fondos (Neutros):**
  - App general (Body): `bg-slate-50` o `bg-zinc-50` (NUNCA usar blanco puro de fondo global para evitar fatiga visual).
  - Superficies (Tarjetas, modales): `bg-white`.
- **Texto:**
  - Principal (Títulos, Párrafos): `text-slate-900`.
  - Secundario (Descripciones, mutado): `text-slate-500`.
- **PROHIBIDO:** Usar colores púrpuras, violetas o similares (chocan con la temática fresca del proyecto).

## 3. Reglas de Componentes
- **Tarjetas (Cards):** 
  - Bordes suaves (`rounded-xl` o `rounded-2xl`). 
  - Sombra sutil (`shadow-sm` y `shadow-md` en hover). 
  - **No anides tarjetas:** Nunca pongas una tarjeta dentro de otra. Usa separadores (`divide-y`) para sub-secciones.
- **Botones:** Usa `rounded-full` o `rounded-xl`. Obligatorio definir estados `:active` para feedback táctil en móviles.
- **Píldoras (Badges):** Para alérgenos o tipos de comida, usa fondos muy claros con texto oscuro contrastado (ej. `bg-emerald-100 text-emerald-800 font-medium`).
- **Navegación:** En móvil asume siempre el uso de una Bottom Navigation Bar (barra inferior).

## 4. Tipografía
- Sistema nativo sin serifa (Tailwind por defecto).
- h1: `text-2xl font-bold tracking-tight`.
- Textos de receta: deben ser legibles a distancia de un brazo (`text-base leading-relaxed text-slate-700`).
