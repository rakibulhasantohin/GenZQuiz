import { GoogleGenAI, Type } from "@google/genai";
import { Question } from "../types";
import { CATEGORIES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateQuizQuestions(category: string, count: number = 5): Promise<Partial<Question>[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API Key missing. Please check your environment variables.');
  }

  const categoryObj = CATEGORIES.find(c => c.id === category);
  const categoryName = categoryObj ? categoryObj.nameBn : category;

  const prompt = `You are an expert educational content creator for Bangladesh. 
  Generate ${count} high-quality, fact-based multiple-choice questions in Bangla for the category "${categoryName}".
  
  STRICT GUIDELINES:
  1. Language: Use clear, standard, and educational Bangla (Unicode).
  2. Structure: Exactly 4 options (optionA, optionB, optionC, optionD).
  3. Correct Answer: Exactly 1 correct answer (must be "A", "B", "C", or "D").
  4. Options: Avoid duplicate options. Options must be distinct and plausible.
  5. Explanation: Provide a short, informative explanation in Bangla (max 200 characters).
  6. Quality: Avoid vague or trick questions. Focus on educational value and accuracy.
  7. Metadata: 
     - topic: A specific sub-topic within ${categoryName}.
     - difficulty: Assign "easy", "medium", or "hard" based on the complexity.
     - tags: 3 relevant keywords in Bangla.
  8. Format: Return ONLY a JSON array of objects.
  
  Category Context: ${categoryName}
  
  Desired JSON Schema per object:
  {
    "questionText": "string",
    "optionA": "string",
    "optionB": "string",
    "optionC": "string",
    "optionD": "string",
    "correctAnswer": "A|B|C|D",
    "explanation": "string",
    "topic": "string",
    "difficulty": "easy|medium|hard",
    "tags": ["string", "string", "string"]
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              questionText: { type: Type.STRING },
              optionA: { type: Type.STRING },
              optionB: { type: Type.STRING },
              optionC: { type: Type.STRING },
              optionD: { type: Type.STRING },
              correctAnswer: { type: Type.STRING, enum: ["A", "B", "C", "D"] },
              explanation: { type: Type.STRING },
              topic: { type: Type.STRING },
              difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["questionText", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "explanation", "topic", "difficulty", "tags"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error('Empty response from AI model');
    
    const generated = JSON.parse(text);
    return generated.map((q: any) => ({
      ...q,
      category,
      language: 'bn',
      sourceType: 'ai',
      approved: false,
      createdAt: new Date().toISOString()
    }));
  } catch (error: any) {
    console.error("Error generating questions:", error);
    throw error; // Rethrow to be handled by AdminPage
  }
}

export async function generateSingleAIQuestion(): Promise<Partial<Question> | null> {
  const prompt = `You are an expert quiz master. 
  Generate ONE high-quality multiple-choice question in Bangla on any interesting topic (General Knowledge, Science, History, etc.).
  
  STRICT GUIDELINES:
  1. Language: Use clear, standard Bangla (Unicode).
  2. Structure: Exactly 4 options (optionA, optionB, optionC, optionD).
  3. Correct Answer: Exactly 1 correct answer (must be "A", "B", "C", or "D").
  4. Explanation: Provide a short, informative explanation in Bangla.
  5. Format: Return ONLY a JSON object.
  
  JSON Schema:
  {
    "questionText": "string",
    "optionA": "string",
    "optionB": "string",
    "optionC": "string",
    "optionD": "string",
    "correctAnswer": "A|B|C|D",
    "explanation": "string",
    "topic": "string",
    "difficulty": "easy|medium|hard"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questionText: { type: Type.STRING },
            optionA: { type: Type.STRING },
            optionB: { type: Type.STRING },
            optionC: { type: Type.STRING },
            optionD: { type: Type.STRING },
            correctAnswer: { type: Type.STRING, enum: ["A", "B", "C", "D"] },
            explanation: { type: Type.STRING },
            topic: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ["easy", "medium", "hard"] }
          },
          required: ["questionText", "optionA", "optionB", "optionC", "optionD", "correctAnswer", "explanation", "topic", "difficulty"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const generated = JSON.parse(text);
    return {
      ...generated,
      category: 'ai-challenge',
      language: 'bn',
      sourceType: 'ai',
      approved: true,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error generating single question:", error);
    return null;
  }
}
