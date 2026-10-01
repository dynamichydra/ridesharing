import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../data/datasources/driver_support_remote_datasource.dart';
import '../../data/models/driver_support_models.dart';

class DriverSupportHubPage extends StatefulWidget {
  const DriverSupportHubPage({super.key});

  @override
  State<DriverSupportHubPage> createState() => _DriverSupportHubPageState();
}

class _DriverSupportHubPageState extends State<DriverSupportHubPage> {
  final DriverSupportRemoteDataSource _dataSource = sl<DriverSupportRemoteDataSource>();

  List<DriverSupportCategoryModel> _categories = [];
  List<DriverSupportFaqModel> _faqs = [];
  List<DriverSupportTicketModel> _tickets = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final cats = await _dataSource.getCategories();
      final faqs = await _dataSource.getFaqs();
      final tickets = await _dataSource.getDriverTickets();

      setState(() {
        _categories = cats;
        _faqs = faqs;
        _tickets = tickets;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F6F8),
      appBar: AppBar(
        title: const Text(
          'Driver Support Hub',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white),
        ),
        backgroundColor: const Color(0xFF021B47),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF01A34D)))
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Banner Header
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF021B47), Color(0xFF01A34D)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Driver Ops & Support',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Resolve fare disputes, payout delays, and document verification queries in real-time.',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Quick Action Dispute Wizards
                  const Text('Quick Issue Wizard', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
                  const SizedBox(height: 10),

                  Row(
                    children: [
                      Expanded(
                        child: _buildQuickWizardCard(
                          icon: Icons.toll,
                          title: 'Toll Reimbursement',
                          color: Colors.orange,
                          onTap: () => _openCreateTicketWizard('Toll Reimbursement Claim'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildQuickWizardCard(
                          icon: Icons.payments,
                          title: 'Cash Discrepancy',
                          color: Colors.green,
                          onTap: () => _openCreateTicketWizard('Cash Collection Issue'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _buildQuickWizardCard(
                          icon: Icons.account_balance_wallet,
                          title: 'Payout Inquiry',
                          color: Colors.blue,
                          onTap: () => _openCreateTicketWizard('Weekly Payout Inquiry'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildQuickWizardCard(
                          icon: Icons.assignment_late,
                          title: 'Doc Rejection Appeal',
                          color: Colors.purple,
                          onTap: () => _openCreateTicketWizard('Document Rejection Appeal'),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Support Categories
                  const Text('Support Topics', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
                  const SizedBox(height: 10),

                  if (_categories.isEmpty)
                    const Text('No topics available', style: TextStyle(color: Colors.grey))
                  else
                    Column(
                      children: _categories.map((c) => _buildCategoryTile(c)).toList(),
                    ),

                  const SizedBox(height: 24),

                  // Driver Ticket History
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('My Support Tickets', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF021B47))),
                      Text('${_tickets.length} total', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (_tickets.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                      child: const Center(child: Text('No active or closed tickets.', style: TextStyle(color: Colors.grey))),
                    )
                  else
                    Column(
                      children: _tickets.map((t) => _buildTicketTile(t)).toList(),
                    ),

                  const SizedBox(height: 30),
                ],
              ),
            ),
    );
  }

  Widget _buildQuickWizardCard({
    required IconData icon,
    required String title,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E7E9)),
        ),
        child: Column(
          children: [
            CircleAvatar(
              backgroundColor: color.withOpacity(0.1),
              radius: 20,
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryTile(DriverSupportCategoryModel category) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E7E9)),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFF01A34D).withOpacity(0.1),
          child: const Icon(Icons.help_outline, color: Color(0xFF01A34D)),
        ),
        title: Text(category.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text(category.description ?? 'Support topic', style: const TextStyle(fontSize: 11, color: Colors.grey)),
        trailing: const Icon(Icons.chevron_right, size: 18),
        onTap: () => _openCreateTicketWizard(category.name, categoryId: category.id),
      ),
    );
  }

  Widget _buildTicketTile(DriverSupportTicketModel ticket) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE2E7E9)),
      ),
      child: ListTile(
        title: Text(ticket.subject, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text('#${ticket.ticketNumber} • Status: ${ticket.status.toUpperCase()}'),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: ticket.status == 'open' ? Colors.blue[50] : Colors.green[50],
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            ticket.status.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: ticket.status == 'open' ? Colors.blue : Colors.green,
            ),
          ),
        ),
        onTap: () => _openTicketChatModal(ticket.id),
      ),
    );
  }

  void _openCreateTicketWizard(String defaultSubject, {String? categoryId}) {
    final subjectController = TextEditingController(text: defaultSubject);
    final descController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 16, right: 16, top: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Submit Ticket: $defaultSubject', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              TextField(
                controller: subjectController,
                decoration: const InputDecoration(labelText: 'Subject', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Provide trip/payout details...', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF01A34D)),
                  onPressed: () async {
                    if (descController.text.trim().isEmpty) return;
                    try {
                      final targetCatId = categoryId ?? (_categories.isNotEmpty ? _categories.first.id : '');
                      final t = await _dataSource.createTicket(
                        categoryId: targetCatId,
                        subject: subjectController.text.trim(),
                        description: descController.text.trim(),
                      );
                      Navigator.pop(ctx);
                      _loadData();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Driver ticket #${t.ticketNumber} created!')),
                      );
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Error: ${e.toString()}')),
                      );
                    }
                  },
                  child: const Text('Submit to Support Ops', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }

  void _openTicketChatModal(String ticketId) {
    final messageController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.85,
          padding: const EdgeInsets.all(16),
          child: StatefulBuilder(
            builder: (context, setModalState) {
              return FutureBuilder<DriverSupportTicketModel>(
                future: _dataSource.getTicketDetails(ticketId),
                builder: (context, snapshot) {
                  if (!snapshot.hasData) {
                    return const Center(child: CircularProgressIndicator(color: Color(0xFF01A34D)));
                  }
                  final ticket = snapshot.data!;
                  return Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Ticket #${ticket.ticketNumber}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              Text(ticket.subject, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                            ],
                          ),
                          IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                        ],
                      ),
                      const Divider(),
                      Expanded(
                        child: ListView.builder(
                          itemCount: ticket.messages.length,
                          itemBuilder: (context, index) {
                            final m = ticket.messages[index];
                            final isMe = m.senderType == 'driver';
                            return Align(
                              alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                              child: Container(
                                margin: const EdgeInsets.symmetric(vertical: 4),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: isMe ? const Color(0xFF01A34D) : Colors.grey[200],
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  m.content,
                                  style: TextStyle(color: isMe ? Colors.white : Colors.black87),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: messageController,
                              decoration: const InputDecoration(hintText: 'Reply to agent...'),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.send, color: Color(0xFF01A34D)),
                            onPressed: () async {
                              if (messageController.text.trim().isEmpty) return;
                              await _dataSource.addMessage(ticketId, messageController.text.trim());
                              messageController.clear();
                              setModalState(() {});
                            },
                          ),
                        ],
                      ),
                    ],
                  );
                },
              );
            },
          ),
        );
      },
    );
  }
}
