import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useUpsertMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/lib/auth";
import { useLang } from "@/lib/i18n";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const upsert = useUpsertMyProfile();
  const { user } = useUser();
  const { lang } = useLang();

  const L = (map: Record<string, string>) => map[lang] ?? map["en"];

  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Cambia password ────────────────────────────────────────────────────────
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (pwNew.length < 8) {
      setPwError(L({ it: "La nuova password deve avere almeno 8 caratteri.", en: "New password must be at least 8 characters.", fr: "Le mot de passe doit comporter au moins 8 caractères.", pt: "A senha deve ter pelo menos 8 caracteres.", es: "La contraseña debe tener al menos 8 caracteres.", ja: "新しいパスワードは8文字以上必要です。" }));
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError(L({ it: "Le password non corrispondono.", en: "Passwords do not match.", fr: "Les mots de passe ne correspondent pas.", pt: "As senhas não coincidem.", es: "Las contraseñas no coinciden.", ja: "パスワードが一致しません。" }));
      return;
    }
    setPwLoading(true);
    try {
      await user?.updatePassword({ currentPassword: pwCurrent, newPassword: pwNew });
      toast({ title: L({ it: "✅ Password aggiornata!", en: "✅ Password updated!", fr: "✅ Mot de passe mis à jour\u00a0!", pt: "✅ Senha atualizada!", es: "✅ ¡Contraseña actualizada!", ja: "✅ パスワードを更新しました！" }) });
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      setShowPasswordForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("incorrect") || msg.includes("wrong")) {
        setPwError(L({ it: "Password attuale non corretta.", en: "Current password is incorrect.", fr: "Mot de passe actuel incorrect.", pt: "Senha atual incorreta.", es: "Contraseña actual incorrecta.", ja: "現在のパスワードが正しくありません。" }));
      } else {
        setPwError(msg || L({ it: "Errore durante il cambio password.", en: "Error changing password.", fr: "Erreur lors du changement de mot de passe.", pt: "Erro ao alterar a senha.", es: "Error al cambiar la contraseña.", ja: "パスワードの変更中にエラーが発生しました。" }));
      }
    } finally {
      setPwLoading(false);
    }
  }

  function handlePhotoSelect(file: File) {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadPhoto(file: File): Promise<string> {
    const mime = file.type || "image/jpeg";
    const res = await fetch("/api/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: mime }),
    });
    if (!res.ok) throw new Error("Failed to get upload URL");
    const { uploadURL } = await res.json();
    const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": mime }, body: file });
    if (!putRes.ok) throw new Error("Failed to upload photo");
    const putData = await putRes.json();
    return putData.finalObjectPath as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) {
      toast({ title: L({ it: "Username obbligatorio", en: "Username required", fr: "Nom d'utilisateur requis", pt: "Nome de usuário obrigatório", es: "Nombre de usuario requerido", ja: "ユーザー名は必須です" }), variant: "destructive" });
      return;
    }
    try {
      setUploading(true);
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      }
      await upsert.mutateAsync({
        data: {
          username: username.trim(),
          city: city.trim() || null,
          country: country.trim() || null,
          photoUrl,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      toast({ title: L({ it: "Profilo salvato!", en: "Profile saved!", fr: "Profil enregistré\u00a0!", pt: "Perfil salvo!", es: "¡Perfil guardado!", ja: "プロフィールを保存しました！" }) });
      setLocation("/feed");
    } catch (err: any) {
      const msg = err?.response?.data?.error || L({ it: "Errore nel salvataggio.", en: "Failed to save profile.", fr: "Erreur lors de la sauvegarde.", pt: "Erro ao salvar perfil.", es: "Error al guardar el perfil.", ja: "プロフィールの保存に失敗しました。" });
      toast({ title: L({ it: "Errore", en: "Error", fr: "Erreur", pt: "Erro", es: "Error", ja: "エラー" }), description: msg, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const eyeOpen = (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
  const eyeOff = (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
    </svg>
  );

  const pwStrength = pwNew.length >= 12 && /[A-Z]/.test(pwNew) && /[0-9]/.test(pwNew) && /[^A-Za-z0-9]/.test(pwNew) ? 4
    : pwNew.length >= 10 && (/[A-Z]/.test(pwNew) || /[0-9]/.test(pwNew)) ? 3
    : pwNew.length >= 8 ? 2
    : 1;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* ── Sezione profilo ────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-full overflow-hidden mx-auto mb-4">
              <img src="/icon-192.png" alt="TreeShare" width="56" height="56" style={{ objectFit: "cover", borderRadius: "50%" }} />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {L({ it: "Il tuo profilo", en: "Your profile", fr: "Votre profil", pt: "Seu perfil", es: "Tu perfil", ja: "プロフィール" })}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {L({ it: "Personalizza il tuo account TreeShare", en: "Customize your TreeShare account", fr: "Personnalisez votre compte TreeShare", pt: "Personalize sua conta TreeShare", es: "Personaliza tu cuenta TreeShare", ja: "TreeShareアカウントをカスタマイズ" })}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Foto profilo */}
            <div className="text-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-select-photo"
                className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border mx-auto cursor-pointer flex items-center justify-center overflow-hidden hover:border-primary transition-colors"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-primary mt-2 block mx-auto hover:underline"
              >
                {photoPreview
                  ? L({ it: "Cambia foto", en: "Change photo", fr: "Changer la photo", pt: "Alterar foto", es: "Cambiar foto", ja: "写真を変更" })
                  : L({ it: "Aggiungi foto profilo", en: "Add profile photo", fr: "Ajouter une photo de profil", pt: "Adicionar foto de perfil", es: "Agregar foto de perfil", ja: "プロフィール写真を追加" })
                }
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
                data-testid="input-profile-photo"
              />
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1">
                Username *
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="yourname"
                data-testid="input-username"
                maxLength={50}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
              />
            </div>

            {/* Città / Paese */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-foreground mb-1">
                  {L({ it: "Città", en: "City", fr: "Ville", pt: "Cidade", es: "Ciudad", ja: "都市" })}
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Rome"
                  data-testid="input-city"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-foreground mb-1">
                  {L({ it: "Paese", en: "Country", fr: "Pays", pt: "País", es: "País", ja: "国" })}
                </label>
                <input
                  id="country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Italy"
                  data-testid="input-country"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || upsert.isPending}
              data-testid="button-save-profile"
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {uploading || upsert.isPending
                ? L({ it: "Salvataggio...", en: "Saving...", fr: "Enregistrement...", pt: "Salvando...", es: "Guardando...", ja: "保存中..." })
                : L({ it: "Salva profilo", en: "Save profile", fr: "Enregistrer", pt: "Salvar perfil", es: "Guardar perfil", ja: "プロフィールを保存" })
              }
            </button>
          </form>
        </div>

        {/* ── Sezione Cambia password ────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => { setShowPasswordForm((v) => !v); setPwError(null); }}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {L({ it: "Cambia password", en: "Change password", fr: "Changer le mot de passe", pt: "Alterar senha", es: "Cambiar contraseña", ja: "パスワードを変更" })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {L({ it: "Aggiorna la tua password di accesso", en: "Update your login password", fr: "Mettez à jour votre mot de passe", pt: "Atualize sua senha de acesso", es: "Actualiza tu contraseña de acceso", ja: "ログインパスワードを更新" })}
                </p>
              </div>
            </div>
            <svg
              width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              className={`text-muted-foreground flex-shrink-0 transition-transform ${showPasswordForm ? "rotate-90" : ""}`}
            >
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="px-6 pb-6 pt-2 space-y-4 border-t border-border bg-muted/30">
              {/* Password attuale */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {L({ it: "Password attuale", en: "Current password", fr: "Mot de passe actuel", pt: "Senha atual", es: "Contraseña actual", ja: "現在のパスワード" })}
                </label>
                <div className="relative">
                  <input
                    type={showPwCurrent ? "text" : "password"}
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 pr-10 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button type="button" onClick={() => setShowPwCurrent((v) => !v)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPwCurrent ? eyeOff : eyeOpen}
                  </button>
                </div>
              </div>

              {/* Nuova password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {L({ it: "Nuova password", en: "New password", fr: "Nouveau mot de passe", pt: "Nova senha", es: "Nueva contraseña", ja: "新しいパスワード" })}
                  <span className="normal-case font-normal ml-1">(min. 8)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPwNew ? "text" : "password"}
                    value={pwNew}
                    onChange={(e) => setPwNew(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 pr-10 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button type="button" onClick={() => setShowPwNew((v) => !v)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPwNew ? eyeOff : eyeOpen}
                  </button>
                </div>
                {pwNew.length > 0 && (
                  <div className="flex gap-1">
                    {[1,2,3,4].map((lvl) => (
                      <div key={lvl} className={`h-1 flex-1 rounded-full transition-colors ${lvl <= pwStrength
                        ? pwStrength === 1 ? "bg-red-400" : pwStrength === 2 ? "bg-yellow-400" : pwStrength === 3 ? "bg-blue-400" : "bg-green-500"
                        : "bg-border"}`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Conferma password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {L({ it: "Conferma nuova password", en: "Confirm new password", fr: "Confirmer le mot de passe", pt: "Confirmar nova senha", es: "Confirmar contraseña", ja: "パスワードを確認" })}
                </label>
                <div className="relative">
                  <input
                    type={showPwConfirm ? "text" : "password"}
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={`w-full px-3 py-2.5 pr-10 text-sm bg-background border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                      pwConfirm.length > 0 && pwConfirm !== pwNew ? "border-destructive" : "border-border"
                    }`}
                  />
                  <button type="button" onClick={() => setShowPwConfirm((v) => !v)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPwConfirm ? eyeOff : eyeOpen}
                  </button>
                </div>
                {pwConfirm.length > 0 && pwConfirm !== pwNew && (
                  <p className="text-xs text-destructive">
                    {L({ it: "Le password non corrispondono", en: "Passwords do not match", fr: "Les mots de passe ne correspondent pas", pt: "As senhas não coincidem", es: "Las contraseñas no coinciden", ja: "パスワードが一致しません" })}
                  </p>
                )}
              </div>

              {/* Errore */}
              {pwError && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-destructive flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/>
                  </svg>
                  <p className="text-xs text-destructive leading-snug">{pwError}</p>
                </div>
              )}

              {/* Pulsanti */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowPasswordForm(false); setPwError(null); setPwCurrent(""); setPwNew(""); setPwConfirm(""); }}
                  disabled={pwLoading}
                  className="flex-1 py-2.5 border border-border text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {L({ it: "Annulla", en: "Cancel", fr: "Annuler", pt: "Cancelar", es: "Cancelar", ja: "キャンセル" })}
                </button>
                <button
                  type="submit"
                  disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm || pwNew !== pwConfirm}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {pwLoading
                    ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {L({ it: "Salvataggio...", en: "Saving...", fr: "Enregistrement...", pt: "Salvando...", es: "Guardando...", ja: "保存中..." })}
                      </>
                    : L({ it: "Aggiorna password", en: "Update password", fr: "Mettre à jour", pt: "Atualizar senha", es: "Actualizar contraseña", ja: "パスワードを更新" })
                  }
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
