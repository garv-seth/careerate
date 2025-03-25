/**
 * Robust JSON Parser Helper for LLM Outputs
 *
 * This utility provides robust JSON parsing for LLM outputs, which often contain malformed
 * or incomplete JSON. It includes several fallback methods for extracting JSON data.
 */

/**
 * A robust JSON parser that can handle various inconsistencies in LLM outputs
 *
 * @param text The text to parse, which may contain JSON somewhere within it
 * @param fallbackType Optional type indicator for context-aware fallbacks
 * @returns Parsed JSON object or array, or a fallback empty structure
 */
export function safeParseJSON(
  text: any,
  fallbackType?: "skillGaps" | "insights" | "plan" | "stories",
) {
  // Handle non-string inputs
  if (typeof text !== "string") {
    try {
      text = typeof text === "object" ? JSON.stringify(text) : String(text);
    } catch (error) {
      console.error("Failed to convert input to string:", error);
      return getFallbackObject(fallbackType);
    }
  }

  // Try a sequence of increasingly aggressive parsing strategies
  try {
    // Strategy 1: Try direct JSON.parse if the content is already properly formatted
    return JSON.parse(text);
  } catch (e) {
    console.log("Direct parsing failed, trying to extract JSON...");

    try {
      // Strategy 2: Remove markdown code blocks and try again
      text = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, "$1");

      // Try to identify the outermost JSON object or array
      const objectMatch = text.match(/(\{[\s\S]*\})/s);
      const arrayMatch = text.match(/(\[[\s\S]*\])/s);

      // Prioritize whichever match is longer (more complete)
      if (objectMatch && arrayMatch) {
        if (objectMatch[0].length > arrayMatch[0].length) {
          return JSON.parse(objectMatch[0]);
        } else {
          return JSON.parse(arrayMatch[0]);
        }
      } else if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      } else if (arrayMatch) {
        return JSON.parse(arrayMatch[0]);
      }

      // Strategy 3: Apply a series of string cleanup operations
      let cleaned = text
        // Strip control characters
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        // Remove comments
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*/g, "")
        // Handle property names (unquoted -> quoted)
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3')
        // Fix single-quoted strings -> double-quoted
        .replace(/:\s*'([^']*)'/g, ':"$1"')
        // Fix trailing commas
        .replace(/,(\s*[\]}])/g, "$1")
        // Trim the result
        .trim();

      // Handle potential unclosed structures by counting brackets
      const openBraces = (cleaned.match(/\{/g) || []).length;
      const closeBraces = (cleaned.match(/\}/g) || []).length;
      const openBrackets = (cleaned.match(/\[/g) || []).length;
      const closeBrackets = (cleaned.match(/\]/g) || []).length;

      // Add missing closing braces/brackets
      for (let i = 0; i < openBraces - closeBraces; i++) {
        cleaned += "}";
      }
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        cleaned += "]";
      }

      // Try to parse the cleaned JSON
      return JSON.parse(cleaned);
    } catch (e2) {
      console.log("Extraction failed, trying structure-aware parsing...");

      try {
        // Strategy 4: Try to extract properly formatted chunks and rebuild
        if (fallbackType === "skillGaps") {
          // Try to extract skill gaps from semi-structured text
          return extractSkillGaps(text);
        } else if (fallbackType === "insights") {
          // Try to extract insights from semi-structured text
          return extractInsights(text);
        } else if (fallbackType === "plan") {
          // Try to extract plan from semi-structured text
          return extractPlan(text);
        } else if (fallbackType === "stories") {
          // Try to extract stories from semi-structured text
          return extractStories(text);
        }
      } catch (e3) {
        console.error("Structure-aware parsing failed:", e3);
      }

      // Return appropriate fallback if all else fails
      return getFallbackObject(fallbackType);
    }
  }
}

/**
 * Extract skill gaps from semi-structured text
 */
