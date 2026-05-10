import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();
const API = "/make-server-c7f19ddd";
const bucketName = "make-c7f19ddd-assignments";

app.use("*", logger(console.log));
app.use("/*", cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization"], allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], exposeHeaders: ["Content-Length"], maxAge: 600 }));

type Role = "admin" | "teacher" | "student";
type AuthCtx = { user: any; profile: any; supabase: any };

const db = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const now = () => new Date().toISOString();
const errMsg = (e: any) => e?.message || String(e);

const letterGrade = (score: number) => {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
};

// ================= API RESPONSE HELPERS =================

// Success response helper
const ok = (
  c: any,
  data: any = {},
  status = 200
) => c.json(
  {
    success: true,
    ...data,
  },
  status
);

// Error response helper
const fail = (
  c: any,
  message: string,
  status = 400,
  details: any = null
) =>
  c.json(
    {
      success: false,
      error: message,
      details,
    },
    status
  );

async function requireAuth(c: any): Promise<AuthCtx | Response> {
  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    return fail(c, "Unauthorized", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = db();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return fail(c, "Unauthorized", 401);
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id,name,role,student_number,disabled")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return fail(c, "Profile not found", 404);
  }

  if (profile.disabled) {
    return fail(c, "Account is disabled", 403);
  }

  return {
    user,
    profile: {
      ...profile,
      email: user.email,
    },
    supabase,
  };
}

function isAuthCtx(v: any): v is AuthCtx { return v && v.user && v.profile && v.supabase; }
function requireRole(
  c: any,
  auth: AuthCtx,
  roles: Role[]
) {
  if (!roles.includes(auth.profile.role)) {
    return fail(c, "Forbidden", 403);
  }

  return null;
}
async function getSubject(auth: AuthCtx, subjectId: string) {
  const { data } = await auth.supabase.from("subjects").select("*").eq("id", subjectId).single();
  return data;
}
async function isEnrolled(auth: AuthCtx, studentId: string, subjectId: string) {
  const { data } = await auth.supabase.from("enrollments").select("id").eq("student_id", studentId).eq("subject_id", subjectId).maybeSingle();
  return !!data;
}
function mapSubject(s: any) { return s ? { ...s, teacherId: s.teacher_id, createdAt: s.created_at, updatedAt: s.updated_at } : s; }
function mapEnrollment(e: any) { return e ? { ...e, studentId: e.student_id, subjectId: e.subject_id, assignedBy: e.assigned_by, enrolledAt: e.enrolled_at } : e; }
function mapAssignment(a: any) { return a ? { ...a, subjectId: a.subject_id, teacherId: a.teacher_id, dueDate: a.due_date, createdAt: a.created_at, updatedAt: a.updated_at } : a; }
function mapAssignmentSubmission(s: any) { return s ? { ...s, assignmentId: s.assignment_id, studentId: s.student_id, fileName: s.file_name, filePath: s.file_path, submittedAt: s.submitted_at, gradedAt: s.graded_at } : s; }
function mapExam(e: any) { return e ? { ...e, subjectId: e.subject_id, teacherId: e.teacher_id, startDate: e.start_date, endDate: e.end_date, createdAt: e.created_at, updatedAt: e.updated_at } : e; }
function mapExamAttempt(a: any) {
  return a ? {
    ...a,
    examId: a.exam_id,
    studentId: a.student_id,
    startedAt: a.started_at,
    submittedAt: a.submitted_at,
    obtainedMarks: a.obtained_marks,
    totalMarks: a.total_marks,
    updatedAt: a.updated_at,
  } : a;
}
function mapExamSubmission(s: any) { return s ? { ...s, examId: s.exam_id, studentId: s.student_id, obtainedMarks: s.obtained_marks, totalMarks: s.total_marks, submittedAt: s.submitted_at } : s; }
function mapGrade(g: any) {
  return g ? {
    ...g,
    studentId: g.student_id,
    studentName: g.student?.name || null,
    subjectId: g.subject_id,
    subjectName: g.subject?.name || null,
    subjectCode: g.subject?.code || null,
    teacherId: g.teacher_id,
    letterGrade: g.letter_grade,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
    gradeType: g.grade_type
  } : g;
}
function mapMessage(m: any) {
  return m ? {
    ...m,
    senderId: m.sender_id,
    recipientId: m.recipient_id,
    createdAt: m.created_at,
    deliveredAt: m.delivered_at,
    seenAt: m.seen_at,
    attachmentName: m.attachment_name,
    attachmentPath: m.attachment_path,
    attachmentType: m.attachment_type,
  } : m;
}
function mapNotification(n: any) { return n ? { ...n, userId: n.user_id, createdAt: n.created_at } : n; }

app.get(`${API}/health`, (c) =>
  ok(c, { status: "ok" })
);

// ================= AUTH / USERS =================
app.post(`${API}/auth/signup`, async (c) => {
  try {
    const { email, password, name, role = "student" } = await c.req.json();
    if (role === "admin") return c.json({ error: "Admin accounts cannot be self-created" }, 403);
    const supabase = db();
    const { data, error } = await supabase.auth.admin.createUser({ email, password, user_metadata: { name, role }, email_confirm: true });
    if (error) return c.json({ error: error.message }, 400);
    const student_number = role === "student" ? `STU-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}` : null;
    const { error: profileError } = await supabase.from("profiles").insert({ id: data.user.id, email, name, role, student_number, disabled: false });
    if (profileError) return c.json({ error: profileError.message }, 500);
    return c.json({ success: true, user: { id: data.user.id, email, name, role, student_number } });
  } catch (e) { return c.json({ error: "Signup failed: " + errMsg(e) }, 500); }
});

app.get(`${API}/auth/me`, async (c) => {
  const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
  return c.json({ user: auth.profile });
});

app.get(`${API}/users`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    const roleFilter = c.req.query("role");
    if (!["admin", "teacher"].includes(auth.profile.role)) return c.json({ error: "Forbidden" }, 403);
    let q = auth.supabase.from("profiles").select("id,name,role,student_number,disabled").order("name", { ascending: true });
    if (roleFilter) q = q.eq("role", roleFilter);
    const { data: profiles, error } = await q;
    if (error) return c.json({ error: error.message }, 500);
    const { data: authUsers } = await auth.supabase.auth.admin.listUsers();
    const byId = new Map((authUsers?.users || []).map((u: any) => [u.id, u.email]));
    const users = (profiles || []).map((p: any) => ({ ...p, email: byId.get(p.id) || "" }));
    return c.json({ users });
  } catch (e) { return c.json({ error: "Failed to get users: " + errMsg(e) }, 500); }
});

app.put(`${API}/auth/update-profile`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const { name } = await c.req.json();

    if (!name) {
      return c.json({ error: "Name is required" }, 400);
    }

    const { error } = await auth.supabase
      .from("profiles")
      .update({ name })
      .eq("id", auth.user.id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

// ================= SUBJECTS =================
app.get(`${API}/subjects`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    let query = auth.supabase.from("subjects").select("*, teacher:profiles!subjects_teacher_id_fkey(id,name,role)").order("created_at", { ascending: false });
    if (auth.profile.role === "teacher") query = query.eq("teacher_id", auth.user.id);
    const { data, error } = await query;
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ subjects: (data || []).map((s: any) => ({ ...mapSubject(s), teacherName: s.teacher?.name || null })) });
  } catch (e) { return c.json({ error: "Failed to get subjects: " + errMsg(e) }, 500); }
});

app.post(`${API}/subjects`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    const forbidden = requireRole(c, auth, ["admin", "teacher"]); if (forbidden) return forbidden;
    const body = await c.req.json();
    const teacher_id = body.teacher_id || body.teacherId || (auth.profile.role === "teacher" ? auth.user.id : null);
    const { data, error } = await auth.supabase.from("subjects").insert({ name: body.name, code: body.code, description: body.description || null, teacher_id }).select("*").single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true, subject: mapSubject(data) }, 201);
  } catch (e) { return c.json({ error: "Failed to create subject: " + errMsg(e) }, 500); }
});

