# Feature Spec: FEAT-SHOPPING-04 - Lista de la compra

## 1. Objetivo

Generar una lista consolidada a partir de todos los slots ocupados de una semana
y permitir marcar sus elementos como comprados.

## 2. Decisiones de dominio

### Consolidación

- Ingrediente maestro: agrupar por `(ingrediente_id, unidad)`.
- Ingrediente personalizado: agrupar por
  `(lower(trim(nombre_personalizado)), unidad)`.
- Unidades diferentes nunca se convierten ni se suman entre sí.
- Cada aparición de una receta en el menú aporta una vez sus cantidades.
- No se ajustan cantidades por comensales en la primera versión.

### Persistencia

- Invitado: lista derivada y estado de compra en `LocalStorage` por semana.
- Usuario: filas vinculadas mediante `menu_id` y protegidas por RLS.
- Regenerar sustituye los elementos derivados de ese menú.
- La primera versión reinicia `comprado` al regenerar si cambian las cantidades.

### Ingredientes personalizados

`shopping_list_items` debe incorporar `nombre_personalizado` y un check XOR
equivalente al de `receta_ingredientes`: exactamente una fuente entre
`ingrediente_id` y nombre personalizado.

Los personalizados se mostrarán en una sección `Otros`. Los ingredientes
maestros usarán `categorias_ingredientes`; los que no tengan categoría también
irán a `Otros`.

## 3. Backend propuesto

Crear una RPC transaccional `regenerate_shopping_list(p_week DATE)` que:

1. Valide usuario activo y propiedad del menú.
2. Lea cada slot y sus ingredientes.
3. Consolide por fuente y unidad.
4. Sustituya las filas asociadas al `menu_id`.
5. Devuelva la lista agrupada para renderizar.

Las escrituras directas de `shopping_list_items` quedarán revocadas. Una segunda
RPC actualizará únicamente `comprado` para una fila propia.

## 4. Interfaz propuesta

- `/planificador` mostrará la lista local derivada para invitados.
- `/dashboard/lista-compra?week=YYYY-MM-DD` mostrará la lista sincronizada.
- Agrupación visual por categoría.
- Cantidad, unidad, nombre y checkbox accesible por elemento.
- Acción explícita `Regenerar lista`.
- Estados vacío, carga, error y aviso de regeneración.

## 5. Criterios de aceptación

1. Dos apariciones de una receta duplican su aportación.
2. Cantidades con la misma fuente y unidad se suman.
3. Unidades diferentes permanecen en filas distintas.
4. Ingredientes personalizados distintos no se mezclan por tener ID nulo.
5. Un usuario no puede leer ni modificar listas ajenas.
6. Invitados no escriben en Supabase.
7. Regenerar es atómico y no deja una lista parcial.
8. Marcar comprado persiste en el almacenamiento correspondiente.
9. TypeScript, lint y build terminan sin errores.
