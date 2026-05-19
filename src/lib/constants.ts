import {
  BadgeCheck,
  BarChart3,
  LayoutGrid,
  Mail,
  Sparkles,
  WandSparkles,
  Workflow,
} from 'lucide-react';
import type { CRMOption, CRMType, DashboardPersonalization } from './types';

export const crmOptions: CRMOption[] = [
  {
    value: 'real-estate',
    label: 'Email Marketing',
    description: 'Templates, imports, and automated follow-ups',
    icon: Mail,
    accent: 'from-indigo-500/25 to-cyan-400/20',
  },
];

export const featureHighlights = [
  {
    title: 'Email-first foundation',
    description:
      'Email Engine starts with a focused workspace model for lead capture, sender setup, and campaign execution.',
    icon: LayoutGrid,
  },
  {
    title: 'Workspace-first onboarding',
    description:
      'Create your team space once, connect your sender, and launch into the email workflow immediately.',
    icon: Sparkles,
  },
  {
    title: 'Lead-ready operations',
    description:
      'Import leads with clean mappings, manage templates, and run sequences from a single unified app.',
    icon: BadgeCheck,
  },
  {
    title: 'Automation-ready architecture',
    description:
      'Edge functions, structured data, and a clean component system make this starter ready for workflows, messaging, and next-step CRM modules.',
    icon: Workflow,
  },
  {
    title: 'Analytics-friendly dashboards',
    description:
      'The first dashboard shell already supports KPI cards, recent activity, and quick actions so future modules plug into a polished shell.',
    icon: BarChart3,
  },
  {
    title: 'Premium product motion',
    description:
      'Thoughtful animations, layered gradients, and glass panels create the polished startup feel the product vision calls for.',
    icon: WandSparkles,
  },
];

export const testimonials = [
  {
    quote:
      'Email Engine gave us templates, imports, and scheduling in one clean flow without extra modules.',
    name: 'Amina Patel',
    title: 'Founder, Northline Operations',
  },
  {
    quote:
      'The onboarding is fast and practical. We were importing leads and sending campaigns the same day.',
    name: 'Marcus Chen',
    title: 'Product Lead, Orbit Ventures',
  },
  {
    quote:
      'The app focuses exactly on email marketing, which made rollout simple for our team.',
    name: 'Daniela Brooks',
    title: 'Fractional COO, Studio Meridian',
  },
];

export const dashboardCopy: Record<CRMType, DashboardPersonalization> = {
  'real-estate': {
    headline: 'Track leads, view pipeline, and schedule site visits.',
    subheadline:
      'Your workspace is tuned for property-focused relationships, opportunities, and follow-up moments.',
    statLabels: ['Pipeline Value', 'Active Leads', 'Showings Today'],
    quickActions: ['Add new lead', 'Schedule site visit', 'Review follow-ups'],
    activity: ['New inquiry from Riverside Towers', 'Offer stage updated', 'Broker follow-up due at 4:30 PM'],
  },
  'gas-station': {
    headline: 'Coordinate operations, contacts, and service workflows.',
    subheadline:
      'See the health of your station relationships and keep service coordination moving from one workspace.',
    statLabels: ['Open Requests', 'Service Partners', 'Station Alerts'],
    quickActions: ['Log service issue', 'Contact supplier', 'Review operations notes'],
    activity: ['Fuel vendor confirmed delivery', 'Maintenance request escalated', 'Shift handoff notes ready'],
  },
  'convenience-store': {
    headline: 'Manage customer touchpoints and store growth signals.',
    subheadline:
      'CoreFlow keeps customer operations, local promotions, and lead follow-ups visible in one place.',
    statLabels: ['Repeat Customers', 'Promotions Running', 'Store Tasks'],
    quickActions: ['Create promotion', 'Add customer note', 'Review open tasks'],
    activity: ['Weekend campaign launched', 'Supplier call logged', 'VIP customer follow-up scheduled'],
  },
  restaurant: {
    headline: 'Manage reservations, customer interactions, and follow-ups.',
    subheadline:
      'Your dashboard focuses on guest relationships, service moments, and the rhythm of daily restaurant operations.',
    statLabels: ['Reservations Today', 'VIP Guests', 'Pending Follow-ups'],
    quickActions: ['Add reservation note', 'Prepare guest outreach', 'Review service feedback'],
    activity: ['Large party booked for Friday', 'Guest recovery follow-up due', 'Chef tasting invite sent'],
  },
  'auto-repair': {
    headline: 'Monitor service jobs, customers, and appointments.',
    subheadline:
      'Keep customer communication, repair workflow signals, and upcoming shop activity organized from day one.',
    statLabels: ['Open Jobs', 'Appointments', 'Repair Updates'],
    quickActions: ['Create service intake', 'Message customer', 'Review repair board'],
    activity: ['Brake service approved', 'Pickup appointment booked', 'Customer estimate sent'],
  },
};