app.put(`${API}/subjects/:id`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    const id = c.req.param("id"); const subject = await getSubject(auth, id);
    if (!subject) return c.json({ error: "Subject not found" }, 404);
    if (auth.profile.role !== "admin" && subject.teacher_id !== auth.user.id) return c.json({ error: "Forbidden" }, 403);
    const body = await c.req.json();
    const patch: any = { updated_at: now() };
    if (body.name !== undefined) patch.name = body.name;
    if (body.code !== undefined) patch.code = body.code;
    if (body.description !== undefined) patch.description = body.description;
    if (auth.profile.role === "admin" && (body.teacher_id || body.teacherId)) patch.teacher_id = body.teacher_id || body.teacherId;
    const { data, error } = await auth.supabase.from("subjects").update(patch).eq("id", id).select("*").single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true, subject: mapSubject(data) });
  } catch (e) { return c.json({ error: "Failed to update subject: " + errMsg(e) }, 500); }
});

app.delete(`${API}/subjects/:id`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    const forbidden = requireRole(c, auth, ["admin"]); if (forbidden) return forbidden;
    const id = c.req.param("id");
    const { error } = await auth.supabase.from("subjects").delete().eq("id", id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true });
  } catch (e) { return c.json({ error: "Failed to delete subject: " + errMsg(e) }, 500); }

});

app.get(`${API}/subjects/:id/roster`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const subjectId = c.req.param("id");
    const subject = await getSubject(auth, subjectId);

    if (!subject) return c.json({ error: "Subject not found" }, 404);

    if (auth.profile.role === "teacher" && subject.teacher_id !== auth.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { data: enrollments, error: enrollmentError } = await auth.supabase
      .from("enrollments")
      .select("id, enrolled_at, student_id, subject_id")
      .eq("subject_id", subjectId);

    if (enrollmentError) {
      return c.json({ error: enrollmentError.message }, 500);
    }

    const studentIds = (enrollments || [])
      .map((e: any) => e.student_id)
      .filter(Boolean);

    if (studentIds.length === 0) {
      return c.json({ roster: [] });
    }

    const { data: students, error: studentsError } = await auth.supabase
      .from("profiles")
      .select("id, name, role, student_number")
      .in("id", studentIds);

    if (studentsError) {
      return c.json({ error: studentsError.message }, 500);
    }

    const studentMap = new Map((students || []).map((s: any) => [s.id, s]));

    const roster = (enrollments || []).map((e: any) => {
      const student = studentMap.get(e.student_id);

      return {
        enrollmentId: e.id,
        studentId: e.student_id,
        studentName: student?.name || "Unknown Student",
        studentNumber: student?.student_number || null,
        enrolledAt: e.enrolled_at,
      };
    });

    return c.json({ roster });
  } catch (e) {
    return c.json({ error: "Failed to get roster: " + errMsg(e) }, 500);
  }
});

app.get(`${API}/subjects/:id/students`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const subjectId = c.req.param("id");

    const subject = await getSubject(auth, subjectId);

    if (!subject) {
      return c.json({ error: "Subject not found" }, 404);
    }

    // Teachers can only access their own subject students
    if (
      auth.profile.role === "teacher" &&
      subject.teacher_id !== auth.user.id
    ) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Only admin and teacher should use this endpoint
    if (!["admin", "teacher"].includes(auth.profile.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { data, error } = await auth.supabase
      .from("enrollments")
      .select(`
        id,
        student_id,
        subject_id,
        enrolled_at,
        student:profiles!enrollments_student_id_fkey(
          id,
          name,
          role,
          student_number
        )
      `)
      .eq("subject_id", subjectId);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      students: data || [],
    });
  } catch (e) {
    return c.json({
      error: "Failed to fetch subject students: " + errMsg(e),
    }, 500);
  }
});


app.post(`${API}/subjects/:id/enroll`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    if (auth.profile.role !== "student") return c.json({ error: "Only students can enroll themselves" }, 403);
    const subject_id = c.req.param("id");
    const { data, error } = await auth.supabase.from("enrollments").upsert({ student_id: auth.user.id, subject_id }, { onConflict: "student_id,subject_id" }).select("*").single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true, enrollment: mapEnrollment(data) });
  } catch (e) { return c.json({ error: "Failed to enroll: " + errMsg(e) }, 500); }
});

app.delete(`${API}/subjects/:id/enroll`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    if (auth.profile.role !== "student") return c.json({ error: "Only students can unenroll themselves" }, 403);
    const { error } = await auth.supabase.from("enrollments").delete().eq("subject_id", c.req.param("id")).eq("student_id", auth.user.id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true });
  } catch (e) { return c.json({ error: "Failed to unenroll: " + errMsg(e) }, 500); }
});

app.post(`${API}/subjects/:id/assign`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    const forbidden = requireRole(c, auth, ["admin"]); if (forbidden) return forbidden;
    const subject_id = c.req.param("id"); const body = await c.req.json();
    const student_id = body.student_id || body.studentId;
    const { data, error } = await auth.supabase.from("enrollments").upsert({ student_id, subject_id, assigned_by: auth.user.id }, { onConflict: "student_id,subject_id" }).select("*").single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true, enrollment: mapEnrollment(data) });
  } catch (e) { return c.json({ error: "Failed to assign subject: " + errMsg(e) }, 500); }
});


// ================= TEACHER STUDENTS =================
app.get(`${API}/teacher/students`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    if (auth.profile.role !== "teacher") {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { data: subjects, error: subjectError } = await auth.supabase
      .from("subjects")
      .select("id")
      .eq("teacher_id", auth.user.id);

    if (subjectError) {
      return c.json({ error: subjectError.message }, 500);
    }

    const subjectIds = (subjects || []).map((s: any) => s.id);

    if (subjectIds.length === 0) {
      return c.json({ students: [] });
    }

    const { data: enrollments, error: enrollmentError } = await auth.supabase
      .from("enrollments")
      .select("student_id")
      .in("subject_id", subjectIds);

    if (enrollmentError) {
      return c.json({ error: enrollmentError.message }, 500);
    }

    const studentIds = [
      ...new Set((enrollments || []).map((e: any) => e.student_id).filter(Boolean)),
    ];

    if (studentIds.length === 0) {
      return c.json({ students: [] });
    }

    const { data: students, error: studentError } = await auth.supabase
      .from("profiles")
      .select("id,name,email,student_number,role")
      .eq("role", "student")
      .in("id", studentIds)
      .order("name", { ascending: true });

    if (studentError) {
      return c.json({ error: studentError.message }, 500);
    }

    return c.json({ students: students || [] });
  } catch (e) {
    return c.json(
      { error: "Failed to fetch students: " + errMsg(e) },
      500
    );
  }
});

// ================= ENROLLMENTS =================
app.get(`${API}/enrollments`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    let query = auth.supabase
  .from("enrollments")
  .select("*, subject:subjects(*)")
  .order("enrolled_at", { ascending: false });
    if (auth.profile.role === "student") query = query.eq("student_id", auth.user.id);
    if (auth.profile.role === "teacher") {
      const { data: subjects } = await auth.supabase.from("subjects").select("id").eq("teacher_id", auth.user.id);
      query = query.in("subject_id", (subjects || []).map((s: any) => s.id));
    }
    const { data, error } = await query;
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ enrollments: (data || []).map(mapEnrollment) });
  } catch (e) { return c.json({ error: "Failed to get enrollments: " + errMsg(e) }, 500); }
});

app.post(`${API}/enrollments`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    const body = await c.req.json();
    const subject_id = body.subject_id || body.subjectId;
    const student_id = auth.profile.role === "student" ? auth.user.id : (body.student_id || body.studentId);
    if (auth.profile.role !== "student" && auth.profile.role !== "admin") return c.json({ error: "Forbidden" }, 403);
    const { data, error } = await auth.supabase.from("enrollments").upsert({ student_id, subject_id, assigned_by: auth.profile.role === "admin" ? auth.user.id : null }, { onConflict: "student_id,subject_id" }).select("*").single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true, enrollment: mapEnrollment(data) }, 201);
  } catch (e) { return c.json({ error: "Failed to create enrollment: " + errMsg(e) }, 500); }
});

app.delete(`${API}/enrollments/:id`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    const id = c.req.param("id");
    const { data: enrollment } = await auth.supabase.from("enrollments").select("*").eq("id", id).single();
    if (!enrollment) return c.json({ error: "Enrollment not found" }, 404);
    if (auth.profile.role !== "admin" && enrollment.student_id !== auth.user.id) return c.json({ error: "Forbidden" }, 403);
    const { error } = await auth.supabase.from("enrollments").delete().eq("id", id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true });
  } catch (e) { return c.json({ error: "Failed to delete enrollment: " + errMsg(e) }, 500); }
});

