-- SaborSemanal v1 baseline.
-- This migration creates a fresh project. It intentionally contains no reset.

CREATE TABLE public.categorias_ingredientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.alergenos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.alergenos (nombre) VALUES
  ('Gluten'),
  ('Lácteos'),
  ('Huevo'),
  ('Frutos secos'),
  ('Soja'),
  ('Pescado'),
  ('Marisco'),
  ('Apio'),
  ('Mostaza'),
  ('Sésamo');

CREATE TABLE public.ingredientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT UNIQUE NOT NULL,
  categoria_id UUID REFERENCES public.categorias_ingredientes(id)
    ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.ingrediente_alergenos (
  ingrediente_id UUID REFERENCES public.ingredientes(id) ON DELETE CASCADE,
  alergeno_id UUID REFERENCES public.alergenos(id) ON DELETE CASCADE,
  PRIMARY KEY (ingrediente_id, alergeno_id)
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'usuario' CHECK (role IN ('usuario', 'admin')),
  banned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'usuario');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  instrucciones TEXT[] NOT NULL,
  imagen_url TEXT,
  creador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  publica BOOLEAN DEFAULT false,
  tiempo_preparacion INTEGER DEFAULT 0,
  porciones INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.receta_ingredientes (
  receta_id UUID REFERENCES public.recetas(id) ON DELETE CASCADE,
  ingrediente_id UUID REFERENCES public.ingredientes(id) ON DELETE CASCADE,
  cantidad NUMERIC NOT NULL,
  unidad TEXT NOT NULL,
  PRIMARY KEY (receta_id, ingrediente_id)
);

CREATE TABLE public.menus_semanales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.menu_recetas (
  menu_id UUID REFERENCES public.menus_semanales(id) ON DELETE CASCADE,
  receta_id UUID REFERENCES public.recetas(id) ON DELETE CASCADE,
  dia_semana TEXT NOT NULL CHECK (dia_semana IN (
    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  )),
  tipo_comida TEXT NOT NULL CHECK (tipo_comida IN (
    'Desayuno', 'Almuerzo', 'Cena'
  )),
  PRIMARY KEY (menu_id, receta_id, dia_semana, tipo_comida)
);

CREATE TABLE public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ingrediente_id UUID REFERENCES public.ingredientes(id) ON DELETE CASCADE,
  menu_id UUID REFERENCES public.menus_semanales(id) ON DELETE SET NULL,
  cantidad NUMERIC NOT NULL,
  unidad TEXT NOT NULL,
  comprado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.categorias_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alergenos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingrediente_alergenos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receta_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus_semanales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categorias_select_public"
ON public.categorias_ingredientes FOR SELECT USING (true);
CREATE POLICY "categorias_admin_insert"
ON public.categorias_ingredientes FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));
CREATE POLICY "categorias_admin_update"
ON public.categorias_ingredientes FOR UPDATE USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
)) WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));
CREATE POLICY "categorias_admin_delete"
ON public.categorias_ingredientes FOR DELETE USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "alergenos_select_public"
ON public.alergenos FOR SELECT USING (true);
CREATE POLICY "alergenos_admin_insert"
ON public.alergenos FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));
CREATE POLICY "alergenos_admin_update"
ON public.alergenos FOR UPDATE USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
)) WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));
CREATE POLICY "alergenos_admin_delete"
ON public.alergenos FOR DELETE USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "ingredientes_select_public"
ON public.ingredientes FOR SELECT USING (true);
CREATE POLICY "ingredientes_admin_insert"
ON public.ingredientes FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));
CREATE POLICY "ingredientes_admin_update"
ON public.ingredientes FOR UPDATE USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
)) WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));
CREATE POLICY "ingredientes_admin_delete"
ON public.ingredientes FOR DELETE USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "ingrediente_alergenos_select_public"
ON public.ingrediente_alergenos FOR SELECT USING (true);
CREATE POLICY "ingrediente_alergenos_admin_insert"
ON public.ingrediente_alergenos FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));
CREATE POLICY "ingrediente_alergenos_admin_update"
ON public.ingrediente_alergenos FOR UPDATE USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
)) WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));
CREATE POLICY "ingrediente_alergenos_admin_delete"
ON public.ingrediente_alergenos FOR DELETE USING (EXISTS (
  SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "profiles_select"
ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "recetas_select"
ON public.recetas FOR SELECT USING (
  auth.uid() IS NOT NULL AND (publica = true OR creador_id = auth.uid())
);
CREATE POLICY "recetas_insert"
ON public.recetas FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND creador_id = auth.uid()
);
CREATE POLICY "recetas_update"
ON public.recetas FOR UPDATE USING (creador_id = auth.uid())
WITH CHECK (creador_id = auth.uid());
CREATE POLICY "recetas_delete"
ON public.recetas FOR DELETE USING (creador_id = auth.uid());

CREATE POLICY "receta_ingredientes_select"
ON public.receta_ingredientes FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.recetas
  WHERE recetas.id = receta_ingredientes.receta_id
    AND auth.uid() IS NOT NULL
    AND (recetas.publica = true OR recetas.creador_id = auth.uid())
));
CREATE POLICY "receta_ingredientes_insert"
ON public.receta_ingredientes FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.recetas
  WHERE recetas.id = receta_ingredientes.receta_id
    AND recetas.creador_id = auth.uid()
));
CREATE POLICY "receta_ingredientes_update"
ON public.receta_ingredientes FOR UPDATE USING (EXISTS (
  SELECT 1 FROM public.recetas
  WHERE recetas.id = receta_ingredientes.receta_id
    AND recetas.creador_id = auth.uid()
)) WITH CHECK (EXISTS (
  SELECT 1 FROM public.recetas
  WHERE recetas.id = receta_ingredientes.receta_id
    AND recetas.creador_id = auth.uid()
));
CREATE POLICY "receta_ingredientes_delete"
ON public.receta_ingredientes FOR DELETE USING (EXISTS (
  SELECT 1 FROM public.recetas
  WHERE recetas.id = receta_ingredientes.receta_id
    AND recetas.creador_id = auth.uid()
));

CREATE POLICY "menus_semanales_own"
ON public.menus_semanales FOR ALL USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "menu_recetas_owner"
ON public.menu_recetas FOR ALL USING (EXISTS (
  SELECT 1 FROM public.menus_semanales
  WHERE menus_semanales.id = menu_recetas.menu_id
    AND menus_semanales.usuario_id = auth.uid()
)) WITH CHECK (EXISTS (
  SELECT 1 FROM public.menus_semanales
  WHERE menus_semanales.id = menu_recetas.menu_id
    AND menus_semanales.usuario_id = auth.uid()
));

CREATE POLICY "shopping_list_items_own"
ON public.shopping_list_items FOR ALL USING (usuario_id = auth.uid())
WITH CHECK (usuario_id = auth.uid());

GRANT SELECT ON public.categorias_ingredientes TO anon, authenticated;
GRANT SELECT ON public.alergenos TO anon, authenticated;
GRANT SELECT ON public.ingredientes TO anon, authenticated;
GRANT SELECT ON public.ingrediente_alergenos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recetas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receta_ingredientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias_ingredientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alergenos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingrediente_alergenos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menus_semanales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.menu_recetas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shopping_list_items TO authenticated;
