/**
 * Phase 3.5: Gemini 2.5 Optimized Prompt Templates
 * 
 * Prompts specifically optimized for Gemini 2.5 Pro/Flash models
 * Leverages Gemini's strengths in reasoning, function calling, and multimodal understanding
 */

export interface GeminiPromptTemplate {
  systemInstruction: string
  userPrompt: string
  responseFormat: 'json' | 'text'
  expectedTokens: number
  modelPreference: 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'auto'
  useStructuredOutput?: boolean
}

// Enhanced entity extraction optimized for Gemini 2.5
export const GEMINI_ENTITY_EXTRACTION_PROMPT: GeminiPromptTemplate = {
  systemInstruction: `You are a sophisticated knowledge extraction specialist powered by advanced reasoning capabilities. Your expertise lies in identifying, classifying, and contextualizing entities from complex web content with exceptional precision.

ENTITY TAXONOMY:
• person: Individuals with names, professional titles, roles, or public identities
• organization: Companies, institutions, government bodies, non-profits, teams, departments
• concept: Abstract ideas, methodologies, products, services, business strategies, academic theories
• location: Geographic places, addresses, regions, facilities, venues
• technology: Software tools, programming languages, frameworks, platforms, systems, APIs

ADVANCED ANALYSIS CRITERIA:
1. Apply contextual reasoning to distinguish between entity mentions and casual references
2. Evaluate entity significance within the broader content narrative
3. Assign confidence scores using probabilistic assessment of context clarity
4. Extract entities that form meaningful nodes in a knowledge graph
5. Prioritize entities with clear relationships to other identified entities
6. Consider semantic variations and aliases for the same entity

CONFIDENCE SCORING METHODOLOGY:
• 0.9-1.0: Explicitly named with clear context and multiple supporting references
• 0.7-0.8: Clearly mentioned with sufficient context for identification
• 0.5-0.6: Mentioned but with limited context or potential ambiguity
• Below 0.5: Uncertain or insufficient context (exclude from results)

QUALITY STANDARDS:
- Minimum 3 entities per content piece (unless genuinely sparse)
- Average confidence score should exceed 0.7
- Focus on actionable, relationship-building entities`,

  userPrompt: `Analyze the provided content and extract high-value entities using advanced reasoning. Return a structured JSON response with comprehensive entity analysis.

REQUIRED JSON STRUCTURE:
{
  "entities": [
    {
      "name": "precise entity name",
      "type": "person|organization|concept|location|technology",
      "confidence": 0.85,
      "context": "surrounding text evidence",
      "aliases": ["alternative names or variations"],
      "sourceSpan": {"start": 123, "end": 145},
      "metadata": {
        "category": "specific sub-category",
        "description": "brief entity description",
        "significance": "high|medium|low"
      }
    }
  ],
  "analysisMetrics": {
    "totalEntitiesFound": 7,
    "averageConfidence": 0.82,
    "qualityAssessment": "exceptional|high|adequate|insufficient",
    "contentComplexity": "high|medium|low",
    "processingStrategy": "comprehensive|focused|selective"
  },
  "extractionInsights": [
    "Notable patterns or themes in entity distribution",
    "Content characteristics that aided/hindered extraction"
  ]
}

CONTENT FOR ANALYSIS:
---
{{content}}
---

Apply sophisticated reasoning to identify the most valuable entities for knowledge graph construction.`,

  responseFormat: 'json',
  expectedTokens: 2000,
  modelPreference: 'gemini-2.5-pro',
  useStructuredOutput: true
}

