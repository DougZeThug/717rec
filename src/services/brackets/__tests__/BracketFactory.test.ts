
import { describe, it, expect } from 'vitest';
import { BracketFactory } from '../BracketFactory';
import { SingleEliminationGenerator } from '../generators/SingleEliminationGenerator';
import { DoubleEliminationGenerator } from '../generators/DoubleEliminationGenerator';
import { PlayoffBracketGenerator } from '../generators/PlayoffBracketGenerator';
import { Team } from '@/types';

describe('BracketFactory', () => {
  const bracketId = 'test-bracket-id';
  const teams: Team[] = [
    { id: '1', name: 'Team 1', seed: 1 },
    { id: '2', name: 'Team 2', seed: 2 },
    { id: '3', name: 'Team 3', seed: 3 },
    { id: '4', name: 'Team 4', seed: 4 },
  ];

  it('creates a SingleEliminationGenerator for single-elimination type', () => {
    const generator = BracketFactory.createGenerator('single-elimination', bracketId, teams);
    expect(generator).toBeInstanceOf(SingleEliminationGenerator);
  });

  it('creates a DoubleEliminationGenerator for double-elimination type', () => {
    const generator = BracketFactory.createGenerator('double-elimination', bracketId, teams);
    expect(generator).toBeInstanceOf(DoubleEliminationGenerator);
  });

  it('creates a PlayoffBracketGenerator for playoff type', () => {
    const generator = BracketFactory.createGenerator('playoff', bracketId, teams);
    expect(generator).toBeInstanceOf(PlayoffBracketGenerator);
  });

  it('throws an error for unsupported bracket types', () => {
    // @ts-ignore - Testing invalid input
    expect(() => BracketFactory.createGenerator('unsupported', bracketId, teams)).toThrow(
      'Unsupported bracket type: unsupported'
    );
  });
});
