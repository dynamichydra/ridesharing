import 'dart:async';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/datasources/wallet_remote_datasource.dart';
import '../../data/models/payout_item.dart';

// ── Events ────────────────────────────────────────────────────────────────────
abstract class PayoutHistoryEvent extends Equatable {
  const PayoutHistoryEvent();
  @override
  List<Object?> get props => [];
}

class LoadPayoutHistory extends PayoutHistoryEvent {
  final String? status;
  final bool isRefresh;

  const LoadPayoutHistory({this.status, this.isRefresh = false});

  @override
  List<Object?> get props => [status, isRefresh];
}

class LoadMorePayoutHistory extends PayoutHistoryEvent {
  const LoadMorePayoutHistory();
}

class FilterPayoutStatus extends PayoutHistoryEvent {
  final String? status;

  const FilterPayoutStatus(this.status);

  @override
  List<Object?> get props => [status];
}

// ── States ────────────────────────────────────────────────────────────────────
abstract class PayoutHistoryState extends Equatable {
  const PayoutHistoryState();
  @override
  List<Object?> get props => [];
}

class PayoutHistoryInitial extends PayoutHistoryState {}

class PayoutHistoryLoading extends PayoutHistoryState {}

class PayoutHistoryLoaded extends PayoutHistoryState {
  final List<PayoutItem> payouts;
  final PayoutPagination pagination;
  final String? selectedStatus;
  final bool isLoadingMore;
  final String? actionError;

  const PayoutHistoryLoaded({
    required this.payouts,
    required this.pagination,
    this.selectedStatus,
    this.isLoadingMore = false,
    this.actionError,
  });

  double get totalCompletedAmount => payouts
      .where((p) => p.isCompleted)
      .fold<double>(0.0, (sum, p) => sum + p.amount);

  int get completedCount => payouts.where((p) => p.isCompleted).length;
  int get pendingCount => payouts.where((p) => p.isPending || p.isProcessing).length;
  int get failedCount => payouts.where((p) => p.isFailed).length;

  PayoutHistoryLoaded copyWith({
    List<PayoutItem>? payouts,
    PayoutPagination? pagination,
    String? selectedStatus,
    bool? isLoadingMore,
    String? actionError,
  }) {
    return PayoutHistoryLoaded(
      payouts: payouts ?? this.payouts,
      pagination: pagination ?? this.pagination,
      selectedStatus: selectedStatus ?? this.selectedStatus,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      actionError: actionError,
    );
  }

  @override
  List<Object?> get props => [
        payouts,
        pagination,
        selectedStatus,
        isLoadingMore,
        actionError,
      ];
}

class PayoutHistoryError extends PayoutHistoryState {
  final String message;

  const PayoutHistoryError(this.message);

  @override
  List<Object?> get props => [message];
}

// ── BLoC ──────────────────────────────────────────────────────────────────────
class PayoutHistoryBloc extends Bloc<PayoutHistoryEvent, PayoutHistoryState> {
  final WalletRemoteDataSource dataSource;

  PayoutHistoryBloc({required this.dataSource}) : super(PayoutHistoryInitial()) {
    on<LoadPayoutHistory>(_onLoad);
    on<LoadMorePayoutHistory>(_onLoadMore);
    on<FilterPayoutStatus>(_onFilterStatus);
  }

  Future<void> _onLoad(
    LoadPayoutHistory event,
    Emitter<PayoutHistoryState> emit,
  ) async {
    if (!event.isRefresh) {
      emit(PayoutHistoryLoading());
    }

    try {
      final effectiveStatus = event.status;
      final result = await dataSource.getPayoutHistory(
        status: effectiveStatus,
        page: 1,
        limit: 20,
      );

      emit(PayoutHistoryLoaded(
        payouts: result.payouts,
        pagination: result.pagination,
        selectedStatus: effectiveStatus,
      ));
    } catch (e) {
      emit(PayoutHistoryError(e.toString()));
    }
  }

  Future<void> _onFilterStatus(
    FilterPayoutStatus event,
    Emitter<PayoutHistoryState> emit,
  ) async {
    final current = state;
    final previousPayouts = current is PayoutHistoryLoaded ? current.payouts : <PayoutItem>[];
    final previousPagination = current is PayoutHistoryLoaded ? current.pagination : const PayoutPagination();

    emit(PayoutHistoryLoading());
    try {
      final result = await dataSource.getPayoutHistory(
        status: event.status,
        page: 1,
        limit: 20,
      );

      emit(PayoutHistoryLoaded(
        payouts: result.payouts,
        pagination: result.pagination,
        selectedStatus: event.status,
      ));
    } catch (e) {
      if (previousPayouts.isNotEmpty) {
        emit(PayoutHistoryLoaded(
          payouts: previousPayouts,
          pagination: previousPagination,
          selectedStatus: event.status,
          actionError: e.toString(),
        ));
      } else {
        emit(PayoutHistoryError(e.toString()));
      }
    }
  }

  Future<void> _onLoadMore(
    LoadMorePayoutHistory event,
    Emitter<PayoutHistoryState> emit,
  ) async {
    final current = state;
    if (current is! PayoutHistoryLoaded) return;
    if (current.isLoadingMore || !current.pagination.hasNextPage) return;

    emit(current.copyWith(isLoadingMore: true));

    try {
      final nextPage = current.pagination.currentPage + 1;
      final result = await dataSource.getPayoutHistory(
        status: current.selectedStatus,
        page: nextPage,
        limit: current.pagination.itemsPerPage,
      );

      emit(current.copyWith(
        payouts: [...current.payouts, ...result.payouts],
        pagination: result.pagination,
        isLoadingMore: false,
      ));
    } catch (e) {
      emit(current.copyWith(
        isLoadingMore: false,
        actionError: e.toString(),
      ));
    }
  }
}
