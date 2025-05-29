
import React from "react";
import { ChallongeEmbed } from "./ChallongeEmbed";

const brackets = [
  { slug: "717reccomp", title: "Competitive" },
  { slug: "717recInt1", title: "Intermediate 1" },
  { slug: "717recInt2", title: "Intermediate 2" },
  { slug: "717recRec", title: "Recreational" },
];

export const ChallongeFallback: React.FC = () => (
  <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {brackets.map(({ slug, title }) => (
      <ChallongeEmbed key={slug} slug={slug} title={title} />
    ))}
  </section>
);
