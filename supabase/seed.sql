-- Catálogo de ingredientes para desarrollo local.
--
-- Las migraciones crean el esquema y los diez alérgenos, pero nada siembra
-- categorías ni ingredientes. Sin ellos el formulario de recetas deshabilita
-- la lista maestra, y como publicar exige que todos los ingredientes existan en
-- el catálogo, un entorno recién reconstruido no permite publicar nada.
--
-- Este fichero lo aplica `supabase db reset` automáticamente. Refleja el
-- catálogo real del proyecto remoto. Es idempotente: puede ejecutarse varias
-- veces sin duplicar.
--
-- Los alérgenos se referencian por nombre, no por identificador, porque los
-- crea la migración base y sus UUID cambian en cada entorno.

BEGIN;

-- Categorías -----------------------------------------------------------------

INSERT INTO public.categorias_ingredientes (nombre)
VALUES
  ('Aceites y grasas'),
  ('Aves'),
  ('Carnes'),
  ('Cereales y granos'),
  ('Especias y condimentos'),
  ('Frutas'),
  ('Frutos secos y semillas'),
  ('Huevos y lácteos'),
  ('Legumbres'),
  ('Otros'),
  ('Pescados y mariscos'),
  ('Verduras y hortalizas')
ON CONFLICT (nombre) DO NOTHING;

-- Ingredientes ---------------------------------------------------------------

WITH datos (nombre, categoria) AS (
  VALUES
  ('Aceite de girasol', 'Aceites y grasas'),
  ('Aceite de oliva', 'Aceites y grasas'),
  ('Aceite de sésamo', 'Aceites y grasas'),
  ('Muslo de pollo', 'Aves'),
  ('Pavo', 'Aves'),
  ('Pechuga de pollo', 'Aves'),
  ('Bacon', 'Carnes'),
  ('Carne de cerdo', 'Carnes'),
  ('Carne de ternera', 'Carnes'),
  ('Carne picada de ternera', 'Carnes'),
  ('Chorizo', 'Carnes'),
  ('Jamón serrano', 'Carnes'),
  ('Arroz', 'Cereales y granos'),
  ('Arroz integral', 'Cereales y granos'),
  ('Avena', 'Cereales y granos'),
  ('Cuscús', 'Cereales y granos'),
  ('Harina de trigo', 'Cereales y granos'),
  ('Pan de molde', 'Cereales y granos'),
  ('Pasta', 'Cereales y granos'),
  ('Tortilla de maíz', 'Cereales y granos'),
  ('Albahaca', 'Especias y condimentos'),
  ('Azafrán', 'Especias y condimentos'),
  ('Canela', 'Especias y condimentos'),
  ('Cilantro', 'Especias y condimentos'),
  ('Comino', 'Especias y condimentos'),
  ('Cúrcuma', 'Especias y condimentos'),
  ('Curry', 'Especias y condimentos'),
  ('Jengibre', 'Especias y condimentos'),
  ('Laurel', 'Especias y condimentos'),
  ('Mostaza', 'Especias y condimentos'),
  ('Nuez moscada', 'Especias y condimentos'),
  ('Orégano', 'Especias y condimentos'),
  ('Perejil', 'Especias y condimentos'),
  ('Pimentón dulce', 'Especias y condimentos'),
  ('Pimentón picante', 'Especias y condimentos'),
  ('Pimienta negra', 'Especias y condimentos'),
  ('Romero', 'Especias y condimentos'),
  ('Sal', 'Especias y condimentos'),
  ('Salsa de soja', 'Especias y condimentos'),
  ('Tomillo', 'Especias y condimentos'),
  ('Aguacate', 'Frutas'),
  ('Fresas', 'Frutas'),
  ('Limón', 'Frutas'),
  ('Manzana', 'Frutas'),
  ('Naranja', 'Frutas'),
  ('Plátano', 'Frutas'),
  ('Uvas', 'Frutas'),
  ('Almendras', 'Frutos secos y semillas'),
  ('Anacardos', 'Frutos secos y semillas'),
  ('Avellanas', 'Frutos secos y semillas'),
  ('Cacahuete', 'Frutos secos y semillas'),
  ('Nueces', 'Frutos secos y semillas'),
  ('Pipas de girasol', 'Frutos secos y semillas'),
  ('Semillas de chía', 'Frutos secos y semillas'),
  ('Sésamo', 'Frutos secos y semillas'),
  ('Huevo', 'Huevos y lácteos'),
  ('Leche', 'Huevos y lácteos'),
  ('Leche de coco', 'Huevos y lácteos'),
  ('Mantequilla', 'Huevos y lácteos'),
  ('Nata para cocinar', 'Huevos y lácteos'),
  ('Queso feta', 'Huevos y lácteos'),
  ('Queso mozzarella', 'Huevos y lácteos'),
  ('Queso parmesano', 'Huevos y lácteos'),
  ('Yogur natural', 'Huevos y lácteos'),
  ('Alubias blancas', 'Legumbres'),
  ('Garbanzos', 'Legumbres'),
  ('Lentejas', 'Legumbres'),
  ('Lentejas rojas', 'Legumbres'),
  ('Tofu', 'Legumbres'),
  ('Azúcar', 'Otros'),
  ('Cacao en polvo', 'Otros'),
  ('Caldo de pollo', 'Otros'),
  ('Caldo de verduras', 'Otros'),
  ('Chocolate negro', 'Otros'),
  ('Levadura en polvo', 'Otros'),
  ('Miel', 'Otros'),
  ('Sirope de arce', 'Otros'),
  ('Vinagre', 'Otros'),
  ('Vino tinto', 'Otros'),
  ('Anchoas', 'Pescados y mariscos'),
  ('Atún', 'Pescados y mariscos'),
  ('Bacalao', 'Pescados y mariscos'),
  ('Gambas', 'Pescados y mariscos'),
  ('Mejillones', 'Pescados y mariscos'),
  ('Merluza', 'Pescados y mariscos'),
  ('Salmón', 'Pescados y mariscos'),
  ('Ajo', 'Verduras y hortalizas'),
  ('Berenjena', 'Verduras y hortalizas'),
  ('Boniato', 'Verduras y hortalizas'),
  ('Brócoli', 'Verduras y hortalizas'),
  ('Calabacín', 'Verduras y hortalizas'),
  ('Calabaza', 'Verduras y hortalizas'),
  ('Cebolla', 'Verduras y hortalizas'),
  ('Champiñón', 'Verduras y hortalizas'),
  ('Espinacas', 'Verduras y hortalizas'),
  ('Guisantes', 'Verduras y hortalizas'),
  ('Judía verde', 'Verduras y hortalizas'),
  ('Lechuga', 'Verduras y hortalizas'),
  ('Patata', 'Verduras y hortalizas'),
  ('Pepino', 'Verduras y hortalizas'),
  ('Pimiento rojo', 'Verduras y hortalizas'),
  ('Pimiento verde', 'Verduras y hortalizas'),
  ('Puerro', 'Verduras y hortalizas'),
  ('Tomate', 'Verduras y hortalizas'),
  ('Zanahoria', 'Verduras y hortalizas')
)
INSERT INTO public.ingredientes (nombre, categoria_id)
SELECT d.nombre, c.id
FROM datos d
JOIN public.categorias_ingredientes c ON c.nombre = d.categoria
ON CONFLICT (nombre) DO NOTHING;

