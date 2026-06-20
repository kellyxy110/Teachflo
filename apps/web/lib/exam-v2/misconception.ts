import { routedChat } from "@/lib/ai/router";
import type { MisconceptionResult, ErrorType } from "./types";

export async function detectMisconception(params: {
  questionStem: string;
  correctAnswer: string;
  studentAnswer: string;
  subject: string;
  topic: string;
  explanation: string;
}): Promise<MisconceptionResult> {
  try {
    const response = await routedChat({
      message: `Analyze this student's wrong answer and classify the error.

Subject: ${params.subject}
Topic: ${params.topic}

Question: ${params.questionStem}
Correct answer: ${params.correctAnswer}
Student's answer: ${params.studentAnswer}
Expected explanation: ${params.explanation}

Return ONLY a JSON object:
{
  "errorType": "conceptual | calculation | misinterpretation | missing_prerequisite",
  "misconception": "one sentence describing the specific misconception",
  "feedback": "2-3 sentence constructive feedback for the student",
  "prerequisiteGap": "if errorType is missing_prerequisite, name the prerequisite skill, otherwise null"
}`,
      systemPrompt:
        "You are a diagnostic assessment specialist for Nigerian secondary schools. Analyze student errors precisely. Return ONLY valid JSON, no markdown.",
    });

    const raw = response.content.replace(/```json?\n?|\n?```/g, "").trim();
    const result = JSON.parse(raw);

    const validTypes: ErrorType[] = ["conceptual", "calculation", "misinterpretation", "missing_prerequisite"];

    return {
      errorType: validTypes.includes(result.errorType) ? result.errorType : "conceptual",
      misconception: String(result.misconception || "Unknown error pattern"),
      feedback: String(result.feedback || "Review this topic and try again."),
      prerequisiteGap: result.prerequisiteGap ? String(result.prerequisiteGap) : undefined,
    };
  } catch {
    return {
      errorType: "conceptual",
      misconception: "Unable to classify error — review the correct answer.",
      feedback: "Compare your answer with the correct answer and identify the difference.",
    };
  }
}
