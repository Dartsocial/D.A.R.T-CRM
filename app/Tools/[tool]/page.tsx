"use client";

import React from "react";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { use } from "react";

const toolsMap: Record<string, React.ComponentType> = {
  "delivery-intake": dynamic(() =>
    import("@/components/tools/DeliveryIntakeForm")
  ),
  "timesheet-calculator": dynamic(() =>
    import("@/components/tools/timesheet-calculator")
  ),
  "dart-bucks-generator": dynamic(() =>
    import("@/components/tools/DartBucksGenerator")
  ),
};

const ToolPage = ({ params }: { params: Promise<{ tool: string }> }) => {
  const resolvedParams = use(params);
  const { tool } = resolvedParams;

  const ToolComponent = toolsMap[tool];

  if (!ToolComponent) {
    notFound();
    return null;
  }

  return <ToolComponent />;
};

export default ToolPage;