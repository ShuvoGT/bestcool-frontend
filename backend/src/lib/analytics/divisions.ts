/**
 * Maps a Bangladeshi district name (Order.shippingDistrict, free text) to one of
 * the 8 administrative divisions. Tolerant of common spelling variants; unknown
 * values fall back to "Other".
 */
export const DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Khulna",
  "Rajshahi",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
] as const;

export type Division = (typeof DIVISIONS)[number] | "Other";

// district (lowercased) → division
const DISTRICT_TO_DIVISION: Record<string, Division> = {
  // Dhaka
  dhaka: "Dhaka", gazipur: "Dhaka", narayanganj: "Dhaka", narsingdi: "Dhaka", manikganj: "Dhaka",
  munshiganj: "Dhaka", tangail: "Dhaka", kishoreganj: "Dhaka", faridpur: "Dhaka", gopalganj: "Dhaka",
  madaripur: "Dhaka", rajbari: "Dhaka", shariatpur: "Dhaka",
  // Chattogram
  chattogram: "Chattogram", chittagong: "Chattogram", coxsbazar: "Chattogram", "coxs bazar": "Chattogram",
  "cox's bazar": "Chattogram", bandarban: "Chattogram", rangamati: "Chattogram", khagrachari: "Chattogram",
  feni: "Chattogram", noakhali: "Chattogram", lakshmipur: "Chattogram", comilla: "Chattogram",
  cumilla: "Chattogram", chandpur: "Chattogram", brahmanbaria: "Chattogram",
  // Khulna
  khulna: "Khulna", bagerhat: "Khulna", satkhira: "Khulna", jessore: "Khulna", jashore: "Khulna",
  magura: "Khulna", jhenaidah: "Khulna", narail: "Khulna", kushtia: "Khulna", chuadanga: "Khulna",
  meherpur: "Khulna",
  // Rajshahi
  rajshahi: "Rajshahi", natore: "Rajshahi", naogaon: "Rajshahi", chapainawabganj: "Rajshahi",
  "chapai nawabganj": "Rajshahi", pabna: "Rajshahi", sirajganj: "Rajshahi", bogura: "Rajshahi",
  bogra: "Rajshahi", joypurhat: "Rajshahi",
  // Barishal
  barishal: "Barishal", barisal: "Barishal", bhola: "Barishal", patuakhali: "Barishal",
  pirojpur: "Barishal", jhalokati: "Barishal", barguna: "Barishal",
  // Sylhet
  sylhet: "Sylhet", moulvibazar: "Sylhet", habiganj: "Sylhet", sunamganj: "Sylhet",
  // Rangpur
  rangpur: "Rangpur", dinajpur: "Rangpur", thakurgaon: "Rangpur", panchagarh: "Rangpur",
  nilphamari: "Rangpur", lalmonirhat: "Rangpur", kurigram: "Rangpur", gaibandha: "Rangpur",
  // Mymensingh
  mymensingh: "Mymensingh", jamalpur: "Mymensingh", sherpur: "Mymensingh", netrokona: "Mymensingh",
  netrakona: "Mymensingh",
};

export function districtToDivision(district: string | null | undefined): Division {
  if (!district) return "Other";
  const key = district.trim().toLowerCase().replace(/\s+/g, " ");
  return DISTRICT_TO_DIVISION[key] ?? DISTRICT_TO_DIVISION[key.replace(/[^a-z ]/g, "")] ?? "Other";
}
