import 'package:flutter/material.dart';
import '../../../style/appcolors.dart';
import '../../../domain/entities/question.dart';
import '../../../common/widgets/custom_toast.dart';
import 'widgets/three_dots_loader.dart';

class QuestionnaireScreen extends StatefulWidget {
  final List<OnboardingQuestion> questions;
  final List<DriverAnswer> existingAnswers;
  final bool isLoading;
  final Function(List<Map<String, dynamic>>) onSubmit;

  const QuestionnaireScreen({
    super.key,
    required this.questions,
    required this.existingAnswers,
    this.isLoading = false,
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
    for (final ans in widget.existingAnswers) {
      _answers[ans.questionId] = ans.value;
    }
  }

  bool _isQuestionVisible(OnboardingQuestion q) {
    if (q.dependsOn == null) return true;
    final depId = q.dependsOn!['questionId'] as String?;
    final operator = q.dependsOn!['operator'] as String?;
    final expectedValue = q.dependsOn!['value'];
    if (depId == null || operator == null) return true;

    final actualValue = _answers[depId];
    if (actualValue == null) return false;

    switch (operator) {
      case 'equals':
        return actualValue.toString() == expectedValue.toString();
      case 'not_equals':
        return actualValue.toString() != expectedValue.toString();
      case 'gt':
        final actNum = num.tryParse(actualValue.toString());
        final expNum = num.tryParse(expectedValue.toString());
        return actNum != null && expNum != null && actNum > expNum;
      case 'lt':
        final actNum = num.tryParse(actualValue.toString());
        final expNum = num.tryParse(expectedValue.toString());
        return actNum != null && expNum != null && actNum < expNum;
      case 'in':
        if (expectedValue is List) {
          return expectedValue
              .map((v) => v.toString())
              .contains(actualValue.toString());
        }
        return false;
      default:
        return false;
    }
  }

  void _submit() {
    debugPrint('[QuestionnaireScreen] Submit clicked. Answers: $_answers');

    // Only validate and submit questions that are currently visible based on prior answers
    final visibleQuestions = widget.questions
        .where((q) => _isQuestionVisible(q))
        .toList();

    bool allAnswered = true;
    for (final q in visibleQuestions) {
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
      for (final q in visibleQuestions) {
        if (_answers.containsKey(q.id)) {
          submitList.add({'questionId': q.id, 'value': _answers[q.id]});
        }
      }
      widget.onSubmit(submitList);
    } else {
      debugPrint('[QuestionnaireScreen] Validation failed');
    }
  }

  @override
  Widget build(BuildContext context) {
    final visibleQuestions = widget.questions
        .where((q) => _isQuestionVisible(q))
        .toList();

    return Form(
      key: _formKey,
      child: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(24.0),
              physics: const BouncingScrollPhysics(),
              children: [
                const Text(
                  'Onboarding Survey',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Please answer these quick questions required by operations limits.',
                  style: TextStyle(
                    fontSize: 15,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 32),
                ...visibleQuestions.map((q) => _buildQuestionField(q)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: widget.isLoading
                    ? null
                    : () {
                        debugPrint(
                          '[QuestionnaireScreen] Submit Survey button clicked',
                        );
                        _submit();
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 2,
                ),
                child: widget.isLoading
                    ? const ThreeDotsLoader()
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Submit Survey',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(width: 8),
                          Icon(Icons.arrow_forward_rounded, size: 20),
                        ],
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionField(OnboardingQuestion q) {
    final initialVal = _answers[q.id];

    // Modern input decoration builder for text/number fields
    InputDecoration buildModernInputDecoration({
      required String labelText,
      required IconData prefixIcon,
      String? suffixText,
      String? helperText,
    }) {
      return InputDecoration(
        labelText: labelText,
        labelStyle: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 14,
        ),
        floatingLabelStyle: const TextStyle(
          color: AppColors.primary,
          fontWeight: FontWeight.w600,
        ),
        prefixIcon: Icon(prefixIcon, color: AppColors.secondary, size: 22),
        suffixText: suffixText,
        suffixStyle: const TextStyle(
          color: AppColors.textSecondary,
          fontWeight: FontWeight.bold,
          fontSize: 14,
        ),
        helperText: helperText,
        helperMaxLines: 2,
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.border, width: 1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error, width: 1),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppColors.error, width: 2),
        ),
      );
    }

    if (q.type == 'yes_no') {
      final bool? currentVal = initialVal is bool
          ? initialVal
          : (initialVal == 'true' || initialVal == 1
                ? true
                : (initialVal == 'false' || initialVal == 0 ? false : null));
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
              const SizedBox(height: 6),
              Text(
                q.description!,
                style: const TextStyle(
                  fontSize: 13,
                  color: AppColors.textSecondary,
                  height: 1.3,
                ),
              ),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: OutlinedButton(
                      onPressed: () {
                        debugPrint(
                          '[QuestionnaireScreen] Yes clicked for question: ${q.code}',
                        );
                        setState(() {
                          if (currentVal == true) {
                            _answers.remove(q.id);
                          } else {
                            _answers[q.id] = true;
                          }
                        });
                      },
                      style: OutlinedButton.styleFrom(
                        backgroundColor: currentVal == true
                            ? AppColors.primary.withOpacity(0.02)
                            : Colors.white,
                        foregroundColor: currentVal == true
                            ? AppColors.secondary
                            : AppColors.textSecondary,
                        side: BorderSide(
                          color: currentVal == true
                              ? AppColors.primary
                              : AppColors.border,
                          width: currentVal == true ? 2 : 1,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle_outline_rounded, size: 18),
                          SizedBox(width: 6),
                          Text(
                            'Yes',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: OutlinedButton(
                      onPressed: () {
                        debugPrint(
                          '[QuestionnaireScreen] No clicked for question: ${q.code}',
                        );
                        setState(() {
                          if (currentVal == false) {
                            _answers.remove(q.id);
                          } else {
                            _answers[q.id] = false;
                          }
                        });
                      },
                      style: OutlinedButton.styleFrom(
                        backgroundColor: currentVal == false
                            ? AppColors.error.withOpacity(0.08)
                            : Colors.white,
                        foregroundColor: currentVal == false
                            ? AppColors.error
                            : AppColors.textSecondary,
                        side: BorderSide(
                          color: currentVal == false
                              ? AppColors.error
                              : AppColors.border,
                          width: currentVal == false ? 2 : 1,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.cancel_outlined, size: 18),
                          SizedBox(width: 6),
                          Text(
                            'No',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    }

    if (q.type == 'number') {
      final isHoursField = q.code.toLowerCase().contains('hour');
      return Container(
        margin: const EdgeInsets.only(bottom: 24),
        child: TextFormField(
          initialValue: initialVal?.toString() ?? '',
          keyboardType: TextInputType.number,
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
          decoration: buildModernInputDecoration(
            labelText: q.label,
            prefixIcon: isHoursField
                ? Icons.access_time_rounded
                : Icons.numbers_rounded,
            suffixText: isHoursField ? 'hrs' : null,
            helperText: q.description,
          ),
          validator: (val) {
            if (q.required && (val == null || val.isEmpty)) {
              return 'This field is required';
            }
            if (val != null && val.isNotEmpty) {
              final numVal = int.tryParse(val);
              if (numVal == null) return 'Please enter a valid number';
              if (q.minValue != null && numVal < q.minValue!) {
                return 'Must be at least ${q.minValue}';
              }
              if (q.maxValue != null && numVal > q.maxValue!) {
                return 'Must be less than ${q.maxValue}';
              }
            }
            return null;
          },
          onChanged: (val) {
            debugPrint(
              '[QuestionnaireScreen] Number input changed for ${q.code}: $val',
            );
            setState(() {
              if (val.trim().isEmpty) {
                _answers.remove(q.id);
              } else {
                _answers[q.id] = int.tryParse(val) ?? val;
              }
            });
          },
        ),
      );
    }

    // Fallback simple text input
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      child: TextFormField(
        initialValue: initialVal?.toString() ?? '',
        style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
        decoration: buildModernInputDecoration(
          labelText: q.label,
          prefixIcon: Icons.edit_note_rounded,
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
          setState(() {
            if (val.trim().isEmpty) {
              _answers.remove(q.id);
            } else {
              _answers[q.id] = val;
            }
          });
        },
      ),
    );
  }
}
