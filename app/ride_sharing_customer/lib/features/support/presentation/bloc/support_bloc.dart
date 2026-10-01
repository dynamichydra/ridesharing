import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/datasources/support_datasource.dart';
import '../../data/models/support_models.dart';

// EVENTS
abstract class SupportEvent {}

class FetchHelpCenterEvent extends SupportEvent {
  final String? searchQuery;
  FetchHelpCenterEvent({this.searchQuery});
}

class FetchTicketHistoryEvent extends SupportEvent {
  final String? status;
  FetchTicketHistoryEvent({this.status});
}

class CreateTicketEvent extends SupportEvent {
  final String categoryId;
  final String? rideId;
  final String subject;
  final String description;
  final String priority;

  CreateTicketEvent({
    required this.categoryId,
    this.rideId,
    required this.subject,
    required this.description,
    this.priority = 'medium',
  });
}

class FetchTicketDetailsEvent extends SupportEvent {
  final String ticketId;
  FetchTicketDetailsEvent(this.ticketId);
}

class SendMessageEvent extends SupportEvent {
  final String ticketId;
  final String content;
  SendMessageEvent({required this.ticketId, required this.content});
}

class SubmitCsatEvent extends SupportEvent {
  final String ticketId;
  final int rating;
  final String? feedback;
  final String? tags;

  SubmitCsatEvent({
    required this.ticketId,
    required this.rating,
    this.feedback,
    this.tags,
  });
}

// STATES
abstract class SupportState {}

class SupportInitialState extends SupportState {}

class SupportLoadingState extends SupportState {}

class HelpCenterLoadedState extends SupportState {
  final List<SupportCategoryModel> categories;
  final List<SupportFaqModel> faqs;

  HelpCenterLoadedState({required this.categories, required this.faqs});
}

class TicketHistoryLoadedState extends SupportState {
  final List<SupportTicketModel> tickets;

  TicketHistoryLoadedState({required this.tickets});
}

class TicketCreatedSuccessState extends SupportState {
  final SupportTicketModel ticket;

  TicketCreatedSuccessState(this.ticket);
}

class TicketDetailsLoadedState extends SupportState {
  final SupportTicketModel ticket;
  final List<SupportMessageModel> messages;

  TicketDetailsLoadedState({required this.ticket, required this.messages});
}

class SupportErrorState extends SupportState {
  final String message;

  SupportErrorState(this.message);
}

class CsatSubmittedSuccessState extends SupportState {}

// BLOC
class SupportBloc extends Bloc<SupportEvent, SupportState> {
  final SupportDataSource supportDataSource;

  SupportBloc({required this.supportDataSource}) : super(SupportInitialState()) {
    on<FetchHelpCenterEvent>(_onFetchHelpCenter);
    on<FetchTicketHistoryEvent>(_onFetchTicketHistory);
    on<CreateTicketEvent>(_onCreateTicket);
    on<FetchTicketDetailsEvent>(_onFetchTicketDetails);
    on<SendMessageEvent>(_onSendMessage);
    on<SubmitCsatEvent>(_onSubmitCsat);
  }

  Future<void> _onFetchHelpCenter(FetchHelpCenterEvent event, Emitter<SupportState> emit) async {
    emit(SupportLoadingState());
    try {
      final categories = await supportDataSource.getCategories();
      final faqs = await supportDataSource.getFaqs(query: event.searchQuery);
      emit(HelpCenterLoadedState(categories: categories, faqs: faqs));
    } catch (e) {
      emit(SupportErrorState(e.toString()));
    }
  }

  Future<void> _onFetchTicketHistory(FetchTicketHistoryEvent event, Emitter<SupportState> emit) async {
    emit(SupportLoadingState());
    try {
      final tickets = await supportDataSource.getUserTickets(status: event.status);
      emit(TicketHistoryLoadedState(tickets: tickets));
    } catch (e) {
      emit(SupportErrorState(e.toString()));
    }
  }

  Future<void> _onCreateTicket(CreateTicketEvent event, Emitter<SupportState> emit) async {
    emit(SupportLoadingState());
    try {
      final ticket = await supportDataSource.createTicket(
        categoryId: event.categoryId,
        rideId: event.rideId,
        subject: event.subject,
        description: event.description,
        priority: event.priority,
      );
      emit(TicketCreatedSuccessState(ticket));
    } catch (e) {
      emit(SupportErrorState(e.toString()));
    }
  }

  Future<void> _onFetchTicketDetails(FetchTicketDetailsEvent event, Emitter<SupportState> emit) async {
    emit(SupportLoadingState());
    try {
      final ticket = await supportDataSource.getTicketDetails(event.ticketId);
      emit(TicketDetailsLoadedState(ticket: ticket, messages: ticket.messages));
    } catch (e) {
      emit(SupportErrorState(e.toString()));
    }
  }

  Future<void> _onSendMessage(SendMessageEvent event, Emitter<SupportState> emit) async {
    try {
      final newMsg = await supportDataSource.addMessage(event.ticketId, event.content);
      if (state is TicketDetailsLoadedState) {
        final currentState = state as TicketDetailsLoadedState;
        emit(TicketDetailsLoadedState(
          ticket: currentState.ticket,
          messages: [...currentState.messages, newMsg],
        ));
      }
    } catch (e) {
      emit(SupportErrorState(e.toString()));
    }
  }

  Future<void> _onSubmitCsat(SubmitCsatEvent event, Emitter<SupportState> emit) async {
    try {
      await supportDataSource.submitCsat(
        event.ticketId,
        event.rating,
        feedback: event.feedback,
        tags: event.tags,
      );
      emit(CsatSubmittedSuccessState());
    } catch (e) {
      emit(SupportErrorState(e.toString()));
    }
  }
}
