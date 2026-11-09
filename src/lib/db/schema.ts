// Zod validation schemas — the trust boundary for all writes.
import { z } from "zod";

export const currencyEnum = z.enum(["USD", "INR"]);
export const modelEnum = z.enum(["free", "freemium", "paid"]);
export const pubStatusEnum = z.enum([
  "draft",
  "published",
  "unpublished",
  "archived",
]);

export const pricingSchema = z.object({
  model: modelEnum,
  price: z.number().int().min(0),
  mrp: z.number().int().min(0),
  currency: currencyEnum,
  freemiumNote: z.string().max(400).optional(),
  subscriptionNote: z.string().max(400).optional(),
  lifetime: z.boolean(),
}).superRefine((v, ctx) => {
  if (v.model === "free" && v.price !== 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["price"], message: "Free apps must have a zero price." });
  }
  if (v.model === "paid" && v.price <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["price"], message: "Paid apps must have a price greater than zero." });
  }
  if (v.mrp > 0 && v.price > v.mrp) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mrp"], message: "MRP cannot be lower than the selling price." });
  }
});

export const screenshotSchema = z.object({
  url: z.string().min(1),
  alt: z.string().max(200),
});

export const releaseInputSchema = z.object({
  versionName: z.string().min(1).max(40),
  versionCode: z.number().int().min(1),
  releaseDate: z.string().min(1),
  changelog: z.string().max(5000),
  apkStorageKey: z.string().min(1),
  fileName: z.string().min(1).max(200),
  fileSizeBytes: z.number().int().min(0),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i, "must be a 64-char hex SHA-256"),
  signatureVerified: z.boolean().optional(),
  minAndroid: z.string().max(20),
  targetAndroid: z.string().max(20),
  status: z.enum(["published", "unpublished"]),
});

export const appInputSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "kebab-case only"),
  name: z.string().min(1).max(80),
  tagline: z.string().min(1).max(160),
  description: z.string().max(8000),
  iconUrl: z.string().min(1),
  screenshots: z.array(screenshotSchema).max(12),
  category: z.string().min(1).max(40),
  features: z.array(z.string().max(120)).max(24),
  pricing: pricingSchema,
  status: pubStatusEnum,
  featured: z.boolean(),
  order: z.number().int(),
  privacyNote: z.string().max(4000),
  permissions: z.array(z.string().max(120)).max(40),
  developer: z.string().max(80),
});

export const reviewInputSchema = z.object({
  appId: z.string().min(1),
  author: z.string().min(1).max(60),
  stars: z.number().int().min(1).max(5),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
});

export const legalSchema = z.object({
  id: z.enum(["terms", "privacy", "refund", "download-notice"]),
  title: z.string().min(1).max(120),
  body: z.string().max(50000),
});

export const siteConfigSchema = z.object({
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(500),
  announcement: z.string().max(300),
  announcementEnabled: z.boolean(),
  heroHeadline: z.string().max(200),
  heroSubline: z.string().max(400),
});

export const loginSchema = z.object({
  password: z.string().min(1).max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12).max(200),
});

export const checkoutCreateSchema = z.object({
  appId: z.string().min(1),
  displayCurrency: currencyEnum,
});

export const checkoutCaptureSchema = z.object({
  orderId: z.string().min(1),
  providerOrderId: z.string().min(1),
});

export type AppInput = z.infer<typeof appInputSchema>;
export type ReleaseInput = z.infer<typeof releaseInputSchema>;
export type ReviewInput = z.infer<typeof reviewInputSchema>;
