import axios from 'axios'
import { env } from '../config/env'
import { logger } from '../utils/logger'

interface AIExplainerInput {
  compositeScore:       number
  decision:             string
  loanProduct:          string
  requestedAmountPaise: number
  dimensions:           Record<string, any>
  inputData:            Record<string, any>
}

interface AIExplainerOutput {
  summary:      string
  strengths:    string[]
  weaknesses:   string[]
  riskFlags:    string[]
  lenderNotes:  string
}

export async function runAIExplainer(input: AIExplainerInput): Promise<AIExplainerOutput> {
  const prompt = `
    You are an expert underwriter and AI financial analyst. 
    Analyze the following loan scorecard and provide a summary for the lender.

    Input Data:
    - Composite Score: ${input.compositeScore} / 1000
    - Decision: ${input.decision}
    - Loan Product: ${input.loanProduct}
    - Requested Amount: ₹${input.requestedAmountPaise / 100}
    - Total Assets: ₹${input.inputData.total_assets_paise / 100}
    - Net Worth: ₹${input.inputData.net_worth_paise / 100}
    - Monthly Income: ₹${input.inputData.monthly_income_paise / 100}
    - Existing EMI Burden: ₹${input.inputData.monthly_obligations_paise / 100}
    
    Dimension Scores (0-100):
    ${Object.entries(input.dimensions).map(([k, v]) => `- ${k}: ${v.score} (Warnings: ${v.warnings.join(', ') || 'None'})`).join('\n')}

    Based on this data, output a strict JSON object with exactly these keys:
    - "summary": string (1-2 paragraphs of overall underwriter summary)
    - "strengths": string[] (3-5 key financial strengths)
    - "weaknesses": string[] (2-4 key financial weaknesses or concerns)
    - "riskFlags": string[] (any critical risks to highlight, or empty if none)
    - "lenderNotes": string (specific actionable advice for the NBFC/Bank loan officer)
  `

  // Using axios to call Claude directly to avoid adding new SDK dependencies
  const anthropicApiKey = env.ANTHROPIC_API_KEY
  if (!anthropicApiKey) {
    logger.warn('No ANTHROPIC_API_KEY found, falling back to mock AI explainer')
    return getMockAIExplainer(input)
  }

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 1024,
        temperature: 0.2,
        system: "You are an expert loan underwriter AI. Always respond in valid JSON format.",
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    )

    const textContent = response.data.content[0].text
    // Extract JSON from response
    const jsonStr = textContent.substring(textContent.indexOf('{'), textContent.lastIndexOf('}') + 1)
    const result = JSON.parse(jsonStr)

    return {
      summary:      result.summary || 'AI Summary unavailable.',
      strengths:    result.strengths || [],
      weaknesses:   result.weaknesses || [],
      riskFlags:    result.riskFlags || [],
      lenderNotes:  result.lenderNotes || ''
    }
  } catch (error: any) {
    logger.error('AI Explainer Error', { error: error.message })
    return getMockAIExplainer(input)
  }
}

function getMockAIExplainer(input: AIExplainerInput): AIExplainerOutput {
  const isGood = input.compositeScore > 650
  return {
    summary: isGood 
      ? `The applicant demonstrates a strong financial profile with a composite score of ${input.compositeScore}. Their income and asset backing show sufficient capacity to service the requested ${input.loanProduct}.`
      : `The applicant presents notable risks with a composite score of ${input.compositeScore}. Further manual underwriting is recommended.`,
    strengths: [
      `Asset portfolio diversity is sufficient`,
      `Stable recent transaction history`
    ],
    weaknesses: isGood ? [] : [`High FOIR relative to available income`, `Low instant liquidity`],
    riskFlags: [],
    lenderNotes: `Auto-generated mock response. Please ensure manual verification of income sources.`
  }
}
