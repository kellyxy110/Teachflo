"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Clock, ChevronRight, CheckCircle2, XCircle, Brain,
  BarChart2, Zap, Loader2, AlertTriangle, Target,
} from "lucide-react";
import { MathText } from "@/components/ui/MathText";
import {
  submitQuestionResponse,
  getNextAdaptiveQuestion,
  completeAdaptiveExam,
} from "@/app/actions/exam-v2";

interface Question {
  id: string;
  number: number;
  stem: string;
  type: string;
  optionA?: string | null;
  optionB?: string | null;
  optionC?: string | null;
  optionD?: string | null;
  difficulty?: string | null;
  bloomLevel?: string | null;
  skillTag?: string | null;
  estimatedTime?: number | null;
  answered?: boolean;
}

interface ExamData {
  attemptId: string;
  examId: string;
  title: string;
  subject: string;
  topic: string;
  mode: string;
  studentName: string;
  totalQuestions: number;
  questionsAnswered: number;
  currentDifficulty: string | null;
  questions: Question[];
  isAdaptive: boolean;
}

interface ResponseResult {
  isCorrect: boolean | null;
  correctOption: string | null;
  explanation: string;
  solution: string;
  misconception: { errorType: string; misconception: string; feedback: string } | null;
  newDifficulty: string;
  questionsAnswered: number;
}