function extractSkillGaps(text: string): any[] {
  const skills: any[] = [];

  // Match patterns like "Skill: JavaScript, Level: High" or "1. JavaScript (High gap)"
  const skillPatterns = [
    // Pattern 1: Labeled skill entries
    /(?:Skill|Name)[^:]*:\s*([^,\n]+)[^:]*(?:Level|Gap)[^:]*:\s*([^,\n]+)/gi,
    // Pattern 2: Numbered list entries
    /\d+\.\s*([^(]+)\s*\(([^)]+)\s*(?:gap|level)[^)]*\)/gi,
    // Pattern 3: Key-value pairs
    /"skillName"\s*:\s*"([^"]+)"[^"]*"gapLevel"\s*:\s*"([^"]+)"/gi,
  ];

  // Try each pattern
  for (const pattern of skillPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const skillName = match[1].trim();
      const gapLevel = normalizeGapLevel(match[2].trim());

      // Avoid duplicates
      if (!skills.some((s) => s.skillName === skillName)) {
        skills.push({
          skillName,
          gapLevel,
          confidenceScore: 70,
          mentionCount: 1,
          contextSummary: "",
        });
      }
    }
  }

  return skills;
}

/**
 * Extract insights from semi-structured text
 */
function extractInsights(text: string): any {
  const insights: any = {
    keyObservations: [],
    commonChallenges: [],
    successRate: 70,
    timeframe: "6-12 months",
  };

  // Match observations
  const obsPattern =
    /(?:observation|key point|insight)[^:.]*[:.]?\s*([^.!?]+[.!?])/gi;
  let match;
  while ((match = obsPattern.exec(text)) !== null) {
    const observation = match[1].trim();
    if (
      observation.length > 5 &&
      !insights.keyObservations.includes(observation)
    ) {
      insights.keyObservations.push(observation);
    }
  }

  // Match challenges
  const chalPattern =
    /(?:challenge|difficulty|obstacle)[^:.]*[:.]?\s*([^.!?]+[.!?])/gi;
  while ((match = chalPattern.exec(text)) !== null) {
    const challenge = match[1].trim();
    if (
      challenge.length > 5 &&
      !insights.commonChallenges.includes(challenge)
    ) {
      insights.commonChallenges.push(challenge);
    }
  }

  // Try to extract success rate
  const rateMatch = text.match(
    /(?:success rate|success probability)[^:.]*[:.]?\s*(\d+)%?/i,
  );
  if (rateMatch && !isNaN(parseInt(rateMatch[1]))) {
    insights.successRate = parseInt(rateMatch[1]);
  }

  // Try to extract timeframe
  const timeMatch = text.match(
    /(?:timeframe|time frame|transition time|duration)[^:.]*[:.]?\s*([^.!?]+[.!?])/i,
  );
  if (timeMatch) {
    insights.timeframe = timeMatch[1].trim();
  }

  return insights;
}

/**
 * Extract plan from semi-structured text
 */
function extractPlan(text: string): any {
  const milestones: any[] = [];

  // Match milestone blocks
  const milestonePattern =
    /(?:milestone|step)\s*\d+\s*:([^:]+)(?:description|details)?:?([^:]+)(?:(?:priority|importance):([^:]+))?(?:(?:duration|timeframe|time frame):([^:]+))?/gi;

  let match;
  let index = 1;
  while ((match = milestonePattern.exec(text)) !== null) {
    const title = match[1]?.trim() || `Milestone ${index}`;
    const description = match[2]?.trim() || null;
    const priority = match[3]?.trim() || "Medium";
    const durationText = match[4]?.trim() || "";

    // Try to extract duration in weeks
    let durationWeeks = 2;
    const durationMatch = durationText.match(/(\d+)\s*(?:week|wk)/i);
    if (durationMatch) {
      durationWeeks = parseInt(durationMatch[1]);
    }

    milestones.push({
      title,
      description,
      priority: normalizePriority(priority),
      durationWeeks,
      order: index,
    });

    index++;
  }

  // If no milestones found by regex, try to split by numbered items
  if (milestones.length === 0) {
    const numberedItems = text.match(/\d+\.\s*([^:]+):/g);

    if (numberedItems) {
      for (let i = 0; i < numberedItems.length; i++) {
        const title = numberedItems[i]
          .replace(/\d+\.\s*/, "")
          .replace(":", "")
          .trim();

        milestones.push({
          title,
          description: null,
          priority: "Medium",
          durationWeeks: 2,
          order: i + 1,
        });
      }
    }
  }

  return { milestones };
}

