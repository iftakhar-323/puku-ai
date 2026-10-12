#import <React/RCTBridgeModule.h>

// Bridges the Swift TtsModule (exposed as `PukuTts`, an RCTEventEmitter
// subclass — addListener/removeListeners are inherited, no need to
// re-declare them here). See TtsModule.swift.
@interface RCT_EXTERN_MODULE(PukuTts, NSObject)

RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(speak:(NSString *)text
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stop:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
