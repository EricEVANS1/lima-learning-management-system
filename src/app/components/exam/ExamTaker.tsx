import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Upload,
  File,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { examService } from '../../services/examService';
import { Button } from '../ui/button';

type QuestionType =
  | 'mcq'
  | 'multiple_correct'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'essay'
  | 'file_upload';

interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  startedAt?: string;
  deadline: string;
  submittedAt?: string | null;
  status: 'in_progress' | 'submitted' | 'expired';
  answers?: any[];
}

interface ExamTakerProps {
  exam: any;
  attempt: ExamAttempt | null;
  onExit: () => void;
}

export const ExamTaker: React.FC<ExamTakerProps> = ({ exam, attempt, onExit }) => {
  const { accessToken } = useAuth();

  const buildEmptyAnswers = () =>
    (exam.questions || []).map((q: any) => {
      if (q.type === 'multiple_correct') return [];
      if (q.type === 'fill_blank' || q.type === 'short_answer' || q.type === 'essay') return '';
      if (q.type === 'file_upload') return null;
      return -1;
    });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>(
    Array.isArray(attempt?.answers) && attempt.answers.length > 0
      ? attempt.answers
      : buildEmptyAnswers()
  );

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [submitted, setSubmitted] = useState(attempt?.status === 'submitted');
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!attempt?.deadline || submitted) return;

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(attempt.deadline).getTime() - Date.now()) / 1000)
      );

      setTimeRemaining(remaining);

      if (remaining <= 0 && !submitted && !submitting) {
        handleSubmit(true);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [attempt?.deadline, submitted, submitting]);

  useEffect(() => {
    if (!attempt?.id || submitted) return;

    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setInterval(() => {
      autosaveAnswers(false);
    }, 5000);

    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
      }
    };
  }, [attempt?.id, answers, submitted]);

const autosaveAnswers = async (showToast = true) => {
  if (!attempt?.id || submitted || saving) return;

  try {
    setSaving(true);

    await examService.saveProgress(exam.id, answers, accessToken);

    if (showToast) toast.success('Progress saved');
  } catch (error) {
    console.error('Autosave failed:', error);
  } finally {
    setSaving(false);
  }
};

  const updateAnswer = (value: any) => {
    const updated = [...answers];
    updated[currentQuestionIndex] = value;
    setAnswers(updated);
  };

  const toggleMultipleCorrectAnswer = (optionIndex: number) => {
    const current = Array.isArray(answers[currentQuestionIndex])
      ? answers[currentQuestionIndex]
      : [];

    if (current.includes(optionIndex)) {
      updateAnswer(current.filter((i: number) => i !== optionIndex));
    } else {
      updateAnswer([...current, optionIndex]);
    }
  };

  const uploadFileAnswer = async (file: File) => {
    if (!file || uploading) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to upload file');
        return;
      }

      updateAnswer({
        fileName: data.fileName,
        filePath: data.filePath || data.path,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });

      toast.success('File uploaded');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isAnswered = (answer: any) => {
    if (Array.isArray(answer)) return answer.length > 0;
    if (typeof answer === 'string') return answer.trim().length > 0;
    if (answer && typeof answer === 'object') return !!answer.filePath;
    return answer !== -1 && answer !== null && answer !== undefined;
  };

