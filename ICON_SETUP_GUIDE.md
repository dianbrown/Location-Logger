# Icon Generation Instructions

To properly display your custom logo, you need to create properly sized icon files.

## Current Issue:
- LoggerLogo.png is being used for all icon sizes
- iOS and browsers prefer specific icon dimensions
- PWA manifest needs exact 192x192 and 512x512 icons

## Solution:
You need to resize LoggerLogo.png into these specific sizes:

1. **favicon-16x16.png** - 16×16 pixels (browser tab)
2. **favicon-32x32.png** - 32×32 pixels (browser tab)  
3. **apple-touch-icon-180x180.png** - 180×180 pixels (iOS home screen)
4. **icon-192x192.png** - 192×192 pixels (PWA manifest)
5. **icon-512x512.png** - 512×512 pixels (PWA manifest)
6. **favicon.ico** - Multi-size ICO file (16, 32, 48 pixels)

## Tools to resize:
- Online: realfavicongenerator.net, favicon.io
- Software: GIMP, Photoshop, or any image editor
- Command line: ImageMagick

Once you create these files, place them in the public/ folder and I'll update the references.
