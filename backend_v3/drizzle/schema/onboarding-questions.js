import { pgTable, uuid, varchar, boolean, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

export const onboardingQuestions = pgTable('onboarding_questions', {
  id:           uuid('id').primaryKey().defaultRandom(),
  code:         varchar('code', { length: 60 }).unique().notNull(),  // stable key, e.g. 'own_vehicle'
  questionType: varchar('question_type', { length: 20 }).notNull(),
  // 'single_choice' | 'multiple_choice' | 'dropdown' | 'yes_no' | 'rating' | 'text' | 'number' | 'date'
  isRequired:   boolean('is_required').default(false),
  sortOrder:    integer('sort_order').default(0),
  isActive:     boolean('is_active').default(true),
  countryId:    uuid('country_id').references(() => countries.id),  // null = applies globally
  minValue:     integer('min_value'),        // for 'number'/'rating'
  maxValue:     integer('max_value'),
  dependsOnQuestionId: uuid('depends_on_question_id').references(() => onboardingQuestions.id),
  dependsOnOperator:   varchar('depends_on_operator', { length: 20 }), // 'equals' | 'not_equals' | 'in' | 'gt' | 'lt'
  dependsOnValue:      jsonb('depends_on_value'),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});