const handleSubmit = async (autoSubmit = false) => {
  if (submitted || submitting) return;

  try {
    setSubmitting(true);

    const data = await examService.submitExam(exam.id, answers, accessToken);

    setResult(data.submission);
    setSubmitted(true);

    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current);
    }

    if (autoSubmit) {
      toast.info('Time is up. Your exam was submitted automatically.');
    } else {
      toast.success('Exam submitted successfully');
    }
  } catch (error: any) {
    toast.error(error.message || 'Failed to submit exam');
  } finally {
    setSubmitting(false);
  }
};

  const renderAnswerInput = (question: any) => {
    const type: QuestionType = question.type || 'mcq';
    const answer = answers[currentQuestionIndex];

    if (type === 'mcq' || type === 'true_false') {
      return (
        <div className="space-y-3">
          {(question.options || []).map((option: string, index: number) => (
            <button
              key={index}
              onClick={() => updateAnswer(index)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                answer === index
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    answer === index ? 'border-primary bg-primary' : 'border-border'
                  }`}
                >
                  {answer === index && <div className="w-3 h-3 rounded-full bg-white" />}
                </div>

                <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>
      );
    }

    if (type === 'multiple_correct') {
      const selectedAnswers = Array.isArray(answer) ? answer : [];

      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Select all correct answers. Partial marks may be awarded.
          </p>

          {(question.options || []).map((option: string, index: number) => (
            <button
              key={index}
              onClick={() => toggleMultipleCorrectAnswer(index)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedAnswers.includes(index)
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                    selectedAnswers.includes(index)
                      ? 'border-primary bg-primary text-white'
                      : 'border-border'
                  }`}
                >
                  {selectedAnswers.includes(index) && '✓'}
                </div>

                <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>
      );
    }

    if (type === 'fill_blank') {
      return (
        <div>
          <input
            type="text"
            value={typeof answer === 'string' ? answer : ''}
            onChange={(e) => updateAnswer(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Type your answer..."
          />
        </div>
      );
    }

    if (type === 'short_answer') {
      return (
        <div>
          <textarea
            value={typeof answer === 'string' ? answer : ''}
            onChange={(e) => updateAnswer(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Type your short answer..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            This answer will be marked by your teacher.
          </p>
        </div>
      );
    }

    if (type === 'essay') {
      return (
        <div>
          <textarea
            value={typeof answer === 'string' ? answer : ''}
            onChange={(e) => updateAnswer(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Write your essay answer..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            This essay will be marked by your teacher.
          </p>
        </div>
      );
    }

    if (type === 'file_upload') {
      return (
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFileAnswer(file);
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-muted transition flex flex-col items-center gap-2 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="animate-spin text-primary" size={28} />
            ) : (
              <Upload className="text-primary" size={28} />
            )}
            <span className="font-medium">
              {uploading ? 'Uploading...' : 'Upload file answer'}
            </span>
            <span className="text-xs text-muted-foreground">
              Any file type is allowed
            </span>
          </button>

          {answer?.fileName && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
              <File size={18} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{answer.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  File uploaded successfully
                </p>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            This file will be marked by your teacher.
          </p>
        </div>
      );
    }

    return null;
  };

  if (!attempt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl border border-border p-8 w-full max-w-xl text-center">
          <h2 className="text-2xl font-bold mb-2">No active attempt</h2>
          <p className="text-muted-foreground mb-6">Please start the exam again.</p>
          <Button onClick={onExit} variant="primary" className="w-full">
            Back to Exams
          </Button>
        </div>
      </div>
    );
  }

  if (submitted && result) {
    const percentage = Number(result.percentage || 0);

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl border border-border p-8 w-full max-w-2xl text-center">
          <div className="mb-6">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-2">Exam Submitted!</h2>
            <p className="text-muted-foreground">
              Your exam has been submitted successfully.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Auto Score</p>
              <p className="text-2xl font-bold">
                {result.obtainedMarks ?? 0}/{result.totalMarks ?? 0}
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Auto Percentage</p>
              <p className="text-2xl font-bold">{Math.round(percentage)}%</p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Answered</p>
              <p className="text-2xl font-bold">
                {answers.filter(isAnswered).length}/{exam.questions.length}
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <p className="text-lg font-bold capitalize">
                {result.gradingStatus === 'pending_manual'
                  ? 'Pending manual grading'
                  : 'Auto graded'}
              </p>
            </div>
          </div>

          <Button onClick={onExit} variant="primary" className="w-full">
            Back to Exams
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const answeredCount = answers.filter(isAnswered).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-card border-b border-border px-6 py-4 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">{exam.title}</h2>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {exam.questions.length} · {answeredCount} answered
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => autosaveAnswers(true)}
              disabled={saving || submitted}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-accent text-sm disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save'}
            </button>

            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeRemaining < 300 ? 'bg-destructive/10 text-destructive' : 'bg-muted'
              }`}
            >
              <Clock size={20} />
              <span className="font-mono text-lg font-bold">{formatTime(timeRemaining)}</span>
            </div>

            <button
              onClick={() => {
                if (confirm('Exit exam? Your timer will continue, but your saved answers can be resumed.')) {
                  autosaveAnswers(false);
                  onExit();
                }
              }}
              className="p-2 hover:bg-accent rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-card rounded-xl border border-border p-8 mb-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                {currentQuestion.marks || 1}{' '}
                {(currentQuestion.marks || 1) === 1 ? 'mark' : 'marks'}
              </span>

              {currentQuestion.difficulty && (
                <span className="bg-muted px-3 py-1 rounded-full text-sm capitalize">
                  {currentQuestion.difficulty}
                </span>
              )}

              <span className="bg-muted px-3 py-1 rounded-full text-sm capitalize">
                {(currentQuestion.type || 'mcq').replace('_', ' ')}
              </span>
            </div>

            <h3 className="text-xl font-semibold">{currentQuestion.question}</h3>
          </div>

          {renderAnswerInput(currentQuestion)}
        </div>

        <div className="flex justify-between items-center gap-4">
          <Button
            variant="secondary"
            onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="mr-2" size={20} />
            Previous
          </Button>

          <div className="flex gap-2 flex-wrap justify-center">
            {exam.questions.map((_: any, index: number) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-10 h-10 rounded-lg font-medium transition-all ${
                  index === currentQuestionIndex
                    ? 'bg-primary text-primary-foreground'
                    : isAnswered(answers[index])
                    ? 'bg-green-500 text-white'
                    : 'bg-muted hover:bg-accent'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          {currentQuestionIndex < exam.questions.length - 1 ? (
            <Button
              variant="primary"
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
            >
              Next
              <ChevronRight className="ml-2" size={20} />
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={submitting || uploading}
              onClick={() => {
                if (confirm('Are you sure you want to submit the exam?')) {
                  handleSubmit();
                }
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};