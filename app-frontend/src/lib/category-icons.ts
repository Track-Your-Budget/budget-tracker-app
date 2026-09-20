import {
  Banknote,
  Car,
  Clapperboard,
  House,
  ShieldCheck,
  ShoppingCart,
  Tag,
  type LucideIcon,
} from 'lucide-react'

// One icon per transaction category (see CATEGORIES in ./types). Unknown
// category values fall back to a plain tag.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  gehalt: Banknote,
  miete: House,
  lebensmittel: ShoppingCart,
  transport: Car,
  unterhaltung: Clapperboard,
  versicherung: ShieldCheck,
  sonstiges: Tag,
}

export function getCategoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? Tag
}
