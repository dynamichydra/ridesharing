import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

abstract class NetworkState {}

class NetworkConnected extends NetworkState {}

class NetworkDisconnected extends NetworkState {}

class NetworkChecking extends NetworkState {}

class NetworkCubit extends Cubit<NetworkState> {
  final Connectivity _connectivity;
  StreamSubscription<ConnectivityResult>? _subscription;

  NetworkCubit({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity(),
        super(NetworkConnected()) {
    _init();
  }

  void _init() {
    checkConnection();
    _subscription = _connectivity.onConnectivityChanged.listen((result) {
      _handleConnectivityResult(result);
    });
  }

  Future<void> _handleConnectivityResult(ConnectivityResult result) async {
    if (result == ConnectivityResult.none) {
      emit(NetworkDisconnected());
      return;
    }

    // Verify real internet connectivity by looking up known reliable hosts
    final isOnline = await _hasRealInternetAccess();
    if (isOnline) {
      emit(NetworkConnected());
    } else {
      emit(NetworkDisconnected());
    }
  }

  Future<bool> _hasRealInternetAccess() async {
    try {
      final result = await InternetAddress.lookup('google.com')
          .timeout(const Duration(seconds: 3));
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } catch (_) {
      try {
        final result = await InternetAddress.lookup('one.one.one.one')
            .timeout(const Duration(seconds: 3));
        return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
      } catch (_) {
        return false;
      }
    }
  }

  Future<void> checkConnection() async {
    emit(NetworkChecking());
    try {
      final result = await _connectivity.checkConnectivity();
      await _handleConnectivityResult(result);
    } catch (_) {
      emit(NetworkDisconnected());
    }
  }

  @override
  Future<void> close() {
    _subscription?.cancel();
    return super.close();
  }
}
