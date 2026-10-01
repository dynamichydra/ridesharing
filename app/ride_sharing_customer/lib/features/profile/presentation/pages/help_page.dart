import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../injection_container.dart';
import '../../../support/data/datasources/support_datasource.dart';
import '../../../support/presentation/bloc/support_bloc.dart';
import '../../../support/data/models/support_models.dart';

class HelpPage extends StatelessWidget {
  const HelpPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<SupportBloc>(
      create: (context) => SupportBloc(supportDataSource: sl<SupportDataSource>())
        ..add(FetchHelpCenterEvent()),
      child: const HelpPageView(),
    );
  }
}

class HelpPageView extends StatefulWidget {
  const HelpPageView({super.key});

  @override
  State<HelpPageView> createState() => _HelpPageViewState();
}

class _HelpPageViewState extends State<HelpPageView> {
  final TextEditingController _searchController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Help & Support Center',
          style: TextStyle(color: Color(0xFF021B47), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.black87, size: 18),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.confirmation_number_outlined, color: Color(0xFF01A34D)),
            tooltip: 'My Tickets',
            onPressed: () => _showTicketHistoryModal(context),
          ),
        ],
      ),
      body: BlocBuilder<SupportBloc, SupportState>(
        builder: (context, state) {
          if (state is SupportLoadingState) {
            return const Center(child: CircularProgressIndicator(color: Color(0xFF01A34D)));
          }

          if (state is HelpCenterLoadedState) {
            return RefreshIndicator(
              onRefresh: () async {
                context.read<SupportBloc>().add(FetchHelpCenterEvent());
              },
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Search Bar
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: (val) {
                        context.read<SupportBloc>().add(FetchHelpCenterEvent(searchQuery: val));
                      },
                      decoration: const InputDecoration(
                        hintText: 'Search FAQ articles or issues...',
                        prefixIcon: Icon(Icons.search, color: Color(0xFF8A94A6)),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Categories Section
                  const Text(
                    'Support Categories',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                  ),
                  const SizedBox(height: 10),

                  state.categories.isEmpty
                      ? _buildEmptyState('No categories available')
                      : GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 1.4,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                          itemCount: state.categories.length,
                          itemBuilder: (context, index) {
                            final cat = state.categories[index];
                            return _buildCategoryCard(context, cat);
                          },
                        ),

                  const SizedBox(height: 24),

                  // FAQs Section
                  const Text(
                    'Frequently Asked Questions',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF021B47)),
                  ),
                  const SizedBox(height: 10),

                  state.faqs.isEmpty
                      ? _buildEmptyState('No FAQ articles found')
                      : Column(
                          children: state.faqs.map((faq) => _buildFaqTile(faq)).toList(),
                        ),

                  const SizedBox(height: 30),
                ],
              ),
            );
          }

          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
                const SizedBox(height: 12),
                const Text('Failed to load Support Center'),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => context.read<SupportBloc>().add(FetchHelpCenterEvent()),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF01A34D)),
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        },
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SizedBox(
          height: 48,
          child: ElevatedButton.icon(
            onPressed: () => _showCreateTicketModal(context),
            icon: const Icon(Icons.add_comment_outlined, color: Colors.white),
            label: const Text(
              'Create Support Ticket',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF01A34D),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryCard(BuildContext context, SupportCategoryModel category) {
    return InkWell(
      onTap: () => _showCreateTicketForCategory(context, category),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E7E9)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF01A34D).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.help_outline, color: Color(0xFF01A34D), size: 20),
            ),
            const SizedBox(height: 8),
            Text(
              category.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF021B47)),
            ),
            if (category.description != null) ...[
              const SizedBox(height: 2),
              Text(
                category.description!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 10, color: Color(0xFF8A94A6)),
              ),
            ]
          ],
        ),
      ),
    );
  }

  Widget _buildFaqTile(SupportFaqModel faq) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E7E9)),
      ),
      child: ExpansionTile(
        title: Text(
          faq.question,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Color(0xFF021B47)),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Text(
              faq.answer,
              style: const TextStyle(fontSize: 13, color: Color(0xFF4B5563), height: 1.4),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(String text) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
      child: Center(child: Text(text, style: const TextStyle(color: Color(0xFF8A94A6), fontSize: 12))),
    );
  }

  void _showTicketHistoryModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.75,
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('My Support Tickets', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const Divider(),
              Expanded(
                child: FutureBuilder<List<SupportTicketModel>>(
                  future: sl<SupportDataSource>().getUserTickets(),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator(color: Color(0xFF01A34D)));
                    }
                    final tickets = snapshot.data ?? [];
                    if (tickets.isEmpty) {
                      return const Center(child: Text('No support tickets created yet.'));
                    }
                    return ListView.builder(
                      itemCount: tickets.length,
                      itemBuilder: (context, index) {
                        final t = tickets[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(t.subject, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text('#${t.ticketNumber} • Status: ${t.status.toUpperCase()}'),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: () {
                              Navigator.pop(ctx);
                              _openTicketChat(context, t.id);
                            },
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showCreateTicketModal(BuildContext context) async {
    final categories = await sl<SupportDataSource>().getCategories();
    if (categories.isNotEmpty) {
      _showCreateTicketForCategory(context, categories.first);
    }
  }

  void _showCreateTicketForCategory(BuildContext context, SupportCategoryModel category) {
    final subjectController = TextEditingController();
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
              Text('Create Ticket: ${category.name}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              TextField(
                controller: subjectController,
                decoration: const InputDecoration(labelText: 'Subject / Summary', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Describe your issue in detail', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF01A34D)),
                  onPressed: () async {
                    if (subjectController.text.trim().isEmpty || descController.text.trim().isEmpty) return;
                    try {
                      final t = await sl<SupportDataSource>().createTicket(
                        categoryId: category.id,
                        subject: subjectController.text.trim(),
                        description: descController.text.trim(),
                      );
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Ticket #${t.ticketNumber} submitted!')),
                      );
                      _openTicketChat(context, t.id);
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Error: ${e.toString()}')),
                      );
                    }
                  },
                  child: const Text('Submit Ticket', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }

  void _openTicketChat(BuildContext context, String ticketId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        final messageController = TextEditingController();
        return Container(
          height: MediaQuery.of(context).size.height * 0.85,
          padding: const EdgeInsets.all(16),
          child: StatefulBuilder(
            builder: (context, setModalState) {
              return FutureBuilder<SupportTicketModel>(
                future: sl<SupportDataSource>().getTicketDetails(ticketId),
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
                            final isMe = m.senderType == 'rider';
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
                              decoration: const InputDecoration(hintText: 'Type a message...'),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.send, color: Color(0xFF01A34D)),
                            onPressed: () async {
                              if (messageController.text.trim().isEmpty) return;
                              await sl<SupportDataSource>().addMessage(ticketId, messageController.text.trim());
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
