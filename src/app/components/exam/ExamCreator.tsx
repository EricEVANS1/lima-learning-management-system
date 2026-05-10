import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { AppModal } from '../ui/AppModal';
import { API_BASE_URL } from '../../../utils/supabase-client';
import { Button } from '../ui/button';

type QuestionType =
  | 'mcq'
  | 'multiple_correct'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'essay'
  | 'file_upload';

interface Question {
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer: number;
  correctAnswers?: number[];
  correctText?: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface ExamCreatorProps {
  onClose: () => void;
  examToEdit?: {
    id: string;
    title: string;
    subjectId: string;
    duration: number;
    startDate: string;
    endDate: string;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    questions: Question[];
  } | null;
}

const emptyQuestion = (): Question => ({
  type: 'mcq',
  question: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  correctAnswers: [],
  correctText: '',
  marks: 1,
  difficulty: 'medium',
});

export const ExamCreator: React.FC<ExamCreatorProps> = ({ onClose, examToEdit }) => {
  const { accessToken, user } = useAuth();
  const isEditMode = !!examToEdit;

  const [subjects, setSubjects] = useState<any[]>([]);
  const [examData, setExamData] = useState({
    title: examToEdit?.title || '',
    subjectId: examToEdit?.subjectId || '',
    duration: examToEdit?.duration || 60,
    startDate: examToEdit?.startDate ? examToEdit.startDate.slice(0, 16) : '',
    endDate: examToEdit?.endDate ? examToEdit.endDate.slice(0, 16) : '',
    shuffleQuestions: examToEdit?.shuffleQuestions || false,
    shuffleOptions: examToEdit?.shuffleOptions || false,
  });

  const [questions, setQuestions] = useState<Question[]>(
    (examToEdit?.questions || []).map((q: any) => ({
      type: q.type || 'mcq',
      question: q.question || '',
      options: q.options || ['', '', '', ''],
      correctAnswer: q.correctAnswer ?? 0,
      correctAnswers: q.correctAnswers || [],
      correctText: q.correctText || '',
      marks: q.marks || 1,
      difficulty: q.difficulty || 'medium',
    }))
  );

  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question>(emptyQuestion());

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/subjects`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        const allSubjects = data.subjects || [];

if (user?.role === 'teacher') {
  setSubjects(
    allSubjects.filter(
      (subject: any) => subject.teacher_id === user.id
    )
  );
} else {
  setSubjects(allSubjects);
}
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const resetQuestionForm = () => {
    setEditingQuestionIndex(null);
    setCurrentQuestion(emptyQuestion());
  };

  const updateQuestionType = (type: QuestionType) => {
    if (type === 'true_false') {
      setCurrentQuestion({
        ...currentQuestion,
        type,
        options: ['True', 'False'],
        correctAnswer: 0,
        correctAnswers: [],
        correctText: '',
      });
      return;
    }

    if (type === 'essay' || type === 'file_upload' || type === 'short_answer') {
      setCurrentQuestion({
        ...currentQuestion,
        type,
        options: [],
        correctAnswer: 0,
        correctAnswers: [],
        correctText: '',
      });
      return;
    }

    if (type === 'fill_blank') {
      setCurrentQuestion({
        ...currentQuestion,
        type,
        options: [],
        correctAnswer: 0,
        correctAnswers: [],
        correctText: '',
      });
      return;
    }

    setCurrentQuestion({
      ...currentQuestion,
      type,
      options: currentQuestion.options.length ? currentQuestion.options : ['', '', '', ''],
      correctAnswer: 0,
      correctAnswers: [],
      correctText: '',
    });
  };

  const validateQuestion = (q: Question) => {
    if (!q.question.trim()) {
      toast.error('Please enter the question text');
      return false;
    }

    if (!q.marks || q.marks < 1) {
      toast.error('Marks must be at least 1');
      return false;
    }

    if (q.type === 'mcq' || q.type === 'multiple_correct') {
      if (q.options.length < 2 || !q.options.every((opt) => opt.trim())) {
        toast.error('Please fill all answer options');
        return false;
      }
    }

    if (q.type === 'multiple_correct') {
      if (!q.correctAnswers || q.correctAnswers.length === 0) {
        toast.error('Select at least one correct answer');
        return false;
      }
    }

    if (q.type === 'fill_blank') {
      if (!q.correctText?.trim()) {
        toast.error('Please provide the correct fill-in-the-blank answer');
        return false;
      }
    }

    return true;
  };

  const startEditQuestion = (index: number) => {
    const q = questions[index];
    setEditingQuestionIndex(index);
    setCurrentQuestion({
      ...q,
      options: [...(q.options || [])],
      correctAnswers: [...(q.correctAnswers || [])],
    });
  };

  const saveEditedQuestion = () => {
    if (!validateQuestion(currentQuestion)) return;

    const updated = [...questions];
    updated[editingQuestionIndex!] = currentQuestion;
    setQuestions(updated);
    resetQuestionForm();
    toast.success('Question updated');
  };

  const cancelEditQuestion = () => {
    resetQuestionForm();
  };

  const addQuestion = () => {
    if (!validateQuestion(currentQuestion)) return;

    setQuestions([...questions, currentQuestion]);
    resetQuestionForm();
    toast.success('Question added successfully');
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const toggleCorrectAnswer = (index: number) => {
    const selected = currentQuestion.correctAnswers || [];

    if (selected.includes(index)) {
      setCurrentQuestion({
        ...currentQuestion,
        correctAnswers: selected.filter((i) => i !== index),
      });
    } else {
      setCurrentQuestion({
        ...currentQuestion,
        correctAnswers: [...selected, index],
      });
    }
  };

  const addOption = () => {
    setCurrentQuestion({
      ...currentQuestion,
      options: [...currentQuestion.options, ''],
    });
  };

  const removeOption = (index: number) => {
    const updatedOptions = currentQuestion.options.filter((_, i) => i !== index);
    const updatedCorrectAnswers = (currentQuestion.correctAnswers || [])
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i));

    setCurrentQuestion({
      ...currentQuestion,
      options: updatedOptions,
      correctAnswers: updatedCorrectAnswers,
      correctAnswer:
        currentQuestion.correctAnswer === index
          ? 0
          : currentQuestion.correctAnswer > index
          ? currentQuestion.correctAnswer - 1
          : currentQuestion.correctAnswer,
    });
  };

  const saveExam = async () => {
    if (!examData.title || !examData.subjectId || questions.length === 0) {
      toast.error('Please fill all exam details and add at least one question');
      return;
    }

    if (!examData.startDate || !examData.endDate) {
      toast.error('Please select start and end date/time');
      return;
    }

    if (new Date(examData.endDate) <= new Date(examData.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    try {
      const url = isEditMode
        ? `${API_BASE_URL}/exams/${examToEdit!.id}`
        : `${API_BASE_URL}/exams`;

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...examData,
          startDate: new Date(examData.startDate).toISOString(),
          endDate: new Date(examData.endDate).toISOString(),
          questions,
        }),
      });

      if (response.ok) {
        toast.success(isEditMode ? 'Exam updated successfully!' : 'Exam created successfully!');
        onClose();
      } else {
        const data = await response.json();
        toast.error(data.error || (isEditMode ? 'Failed to update exam' : 'Failed to create exam'));
      }
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update exam' : 'Failed to create exam');
    }
  };

  const renderQuestionAnswerFields = () => {
    if (currentQuestion.type === 'essay') {
      return (
        <div className="p-3 rounded-lg bg-background border border-border text-sm text-muted-foreground">
          Essay questions will be manually graded by the teacher.
        </div>
      );
    }

    if (currentQuestion.type === 'short_answer') {
      return (
        <div className="p-3 rounded-lg bg-background border border-border text-sm text-muted-foreground">
          Short answers will be manually graded by the teacher.
        </div>
      );
    }

    if (currentQuestion.type === 'file_upload') {
      return (
        <div className="p-3 rounded-lg bg-background border border-border text-sm text-muted-foreground">
          Students will upload a file. The teacher will manually grade it.
        </div>
      );
    }

    if (currentQuestion.type === 'fill_blank') {
      return (
        <div>
          <label className="block text-sm font-medium mb-2">Correct Answer</label>
          <input
            type="text"
            value={currentQuestion.correctText || ''}
            onChange={(e) =>
              setCurrentQuestion({ ...currentQuestion, correctText: e.target.value })
            }
            className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Correct answer for the blank"
          />
        </div>
      );
    }

    return (
      <>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">Options</label>
            {currentQuestion.type !== 'true_false' && (
              <Button type="button" variant="secondary" onClick={addOption}>
                <Plus className="mr-2" size={16} />
                Add Option
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="space-y-2">
                <label className="block text-sm font-medium">
                  Option {String.fromCharCode(65 + index)}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    disabled={currentQuestion.type === 'true_false'}
                    onChange={(e) => {
                      const newOptions = [...currentQuestion.options];
                      newOptions[index] = e.target.value;
                      setCurrentQuestion({ ...currentQuestion, options: newOptions });
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70"
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  />

                  {currentQuestion.type !== 'true_false' && currentQuestion.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {currentQuestion.type === 'multiple_correct' ? (
          <div>
            <label className="block text-sm font-medium mb-2">
              Correct Answers
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {currentQuestion.options.map((_, index) => (
                <label
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={(currentQuestion.correctAnswers || []).includes(index)}
                    onChange={() => toggleCorrectAnswer(index)}
                  />
                  <span>Option {String.fromCharCode(65 + index)}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-2">Correct Answer</label>
            <select
              value={currentQuestion.correctAnswer}
              onChange={(e) =>
                setCurrentQuestion({ ...currentQuestion, correctAnswer: parseInt(e.target.value) })
              }
              className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {currentQuestion.options.map((_, index) => (
                <option key={index} value={index}>
                  Option {String.fromCharCode(65 + index)}
                </option>
              ))}
            </select>
          </div>
        )}
      </>
    );
  };

  const questionTypeLabel = (type: QuestionType) => {
    const labels: Record<QuestionType, string> = {
      mcq: 'Multiple Choice',
      multiple_correct: 'Multiple Correct',
      true_false: 'True / False',
      fill_blank: 'Fill Blank',
      short_answer: 'Short Answer',
      essay: 'Essay',
      file_upload: 'File Upload',
    };

    return labels[type];
  };

  const correctAnswerPreview = (q: Question) => {
    if (q.type === 'multiple_correct') {
      return (q.correctAnswers || [])
        .map((i) => String.fromCharCode(65 + i))
        .join(', ');
    }

    if (q.type === 'fill_blank') return q.correctText || '-';

    if (['essay', 'short_answer', 'file_upload'].includes(q.type)) {
      return 'Manual grading';
    }

    return String.fromCharCode(65 + q.correctAnswer);
  };

return (
  <AppModal
    title={isEditMode ? 'Edit Exam' : 'Create New Exam'}
    subtitle="Build exams with multiple question types, grading rules, and shuffle options."
    onClose={onClose}
    maxWidth="max-w-5xl"
  >
    <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Exam Title</label>
              <input
                type="text"
                value={examData.title}
                onChange={(e) => setExamData({ ...examData, title: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Final Exam - Mathematics"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <select
                value={examData.subjectId}
                onChange={(e) => setExamData({ ...examData, subjectId: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
              <input
                type="number"
                value={examData.duration}
                onChange={(e) =>
                  setExamData({ ...examData, duration: parseInt(e.target.value) || 1 })
                }
                className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Start Date & Time</label>
              <input
                type="datetime-local"
                value={examData.startDate}
                onChange={(e) => setExamData({ ...examData, startDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End Date & Time</label>
              <input
                type="datetime-local"
                value={examData.endDate}
                onChange={(e) => setExamData({ ...examData, endDate: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={examData.shuffleQuestions}
                  onChange={(e) =>
                    setExamData({ ...examData, shuffleQuestions: e.target.checked })
                  }
                />
                <span className="text-sm font-medium">Shuffle questions</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={examData.shuffleOptions}
                  onChange={(e) =>
                    setExamData({ ...examData, shuffleOptions: e.target.checked })
                  }
                />
                <span className="text-sm font-medium">Shuffle options</span>
              </label>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingQuestionIndex !== null
                ? `Editing Question ${editingQuestionIndex + 1}`
                : 'Add Question'}
            </h3>

            <div className="space-y-4 bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Question Type</label>
                  <select
                    value={currentQuestion.type}
                    onChange={(e) => updateQuestionType(e.target.value as QuestionType)}
                    className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="mcq">Multiple Choice</option>
                    <option value="multiple_correct">Multiple Correct</option>
                    <option value="true_false">True / False</option>
                    <option value="fill_blank">Fill Blank</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="essay">Essay</option>
                    <option value="file_upload">File Upload</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Marks</label>
                  <input
                    type="number"
                    value={currentQuestion.marks}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        marks: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty</label>
                  <select
                    value={currentQuestion.difficulty}
                    onChange={(e) =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        difficulty: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Question</label>
                <textarea
                  value={currentQuestion.question}
                  onChange={(e) =>
                    setCurrentQuestion({ ...currentQuestion, question: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-input bg-input-background focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={2}
                  placeholder="Enter your question here..."
                />
              </div>

              {renderQuestionAnswerFields()}

              {editingQuestionIndex !== null ? (
                <div className="flex gap-2">
                  <Button onClick={saveEditedQuestion} variant="primary" className="flex-1">
                    Save Changes
                  </Button>
                  <Button onClick={cancelEditQuestion} variant="secondary" className="flex-1">
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button onClick={addQuestion} variant="secondary" className="w-full">
                  <Plus className="mr-2" size={20} />
                  Add Question
                </Button>
              )}
            </div>
          </div>

          {questions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Questions ({questions.length})</h3>
              <div className="space-y-3">
                {questions.map((q, index) => (
                  <div key={index} className="flex items-start justify-between bg-muted p-4 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium mb-2">
                        {index + 1}. {q.question}
                      </p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Type: {questionTypeLabel(q.type)}</p>
                        <p>Correct: {correctAnswerPreview(q)}</p>
                        <p>
                          Marks: {q.marks} | Difficulty: {q.difficulty}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => startEditQuestion(index)}
                        className="p-2 hover:bg-primary/10 text-primary rounded-lg"
                        title="Edit question"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => removeQuestion(index)}
                        className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"
                        title="Remove question"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={saveExam} variant="primary" className="flex-1">
              {isEditMode ? 'Save Changes' : 'Create Exam'}
            </Button>
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
          
  </AppModal>
);
  
};