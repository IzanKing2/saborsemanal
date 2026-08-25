# Feature Spec: FEAT-IMPORT-08 - Importar recetas desde el exterior

Estado: **propuesta con decisiones cerradas**. No hay implementación asociada.

## 1. Objetivo

Permitir traer una receta de fuera de SaborSemanal en lugar de teclearla entera,
sin degradar la gestión de alérgenos y haciendo que el catálogo maestro
**aprenda** de cada importación en vez de acumular deuda.

Hoy la única vía de alta es el formulario manual y el catálogo público está
vacío, así que el coste de arranque recae entero sobre quien quiera usar la
aplicación.

## 2. El problema central: alérgenos

Esta feature no es un formulario prerrellenado. El modelo de datos impone una
condición que decide todo el diseño.

Un ingrediente de receta es **o** una referencia al catálogo maestro
(`ingrediente_id`) **o** un nombre libre (`nombre_personalizado`), nunca ambos.
Los alérgenos cuelgan del catálogo maestro mediante `ingrediente_alergenos`. De
ahí se siguen dos hechos:

- **Un ingrediente en texto libre no aporta ningún alérgeno.** Una receta
  importada cuyos ingredientes no se casen con el catálogo pasa los filtros como
  si fuera inocua. Para un producto cuya misión incluye gestionar alergias, eso
  no es un defecto cosmético.
- **No se puede publicar.** El trigger `prevent_custom_ingredient_publication`
  de `202607300010_secure_custom_ingredients.sql` lanza excepción al marcar
  `publica = true` si queda algún `nombre_personalizado`.

El valor de la importación no está en extraer el texto, que es la parte fácil,
sino en **casar cada ingrediente con el catálogo maestro**.

## 3. Decisiones cerradas

| Asunto | Decisión |
|--------|----------|
| Procedencia | Se guarda la URL de origen en una columna `source_url` anulable de `recetas`. La migración es barata frente a perder trazabilidad, atribución y capacidad de depurar o reimportar |
| Imagen | **No se importa en el MVP.** No se referencia nunca una imagen externa como oficial: rompería el modelo de bucket privado con URL firmada y arrastra dudas de licencia. El usuario la añade después por el camino habitual |
| Acceso | **Solo administración al principio**, tras un interruptor de funcionalidad. Se prueba internamente con recetas reales y luego se amplía |
| Ingredientes desconocidos | Se puede **proponer** el alta al catálogo, nunca crearla automáticamente. Las propuestas van a una cola aparte de aprobación |
| Permisos | Dos ejes separados: **puede importar recetas** y **puede aprobar altas del catálogo**. Así se abre la importación mucho antes sin ceder control sobre el maestro |

## 4. Recorrido

```
URL -> extracción -> borrador -> casado con el catálogo -> revisión humana
    -> (opcional) propuestas de catálogo -> publicación
```

1. Quien tenga permiso de importación pega una URL.
2. El servidor la descarga y extrae el JSON-LD de tipo `Recipe`.
3. Se normaliza a la forma del formulario: título, descripción, pasos, tiempo,
   porciones. Sin imagen.
4. Cada línea de ingrediente se analiza en cantidad, unidad y nombre, y se
   propone una coincidencia del catálogo.
5. **Revisión humana obligatoria.** Por cada ingrediente, tres salidas:
   - usar el ingrediente existente que se sugiere,
   - dejarlo como texto libre,
   - proponer un ingrediente nuevo para el catálogo.
6. Se guarda como borrador privado mediante el mismo `save_recipe` que usa el
   formulario. Sin rutas de escritura nuevas.

El paso 5 no es opcional: es el que decide si la receta tendrá alérgenos
correctos, y ninguna heurística puede asumir esa responsabilidad en silencio.

## 5. Origen de los datos

Se lee el marcado `schema.org/Recipe` en JSON-LD que la mayoría de sitios de
cocina ya publica para los buscadores.

Frente a una API de terceros: no hay clave que custodiar, ni cuota, ni coste, ni
proveedor del que depender, ni catálogo ajeno que se solape con el propio. A
cambio, la calidad del marcado varía y hay sitios que no lo publican; en ese caso
la importación **falla con claridad** en lugar de adivinar.

Esto introduce la primera petición saliente del proyecto, que hoy no hace
ninguna. Implicaciones en la sección 8.

## 6. Permisos

El modelo actual es binario: `profiles.role` admite únicamente los valores
`usuario` y `admin` por restricción de comprobación, e `is_admin()` se consulta
desde RLS y RPC por todo el proyecto. Dos permisos independientes no caben ahí.

Propuesta: **dos columnas booleanas en `profiles`**, ambas con valor falso por
defecto, gestionadas por la RPC de administración que ya existe
(`admin_set_profile_access`, que hoy toca el rol y el estado de bloqueo):

- `can_import_recipes`
- `can_approve_catalog`

`is_admin()` concede ambas de forma implícita, de modo que la fase inicial
—solo administración— funciona sin conceder nada, y ampliar el acceso más
adelante no exige otra migración. Se descarta ampliar los valores permitidos del
rol porque estos permisos no son excluyentes entre sí.

Alternativa considerada y descartada por desproporcionada para dos permisos: una
tabla `profile_permissions` con una fila por permiso.

## 7. Cola de propuestas al catálogo

Tabla nueva, por ejemplo `ingrediente_propuestas`, con al menos: nombre
propuesto, categoría sugerida, quién propone, receta de origen, estado
(pendiente, aprobada, rechazada) y quién resuelve.

