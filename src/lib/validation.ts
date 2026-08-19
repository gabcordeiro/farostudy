/**
 * Esquemas Zod compartilhados entre front e edge functions.
 * Validar TODO input (checklist segurança #14) e restringir uploads (#16).
 */
import { z } from "zod";

const APKG_MAX_BYTES = 50 * 1024 * 1024; // 50 MB (espelha o limite do bucket)
const APKG_MIME = new Set([
  "application/zip",
  "application/octet-stream",
  "application/x-anki",
]);

export const cardInputSchema = z.object({
  deckId: z.string().uuid(),
  front: z.string().trim().min(1, "Frente obrigatória").max(8000),
  back: z.string().trim().min(1, "Verso obrigatório").max(8000),
  hint: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});
export type CardInput = z.infer<typeof cardInputSchema>;

export const cardEditSchema = z.object({
  front: z.string().trim().min(1, "Frente obrigatória").max(8000),
  back: z.string().trim().min(1, "Verso obrigatório").max(8000),
  hint: z.string().trim().max(2000).optional(),
});
export type CardEditInput = z.infer<typeof cardEditSchema>;

export const deckTitleSchema = z.string().trim().min(1, "Título obrigatório").max(160);

export const deckInputSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(160),
  description: z.string().trim().max(2000).optional(),
  categoryId: z.string().uuid().nullable().optional(),
});
export type DeckInput = z.infer<typeof deckInputSchema>;

export const reviewInputSchema = z.object({
  cardId: z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  durationMs: z.number().int().min(0).max(600000).optional(),
});
export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const aiGenerateSchema = z.object({
  deckId: z.string().uuid(),
  mode: z.enum(["text", "json", "file"]),
  content: z.string().trim().min(1).max(50000),
  maxCards: z.number().int().min(1).max(100).default(20),
});
export type AiGenerateInput = z.infer<typeof aiGenerateSchema>;

/** Validação client-side do arquivo .apkg antes do upload. */
export function validateApkgFile(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size > APKG_MAX_BYTES) {
    return { ok: false, error: "Arquivo maior que 50 MB." };
  }
  const isApkgName = file.name.toLowerCase().endsWith(".apkg");
  if (!isApkgName) {
    return { ok: false, error: "Envie um arquivo .apkg do Anki." };
  }
  // .apkg e um zip; navegadores costumam reportar application/zip ou vazio.
  if (file.type && !APKG_MIME.has(file.type)) {
    return { ok: false, error: "Tipo de arquivo não suportado." };
  }
  return { ok: true };
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB (espelha o bucket)
const AVATAR_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Validação client-side de foto de perfil antes do upload (#16). */
export function validateAvatarFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!AVATAR_MIME.has(file.type)) {
    return { ok: false, error: "Envie uma imagem PNG, JPG ou WebP." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { ok: false, error: "Imagem maior que 2 MB." };
  }
  return { ok: true };
}

export const profileUpdateSchema = z.object({
  display_name: z.string().trim().min(1, "Nome obrigatório").max(80),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const authEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z
    .string()
    .min(8, "Mínimo de 8 caracteres")
    .max(72, "Máximo de 72 caracteres"),
});
