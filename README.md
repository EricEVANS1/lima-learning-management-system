# LIMA - Learning Management System

LIMA is a modern full-stack Learning Management System designed to improve communication, academic management, and collaboration between students, teachers, and administrators within educational institutions.

The platform provides role-based access, real-time communication, examinations, assignments, analytics, and academic tracking in a centralized web application.

---

# Features

## 🎓 Student Features
- Dashboard with academic overview
- Subject enrollment system
- Online exam participation
- Assignment submission with file uploads
- Grade tracking and feedback viewing
- Academic analytics and progress monitoring
- Real-time messaging system
- Notification center

---

## 👨‍🏫 Teacher Features
- Teacher dashboard with analytics
- Subject creation and management
- MCQ exam creation system
- Assignment management
- Student grading and feedback
- Class performance tracking
- Real-time communication with students

---

## 👨‍💼 Admin Features
- System-wide dashboard
- User management
- Subject management
- Student enrollment management
- Platform monitoring and analytics
- Full administrative access

---

# Tech Stack

## Frontend
- React 18
- TypeScript
- Tailwind CSS
- React Router
- Recharts
- Lucide React

## Backend
- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage
- Edge Functions

---

# Core Features

## 🔐 Authentication & Authorization
- Secure authentication system
- Role-based access control
- Protected routes
- Session handling

---

## 💬 Messaging System
- Real-time messaging between users
- Inbox and sent messages
- Read/unread message tracking
- Notifications for new messages
- Conversation history

---

## 📄 Assignment System
- Create assignments
- Submit assignments
- File upload support
- Deadline tracking
- Assignment grading and feedback

---

## 📝 Examination System
- MCQ exam creation
- Timed examinations
- Auto-grading
- Difficulty levels
- Exam result tracking

---

## 📊 Analytics & Reports
- Student performance tracking
- Class analytics
- Dashboard metrics
- Academic progress visualization
- Performance charts

---

## 🔔 Notifications
- Real-time notifications
- Unread notification tracking
- Notification management
- Activity updates

---

## 🔍 Global Search
- Search across:
  - Subjects
  - Assignments
  - Exams
  - Messages
- Real-time search results

---

# Responsive Design

LIMA is fully responsive and optimized for:
- Desktop
- Tablet
- Mobile devices

---

# Project Structure

```bash
src/
├── app/
│   ├── components/
│   ├── context/
│   ├── pages/
│   └── App.tsx
├── utils/
├── styles/
└── assets/

supabase/
└── functions/
```

---

# Installation

## Prerequisites
- Node.js 18+
- pnpm or npm
- Supabase account

---

## Setup

### 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/lima-lms.git
```

### 2. Navigate Into Project

```bash
cd lima-lms
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Configure Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Start Development Server

```bash
pnpm dev
```

---

# API Routes

All routes are prefixed with:

```bash
/make-server-c7f19ddd
```

---

## 🔐 Authentication

### Create User Account
```http
POST /auth/signup
```

### Get Current User Profile
```http
GET /auth/me
```

### Change Password
```http
POST /auth/change-password
```

### Create Demo Accounts
```http
POST /seed-demo
```

---

# 📚 Subjects

### Get All Subjects
```http
GET /subjects
```

### Create Subject
```http
POST /subjects
```

### Enroll Student in Subject
```http
POST /subjects/:id/enroll
```

---

# 📝 Exams

### Get All Exams
```http
GET /exams
```

### Create Exam
```http
POST /exams
```

### Get Exam Details
```http
GET /exams/:id
```

### Submit Exam Answers
```http
POST /exams/:id/submit
```

---

# 📄 Assignments

### Get All Assignments
```http
GET /assignments
```

### Create Assignment
```http
POST /assignments
```

### Submit Assignment
```http
POST /assignments/:id/submit
```

### Grade Assignment Submission
```http
POST /assignment-submissions/:id/grade
```

---

# 📊 Grades

### Get All Grades
```http
GET /grades
```

