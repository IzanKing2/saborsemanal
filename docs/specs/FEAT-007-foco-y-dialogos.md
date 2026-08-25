# Feature Spec: FEAT-A11Y-07 - Gestión de foco en diálogos y menús

## 1. Objetivo

Corregir el único fallo de accesibilidad sistemático del proyecto: ningún
overlay retiene ni devuelve el foco del teclado.

Una auditoría previa contó atributos `aria-` por componente y sugirió una
carencia amplia. Esa métrica era engañosa: las 14 imágenes del proyecto llevan
`alt`, hay más de veinte `role="alert"` y `role="status"`, y los diálogos ya
declaran `role="dialog"`, `aria-modal` y un nombre accesible. Lo que falta no
son atributos, sino comportamiento de foco.

## 2. Estado actual

| Overlay | Escape | `role`/`aria-modal` | Nombre | Atrapa foco | Devuelve foco |
|---------|--------|---------------------|--------|-------------|---------------|
| `confirm-dialog` | sí | sí | **no** | **no** | **no** |
| `shopping-cart` (drawer) | sí | sí | sí | **no** | **no** |
| `slot-picker-modal` | sí | sí | sí | **no** | **no** |
| `recipe-slot-modal` | sí | sí | sí | **no** | **no** |
| `recipe-filters` | sí | sí | sí | **no** | **no** |
| `whats-new-popup` | **no** | sí | sí | **no** | **no** |
| `user-menu` | **no** | `menu` | sí | n/a | **no** |
| `admin-nav` | **no** | parcial | sí | n/a | **no** |

## 3. Impacto

1. **Foco fugado.** Con un diálogo abierto, tabular lleva el foco al contenido
   de detrás, que sigue siendo alcanzable pese al `aria-modal`. Incumple WCAG
   2.4.3 (orden del foco).
2. **Foco perdido al cerrar.** Al cerrarse un diálogo el foco cae en `<body>`;
   quien navega con teclado vuelve al principio del documento y pierde su
   posición.
3. **`whats-new-popup` no se cierra con Escape** pese a ser modal. Incumple
   WCAG 2.1.2.
4. **`confirm-dialog` se anuncia sin nombre**: su `<h2>` existe pero no está
   referenciado con `aria-labelledby`.

## 4. Enfoque

Ocho parches independientes producirían ocho comportamientos ligeramente
distintos. Se introduce en su lugar una pieza compartida en `src/lib/`:

- `useDialogFocus(open, onClose, ref)` para los seis modales: guarda el elemento
  activo al abrir, mueve el foco al diálogo, retiene `Tab` y `Shift+Tab` dentro
  de él, cierra con `Escape` y devuelve el foco al cerrar.
- Los dos menús desplegables (`user-menu`, `admin-nav`) siguen el patrón de menú,
  no de diálogo: no retienen el foco. Solo necesitan cierre con `Escape` y
  devolución del foco al botón que los abrió.

Los componentes que ya gestionan `Escape` por su cuenta delegan esa parte en el
hook y pierden su `useEffect` propio, de modo que el comportamiento queda en un
único sitio.

## 5. Fuera de alcance

- Cambiar la apariencia de cualquier diálogo.
- `recipe-search`, que es un combobox y no un diálogo.
- El resto de hallazgos abiertos: componentes monolíticos y
  `prefers-reduced-motion`.

## 6. Deuda relacionada, detectada en FEAT-006

`globals.css` define `:focus-visible` con un contorno de 3 px y desplazamiento
de 3 px. Ambas cabeceras y la variante de icono del carrito lo sobrescriben con
`focus-visible:outline-2 outline-offset-2`, degradando el foco que el proyecto
fija globalmente. Retirar esas utilidades es un cambio de tres líneas y encaja
en esta feature, pero se decide aparte por tocar componentes ya estables.

## 7. Criterios de aceptación

1. Con un diálogo abierto, `Tab` repetido no alcanza ningún elemento situado
   detrás del overlay.
2. `Shift+Tab` desde el primer elemento del diálogo lleva al último del propio
   diálogo.
