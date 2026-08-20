# Guía de Estilos Visuales: SaborSemanal V2

Esta guía define las convenciones de diseño para mantener la consistencia visual y la escalabilidad de la interfaz en Tailwind CSS 4.

## 1. Filosofía de Diseño
- **Mobile-First Real:** Diseñado principalmente para usarse a una mano en la cocina o el supermercado. Componentes táctiles grandes.
- **Limpieza y Contraste:** Uso de espacios en blanco amplios (padding holgado).
- **Utility-driven:** Priorizar accesibilidad visual y legibilidad; descartar adornos superfluos.

## 2. Paleta de Colores

La paleta se basa en tonos **frescos (saludables) y naranjas (apetitosos)** sobre fondos neutros puros.

### Colores Principales (Tailwind variables sugeridas)
- **Primary (Verde Fresco):** Representa salud o acciones principales.
  - Fondo de botón: `bg-emerald-500` hover `bg-emerald-600`.
  - Texto destacado: `text-emerald-700`.
- **Accent (Naranja Apetitoso):** Llamadas a la acción secundarias, alertas o tags "Nuevo".
  - `bg-orange-500` / `text-orange-500`.
- **Backgrounds (Neutros):**
  - Fondo general (Body): `bg-slate-50` o `bg-zinc-50` (evitar el blanco puro para reducir fatiga visual).
  - Superficies (Tarjetas, modales): `bg-white` con sombras sutiles.
- **Texto:**
  - Principal (Títulos, body): `text-slate-900`.
  - Secundario (Descripciones, mutado): `text-slate-500`.

## 3. Tipografía
- **Fuente Principal:** Sistema nativo (Inter, San Francisco, Roboto). Tipografía sin serifa limpia.
- **Jerarquía:**
  - Títulos de página (h1): `text-2xl font-bold tracking-tight`.
  - Títulos de tarjetas/recetas: `text-lg font-semibold`.
  - Texto base (instrucciones, ingredientes): `text-base leading-relaxed text-slate-700`.

## 4. Componentes Clave

### Tarjetas (Cards)
- Bordes redondeados suaves (`rounded-xl` o `rounded-2xl`).
- Sombras difusas y elegantes (`shadow-sm` normal, `shadow-md` en hover).
- **No anidar tarjetas:** Evitar meter una tarjeta dentro de otra; usar divisores (`divide-y`) o fondos grises para sub-secciones.

### Píldoras (Badges)
- Usadas para alérgenos y tipos de comida (ej. Desayuno, Sin Gluten).
- Estilo: Fondo muy claro con texto oscuro y fuerte. Ej: `bg-emerald-100 text-emerald-800 rounded-full px-3 py-1 text-sm font-medium`.

### Botones y Controles
- Redondeados completos (`rounded-full`) o estilo píldora para botones principales.
- Estados `:active` evidentes para feedback táctil en móviles.

## 5. Navegación
- **Móvil:** Obligatorio el uso de Bottom Navigation Bar (Barra inferior fija) para alternar rápido entre Menú, Recetas y Compra con una sola mano.
- **Escritorio:** Sidebar clásico a la izquierda.

## 6. Prohibiciones Visuales (Design Anti-patterns)
1. **NO usar púrpura o violeta.** Choca con la temática gastronómica fresca.
2. **NO usar fondos complejos.** Nada de mesh, gradientes extremos o cuadrículas; mantener fondos lisos.
3. **NO usar Dashboard Overuse.** SaborSemanal es un planificador, no un panel de analíticas de bolsa. Evitar gráficos innecesarios o exceso de datos.
4. **NO reducir el contraste.** Los textos de recetas e ingredientes deben leerse a un brazo de distancia en el súper.
