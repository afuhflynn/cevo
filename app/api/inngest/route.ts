import { serve } from "inngest/next";
import { functions } from "@/inngest/functions/file-extract";
import { inngest } from "@/lib/inngest";

export const { GET, POST, PUT } = serve({ client: inngest, functions });