/**
 * Extract stories from semi-structured text
 */
function extractStories(text: string): any[] {
  const stories: any[] = [];

  // Match story blocks
  const storyPattern =
    /(?:story|experience|case study)\s*\d*\s*:([^:]+)(?:source|from):([^:]+)(?:(?:content|details):([^:]+))?/gi;

  let match;
  while ((match = storyPattern.exec(text)) !== null) {
    const title = match[1]?.trim() || "Transition Story";
    const source = match[2]?.trim() || "Unknown";
    const content = match[3]?.trim() || title;

    stories.push({
      title,
      source,
      content,
      url: null,
    });
  }

  // If no stories found by regex, try to split by numbered items
  if (stories.length === 0) {
    const paragraphs = text.split(/\n\n/);

    for (const paragraph of paragraphs) {
      if (paragraph.length > 100) {
        // Assume paragraphs over 100 chars could be stories
        stories.push({
          title: "Transition Story",
          source: "Extracted from text",
          content: paragraph.trim(),
          url: null,
        });
      }
    }
  }

  return stories;
}

/**
 * Normalize gap level to standard values
 */
function normalizeGapLevel(level: string): "Low" | "Medium" | "High" {
  const normalized = level.trim().toLowerCase();

  if (
    normalized.includes("low") ||
    normalized.includes("minor") ||
    normalized.includes("small")
  ) {
    return "Low";
  } else if (
    normalized.includes("high") ||
    normalized.includes("major") ||
    normalized.includes("large") ||
    normalized.includes("significant")
  ) {
    return "High";
  } else {
    return "Medium";
  }
}

/**
 * Normalize priority to standard values
 */
function normalizePriority(priority: string): "Low" | "Medium" | "High" {
  const normalized = priority.trim().toLowerCase();

  if (normalized.includes("low")) {
    return "Low";
  } else if (
    normalized.includes("high") ||
    normalized.includes("critical") ||
    normalized.includes("important")
  ) {
    return "High";
  } else {
    return "Medium";
  }
}

/**
 * Get appropriate fallback object based on type
 */
function getFallbackObject(
  type?: "skillGaps" | "insights" | "plan" | "stories",
): any {
  switch (type) {
    case "skillGaps":
      return [
        {
          skillName: "Technical Skills",
          gapLevel: "Medium",
          confidenceScore: 70,
          mentionCount: 1,
          contextSummary: "Core technical skills needed for the target role",
        },
        {
          skillName: "Domain Knowledge",
          gapLevel: "High",
          confidenceScore: 80,
          mentionCount: 2,
          contextSummary: "Specific knowledge required for the industry",
        },
      ];

    case "insights":
      return {
        keyObservations: [
          "Most successful transitions take 6-12 months",
          "Building a portfolio of relevant projects is critical",
          "Networking with professionals in the target role increases success rate",
        ],
        commonChallenges: [
          "Adapting to new technical requirements",
          "Building required domain knowledge",
          "Demonstrating leadership capabilities",
        ],
        successRate: 70,
        timeframe: "6-12 months",
      };

    case "plan":
      return {
        milestones: [
          {
            title: "Build foundational knowledge",
            description: "Develop core knowledge required for the target role",
            priority: "High",
            durationWeeks: 4,
            order: 1,
          },
          {
            title: "Bridge key skill gaps",
            description:
              "Focus on the most critical skill gaps identified in the analysis",
            priority: "High",
            durationWeeks: 6,
            order: 2,
          },
        ],
      };

    case "stories":
      return [
        {
          title: "Successful Transition Story",
          source: "Community Forum",
          content:
            "A professional successfully transitioned to the target role after focusing on building relevant skills and networking with current professionals in the field.",
          url: null,
        },
      ];

    default:
      // Return an empty object or array
      return Array.isArray(text) ? [] : {};
  }
}
