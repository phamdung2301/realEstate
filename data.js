// May Song Residence — fictional listing data (illustration only, not real market data).
// Price in billion VND (bn). Area in m2. For land, price/m2 is per land area;
// for all other types it is per floor area.
export const LISTINGS = [
  { id: "01", type: "Apartment", typeKey: "apartment", floor: 8, floorLabel: "Floor 08", name: "Studio — Thap Sao Mai", district: "Cang Moi", districtKey: "cang-moi", area: 38, bedrooms: "Studio", direction: "North", price: 1.62, pricePerM2: 42.6, legal: "Sale contract", status: "Ready to move in", note: "Compact studio with a north-facing balcony." },
  { id: "02", type: "Apartment", typeKey: "apartment", floor: 12, floorLabel: "Floor 12", name: "2BR — Vuon Trang Residence", district: "Song Xanh", districtKey: "song-xanh", area: 68, bedrooms: "2BR", direction: "Southeast", price: 2.85, pricePerM2: 41.9, legal: "Pink book", status: "Ready to move in", note: "Sample unit. Southeast light into the living room." },
  { id: "03", type: "Apartment", typeKey: "apartment", floor: 15, floorLabel: "Floor 15", name: "1BR+1 — Thap Sao Mai", district: "Cang Moi", districtKey: "cang-moi", area: 52, bedrooms: "1BR+1", direction: "Southwest", price: 2.35, pricePerM2: 45.2, legal: "Sale contract", status: "Ready to move in", note: "Flexible second room for work or guests." },
  { id: "04", type: "Land", typeKey: "land", floor: null, floorLabel: "No floor — land plot", name: "Land plot — An Phu Vien", district: "Song Xanh", districtKey: "song-xanh", area: 120, bedrooms: "—", direction: "South", price: 3.9, pricePerM2: 32.5, legal: "Separate red book", status: "Open for sale", note: "120 m2 plot, 6 m frontage x 20 m depth." },
  { id: "05", type: "Apartment", typeKey: "apartment", floor: 22, floorLabel: "Floor 22", name: "3BR — Vuon Trang Residence", district: "Song Xanh", districtKey: "song-xanh", area: 112, bedrooms: "3BR", direction: "East", price: 5.9, pricePerM2: 52.7, legal: "Pink book", status: "Open for sale", note: "Top-floor family unit with an east-facing loggia." },
  { id: "06", type: "Townhouse", typeKey: "townhouse", floor: 3, floorLabel: "3 floors", name: "Townhouse — Pho Vuon Dao", district: "Song Xanh", districtKey: "song-xanh", area: 180, bedrooms: "4BR", direction: "Northwest", price: 7.4, pricePerM2: 41.1, legal: "Red book", status: "Open for sale", note: "180 m2 floor area on 60 m2 of land, 3 storeys." },
  { id: "07", type: "Retail", typeKey: "retail", floor: 0, floorLabel: "Ground floor", name: "Retail space — Duong Hoa Su", district: "Cang Moi", districtKey: "cang-moi", area: 225, bedrooms: "—", direction: "Northeast", price: 11.2, pricePerM2: 49.8, legal: "Red book", status: "For sale / lease", note: "225 m2 floor area over 3 levels, street frontage." },
  { id: "08", type: "Villa", typeKey: "villa", floor: 2, floorLabel: "2 floors", name: "Villa — Vuon Trang Hills", district: "Doi Thong", districtKey: "doi-thong", area: 210, bedrooms: "4BR", direction: "South", price: 14.8, pricePerM2: 70.5, legal: "Red book", status: "Finishing — handover Q4/2027 (fictional)", note: "210 m2 floor area on 150 m2 of land." },
];

export const DISTRICTS = [
  { key: "song-xanh", label: "Song Xanh", count: 4 },
  { key: "cang-moi", label: "Cang Moi", count: 3 },
  { key: "doi-thong", label: "Doi Thong", count: 1 },
];

export const AMENITIES = [
  { code: "A-01", name: "25 m swimming pool", level: "Ground", distance: "40 m · 1 min walk", hours: "6:00–21:00" },
  { code: "A-02", name: "2,000 m2 inner park", level: "Ground", distance: "120 m · 2 min walk", hours: "Open all day" },
  { code: "A-03", name: "Gym & yoga studio", level: "Floor 2", distance: "60 m · 1 min + lift", hours: "5:00–22:00" },
  { code: "A-04", name: "In-complex kindergarten", level: "Ground", distance: "150 m · 2 min walk", hours: "Illustration only" },
  { code: "A-05", name: "Mini supermarket", level: "Ground", distance: "200 m · 3 min walk", hours: "7:00–22:00" },
];

export const NEARBY = [
  { name: "Metro — fictional line", distance: "900 m · 12 min walk" },
  { name: "Hospital", distance: "1.8 km · 5 min drive" },
  { name: "Primary school", distance: "500 m · 7 min walk" },
];

export const PROCESS_STEPS = [
  { floor: 1, title: "Meet & choose", body: "One session with an adviser. Filter by budget, floor and direction.", meta: "1 session · Free" },
  { floor: 2, title: "Hold a unit", body: "Lock the price and the unit for 7 days while you decide.", meta: "50 million VND · Refundable within 7 days" },
  { floor: 3, title: "Legal check", body: "Compare the red/pink book, planning and construction progress before signing.", meta: "7–10 working days · Notary estimate 3–8 million VND" },
  { floor: 4, title: "Sign & optional loan", body: "Sign the sale contract. A loan can run in parallel if you need one.", meta: "Up to 70% · Decision 5–7 working days · Illustrative 7.5%/year, first 12 months" },
  { floor: 5, title: "Handover", body: "Inspect the unit together, then receive the keys.", meta: "72-item inspection · 24-month warranty (illustration)" },
];

export const TESTIMONIALS = [
  { name: "Minh Anh (fictional)", detail: "2BR buyer — May Song Residence", quote: "I viewed four units in one afternoon and each one came with a copy of its title papers to check on the spot. I did not have to wait for someone to ask the developer." },
  { name: "Quoc Huy (fictional)", detail: "Land buyer — fictional plot, 2025", quote: "Weekly construction updates with site photos meant I could follow progress from far away. The price on the listing was the price at signing." },
  { name: "Tuan Kiet (fictional)", detail: "1BR+1 buyer — with a drawback", quote: "Handover was 6 days late. It was announced in advance and the contract deduction applied, so it did not feel hidden. That honesty is why I still recommend the process." },
];

export const STATS = [
  { value: 248, suffix: "units", label: "Handed over (fictional)" },
  { value: 87, suffix: "%", label: "Occupancy (fictional)" },
  { value: 27.4, suffix: "m VND/m2", label: "Lowest listed price (fictional)" },
  { value: 12, suffix: "days", label: "Average viewing to signing (fictional)" },
];

export const SAMPLE_UNITS = [
  "2BR — Floor 12 — 68 m2 — 2.85 bn VND (fictional)",
  "3BR — Floor 16 — 96 m2 — 4.90 bn VND (fictional)",
  "Land plot C07 — 120 m2 — 3.90 bn VND (fictional)",
];

export function priceBucket(price) {
  if (price < 2) return "under-2";
  if (price < 5) return "2-5";
  if (price < 10) return "5-10";
  return "over-10";
}
export function areaBucket(area) {
  if (area < 50) return "under-50";
  if (area < 100) return "50-100";
  if (area < 200) return "100-200";
  return "over-200";
}