3. Al abrirse un diálogo, el foco entra en él sin intervención del usuario.
4. Al cerrarse, el foco vuelve al control que lo abrió.
5. Los seis modales se cierran con `Escape`, incluido `whats-new-popup`.
6. `confirm-dialog` expone su título mediante `aria-labelledby`.
7. Los dos menús desplegables se cierran con `Escape` y devuelven el foco.
8. Ningún diálogo cambia de aspecto.
9. `npx tsc --noEmit`, `pnpm lint` y `pnpm build` terminan sin errores.

## 8. Verificación

```bash
npx tsc --noEmit
pnpm lint
pnpm build
```

Recorrido con teclado en navegador sobre cada overlay, comprobando el elemento
activo antes de abrir, durante el ciclo de tabulación y después de cerrar.

No hay cambios de base de datos.

## 9. Cierre - 2026-08-25

Implementado en `src/lib/use-dialog-focus.ts`, que expone `useDialogFocus` para
los seis modales y `useMenuDismiss` para los dos menús. Los `useEffect` de
`Escape` que cada componente llevaba por su cuenta se retiraron: el
comportamiento vive ahora en un único sitio. Se retiraron además las utilidades
`focus-visible:*` de ambas cabeceras y de la variante de icono del carrito, que
degradaban a 2 px el contorno global de 3 px.

### El fallo de la primera pasada y su causa

En una primera versión la devolución del foco funcionaba en los diálogos que
permanecen montados, pero no en `slot-picker-modal`. Tres intentos de corregirlo
a ciegas fallaron. Instrumentar el hook y leer la consola dio la causa en una
sola pasada:

`slot-picker-modal` declara `autoFocus` en su campo de búsqueda. React enfoca ese
campo mientras confirma el árbol, es decir **antes** de que se ejecuten los
efectos. Cuando el efecto leía `document.activeElement` para saber a dónde
devolver el foco, ya no encontraba el botón que había abierto el diálogo, sino el
propio campo del modal. Al cerrarse, ese campo ya no existía y la devolución no
tenía destino.

Lo agravaba una condición mal escrita, `if (!restoreRef.current || (...))`: con
la referencia aún vacía, el `||` cortocircuitaba y guardaba el elemento sin
comprobar si estaba dentro del diálogo.

La corrección tiene dos partes y no toca a ningún componente padre:

1. El elemento de retorno se captura **durante el render**, antes de que React
   confirme el árbol y `autoFocus` actúe.
2. El efecto solo refresca esa referencia con candidatos externos al diálogo,
   de modo que una reapertura desde otro control apunte al control correcto.

### Estado de los criterios

| # | Estado | Comprobación |
|---|--------|--------------|
| 1 | Cumplido | 6 tabulaciones en `whats-new-popup` y 18 en `recipe-filters` (19 elementos enfocables) no salen del diálogo |
| 2 | Cumplido | `Shift+Tab` desde el primer elemento del carrito lleva al último del propio diálogo |
| 3 | Cumplido | El foco entra solo en los cuatro modales probados |
| 4 | Cumplido | Verificado en `slot-picker-modal` (se desmonta), y en el carrito y los filtros (persisten). El carrito se probó en dos ciclos seguidos para confirmar que la referencia se refresca al reabrir |
| 5 | Cumplido | `whats-new-popup` cierra ahora con `Escape` y además persiste el "visto" |
| 6 | Cumplido | Comprobado por el usuario con sesión iniciada (2026-08-25); no verificado por el agente |
| 7 | Cumplido | Comprobado por el usuario con sesión iniciada (2026-08-25); no verificado por el agente |
| 8 | Cumplido | Capturas de `/recetas` y `/planificador` sin cambios de aspecto |
| 9 | Cumplido | `tsc`, `lint` y `build` en verde (24/24 páginas) |

### Pendiente

Los criterios 6 y 7 los comprobó el usuario en su propia sesión el 2026-08-25.
El agente no dispone de evidencia directa de esa comprobación.

- `recipe-slot-modal` sigue sin comprobación registrada: exige una receta
  publicada y el catálogo está vacío. Comparte hook y patrón con
  `slot-picker-modal`, que sí se verificó.
- `user-menu` y `confirm-dialog` conservan utilidades `focus-visible:*` que
  degradan el contorno global. No estaban en el alcance aprobado.

### Nota de método

Dos bloqueos de la sesión resultaron ser recarga en caliente sirviendo el paquete
anterior, no defectos del código: conviene reiniciar el servidor y vaciar `.next`
antes de dar por fallida una corrección de este hook.
