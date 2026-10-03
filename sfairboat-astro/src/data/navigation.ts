// Header menu and footer, edited in the site editor (Menu & Footer).
import data from "../content/navigation.json";
import { requireFields, requireOneOf } from "./validate";
import { services } from "./services";
import { fill, resolveLink } from "../components/sections/styles";

type Link = { label: string; link: string };
type MenuItem = Link & { submenu?: "none" | "services" | "custom"; children?: Link[] };

export type NavItem = { label: string; href: string; id?: string; children?: { label: string; href: string }[] };

const source = "src/content/navigation.json";

export const navItems: NavItem[] = (data.menu as MenuItem[]).map((item, i) => {
  requireFields(item, ["label"], `${source} (menu item #${i + 1})`);
  const submenu = requireOneOf(item.submenu ?? "none", ["none", "services", "custom"] as const, "submenu", source);
  if (submenu === "services") {
    return {
      label: fill(item.label),
      href: "#",
      id: "services-menu",
      children: services.map((s) => ({ label: s.shortName, href: `/${s.slug}` })),
    };
  }
  if (submenu === "custom") {
    return {
      label: fill(item.label),
      href: "#",
      id: `menu-${i + 1}`,
      children: (item.children ?? []).map((c) => ({ label: fill(c.label), href: resolveLink(c.link) })),
    };
  }
  requireFields(item, ["link"], `${source} (menu item "${item.label}")`);
  return { label: fill(item.label), href: resolveLink(item.link) };
});

export const navigation = {
  showPhone: data.showPhone !== false,
  bookButtonLabel: fill(data.bookButtonLabel || "Book Now"),
  bookButtonHref: resolveLink(data.bookButtonLink || "{booking}"),
  footerAbout: fill(data.footerAbout),
  showSocialIcons: data.showSocialIcons !== false,
  footerLinksHeading: fill(data.footerLinksHeading || "Quick Links"),
  footerLinks: (data.footerLinks as Link[]).map((l) => ({ label: fill(l.label), href: resolveLink(l.link) })),
  footerNote: fill(data.footerNote),
};