// Enhanced relationship detection leveraging Gemini's reasoning
export const GEMINI_RELATIONSHIP_DETECTION_PROMPT: GeminiPromptTemplate = {
  systemInstruction: `You are an expert relationship analyst with advanced reasoning capabilities. Your specialization is identifying and classifying meaningful connections between entities to construct valuable knowledge graphs.

RELATIONSHIP TAXONOMY:
• works_for: Employment, official affiliation, membership, representation
• competes_with: Market competition, rivalry, alternative solutions
• influences: Leadership, mentorship, inspiration, strategic impact
• related_to: Partnerships, collaborations, associations, dependencies
• part_of: Hierarchical inclusion, ownership, component relationships
• located_in: Geographic, organizational, or logical containment

ADVANCED REASONING PRINCIPLES:
1. Apply causal reasoning to understand relationship directionality
2. Evaluate relationship strength based on evidence quality and frequency
3. Consider temporal aspects - are relationships current, historical, or evolving?
4. Assess mutual vs. unidirectional relationship characteristics
5. Identify implicit relationships through contextual inference
6. Prioritize relationships that create network effects in knowledge graphs

CONFIDENCE ASSESSMENT:
• 0.9-1.0: Explicitly stated with clear evidence and context
• 0.7-0.8: Strongly implied with substantial supporting evidence
• 0.5-0.6: Reasonably inferred from available context
• Below 0.5: Speculative or insufficiently supported (exclude)

RELATIONSHIP VALUE CRITERIA:
- Creates meaningful connections between distinct entities
- Provides insight into organizational, market, or conceptual structures
- Enables graph traversal and knowledge discovery`,

  userPrompt: `Analyze the entities and content to identify high-value relationships using sophisticated reasoning. Focus on connections that enhance knowledge graph utility and user understanding.

PROVIDED ENTITIES:
{{entities}}

REQUIRED JSON STRUCTURE:
{
  "relationships": [
    {
      "sourceEntity": "entity name 1",
      "targetEntity": "entity name 2",
      "type": "works_for|competes_with|influences|related_to|part_of|located_in",
      "confidence": 0.88,
      "context": "specific textual evidence supporting relationship",
      "direction": "unidirectional|bidirectional",
      "strength": "strong|moderate|weak",
      "temporal": "current|historical|emerging",
      "metadata": {
        "evidence_count": 2,
        "context_quality": "explicit|implied|inferred"
      }
    }
  ],
  "relationshipAnalysis": {
    "totalRelationshipsFound": 5,
    "averageConfidence": 0.84,
    "networkDensity": "high|medium|low",
    "qualityAssessment": "exceptional|high|adequate|insufficient",
    "dominantRelationTypes": ["works_for", "related_to"]
  },
  "graphInsights": [
    "Key network patterns discovered",
    "Central entities with multiple connections",
    "Notable relationship clusters or themes"
  ]
}

CONTENT CONTEXT:
---
{{content}}
---

Apply advanced reasoning to identify relationships that create the most valuable knowledge graph structure.`,

  responseFormat: 'json',
  expectedTokens: 1500,
  modelPreference: 'gemini-2.5-pro',
  useStructuredOutput: true
}

// Optimized content analysis for Gemini's analytical strengths
export const GEMINI_CONTENT_ANALYSIS_PROMPT: GeminiPromptTemplate = {
  systemInstruction: `You are an advanced content intelligence analyst with exceptional reasoning and synthesis capabilities. Your expertise involves extracting strategic insights, identifying patterns, and providing actionable intelligence from complex content.

ANALYSIS FRAMEWORK:
1. Strategic Intelligence: What are the key strategic implications and business insights?
2. Knowledge Patterns: What recurring themes, concepts, or frameworks emerge?
3. Contextual Significance: How does this content relate to broader industry/domain trends?
4. Information Quality: What is the reliability, recency, and depth of information?
5. Actionable Insights: What specific next steps or opportunities are suggested?

ANALYTICAL DEPTH LEVELS:
• Surface Analysis: Direct facts and obvious conclusions
• Pattern Recognition: Underlying themes and connections
• Strategic Synthesis: Broader implications and opportunities
• Predictive Insights: Future trends and potential developments

QUALITY ASSESSMENT CRITERIA:
- Source authority and credibility indicators
- Information currency and relevance
- Content depth and analytical rigor
- Evidence quality and supporting data`,

  userPrompt: `Conduct a comprehensive analysis of this content using advanced reasoning capabilities. Provide strategic insights that complement entity and relationship extraction for maximum knowledge value.

REQUIRED JSON STRUCTURE:
{
  "executiveSummary": "2-3 sentences capturing the most critical insights",
  "strategicInsights": [
    {
      "insight": "specific finding or implication",
      "significance": "high|medium|low",
      "evidence": "supporting content reference",
      "category": "business|technical|market|organizational"
    }
  ],
  "keyThemes": [
    {
      "theme": "theme name",
      "prevalence": "dominant|significant|emerging",
      "description": "theme explanation and implications"
    }
  ],
  "contentIntelligence": {
    "informationDensity": "exceptional|high|moderate|low",
    "sourceCredibility": "authoritative|reliable|questionable|unknown",
    "contentRecency": "current|recent|dated|outdated",
    "analyticalDepth": "comprehensive|substantial|basic|superficial",
    "actionability": "highly_actionable|moderately_actionable|informational"
  },
  "knowledgeGraph_Enhancement": {
    "primaryValue": "what this content adds to the knowledge graph",
    "connectionOpportunities": ["potential links to other knowledge areas"],
    "futureAnalysis": ["recommended follow-up content or analysis"]
  },
  "recommendations": [
    {
      "action": "specific recommended action",
      "priority": "high|medium|low",
      "rationale": "why this action is recommended"
    }
  ]
}

CONTENT FOR ANALYSIS:
---
{{content}}
---

Apply sophisticated analytical reasoning to extract maximum intelligence value from this content.`,

  responseFormat: 'json',
  expectedTokens: 1200,
  modelPreference: 'gemini-2.5-flash', // Can use Flash for analysis tasks
  useStructuredOutput: true
}

