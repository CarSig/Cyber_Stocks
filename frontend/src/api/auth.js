import { postJson } from "./core.js";

export function clerkAuth(clerkToken) {
  return postJson("/auth/clerk", { token: clerkToken });
}