// ================= GRADES =================
const CATEGORY_WEIGHTS: Record<string, number> = {
  assignment: 0.3,
  exam: 0.5,
  participation: 0.1,
  manual: 0.1,
};

const avg = (values: number[]) => {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const round1 = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return null;
  return Math.round(value * 10) / 10;
};

const transcriptLetterGrade = (score: number | null) => {
  if (score === null) return "-";
  return letterGrade(score);
};

function calculateTranscriptRows(grades: any[]) {
  const bySubject = new Map<string, any[]>();

  for (const grade of grades) {
    const subjectId = grade.subject_id;
    if (!bySubject.has(subjectId)) bySubject.set(subjectId, []);
    bySubject.get(subjectId)!.push(grade);
  }

  return Array.from(bySubject.entries()).map(([subjectId, subjectGrades]) => {
    const subject = subjectGrades[0].subject;
    const passMark = Number(subject?.pass_mark ?? 50);

    const assignmentAvg = avg(
      subjectGrades
        .filter((g) => g.grade_type === "assignment")
        .map((g) => Number(g.score))
    );

    const examAvg = avg(
      subjectGrades
        .filter((g) => g.grade_type === "exam")
        .map((g) => Number(g.score))
    );

    const participationAvg = avg(
      subjectGrades
        .filter((g) => g.grade_type === "participation")
        .map((g) => Number(g.score))
    );

    const manualAvg = avg(
      subjectGrades
        .filter((g) => g.grade_type === "manual")
        .map((g) => Number(g.score))
    );

    let finalAverage = 0;
    let usedWeight = 0;

    if (assignmentAvg !== null) {
      finalAverage += assignmentAvg * CATEGORY_WEIGHTS.assignment;
      usedWeight += CATEGORY_WEIGHTS.assignment;
    }

    if (examAvg !== null) {
      finalAverage += examAvg * CATEGORY_WEIGHTS.exam;
      usedWeight += CATEGORY_WEIGHTS.exam;
    }

    if (participationAvg !== null) {
      finalAverage += participationAvg * CATEGORY_WEIGHTS.participation;
      usedWeight += CATEGORY_WEIGHTS.participation;
    }

    if (manualAvg !== null) {
      finalAverage += manualAvg * CATEGORY_WEIGHTS.manual;
      usedWeight += CATEGORY_WEIGHTS.manual;
    }

    const normalizedFinalAverage =
      usedWeight > 0 ? finalAverage / usedWeight : null;

    return {
      subjectId,
      subjectName: subject?.name || "Unknown Subject",
      subjectCode: subject?.code || null,
      passMark,
      assignmentAvg: round1(assignmentAvg),
      examAvg: round1(examAvg),
      participationAvg: round1(participationAvg),
      manualAvg: round1(manualAvg),
      finalAverage: round1(normalizedFinalAverage),
      letterGrade: transcriptLetterGrade(normalizedFinalAverage),
      status:
        normalizedFinalAverage === null
          ? "No grades"
          : normalizedFinalAverage >= passMark
          ? "Pass"
          : "Fail",
    };
  });
}

app.get(`${API}/grades`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    let q = auth.supabase
      .from("grades")
      .select(
        "*, subject:subjects(id,name,code,pass_mark), student:profiles!grades_student_id_fkey(id,name,student_number), teacher:profiles!grades_teacher_id_fkey(id,name)"
      )
      .order("created_at", { ascending: false });

    if (auth.profile.role === "student") q = q.eq("student_id", auth.user.id);
    if (auth.profile.role === "teacher") q = q.eq("teacher_id", auth.user.id);

    const { data, error } = await q;

    if (error) return c.json({ error: error.message }, 500);

    return c.json({ grades: (data || []).map(mapGrade) });
  } catch (e) {
    return c.json({ error: "Failed to get grades: " + errMsg(e) }, 500);
  }
});

app.post(`${API}/grades`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const forbidden = requireRole(c, auth, ["admin", "teacher"]);
    if (forbidden) return forbidden;

    const b = await c.req.json();

    const student_id = b.student_id || b.studentId;
    const subject_id = b.subject_id || b.subjectId;
    const grade_type = b.grade_type || b.gradeType || "manual";

    if (!student_id) {
  return c.json({ error: "Student is required" }, 400);
}

if (!subject_id) {
  return c.json({ error: "Subject is required" }, 400);
}

    if (!["assignment", "exam", "participation", "manual"].includes(grade_type)) {
      return c.json({ error: "Invalid grade category" }, 400);
    }

    const score = Number(b.score);

    if (Number.isNaN(score) || score < 0 || score > 100) {
      return c.json({ error: "Score must be 0-100" }, 400);
    }

    const subject = await getSubject(auth, subject_id);
    if (!subject) return c.json({ error: "Subject not found" }, 404);

    if (auth.profile.role === "teacher" && subject.teacher_id !== auth.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (!(await isEnrolled(auth, student_id, subject_id))) {
      return c.json({ error: "Student is not enrolled in this subject" }, 400);
    }

    const payload = {
      student_id,
      subject_id,
      teacher_id: auth.user.id,
      score,
      letter_grade: b.letter_grade || b.letterGrade || letterGrade(score),
      feedback: b.feedback || null,
      grade_type,
    };

    const { data, error } = await auth.supabase
      .from("grades")
      .insert(payload)
      .select("*")
      .single();

    if (error) return c.json({ error: error.message }, 400);

    return c.json({ success: true, grade: mapGrade(data) }, 201);
  } catch (e) {
    return c.json({ error: "Failed to create grade: " + errMsg(e) }, 500);
  }
});

app.put(`${API}/grades/:id`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const id = c.req.param("id");

    const { data: grade } = await auth.supabase
      .from("grades")
      .select("*")
      .eq("id", id)
      .single();

    if (!grade) return c.json({ error: "Grade not found" }, 404);

    if (auth.profile.role !== "admin" && grade.teacher_id !== auth.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const b = await c.req.json();
    const patch: any = { updated_at: now() };

    if (b.score !== undefined) {
      const score = Number(b.score);

      if (Number.isNaN(score) || score < 0 || score > 100) {
        return c.json({ error: "Score must be 0-100" }, 400);
      }

      patch.score = score;
      patch.letter_grade = b.letter_grade || b.letterGrade || letterGrade(score);
    }

    if (b.feedback !== undefined) patch.feedback = b.feedback;

    if (b.grade_type || b.gradeType) {
      const gradeType = b.grade_type || b.gradeType;

      if (!["assignment", "exam", "participation", "manual"].includes(gradeType)) {
        return c.json({ error: "Invalid grade category" }, 400);
      }

      patch.grade_type = gradeType;
    }

    const { data, error } = await auth.supabase
      .from("grades")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return c.json({ error: error.message }, 400);

    return c.json({ success: true, grade: mapGrade(data) });
  } catch (e) {
    return c.json({ error: "Failed to update grade: " + errMsg(e) }, 500);
  }
});

app.delete(`${API}/grades/:id`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const id = c.req.param("id");

    const { data: grade } = await auth.supabase
      .from("grades")
      .select("*")
      .eq("id", id)
      .single();

    if (!grade) return c.json({ error: "Grade not found" }, 404);

    if (auth.profile.role !== "admin" && grade.teacher_id !== auth.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { error } = await auth.supabase
      .from("grades")
      .delete()
      .eq("id", id);

    if (error) return c.json({ error: error.message }, 400);

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: "Failed to delete grade: " + errMsg(e) }, 500);
  }
});
app.get(`${API}/transcript`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const studentId =
      auth.profile.role === "student"
        ? auth.user.id
        : c.req.query("studentId");

    if (!studentId) {
      return c.json({ error: "studentId is required" }, 400);
    }

    if (auth.profile.role === "teacher") {
      const { data: teacherSubjects, error: subjectError } = await auth.supabase
        .from("subjects")
        .select("id")
        .eq("teacher_id", auth.user.id)
        .limit(3);

      if (subjectError) {
        return c.json({ error: subjectError.message }, 500);
      }

      const subjectIds = (teacherSubjects || []).map((s: any) => s.id);

      if (subjectIds.length === 0) {
        return c.json({ error: "Forbidden" }, 403);
      }

      const { data: enrollment, error: enrollmentError } = await auth.supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", studentId)
        .in("subject_id", subjectIds)
        .limit(1);

      if (enrollmentError) {
        return c.json({ error: enrollmentError.message }, 500);
      }

      if (!enrollment || enrollment.length === 0) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    const { data: student } = await auth.supabase
      .from("profiles")
      .select("id,name,student_number")
      .eq("id", studentId)
      .single();

    const { data: grades, error } = await auth.supabase
      .from("grades")
      .select("*, subject:subjects(id,name,code,pass_mark)")
      .eq("student_id", studentId);

    if (error) return c.json({ error: error.message }, 500);

    return c.json({
      student,
      transcript: calculateTranscriptRows(grades || []),
    });
  } catch (e) {
    return c.json({ error: "Failed to get transcript: " + errMsg(e) }, 500);
  }
});