### Create or Update Grade
```http
POST /grades
```

### Delete Grade
```http
DELETE /grades/:id
```

---

# 💬 Messages

### Get Messages
```http
GET /messages
```

### Send Message
```http
POST /messages
```

### Mark Message as Read
```http
PUT /messages/:id/read
```

### Delete Message
```http
DELETE /messages/:id
```

---

# 🔔 Notifications

### Get Notifications
```http
GET /notifications
```

### Mark Notification as Read
```http
PUT /notifications/:id/read
```

### Mark All Notifications as Read
```http
PUT /notifications/read-all
```

### Delete Notification
```http
DELETE /notifications/:id
```

---

# 📂 Storage

### Upload File
```http
POST /upload
```

### Get File URL
```http
GET /files/:path
```

---

# 📈 Analytics

### Get Dashboard Analytics
```http
GET /analytics
```

---

# 🔍 Search

### Global Search
```http
GET /search?q=query
```

Search supports:
- Subjects
- Exams
- Assignments
- Messages

---

# 🗄️ Database Schema

The application uses Supabase PostgreSQL and KV-style storage structures.

---

## 👤 Profiles Table

Stores authenticated user information.

### Fields
- `id`
- `name`
- `email`
- `role`
- `created_at`

### Roles
- student
- teacher
- admin

---

# 📚 Subjects

Stores all academic subjects.

### Fields
- `id`
- `name`
- `code`
- `description`
- `teacher_id`
- `created_at`

---

# 👥 Enrollments

Stores student enrollments into subjects.

### Fields
- `id`
- `student_id`
- `subject_id`
- `created_at`

---

# 📝 Exams

Stores examination information.

### Fields
- `id`
- `subject_id`
- `title`
- `description`
- `duration`
- `difficulty`
- `questions`
- `created_by`
- `created_at`

---

# 📄 Exam Submissions

Stores submitted exam answers and results.

### Fields
- `id`
- `exam_id`
- `student_id`
- `answers`
- `score`
- `submitted_at`

---

# 📂 Assignments

Stores assignment details.

### Fields
- `id`
- `subject_id`
- `title`
- `description`
- `deadline`
- `created_by`
- `created_at`

---

# 📤 Assignment Submissions

Stores uploaded student assignment submissions.

### Fields
- `id`
- `assignment_id`
- `student_id`
- `file_url`
- `grade`
- `feedback`
- `submitted_at`

---

# 📊 Grades

Stores grading records.

### Fields
- `id`
- `student_id`
- `subject_id`
- `teacher_id`
- `grade`
- `feedback`
- `created_at`

---

# 💬 Messages

Stores communication between users.

### Fields
- `id`
- `sender_id`
- `receiver_id`
- `subject`
- `content`
- `is_read`
- `created_at`

---

# 🔔 Notifications

Stores user notifications.

### Fields
- `id`
- `user_id`
- `title`
- `message`
- `type`
- `is_read`
- `created_at`

---

# 📁 Storage System

Supabase Storage is used for:
- Assignment uploads
- Document storage
- Secure file access
- Signed URLs

Supported file types:
- PDF
- DOCX
- ZIP

---

# 🔐 Security Features

- Role-based access control
- Protected routes
- Secure authentication
- File validation
- Signed storage URLs
- Permission-based actions
- Session handling

---

# Future Improvements

- Video meeting integration
- Attendance tracking
- Advanced analytics
- Mobile application
- Improved real-time collaboration
- Calendar integration
- Exportable reports

---

# Screenshots

Add screenshots for:
- Login page
- Student dashboard
- Teacher dashboard
- Admin dashboard
- Messaging system
- Examination pages
- Assignment management

---

# Deployment

The project can be deployed using:
- Vercel
- Netlify
- Supabase

---

# Author

Eric Madzangasi

Computer Engineering Graduate passionate about:
- Full-stack development
- Educational technology
- Real-time systems
- Scalable web applications
- Software engineering

---

# License

This project is intended for educational, learning, and portfolio purposes.