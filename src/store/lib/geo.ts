// Rough pincode → state/region mapping (first two digits) for delivery estimates and analytics.
const PREFIX: [number, number, string, string][] = [
  [11, 11, "Delhi", "New Delhi"], [12, 13, "Haryana", "Gurugram"], [14, 16, "Punjab", "Ludhiana"],
  [17, 17, "Himachal Pradesh", "Shimla"], [18, 19, "Jammu & Kashmir", "Srinagar"], [20, 28, "Uttar Pradesh", "Lucknow"],
  [30, 34, "Rajasthan", "Jaipur"], [36, 39, "Gujarat", "Ahmedabad"], [40, 44, "Maharashtra", "Mumbai"],
  [45, 48, "Madhya Pradesh", "Indore"], [49, 49, "Chhattisgarh", "Raipur"], [50, 50, "Telangana", "Hyderabad"],
  [51, 53, "Andhra Pradesh", "Visakhapatnam"], [56, 59, "Karnataka", "Bengaluru"], [60, 66, "Tamil Nadu", "Chennai"],
  [67, 69, "Kerala", "Kochi"], [70, 74, "West Bengal", "Kolkata"], [75, 77, "Odisha", "Bhubaneswar"],
  [78, 78, "Assam", "Guwahati"], [79, 79, "North East", "Shillong"], [80, 85, "Bihar", "Patna"],
];
const METRO = new Set(["11", "40", "56", "60", "70", "50", "41"]);

export function pincodeInfo(pin: string): { valid: boolean; state: string; city: string; eta: string; days: [number, number] } {
  if (!/^[1-8]\d{5}$/.test(pin)) return { valid: false, state: "", city: "", eta: "", days: [0, 0] };
  const p2 = parseInt(pin.slice(0, 2), 10);
  const hit = PREFIX.find(([a, b]) => p2 >= a && p2 <= b);
  const state = hit?.[2] ?? "India";
  const city = hit?.[3] ?? "";
  let days: [number, number] = METRO.has(pin.slice(0, 2)) ? [2, 3] : [4, 6];
  if (p2 === 78 || p2 === 79 || p2 === 18 || p2 === 19) days = [6, 8];
  const d = (n: number) => {
    const x = new Date(); x.setDate(x.getDate() + n);
    return x.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  };
  return { valid: true, state, city, days, eta: `${d(days[0])} – ${d(days[1])}` };
}
