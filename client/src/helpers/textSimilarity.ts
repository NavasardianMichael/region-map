/**
 * Text Similarity Utilities
 *
 * Uses Levenshtein distance and normalization to match user-provided region labels
 * with SVG path titles. Handles variations like:
 * - "Gegharkunik" matching "Geġark'unik'"
 * - alternate spellings of the same place name
 * - "Russian Federation" matching "Russia"
 */

import { parseMapSvgElement } from '@/helpers/parseMapSvg';

/**
 * Normalize text for comparison by:
 * - Converting to lowercase
 * - Removing diacritics/accents
 * - Removing special characters and apostrophes
 * - Trimming whitespace
 */
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[''`ʻ]/g, '') // Remove various apostrophes
    .replace(/[^a-z0-9\s]/g, '') // Remove other special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed
 */
export const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[a.length][b.length];
};

/**
 * Calculate similarity score between two strings (0 to 1)
 * Uses normalized Levenshtein distance
 */
export const calculateSimilarity = (a: string, b: string): number => {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);

  if (normalizedA === normalizedB) return 1;
  if (normalizedA.length === 0 || normalizedB.length === 0) return 0;

  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);

  return 1 - distance / maxLength;
};

/**
 * Check if one string contains the other (as a substring match)
 */
export const containsMatch = (a: string, b: string): boolean => {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);

  return normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA);
};

type MatchResult = {
  svgId: string; // The title from SVG path (used as ID)
  label: string; // Original label from user data
  score: number; // Similarity score (0-1)
};

/**
 * Find the best matching SVG region ID for a given label
 *
 * @param label - User provided region label (e.g., "Gegharkunik")
 * @param svgTitles - Array of titles from SVG paths (e.g., ["Geġark'unik'", "Ararat"])
 * @param threshold - Minimum similarity score to consider a match (default 0.6)
 * @returns Best match result or null if no good match found
 */
export const findBestMatch = (
  label: string,
  svgTitles: string[],
  threshold = 0.75,
): MatchResult | null => {
  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const svgTitle of svgTitles) {
    // First check for exact normalized match
    if (normalizeText(label) === normalizeText(svgTitle)) {
      return { svgId: svgTitle, label, score: 1 };
    }

    // Check contains match (bonus for substring matches)
    const hasContains = containsMatch(label, svgTitle);
    const similarity = calculateSimilarity(label, svgTitle);
    const score = hasContains ? Math.max(similarity, 0.85) : similarity;

    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = { svgId: svgTitle, label, score };
    }
  }

  return bestMatch;
};

/**
 * Extract region titles from SVG content
 *
 * @param svgContent - Raw SVG string content
 * @returns Array of title values from path elements
 */
export const extractSvgTitles = (svgContent: string): string[] => {
  const titles: string[] = [];
  const parsed = parseMapSvgElement(svgContent);
  if (!parsed) return titles;

  const paths = parsed.svgElement.querySelectorAll('path[title]');
  paths.forEach((path) => {
    const title = path.getAttribute('title');
    if (title) {
      titles.push(title);
    }
  });

  return titles;
};

type ParsedRow = {
  id: string;
  label: string;
  value: number;
};

type MappedRegionData = {
  id: string;
  label: string;
  value: number;
};

/**
 * Map parsed data rows to SVG region ids.
 *
 * Two passes: rows are first matched to svg titles by normalized-exact equality
 * (case/diacritic/whitespace-insensitive); only rows still unmatched after that are
 * given a similarity-based fallback match. Each svg title can be claimed by at most one
 * row per call, so two rows can never be remapped onto the same region. A matched row's
 * `id` is rewritten to the exact svg title string (never a normalized copy), since
 * rendering looks up data by the raw, unmodified `title` attribute. `label` is left as-is.
 *
 * @param rows - Parsed data rows with id, label and value
 * @param svgTitles - Candidate region ids/titles from the current map's SVG paths
 * @returns Mapped region data
 */
export const mapDataToSvgRegions = (rows: ParsedRow[], svgTitles: string[]): MappedRegionData[] => {
  const available = [...svgTitles];
  const result: MappedRegionData[] = new Array(rows.length);
  const pendingIndexes: number[] = [];

  const claim = (title: string): void => {
    const index = available.indexOf(title);
    if (index !== -1) available.splice(index, 1);
  };

  rows.forEach((row, index) => {
    const normalizedId = normalizeText(row.id);
    const exactTitle = available.find((title) => normalizeText(title) === normalizedId);
    if (exactTitle) {
      claim(exactTitle);
      result[index] = { id: exactTitle, label: row.label, value: row.value };
    } else {
      pendingIndexes.push(index);
    }
  });

  for (const index of pendingIndexes) {
    const row = rows[index];
    const match = findBestMatch(row.id, available);
    if (match) {
      claim(match.svgId);
      result[index] = { id: match.svgId, label: row.label, value: row.value };
    } else {
      result[index] = { id: row.id, label: row.label, value: row.value };
    }
  }

  return result;
};
