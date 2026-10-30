# Room UI and missing interiors

Floor numbers are removed from presentation only. Selected-room controls sit above
ResizeObserver-measured HUD bounds, including safe-area padding and wrapping. Their
contents scroll independently, with a single button column on narrow phones. Opening
or closing the panel does not alter camera state. Zoom controls occupy the side rail.

Laboratory and water treatment now use their own HD and 1x atlas, resolved through the
existing asset manager. The fallback rendering remains available on load failure.
Original art generated with the built-in image tool: two stacked painterly underground
cutaways, a scientific laboratory and blue-tank filtration plant, matching metal room
frames, warm ceiling lights, no people or labels, transparent outside frame.
Packing preserves source aspect ratio within each frame.

Room UI visual checks capture before/after screenshots at phone, tablet, desktop and
landscape sizes and assert that the panel is inside the viewport and above the dock.
Evidence is uploaded to the PR workflow's room-ui-before-after artifact.
