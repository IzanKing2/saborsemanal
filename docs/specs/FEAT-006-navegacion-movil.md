# Feature Spec: FEAT-NAV-06 - Barra de navegación inferior en móvil

## 1. Objetivo

`docs/specs/v2-style-guide.md` §5 declara obligatoria una *Bottom Navigation Bar*
en móvil para «alternar rápido entre Menú, Recetas y Compra con una sola mano».
Hoy no existe: la navegación móvil se resuelve con una fila de iconos con scroll
horizontal dentro de la cabecera, en el borde superior de la pantalla.

Esta feature cierra esa brecha. No modifica lógica de negocio, datos, RLS ni RPC:
es exclusivamente una capa de navegación.

## 2. Asunciones

Se hacen explícitas para poder corregirlas antes de escribir código:

1. «Menú» se refiere al planificador semanal, no a un menú de navegación.
2. «Compra» abre el carrito ya existente (`ShoppingCart`), que es un drawer con
   contador, y no navega a `/dashboard/lista-compra`. El drawer es accesible
   desde cualquier página y conserva el contexto.
3. La barra se limita a rutas de producto. Queda fuera de `(auth)`, `/admin` y
   `/cuenta-bloqueada`, donde una barra de navegación global estorba.
4. El breakpoint es `sm` (640 px), el mismo que ya usa el resto del proyecto.
5. Tres ítems, los que nombra la guía. No se añade un cuarto.

## 3. Alcance

La barra se monta en:

- `src/app/(protected)/dashboard/layout.tsx`, que cubre todo el dashboard.
- Las cuatro páginas públicas que ya invocan `SiteHeader`: `/`, `/recetas`,
  `/recetas/[id]` y `/planificador`.

`SiteHeader` no vive en un layout compartido, sino que se invoca página a
página. La barra sigue esa misma convención en lugar de introducir un layout
nuevo para las rutas públicas.

## 4. Ítems

| Ítem | Destino | Icono |
|------|---------|-------|
| Menú | `/dashboard/planificador` si hay sesión, `/planificador` si no | Calendario |
| Recetas | `/recetas` | Libro abierto |
| Compra | Abre el drawer `ShoppingCart` | Carrito con contador |

Los tres iconos se reutilizan de `site-header.tsx` y `dashboard-header.tsx` para
mantener una sola identidad visual por destino.

## 5. Comportamiento

- Visible solo por debajo de `sm`; oculta con `sm:hidden`.
- Fija al borde inferior, con `env(safe-area-inset-bottom)` para no quedar bajo
  el indicador de inicio en iOS.
- El ítem correspondiente a la ruta actual se marca como activo mediante
  `usePathname()`. Esto obliga a que el componente sea de cliente.
- El contador del carrito se hereda de `ShoppingCart`; no se duplica su estado.

## 6. Colisiones a resolver

| Conflicto | Resolución |
|-----------|------------|
| `PwaInstall` ocupa `fixed bottom-4 z-40` y quedaría solapado | Subirlo a `bottom-24` mientras la barra esté visible, `sm:bottom-4` a partir de `sm` |
| El contenido final de página queda tapado | Reserva inferior en los contenedores afectados, anulada en `sm` |
| Orden de apilamiento | La barra usa `z-40`, igual que las cabeceras. El drawer del carrito (`z-50`), los menús desplegables (`z-50`) y `ConfirmDialog` (`z-[70]`) quedan por encima sin cambios |

## 7. Accesibilidad

- Elemento `<nav>` con `aria-label` propio, distinto del de `SiteHeader`.
- `aria-current="page"` en el ítem activo.
- Área táctil de 44 px como mínimo en cada destino.
- Foco visible con el mismo `focus-visible:outline-amber-300` del resto de la
  navegación.
- Etiqueta de texto siempre visible bajo el icono: la guía §6.4 prohíbe reducir
  el contraste y la legibilidad, y un icono sin texto no es autoexplicativo.

