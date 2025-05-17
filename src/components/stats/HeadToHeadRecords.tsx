
import React from "react";
import { HeadToHeadMap } from "@/types";

interface HeadToHeadRecordsProps {
  headToHead: HeadToHeadMap | undefined;
}

const HeadToHeadRecords: React.FC<HeadToHeadRecordsProps> = ({ headToHead }) => {
  if (!headToHead || Object.keys(headToHead).length === 0) {
    return <div className="text-sm text-gray-500">No head-to-head records available</div>;
  }

  return (
    <div className="space-y-2 p-2">
      <h4 className="font-medium text-sm">Head-to-Head Records</h4>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {Object.values(headToHead).flatMap(entries => 
          entries.map(record => (
            <div key={record.opponentName} className="border rounded p-2 bg-gray-50">
              <span className="font-medium">vs. {record.opponentName}: </span>
              <span>{record.wins}–{record.losses}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HeadToHeadRecords;
