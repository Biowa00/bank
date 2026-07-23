"use client";

/**
 * Redimensionne et recompresse une image côté navigateur avant envoi.
 * Nécessaire car les fonctions serverless Vercel refusent (413) les requêtes
 * dont le corps dépasse ~4,5 Mo — une webcam de PC (résolution native bien
 * plus élevée qu'une caméra de téléphone) peut produire un fichier qui, combiné
 * à la pièce d'identité, dépasse cette limite alors que chaque fichier pris
 * isolément respecte la limite affichée à l'utilisateur.
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1280,
  quality = 0.82,
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob || blob.size >= file.size) return file; // pas d'amélioration, garde l'original

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}
