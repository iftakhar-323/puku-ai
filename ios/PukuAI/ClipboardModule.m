#import <React/RCTBridgeModule.h>

// Bridges the Swift ClipboardModule (exposed as `PukuClipboard`). See
// ClipboardModule.swift.
@interface RCT_EXTERN_MODULE(PukuClipboard, NSObject)

RCT_EXTERN_METHOD(setString:(NSString *)text
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getString:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
