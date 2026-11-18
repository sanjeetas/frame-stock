import { z } from "zod";
export const productOptions = z
  .record(
    z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
    z.string().min(1).max(100),
  )
  .refine(
    (value) => Object.keys(value).length <= 8,
    "Too many product options.",
  );
export const customisation = z
  .object({
    family: z.string().trim().min(1).max(60),
    quoteRequired: z.boolean(),
    options: z
      .array(
        z
          .object({
            key: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
            label: z.string().min(1).max(60),
            values: z.array(z.string().min(1).max(100)).min(1).max(20),
          })
          .strict(),
      )
      .max(8)
      .refine(
        (options) => new Set(options.map((o) => o.key)).size === options.length,
        "Option keys must be unique.",
      ),
    profile: z
      .object({
        width: z.number().int().min(200).max(2400),
        height: z.number().int().min(200).max(2400),
        twoSided: z.boolean(),
        mockup: z.boolean(),
        mockupImage: z
          .string()
          .regex(/^assets\/[\w.-]+$/)
          .max(150)
          .optional(),
        label: z.string().min(1).max(150),
        shape: z.enum(["circle", "oval", "rounded"]).optional(),
        printArea: z
          .object({
            x: z.number().min(0).max(1),
            y: z.number().min(0).max(1),
            width: z.number().positive().max(1),
            height: z.number().positive().max(1),
          })
          .strict()
          .refine((p) => p.x + p.width <= 1 && p.y + p.height <= 1)
          .optional(),
      })
      .strict(),
  })
  .strict();
