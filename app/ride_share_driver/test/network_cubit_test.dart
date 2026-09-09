import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ride_share_driver/core/network/network_cubit.dart';

class MockConnectivity implements Connectivity {
  final StreamController<ConnectivityResult> _controller =
      StreamController<ConnectivityResult>.broadcast();
  ConnectivityResult currentResult = ConnectivityResult.wifi;

  @override
  Future<ConnectivityResult> checkConnectivity() async => currentResult;

  @override
  Stream<ConnectivityResult> get onConnectivityChanged => _controller.stream;

  void emitResult(ConnectivityResult result) {
    currentResult = result;
    _controller.add(result);
  }

  void dispose() {
    _controller.close();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockConnectivity mockConnectivity;
  late NetworkCubit cubit;

  setUp(() {
    mockConnectivity = MockConnectivity();
  });

  tearDown(() {
    cubit.close();
    mockConnectivity.dispose();
  });

  test('NetworkCubit starts with NetworkConnected when interface is wifi', () async {
    mockConnectivity.currentResult = ConnectivityResult.wifi;
    cubit = NetworkCubit(connectivity: mockConnectivity);

    // Initial state is NetworkConnected
    expect(cubit.state, isA<NetworkConnected>());

    await cubit.checkConnection();
    expect(cubit.state, isA<NetworkConnected>());
  });

  test('NetworkCubit handles forceConnected() override', () async {
    mockConnectivity.currentResult = ConnectivityResult.none;
    cubit = NetworkCubit(connectivity: mockConnectivity);

    cubit.forceConnected();
    expect(cubit.state, isA<NetworkConnected>());
  });

  test('NetworkCubit stays connected when mobile data is available', () async {
    mockConnectivity.currentResult = ConnectivityResult.mobile;
    cubit = NetworkCubit(connectivity: mockConnectivity);

    await cubit.checkConnection();
    expect(cubit.state, isA<NetworkConnected>());
  });
}
