#import <React/RCTBridgeModule.h>

// Bridges the Swift SpeechModule (exposed as `PukuSpeech`, an
// RCTEventEmitter subclass — addListener/removeListeners are inherited, no
// need to re-declare them here). See SpeechModule.swift.
@interface RCT_EXTERN_MODULE(PukuSpeech, NSObject)

RCT_EXTERN_METHOD(isAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startListening:(NSString *)language
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopListening:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(cancelListening:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
