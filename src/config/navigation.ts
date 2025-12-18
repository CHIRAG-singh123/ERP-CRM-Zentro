import {
  BarChart3,
  Building2,
  CalendarClock,
  FileStack,
  Handshake,
  LineChart,
  Settings2,
  UserRound,
  Users2,
  Package,
  TrendingUp,
  ShoppingBag,
  Star,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';

export interface AppNavigationItem {
  label: string;
  href: string;
  badge?: string;
  icon?: LucideIcon;
  roles?: string[]; // Roles that can access this item
}

export interface AppNavigationSection {
  label: string;
  items: AppNavigationItem[];
}

// Base navigation items
const baseNavigation: AppNavigationSection[] = [
  {
    label: 'Workspace',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LineChart, roles: ['admin', 'employee'] },
      { label: 'Contacts', href: '/contacts', icon: UserRound, roles: ['admin', 'user', 'sales', 'support'] },
      { label: 'Accounts', href: '/accounts', icon: Building2, roles: ['admin', 'user', 'sales', 'support'] },
      { label: 'Leads', href: '/leads', icon: Users2, roles: ['admin', 'user', 'sales', 'support', 'employee'] },
      { label: 'Deals', href: '/deals', icon: Handshake, roles: ['admin', 'user', 'sales', 'support', 'employee'] },
      { label: 'Calendar', href: '/calendar', icon: CalendarClock, roles: ['admin', 'user', 'sales', 'support', 'employee'] },
      { label: 'Chat', href: '/chat', icon: MessageCircle, roles: ['admin', 'employee'] },
      { label: 'Documents', href: '/documents', icon: FileStack, roles: ['admin', 'user', 'sales', 'support', 'employee'] },
      { label: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'user', 'sales', 'support'] },
    ],
  },
];

// Admin navigation
const adminNavigation: AppNavigationSection[] = [
  {
    label: 'Admin',
    items: [
      { label: 'Employees', href: '/admin/employees', icon: Users2 },
      { label: 'Performance', href: '/admin/performance', icon: TrendingUp },
      { label: 'Products', href: '/admin/products', icon: Package },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings2 },
      { label: 'Users', href: '/settings/users', icon: Users2 },
      { label: 'Teams', href: '/settings/teams', icon: Users2 },
      { label: 'Roles', href: '/settings/roles', icon: Settings2, badge: 'RBAC' },
    ],
  },
];

// Employee navigation
const employeeNavigation: AppNavigationSection[] = [
  {
    label: 'Employee',
    items: [
      { label: 'Products', href: '/employees/products', icon: Package },
      { label: 'My Performance', href: '/employees/performance', icon: TrendingUp },
      { label: 'Users', href: '/employees/users', icon: Users2 },
    ],
  },
];

// Customer navigation
const customerNavigation: AppNavigationSection[] = [
  {
    label: 'Shop',
    items: [
      { label: 'Products', href: '/customers/products', icon: ShoppingBag },
      { label: 'Dashboard', href: '/customers/dashboard', icon: Star },
    ],
  },
];

// Get navigation based on user role
export function getNavigationForRole(role: string | undefined): AppNavigationSection[] {
  const navigation: AppNavigationSection[] = [];

  // If no role (unauthenticated), return customer navigation for public browsing
  if (!role) {
    return customerNavigation;
  }

  // Add base navigation (filtered by role)
  navigation.push({
    label: baseNavigation[0].label,
    items: baseNavigation[0].items.filter(
      (item) => !item.roles || item.roles.includes(role)
    ),
  });

  // Add role-specific navigation
  if (role === 'admin') {
    navigation.push(...adminNavigation);
  } else if (role === 'employee') {
    navigation.push(...employeeNavigation);
  } else if (role === 'customer') {
    navigation.push(...customerNavigation);
  }

  return navigation;
}

// Default export for backward compatibility
export const appNavigation: AppNavigationSection[] = baseNavigation;
