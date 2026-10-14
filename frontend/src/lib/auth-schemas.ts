import { isValidPhoneNumber } from "react-phone-number-input";
import { z } from "zod";
import { UserRole } from "@/types/enums";

/** Same shape the backend accepts for an email address. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** At least one letter and one number, 8 to 72 characters. */
const PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

const SIGN_IN_PROBLEM = "Enter your email and password.";

/** Signing in (buyer, vendor or admin): both boxes must be filled. The server checks the rest. */
export const signInSchema = z.object({
  email: z.string().trim().min(1, SIGN_IN_PROBLEM),
  password: z.string().min(1, SIGN_IN_PROBLEM),
});

/** Creating a buyer or vendor account. Text is trimmed, so `result.data` is ready to send. */
export const signUpSchema = z.object({
  role: z.enum(UserRole),
  name: z.string().trim().min(2, "Enter your full name."),
  companyName: z.string().trim().min(2, "Enter your company name."),
  email: z.string().trim().regex(EMAIL, "Enter a valid email address."),
  /** Optional; when given it must include the country code. */
  phone: z
    .string()
    .refine(
      (phone) => !phone || isValidPhoneNumber(phone),
      "Enter a valid phone number.",
    ),
  password: z
    .string()
    .regex(
      PASSWORD,
      "Use 8 or more characters with at least one letter and one number.",
    ),
});

export type SignUpField = keyof z.input<typeof signUpSchema>;
