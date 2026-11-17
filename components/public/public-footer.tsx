import Link from "next/link";
import { FaDiscord, FaLinkedin, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { CevoLogo } from "@/components/cevo-logo";

const columns = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#templates", label: "Templates" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/#faq", label: "Help Center" },
      { href: "/#templates", label: "Academic Guides" },
      { href: "/#how-it-works", label: "Blog" },
      { href: "/#contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms#acceptable-use", label: "Academic Integrity" },
      { href: "/refunds", label: "Refund Policy" },
    ],
  },
];

// TODO: replace "#" with the real Cevo profiles once they exist.
const socials = [
  { href: "#", label: "Cevo on Discord", Icon: FaDiscord },
  { href: "#", label: "Cevo on X", Icon: FaXTwitter },
  { href: "#", label: "Cevo on YouTube", Icon: FaYoutube },
  { href: "#", label: "Cevo on LinkedIn", Icon: FaLinkedin },
];

export function PublicFooter() {
  return (
    <footer className="mt-auto bg-[#1a2048] py-12 text-sm text-white/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">
        <div className="flex flex-col gap-3" id="contact">
          <CevoLogo
            size="sm"
            href="/"
            iconClassName="brightness-0 invert"
            textClassName="text-white"
          />
          <p className="max-w-xs text-sm leading-relaxed text-white/60">
            Plan. Research. Develop.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="mb-4 text-sm font-semibold text-white">{col.title}</p>
            <ul className="flex flex-col gap-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-white">Stay connected</p>
          <p className="text-sm text-white/60">
            Follow us for updates and resources.
          </p>
          <div className="flex items-center gap-4">
            {socials.map(({ href, label, Icon }) => (
              <Link
                key={label}
                href={href}
                aria-label={label}
                className="text-white/80 transition-colors hover:text-white"
              >
                <Icon className="size-5" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-white/10 px-4 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-white/60">© 2025 Cevo. All rights reserved.</p>
        <p className="text-white/60">
          Built for students. Powered by innovation.
        </p>
      </div>
    </footer>
  );
}
