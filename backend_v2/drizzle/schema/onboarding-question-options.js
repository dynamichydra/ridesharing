import { pgTable, uuid, varchar, boolean, integer } from 'drizzle-orm/pg-core';
import { onboardingQuestions } from './onboarding-questions.js';

export const onboardingQuestionOptions = pgTable('onboarding_question_options', {
  id:         uuid('id').primaryKey().defaultRandom(),
  questionId: uuid('question_id').references(() => onboardingQuestions.id).notNull(),
  code:       varchar('code', { length: 60 }).notNull(),   // stable value key
  sortOrder:  integer('sort_order').default(0),
  isActive:   boolean('is_active').default(true),
});
