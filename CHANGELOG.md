# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto usa [Versionado Semántico](https://semver.org/lang/es/).

## [2.1.0] - 2026-08-21

### Added
- Grupos familiares: crear un grupo con nombre propio desde Mi cuenta,
  invitar por email o WhatsApp (con caducidad de 24h), aceptar/rechazar
  invitaciones entrantes, editar el nombre del grupo, eliminar el grupo
  (todos los miembros vuelven a ser independientes), y confirmación antes
  de quitar a alguien.
- El menú semanal, la lista de la compra y las recetas se comparten con
  todo el grupo; los filtros de alérgenos combinan los de todos los
  miembros, no solo los de quien navega.
- Indicador "Compartido con tu grupo" en lista de la compra y recetas.
- Al cambiar la contraseña hay que repetirla, y se puede mostrar/ocultar
  el texto mientras se escribe (login, registro y cambio de contraseña).
- Aviso de "novedades" al entrar tras una actualización de la web.
- Plantillas de email con la estética de SaborSemanal (invitación,
  confirmación de cuenta, recuperar contraseña, cambio de email).

### Fixed
- Cabecera móvil: el carrito y el botón de salir ya no se salían de la
  pantalla; el menú de cuenta (avatar + hamburguesa) ya no quedaba
  recortado.
- La lista de la compra ahora sí queda disponible sin conexión tras
  visitarla navegando dentro de la app (no solo con recarga completa).

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
