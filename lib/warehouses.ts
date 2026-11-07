/**
 * Everything ships from the shop in Kamrangir Char, Dhaka. The delivery charge and time depend
 * only on whether the customer is inside Dhaka or outside, and both are set by the owner in the
 * admin panel (lib/settings.ts).
 *
 * The "warehouse" vocabulary is kept so that stock rows and orders keep their shape; there is
 * a single one.
 */
import { defaultSettings, type Settings } from "@/lib/settings";

export type WarehouseId = "dhaka";
export type Division =
  "Dhaka" | "Chattogram" | "Sylhet" | "Rajshahi" | "Khulna" | "Barishal" | "Rangpur" | "Mymensingh";

export const WAREHOUSES: Array<{ id: WarehouseId; name: string; district: string }> = [
  { id: "dhaka", name: "Aurevya, Kamrangir Char", district: "Dhaka" },
];

/** All stock sits in the one shop. */
export function splitStock(units: number): Array<[WarehouseId, number]> {
  return [["dhaka", units]];
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

export type DeliveryFees = Pick<
  Settings,
  "deliveryInsideDhaka" | "deliveryOutsideDhaka" | "daysInsideDhaka" | "daysOutsideDhaka"
>;

export function isInsideDhaka(district: string): boolean {
  return district === "Dhaka";
}

export function deliveryQuote(
  _warehouse: WarehouseId,
  district: string,
  fees: DeliveryFees = defaultSettings,
) {
  return isInsideDhaka(district)
    ? { fee: fees.deliveryInsideDhaka, days: fees.daysInsideDhaka, rank: 0 }
    : { fee: fees.deliveryOutsideDhaka, days: fees.daysOutsideDhaka, rank: 1 };
}

export function nearestWarehouses(): WarehouseId[] {
  return ["dhaka"];
}

export function etaDate(days: number, from = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
