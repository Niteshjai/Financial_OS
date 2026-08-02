import { z } from 'zod';

export const NomineeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  dob: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format (must be ISO string or YYYY-MM-DD)",
  }),
  relationship: z.enum(["SPOUSE", "CHILD", "PARENT", "SIBLING", "OTHER"]),
  allocationPercentage: z.number().min(1).max(100),
  guardianName: z.string().optional(),
  guardianRelationship: z.string().optional(),
});

export const NominateRequestSchema = z.object({
  platform: z.enum(["MFCENTRAL", "KRA", "BANK"]),
  assetRef: z.string().min(1, "Asset Reference (Folio/A/C) is required"),
  nominees: z.array(NomineeSchema)
    .min(1, "At least one nominee is required")
    .max(3, "Maximum 3 nominees allowed")
    .refine((nominees) => {
      const sum = nominees.reduce((acc, curr) => acc + curr.allocationPercentage, 0);
      return sum === 100;
    }, {
      message: "Total allocation percentage must equal exactly 100",
    }),
});

export type NominateRequestType = z.infer<typeof NominateRequestSchema>;
