# Feature Spec: FEAT-RECIPES-02 - CRUD de recetas e ingredientes

## 1. Objetivo

Implementar el Hito 2 de SaborSemanal:

- CRUD de recetas propias asociadas a la lista maestra de ingredientes.
- Gestión admin de ingredientes, categorías y alérgenos.
- Publicación de recetas sujeta a aprobación admin.
- Catálogo público, detalle y búsqueda por texto, tiempo y alérgenos.
- Imágenes almacenadas en Supabase Storage.

Esta especificación parte del esquema SQL v1.0.0 ejecutado en Supabase el
2026-07-30. El bloque original contiene un reset destructivo y no debe volver a
ejecutarse sobre una base con datos. Los cambios del Hito 2 deben desplegarse
como una migración incremental y versionada.

## 2. Decisiones cerradas

### Formulario

Se usará un formulario único con secciones dinámicas (opción A2):

1. Datos básicos.
2. Imagen.
3. Lista ordenada de instrucciones.
4. Lista de ingredientes con cantidad y unidad.
5. Acciones para guardar borrador o solicitar publicación.

### Imágenes

Se usará Supabase Storage (opción B1), sin URLs externas. El bucket se llamará
`recipe-images` y las rutas seguirán el formato:

```text
{user_id}/{recipe_id}/{uuid}.{extension}
```

### Moderación

Se añadirá `recetas.aprobada BOOLEAN NOT NULL DEFAULT FALSE` (opción C1).
Editar una receta aprobada restablecerá `aprobada` a `false` y requerirá una
nueva revisión.

### Catálogos

El panel admin incluirá ingredientes, categorías, alérgenos y las asociaciones
entre ingredientes y alérgenos.

### Ingredientes por receta

Cada línea puede usar un ingrediente de la lista maestra o un nombre
personalizado, nunca ambos. `receta_ingredientes` usa un UUID propio como PK y
mantiene índices únicos parciales para evitar duplicados de cada tipo.

Los ingredientes personalizados permiten crear recetas propias y borradores
sin intervención del admin. Como no tienen categoría ni alérgenos verificados,
una receta que los contenga no puede enviarse a publicación. El autor debe
sustituirlos por ingredientes maestros antes de solicitar revisión.

## 3. Modelo de estados

| Estado funcional | `publica` | `aprobada` | Visible para invitados |
| --- | --- | --- | --- |
| Borrador | `false` | `false` | No |
| Pendiente de revisión | `true` | `false` | No |
| Publicada | `true` | `true` | Sí |
| Devuelta a borrador | `false` | `false` | No |

Reglas:

- Guardar borrador establece `publica = false` y `aprobada = false`.
- Solicitar publicación establece `publica = true` y `aprobada = false`.
- Aprobar establece `publica = true` y `aprobada = true`.
- Rechazar devuelve la receta a borrador.
- Cualquier edición del autor establece `aprobada = false`.
- Una consulta pública exige siempre `publica = true AND aprobada = true`.

No se incluye historial ni motivo de rechazo en este hito.

## 4. Hallazgos sobre el esquema v1.0.0

Antes de exponer el CRUD deben corregirse estos puntos:

### Escalada de privilegios en `profiles`

La policy `profiles_update_own` permite actualizar cualquier columna de la fila
propia. Un usuario puede asignarse `role = 'admin'` o cambiar `banned` mediante
la API. Se debe eliminar esa policy antes de habilitar el panel admin.

En este hito no hay campos de perfil editables por el usuario, por lo que no se
creará una policy de actualización propia. La administración de roles y baneos
debe quedar reservada a una operación admin protegida.

### Lectura pública incompleta

`recetas_select` exige `auth.uid() IS NOT NULL`, por lo que actualmente un
invitado no puede leer recetas aunque `publica = true`. La policy debe permitir
lectura anónima solo cuando la receta esté publicada y aprobada.

La policy equivalente de `receta_ingredientes` debe aplicar la misma regla.

