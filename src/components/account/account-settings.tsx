"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import {
  deleteAccountAction,
  updateProfileAction,
} from "@/lib/actions/cuenta";
import { createClient } from "@/lib/supabase/client";

type Allergen = { id: string; nombre: string };

type AccountSettingsProps = {
  userId: string;
  email: string;
  displayName: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  allergens: Allergen[];
  selectedAllergenIds: string[];
};

const allowedImageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export function AccountSettings({
  userId,
  email,
  displayName: initialDisplayName,
  avatarPath: initialAvatarPath,
  avatarUrl,
  allergens,
  selectedAllergenIds,
}: AccountSettingsProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [selected, setSelected] = useState(new Set(selectedAllergenIds));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newEmail, setNewEmail] = useState(email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [securityMessage, setSecurityMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    const supabase = createClient();
    let nextAvatarPath = removeAvatar ? null : initialAvatarPath;
    let uploadedPath: string | null = null;

    try {
      if (avatarFile) {
        const extension = allowedImageTypes.get(avatarFile.type);
        if (!extension || avatarFile.size > 2 * 1024 * 1024) {
          setProfileMessage({
            ok: false,
            text: "El avatar debe ser JPG, PNG o WebP y pesar como máximo 2 MiB.",
          });
          setSavingProfile(false);
          return;
        }
        uploadedPath = `${userId}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage
          .from("profile-avatars")
          .upload(uploadedPath, avatarFile, { contentType: avatarFile.type });
        if (error) throw error;
        nextAvatarPath = uploadedPath;
      }

      const result = await updateProfileAction({
        displayName,
        avatarPath: nextAvatarPath,
        allergenIds: [...selected],
      });
      if (!result.ok) {
        if (uploadedPath) {
          await supabase.storage.from("profile-avatars").remove([uploadedPath]);
        }
        setProfileMessage({ ok: false, text: result.message });
        setSavingProfile(false);
        return;
      }

      if (initialAvatarPath && initialAvatarPath !== nextAvatarPath) {
        await supabase.storage
          .from("profile-avatars")
          .remove([initialAvatarPath]);
      }
      setProfileMessage({ ok: true, text: result.message });
      setAvatarFile(null);
      setRemoveAvatar(false);
      router.refresh();
    } catch {
      if (uploadedPath) {
        await supabase.storage.from("profile-avatars").remove([uploadedPath]);
      }
      setProfileMessage({ ok: false, text: "No se pudo guardar el perfil." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveSecurity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingSecurity(true);
    setSecurityMessage(null);
    if (
      newPassword &&
      (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword))
    ) {
      setSecurityMessage({
        ok: false,
        text: "La nueva contraseña necesita 8 caracteres, una mayúscula y un número.",
      });
      setSavingSecurity(false);
      return;
    }
    const supabase = createClient();
    let passwordUpdated = false;
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (authError) {
        setSecurityMessage({ ok: false, text: "La contraseña actual no es correcta." });
        return;
      }
      if (newPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          setSecurityMessage({
            ok: false,
            text: "No se pudo actualizar la contraseña.",
          });
          return;
        }
        passwordUpdated = true;
      }
      if (newEmail.trim() !== email) {
        const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
        if (error) {
          setSecurityMessage({
            ok: false,
            text: passwordUpdated
              ? "La contraseña se actualizó, pero no se pudo iniciar el cambio de email."
              : "No se pudo iniciar el cambio de email.",
          });
          return;
        }
      }
      setCurrentPassword("");
      setNewPassword("");
      setSecurityMessage({
        ok: true,
        text:
          newEmail.trim() !== email
            ? "Revisa ambos correos para confirmar el cambio de email."
            : "Datos de seguridad actualizados.",
      });
    } catch {
      setSecurityMessage({
        ok: false,
        text: passwordUpdated
          ? "La contraseña se actualizó, pero el resto de cambios no pudo completarse."
          : "No se pudieron actualizar los datos.",
      });
    } finally {
      setSavingSecurity(false);
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteConfirmation !== "ELIMINAR") return;
    setDeleting(true);
    setSecurityMessage(null);
    try {
      const result = await deleteAccountAction(
        deletePassword,
        deleteConfirmation,
      );
      if (!result.ok) {
        setSecurityMessage({ ok: false, text: result.message });
        return;
      }
      window.location.assign("/");
    } catch {
      setSecurityMessage({
        ok: false,
        text:
          "No se pudo eliminar la cuenta. La cuenta sigue activa.",
      });
    } finally {
      setDeleting(false);
    }
  }

  const messageClass = (ok: boolean) =>
    `rounded-xl border px-4 py-3 text-sm ${
      ok
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-red-200 bg-red-50 text-red-700"
    }`;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <form className="space-y-7 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8" onSubmit={saveProfile}>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Identidad</p>
          <h2 className="mt-2 text-2xl font-black text-stone-950">Tu perfil</h2>
        </div>
        {profileMessage && <p className={messageClass(profileMessage.ok)} role={profileMessage.ok ? "status" : "alert"}>{profileMessage.text}</p>}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-950 text-3xl font-black text-amber-300 ring-4 ring-amber-100">
            {avatarUrl && !removeAvatar ? <Image alt="Tu foto de perfil" fill className="object-cover" sizes="96px" src={avatarUrl} /> : displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-bold text-stone-800" htmlFor="avatar">Foto de perfil</label>
            <input accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-bold file:text-emerald-800" id="avatar" onChange={(event) => { setAvatarFile(event.target.files?.[0] ?? null); setRemoveAvatar(false); }} type="file" />
            <p className="mt-2 text-xs text-stone-500">JPG, PNG o WebP. Máximo 2 MiB.</p>
            {initialAvatarPath && <button className="mt-2 text-sm font-bold text-red-700 hover:underline" onClick={() => { setRemoveAvatar(true); setAvatarFile(null); }} type="button">Quitar foto actual</button>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-stone-800" htmlFor="display-name">Nombre visible</label>
          <input className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" id="display-name" maxLength={60} minLength={2} onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />
          <p className="mt-2 text-xs text-stone-500">Aparecerá como autor en tus recetas públicas.</p>
        </div>
        <fieldset>
          <legend className="text-sm font-bold text-stone-800">Alérgenos que quieres evitar</legend>
          <p className="mt-1 text-sm text-stone-500">Se aplicarán por defecto al catálogo.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {allergens.map((allergen) => (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" key={allergen.id}>
                <input checked={selected.has(allergen.id)} className="size-4 accent-emerald-700" onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(allergen.id); else next.delete(allergen.id); return next; })} type="checkbox" />
                {allergen.nombre}
              </label>
            ))}
          </div>
        </fieldset>
        <button className="rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60" disabled={savingProfile} type="submit">{savingProfile ? "Guardando..." : "Guardar perfil"}</button>
      </form>

      <div className="space-y-6">
        <form className="space-y-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm" onSubmit={saveSecurity}>
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Acceso</p><h2 className="mt-2 text-2xl font-black text-stone-950">Seguridad</h2></div>
          {securityMessage && <p className={messageClass(securityMessage.ok)} role={securityMessage.ok ? "status" : "alert"}>{securityMessage.text}</p>}
          <div><label className="text-sm font-bold" htmlFor="account-email">Email</label><input className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" id="account-email" onChange={(event) => setNewEmail(event.target.value)} required type="email" value={newEmail} /></div>
          <div><label className="text-sm font-bold" htmlFor="current-password">Contraseña actual</label><input className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" id="current-password" onChange={(event) => setCurrentPassword(event.target.value)} required type="password" value={currentPassword} /></div>
          <div><label className="text-sm font-bold" htmlFor="new-password">Nueva contraseña <span className="font-normal text-stone-500">(opcional)</span></label><input className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3" id="new-password" onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} /></div>
          <button className="rounded-xl border border-emerald-700 px-5 py-3 font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60" disabled={savingSecurity} type="submit">{savingSecurity ? "Actualizando..." : "Actualizar acceso"}</button>
        </form>

        <form className="space-y-4 rounded-3xl border border-red-200 bg-red-50 p-6" onSubmit={deleteAccount}>
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-red-700">Zona peligrosa</p><h2 className="mt-2 text-xl font-black text-red-950">Eliminar cuenta</h2></div>
          <p className="text-sm leading-6 text-red-800">Se borrarán datos privados e imágenes. Las recetas públicas aprobadas permanecerán como anónimas.</p>
          <div><label className="text-sm font-bold text-red-950" htmlFor="delete-password">Contraseña</label><input className="mt-2 w-full rounded-xl border border-red-300 bg-white px-4 py-3" id="delete-password" onChange={(event) => setDeletePassword(event.target.value)} required type="password" value={deletePassword} /></div>
          <div><label className="text-sm font-bold text-red-950" htmlFor="delete-confirmation">Escribe ELIMINAR</label><input className="mt-2 w-full rounded-xl border border-red-300 bg-white px-4 py-3" id="delete-confirmation" onChange={(event) => setDeleteConfirmation(event.target.value)} required value={deleteConfirmation} /></div>
          <button className="rounded-xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-800 disabled:opacity-50" disabled={deleting || deleteConfirmation !== "ELIMINAR"} type="submit">{deleting ? "Eliminando..." : "Eliminar mi cuenta"}</button>
        </form>
      </div>
    </div>
  );
}
