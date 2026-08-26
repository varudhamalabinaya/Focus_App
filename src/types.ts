export type Role = 'owner' | 'partner'
export type NavPage = 'home' | 'goals' | 'progress' | 'accountability' | 'settings'
export type Decision = 'pending' | 'approved' | 'rejected'
export type TaskStatus = 'open' | 'completed' | 'waiting' | 'verified' | 'rejected'

export interface User {
  id: string
  name: string
  role: Role
}

export interface Goal {
  id: string
  name: string
  why: string
}

export interface AccountabilityPartner {
  id: string
  userId: string
  name: string
  status: 'connected' | 'invited'
}

export interface Task {
  id: string
  goalId: string
  title: string
  schedule: string
  recurring: boolean
  evidenceRequired: boolean
  status: TaskStatus
  attempt: number
}

export interface EvidenceSubmission {
  id: string
  taskId: string
  taskTitle: string
  submittedAt: string
  note: string
  imageName: string
  status: Decision
  attempt: number
  rejectionReason?: string
}

export interface AccessRequest {
  id: string
  site: string
  reason: string
  duration: number
  requestedAt: string
  status: Decision
}

export interface BlockingRule {
  id: string
  site: string
  hostname: string
  enabled: boolean
}

export interface Commitment {
  id: string
  name: string
  duration: number
  startDate: string
  day: number
  partnerId: string
  goalIds: string[]
  tasks: Task[]
  blockedSites: BlockingRule[]
}

export interface Progress {
  verifiedTasks: number
  totalTasks: number
  completedDays: number
  totalDays: number
  verifiedStreak: number
}

export interface Notification {
  id: string
  kind: 'evidence' | 'access' | 'commitment'
  message: string
  createdAt: string
  read: boolean
}

export interface FocusState {
  onboarded: boolean
  role: Role
  page: NavPage
  user: User
  partner: AccountabilityPartner
  goals: Goal[]
  activeGoalId: string
  commitment: Commitment
  progress: Progress
  evidence: EvidenceSubmission[]
  accessRequests: AccessRequest[]
  notifications: Notification[]
  notificationsEnabled: boolean
}