export function ExamTaker({ exam }: { exam: ExamData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [result, setResult] = useState<ResponseResult | null>(null);
  const [answered, setAnswered] = useState(exam.questionsAnswered);
  const [questions, setQuestions] = useState<Question[]>(exam.questions);
  const [currentAdaptive, setCurrentAdaptive] = useState<Question | null>(null);
  const [difficulty, setDifficulty] = useState(exam.currentDifficulty || "medium");
  const [isFinishing, setIsFinishing] = useState(false);
  const [loadingNext, setLoadingNext] = useState(false);
  const timerRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const isAdaptive = exam.isAdaptive;
  const total = exam.totalQuestions;
  const currentQ = isAdaptive ? currentAdaptive : questions[currentIndex];
  const isLastQuestion = answered >= total - 1;
  const showHints = exam.mode === "PRACTICE";

  useEffect(() => {
    if (isAdaptive && !currentAdaptive) {
      fetchNextAdaptive();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    timerRef.current = 0;
    setElapsed(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      timerRef.current += 1;
      setElapsed(timerRef.current);
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [currentIndex, currentAdaptive?.id]);

  async function fetchNextAdaptive() {
    setLoadingNext(true);
    try {
      const next = await getNextAdaptiveQuestion(exam.attemptId);
      if (next.done) {
        await finishExam();
        return;
      }
      if (next.question) {
        setCurrentAdaptive(next.question as Question);
        setDifficulty(next.currentDifficulty || "medium");
      }
    } catch (e) {
      console.error("Failed to fetch next question:", e);
    } finally {
      setLoadingNext(false);
    }
  }

  function handleSubmitAnswer() {
    if (!currentQ) return;
    const qId = currentQ.id;
    const time = timerRef.current;

    startTransition(async () => {
      try {
        const res = await submitQuestionResponse({
          attemptId: exam.attemptId,
          questionId: qId,
          selectedOption: selectedOption ?? undefined,
          textResponse: textAnswer || undefined,
          timeSpentSeconds: time,
        });
        setResult(res);
        setAnswered(res.questionsAnswered);
        setDifficulty(res.newDifficulty);
      } catch (e) {
        console.error("Submit failed:", e);
      }
    });
  }

  function handleNext() {
    setResult(null);
    setSelectedOption(null);
    setTextAnswer("");

    if (isAdaptive) {
      setCurrentAdaptive(null);
      if (answered >= total) {
        finishExam();
      } else {
        fetchNextAdaptive();
      }
    } else {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        finishExam();
      }
    }
  }

  async function finishExam() {
    setIsFinishing(true);
    try {
      await completeAdaptiveExam(exam.attemptId);
      router.push(`/exams/v2/${exam.attemptId}/results`);
    } catch (e) {
      console.error("Finish failed:", e);
      setIsFinishing(false);
    }
  }

  if (isFinishing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 size={40} className="animate-spin text-primary" />
        <p className="text-lg font-semibold text-text">Computing analytics...</p>
        <p className="text-sm text-text-2">Updating skill graph and generating your report.</p>
      </div>
    );
  }

  if (loadingNext || (isAdaptive && !currentQ)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Brain size={40} className="text-primary animate-pulse" />
        <p className="text-lg font-semibold text-text">Generating next question...</p>
        <p className="text-sm text-text-2">
          Adapting to your performance — difficulty: <span className="font-bold text-primary">{difficulty}</span>
        </p>
      </div>
    );
  }

  if (!currentQ) {
    return <div className="text-center py-20 text-text-2">No questions available.</div>;
  }

  const options = [
    { key: "A", text: currentQ.optionA },
    { key: "B", text: currentQ.optionB },
    { key: "C", text: currentQ.optionC },
    { key: "D", text: currentQ.optionD },
  ].filter((o) => o.text);

  const isMCQ = currentQ.type === "MCQ" && options.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-text">{exam.title}</h1>
          <p className="text-xs text-text-2">
            {exam.studentName} · {exam.subject} · {exam.topic}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdaptive && (
            <span
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: difficulty === "hard" ? "#dc262615" : difficulty === "easy" ? "#16a34a15" : "#3b82f615",
                color: difficulty === "hard" ? "#dc2626" : difficulty === "easy" ? "#16a34a" : "#3b82f6",
              }}
            >
              {difficulty.toUpperCase()}
            </span>
          )}
          <span className="text-xs text-text-2 font-mono flex items-center gap-1">
            <Clock size={12} />
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-text-2 mb-1">
          <span>Question {answered + 1} of {total}</span>
          <span>{Math.round((answered / total) * 100)}% complete</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(answered / total) * 100}%`, background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }}
          />
        </div>
      </div>

      {/* Question metadata */}
      <div className="flex items-center gap-2 flex-wrap">
        {currentQ.skillTag && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-primary-50 text-primary font-medium">
            {currentQ.skillTag}
          </span>
        )}
        {currentQ.bloomLevel && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-waec/10 text-waec font-medium">
            {currentQ.bloomLevel}
          </span>
        )}
        {currentQ.difficulty && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-muted/10 text-muted font-medium">
            {currentQ.difficulty}
          </span>
        )}
      </div>

      {/* Question stem */}
      <div className="p-6 rounded-xl bg-surface border border-border">
        <div className="text-base font-semibold text-text leading-relaxed whitespace-pre-wrap">
          <MathText text={currentQ.stem} />
        </div>
      </div>

      {/* Answer area */}
      {!result ? (
        <div className="space-y-4">
          {isMCQ ? (
            <div className="space-y-3">
              {options.map(({ key, text }) => (
                <button
                  key={key}
                  onClick={() => setSelectedOption(key)}
                  disabled={isPending}
                  className={`w-full p-4 rounded-xl border text-left text-sm transition-all ${
                    selectedOption === key
                      ? "border-primary bg-primary-50 ring-2 ring-primary/30"
                      : "border-border hover:border-primary-100 bg-surface"
                  }`}
                >
                  <span className="font-bold text-primary mr-3">{key}.</span>
                  <MathText text={text!} className="text-text" />
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              rows={5}
              placeholder="Write your answer here..."
              className="w-full p-4 rounded-xl border border-border bg-surface text-text text-sm resize-y"
            />
          )}

          <button
            onClick={handleSubmitAnswer}
            disabled={isPending || (isMCQ && !selectedOption) || (!isMCQ && !textAnswer.trim())}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary-600 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <><Loader2 size={18} className="animate-spin" /> Grading...</>
            ) : (
              <><Target size={18} /> Submit Answer</>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Result card */}
          <div
            className={`p-5 rounded-xl border ${
              result.isCorrect
                ? "bg-success-50 border-success/30"
                : "bg-danger-50 border-danger/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {result.isCorrect ? (
                <><CheckCircle2 size={20} className="text-success" /><span className="font-bold text-success">Correct!</span></>
              ) : (
                <><XCircle size={20} className="text-danger" /><span className="font-bold text-danger">Incorrect</span></>
              )}
            </div>

            {!result.isCorrect && result.correctOption && (
              <p className="text-sm text-text mb-2">
                Correct answer: <span className="font-bold">{result.correctOption}</span>
              </p>
            )}

            <p className="text-sm text-text-2">{result.explanation}</p>

            {result.solution && result.solution !== result.explanation && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-semibold text-text-2 mb-1">Solution:</p>
                <p className="text-sm text-text-2 whitespace-pre-wrap">{result.solution}</p>
              </div>
            )}
          </div>

          {/* Misconception feedback */}
          {result.misconception && (
            <div className="p-4 rounded-xl bg-warning-50 border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-warning" />
                <span className="font-bold text-sm text-warning">
                  Error type: {result.misconception.errorType.replace("_", " ")}
                </span>
              </div>
              <p className="text-sm text-text-2 mb-1">{result.misconception.misconception}</p>
              <p className="text-sm text-text-2 italic">{result.misconception.feedback}</p>
            </div>
          )}

          {/* Difficulty change indicator */}
          {isAdaptive && result.newDifficulty !== difficulty && (
            <div className="p-3 rounded-lg bg-primary-50 border border-primary-100 text-sm flex items-center gap-2">
              <Zap size={14} className="text-primary" />
              <span className="text-text-2">
                Difficulty adjusted: <span className="font-bold text-primary">{result.newDifficulty}</span>
              </span>
            </div>
          )}

          {/* Next / Finish button */}
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary-600 transition-colors"
          >
            {answered >= total ? (
              <><BarChart2 size={18} /> View Results</>
            ) : (
              <><ChevronRight size={18} /> Next Question</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