### Moderación admin inexistente

Las policies actuales solo permiten actualizar y borrar al creador. El admin
necesita leer todas las recetas y actualizar su moderación sin convertirse en
creador.

### Integridad insuficiente

Faltan checks para títulos, instrucciones, cantidades, tiempo y porciones.
También falta `updated_at` e índices para las consultas principales.

### Esquema no versionado

El SQL ejecutado existe fuera del repositorio y `src/types/database.types.ts`
no contiene tipos. Antes del frontend se debe guardar la migración incremental
y regenerar los tipos desde el proyecto remoto.

## 5. Migración incremental requerida

La migración del Hito 2 debe ser no destructiva. No debe incluir `DROP TABLE`,
recrear el trigger de usuarios ni volver a insertar los alérgenos semilla.

### Cambios de tablas

En `recetas`:

- Añadir `aprobada BOOLEAN NOT NULL DEFAULT FALSE`.
- Añadir `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- Añadir checks para título no vacío, instrucciones no vacías,
  `tiempo_preparacion > 0` y `porciones > 0`.
- Añadir un trigger que actualice `updated_at`.
- Indexar `creador_id`.
- Indexar `(publica, aprobada, created_at DESC)`.
- Indexar `tiempo_preparacion`.

En `receta_ingredientes`:

- Añadir `CHECK (cantidad > 0)`.
- Añadir `CHECK (length(trim(unidad)) > 0)`.
- Añadir índice por `ingrediente_id`.

En catálogos:

- Auditar duplicados que solo difieran por mayúsculas antes de crear índices
  únicos sobre `lower(nombre)`.
- Añadir índices a `ingredientes.categoria_id` y
  `ingrediente_alergenos.alergeno_id`.

Antes de crear checks sobre tablas con datos se debe ejecutar una consulta de
auditoría y corregir filas incompatibles. No se deben borrar datos de forma
automática.

### Helpers de autorización

Se creará una función `public.is_admin()` estable, `SECURITY DEFINER`, con
`search_path` fijo y permisos de ejecución limitados. Centralizará la
comprobación de rol y evitará policies autorreferenciales sobre `profiles`.

También se debe impedir crear o editar contenido si el perfil tiene
`banned = true`. Esta comprobación debe estar en RLS o en una función de
autorización de base de datos, no solo en el frontend.

### Policies de `profiles`

- Limitar lectura al perfil propio o a un admin para no exponer emails.
- Eliminar `profiles_update_own`.
- Permitir cambios de rol y baneo solo mediante policy o función admin.
- No conceder al cliente una ruta que permita modificar su propio `role`.

### Policies de `recetas`

`SELECT`:

- Invitados: `publica = true AND aprobada = true`.
- Autor: todas las recetas propias.
- Admin: todas las recetas.

`INSERT`:

- Solo usuarios autenticados y no baneados.
- `creador_id = auth.uid()`.
- `aprobada = false`.

`UPDATE` del autor:

- Solo recetas propias.
- Debe conservar `creador_id = auth.uid()`.
- El resultado debe tener `aprobada = false`.

`UPDATE` admin:

- Puede aprobar o devolver recetas a borrador.

`DELETE`:

- Permitido al autor o al admin.

### Policies de `receta_ingredientes`

- Lectura si la receta padre es pública y aprobada, propia o visible para admin.
- Escritura si el usuario puede editar la receta padre.
- No confiar únicamente en la UI para comprobar la propiedad.

### Policies de catálogos

- Lectura pública de categorías, ingredientes, alérgenos y relaciones.
- Inserción, actualización y borrado solo para admin mediante `is_admin()`.
- Sustituir las comprobaciones de rol duplicadas en las policies v1.0.0.

## 6. Guardado transaccional

Crear o editar una receta y sus ingredientes debe ser una única transacción.
Varias llamadas independientes desde una Server Action podrían dejar una
receta parcial.

Se implementará la función PostgreSQL `save_recipe(...)`, invocada mediante
RPC, para crear y actualizar dentro de una única transacción.

Contrato mínimo de cada ingrediente:

```ts
type RecipeIngredientInput = {
  ingredienteId: string | null;
  nombrePersonalizado: string;
  cantidad: number;
  unidad: string;
};
```

Las funciones deben:

1. Validar autenticación, propiedad y estado de baneo.
2. Rechazar IDs de ingredientes duplicados.
3. Insertar o actualizar la receta.
4. Sustituir las filas de `receta_ingredientes` dentro de la transacción.
5. Forzar `aprobada = false` cuando actúe el autor.
6. Devolver el ID de la receta.

No se usará una service role en Next.js para operaciones normales.

## 7. Supabase Storage

Crear un bucket privado llamado `recipe-images`. Los propietarios, admins y
recetas públicas aprobadas obtienen URLs firmadas de duración limitada.

Restricciones de subida:

- MIME: `image/jpeg`, `image/png`, `image/webp`.
- Tamaño máximo: 5 MB.
- Una imagen principal por receta.
- Escritura y borrado solo bajo la carpeta cuyo primer segmento sea
  `auth.uid()`.

Flujo de creación:

1. Validar el formulario.
2. Generar el UUID de receta.
3. Subir la imagen a la ruta del usuario y receta.
4. Ejecutar la RPC de creación guardando la ruta del objeto.
5. Si falla la RPC, eliminar la imagen recién subida.

Flujo de edición:

1. Subir la imagen nueva sin borrar la anterior.
2. Actualizar la receta.
3. Si la actualización termina bien, borrar la imagen anterior.
4. Si falla, borrar la imagen nueva.

Al borrar una receta, la Server Action debe borrar primero o después el objeto
de Storage con manejo explícito de errores. Se debe registrar cualquier fallo
de limpieza para evitar objetos huérfanos.

`next.config.ts` debe permitir el host de imágenes del proyecto Supabase para
usar `next/image`.

## 8. Arquitectura Next.js

```text
src/app/
|-- (protected)/dashboard/recetas/
|   |-- page.tsx
|   |-- nueva/page.tsx
|   `-- [id]/editar/page.tsx
|-- admin/
|   |-- recetas/page.tsx
|   `-- ingredientes/page.tsx
`-- recetas/
    |-- page.tsx
    `-- [id]/page.tsx

