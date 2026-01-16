
import { GoogleGenAI } from "@google/genai";

// Always use { apiKey: process.env.API_KEY }
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const researchLocalMaterials = async (location: { lat: number, lng: number }, query: string) => {
  const ai = getAI();
  // Using 'gemini-3-flash-preview' for general tasks. 'gemini-2.5-flash' is not recommended.
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Find professional suppliers for ${query} near these coordinates: ${location.lat}, ${location.lng}. Focus on concrete mixes, pigments, sealers, and tools for countertop professionals.`,
    config: {
      tools: [{ googleMaps: {} }, { googleSearch: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: location.lat,
            longitude: location.lng
          }
        }
      }
    }
  });

  return {
    text: response.text || "No detailed report generated.",
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const getDesignAdvice = async (details: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    // Using 'gemini-3-pro-preview' for complex reasoning/coding tasks.
    model: "gemini-3-pro-preview",
    contents: `As an expert concrete artisan, provide technical advice for this countertop project: ${details}. Include mix design considerations, reinforcement (GFRC vs Rebar), and finishing tips.`,
  });
  return response.text || "No advice generated.";
};
