import 'package:flutter/material.dart';
import '../../../../injection_container.dart';
import '../../../../core/widgets/custom_toast.dart';
import '../../../../core/widgets/loading_view.dart';
import '../../data/datasources/trusted_contacts_datasource.dart';

class TrustedContactsPage extends StatefulWidget {
  const TrustedContactsPage({super.key});

  @override
  State<TrustedContactsPage> createState() => _TrustedContactsPageState();
}

class _TrustedContactsPageState extends State<TrustedContactsPage> {
  final TrustedContactsDataSource _dataSource = sl<TrustedContactsDataSource>();
  List<Map<String, dynamic>> _contacts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadContacts();
  }

  Future<void> _loadContacts() async {
    setState(() => _isLoading = true);
    final list = await _dataSource.getTrustedContacts();
    if (mounted) {
      setState(() {
        _contacts = list;
        _isLoading = false;
      });
    }
  }

  void _showAddContactDialog() {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final relCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Add Trusted Contact', style: TextStyle(fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'Full Name', hintText: 'e.g. Jane Doe'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(labelText: 'Phone Number', hintText: 'e.g. +91 9876543210'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: relCtrl,
                decoration: const InputDecoration(labelText: 'Relationship (Optional)', hintText: 'e.g. Sister, Spouse'),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                final name = nameCtrl.text.trim();
                final phone = phoneCtrl.text.trim();
                if (name.isEmpty || phone.isEmpty) {
                  CustomToast.show(context, 'Please fill in name and phone number');
                  return;
                }
                Navigator.pop(ctx);
                try {
                  await _dataSource.addTrustedContact(name, phone, relationship: relCtrl.text.trim());
                  CustomToast.show(context, 'Trusted contact added!');
                  _loadContacts();
                } catch (e) {
                  CustomToast.show(context, 'Failed to add contact: $e');
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF009048),
                foregroundColor: Colors.white,
              ),
              child: const Text('Save Contact'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _deleteContact(String id) async {
    try {
      await _dataSource.deleteTrustedContact(id);
      CustomToast.show(context, 'Contact removed');
      _loadContacts();
    } catch (e) {
      CustomToast.show(context, 'Failed to remove contact: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trusted Contacts', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: const Color(0xFF0F172A),
      ),
      backgroundColor: const Color(0xFFF8FAFC),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showAddContactDialog,
        backgroundColor: const Color(0xFF009048),
        icon: const Icon(Icons.person_add_rounded, color: Colors.white),
        label: const Text('Add Contact', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const LoadingView()
          : _contacts.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.shield_outlined, size: 64, color: Color(0xFF94A3B8)),
                        SizedBox(height: 16),
                        Text(
                          'No Trusted Contacts Yet',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Add emergency contacts to share live trip status and receive instant SOS notifications.',
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 14, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _contacts.length,
                  itemBuilder: (context, index) {
                    final c = _contacts[index];
                    final name = c['name']?.toString() ?? 'Contact';
                    final phone = c['phone']?.toString() ?? '';
                    final rel = c['relationship']?.toString() ?? '';
                    final id = c['id']?.toString() ?? '';

                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFFE2E8F0),
                          child: Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'C',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                          ),
                        ),
                        title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('$phone${rel.isNotEmpty ? " • $rel" : ""}'),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: Color(0xFFE53935)),
                          onPressed: () => _deleteContact(id),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