src/lib/actions/
|-- recetas.ts
|-- ingredientes.ts
`-- moderacion.ts
```

Se podrán crear componentes reutilizables en `src/components` para campos,
alertas, filas dinámicas, tarjetas de receta y filtros. No se añadirá una
librería de formularios para este hito; la validación se compartirá mediante
funciones TypeScript puras en cliente y servidor.

### Responsabilidades

- Server Components: consultas iniciales, listados y detalles.
- Client Components: filas dinámicas, preview de imagen y estado del formulario.
- Server Actions: autenticación, validación, RPC, moderación, revalidación y
  redirects.
- RLS: autoridad final sobre acceso a datos.

En rutas dinámicas se usará la API asíncrona de `params` de Next.js 15.

## 9. Experiencia de usuario

### Mis recetas

- Listar borradores, pendientes y publicadas del usuario.
- Mostrar estado, imagen, título y fecha de actualización.
- Permitir editar, eliminar y solicitar publicación.
- Confirmar operaciones destructivas.

### Formulario

- Campos: título, descripción, imagen, tiempo, porciones e instrucciones.
- Instrucciones dinámicas con añadir, eliminar y reordenar.
- Ingredientes dinámicos seleccionados desde la lista maestra.
- Cada ingrediente requiere cantidad y unidad.
- No permitir ingredientes duplicados.
- Botones `Guardar borrador` y `Publicar receta`.
- Labels asociados, errores por campo y foco visible.
- Estados de carga y bloqueo contra doble envío.

Unidades iniciales normalizadas:

```text
g, kg, ml, l, unidad, cucharadita, cucharada, taza, pizca
```

