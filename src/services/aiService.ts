import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface GenerationResult {
  code: string;
  explanation: string;
}

export interface TestResult {
  passed: boolean;
  errors: string[];
  feedback: string;
}

export async function generateCode(prompt: string, context: string = ''): Promise<GenerationResult> {
  const systemInstruction = `You are a world-class Web Development AI Agent named Nexus.
Your goal is to write high-quality, production-ready React code using Tailwind CSS.
Provide the code in a markdown code block AND a brief explanation separate from the code.
If there is existing code, improve it based on the user's request.

Output format:
[EXPLANATION]
Your explanation here...
[CODE]
\`\`\`tsx
// your code here
\`\`\`
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: context ? `${context}\n\nUser: ${prompt}` : prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const text = response.text || '';
    
    const explanationMatch = text.match(/\[EXPLANATION\]([\s\S]*?)\[CODE\]/);
    const codeMatch = text.match(/\[CODE\]\s*?```(?:tsx|jsx|javascript|typescript|html|css)?([\s\S]*?)```/);

    return {
      explanation: explanationMatch ? explanationMatch[1].trim() : text.split('```')[0].trim(),
      code: codeMatch ? codeMatch[1].trim() : '',
    };
  } catch (error) {
    console.error("Generation Error:", error);
    throw error;
  }
}

export async function testCode(code: string, requirements: string): Promise<TestResult> {
  const systemInstruction = `You are a Senior QA Engineer. Your task is to test the provided code against the user's requirements.
Simulate a build and runtime check.
Output a JSON object with:
- passed: boolean
- errors: string[] (list of specific issues)
- feedback: string (overall summary)

Return ONLY valid JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Requirements: ${requirements}\n\nCode to test:\n${code}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || '{}') as TestResult;
  } catch (error) {
    console.error("Testing Error:", error);
    return {
      passed: false,
      errors: ["Failed to run test agent"],
      feedback: "The testing agent encountered an error."
    };
  }
}
