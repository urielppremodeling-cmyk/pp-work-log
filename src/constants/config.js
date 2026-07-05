const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzcylrVrJoJ0nBB9jCnvX2PM1KaWB-iTC9kVqGpaeH8VYro2ls5LlNLZeEFI7IGEsBT/exec";

const LABOR_TYPES = ["Demo", "Framing", "Drywall", "Tile", "Plumbing", "Electrical", "Painting", "Finish Work"];
const VEHICLES = ["Truck 1", "Truck 2", "Personal Vehicle"];
const APPROVAL_STATUSES = ["Pending", "Approved"];

const DEFAULT_SETTINGS = {
  companyName: "P&P Remodeling Services",
  logoUrl: "",
  googleScriptUrl: GOOGLE_SCRIPT_URL,
  mileageRate: 0.67,
};
export {
  GOOGLE_SCRIPT_URL,
  LABOR_TYPES,
  VEHICLES,
  APPROVAL_STATUSES,
  DEFAULT_SETTINGS,
};