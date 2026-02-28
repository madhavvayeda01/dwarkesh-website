import { z } from "zod";

export const createLeadSchema = z.object({
  fullName: z.string().trim().min(1, "Full Name is required."),
  companyName: z.string().trim().min(1, "Company Name is required."),
  phone: z
    .string()
    .trim()
    .min(1, "Phone is required.")
    .transform((value) => value.replace(/[\s-]/g, ""))
    .refine(
      (value) => /^(?:\+91|91)?[6-9]\d{9}$/.test(value),
      "Enter a valid India phone number."
    )
    .transform((value) => {
      const normalized = value.startsWith("+91")
        ? value.slice(3)
        : value.startsWith("91")
          ? value.slice(2)
          : value;

      return `+91${normalized}`;
    }),
  email: z.string().trim().email("Enter a valid email address."),
  message: z.string().trim().min(1, "Message / Requirement is required."),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
