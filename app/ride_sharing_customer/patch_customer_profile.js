const fs = require('fs');
const path = require('path');

const file = path.resolve('lib/features/profile/presentation/pages/edit_profile_page.dart');
const content = fs.readFileSync(file, 'utf8');

// 1. Add _currencyCode
let newContent = content.replace(
  `  String _phonePrefix = '+91 ';\n  bool _initialized = false;`,
  `  String _phonePrefix = '+91 ';\n  String _currencyCode = 'INR';\n  bool _initialized = false;`
);

// 2. Initialize it
newContent = newContent.replace(
  `              _phoneController = TextEditingController(text: phoneBody);
              _phonePrefix = phonePrefix;
              _initialized = true;`,
  `              _phoneController = TextEditingController(text: phoneBody);
              _phonePrefix = phonePrefix;
              _currencyCode = state.userProfile['currency_code']?.toString().toUpperCase() ?? 'INR';
              _initialized = true;`
);

// 3. Update submit
newContent = newContent.replace(
  `              name: _nameController.text.trim(),
              email: _emailController.text.trim(),
              phone: '$_phonePrefix\${_phoneController.text.trim()}',
            ),`,
  `              name: _nameController.text.trim(),
              email: _emailController.text.trim(),
              phone: '$_phonePrefix\${_phoneController.text.trim()}',
              currencyCode: _currencyCode,
            ),`
);

// 4. Add dropdown UI just below phone number card
newContent = newContent.replace(
  `                      // Phone Number Card
                      _buildEditableFieldCard(
                        icon: const Icon(Icons.phone_outlined, color: Color(0xFF009048), size: 22),
                        label: 'Phone Number',
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        prefixText: _phonePrefix,
                      ),

                      const SizedBox(height: 12),`,
  `                      // Phone Number Card
                      _buildEditableFieldCard(
                        icon: const Icon(Icons.phone_outlined, color: Color(0xFF009048), size: 22),
                        label: 'Phone Number',
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        prefixText: _phonePrefix,
                      ),

                      // Currency Preference Card
                      Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            const Padding(
                              padding: EdgeInsets.only(right: 12.0),
                              child: Icon(Icons.payments_outlined, color: Color(0xFF009048), size: 22),
                            ),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Padding(
                                    padding: EdgeInsets.only(top: 8),
                                    child: Text(
                                      'Preferred Currency',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Color(0xFF718096),
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                  DropdownButtonHideUnderline(
                                    child: DropdownButton<String>(
                                      value: _currencyCode,
                                      isExpanded: true,
                                      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF0A2540)),
                                      style: const TextStyle(
                                        fontSize: 15,
                                        color: Color(0xFF0A2540),
                                        fontWeight: FontWeight.bold,
                                      ),
                                      items: const [
                                        DropdownMenuItem(value: 'INR', child: Text('INR (₹)')),
                                        DropdownMenuItem(value: 'USD', child: Text('USD ($)')),
                                        DropdownMenuItem(value: 'EUR', child: Text('EUR (€)')),
                                        DropdownMenuItem(value: 'GBP', child: Text('GBP (£)')),
                                        DropdownMenuItem(value: 'CAD', child: Text('CAD ($)')),
                                      ],
                                      onChanged: (String? newValue) {
                                        if (newValue != null) {
                                          setState(() {
                                            _currencyCode = newValue;
                                          });
                                        }
                                      },
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 12),`
);

fs.writeFileSync(file, newContent);
