# 📜 Constitución del Proyecto: SaborSemanal

Bienvenido a la **única fuente de la verdad** para el desarrollo de **SaborSemanal**, un planificador de menú semanal y recetario inteligente diseñado para optimizar las compras y la alimentación diaria.

---

## 🎯 1. Misión del Proyecto

**SaborSemanal** tiene como objetivo ayudar a las familias e individuos a planificar sus menús semanales de manera eficiente, promoviendo una alimentación organizada y reduciendo el desperdicio de comida. La aplicación consolida de manera automática las recetas elegidas en una lista de la compra optimizada, consolidada y categorizada por pasillos de supermercado (lácteos, cereales, verduras, etc.).

---

## 💻 2. Stack Tecnológico (Opción A - Serverless y Moderna)

Para garantizar un desarrollo ágil, seguro, con gran escalabilidad y altamente compatible con agentes de inteligencia artificial, se ha seleccionado el siguiente stack tecnológico:

*   **Frontend & Backend (Fullstack):** [Next.js](https://nextjs.org/) (App Router) con **TypeScript** y **Tailwind CSS**.
*   **Base de Datos & Autenticación:** [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth y Row Level Security - RLS).
*   **Gestor de Paquetes & Entorno:** [PNPM](https://pnpm.io/) o [UV](https://github.com/astral-sh/uv) (para dependencias).
*   **Pruebas (Testing):** [Jest](https://jestjs.io/) y [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) para frontend, y pruebas de integración sobre Postgres / Supabase Client.

---

## 🗄️ 3. Modelo de Datos Relacional (PostgreSQL en Supabase)

Para la consolidación exacta de ingredientes y un control de accesos estricto, utilizaremos el siguiente esquema de base de datos relacional:

```sql
-- 1. Tabla de Perfiles (Extiende auth.users de Supabase)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'usuario' CHECK (role IN ('usuario', 'admin')),
    banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categorías Globales de Ingredientes (Ej. Lácteos, Cereales, Frutas)
CREATE TABLE public.categorias_ingredientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla Maestra de Ingredientes
CREATE TABLE public.ingredientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    categoria_id UUID REFERENCES public.categorias_ingredientes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Recetas
CREATE TABLE public.recetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion TEXT,
    instrucciones TEXT[] NOT NULL, -- Array de pasos secuenciales
    imagen_url TEXT,
    creador_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    publica BOOLEAN DEFAULT FALSE, -- Si es pública, visible para invitados
    tiempo_preparacion INT DEFAULT 0, -- Minutos
    porciones INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla Relacional de Ingredientes por Receta (Con cantidades)
CREATE TABLE public.receta_ingredientes (
    receta_id UUID REFERENCES public.recetas(id) ON DELETE CASCADE,
    ingrediente_id UUID REFERENCES public.ingredientes(id) ON DELETE CASCADE,
    cantidad NUMERIC NOT NULL,
    unidad TEXT NOT NULL, -- Ej. 'g', 'ml', 'unidad', 'cucharada'
    PRIMARY KEY (receta_id, ingrediente_id)
);

-- 6. Planificación de Menús Semanales
CREATE TABLE public.menus_semanales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Platos asignados al Menú Semanal
CREATE TABLE public.menu_recetas (
    menu_id UUID REFERENCES public.menus_semanales(id) ON DELETE CASCADE,
    receta_id UUID REFERENCES public.recetas(id) ON DELETE CASCADE,
    dia_semana TEXT NOT NULL CHECK (dia_semana IN ('Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo')),
    tipo_comida TEXT NOT NULL CHECK (tipo_comida IN ('Desayuno', 'Almuerzo', 'Cena')),
    PRIMARY KEY (menu_id, receta_id, dia_semana, tipo_comida)
);

-- 8. Elementos de la Lista de la Compra (Sincronizados en la nube para usuarios)
CREATE TABLE public.shopping_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ingrediente_id UUID REFERENCES public.ingredientes(id) ON DELETE CASCADE,
    cantidad NUMERIC NOT NULL,
    unidad TEXT NOT NULL,
    comprado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔏 4. Roles y Permisos (Políticas RLS en Supabase)

Garantizaremos la seguridad mediante Row Level Security (RLS) en Supabase:

1.  **Invitado (No logueado):**
    *   **Lectura:** Solo puede leer recetas que tengan `publica = true`.
    *   **Lista de la compra:** Sus datos de menú semanal e ingredientes se guardan de forma local en el navegador utilizando `LocalStorage`. No se escribe nada en la base de datos de Supabase.
2.  **Usuario (Autenticado):**
    *   **CRUD de Recetas:** Puede crear recetas. Solo puede editar y borrar recetas donde `creador_id` sea igual a su `auth.uid()`.
    *   **Sincronización:** Puede guardar su menú semanal y su lista de la compra en la nube. La base de datos garantiza mediante RLS que `usuario_id = auth.uid()`.
3.  **Admin (Administrador):**
    *   **Moderación:** Puede aprobar/validar recetas de los usuarios antes de que se vuelvan públicas (se añadirá un flag `aprobada` en la tabla `recetas`).
    *   **Baneos:** Puede marcar usuarios como `banned = true` en `profiles`.
    *   **Control Global:** Añadir, editar o eliminar categorías globales en `categorias_ingredientes` e `ingredientes`.

---

## 🗺️ 5. Roadmap de Desarrollo (Hito por Hito)

Seguiremos la metodología **SDD: Feature-by-Feature** de forma secuencial. No avanzaremos al siguiente hito hasta que el anterior tenga pruebas en verde y un commit limpio.

*   **🧱 Hito 1: Infraestructura Base, Autenticación y Esquema DB**
    *   Configuración inicial de Next.js, Tailwind CSS y cliente de Supabase.
    *   Ejecución de migraciones SQL en Supabase para el esquema relacional.
    *   Implementación del flujo de Registro, Login y Logout.
    *   Control de roles (Usuario y Admin) en base de datos.
*   **🥗 Hito 2: CRUD de Recetas e Ingredientes**
    *   Creación del panel para añadir recetas asociando ingredientes de la lista maestra.
    *   Funcionalidad de "Publicar receta" (pendiente de validación del Admin si procede).
    *   Vista detallada de la receta y buscador con filtros de alérgenos y tiempo.
*   **📅 Hito 3: El Planificador de Menú Semanal**
    *   Calendario interactivo (Lunes a Domingo x Desayuno, Almuerzo, Cena).
    *   Añadir recetas al menú semanal (en LocalStorage para invitados; sincronizado en DB para usuarios logueados).
*   **🛒 Hito 4: El Motor de la Lista de la Compra (Consolidación)**
    *   Algoritmo que lee las recetas del menú semanal, extrae sus ingredientes, los agrupa por `ingrediente_id`, suma sus cantidades (siempre que coincidan las unidades) y los separa por secciones utilizando `categorias_ingredientes`.
    *   Función de tachar/comprar elementos.

---

## 6. Enmiendas del esquema y estado del roadmap - 2026-07-30

La fuente de verdad ejecutable del esquema son las migraciones versionadas en
`supabase/migrations/`. El bloque SQL de la sección 3 representa únicamente el
modelo inicial.

Cambios aprobados desde el modelo inicial:

- `recetas` incorpora moderación, actualización e integridad adicional.
- `receta_ingredientes` usa PK UUID y admite una fuente maestra o un nombre
  personalizado. Los personalizados solo pueden usarse en recetas privadas.
- Las imágenes se almacenan en un bucket privado y se sirven con URL firmada.
- `menus_semanales` identifica una semana por su lunes de inicio.
- Cada menú admite una sola receta por combinación de día y tipo de comida.
- Las escrituras complejas se realizan mediante RPC transaccionales y RLS.

Estado:

- Hito 1: completado.
- Hito 2: completado.
- Hito 3: completado.
- Hito 4: especificado y pendiente de implementación.

Para el Hito 4, los ingredientes maestros se consolidarán por
`(ingrediente_id, unidad)` y los personalizados por
`(nombre_normalizado, unidad)`. Cada aparición de una receta en un slot del menú
aportará una vez sus cantidades. El ajuste por número de comensales queda fuera
del alcance inicial.
