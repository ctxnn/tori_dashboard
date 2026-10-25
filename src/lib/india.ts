// Geography for the audience map. Client-safe: no server imports.
//
// The outline is a simplified polygon of India's official boundary (lon, lat),
// accurate enough for a dot-matrix map at a few hundred pixels — not for anything
// that needs real cartography.

export type Region = "North" | "West" | "South" | "East" | "Northeast" | "Central";

export interface City {
  name: string;
  lon: number;
  lat: number;
  region: Region;
}

export const CITIES: City[] = [
  { name: "Delhi", lon: 77.21, lat: 28.61, region: "North" },
  { name: "Mumbai", lon: 72.88, lat: 19.08, region: "West" },
  { name: "Bengaluru", lon: 77.59, lat: 12.97, region: "South" },
  { name: "Pune", lon: 73.86, lat: 18.52, region: "West" },
  { name: "Hyderabad", lon: 78.49, lat: 17.39, region: "South" },
  { name: "Kolkata", lon: 88.36, lat: 22.57, region: "East" },
  { name: "Chennai", lon: 80.27, lat: 13.08, region: "South" },
  { name: "Guwahati", lon: 91.74, lat: 26.14, region: "Northeast" },
  { name: "Shillong", lon: 91.89, lat: 25.58, region: "Northeast" },
  { name: "Patiala", lon: 76.39, lat: 30.34, region: "North" },
  { name: "Chandigarh", lon: 76.78, lat: 30.73, region: "North" },
  { name: "Jaipur", lon: 75.79, lat: 26.91, region: "North" },
  { name: "Lucknow", lon: 80.95, lat: 26.85, region: "North" },
  { name: "Ahmedabad", lon: 72.57, lat: 23.02, region: "West" },
  { name: "Indore", lon: 75.86, lat: 22.72, region: "Central" },
  { name: "Bhopal", lon: 77.41, lat: 23.26, region: "Central" },
  { name: "Kochi", lon: 76.27, lat: 9.93, region: "South" },
  { name: "Bhubaneswar", lon: 85.82, lat: 20.3, region: "East" },
];

export const CITY_NAMES = CITIES.map((c) => c.name);
export const REGIONS: Region[] = ["North", "West", "South", "East", "Northeast", "Central"];

export const cityByName = (name: string) => CITIES.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());

// Clockwise from the Rann of Kutch.
const OUTLINE: [number, number][] = [
  [68.2, 23.6], [68.9, 24.3], [70.1, 24.3], [71.1, 24.5], [70.4, 25.7], [69.6, 26.5], [70.1, 27.8], [71.9, 27.9],
  [72.9, 29.0], [73.9, 30.4], [74.6, 31.1], [74.7, 32.3], [73.7, 33.0], [73.5, 34.1], [72.9, 35.2], [73.2, 36.1],
  [74.5, 36.9], [75.6, 37.0], [76.8, 35.9], [77.9, 35.5], [79.4, 35.7], [80.3, 35.2], [79.9, 34.2], [78.8, 33.5],
  [79.4, 32.6], [78.6, 32.4], [78.8, 31.3], [79.8, 30.9], [80.9, 30.2], [80.1, 28.8], [81.2, 28.4], [82.0, 27.7],
  [83.4, 27.4], [84.7, 27.1], [85.6, 26.7], [86.6, 26.4], [87.6, 26.4], [88.1, 26.5], [88.1, 27.1], [88.0, 27.9],
  [88.7, 28.1], [88.9, 27.3], [89.7, 26.8], [90.7, 26.8], [91.8, 26.8], [92.1, 27.0], [91.7, 27.8], [92.6, 27.9],
  [93.8, 28.4], [94.6, 29.3], [95.5, 29.1], [96.2, 29.4], [96.7, 28.8], [97.3, 28.2], [97.0, 27.6], [96.2, 27.3],
  [95.3, 26.6], [94.9, 25.9], [94.6, 25.1], [94.1, 23.9], [93.4, 23.8], [93.2, 22.5], [92.6, 21.9], [92.3, 23.2],
  [91.8, 23.1], [91.6, 22.9], [91.2, 23.5], [91.4, 24.1], [92.1, 24.3], [92.4, 24.9], [92.0, 25.2], [90.4, 25.2],
  [89.8, 25.4], [89.9, 26.0], [89.0, 26.3], [88.4, 26.4], [88.4, 26.0], [88.1, 25.5], [88.5, 25.2], [88.1, 24.6],
  [88.7, 24.3], [88.9, 23.2], [89.1, 22.2], [88.9, 21.6], [87.9, 21.7], [87.0, 21.0], [86.9, 20.4], [85.6, 19.7],
  [84.8, 19.2], [84.1, 18.3], [83.3, 17.6], [82.3, 16.7], [81.2, 16.3], [80.3, 15.7], [80.1, 15.0], [80.3, 13.5],
  [80.2, 13.0], [79.9, 12.0], [79.8, 11.0], [79.9, 10.3], [79.3, 10.3], [79.0, 9.4], [78.2, 8.9], [77.5, 8.1],
  [76.6, 8.9], [76.3, 9.9], [75.8, 11.3], [75.1, 12.5], [74.7, 13.5], [74.1, 14.9], [73.5, 16.0], [73.1, 17.8],
  [72.8, 19.0], [72.7, 20.4], [72.8, 21.4], [72.6, 22.2], [72.2, 21.6], [71.0, 20.8], [70.0, 21.1], [69.0, 22.3],
  [69.8, 22.8], [70.4, 22.9], [69.3, 22.9], [68.4, 23.3],
];

const LON0 = 67.5;
const LAT1 = 37.5;
const KX = Math.cos((22 * Math.PI) / 180);

/** Map viewBox: 0 0 MAP_W MAP_H. */
export const MAP_W = 300;
export const MAP_H = 330;
const SCALE = MAP_W / ((97.8 - LON0) * KX);

export function project(lon: number, lat: number): [number, number] {
  return [(lon - LON0) * KX * SCALE, (LAT1 - lat) * SCALE];
}

export const OUTLINE_PATH = `M${OUTLINE.map(([lon, lat]) => project(lon, lat).map((n) => n.toFixed(1)).join(" ")).join(" L")} Z`;

function inside(lon: number, lat: number): boolean {
  let hit = false;
  for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
    const [xi, yi] = OUTLINE[i];
    const [xj, yj] = OUTLINE[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Points of a staggered dot grid that fall inside the outline, in map units. */
export const MAP_DOTS: [number, number][] = (() => {
  const dots: [number, number][] = [];
  const step = 6.2;
  for (let row = 0, y = step / 2; y < MAP_H; row++, y += step * 0.866) {
    for (let x = (row % 2 ? step / 2 : 0) + step / 2; x < MAP_W; x += step) {
      const lon = x / (KX * SCALE) + LON0;
      const lat = LAT1 - y / SCALE;
      if (inside(lon, lat)) dots.push([+x.toFixed(1), +y.toFixed(1)]);
    }
  }
  return dots;
})();
