/**
 * Conversión de unidades para consolidar la lista de la compra.
 *
 * Solo se convierte entre unidades de la misma familia y con equivalencia
 * exacta: gramos↔kilos y mililitros↔litros. Las medidas de cocina (`unidad`,
 * `cucharada`, `cucharadita`, `taza`, `pizca`) NO se convierten a masa ni a
 * volumen porque su peso depende del ingrediente: una cucharada de sal y una de
 * harina no pesan lo mismo. Estimarlo sería inventar cantidades en una lista
 * con la que alguien va a comprar.
 */

/** Se acumula en la unidad más pequeña para no arrastrar decimales. */
const CANONICAL_BY_UNIT: Record<string, { unidad: string; factor: number }> = {
  kg: { unidad: "g", factor: 1000 },
  l: { unidad: "ml", factor: 1000 },
};

/** Unidad mayor a la que se asciende al presentar cantidades grandes. */
const PRESENTATION_BY_UNIT: Record<string, { unidad: string; factor: number }> = {
  g: { unidad: "kg", factor: 1000 },
  ml: { unidad: "l", factor: 1000 },
};

/** Unidad con la que se agrupa: la canónica si es convertible, si no la misma. */
export function canonicalUnit(unidad: string) {
  return CANONICAL_BY_UNIT[unidad]?.unidad ?? unidad;
}

export function toCanonicalQuantity(cantidad: number, unidad: string) {
  return cantidad * (CANONICAL_BY_UNIT[unidad]?.factor ?? 1);
}

/**
 * Cómo mostrar una cantidad ya consolidada. A partir de 1000 g o 1000 ml se
 * asciende a kilos o litros, que es como se compra. Se aplica solo al final:
 * hacerlo durante la suma redondearía resultados intermedios.
 */
export function presentQuantity(cantidad: number, unidad: string) {
  const bigger = PRESENTATION_BY_UNIT[unidad];
  if (!bigger || Math.abs(cantidad) < bigger.factor) return { cantidad, unidad };
  return {
    cantidad: roundQuantity(cantidad / bigger.factor),
    unidad: bigger.unidad,
  };
}

/** Mismo redondeo que aplica el RPC, para que cliente y servidor coincidan. */
export function roundQuantity(cantidad: number) {
  return Math.round(cantidad * 1000) / 1000;
}
