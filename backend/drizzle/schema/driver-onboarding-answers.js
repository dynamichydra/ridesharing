import { pgTable, uuid, jsonb, timestamp, unique } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';
import { onboardingQuestions } from './onboarding-questions.js';

export const driverOnboardingAnswers = pgTable('driver_onboarding_answers', {
  id:          uuid('id').primaryKey().defaultRandom(),
  driverId:    uuid('driver_id').references(() => drivers.id).notNull(),
  questionId:  uuid('question_id').references(() => onboardingQuestions.id).notNull(),
  answerValue: jsonb('answer_value').notNull(), // string | number | boolean | string[] | ISO date
  answeredAt:  timestamp('answered_at').defaultNow(),
}, (t) => ([
  unique().on(t.driverId, t.questionId),
]));