app.get(`${API}/transcript/:studentId`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const studentId = c.req.param("studentId");

    if (auth.profile.role === "student" && auth.user.id !== studentId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (auth.profile.role === "teacher") {
      const { data: teacherSubjects, error: subjectError } = await auth.supabase
        .from("subjects")
        .select("id")
        .eq("teacher_id", auth.user.id)
        .limit(3);

      if (subjectError) {
        return c.json({ error: subjectError.message }, 500);
      }

      const subjectIds = (teacherSubjects || []).map((s: any) => s.id);

      if (subjectIds.length === 0) {
        return c.json({ error: "Forbidden" }, 403);
      }

      const { data: enrollment, error: enrollmentError } = await auth.supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", studentId)
        .in("subject_id", subjectIds)
        .limit(1);

      if (enrollmentError) {
        return c.json({ error: enrollmentError.message }, 500);
      }

      if (!enrollment || enrollment.length === 0) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    const { data: student } = await auth.supabase
      .from("profiles")
      .select("id,name,student_number")
      .eq("id", studentId)
      .single();

    const { data: grades, error } = await auth.supabase
      .from("grades")
      .select("*, subject:subjects(id,name,code,pass_mark)")
      .eq("student_id", studentId);

    if (error) return c.json({ error: error.message }, 500);

    return c.json({
      student,
      transcript: calculateTranscriptRows(grades || []),
    });
  } catch (e) {
    return c.json({ error: "Failed to get transcript: " + errMsg(e) }, 500);
  }
});


// ================= ASSIGNMENTS =================
app.get(`${API}/assignments`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    let q = auth.supabase.from("assignments").select("*, subject:subjects(id,name,code), teacher:profiles!assignments_teacher_id_fkey(id,name)").order("created_at", { ascending: false });
    if (auth.profile.role === "teacher") q = q.eq("teacher_id", auth.user.id);
    if (auth.profile.role === "student") {
      const { data: ens } = await auth.supabase.from("enrollments").select("subject_id").eq("student_id", auth.user.id);
      q = q.in("subject_id", (ens || []).map((e: any) => e.subject_id));
    }
    const { data, error } = await q; if (error) return c.json({ error: error.message }, 500);
    return c.json({ assignments: (data || []).map(mapAssignment) });
  } catch (e) { return c.json({ error: "Failed to get assignments: " + errMsg(e) }, 500); }
});

app.post(`${API}/assignments`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    const forbidden = requireRole(c, auth, ["admin", "teacher"]); if (forbidden) return forbidden;
    const b = await c.req.json(); const subject_id = b.subject_id || b.subjectId;
    const subject = await getSubject(auth, subject_id); if (!subject) return c.json({ error: "Subject not found" }, 404);
    if (auth.profile.role === "teacher" && subject.teacher_id !== auth.user.id) return c.json({ error: "Forbidden" }, 403);
    const { data, error } = await auth.supabase.from("assignments").insert({ title: b.title, description: b.description || null, subject_id, teacher_id: auth.user.id, due_date: b.due_date || b.dueDate }).select("*").single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true, assignment: mapAssignment(data) }, 201);
  } catch (e) { return c.json({ error: "Failed to create assignment: " + errMsg(e) }, 500); }
});

app.put(`${API}/assignments/:id`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    const id = c.req.param("id"); const { data: a } = await auth.supabase.from("assignments").select("*").eq("id", id).single();
    if (!a) return c.json({ error: "Assignment not found" }, 404);
    if (auth.profile.role !== "admin" && a.teacher_id !== auth.user.id) return c.json({ error: "Forbidden" }, 403);
    const b = await c.req.json(); const patch: any = { updated_at: now() };
    if (b.title !== undefined) patch.title = b.title; if (b.description !== undefined) patch.description = b.description; if (b.due_date || b.dueDate) patch.due_date = b.due_date || b.dueDate; if (b.subject_id || b.subjectId) patch.subject_id = b.subject_id || b.subjectId;
    const { data, error } = await auth.supabase.from("assignments").update(patch).eq("id", id).select("*").single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true, assignment: mapAssignment(data) });
  } catch (e) { return c.json({ error: "Failed to update assignment: " + errMsg(e) }, 500); }
});

app.delete(`${API}/assignments/:id`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    const id = c.req.param("id"); const { data: a } = await auth.supabase.from("assignments").select("*").eq("id", id).single();
    if (!a) return c.json({ error: "Assignment not found" }, 404);
    if (auth.profile.role !== "admin" && a.teacher_id !== auth.user.id) return c.json({ error: "Forbidden" }, 403);
    const { error } = await auth.supabase.from("assignments").delete().eq("id", id);
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true });
  } catch (e) { return c.json({ error: "Failed to delete assignment: " + errMsg(e) }, 500); }
});

app.post(`${API}/assignments/:id/submit`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    if (auth.profile.role !== "student") return c.json({ error: "Only students can submit assignments" }, 403);
    const assignment_id = c.req.param("id"); const b = await c.req.json();
    const { data: a } = await auth.supabase.from("assignments").select("*").eq("id", assignment_id).single();
    if (!a) return c.json({ error: "Assignment not found" }, 404);
    if (new Date() > new Date(a.due_date)) return c.json({ error: "This assignment is closed" }, 403);
    if (!(await isEnrolled(auth, auth.user.id, a.subject_id))) return c.json({ error: "You are not enrolled in this subject" }, 403);
    const { data, error } = await auth.supabase.from("assignment_submissions").upsert({ assignment_id, student_id: auth.user.id, file_name: b.file_name || b.fileName, file_path: b.file_path || b.filePath || b.path || b.fileUrl || b.url, status: "submitted" }, { onConflict: "assignment_id,student_id" }).select("*").single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json({ success: true, submission: mapAssignmentSubmission(data) }, 201);
  } catch (e) { return c.json({ error: "Failed to submit assignment: " + errMsg(e) }, 500); }
});

app.get(`${API}/assignment-submissions`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    let q = auth.supabase.from("assignment_submissions").select("*, assignment:assignments(*), student:profiles!assignment_submissions_student_id_fkey(id,name,student_number)").order("submitted_at", { ascending: false });
    if (auth.profile.role === "student") q = q.eq("student_id", auth.user.id);
    const { data, error } = await q; if (error) return c.json({ error: error.message }, 500);
    let submissions = data || [];
    if (auth.profile.role === "teacher") submissions = submissions.filter((s: any) => s.assignment?.teacher_id === auth.user.id);
    return c.json({ submissions: submissions.map(mapAssignmentSubmission) });
  } catch (e) { return c.json({ error: "Failed to get submissions: " + errMsg(e) }, 500); }
});

app.get(`${API}/assignments/:id/submissions`, async (c) => {
  try {
    const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
    const assignment_id = c.req.param("id");
    const { data: a } = await auth.supabase.from("assignments").select("*").eq("id", assignment_id).single();
    if (!a) return c.json({ error: "Assignment not found" }, 404);
    if (auth.profile.role !== "admin" && a.teacher_id !== auth.user.id) return c.json({ error: "Forbidden" }, 403);
    const { data, error } = await auth.supabase.from("assignment_submissions").select("*, student:profiles!assignment_submissions_student_id_fkey(id,name,student_number)").eq("assignment_id", assignment_id).order("submitted_at", { ascending: false });
    if (error) return c.json({ error: error.message }, 500);
    return c.json({ submissions: (data || []).map(mapAssignmentSubmission) });
  } catch (e) { return c.json({ error: "Failed to get assignment submissions: " + errMsg(e) }, 500); }
});

