// Default page layouts for service and city pages. A service or city can
// override these with its own "layout" list in the site editor.
import { serviceParts, areaParts, type Section } from "./sections";
import type { Service } from "./services";
import type { ServiceArea } from "./service-areas";

export function defaultServiceLayout(service: Service): Section[] {
  return [
    ...serviceParts.map((part) => ({ type: "servicePart" as const, part })),
    { type: "cta", heading: `Ready to book ${service.shortName.toLowerCase()}?` },
  ];
}

export function defaultAreaLayout(area: ServiceArea): Section[] {
  return [
    ...areaParts.map((part) => ({ type: "areaPart" as const, part })),
    {
      type: "cta",
      heading: `Ready to book from ${area.city}?`,
      subheading: "Give us a call or reserve online. We'll put something together for your group.",
    },
  ];
}

export const serviceLayout = (service: Service) =>
  service.layout?.length ? service.layout : defaultServiceLayout(service);

export const areaLayout = (area: ServiceArea) =>
  area.layout?.length ? area.layout : defaultAreaLayout(area);
