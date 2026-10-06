const fs = require('fs');
const path = require('path');

const file = path.resolve('lib/common/entities/driver_profile.dart');
const content = fs.readFileSync(file, 'utf8');

let newContent = content.replace(
  `  final int pendingDocuments;
  final bool isOnline;
  final DateTime? createdAt;`,
  `  final int pendingDocuments;
  final bool isOnline;
  final DateTime? createdAt;
  final List<Map<String, dynamic>> paymentMethods;`
);

newContent = newContent.replace(
  `    this.isOnline = false,
    this.createdAt,
  });`,
  `    this.isOnline = false,
    this.createdAt,
    this.paymentMethods = const [],
  });`
);

newContent = newContent.replace(
  `      createdAt: dateStr != null ? DateTime.tryParse(dateStr) : null,
    );
  }`,
  `      createdAt: dateStr != null ? DateTime.tryParse(dateStr) : null,
      paymentMethods: json['payment_methods'] != null ? List<Map<String, dynamic>>.from(json['payment_methods']) : [],
    );
  }`
);

newContent = newContent.replace(
  `      createdAt ?? this.createdAt,
    );
  }`,
  `      createdAt ?? this.createdAt,
      paymentMethods: paymentMethods ?? this.paymentMethods,
    );
  }`
);

newContent = newContent.replace(
  `    DateTime? createdAt,
  }) {`,
  `    DateTime? createdAt,
    List<Map<String, dynamic>>? paymentMethods,
  }) {`
);

newContent = newContent.replace(
  `        isOnline,
        createdAt,
      ];
}`,
  `        isOnline,
        createdAt,
        paymentMethods,
      ];
}`
);

fs.writeFileSync(file, newContent);