app.post(`${API}/assignment-submissions/:id/grade`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const forbidden = requireRole(c, auth, ["admin", "teacher"]);
    if (forbidden) return forbidden;

    const id = c.req.param("id");
    const b = await c.req.json();

    const { data: sub } = await auth.supabase
      .from("assignment_submissions")
      .select("*, assignment:assignments(*)")
      .eq("id", id)
      .single();

    if (!sub) return c.json({ error: "Submission not found" }, 404);

    if (auth.profile.role !== "admin" && sub.assignment?.teacher_id !== auth.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const score = Number(b.score);

    if (Number.isNaN(score) || score < 0 || score > 100) {
      return c.json({ error: "Score must be 0-100" }, 400);
    }

    const { data, error } = await auth.supabase
      .from("assignment_submissions")
      .update({
        score,
        feedback: b.feedback || null,
        status: "graded",
        graded_at: now(),
      })
      .eq("id", id)
      .select("*, assignment:assignments(*)")
      .single();

    if (error) return c.json({ error: error.message }, 400);

    // Automatically create/update assignment grade for transcript
    const { error: gradeError } = await auth.supabase
      .from("grades")
      .upsert(
        {
          student_id: data.student_id,
          subject_id: data.assignment.subject_id,
          teacher_id: data.assignment.teacher_id,
          score,
          letter_grade: letterGrade(score),
          feedback: b.feedback || `Auto-generated from assignment: ${data.assignment.title}`,
          grade_type: "assignment",
          updated_at: now(),
        },
        {
          onConflict: "student_id,subject_id,grade_type",
        }
      );

    if (gradeError) {
      return c.json({ error: "Assignment graded, but failed to update transcript grade: " + gradeError.message }, 400);
    }

    return c.json({
      success: true,
      submission: mapAssignmentSubmission(data),
    });
  } catch (e) {
    return c.json({ error: "Failed to grade submission: " + errMsg(e) }, 500);
  }
});

// ================= EXAMS =================
app.get(`${API}/exams`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    let q = auth.supabase
      .from("exams")
      .select("*, subject:subjects(id,name,code), teacher:profiles!exams_teacher_id_fkey(id,name)")
      .order("created_at", { ascending: false });

    if (auth.profile.role === "teacher") q = q.eq("teacher_id", auth.user.id);

    if (auth.profile.role === "student") {
      const { data: ens } = await auth.supabase
        .from("enrollments")
        .select("subject_id")
        .eq("student_id", auth.user.id);

      q = q.in("subject_id", (ens || []).map((e: any) => e.subject_id));
    }

    const { data, error } = await q;
    if (error) return c.json({ error: error.message }, 500);

    return c.json({ exams: (data || []).map(mapExam) });
  } catch (e) {
    return c.json({ error: "Failed to get exams: " + errMsg(e) }, 500);
  }
});

app.post(`${API}/exams`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const forbidden = requireRole(c, auth, ["admin", "teacher"]);
    if (forbidden) return forbidden;

    const b = await c.req.json();
    const subject_id = b.subject_id || b.subjectId;

    const subject = await getSubject(auth, subject_id);
    if (!subject) return c.json({ error: "Subject not found" }, 404);

    if (auth.profile.role === "teacher" && subject.teacher_id !== auth.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { data, error } = await auth.supabase
      .from("exams")
      .insert({
        title: b.title,
        subject_id,
        teacher_id: auth.user.id,
        duration: Number(b.duration),
        start_date: b.start_date || b.startDate || null,
        end_date: b.end_date || b.endDate || null,
        questions: b.questions || [],
      })
      .select("*")
      .single();

    if (error) return c.json({ error: error.message }, 400);

    return c.json({ success: true, exam: mapExam(data) }, 201);
  } catch (e) {
    return c.json({ error: "Failed to create exam: " + errMsg(e) }, 500);
  }
});

app.get(`${API}/exams/:id`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const { data, error } = await auth.supabase
      .from("exams")
      .select("*, subject:subjects(id,name,code)")
      .eq("id", c.req.param("id"))
      .single();

    if (error || !data) return c.json({ error: "Exam not found" }, 404);

    return c.json({ exam: mapExam(data) });
  } catch (e) {
    return c.json({ error: "Failed to get exam: " + errMsg(e) }, 500);
  }
});

app.put(`${API}/exams/:id`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const id = c.req.param("id");

    const { data: exam } = await auth.supabase
      .from("exams")
      .select("*")
      .eq("id", id)
      .single();

    if (!exam) return c.json({ error: "Exam not found" }, 404);

    if (auth.profile.role !== "admin" && exam.teacher_id !== auth.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const b = await c.req.json();
    const patch: any = { updated_at: now() };

    if (b.title !== undefined) patch.title = b.title;
    if (b.duration !== undefined) patch.duration = Number(b.duration);
    if (b.questions !== undefined) patch.questions = b.questions;
    if (b.subject_id || b.subjectId) patch.subject_id = b.subject_id || b.subjectId;
    if (b.start_date || b.startDate) patch.start_date = b.start_date || b.startDate;
    if (b.end_date || b.endDate) patch.end_date = b.end_date || b.endDate;

    const { data, error } = await auth.supabase
      .from("exams")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return c.json({ error: error.message }, 400);

    return c.json({ success: true, exam: mapExam(data) });
  } catch (e) {
    return c.json({ error: "Failed to update exam: " + errMsg(e) }, 500);
  }
});

app.delete(`${API}/exams/:id`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const id = c.req.param("id");

    const { data: exam } = await auth.supabase
      .from("exams")
      .select("*")
      .eq("id", id)
      .single();

    if (!exam) return c.json({ error: "Exam not found" }, 404);

    if (auth.profile.role !== "admin" && exam.teacher_id !== auth.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { error } = await auth.supabase.from("exams").delete().eq("id", id);

    if (error) return c.json({ error: error.message }, 400);

    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: "Failed to delete exam: " + errMsg(e) }, 500);
  }
});

app.post(`${API}/exams/:id/start`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    if (auth.profile.role !== "student") {
      return c.json({ error: "Only students can take exams" }, 403);
    }

    const exam_id = c.req.param("id");

    const { data: exam } = await auth.supabase
      .from("exams")
      .select("*")
      .eq("id", exam_id)
      .single();

    if (!exam) return c.json({ error: "Exam not found" }, 404);

    const currentTime = new Date();

    if (exam.start_date && currentTime < new Date(exam.start_date)) {
      return c.json({ error: "Exam has not started yet" }, 400);
    }

    if (exam.end_date && currentTime > new Date(exam.end_date)) {
      return c.json({ error: "Exam has already closed" }, 400);
    }

    if (!(await isEnrolled(auth, auth.user.id, exam.subject_id))) {
      return c.json({ error: "You are not enrolled in this subject" }, 403);
    }

    const { data: existingAttempt } = await auth.supabase
      .from("exam_attempts")
      .select("*")
      .eq("exam_id", exam_id)
      .eq("student_id", auth.user.id)
      .maybeSingle();

    if (existingAttempt) {
      if (existingAttempt.status === "submitted") {
        return c.json({ error: "You have already submitted this exam" }, 409);
      }

      if (existingAttempt.status === "expired") {
        return c.json({ error: "This exam attempt has expired" }, 403);
      }

      return c.json({
        success: true,
        attempt: mapExamAttempt(existingAttempt),
        exam: mapExam(exam),
        serverTime: now(),
        resumed: true,
      });
    }

    const deadline = new Date(Date.now() + Number(exam.duration) * 60000).toISOString();

    const { data: attempt, error: attemptError } = await auth.supabase
      .from("exam_attempts")
      .upsert(
        {
          exam_id: exam.id,
          student_id: auth.user.id,
          answers: [],
          deadline,
          status: "in_progress",
          submitted: false,
          updated_at: now(),
        },
        { onConflict: "exam_id,student_id" }
      )
      .select("*")
      .single();

    if (attemptError) return c.json({ error: attemptError.message }, 400);

    return c.json({
      success: true,
      attempt: mapExamAttempt(attempt),
      exam: mapExam(exam),
      serverTime: now(),
      resumed: false,
    });
  } catch (e) {
    return c.json({ error: "Failed to start exam: " + errMsg(e) }, 500);
  }
});

app.get(`${API}/exams/:id/progress`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const exam_id = c.req.param("id");

    const { data, error } = await auth.supabase
      .from("exam_attempts")
      .select("*")
      .eq("exam_id", exam_id)
      .eq("student_id", auth.user.id)
      .maybeSingle();

    if (error) return c.json({ error: error.message }, 400);

    return c.json({ attempt: mapExamAttempt(data) });
  } catch (e) {
    return c.json({ error: "Failed to load progress: " + errMsg(e) }, 500);
  }
});

