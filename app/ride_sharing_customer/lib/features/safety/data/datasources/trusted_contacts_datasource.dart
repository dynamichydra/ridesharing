import '../../../../core/network/dio_client.dart';

abstract class TrustedContactsDataSource {
  Future<List<Map<String, dynamic>>> getTrustedContacts();
  Future<Map<String, dynamic>> addTrustedContact(String name, String phone, {String? relationship});
  Future<void> deleteTrustedContact(String id);
}

class TrustedContactsDataSourceImpl implements TrustedContactsDataSource {
  final DioClient _dioClient;

  TrustedContactsDataSourceImpl(this._dioClient);

  @override
  Future<List<Map<String, dynamic>>> getTrustedContacts() async {
    try {
      final response = await _dioClient.dio.get('/api/v1/trusted-contacts');
      if (response.data != null && (response.data['SUCCESS'] == true || response.data['success'] == true)) {
        final list = (response.data['DATA'] ?? response.data['data'] ?? response.data['MESSAGE']) as List?;
        if (list != null) {
          return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  @override
  Future<Map<String, dynamic>> addTrustedContact(String name, String phone, {String? relationship}) async {
    final response = await _dioClient.dio.post('/api/v1/trusted-contacts', data: {
      'name': name,
      'phone': phone,
      if (relationship != null && relationship.isNotEmpty) 'relationship': relationship,
    });
    if (response.data is Map && (response.data['SUCCESS'] == true || response.data['DATA'] != null)) {
      final data = response.data['DATA'] ?? response.data['data'] ?? response.data['MESSAGE'];
      if (data is Map) return Map<String, dynamic>.from(data);
    }
    return {'name': name, 'phone': phone, 'relationship': relationship};
  }

  @override
  Future<void> deleteTrustedContact(String id) async {
    await _dioClient.dio.delete('/api/v1/trusted-contacts/$id');
  }
}
