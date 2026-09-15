export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Sales", href: "/sales" },
  { label: "Expenses", href: "/expenses" },
  { label: "Products", href: "/products" },
  { label: "Stock", href: "/inventory" },
  { label: "Purchase Orders", href: "/purchase-orders" },
  { label: "Suppliers", href: "/suppliers" },
  { label: "Goals", href: "/goals" },
  { label: "Reports", href: "/reports" },
  { label: "Journal", href: "/journal" },
];
