import { describe, expect, it } from "vitest";
import {
  signInSchema,
  signUpSchema,
  type SignUpField,
} from "@/lib/auth-schemas";
import { UserRole } from "@/types/enums";
import { firstErrorPerField } from "@/lib/zod-errors";

const validSignUp = {
  role: UserRole.VENDOR,
  name: "  Asha Rao  ",
  companyName: "Rao Traders",
  email: "  asha@raotraders.test ",
  phone: "",
  password: "Sup3rSecret",
};

describe("signInSchema", () => {
  it("needs both an email and a password", () => {
    expect(
      signInSchema.safeParse({ email: "a@b.co", password: "x" }).success,
    ).toBe(true);
    expect(signInSchema.safeParse({ email: "  ", password: "x" }).success).toBe(
      false,
    );
    expect(
      signInSchema.safeParse({ email: "a@b.co", password: "" }).success,
    ).toBe(false);
  });

  it("trims the email it hands back", () => {
    const result = signInSchema.safeParse({
      email: "  a@b.co ",
      password: "x",
    });
    expect(result.success && result.data.email).toBe("a@b.co");
  });
});

describe("signUpSchema", () => {
  it("accepts a good form and returns trimmed text", () => {
    const result = signUpSchema.safeParse(validSignUp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Asha Rao");
      expect(result.data.email).toBe("asha@raotraders.test");
    }
  });

  it("reports one message per bad field", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      name: "A",
      email: "nope",
      password: "short",
      phone: "12345",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = firstErrorPerField<SignUpField>(result.error);
      expect(Object.keys(errors).sort()).toEqual([
        "email",
        "name",
        "password",
        "phone",
      ]);
      expect(errors.password).toMatch(/8 or more characters/);
    }
  });

  it("wants a letter and a number in the password", () => {
    expect(
      signUpSchema.safeParse({ ...validSignUp, password: "onlyletters" })
        .success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({ ...validSignUp, password: "12345678" }).success,
    ).toBe(false);
  });

  it("makes the phone optional but checks it when given", () => {
    expect(
      signUpSchema.safeParse({ ...validSignUp, phone: "+919876543210" })
        .success,
    ).toBe(true);
    expect(
      signUpSchema.safeParse({ ...validSignUp, phone: "98765" }).success,
    ).toBe(false);
  });

  it("only allows the two real roles", () => {
    expect(
      signUpSchema.safeParse({ ...validSignUp, role: "ADMIN" }).success,
    ).toBe(false);
  });
});
