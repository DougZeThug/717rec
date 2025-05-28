
import React from "react";
import PlayoffPageLayout from "@/components/playoffs/layout/PlayoffPageLayout";
import { usePlayoffPageData } from "@/components/playoffs/hooks/usePlayoffPageData";

const Playoffs = () => {
  const data = usePlayoffPageData();
  
  return <PlayoffPageLayout data={data} />;
};

export default Playoffs;
