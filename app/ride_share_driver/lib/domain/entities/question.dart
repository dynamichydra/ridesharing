class QuestionOption {
  final String id;
  final String code;
  final String label;

  QuestionOption({
    required this.id,
    required this.code,
    required this.label,
  });

  factory QuestionOption.fromJson(Map<String, dynamic> json) {
    return QuestionOption(
      id: json['id'],
      code: json['code'],
      label: json['label'],
    );
  }
}

class OnboardingQuestion {
  final String id;
  final String code;
  final String type; // single_choice | multiple_choice | dropdown | yes_no | rating | text | number | date
  final bool required;
  final int sortOrder;
  final int? minValue;
  final int? maxValue;
  final String label;
  final String? description;
  final Map<String, dynamic>? dependsOn;
  final List<QuestionOption> options;

  OnboardingQuestion({
    required this.id,
    required this.code,
    required this.type,
    required this.required,
    required this.sortOrder,
    this.minValue,
    this.maxValue,
    required this.label,
    this.description,
    this.dependsOn,
    required this.options,
  });

  factory OnboardingQuestion.fromJson(Map<String, dynamic> json) {
    return OnboardingQuestion(
      id: json['id'],
      code: json['code'],
      type: json['type'],
      required: json['required'] ?? false,
      sortOrder: json['sortOrder'] ?? 0,
      minValue: json['minValue'],
      maxValue: json['maxValue'],
      label: json['label'],
      description: json['description'],
      dependsOn: json['dependsOn'],
      options: (json['options'] as List?)
              ?.map((o) => QuestionOption.fromJson(o))
              .toList() ??
          [],
    );
  }
}

class DriverAnswer {
  final String questionId;
  final dynamic value;

  DriverAnswer({
    required this.questionId,
    required this.value,
  });

  factory DriverAnswer.fromJson(Map<String, dynamic> json) {
    return DriverAnswer(
      questionId: json['questionId'],
      value: json['answerValue'],
    );
  }
}
