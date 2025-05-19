
import { supabase } from "@/integrations/supabase/client";
import { PlayoffBracket, PlayoffMatch } from "./types";
import { BracketService } from "@/services/BracketService";

/**
 * Fetch a bracket by ID
 */
export async function fetchBracketById(bracketId: string): Promise<PlayoffBracket | null> {
  try {
    return await BracketService.getBracketDetails(bracketId);
  } catch (error) {
    console.error("Error fetching bracket by ID:", error);
    throw error;
  }
}

/**
 * Group bracket matches by type (winners, losers, finals) and round
 */
export function groupBracketMatchesByType(bracket: PlayoffBracket) {
  const winners: PlayoffMatch[][] = [];
  const losers: PlayoffMatch[][] = [];
  const finals: PlayoffMatch[] = [];

  bracket.matches.forEach(match => {
    if (match.matchType === "winners") {
      if (!winners[match.round - 1]) winners[match.round - 1] = [];
      winners[match.round - 1].push(match);
    } else if (match.matchType === "losers") {
      if (!losers[match.round - 1]) losers[match.round - 1] = [];
      losers[match.round - 1].push(match);
    } else if (match.matchType === "finals") {
      finals.push(match);
    }
  });

  return {
    winners,
    losers,
    finals
  };
}

/**
 * Fetch all brackets with optional filtering
 */
export async function fetchAllBrackets(): Promise<Partial<PlayoffBracket>[]> {
  try {
    const { data, error } = await supabase
      .from('brackets')
      .select(`
        id, 
        title, 
        format, 
        divisions:division_id (name)
      `);
    
    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      name: item.title,
      format: item.format,
      division: item.divisions?.name || ''
    }));
  } catch (error) {
    console.error("Error fetching all brackets:", error);
    throw error;
  }
}
