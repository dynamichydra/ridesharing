import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../injection_container.dart' as di;
import '../../domain/entities/ride_chat_message.dart';
import '../../data/datasources/ride_chat_datasource.dart';

class RideChatPage extends StatefulWidget {
  final String rideId;
  final String otherPartyName;
  final String? otherPartyAvatar;
  final String? otherPartyPhone;

  const RideChatPage({
    super.key,
    required this.rideId,
    required this.otherPartyName,
    this.otherPartyAvatar,
    this.otherPartyPhone,
  });

  @override
  State<RideChatPage> createState() => _RideChatPageState();
}

class _RideChatPageState extends State<RideChatPage> {
  late final RideChatDataSource _chatDataSource;
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<RideChatMessage> _messages = [];
  StreamSubscription<RideChatMessage>? _chatSub;
  bool _isLoading = true;

  final List<String> _quickReplies = [
    'I have arrived at the pickup location.',
    'I am in traffic, will be there in 3 minutes.',
    'I am at the main gate.',
    'Please confirm your exact pickup spot.',
    'Okay, got it!',
  ];

  @override
  void initState() {
    super.initState();
    _chatDataSource = di.sl<RideChatDataSource>();
    _loadMessages();
    _listenIncoming();
    _chatDataSource.markAsRead(widget.rideId);
  }

  @override
  void dispose() {
    _chatSub?.cancel();
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    setState(() => _isLoading = true);
    try {
      final msgs = await _chatDataSource.getMessages(widget.rideId);
      if (mounted) {
        setState(() {
          _messages.clear();
          _messages.addAll(msgs);
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _listenIncoming() {
    _chatSub = _chatDataSource.onChatMessage.listen((msg) {
      if (msg.rideId == widget.rideId && mounted) {
        // Prevent duplicate messages if sender is driver and local optimistic message already in list
        final exists = _messages.any((m) => m.id == msg.id || (m.id.startsWith('temp_') && m.content == msg.content));
        if (exists) {
          final idx = _messages.indexWhere((m) => m.id == msg.id || (m.id.startsWith('temp_') && m.content == msg.content));
          if (idx != -1) {
            setState(() {
              _messages[idx] = msg;
            });
          }
        } else {
          setState(() {
            _messages.add(msg);
          });
          _scrollToBottom();
        }
        _chatDataSource.markAsRead(widget.rideId);
      }
    });
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent + 60,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty) return;

    _controller.clear();
    final tempMsg = RideChatMessage(
      id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
      rideId: widget.rideId,
      senderId: '',
      senderRole: 'driver',
      content: trimmed,
      createdAt: DateTime.now(),
    );

    setState(() {
      _messages.add(tempMsg);
    });
    _scrollToBottom();

    try {
      final saved = await _chatDataSource.sendMessage(widget.rideId, trimmed);
      if (mounted) {
        final idx = _messages.indexWhere((m) => m.id == tempMsg.id);
        if (idx != -1) {
          setState(() {
            _messages[idx] = saved;
          });
        }
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF0F172A), size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Row(
          children: [
            CircleAvatar(
              radius: 19,
              backgroundColor: const Color(0xFFE2E8F0),
              backgroundImage: widget.otherPartyAvatar != null && widget.otherPartyAvatar!.isNotEmpty
                  ? NetworkImage(widget.otherPartyAvatar!)
                  : null,
              child: widget.otherPartyAvatar == null || widget.otherPartyAvatar!.isEmpty
                  ? const Icon(Icons.person_rounded, color: Color(0xFF64748B), size: 22)
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    widget.otherPartyName,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const Text(
                    'Passenger • Live Trip',
                    style: TextStyle(fontSize: 12, color: Color(0xFF009048), fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Messages View
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFF009048)))
                  : _messages.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 64,
                                height: 64,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE8F5E9),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF009048), size: 32),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'Chat with ${widget.otherPartyName}',
                                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Coordinate pickup or arrival details in real time.',
                                style: TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          itemCount: _messages.length,
                          itemBuilder: (context, index) {
                            final msg = _messages[index];
                            final isMe = msg.senderRole == 'driver';
                            final timeStr = DateFormat('hh:mm a').format(msg.createdAt.toLocal());

                            return Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Row(
                                mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  if (!isMe) ...[
                                    CircleAvatar(
                                      radius: 13,
                                      backgroundColor: const Color(0xFFE2E8F0),
                                      child: const Icon(Icons.person, color: Color(0xFF64748B), size: 16),
                                    ),
                                    const SizedBox(width: 8),
                                  ],
                                  Flexible(
                                    child: Container(
                                      constraints: BoxConstraints(
                                        maxWidth: MediaQuery.of(context).size.width * 0.75,
                                      ),
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                      decoration: BoxDecoration(
                                        color: isMe ? const Color(0xFF009048) : Colors.white,
                                        borderRadius: BorderRadius.only(
                                          topLeft: const Radius.circular(16),
                                          topRight: const Radius.circular(16),
                                          bottomLeft: isMe ? const Radius.circular(16) : const Radius.circular(4),
                                          bottomRight: isMe ? const Radius.circular(4) : const Radius.circular(16),
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withOpacity(0.04),
                                            blurRadius: 6,
                                            offset: const Offset(0, 2),
                                          ),
                                        ],
                                        border: isMe ? null : Border.all(color: const Color(0xFFE2E8F0)),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            msg.content,
                                            style: TextStyle(
                                              fontSize: 14,
                                              color: isMe ? Colors.white : const Color(0xFF0F172A),
                                              height: 1.3,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                timeStr,
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  color: isMe ? Colors.white70 : const Color(0xFF94A3B8),
                                                ),
                                              ),
                                              if (isMe) ...[
                                                const SizedBox(width: 4),
                                                Icon(
                                                  msg.readAt != null ? Icons.done_all_rounded : Icons.done_rounded,
                                                  size: 13,
                                                  color: Colors.white70,
                                                ),
                                              ],
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
            ),

            // Quick Reply Chips
            Container(
              height: 42,
              margin: const EdgeInsets.only(bottom: 6),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                itemCount: _quickReplies.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final text = _quickReplies[index];
                  return ActionChip(
                    label: Text(
                      text,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF021B47), fontWeight: FontWeight.w500),
                    ),
                    backgroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    onPressed: () => _sendMessage(text),
                  );
                },
              ),
            ),

            // Input Bar
            Container(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 12),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: TextField(
                        controller: _controller,
                        textCapitalization: TextCapitalization.sentences,
                        maxLines: 4,
                        minLines: 1,
                        style: const TextStyle(fontSize: 14, color: Color(0xFF0F172A)),
                        decoration: const InputDecoration(
                          hintText: 'Type a message...',
                          hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          border: InputBorder.none,
                        ),
                        onSubmitted: _sendMessage,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    width: 44,
                    height: 44,
                    decoration: const BoxDecoration(
                      color: Color(0xFF009048),
                      shape: BoxShape.circle,
                    ),
                    child: IconButton(
                      icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                      onPressed: () => _sendMessage(_controller.text),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
