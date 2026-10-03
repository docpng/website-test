// Prices are always worked out here, on the server, from the booking settings.
import type { BookingSettings, TourType } from "./settings.ts";

export type PriceQuote = { tour: TourType; minutes: number; guests: number; base: number; extras: number; total: number };

export function quote(settings: BookingSettings, tourId: string, minutes: number, guests: number): PriceQuote {
  const tour = settings.tourTypes.find((t) => t.id === tourId);
  if (!tour) throw new BookingError("That tour type isn't available.");
  const option = tour.prices.find((p) => p.minutes === minutes);
  if (!option) throw new BookingError("That tour length isn't available.");
  if (!Number.isInteger(guests) || guests < 1 || guests > settings.maxGuests) {
    throw new BookingError(`Online booking is for 1 to ${settings.maxGuests} guests. Call us for larger groups.`);
  }
  const extraGuests = Math.max(0, guests - settings.includedGuests);
  const extras = extraGuests * settings.extraGuestPrice;
  return { tour, minutes, guests, base: option.price, extras, total: option.price + extras };
}

// An error that is safe to show to the guest.
export class BookingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
