const fs = require('fs');
const path = require('path');

const file = path.resolve('lib/features/subscription/presentation/screens/subscription_plans_screen.dart');
const content = fs.readFileSync(file, 'utf8');

// Replace the state variables
let newContent = content.replace(
  `  bool _isProcessing = false;`,
  `  bool _isProcessing = false;
  String _selectedPaymentMethodId = 'wallet'; // Default to wallet or standard gateway
`
);

// Add the payment selector logic in the bottom sheet before the Action button
newContent = newContent.replace(
  `              // Action button (Matches Card Color)`,
  `              // Payment Method Selector
              if (_activeSubscription == null || true) ...[
                const SizedBox(height: 12),
                const Text('Payment Method', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                const SizedBox(height: 8),
                InkWell(
                  onTap: () {
                    showModalBottomSheet(
                      context: sheetCtx,
                      backgroundColor: Colors.white,
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                      builder: (ctx) {
                        List<Map<String, dynamic>> pms = [];
                        final authState = context.read<AuthBloc>().state;
                        if (authState is Authenticated) {
                          pms = authState.driver.paymentMethods;
                        }
                        
                        return SafeArea(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Padding(
                                padding: EdgeInsets.all(16.0),
                                child: Text('Select Payment Method', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                              ),
                              const Divider(height: 1),
                              ListTile(
                                leading: const Icon(Icons.account_balance_wallet_rounded, color: Color(0xFF009048)),
                                title: const Text('Ryva Wallet / Default Gateway', style: TextStyle(fontWeight: FontWeight.bold)),
                                trailing: _selectedPaymentMethodId == 'wallet' ? const Icon(Icons.check_circle_rounded, color: Color(0xFF009048)) : null,
                                onTap: () {
                                  setState(() => _selectedPaymentMethodId = 'wallet');
                                  Navigator.pop(ctx);
                                },
                              ),
                              if (pms.isNotEmpty) const Divider(height: 1),
                              for (final pm in pms)
                                ListTile(
                                  leading: const Icon(Icons.credit_card_rounded, color: Color(0xFF009048)),
                                  title: Text('•••• \${pm['last4'] ?? '****'}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                  subtitle: Text(pm['brand']?.toString().toUpperCase() ?? 'CARD', style: const TextStyle(fontSize: 12)),
                                  trailing: _selectedPaymentMethodId == pm['id'] ? const Icon(Icons.check_circle_rounded, color: Color(0xFF009048)) : null,
                                  onTap: () {
                                    setState(() => _selectedPaymentMethodId = pm['id']?.toString() ?? 'wallet');
                                    Navigator.pop(ctx);
                                  },
                                ),
                              const Divider(height: 1),
                              ListTile(
                                leading: const Icon(Icons.add_circle_outline_rounded, color: Color(0xFF0065B3)),
                                title: const Text('Add / Manage Cards', style: TextStyle(color: Color(0xFF0065B3), fontWeight: FontWeight.bold)),
                                onTap: () {
                                  Navigator.pop(ctx);
                                  // In real app, push to payment methods page here.
                                  // For now, it might be in Profile -> Payment Methods.
                                },
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _selectedPaymentMethodId == 'wallet' ? Icons.account_balance_wallet_rounded : Icons.credit_card_rounded,
                          color: const Color(0xFF009048),
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Builder(
                            builder: (context) {
                              if (_selectedPaymentMethodId == 'wallet') {
                                return const Text('Ryva Wallet / Default Gateway', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600));
                              }
                              
                              String cardText = 'Saved Card';
                              final authState = context.read<AuthBloc>().state;
                              if (authState is Authenticated) {
                                for (final pm in authState.driver.paymentMethods) {
                                  if (pm['id'] == _selectedPaymentMethodId) {
                                    cardText = '\${pm['brand']?.toString().toUpperCase() ?? 'CARD'} •••• \${pm['last4'] ?? '****'}';
                                    break;
                                  }
                                }
                              }
                              return Text(cardText, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600));
                            },
                          ),
                        ),
                        const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // Action button (Matches Card Color)`
);

// Update _bloc.add
newContent = newContent.replace(
  `                    _bloc.add(PurchasePlanRequested(planId: plan.id));`,
  `                    _bloc.add(PurchasePlanRequested(
                      planId: plan.id,
                      paymentMethodId: _selectedPaymentMethodId == 'wallet' ? null : _selectedPaymentMethodId,
                    ));`
);

fs.writeFileSync(file, newContent);
