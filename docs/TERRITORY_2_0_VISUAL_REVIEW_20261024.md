# TERRITORY 2.0 — review of the first player's phone screenshot

Screenshot received 2026-10-24: 689×1536 Samsung Android browser, user-confirmed working public Pages build. The initial screenshot is **not approved** as final art.

Observed defects: dark nighttime mountain background instead of owner-approved vivid blue daylight snow scene; two Viking-like characters instead of Viking + cow; central nav overlapping chapter quest; oversized gear panel; tiny overlapping icon labels; overly large victory toast; center button text DEMO rather than primary battle role.

Fixes in isolated V2 demo: CSS and JSX corrected HUD proportions, chapter portal, background and lower task layout; initially selected companion is the armored battle cow; victory toast reduced; 7 left shortcuts, 4 right actions and arena remain; central action says БОЙ with a small ДЕМО marker. Scenic artwork is a **cropped/composited derivative of the only approved reference screenshot** (not any earlier concept), file `public/v2-snowy-approved-derived.webp`. Owner's original reference remains unchanged. This temporary scenic plate is **not yet pixel-perfect** or final winter art; it has simplified painted snow in its lower half.

Public review URL: https://w0980077002-create.github.io/territory-next/ . No real V2 player saving, wallet or Telegram token; never modify working V1.

Verification: `npm run test:approved-screen`, `npm run test:v2`, typecheck, build, public Pages deployment and phone screenshot review.
