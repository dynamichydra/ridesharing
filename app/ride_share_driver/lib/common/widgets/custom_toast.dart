import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';

class CustomToast {
  static void show(BuildContext context, String message) {
    // Dismiss any active toasts first
    Fluttertoast.cancel();

    Fluttertoast.showToast(
      msg: message,
      toastLength: Toast.LENGTH_SHORT,
      gravity: ToastGravity.BOTTOM,
      timeInSecForIosWeb: 2,
      backgroundColor: Colors.black.withOpacity(0.85),
      textColor: Colors.white,
      fontSize: 14.0,
    );
  }
}
