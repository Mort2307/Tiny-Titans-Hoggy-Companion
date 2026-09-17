import { useEffect } from "react";
import { tinyTitansIntelligenceKernel } from "../services/tinyTitansIntelligenceKernel";

export default function IntelligenceRuntimeBootstrap() {
  useEffect(() => tinyTitansIntelligenceKernel.start(), []);
  return null;
}
