import type { Series } from "./types";

/** Home-screen rows. Each row also powers its "See all" page at /read/browse?row=<key>. */
export type RowDef = { key: string; title: string; test: (s: Series) => boolean; sort?: (a: Series, b: Series) => number };
const g = (...names: string[]) => (s: Series) => names.some((n) => s.genres.includes(n));
export const ROWS: RowDef[] = [
  { key: "partner", title: "New from Japan, first on Torii", test: (s) => s.source === "partner", sort: (a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "") },
  { key: "shonen", title: "Shonen", test: (s) => s.demographic === "Shonen" },
  { key: "action", title: "Action", test: g("Action") },
  { key: "hindi", title: "Read in Hindi", test: (s) => s.languages.includes("hi") },
  { key: "romance", title: "Romance", test: g("Romance") },
  { key: "seinen", title: "Seinen", test: (s) => s.demographic === "Seinen" },
  { key: "fantasy", title: "Fantasy", test: g("Fantasy") },
  { key: "rated", title: "Highest rated", test: (s) => (s.score ?? 0) >= 80, sort: (a, b) => (b.score ?? 0) - (a.score ?? 0) },
  { key: "comedy", title: "Comedy", test: g("Comedy") },
  { key: "shojo", title: "Shojo", test: (s) => s.demographic === "Shojo" || s.demographic === "Josei" },
  { key: "sports", title: "Sports", test: g("Sports") },
  { key: "mystery", title: "Mystery and thrillers", test: g("Mystery", "Thriller", "Psychological") },
  { key: "complete", title: "Completed, read it all at once", test: (s) => s.status === "completed" },
  { key: "horror", title: "Horror", test: g("Horror") },
  { key: "scifi", title: "Sci-fi and mecha", test: g("Sci-Fi", "Mecha") },
  { key: "slice", title: "Slice of life", test: g("Slice of Life") },
  { key: "supernatural", title: "Supernatural", test: g("Supernatural") },
  { key: "new", title: "New this decade", test: (s) => s.startYear >= 2018, sort: (a, b) => b.startYear - a.startYear || b.popularity - a.popularity },
  { key: "tamil", title: "Read in Tamil", test: (s) => s.languages.includes("ta") },
];
export const rowItems = (all: Series[], r: RowDef) => all.filter(r.test).sort(r.sort ?? ((a, b) => b.popularity - a.popularity));
