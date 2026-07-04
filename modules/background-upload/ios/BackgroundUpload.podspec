Pod::Spec.new do |s|
  s.name           = 'BackgroundUpload'
  s.version        = '1.0.0'
  s.summary        = 'NSURLSession background upload module for Fotuu'
  s.description    = 'Uploads files via NSURLSession background configuration so uploads continue when the app is backgrounded.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
