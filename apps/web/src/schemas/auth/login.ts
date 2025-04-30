import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .nonempty({ message: "Email is required" })
    .email({ message: "Please enter a valid email address" }),
  password: z.string().nonempty({ message: "Password is required" }),
});

export type LoginSchema = z.infer<typeof loginSchema>;
