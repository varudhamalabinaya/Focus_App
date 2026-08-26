import type { FocusState } from './types'

export const initialState: FocusState = {
  onboarded: false,
  role: 'owner',
  page: 'home',
  user: { id: 'user-gowtham', name: 'Gowtham', role: 'owner' },
  partner: { id: 'partner-abinaya', userId: 'user-abinaya', name: 'Abinaya', status: 'connected' },
  goals: [
    { id: 'goal-deep-work', name: 'Deep Work', why: 'Build the discipline to do meaningful work before distraction gets a vote.' },
  ],
  activeGoalId: 'goal-deep-work',
  notificationsEnabled: true,
  commitment: {
    id: 'commitment-deep-work',
    name: '14 Day Deep Work Commitment',
    duration: 14,
    startDate: '2026-08-21',
    day: 6,
    partnerId: 'partner-abinaya',
    goalIds: ['goal-deep-work'],
    tasks: [
      { id: 'focus', goalId: 'goal-deep-work', title: '2 hours focused work', schedule: 'Daily · before 1 PM', recurring: true, evidenceRequired: true, status: 'open', attempt: 1 },
      { id: 'coding', goalId: 'goal-deep-work', title: 'Complete one coding problem', schedule: 'Daily · evening', recurring: true, evidenceRequired: true, status: 'waiting', attempt: 1 },
      { id: 'read', goalId: 'goal-deep-work', title: 'Read 20 pages', schedule: 'Daily · before bed', recurring: true, evidenceRequired: true, status: 'verified', attempt: 1 },
    ],
    blockedSites: [
      { id: 'youtube', site: 'YouTube', hostname: 'youtube.com', enabled: true },
      { id: 'instagram', site: 'Instagram', hostname: 'instagram.com', enabled: true },
      { id: 'reddit', site: 'Reddit', hostname: 'reddit.com', enabled: true },
    ],
  },
  progress: { verifiedTasks: 17, totalTasks: 25, completedDays: 8, totalDays: 14, verifiedStreak: 5 },
  evidence: [
    { id: 'ev-1', taskId: 'coding', taskTitle: 'Complete one coding problem', submittedAt: 'Today, 11:42 AM', note: 'Solved the dynamic programming exercise and included the passing result.', imageName: 'coding-result.jpg', status: 'pending', attempt: 1 },
    { id: 'ev-2', taskId: 'read', taskTitle: 'Read 20 pages', submittedAt: 'Yesterday, 9:18 PM', note: 'Pages 81–102, with notes.', imageName: 'reading-notes.jpg', status: 'approved', attempt: 1 },
    { id: 'ev-3', taskId: 'focus', taskTitle: '2 hours focused work', submittedAt: 'Aug 24, 12:21 PM', note: 'Timer summary.', imageName: 'timer.jpg', status: 'rejected', attempt: 1, rejectionReason: 'The timer summary does not show today’s date. Please include the dated session view.' },
    { id: 'ev-4', taskId: 'focus', taskTitle: '2 hours focused work', submittedAt: 'Aug 24, 12:38 PM', note: 'Resubmitted with dated session history.', imageName: 'dated-session.jpg', status: 'approved', attempt: 2 },
  ],
  accessRequests: [
    { id: 'ar-1', site: 'YouTube', reason: 'Watch the linked course walkthrough for today’s coding problem.', duration: 15, requestedAt: 'Today, 12:04 PM', status: 'pending' },
    { id: 'ar-2', site: 'Reddit', reason: 'Check one technical answer referenced in documentation.', duration: 10, requestedAt: 'Yesterday, 4:10 PM', status: 'approved' },
    { id: 'ar-3', site: 'Instagram', reason: 'Quick break.', duration: 20, requestedAt: 'Aug 23, 3:45 PM', status: 'rejected' },
  ],
  notifications: [
    { id: 'note-1', kind: 'evidence', message: 'Abinaya verified Read 20 pages.', createdAt: 'Yesterday, 9:22 PM', read: false },
  ],
}
