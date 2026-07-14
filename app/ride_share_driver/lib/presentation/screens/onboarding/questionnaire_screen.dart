import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import '../../../domain/entities/question.dart';
import '../../widgets/custom_toast.dart';

class QuestionnaireScreen extends StatefulWidget {
  final List<OnboardingQuestion> questions;
  final List<DriverAnswer> existingAnswers;
  final Function(List<Map<String, dynamic>>) onSubmit;

  const QuestionnaireScreen({
    super.key,
    required this.questions,
    required this.existingAnswers,
    required this.onSubmit,
  });

  @override
  State<QuestionnaireScreen> createState() => _QuestionnaireScreenState();
}

class _QuestionnaireScreenState extends State<QuestionnaireScreen> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, dynamic> _answers = {};

  @override
  void initState() {
    super.initState();
    // Do not pre-fill answers to ensure no options are selected at the beginning
  }

  void _submit() {
    debugPrint('[QuestionnaireScreen] Submit clicked. Answers: $_answers');

    // Validate that all required questions have an entry in the answers map
    bool allAnswered = true;
    for (final q in widget.questions) {
      if (q.required && !_answers.containsKey(q.id)) {
        allAnswered = false;
        break;
      }
    }

    if (!allAnswered) {
      CustomToast.show(context, 'Please answer all questions');
      return;
    }

    if (_formKey.currentState!.validate()) {
      final List<Map<String, dynamic>> submitList = [];
      _answers.forEach((key, value) {
        submitList.add({'questionId': key, 'value': value});
      });
      widget.onSubmit(submitList);
    } else {
      debugPrint('[QuestionnaireScreen] Validation failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(24.0),
              children: [
                const Text(
                  'Onboarding Survey',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Please answer these quick questions required by operations limits.',
                  style: TextStyle(
                    fontSize: 15,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 32),
                ...widget.questions.map((q) => _buildQuestionField(q)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: ElevatedButton(
              onPressed: () {
                debugPrint(
                  '[QuestionnaireScreen] Submit Survey button clicked',
                );
                _submit();
              },
              child: const Text('Submit Survey'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionField(OnboardingQuestion q) {
    final initialVal = _answers[q.id];

    if (q.type == 'yes_no') {
      final bool? currentVal = initialVal is bool
          ? initialVal
          : (initialVal == 'true' || initialVal == 1);
      return Container(
        margin: const EdgeInsets.only(bottom: 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              q.label,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: AppColors.textPrimary,
              ),
            ),
            if (q.description != null) ...[
              const SizedBox(height: 4),
              Text(
                q.description!,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      debugPrint(
                        '[QuestionnaireScreen] Yes clicked for question: ${q.code}',
                      );
                      setState(() {
                        _answers[q.id] = true;
                      });
                    },
                    style: OutlinedButton.styleFrom(
                      backgroundColor: currentVal == true
                          ? AppColors.primary.withOpacity(0.1)
                          : Colors.transparent,
                      side: BorderSide(
                        color: currentVal == true
                            ? AppColors.primary
                            : AppColors.border,
                      ),
                    ),
                    child: const Text('Yes'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      debugPrint(
                        '[QuestionnaireScreen] No clicked for question: ${q.code}',
                      );
                      setState(() {
                        _answers[q.id] = false;
                      });
                    },
                    style: OutlinedButton.styleFrom(
                      backgroundColor: currentVal == false
                          ? AppColors.primary.withOpacity(0.1)
                          : Colors.transparent,
                      side: BorderSide(
                        color: currentVal == false
                            ? AppColors.primary
                            : AppColors.border,
                      ),
                    ),
                    child: const Text('No'),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    if (q.type == 'number') {
      return Container(
        margin: const EdgeInsets.only(bottom: 24),
        child: TextFormField(
          initialValue: initialVal?.toString() ?? '',
          keyboardType: TextInputType.number,
          decoration: InputDecoration(
            labelText: q.label,
            helperText: q.description,
          ),
          validator: (val) {
            if (q.required && (val == null || val.isEmpty)) {
              return 'This field is required';
            }
            if (val != null && val.isNotEmpty) {
              final numVal = int.tryParse(val);
              if (numVal == null) return 'Please enter a valid number';
              if (q.minValue != null && numVal < q.minValue!)
                return 'Must be at least ${q.minValue}';
              if (q.maxValue != null && numVal > q.maxValue!)
                return 'Must be less than ${q.maxValue}';
            }
            return null;
          },
          onChanged: (val) {
            debugPrint(
              '[QuestionnaireScreen] Number input changed for ${q.code}: $val',
            );
            _answers[q.id] = int.tryParse(val) ?? val;
          },
        ),
      );
    }

    // Fallback simple text input
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      child: TextFormField(
        initialValue: initialVal?.toString() ?? '',
        decoration: InputDecoration(
          labelText: q.label,
          helperText: q.description,
        ),
        validator: (val) {
          if (q.required && (val == null || val.isEmpty)) {
            return 'This field is required';
          }
          return null;
        },
        onChanged: (val) {
          debugPrint(
            '[QuestionnaireScreen] Text input changed for ${q.code}: $val',
          );
          _answers[q.id] = val;
        },
      ),
    );
  }
}