app.put(`${API}/exams/:id/progress`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    if (auth.profile.role !== "student") {
      return c.json({ error: "Only students can save exam progress" }, 403);
    }

    const exam_id = c.req.param("id");
    const { answers = [] } = await c.req.json();

    const { data: attempt, error: attemptError } = await auth.supabase
      .from("exam_attempts")
      .select("*")
      .eq("exam_id", exam_id)
      .eq("student_id", auth.user.id)
      .maybeSingle();

    if (attemptError) return c.json({ error: attemptError.message }, 400);
    if (!attempt) return c.json({ error: "Attempt not found" }, 404);

    if (attempt.status !== "in_progress") {
      return c.json({ error: "Attempt is no longer active" }, 400);
    }

    if (new Date() > new Date(attempt.deadline)) {
      await auth.supabase
        .from("exam_attempts")
        .update({
          status: "expired",
          updated_at: now(),
        })
        .eq("id", attempt.id);

      return c.json({ error: "Exam time has expired" }, 403);
    }

    const { data, error } = await auth.supabase
      .from("exam_attempts")
      .update({
        answers,
        updated_at: now(),
      })
      .eq("id", attempt.id)
      .select("*")
      .single();

    if (error) return c.json({ error: error.message }, 400);

    return c.json({ success: true, attempt: mapExamAttempt(data) });
  } catch (e) {
    return c.json({ error: "Failed to save progress: " + errMsg(e) }, 500);
  }
});

app.put(`${API}/exam-attempts/:id/autosave`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    if (auth.profile.role !== "student") {
      return c.json({ error: "Only students can autosave exams" }, 403);
    }

    const attemptId = c.req.param("id");
    const { answers = [] } = await c.req.json();

    const { data: attempt } = await auth.supabase
      .from("exam_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("student_id", auth.user.id)
      .maybeSingle();

    if (!attempt) return c.json({ error: "Attempt not found" }, 404);

    if (attempt.status !== "in_progress") {
      return c.json({ error: "Attempt is no longer active" }, 400);
    }

    if (new Date() > new Date(attempt.deadline)) {
      await auth.supabase
        .from("exam_attempts")
        .update({
          status: "expired",
          updated_at: now(),
        })
        .eq("id", attemptId);

      return c.json({ error: "Exam time has expired" }, 403);
    }

    const { data, error } = await auth.supabase
      .from("exam_attempts")
      .update({
        answers,
        updated_at: now(),
      })
      .eq("id", attemptId)
      .select("*")
      .single();

    if (error) return c.json({ error: error.message }, 400);

    return c.json({
      success: true,
      attempt: mapExamAttempt(data),
    });
  } catch (e) {
    return c.json({ error: "Failed to autosave exam: " + errMsg(e) }, 500);
  }
});

app.post(`${API}/exams/:id/submit`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    if (auth.profile.role !== "student") {
      return c.json({ error: "Only students can submit exams" }, 403);
    }

    const exam_id = c.req.param("id");
    const { answers = [] } = await c.req.json();

    const { data: exam } = await auth.supabase
      .from("exams")
      .select("*")
      .eq("id", exam_id)
      .single();

    if (!exam) return c.json({ error: "Exam not found" }, 404);

    const { data: attempt } = await auth.supabase
      .from("exam_attempts")
      .select("*")
      .eq("exam_id", exam_id)
      .eq("student_id", auth.user.id)
      .maybeSingle();

    if (!attempt) {
      return c.json({ error: "No active exam attempt found. Start the exam first." }, 400);
    }

    if (attempt.status === "submitted") {
      return c.json({ error: "You have already submitted this exam" }, 409);
    }

    if (attempt.status === "expired") {
      return c.json({ error: "This exam attempt has expired" }, 403);
    }

    if (new Date() > new Date(attempt.deadline)) {
      await auth.supabase
        .from("exam_attempts")
        .update({
          status: "expired",
          updated_at: now(),
        })
        .eq("id", attempt.id);

      return c.json({ error: "Exam time has expired" }, 403);
    }

    if (!(await isEnrolled(auth, auth.user.id, exam.subject_id))) {
      return c.json({ error: "You are not enrolled in this subject" }, 403);
    }

    let total_marks = 0;
    let obtained_marks = 0;
    let hasManualQuestions = false;

    const manualQuestionTypes = ["short_answer", "essay", "file_upload"];

    (exam.questions || []).forEach((q: any, i: number) => {
      const type = q.type || "mcq";
      const marks = Number(q.marks || 1);
      const studentAnswer = answers[i];

      total_marks += marks;

      // MCQ and True/False
      if (type === "mcq" || type === "true_false") {
        if (studentAnswer === q.correctAnswer) {
          obtained_marks += marks;
        }
      }

      // Fill blank auto grading, case-insensitive
      else if (type === "fill_blank") {
        const correct = String(q.correctText || "").trim().toLowerCase();
        const given = String(studentAnswer || "").trim().toLowerCase();

        if (correct && given && correct === given) {
          obtained_marks += marks;
        }
      }

      // Multiple correct with partial marks
      else if (type === "multiple_correct") {
        const correctAnswers = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
        const selectedAnswers = Array.isArray(studentAnswer) ? studentAnswer : [];

        if (correctAnswers.length > 0) {
          const correctSelected = selectedAnswers.filter((answer: number) =>
            correctAnswers.includes(answer)
          ).length;

          const wrongSelected = selectedAnswers.filter((answer: number) =>
            !correctAnswers.includes(answer)
          ).length;

          const rawScore = correctSelected / correctAnswers.length;
          const penalty = wrongSelected / correctAnswers.length;
          const finalRatio = Math.max(rawScore - penalty, 0);

          obtained_marks += marks * finalRatio;
        }
      }

      // Manual grading types
      else if (manualQuestionTypes.includes(type)) {
        hasManualQuestions = true;
      }
    });

    obtained_marks = Math.round(obtained_marks * 100) / 100;
    const percentage = total_marks > 0 ? (obtained_marks / total_marks) * 100 : 0;
    const roundedPercentage = Math.round(percentage * 10) / 10;

    const grading_status = hasManualQuestions ? "pending_manual" : "auto_graded";

    const { data: updatedAttempt, error: attemptError } = await auth.supabase
      .from("exam_attempts")
      .update({
        answers,
        obtained_marks,
        total_marks,
        percentage: roundedPercentage,
        submitted_at: now(),
        status: "submitted",
        submitted: true,
        updated_at: now(),
      })
      .eq("id", attempt.id)
      .select("*")
      .single();

    if (attemptError) return c.json({ error: attemptError.message }, 400);

    const { data: submission, error: submissionError } = await auth.supabase
      .from("exam_submissions")
      .upsert(
        {
          exam_id,
          student_id: auth.user.id,
          answers,
          obtained_marks,
          total_marks,
          percentage: roundedPercentage,
          grading_status,
          manual_score: 0,
          manual_feedback: null,
        },
        { onConflict: "exam_id,student_id" }
      )
      .select("*")
      .single();

    if (submissionError) return c.json({ error: submissionError.message }, 400);

    // Only update transcript grade immediately if exam is fully auto-graded
    if (grading_status === "auto_graded") {
      const { error: gradeError } = await auth.supabase
        .from("grades")
        .upsert(
          {
            student_id: auth.user.id,
            subject_id: exam.subject_id,
            teacher_id: exam.teacher_id,
            score: roundedPercentage,
            letter_grade: letterGrade(roundedPercentage),
            feedback: `Auto-generated from exam: ${exam.title}`,
            grade_type: "exam",
            updated_at: now(),
          },
          {
            onConflict: "student_id,subject_id,grade_type",
          }
        );

      if (gradeError) {
        return c.json({
          error:
            "Exam submitted, but failed to update transcript grade: " +
            gradeError.message,
        }, 400);
      }
    }

    return c.json(
      {
        success: true,
        attempt: mapExamAttempt(updatedAttempt),
        submission: mapExamSubmission(submission),
      },
      201
    );
  } catch (e) {
    return c.json({ error: "Failed to submit exam: " + errMsg(e) }, 500);
  }
});

