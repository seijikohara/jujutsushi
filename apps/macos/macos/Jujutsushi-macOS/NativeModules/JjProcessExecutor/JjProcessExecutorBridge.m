// JjProcessExecutorBridge.m
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(JjProcessExecutor, NSObject)

RCT_EXTERN_METHOD(execute:(NSString *)command
                  args:(NSArray<NSString *> *)args
                  cwd:(NSString * _Nullable)cwd
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
