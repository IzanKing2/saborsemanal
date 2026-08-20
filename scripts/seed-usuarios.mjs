import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. " +
      "Ejecuta con: node --env-file=.env.local scripts/seed-usuarios.mjs",
  );
  process.exit(1);
}

if (!supabaseUrl.includes("127.0.0.1") && !supabaseUrl.includes("localhost")) {
  console.error(
    `NEXT_PUBLIC_SUPABASE_URL apunta a "${supabaseUrl}", que no parece un ` +
      "Supabase local. Este script crea usuarios con contraseñas de prueba " +
      "conocidas: no lo ejecutes contra un proyecto remoto.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function fail(message, error) {
  console.error(message);
  if (error) console.error(error.message ?? error);
  process.exit(1);
}

const users = [
  {
    email: "usuario1@ejemplo.test",
    password: "Password123!",
    displayName: "Usuario Uno",
    role: "usuario",
  },
  {
    email: "usuario2@ejemplo.test",
    password: "Password123!",
    displayName: "Usuario Dos",
    role: "usuario",
  },
  {
    email: "admin@ejemplo.test",
    password: "Password123!",
    displayName: "Admin",
    role: "admin",
  },
];

console.log("Sembrando usuarios de prueba...");

for (const seedUser of users) {
  const { data: existing, error: listError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", seedUser.email)
    .maybeSingle();
  if (listError) fail(`No se pudo comprobar "${seedUser.email}":`, listError);

  let userId = existing?.id ?? null;

  if (!userId) {
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email: seedUser.email,
        password: seedUser.password,
        email_confirm: true,
        user_metadata: { display_name: seedUser.displayName },
      });
    if (createError) fail(`No se pudo crear "${seedUser.email}":`, createError);
    userId = created.user.id;
    console.log(`  Creado: ${seedUser.email} (${seedUser.role})`);
  } else {
    console.log(`  Ya existía: ${seedUser.email} (${seedUser.role})`);
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: seedUser.role, display_name: seedUser.displayName })
    .eq("id", userId);
  if (updateError) fail(`No se pudo actualizar el rol de "${seedUser.email}":`, updateError);
}

console.log("\nCredenciales de prueba (todas usan la misma contraseña):");
for (const seedUser of users) {
  console.log(`  ${seedUser.role.padEnd(8)} ${seedUser.email}  /  ${seedUser.password}`);
}
console.log("\nSeed de usuarios completado.");
