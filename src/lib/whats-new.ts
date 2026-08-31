// Bump this whenever there's a user-facing change worth announcing, and
// update the items below to match. Comparing against the version stored in
// localStorage is what decides whether WhatsNewPopup shows itself.
export const WHATS_NEW_VERSION = "2026-08-31-planificador";

export const WHATS_NEW_TITLE = "Novedades en SaborSemanal";

/**
 * Fecha (incluida) hasta la que se muestra el aviso. Pasada esa fecha deja de
 * aparecer aunque el usuario no lo haya visto nunca: una novedad de hace
 * semanas ya no es novedad, y así no hace falta acordarse de retirarlo a mano.
 */
export const WHATS_NEW_EXPIRES_ON = "2026-09-10";

export const WHATS_NEW_ITEMS = [
  "Modo cocina: abre una receta y sigue los pasos a pantalla completa, con la pantalla siempre encendida y los ingredientes a un toque.",
  "Arrastra las comidas del planificador de un día a otro, duplícalas y ajusta las raciones de cada día por separado.",
  "Marca una comida como sobras: se queda en el menú, pero sus ingredientes ya no se vuelven a sumar a la compra.",
  "La lista de la compra suma gramos con kilos y mililitros con litros, y ajusta las cantidades a las raciones que hayas planificado.",
  "Crear una receta es más rápido: añade ingredientes en una sola línea, encadena los pasos con Enter y el borrador se guarda solo.",
];
