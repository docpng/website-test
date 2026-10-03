// Sunrise and sunset times (NOAA solar position algorithm, accurate to about a
// minute for Miami's latitude). Returns UTC timestamps for the given date.

const rad = Math.PI / 180;
const deg = 180 / Math.PI;

function julianDay(y: number, m: number, d: number) {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + b - 1524.5;
}

function solar(t: number) {
  const l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c =
    Math.sin(m * rad) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m * rad) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m * rad) * 0.000289;
  const trueLong = l0 + c;
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * rad);
  const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad)) * deg;
  const y = Math.tan((eps / 2) * rad) ** 2;
  const eqTime =
    4 *
    deg *
    (y * Math.sin(2 * l0 * rad) -
      2 * e * Math.sin(m * rad) +
      4 * e * y * Math.sin(m * rad) * Math.cos(2 * l0 * rad) -
      0.5 * y * y * Math.sin(4 * l0 * rad) -
      1.25 * e * e * Math.sin(2 * m * rad));
  return { decl, eqTime };
}

// Minutes after UTC midnight of sunrise (rising) or sunset, iterated twice
// for accuracy.
function eventUtcMinutes(jd: number, lat: number, lng: number, rising: boolean) {
  let minutes = 720;
  for (let i = 0; i < 3; i++) {
    const t = (jd + minutes / 1440 - 2451545) / 36525;
    const { decl, eqTime } = solar(t);
    const cosH =
      (Math.cos(90.833 * rad) - Math.sin(lat * rad) * Math.sin(decl * rad)) /
      (Math.cos(lat * rad) * Math.cos(decl * rad));
    const h = Math.acos(Math.min(1, Math.max(-1, cosH))) * deg;
    minutes = 720 - 4 * (lng + (rising ? h : -h)) - eqTime;
  }
  return minutes;
}

export function sunTimes(date: string, lat: number, lng: number) {
  const [y, m, d] = date.split("-").map(Number);
  const jd = julianDay(y, m, d);
  const base = Date.UTC(y, m - 1, d);
  return {
    sunrise: base + Math.round(eventUtcMinutes(jd, lat, lng, true) * 60_000),
    sunset: base + Math.round(eventUtcMinutes(jd, lat, lng, false) * 60_000),
  };
}
