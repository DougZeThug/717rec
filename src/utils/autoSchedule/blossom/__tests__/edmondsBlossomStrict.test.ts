import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

import edmondsBlossom from 'edmonds-blossom';
import { describe, expect, it } from 'vitest';

import edmondsBlossomStrict from '@/utils/autoSchedule/blossom/vendor/edmondsBlossomStrict';

/**
 * The vendored copy exists because edmonds-blossom 1.0.0 assigns three variables it never
 * declares (b and path in addBlossom, v in expandBlossom). Node runs the original as sloppy
 * CommonJS, where that makes silent globals. A browser bundle is a strict ES module, where
 * it throws "ReferenceError: b is not defined" as soon as a round needs a blossom contraction.
 *
 * This file is an ES module under Vitest, so the copy below runs in strict mode. The original,
 * imported here the normal way, runs as sloppy CommonJS, like it does in Node.
 */

type Matcher = (edges: number[][], maxCardinality?: boolean) => number[];

const copyOf = (edges: number[][]) => edges.map((edge) => [...edge]);

/** The original library source, run as strict code the way a browser bundle runs it. */
const loadOriginalInStrictMode = (): Matcher => {
  const source = readFileSync(createRequire(import.meta.url).resolve('edmonds-blossom'), 'utf8');
  const moduleShim = { exports: edmondsBlossom };
  runInNewContext(`"use strict";${source}`, { module: moduleShim });
  return moduleShim.exports;
};

// Graphs that make the original library contract a blossom (found by search).
const triangle = [
  [0, 1, 10],
  [1, 2, 10],
  [0, 2, 10],
];
const fiveCycleWithTwoPendants = [
  [0, 1, 3],
  [1, 2, 3],
  [2, 3, 3],
  [3, 4, 3],
  [4, 0, 3],
  [0, 5, 2],
  [2, 6, 2],
];
const fiveCycleWithTwoPendantsLowWeights = [
  [0, 1, 2],
  [1, 2, 2],
  [2, 3, 2],
  [3, 4, 1],
  [4, 0, 2],
  [0, 5, 1],
  [2, 6, 1],
];

/** True when every matched vertex is matched back to its partner over an edge of the graph. */
const isValidMatching = (matching: number[], edges: number[][]) =>
  matching.every(
    (partner, vertex) =>
      partner === -1 ||
      (matching[partner] === vertex &&
        edges.some(
          ([first, second]) =>
            (first === vertex && second === partner) || (first === partner && second === vertex)
        ))
  );

describe('the strict-mode copy of edmonds-blossom', () => {
  const graphsThatNeedAContraction = [
    { name: 'a triangle', edges: triangle, maxCardinality: false },
    { name: 'a 5-cycle with two pendants', edges: fiveCycleWithTwoPendants, maxCardinality: false },
    { name: 'a 5-cycle with two pendants', edges: fiveCycleWithTwoPendants, maxCardinality: true },
    {
      name: 'a 5-cycle with two pendants and low weights',
      edges: fiveCycleWithTwoPendantsLowWeights,
      maxCardinality: true,
    },
  ];

  it.each(graphsThatNeedAContraction)(
    'runs in strict mode on $name (maxCardinality $maxCardinality) and returns a valid matching',
    ({ edges, maxCardinality }) => {
      const matching = edmondsBlossomStrict(copyOf(edges), maxCardinality);

      expect(isValidMatching(matching, edges)).toBe(true);
      expect(matching).toEqual(edmondsBlossom(copyOf(edges), maxCardinality));
    }
  );

  it.each(graphsThatNeedAContraction)(
    'is needed: the original library throws a ReferenceError in strict mode on $name (maxCardinality $maxCardinality)',
    ({ edges, maxCardinality }) => {
      // When upstream declares b, path and v, this test fails: delete the vendored copy then.
      const originalInStrictMode = loadOriginalInStrictMode();

      expect(() => originalInStrictMode(copyOf(edges), maxCardinality)).toThrowError(
        'is not defined'
      );
    }
  );

  it('returns an empty list for a graph with no edges, like the original', () => {
    expect(edmondsBlossomStrict([])).toEqual([]);
  });
});

describe('the strict-mode copy and the original library on random graphs', () => {
  /** A small fixed-seed generator (LCG): the same 400 graphs on every run. */
  const makeRandom = (seed: number) => {
    let state = seed >>> 0;
    return (limit: number) => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return Math.floor((state / 4294967296) * limit);
    };
  };

  /** 4 to 12 vertices, random edges (25% to 80% of all pairs) with integer weights 1 to 40. */
  const randomGraph = (random: (limit: number) => number) => {
    const vertexCount = 4 + random(9);
    const density = 25 + random(56);
    const edges: number[][] = [];
    for (let first = 0; first < vertexCount; first++) {
      for (let second = first + 1; second < vertexCount; second++) {
        if (random(100) < density) edges.push([first, second, 1 + random(40)]);
      }
    }
    return edges.length > 0 ? edges : [[0, 1, 1 + random(40)]];
  };

  it('returns the same matching on 400 seeded graphs, with and without maxCardinality', () => {
    const random = makeRandom(717);
    const originalInStrictMode = loadOriginalInStrictMode();
    const differences: string[] = [];
    let crashesInStrictMode = 0;

    for (let index = 0; index < 400; index++) {
      const edges = randomGraph(random);
      const maxCardinality = index % 2 === 1;
      const expected = edmondsBlossom(copyOf(edges), maxCardinality);
      const actual = edmondsBlossomStrict(copyOf(edges), maxCardinality);
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        differences.push(`graph ${index}: ${JSON.stringify(edges)}`);
      }
      try {
        originalInStrictMode(copyOf(edges), maxCardinality);
      } catch {
        crashesInStrictMode++;
      }
    }

    expect(differences).toEqual([]);
    // The set is not trivial: many of these graphs crash the original in strict mode.
    expect(crashesInStrictMode).toBeGreaterThan(100);
  });
});
