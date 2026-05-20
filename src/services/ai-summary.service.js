import { ChatMistralAI } from "@langchain/mistralai";
import { Config } from '../config/config.js';

const llm = new ChatMistralAI({
    model: "mistral-large-latest",
    temperature: 0.7,
    maxRetries: 2,
    apiKey: Config.MISTRAL_API_KEY
});

export const generateIncidentSummary = async (incidentData) => {
    try {
        const durationMinutes = Math.round(incidentData.duration / 60000);
        
        const prompt = `Website: ${incidentData.websiteName}
Downtime Duration: ${durationMinutes} minutes
Error Type: ${incidentData.errorType}
Recovered Successfully

Generate a short, professional incident summary in 2-4 lines explaining what happened.`;

        const result = await llm.invoke([
            ["human", prompt]
        ]);

        const summary = result.content;

        if (!summary || summary.trim() === '') {
            console.warn(`AI: Empty summary returned for ${incidentData.websiteName}`);
            return 'AI summary unavailable';
        }

        console.log(`AI: Summary generated successfully for ${incidentData.websiteName}`);
        return summary;

    } catch (error) {
        console.error(`AI: Failed to generate summary - ${error.message}`);
        return 'AI summary unavailable';
    }
};