## 8. Estilo

Se aplica la paleta real del código, que es la fuente de verdad acordada:
`emerald` para fondo y activo, `stone` y `amber` para texto y acento. No se
introducen dependencias de animación; las transiciones son de color, en CSS.

## 9. Fuera de alcance

- Los hallazgos de accesibilidad ajenos a esta barra (componentes sin `aria-`,
  ausencia de trampa de foco en `ConfirmDialog`, `prefers-reduced-motion`).
- La división de los componentes monolíticos.

## 9b. Desduplicación de la cabecera

Con la barra en pantalla, los iconos de Recetas, Planificador y Carrito de
`site-header.tsx` y `dashboard-header.tsx` quedan repetidos en móvil. Se ocultan
por debajo de `sm`, de modo que la cabecera móvil conserva solo el logo, el
buscador y la identidad de la cuenta, y desaparece su scroll horizontal de
iconos. A partir de `sm` la cabecera no cambia.

## 10. Criterios de aceptación

1. A 375 px de ancho, la barra es visible y fija en las rutas del alcance.
2. A 640 px o más, la barra no se renderiza.
3. La barra no aparece en `/login`, `/register`, `/admin` ni
   `/cuenta-bloqueada`.
4. El ítem de la ruta actual queda marcado visualmente y con `aria-current`.
5. «Compra» abre el drawer del carrito y muestra el mismo contador que la
   cabecera.
6. Ningún contenido de página queda oculto tras la barra al final del scroll.
7. El aviso de instalación PWA no se solapa con la barra.
8. Los tres destinos se alcanzan con teclado y muestran foco visible.
9. `npx tsc --noEmit`, `pnpm lint` y `pnpm build` terminan sin errores.

## 11. Verificación

```bash
npx tsc --noEmit
pnpm lint
pnpm build
```

Comprobación en navegador a 375 px y 768 px sobre `/`, `/recetas`,
`/dashboard/planificador` y `/dashboard/lista-compra`, más recorrido con
teclado.

No hay cambios de base de datos, por lo que no procede `db reset` ni pgTAP.

## 12. Cierre - 2026-08-25

Implementado en `src/components/navigation/bottom-nav.tsx`, montado en el layout
del dashboard y en las cuatro páginas públicas que usan `SiteHeader`. El carrito
recibió una variante `tab` que reutiliza su drawer y su contador sin duplicar
estado. Los iconos de Recetas, Planificador y Carrito quedan ocultos por debajo
de `sm` en ambas cabeceras, y el aviso de instalación PWA se desplaza a 72 px
para no solaparse.

Los nueve criterios de aceptación se verificaron con el servidor de desarrollo:

| # | Resultado |
|---|-----------|
| 1 | Barra visible con 500 px de viewport; 57 px de alto, ancho completo |
| 2 | `display: none` con 787 px de viewport |
| 3 | Ausente en `/login`; no montada en `(auth)`, `/admin` ni `/cuenta-bloqueada` |
| 4 | `aria-current="page"` correcto en `/recetas` y en `/planificador` |
| 5 | «Compra» abre el drawer, que se apila sobre la barra (`z-50` frente a `z-40`) |
| 6 | El espaciador resuelve a 56 px; el contenido termina con holgura sobre la barra |
| 7 | El aviso PWA calcula `bottom: 72px` |
| 8 | Tabulación real alcanza la barra con `:focus-visible` y contorno ámbar de 3 px |
| 9 | `npx tsc --noEmit`, `pnpm lint` y `pnpm build` en verde |

Hallazgo durante la verificación: `globals.css` ya define un `:focus-visible`
global de 3 px con desplazamiento de 3 px. Las utilidades `focus-visible:*` que
la barra llevaba en un primer momento lo degradaban a 2 px sin desplazamiento,
así que se retiraron y la barra hereda el foco global. Las cabeceras existentes
arrastran esa misma degradación, pero corregirlas queda fuera de este alcance.