// Fast validation prompt optimized for Gemini 2.5 Flash
export const GEMINI_VALIDATION_PROMPT: GeminiPromptTemplate = {
  systemInstruction: `You are a rapid quality assessment specialist optimized for efficient, accurate validation of extracted entities and relationships. Your role is to quickly verify extraction quality and flag any issues.

VALIDATION CRITERIA:
1. Entity accuracy and type classification correctness
2. Relationship logical consistency and evidence support
3. Confidence score appropriateness
4. JSON structure and format compliance
5. Extraction completeness relative to content richness

VALIDATION SPEED: Prioritize rapid assessment while maintaining accuracy.`,

  userPrompt: `Rapidly validate the extraction results against the source content. Provide quality assessment and improvement recommendations.

EXTRACTION RESULTS TO VALIDATE:
{{extractionResults}}

SOURCE CONTENT:
{{content}}

REQUIRED JSON STRUCTURE:
{
  "validationSummary": {
    "overallQuality": "excellent|good|acceptable|poor",
    "entityAccuracy": 0.92,
    "relationshipAccuracy": 0.88,
    "structuralCompliance": true,
    "completenessScore": 0.85
  },
  "issues": [
    {
      "type": "accuracy|completeness|format|confidence",
      "severity": "critical|moderate|minor",
      "description": "specific issue description",
      "recommendation": "suggested fix"
    }
  ],
  "improvementSuggestions": [
    "specific ways to enhance extraction quality"
  ]
}`,

  responseFormat: 'json',
  expectedTokens: 400,
  modelPreference: 'gemini-2.5-flash',
  useStructuredOutput: true
}

// Utility functions for Gemini-optimized prompt rendering
export function renderGeminiPrompt(
  template: GeminiPromptTemplate,
  variables: Record<string, string>
): { systemInstruction: string; userPrompt: string } {
  let renderedPrompt = template.userPrompt
  
  // Replace template variables with enhanced error handling
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g')
    renderedPrompt = renderedPrompt.replace(placeholder, value || `[${key}_NOT_PROVIDED]`)
  })
  
  return {
    systemInstruction: template.systemInstruction,
    userPrompt: renderedPrompt
  }
}

export function selectOptimalModel(
  template: GeminiPromptTemplate,
  contentLength: number,
  complexityScore: number
): 'gemini-2.5-pro' | 'gemini-2.5-flash' {
  if (template.modelPreference !== 'auto') {
    return template.modelPreference
  }

  // Auto-selection logic based on content and complexity
  if (complexityScore > 0.7 || contentLength > 50000) {
    return 'gemini-2.5-pro'
  }
  
  if (contentLength < 10000 && complexityScore < 0.4) {
    return 'gemini-2.5-flash'
  }

  return 'gemini-2.5-pro' // Default to Pro for balanced performance
}

export function estimateGeminiTokens(content: string): number {
  // Gemini-specific token estimation (more accurate for Gemini models)
  // Gemini typically uses ~3.5 characters per token for English
  return Math.ceil(content.length / 3.5)
}

export function validateGeminiPromptLength(
  content: string,
  model: 'gemini-2.5-pro' | 'gemini-2.5-flash'
): boolean {
  const estimatedTokens = estimateGeminiTokens(content)
  const maxTokens = model === 'gemini-2.5-pro' ? 2000000 : 1000000
  
  return estimatedTokens <= maxTokens * 0.7 // Leave 30% buffer for response and context
}

export function preprocessGeminiContent(content: string): string {
  // Gemini-optimized content preprocessing
  return content
    .replace(/\n{3,}/g, '\n\n') // Normalize excessive newlines
    .replace(/\s{2,}/g, ' ') // Normalize spaces
    .replace(/[^\x00-\x7F]/g, (char) => char) // Keep Unicode (Gemini handles it well)
    .trim()
}

export function chunkGeminiContent(
  content: string,
  model: 'gemini-2.5-pro' | 'gemini-2.5-flash'
): string[] {
  const maxTokens = model === 'gemini-2.5-pro' ? 400000 : 200000 // Conservative chunking
  const maxChars = maxTokens * 3 // Conservative character estimate
  
  if (content.length <= maxChars) {
    return [content]
  }
  
  // Intelligent chunking that preserves semantic boundaries
  const chunks: string[] = []
  const sections = content.split(/\n\n(?=[A-Z]|\d+\.|\*|\-)/g) // Split on likely section boundaries
  
  let currentChunk = ''
  
  for (const section of sections) {
    if ((currentChunk + section).length <= maxChars) {
      currentChunk += (currentChunk ? '\n\n' : '') + section
    } else {
      if (currentChunk) {
        chunks.push(currentChunk)
        currentChunk = section
      } else {
        // Section too long, split more aggressively
        const sentences = section.match(/[^.!?]+[.!?]+/g) || [section]
        for (const sentence of sentences) {
          if ((currentChunk + sentence).length <= maxChars) {
            currentChunk += sentence
          } else {
            if (currentChunk) chunks.push(currentChunk)
            currentChunk = sentence
          }
        }
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk)
  }
  
  return chunks
}