-- Alérgenos por ingrediente --------------------------------------------------
--
-- Sin estos enlaces el filtro de alérgenos no protege: los alérgenos cuelgan
-- del ingrediente maestro, no del texto de la receta.

WITH datos (ingrediente, alergeno) AS (
  VALUES
  ('Aceite de sésamo', 'Sésamo'),
  ('Almendras', 'Frutos secos'),
  ('Anacardos', 'Frutos secos'),
  ('Anchoas', 'Pescado'),
  ('Atún', 'Pescado'),
  ('Avellanas', 'Frutos secos'),
  ('Avena', 'Gluten'),
  ('Bacalao', 'Pescado'),
  ('Cacahuete', 'Frutos secos'),
  ('Caldo de pollo', 'Apio'),
  ('Caldo de verduras', 'Apio'),
  ('Cuscús', 'Gluten'),
  ('Gambas', 'Marisco'),
  ('Harina de trigo', 'Gluten'),
  ('Huevo', 'Huevo'),
  ('Leche', 'Lácteos'),
  ('Mantequilla', 'Lácteos'),
  ('Mejillones', 'Marisco'),
  ('Merluza', 'Pescado'),
  ('Mostaza', 'Mostaza'),
  ('Nata para cocinar', 'Lácteos'),
  ('Nueces', 'Frutos secos'),
  ('Pan de molde', 'Gluten'),
  ('Pan de molde', 'Lácteos'),
  ('Pan de molde', 'Soja'),
  ('Pasta', 'Gluten'),
  ('Pasta', 'Huevo'),
  ('Queso feta', 'Lácteos'),
  ('Queso mozzarella', 'Lácteos'),
  ('Queso parmesano', 'Lácteos'),
  ('Salmón', 'Pescado'),
  ('Salsa de soja', 'Gluten'),
  ('Salsa de soja', 'Soja'),
  ('Sésamo', 'Sésamo'),
  ('Tofu', 'Soja'),
  ('Yogur natural', 'Lácteos')
)
INSERT INTO public.ingrediente_alergenos (ingrediente_id, alergeno_id)
SELECT i.id, a.id
FROM datos d
JOIN public.ingredientes i ON i.nombre = d.ingrediente
JOIN public.alergenos a ON a.nombre = d.alergeno
ON CONFLICT DO NOTHING;

COMMIT;
