
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async generateTechnicalDetails(productName: string, ingredients: string[]) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma descrição profissional, modo de preparo detalhado e tabela nutricional estimada para o produto "${productName}" que utiliza os seguintes ingredientes: ${ingredients.join(', ')}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: "Uma descrição apetitosa do produto" },
            instructions: { type: Type.STRING, description: "Passo a passo do modo de preparo" },
            nutrition: {
              type: Type.OBJECT,
              properties: {
                calories: { type: Type.NUMBER, description: "kcal por 100g" },
                carbs: { type: Type.NUMBER, description: "gramas por 100g" },
                protein: { type: Type.NUMBER, description: "gramas por 100g" },
                fats: { type: Type.NUMBER, description: "gramas por 100g" },
                fiber: { type: Type.NUMBER, description: "gramas por 100g" },
                sodium: { type: Type.NUMBER, description: "miligramas por 100g" }
              }
            }
          }
        }
      }
    });
    
    return JSON.parse(response.text);
  }
};
