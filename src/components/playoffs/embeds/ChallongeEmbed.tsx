
import React from "react";

interface Props { 
  slug: string; 
  title: string; 
}

export const ChallongeEmbed: React.FC<Props> = ({ slug, title }) => (
  <div className="rounded-2xl shadow-lg overflow-hidden">
    <h3 className="p-4 text-lg font-semibold bg-gray-50 border-b">{title}</h3>
    <iframe
      src={`https://challonge.com/${slug}/module`}
      width="100%"
      height="500"
      frameBorder="0"
      scrolling="auto"
      allowTransparency
      title={`${title} Bracket`}
    />
  </div>
);
