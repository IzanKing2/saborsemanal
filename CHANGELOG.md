# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [2.0.0] - 2026-08-20

### Added
- Planificador guiado: añadir una receta abre un buscador que asigna
  directamente a un día y comida del calendario, en cualquier semana
  (nuevo selector de semana con fecha e indicador de "semana actual"),
  permitiendo repetir la misma receta varias veces por semana.
- Catálogo de recetas organizado por Desayuno, Almuerzo, Cena y Otro
  cuando se navega sin filtros; búsqueda de recetas también por nombre
  del autor.
- Navegación siempre accesible: Recetas, Planificador y Favoritas quedan
  a un clic desde la cabecera en cualquier tamaño de pantalla.
- "Añadir al menú" disponible también desde las tarjetas de "Mis
  recetas".
- Lista de la compra: resumen de progreso por categoría, exportación a
  texto plano (.txt), compartir el contenido real de la lista (antes
  compartía un enlace protegido inútil para quien lo recibía), y uso sin
  conexión en el supermercado (los cambios se guardan en el dispositivo
  y se sincronizan al recuperar cobertura).
- Grupos familiares: gestión de miembros del grupo desde el panel de
  cuenta.

### Fixed
- Restringido `video_url` de recetas a enlaces de YouTube.
- Corregido un fallo que impedía a usuarios anónimos ver recetas
  públicas tras la introducción de grupos familiares (política RLS
  necesitaba permisos que nunca se concedieron a `anon`).
- Corregido el popup "Añadir al menú", que quedaba visualmente atrapado
  dentro de la tarjeta de la receta.

### Changed
- El planificador elimina el flujo de dos pasos (añadir a una lista
  intermedia y luego asignar); ahora se asigna directamente desde la
  búsqueda o el propio calendario.
