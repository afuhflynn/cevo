import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "cevo",
  isDev: process.env.NODE_ENV !== "production",
});
