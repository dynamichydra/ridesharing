import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/datasources/ride_history_datasource.dart';

// ── Events ───────────────────────────────────────────────────────────────────
abstract class RideHistoryEvent {}

class LoadRideHistory extends RideHistoryEvent {
  final String? status;
  LoadRideHistory({this.status});
}

class LoadMoreRideHistory extends RideHistoryEvent {}

// ── States ───────────────────────────────────────────────────────────────────
abstract class RideHistoryState {}

class RideHistoryInitial extends RideHistoryState {}
class RideHistoryLoading extends RideHistoryState {}

class RideHistoryLoaded extends RideHistoryState {
  final List<Map<String, dynamic>> rides;
  final bool hasMore;
  final bool isLoadingMore;
  final int page;
  final String? status;

  RideHistoryLoaded({
    required this.rides,
    required this.hasMore,
    this.isLoadingMore = false,
    required this.page,
    this.status,
  });

  RideHistoryLoaded copyWith({
    List<Map<String, dynamic>>? rides,
    bool? hasMore,
    bool? isLoadingMore,
    int? page,
    String? status,
  }) {
    return RideHistoryLoaded(
      rides: rides ?? this.rides,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
      page: page ?? this.page,
      status: status ?? this.status,
    );
  }
}

class RideHistoryError extends RideHistoryState {
  final String message;
  RideHistoryError(this.message);
}

// ── BLoC ──────────────────────────────────────────────────────────────────────
class RideHistoryBloc extends Bloc<RideHistoryEvent, RideHistoryState> {
  final RideHistoryDataSource dataSource;

  RideHistoryBloc({required this.dataSource}) : super(RideHistoryInitial()) {
    on<LoadRideHistory>(_onLoad);
    on<LoadMoreRideHistory>(_onLoadMore);
  }

  Future<void> _onLoad(LoadRideHistory event, Emitter<RideHistoryState> emit) async {
    emit(RideHistoryLoading());
    try {
      final result = await dataSource.getRideHistory(page: 1, limit: 20, status: event.status);
      final rows = (result['MESSAGE'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      final pagination = result['PAGINATION'] as Map<String, dynamic>?;
      final totalPages = (pagination?['totalPages'] as num?)?.toInt() ?? 1;

      emit(RideHistoryLoaded(
        rides: rows,
        hasMore: totalPages > 1 && rows.length == 20,
        page: 1,
        status: event.status,
      ));
    } catch (e) {
      emit(RideHistoryError(e.toString()));
    }
  }

  Future<void> _onLoadMore(LoadMoreRideHistory event, Emitter<RideHistoryState> emit) async {
    final current = state;
    if (current is! RideHistoryLoaded || current.isLoadingMore || !current.hasMore) return;

    emit(current.copyWith(isLoadingMore: true));
    try {
      final nextPage = current.page + 1;
      final result = await dataSource.getRideHistory(page: nextPage, limit: 20, status: current.status);
      final rows = (result['MESSAGE'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      final pagination = result['PAGINATION'] as Map<String, dynamic>?;
      final totalPages = (pagination?['totalPages'] as num?)?.toInt() ?? 1;

      final updatedRides = List<Map<String, dynamic>>.from(current.rides)..addAll(rows);

      emit(current.copyWith(
        rides: updatedRides,
        hasMore: nextPage < totalPages && rows.isNotEmpty,
        isLoadingMore: false,
        page: nextPage,
      ));
    } catch (_) {
      emit(current.copyWith(isLoadingMore: false));
    }
  }
}
