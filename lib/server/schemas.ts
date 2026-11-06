/** Request shapes for the customer API, validated on the server. */
import { z } from "zod";
import { colorNameSchema, productIdSchema, sizeSchema } from "@/lib/schemas";
import { DISTRICTS } from "@/lib/warehouses";

export const lineSchema = z.object({
  productId: productIdSchema,
  colorName: colorNameSchema,
  size: sizeSchema,
  quantity: z.number().int().min(1).max(10),
});
export const linesSchema = z.array(lineSchema).min(1, "Your bag is empty.").max(30);

export const districtSchema = z
  .string()
  .refine((d) => d in DISTRICTS, "Please choose your district.");

export const addressSchema = z.object({
  name: z.string().trim().min(2, "Please enter the receiver's name.").max(60),
  phone: z
    .string()
    .trim()
    .regex(
      /^(?:\+?880|0)1[3-9]\d{8}$/,
      "Please enter a Bangladeshi mobile number, e.g. 01712345678.",
    ),
  district: districtSchema,
  area: z.string().trim().min(2, "Please enter your area / thana.").max(60),
  line: z.string().trim().min(5, "Please enter the house, road and landmark.").max(200),
});
