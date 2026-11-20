import { GALLERY_BUCKET, supabase } from "./supabase";

export type GalleryCategory = {
  id: string;
  name: string;
  position: number;
};

export type GalleryPriceOption = {
  id: string;
  categoryId: string;
  name: string;
  details: string;
  price: number | null;
  position: number;
};

export type GalleryPhoto = {
  id: string;
  storagePath: string;
  src: string;
  imageError: string | null;
  title: string;
  caption: string;
  categoryId: string | null;
  category: string;
  priceTierId: string | null;
  priceOption: GalleryPriceOption | null;
  customPrice: number | null;
  published: boolean;
  createdAt: string;
};

type PhotoRow = {
  id: string;
  storage_path: string;
  title: string;
  caption: string;
  category_id: string | null;
  price_tier_id?: string | null;
  custom_price?: number | null;
  is_published: boolean;
  created_at: string;
};

type PriceOptionRow = {
  id: string;
  category_id: string;
  name: string;
  details: string;
  price: number | null;
  position: number;
};

const imageTypesByExtension: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
};

const imageExtensionsByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
};

function isMissingPricingSchemaError(code: string, message: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    ["42703", "42P01", "PGRST204", "PGRST205"].includes(code) &&
    ["price_tier_id", "custom_price", "price_options"].some((part) =>
      normalizedMessage.includes(part),
    )
  );
}

export async function readGallery(includeUnpublished = false) {
  if (!supabase) {
    throw new Error(
      "Connect Supabase by adding VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.",
    );
  }

  const { data: categoryRows, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, position")
    .order("position")
    .order("name");
  if (categoryError) throw categoryError;

  let priceOptionRows: PriceOptionRow[] = [];
  let pricingAvailable = true;
  const { data: optionRows, error: optionError } = await supabase
    .from("price_options")
    .select("id, category_id, name, details, price, position")
    .order("position")
    .order("name");
  if (optionError) {
    if (!isMissingPricingSchemaError(optionError.code, optionError.message)) throw optionError;
    pricingAvailable = false;
  } else {
    priceOptionRows = optionRows as PriceOptionRow[];
  }

  const photoQuery = supabase
    .from("photos")
    .select(
      "id, storage_path, title, caption, category_id, price_tier_id, custom_price, is_published, created_at",
    )
    .order("created_at", { ascending: false });
  const result = includeUnpublished ? await photoQuery : await photoQuery.eq("is_published", true);
  let rows: PhotoRow[];
  if (result.error) {
    if (!isMissingPricingSchemaError(result.error.code, result.error.message)) throw result.error;

    const fallbackQuery = supabase
      .from("photos")
      .select("id, storage_path, title, caption, category_id, is_published, created_at")
      .order("created_at", { ascending: false });
    const fallback = includeUnpublished
      ? await fallbackQuery
      : await fallbackQuery.eq("is_published", true);
    if (fallback.error) throw fallback.error;
    rows = fallback.data as PhotoRow[];
    pricingAvailable = false;
  } else {
    rows = result.data as PhotoRow[];
  }

  const signedUrls = rows.length
    ? await supabase.storage.from(GALLERY_BUCKET).createSignedUrls(
        rows.map((photo) => photo.storage_path),
        3600,
      )
    : { data: [], error: null };
  if (signedUrls.error) throw signedUrls.error;
  const signedUrlResults = new Map(
    signedUrls.data.map((item, index) => [item.path ?? rows[index]?.storage_path, item]),
  );
  const categories: GalleryCategory[] = categoryRows;
  const namesById = new Map(categories.map((category) => [category.id, category.name]));
  const priceOptions: GalleryPriceOption[] = priceOptionRows.map((option) => ({
    id: option.id,
    categoryId: option.category_id,
    name: option.name,
    details: option.details,
    price: option.price,
    position: option.position,
  }));
  const priceOptionsById = new Map(priceOptions.map((option) => [option.id, option]));
  const photos: GalleryPhoto[] = rows.map((photo) => {
    const signedUrlResult = signedUrlResults.get(photo.storage_path);
    const imageError =
      signedUrlResult?.error ??
      (signedUrlResult?.signedUrl ? null : "Supabase did not return a signed URL.");
    return {
      id: photo.id,
      storagePath: photo.storage_path,
      src: signedUrlResult?.signedUrl ?? "/favicon.png",
      imageError,
      title: photo.title,
      caption: photo.caption,
      categoryId: photo.category_id,
      category: photo.category_id
        ? (namesById.get(photo.category_id) ?? "Uncategorized")
        : "Uncategorized",
      priceTierId: photo.price_tier_id ?? null,
      priceOption: photo.price_tier_id ? (priceOptionsById.get(photo.price_tier_id) ?? null) : null,
      customPrice: photo.custom_price ?? null,
      published: photo.is_published,
      createdAt: photo.created_at,
    };
  });

  return { categories, photos, priceOptions, pricingAvailable };
}

export async function uploadPhoto(file: File, categoryId: string | null) {
  if (!supabase) throw new Error("Supabase is not configured.");
  if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} is larger than 20 MB.`);

  const fileExtension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  const reportedType = file.type.toLowerCase();
  const contentType = imageExtensionsByType[reportedType]
    ? reportedType
    : imageTypesByExtension[fileExtension ?? ""];
  const extension = contentType ? imageExtensionsByType[contentType] : undefined;
  if (!contentType || !extension) {
    throw new Error(
      `${file.name} is not a supported image. Use JPG, PNG, WebP, AVIF, HEIC, HEIF, or GIF.`,
    );
  }

  const storagePath = `${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType,
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const title = file.name.replace(/\.[^.]+$/, "").trim() || "Untitled";
  const { error: insertError } = await supabase.from("photos").insert({
    storage_path: storagePath,
    title,
    caption: "",
    category_id: categoryId,
    is_published: true,
  });
  if (insertError) {
    const { error: cleanupError } = await supabase.storage
      .from(GALLERY_BUCKET)
      .remove([storagePath]);
    if (cleanupError) {
      throw new Error(
        `${insertError.message} The uploaded image also could not be removed: ${cleanupError.message}`,
      );
    }
    throw insertError;
  }
}

export async function deletePhoto(photo: GalleryPhoto) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error: deleteError } = await supabase.from("photos").delete().eq("id", photo.id);
  if (deleteError) throw deleteError;

  const { error: storageError } = await supabase.storage
    .from(GALLERY_BUCKET)
    .remove([photo.storagePath]);
  if (storageError) {
    throw new Error(
      `The photo record was deleted, but its stored image could not be removed: ${storageError.message}`,
    );
  }
}
