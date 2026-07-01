require 'xcodeproj'

project = Xcodeproj::Project.open('macos/Jujutsushi.xcodeproj')
target = project.targets.find { |t| t.name == 'Jujutsushi-macOS' }
raise 'Jujutsushi-macOS target not found' unless target

app_group = project.main_group.find_subpath('Jujutsushi-macOS', true)

# Create directory-backed groups, not logical ones. find_subpath(..., true)
# would create name-only groups with no `path`, so nested file references
# would resolve to <Jujutsushi-macOS>/<file> and miss the actual
# NativeModules/JjProcessExecutor/ subdirectories the files live in. Passing
# a path to new_group makes each group map to its real folder so real_path
# is correct. nil name lets the display name derive from the path basename.
native_modules_group = app_group.new_group(nil, 'NativeModules')
module_group = native_modules_group.new_group(nil, 'JjProcessExecutor')

bridging_header_ref = app_group.new_file('Jujutsushi-macOS-Bridging-Header.h')
swift_file_ref = module_group.new_file('JjProcessExecutor.swift')
bridge_file_ref = module_group.new_file('JjProcessExecutorBridge.m')

target.source_build_phase.add_file_reference(swift_file_ref)
target.source_build_phase.add_file_reference(bridge_file_ref)
# The bridging header is referenced by a build setting (below), not added
# to a build phase -- it's not compiled on its own.

target.build_configurations.each do |config|
  config.build_settings['SWIFT_OBJC_BRIDGING_HEADER'] =
    'Jujutsushi-macOS/Jujutsushi-macOS-Bridging-Header.h'
  config.build_settings['CODE_SIGN_ENTITLEMENTS'] =
    'Jujutsushi-macOS/Jujutsushi.entitlements'
end

project.save
puts 'Wired JjProcessExecutor into the Xcode project.'