app.get(`${API}/exam-submissions`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    let q = auth.supabase
      .from("exam_submissions")
      .select("*, exam:exams(*), student:profiles!exam_submissions_student_id_fkey(id,name,student_number)")
      .order("submitted_at", { ascending: false });

    if (auth.profile.role === "student") q = q.eq("student_id", auth.user.id);

    const { data, error } = await q;
    if (error) return c.json({ error: error.message }, 500);

    let submissions = data || [];

    if (auth.profile.role === "teacher") {
      submissions = submissions.filter((s: any) => s.exam?.teacher_id === auth.user.id);
    }

    return c.json({ submissions: submissions.map(mapExamSubmission) });
  } catch (e) {
    return c.json({ error: "Failed to get exam submissions: " + errMsg(e) }, 500);
  }
});

app.get(`${API}/exams/:id/submissions`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const exam_id = c.req.param("id");

    const { data: exam } = await auth.supabase
      .from("exams")
      .select("*")
      .eq("id", exam_id)
      .single();

    if (!exam) return c.json({ error: "Exam not found" }, 404);

    if (auth.profile.role !== "admin" && exam.teacher_id !== auth.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const { data, error } = await auth.supabase
      .from("exam_submissions")
      .select("*, student:profiles!exam_submissions_student_id_fkey(id,name,student_number)")
      .eq("exam_id", exam_id)
      .order("submitted_at", { ascending: false });

    if (error) return c.json({ error: error.message }, 500);

    return c.json({ submissions: (data || []).map(mapExamSubmission) });
  } catch (e) {
    return c.json({ error: "Failed to get exam submissions: " + errMsg(e) }, 500);
  }
});

app.put(`${API}/exam-submissions/:id/manual-grade`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const forbidden = requireRole(c, auth, ["admin", "teacher"]);
    if (forbidden) return forbidden;

    const id = c.req.param("id");
    const { manualScore = 0, manualFeedback = "" } = await c.req.json();

    const { data: submission } = await auth.supabase
      .from("exam_submissions")
      .select("*, exam:exams(*)")
      .eq("id", id)
      .single();

    if (!submission) return c.json({ error: "Submission not found" }, 404);

    if (
      auth.profile.role !== "admin" &&
      submission.exam?.teacher_id !== auth.user.id
    ) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const autoScore = Number(submission.obtained_marks || 0);
    const totalMarks = Number(submission.total_marks || 0);
    const finalScore = autoScore + Number(manualScore || 0);
    const percentage = totalMarks > 0 ? (finalScore / totalMarks) * 100 : 0;
    const roundedPercentage = Math.round(percentage * 10) / 10;

    const { data, error } = await auth.supabase
      .from("exam_submissions")
      .update({
        manual_score: Number(manualScore || 0),
        manual_feedback: manualFeedback || null,
        percentage: roundedPercentage,
        grading_status: "fully_graded",
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return c.json({ error: error.message }, 400);

    const { error: gradeError } = await auth.supabase
      .from("grades")
      .upsert(
        {
          student_id: submission.student_id,
          subject_id: submission.exam.subject_id,
          teacher_id: submission.exam.teacher_id,
          score: roundedPercentage,
          letter_grade: letterGrade(roundedPercentage),
          feedback: manualFeedback || `Final grade from exam: ${submission.exam.title}`,
          grade_type: "exam",
          updated_at: now(),
        },
        {
          onConflict: "student_id,subject_id,grade_type",
        }
      );

    if (gradeError) {
      return c.json({
        error: "Manual grade saved, but failed to update transcript: " + gradeError.message,
      }, 400);
    }

    return c.json({
      success: true,
      submission: mapExamSubmission(data),
    });
  } catch (e) {
    return c.json({ error: "Failed to save manual grade: " + errMsg(e) }, 500);
  }
});
// ================= MESSAGES / CONVERSATIONS =================
app.get(`${API}/messages/contacts`, async (c) => {
  const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
  const { data } = await auth.supabase.from("profiles").select("id,name,role,student_number").neq("id", auth.user.id).eq("disabled", false);
  let contacts = data || [];
  if (auth.profile.role === "student") contacts = contacts.filter((u: any) => ["teacher", "admin"].includes(u.role));
  if (auth.profile.role === "teacher") contacts = contacts.filter((u: any) => ["student", "admin"].includes(u.role));
  return c.json({ contacts });
});

app.get(`${API}/messages/conversations`, async (c) => {
  const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
  const { data: msgs, error } = await auth.supabase.from("messages").select("*").or(`sender_id.eq.${auth.user.id},recipient_id.eq.${auth.user.id}`).order("created_at", { ascending: false });
  if (error) return c.json({ error: error.message }, 500);
  const partnerIds = [...new Set((msgs || []).map((m: any) => m.sender_id === auth.user.id ? m.recipient_id : m.sender_id))];
  const { data: profiles } = await auth.supabase.from("profiles").select("id,name,role").in("id", partnerIds.length ? partnerIds : [auth.user.id]);
  const pmap = new Map((profiles || []).map((p: any) => [p.id, p]));
  const conversations = partnerIds.map((id: string) => {
    const thread = (msgs || []).filter((m: any) => m.sender_id === id || m.recipient_id === id);
    const last = thread[0];
    return { id, otherUser: pmap.get(id), lastMessage: last ? { content: last.content, createdAt: last.created_at, senderId: last.sender_id } : null, unreadCount: thread.filter((m: any) => m.recipient_id === auth.user.id && !m.read).length, lastMessageAt: last?.created_at };
  });
  return c.json({ conversations });
});

app.post(`${API}/messages/conversations/:id/messages`, async (c) => {
  const auth = await requireAuth(c);
  if (!isAuthCtx(auth)) return auth;

  const recipient_id = c.req.param("id");
  const b = await c.req.json();

  const { data, error } = await auth.supabase
    .from("messages")
    .insert({
      sender_id: auth.user.id,
      recipient_id,
      subject: "Chat",
      content: b.content || "",
      attachment_name: b.attachmentName || null,
      attachment_path: b.attachmentPath || null,
      attachment_type: b.attachmentType || null,
    })
    .select("*")
    .single();

  if (error) return c.json({ error: error.message }, 400);

  await auth.supabase.from("notifications").insert({
    user_id: recipient_id,
    type: "message",
    title: "New message",
    message: `${auth.profile.name || "Someone"} sent you a message`,
    link: "/messages",
  });

  return c.json({ message: mapMessage(data) }, 201);
});

app.get(`${API}/messages/conversations/:id/messages`, async (c) => {
  const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth; const otherId = c.req.param("id");
  const { data, error } = await auth.supabase.from("messages").select("*, sender:profiles!messages_sender_id_fkey(id,name)").or(`and(sender_id.eq.${auth.user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${auth.user.id})`).order("created_at", { ascending: true });
  if (error) return c.json({ error: error.message }, 500);
 await auth.supabase
  .from("messages")
  .update({ read: true, seen_at: now() })
  .eq("sender_id", otherId)
  .eq("recipient_id", auth.user.id)
  .is("seen_at", null);
  return c.json({ messages: (data || []).map((m: any) => ({ ...mapMessage(m), sender: m.sender })) });
});

app.get(`${API}/messages/new`, async (c) => {
  const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth; const since = c.req.query("since") || new Date(0).toISOString();
  const { data } = await auth.supabase.from("messages").select("*, sender:profiles!messages_sender_id_fkey(id,name)").eq("recipient_id", auth.user.id).eq("read", false).gt("created_at", since).order("created_at", { ascending: false });
  return c.json({ newMessages: (data || []).map(mapMessage), count: data?.length || 0 });
});

app.get(`${API}/messages`, async (c) => {
  const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth;
  const { data, error } = await auth.supabase.from("messages").select("*").or(`sender_id.eq.${auth.user.id},recipient_id.eq.${auth.user.id}`).order("created_at", { ascending: false });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ messages: (data || []).map(mapMessage) });
});
app.post(`${API}/messages`, async (c) => { const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth; const b = await c.req.json(); const { data, error } = await auth.supabase.from("messages").insert({ sender_id: auth.user.id, recipient_id: b.recipient_id || b.recipientId, subject: b.subject || "Message", content: b.content }).select("*").single(); if (error) return c.json({ error: error.message }, 400); return c.json({ success: true, message: mapMessage(data) }, 201); });
app.put(`${API}/messages/:id/read`, async (c) => { const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth; const { error } = await auth.supabase.from("messages").update({ read: true }).eq("id", c.req.param("id")).eq("recipient_id", auth.user.id); if (error) return c.json({ error: error.message }, 400); return c.json({ success: true }); });

