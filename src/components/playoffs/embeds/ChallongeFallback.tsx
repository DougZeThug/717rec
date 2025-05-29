
import React from "react";
import { ChallongeEmbed } from "./ChallongeEmbed";

const brackets = [
  { slug: "717reccomp", title: "Division A" },
  { slug: "717recInt1", title: "Division B" },
  { slug: "717recInt2", title: "Division C" },
  { slug: "717recRec", title: "Division D" },
];

export const ChallongeFallback: React.FC = () => (
  <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {brackets.map(({ slug, title }) => (
      <ChallongeEmbed key={slug} slug={slug} title={title} />
    ))}
  </section>
);
