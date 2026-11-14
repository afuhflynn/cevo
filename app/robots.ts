import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const raw =
    process.env["NEXT_PUBLIC_APP_URL"] ??
    process.env["SITE_URL"] ??
    "http://localhost:3000";
  const base = raw.replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${base}/sitemap.xml`,
  };
}
