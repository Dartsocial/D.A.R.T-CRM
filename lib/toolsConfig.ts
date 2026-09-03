// lib/toolsConfig.ts
// NOTE: Components here are imported for toolsConfig metadata only.
// The actual dynamic loading happens in app/Tools/[tool]/page.tsx.

export const tools = [
  {
    name: "Delivery Intake",
    path: "/Tools/delivery-intake",
    description: "Schedule a pickup or delivery order",
  },
  {
    name: "Timesheet Calculator",
    path: "/Tools/timesheet-calculator",
    description: "Calculate hours and pay across multiple weeks",
  },
  {
    name: "Punch Card Maker",
    path: "/Tools/punch-card-maker",
    description: "Generate printable punch cards",
  },
  {
    name: "DartBucks Generator",
    path: "/Tools/dart-bucks-generator",
    description: "Generate printable DartBucks with batch serial tracking",
  },
];