### El detalle que decide si esto funciona

Aprobar una propuesta debe **re-vincular las recetas que ya usaban ese nombre
libre**. Si solo se crea el ingrediente maestro y no se re-vincula, la receta
importada se queda en texto libre para siempre: exactamente la deuda que esta
decisión pretende evitar.

La re-vinculación tiene una restricción concreta. El trigger
`validate_recipe_ingredient_source` prohíbe que en una misma receta coexistan un
ingrediente maestro y uno personalizado con el mismo nombre. Por tanto hay que
**actualizar la fila existente** —fijar `ingrediente_id` y anular
`nombre_personalizado` en la misma operación— y nunca insertar una fila nueva
junto a la vieja.

### Efecto secundario a tener presente

Al re-vincular, una receta gana alérgenos que antes no declaraba. Es lo correcto
y lo más seguro, pero cambia el estado de recetas que alguien pudo haber dado por
aptas y que quizá estén en menús ya planificados. Conviene decidir si eso se
comunica.

## 8. Seguridad

- **Contenido no fiable.** El HTML y el JSON-LD descargados son datos, nunca
  instrucciones. No se insertan sin escapar.
- **Peticiones salientes.** Descargar una URL elegida por el usuario abre la
  puerta a falsificación de peticiones del lado del servidor. Hay que rechazar
  destinos que no sean HTTPS y direcciones internas, de bucle local, de enlace
  local y de rangos privados, **incluidas las que aparezcan tras una
  redirección**.
- **Límites.** Tiempo máximo de espera, tamaño máximo de respuesta, número
  máximo de redirecciones y limitación de frecuencia por usuario.
- **Sin escrituras nuevas.** La importación termina en `save_recipe`, que ya
  valida y aplica autorización.
- **Superficie reducida al inicio.** El interruptor de funcionalidad y el
  permiso de importación limitan la exposición mientras se evalúa la calidad del
  análisis.

## 9. Restricciones del modelo que hay que respetar

| Campo | Límite |
|-------|--------|
| `titulo` | 3 a 120 caracteres |
| `descripcion` | hasta 1000 |
| `instrucciones` | de 1 a 30 pasos, cada uno de 2 a 1000 caracteres |
| `ingredientes` | de 1 a 50, sin duplicados, cantidad mayor que cero |
| `unidad` | **lista cerrada de nueve**: g, kg, ml, l, unidad, cucharadita, cucharada, taza, pizca |
| `tiempo_preparacion` | de 1 a 1440 minutos |
| `porciones` | de 1 a 100 |

La lista cerrada de unidades es el segundo escollo. `tsp`, `tbsp`, `cup` y
`pinch` tienen equivalente directo; `oz` y `lb` se convierten a gramos. `clove`,
`can` o `package` no tienen destino razonable y obligan a preguntar.

## 10. Fuera de alcance

- Importación en lote o sincronización con la fuente.
- Traducción automática.
- Importación de imágenes (ver sección 3).
- Alta automática en el catálogo maestro sin aprobación.

## 11. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Recetas ciegas a los alérgenos | Revisión humana obligatoria; aviso destacado en los ingredientes sin casar |
| El catálogo no aprende | Cola de propuestas con re-vinculación retroactiva al aprobar |
| Sitios sin marcado válido | Fallo explícito, nunca extracción parcial silenciosa |
| Unidades sin equivalente | Conversión donde exista, elección manual en el resto |
| Peticiones salientes abusables | Destinos permitidos, límites y validación tras redirecciones |
| Derechos sobre contenido ajeno | Sin imágenes en el MVP; `source_url` como atribución; privadas por defecto y publicación deliberada con moderación |

## 12. Criterios de aceptación propuestos

1. Una URL con marcado válido produce un borrador con título, pasos, tiempo y
   porciones correctos, y con `source_url` guardada.
2. Una URL sin marcado de receta falla con un mensaje comprensible y no crea
   nada.
3. Todo ingrediente sin coincidencia queda marcado en la revisión antes de
   guardar.
4. La revisión ofrece las tres salidas de la sección 4 para cada ingrediente.
5. La receta importada nace privada, sin aprobar y sin imagen.
6. Una receta con ingredientes libres no puede publicarse, y la interfaz lo
   explica en lugar de dejar que falle el trigger.
7. Aprobar una propuesta de catálogo crea el ingrediente **y** re-vincula las
   recetas que usaban ese nombre libre, sin violar
   `validate_recipe_ingredient_source`.
8. Quien tiene permiso de importación pero no de aprobación de catálogo puede
   importar y proponer, pero no aprobar.
9. Se rechazan destinos que no sean HTTPS y direcciones de red internas, también
   tras redirección.
10. Ninguna receta importada supera los límites de la sección 9.
11. `npx tsc --noEmit`, `pnpm lint` y `pnpm build` terminan sin errores, y los
    tests pgTAP cubren la re-vinculación y los dos permisos.

## 13. Preguntas abiertas

1. **Forma de los permisos**: ¿se aceptan las dos columnas booleanas en
   `profiles` de la sección 6, o se prefiere una tabla de permisos?
2. **Alcance de la re-vinculación**: al aprobar una propuesta, ¿se re-vinculan
   todas las recetas del sistema que usaban ese nombre libre, o solo la que
   originó la propuesta? Re-vincular todas es más coherente y más seguro, pero
   modifica recetas ajenas y puede hacer aparecer alérgenos en recetas ya
   planificadas.

## 14. Cierre

Pendiente. No se ha escrito código.
