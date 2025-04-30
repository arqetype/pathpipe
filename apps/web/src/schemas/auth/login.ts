import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().nonempty({ message: "Please enter your password" }),
});

export type LoginSchema = z.infer<typeof loginSchema>;