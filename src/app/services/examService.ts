import { apiRequest } from './api';

export const examService = {
  getExams: (token: string | null) =>
    apiRequest('/exams', token),

  getExamSubmissions: (token: string | null) =>
    apiRequest('/exam-submissions', token),

  startExam: (examId: string, token: string | null) =>
    apiRequest(`/exams/${examId}/start`, token, {
      method: 'POST',
    }),

  submitExam: (examId: string, answers: any[], token: string | null) =>
    apiRequest(`/exams/${examId}/submit`, token, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  saveProgress: (examId: string, answers: any[], token: string | null) =>
    apiRequest(`/exams/${examId}/progress`, token, {
      method: 'PUT',
      body: JSON.stringify({ answers }),
    }),

  deleteExam: (examId: string, token: string | null) =>
    apiRequest(`/exams/${examId}`, token, {
      method: 'DELETE',
    }),

  getExamResults: (examId: string, token: string | null) =>
    apiRequest(`/exams/${examId}/submissions`, token),

  saveManualExamGrade: (
    submissionId: string,
    payload: { manualScore: number; manualFeedback: string },
    token: string | null
  ) =>
    apiRequest(`/exam-submissions/${submissionId}/manual-grade`, token, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};