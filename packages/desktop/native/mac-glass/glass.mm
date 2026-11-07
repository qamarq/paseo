#import <AppKit/AppKit.h>
#import <QuartzCore/QuartzCore.h>
#include <node_api.h>

static NSString* const kBackdropIdentifier = @"paseo.window-glass-backdrop";

@interface PaseoGlassBackdrop : NSVisualEffectView
@property(nonatomic) CGFloat blurRadius;
- (void)configureLayers;
@end

// Keeps AppKit's backdrop blur but drops its saturation, fills and chameleon tint; the page paints our own tint.
static void ConfigureBackdropLayer(CALayer* layer, CGFloat radius) {
  layer.backgroundColor = nil;
  if ([NSStringFromClass([layer class]) isEqualToString:@"CAChameleonLayer"]) {
    layer.hidden = YES;
    return;
  }
  NSArray* filters = layer.filters;
  if (filters.count > 0) {
    NSMutableArray* retained = [NSMutableArray arrayWithCapacity:filters.count];
    BOOL changed = NO;
    for (id filter in filters) {
      NSString* description = [filter description];
      if ([description containsString:@"Saturat"]) {
        changed = YES;
        continue;
      }
      if ([description containsString:@"Blur"]) {
        NSNumber* current = [filter valueForKey:@"inputRadius"];
        if (current == nil || current.doubleValue != radius) {
          // The installed filter is shared with the committed render tree; only a new instance invalidates it.
          id replacement = [filter copy];
          [replacement setValue:@(radius) forKey:@"inputRadius"];
          [retained addObject:replacement];
          changed = YES;
          continue;
        }
      }
      [retained addObject:filter];
    }
    if (changed) layer.filters = retained;
  }
  for (CALayer* child in layer.sublayers) ConfigureBackdropLayer(child, radius);
}

@implementation PaseoGlassBackdrop

- (void)updateLayer {
  [super updateLayer];
  [self configureLayers];
}

- (void)configureLayers {
  CALayer* layer = self.layer;
  if (layer == nil) return;
  @try {
    ConfigureBackdropLayer(layer, self.blurRadius);
    // Window snapshots omit live backdrops; an opaque base keeps them from showing raw desktop.
    layer.backgroundColor = NSColor.blackColor.CGColor;
  } @catch (NSException* exception) {
    NSLog(@"[paseo-glass] backdrop configuration failed: %@", exception);
  }
}

@end

static NSView* ContentViewFromHandle(napi_env env, napi_value handle) {
  void* data = nullptr;
  size_t length = 0;
  if (napi_get_buffer_info(env, handle, &data, &length) != napi_ok || length < sizeof(void*)) return nil;
  return (__bridge NSView*)(*static_cast<void**>(data));
}

static PaseoGlassBackdrop* FindBackdrop(NSView* content) {
  for (NSView* view in content.subviews) {
    if ([view isKindOfClass:[PaseoGlassBackdrop class]]) return (PaseoGlassBackdrop*)view;
  }
  return nil;
}

static PaseoGlassBackdrop* InstallBackdrop(NSView* content) {
  PaseoGlassBackdrop* backdrop = [[PaseoGlassBackdrop alloc] initWithFrame:content.bounds];
  backdrop.identifier = kBackdropIdentifier;
  backdrop.material = NSVisualEffectMaterialUnderWindowBackground;
  backdrop.blendingMode = NSVisualEffectBlendingModeBehindWindow;
  backdrop.state = NSVisualEffectStateActive;
  backdrop.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
  backdrop.wantsLayer = YES;
  [content addSubview:backdrop positioned:NSWindowBelow relativeTo:nil];
  return backdrop;
}

static void ApplyGlass(NSView* content, NSNumber* radius) {
  PaseoGlassBackdrop* backdrop = FindBackdrop(content);
  if (radius == nil) {
    backdrop.hidden = YES;
    return;
  }
  if (backdrop == nil) backdrop = InstallBackdrop(content);
  backdrop.hidden = NO;
  backdrop.blurRadius = radius.doubleValue;
  [backdrop configureLayers];
  backdrop.needsDisplay = YES;
}

static napi_value Apply(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  napi_get_cb_info(env, info, &argc, argv, nullptr, nullptr);
  NSView* content = argc == 2 ? ContentViewFromHandle(env, argv[0]) : nil;
  if (content == nil) {
    napi_throw_type_error(env, nullptr, "apply expects a native window handle and a blur radius");
    return nullptr;
  }
  napi_valuetype radiusType;
  napi_typeof(env, argv[1], &radiusType);
  NSNumber* radius = nil;
  if (radiusType == napi_number) {
    double value = 0;
    napi_get_value_double(env, argv[1], &value);
    radius = @(value);
  }
  ApplyGlass(content, radius);
  return nullptr;
}

NAPI_MODULE_INIT() {
  napi_value apply;
  napi_create_function(env, "apply", NAPI_AUTO_LENGTH, Apply, nullptr, &apply);
  napi_set_named_property(env, exports, "apply", apply);
  return exports;
}