// ================= NOTIFICATIONS =================
app.get(`${API}/notifications`, async (c) => { const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth; const { data, error } = await auth.supabase.from("notifications").select("*").eq("user_id", auth.user.id).order("created_at", { ascending: false }); if (error) return c.json({ error: error.message }, 500); return c.json({ notifications: (data || []).map(mapNotification) }); });
app.put(`${API}/notifications/:id/read`, async (c) => { const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth; const { error } = await auth.supabase.from("notifications").update({ read: true }).eq("id", c.req.param("id")).eq("user_id", auth.user.id); if (error) return c.json({ error: error.message }, 400); return c.json({ success: true }); });
app.put(`${API}/notifications/read-all`, async (c) => { const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth; const { error } = await auth.supabase.from("notifications").update({ read: true }).eq("user_id", auth.user.id).eq("read", false); if (error) return c.json({ error: error.message }, 400); return c.json({ success: true }); });
app.delete(`${API}/notifications/:id`, async (c) => { const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth; const { error } = await auth.supabase.from("notifications").delete().eq("id", c.req.param("id")).eq("user_id", auth.user.id); if (error) return c.json({ error: error.message }, 400); return c.json({ success: true }); });

// ================= STORAGE =================
app.post(`${API}/upload`, async (c) => { const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth; const formData = await c.req.formData(); const file = formData.get("file") as File; if (!file) return c.json({ error: "No file provided" }, 400); const fileName = `${auth.user.id}/${Date.now()}_${file.name}`; const { error } = await auth.supabase.storage.from(bucketName).upload(fileName, await file.arrayBuffer(), { contentType: file.type, upsert: false }); if (error) return c.json({ error: error.message }, 500); return c.json({ success: true, fileName: file.name, path: fileName, filePath: fileName }); });
app.get(`${API}/files/*`, async (c) => {
  try {
    const auth = await requireAuth(c);
    if (!isAuthCtx(auth)) return auth;

    const rawPath = c.req.path.split(`${API}/files/`)[1];

    if (!rawPath) {
      return c.json({ error: "Missing file path" }, 400);
    }

    const filePath = decodeURIComponent(rawPath);

    const { data, error } = await auth.supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 3600);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ url: data.signedUrl });
  } catch (e) {
    return c.json({ error: "Failed to get file: " + errMsg(e) }, 500);
  }
});

// ================= ANALYTICS / SEARCH =================
app.get(`${API}/analytics`, async (c) => {
  const auth = await requireAuth(c);
  if (!isAuthCtx(auth)) return auth;

  try {
    // STUDENT DASHBOARD
    if (auth.profile.role === "student") {
      const [enrollments, examSubs, assignmentSubs, grades] = await Promise.all([
        auth.supabase
          .from("enrollments")
          .select("id")
          .eq("student_id", auth.user.id),

        auth.supabase
          .from("exam_submissions")
          .select("id")
          .eq("student_id", auth.user.id),

        auth.supabase
          .from("assignment_submissions")
          .select("id")
          .eq("student_id", auth.user.id),

        auth.supabase
          .from("grades")
          .select("score")
          .eq("student_id", auth.user.id),
      ]);

      const gradeRows = grades.data || [];
      const averageGrade = gradeRows.length
        ? Math.round(
            gradeRows.reduce((sum: number, g: any) => sum + Number(g.score || 0), 0) /
              gradeRows.length
          )
        : 0;

      return c.json({
        enrolledSubjects: enrollments.data?.length || 0,
        completedExams: examSubs.data?.length || 0,
        submittedAssignments: assignmentSubs.data?.length || 0,
        averageGrade,
      });
    }

    // TEACHER DASHBOARD
    if (auth.profile.role === "teacher") {
      const { data: teacherSubjects } = await auth.supabase
        .from("subjects")
        .select("id")
        .eq("teacher_id", auth.user.id);

      const subjectIds = (teacherSubjects || []).map((s: any) => s.id);

      if (subjectIds.length === 0) {
        return c.json({
          totalStudents: 0,
          activeSubjects: 0,
          pendingSubmissions: 0,
          upcomingExams: 0,
        });
      }

      const [enrollments, assignments, exams] = await Promise.all([
        auth.supabase
          .from("enrollments")
          .select("student_id")
          .in("subject_id", subjectIds),

        auth.supabase
          .from("assignments")
          .select("id")
          .in("subject_id", subjectIds),

        auth.supabase
          .from("exams")
          .select("id,start_date")
          .in("subject_id", subjectIds),
      ]);

      const assignmentIds = (assignments.data || []).map((a: any) => a.id);

      let pendingSubmissions = 0;

      if (assignmentIds.length > 0) {
        const { data: submissions } = await auth.supabase
          .from("assignment_submissions")
          .select("id,status")
          .in("assignment_id", assignmentIds);

        pendingSubmissions = (submissions || []).filter(
          (s: any) => s.status === "submitted"
        ).length;
      }

      const uniqueStudents = new Set(
        (enrollments.data || []).map((e: any) => e.student_id)
      );

      const upcomingExams = (exams.data || []).filter(
        (e: any) => e.start_date && new Date(e.start_date) > new Date()
      ).length;

      return c.json({
        totalStudents: uniqueStudents.size,
        activeSubjects: subjectIds.length,
        pendingSubmissions,
        upcomingExams,
      });
    }

    // ADMIN DASHBOARD
const [users, subjects, exams, grades, assignments, submissions, messages] = await Promise.all([
  auth.supabase.from("profiles").select("id,created_at"),
  auth.supabase.from("subjects").select("id,created_at"),
  auth.supabase.from("exams").select("id,created_at"),
  auth.supabase.from("grades").select("id,created_at"),
  auth.supabase.from("assignments").select("id,created_at"),
  auth.supabase.from("assignment_submissions").select("id,file_path,created_at"),
  auth.supabase.from("messages").select("id,created_at"),
]);

const nowDate = new Date();
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(nowDate.getDate() - 7);

const countRecent = (rows: any[] = []) =>
  rows.filter((r) => r.created_at && new Date(r.created_at) >= sevenDaysAgo).length;

const percentChange = (total: number, recent: number) => {
  const previous = Math.max(total - recent, 0);
  if (previous === 0 && recent > 0) return 100;
  if (previous === 0) return 0;
  return Math.round((recent / previous) * 100);
};

const totalRecords =
  (users.data?.length || 0) +
  (subjects.data?.length || 0) +
  (exams.data?.length || 0) +
  (grades.data?.length || 0) +
  (assignments.data?.length || 0) +
  (submissions.data?.length || 0) +
  (messages.data?.length || 0);

// App-level database usage estimate.
// 1000 records = 100% for demo/system-health purposes.
const databaseUsage = Math.min(Math.round((totalRecords / 1000) * 100), 100);

// App-level storage usage estimate.
// 100 uploaded submissions = 100%.
const storageUsage = Math.min(Math.round(((submissions.data?.length || 0) / 100) * 100), 100);

// Simple health score based on successful analytics query.
const hasErrors =
  users.error ||
  subjects.error ||
  exams.error ||
  grades.error ||
  assignments.error ||
  submissions.error ||
  messages.error;

const apiPerformance = hasErrors ? 65 : 98;

return c.json({
  totalUsers: users.data?.length || 0,
  totalSubjects: subjects.data?.length || 0,
  totalExams: exams.data?.length || 0,
  totalGrades: grades.data?.length || 0,

  userChange: percentChange(users.data?.length || 0, countRecent(users.data || [])),
  subjectChange: percentChange(subjects.data?.length || 0, countRecent(subjects.data || [])),
  examChange: percentChange(exams.data?.length || 0, countRecent(exams.data || [])),
  gradeChange: percentChange(grades.data?.length || 0, countRecent(grades.data || [])),

  databaseUsage,
  storageUsage,
  apiPerformance,
});

  } catch (e) {
    return c.json({ error: "Failed to get analytics: " + errMsg(e) }, 500);
  }
});

// ================= PASSWORD =================
app.post(`${API}/auth/change-password`, async (c) => { const auth = await requireAuth(c); if (!isAuthCtx(auth)) return auth; const { newPassword } = await c.req.json(); if (!newPassword || newPassword.length < 6) return c.json({ error: "New password must be at least 6 characters" }, 400); const { error } = await auth.supabase.auth.admin.updateUserById(auth.user.id, { password: newPassword }); if (error) return c.json({ error: error.message }, 500); return c.json({ success: true }); });

Deno.serve(app.fetch);
