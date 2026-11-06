/**
 * Stock is kept in three warehouses. An order ships from the nearest one that has everything
 * in stock; if no single one does, each piece ships from the nearest that has it.
 *
 * Fee and delivery time depend on how far the warehouse is from the customer's district:
 * same district, same division, or elsewhere in Bangladesh.
 */
export type WarehouseId = "dhaka" | "chattogram" | "sylhet";
export type Division =
  "Dhaka" | "Chattogram" | "Sylhet" | "Rajshahi" | "Khulna" | "Barishal" | "Rangpur" | "Mymensingh";

export const WAREHOUSES: Array<{
  id: WarehouseId;
  name: string;
  district: string;
  division: Division;
  share: number;
}> = [
  { id: "dhaka", name: "Dhaka (Tejgaon)", district: "Dhaka", division: "Dhaka", share: 0.6 },
  {
    id: "chattogram",
    name: "Chattogram (Agrabad)",
    district: "Chattogram",
    division: "Chattogram",
    share: 0.25,
  },
  {
    id: "sylhet",
    name: "Sylhet (Zindabazar)",
    district: "Sylhet",
    division: "Sylhet",
    share: 0.15,
  },
];

/** Splits a catalogue stock count across the warehouses by their share. */
export function splitStock(units: number): Array<[WarehouseId, number]> {
  const dhaka = Math.ceil(units * 0.6);
  const ctg = Math.floor((units - dhaka) * (0.25 / 0.4));
  return [
    ["dhaka", dhaka],
    ["chattogram", ctg],
    ["sylhet", Math.max(0, units - dhaka - ctg)],
  ];
}

export const DISTRICTS: Record<string, Division> = {
  // Dhaka
  Dhaka: "Dhaka",
  Gazipur: "Dhaka",
  Narayanganj: "Dhaka",
  Narsingdi: "Dhaka",
  Manikganj: "Dhaka",
  Munshiganj: "Dhaka",
  Tangail: "Dhaka",
  Kishoreganj: "Dhaka",
  Faridpur: "Dhaka",
  Gopalganj: "Dhaka",
  Madaripur: "Dhaka",
  Rajbari: "Dhaka",
  Shariatpur: "Dhaka",
  // Chattogram
  Chattogram: "Chattogram",
  "Cox's Bazar": "Chattogram",
  Cumilla: "Chattogram",
  Feni: "Chattogram",
  Noakhali: "Chattogram",
  Lakshmipur: "Chattogram",
  Chandpur: "Chattogram",
  Brahmanbaria: "Chattogram",
  Rangamati: "Chattogram",
  Khagrachhari: "Chattogram",
  Bandarban: "Chattogram",
  // Sylhet
  Sylhet: "Sylhet",
  Moulvibazar: "Sylhet",
  Habiganj: "Sylhet",
  Sunamganj: "Sylhet",
  // Rajshahi
  Rajshahi: "Rajshahi",
  Bogura: "Rajshahi",
  Pabna: "Rajshahi",
  Sirajganj: "Rajshahi",
  Natore: "Rajshahi",
  Naogaon: "Rajshahi",
  Chapainawabganj: "Rajshahi",
  Joypurhat: "Rajshahi",
  // Khulna
  Khulna: "Khulna",
  Jashore: "Khulna",
  Satkhira: "Khulna",
  Bagerhat: "Khulna",
  Kushtia: "Khulna",
  Jhenaidah: "Khulna",
  Magura: "Khulna",
  Narail: "Khulna",
  Chuadanga: "Khulna",
  Meherpur: "Khulna",
  // Barishal
  Barishal: "Barishal",
  Patuakhali: "Barishal",
  Bhola: "Barishal",
  Pirojpur: "Barishal",
  Barguna: "Barishal",
  Jhalokathi: "Barishal",
  // Rangpur
  Rangpur: "Rangpur",
  Dinajpur: "Rangpur",
  Kurigram: "Rangpur",
  Gaibandha: "Rangpur",
  Nilphamari: "Rangpur",
  Lalmonirhat: "Rangpur",
  Thakurgaon: "Rangpur",
  Panchagarh: "Rangpur",
  // Mymensingh
  Mymensingh: "Mymensingh",
  Jamalpur: "Mymensingh",
  Netrokona: "Mymensingh",
  Sherpur: "Mymensingh",
};

export const DISTRICT_NAMES = Object.keys(DISTRICTS).sort();

/** Neighbouring divisions ship a day faster than the far side of the country. */
const NEAR: Partial<Record<Division, Division[]>> = {
  Dhaka: ["Mymensingh", "Chattogram", "Khulna", "Rajshahi", "Barishal"],
  Chattogram: ["Dhaka", "Sylhet"],
  Sylhet: ["Chattogram", "Dhaka", "Mymensingh"],
};

export function deliveryQuote(warehouse: WarehouseId, district: string) {
  const w = WAREHOUSES.find((x) => x.id === warehouse)!;
  const division = DISTRICTS[district];
  if (district === w.district) return { fee: 70, days: 1, rank: 0 };
  if (division === w.division) return { fee: 100, days: 2, rank: 1 };
  if (division && NEAR[w.division]?.includes(division)) return { fee: 130, days: 3, rank: 2 };
  return { fee: 150, days: 4, rank: 3 };
}

/** Warehouses ordered nearest first for a district. */
export function nearestWarehouses(district: string): WarehouseId[] {
  return [...WAREHOUSES]
    .map((w) => ({ id: w.id, ...deliveryQuote(w.id, district) }))
    .sort((a, b) => a.rank - b.rank || a.fee - b.fee)
    .map((w) => w.id);
}

export function etaDate(days: number, from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