### Administración de catálogos

`/admin/ingredientes` tendrá secciones para categorías, ingredientes y
alérgenos. La edición de un ingrediente permitirá asociar varios alérgenos.

Antes de eliminar un catálogo se mostrará el impacto de sus relaciones. Las FK
existentes determinan si la referencia pasa a `NULL` o se elimina en cascada.

### Moderación

`/admin/recetas` mostrará las recetas con `publica = true` y
`aprobada = false`. El admin podrá abrir el detalle, aprobar o devolver a
borrador.

### Buscador público

Los filtros se reflejarán en la URL:

```text
/recetas?q=tortilla&maxTime=30&allergen=<uuid>&allergen=<uuid>&page=1
```

- Búsqueda por título y descripción.
- Tiempo máximo de preparación.
- Exclusión de recetas que contengan cualquiera de los alérgenos elegidos.
- Paginación en servidor.
- Solo recetas públicas y aprobadas.

La exclusión por alérgenos y la paginación deben resolverse en PostgreSQL para
evitar descargar todas las recetas al servidor Next.js.

## 10. Orden de implementación

1. Guardar una migración incremental del Hito 2.
2. Corregir la escalada de rol y desplegar las nuevas RLS.
3. Crear y verificar el bucket y las policies de Storage.
4. Regenerar `src/types/database.types.ts` y tipar los clientes Supabase.
5. Implementar y probar las RPC transaccionales.
6. Implementar CRUD admin de categorías, alérgenos e ingredientes.
7. Implementar el formulario único de receta.
8. Implementar listado, edición y borrado de recetas propias.
9. Implementar moderación admin.
10. Implementar catálogo, detalle, filtros y paginación públicos.
11. Ejecutar pruebas de permisos, TypeScript, lint y recorridos de UI.

## 11. Criterios de aceptación

1. Un usuario no puede cambiar su propio rol ni su estado de baneo.
2. Un usuario baneado no puede crear ni editar recetas.
3. Un usuario solo puede editar o eliminar sus recetas.
4. Un usuario no puede establecer `aprobada = true` mediante la API.
5. Una receta pendiente no es visible para invitados ni otros usuarios.
6. Un admin puede aprobarla y hacerla visible públicamente.
7. Editar una receta aprobada exige una nueva aprobación.
8. Crear o editar receta e ingredientes es atómico.
9. No se aceptan ingredientes duplicados ni cantidades no positivas.
10. Solo un admin puede modificar los catálogos maestros.
11. Los filtros de tiempo y alérgenos producen resultados correctos.
12. Reemplazar o borrar imágenes no deja objetos huérfanos en el flujo normal.
13. Todos los formularios son accesibles y funcionan en móvil y escritorio.
14. `tsc --noEmit` y lint terminan sin errores.

## 12. Fuera de alcance

- Historial de moderación y comentarios de rechazo.
- Versionado de recetas.
- Varias imágenes por receta.
- URLs externas para imágenes.
- Planificador semanal y lista de la compra.
- Edición de perfiles por parte del usuario.

## 13. Cierre del Hito 2 - 2026-07-30

**Estado:** completado.

Entregado:

- CRUD de recetas propias con guardado transaccional.
- Ingredientes maestros y personalizados para borradores.
- Catálogos administrables de categorías, ingredientes y alérgenos.
- Moderación admin y reaprobación después de editar.
- Catálogo público, detalle, búsqueda literal, tiempo, alérgenos y paginación.
- Storage privado con URLs firmadas y limpieza compensatoria.
- RLS endurecida para perfiles, recetas, catálogos y objetos de Storage.

Verificaciones ejecutadas:

- `npm exec tsc -- --noEmit`.
- `npm run lint`.
- `npm run build`.
- Acceso público a RPC de búsqueda y rechazo anónimo de operaciones protegidas.
- Recorridos manuales de creación, edición y navegación confirmados.

Las migraciones `202607300002` a `202607300012` contienen la evolución completa
del Hito 2.
