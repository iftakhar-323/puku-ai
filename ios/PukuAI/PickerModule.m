#import <React/RCTBridgeModule.h>

// Bridges the Swift PickerModule (exposed to the ObjC runtime as
// `PukuPicker` via `@objc(PukuPicker)`) to React Native's legacy
// NativeModules registry. See PickerModule.swift for the implementation.
@interface RCT_EXTERN_MODULE(PukuPicker, NSObject)

RCT_EXTERN_METHOD(pickMedia:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(takePhoto:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(uploadAttachment:(NSString *)url
                  filePath:(NSString *)filePath
                  fileName:(NSString *)fileName
                  mimeType:(NSString *)mimeType
                  token:(NSString *)token
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
