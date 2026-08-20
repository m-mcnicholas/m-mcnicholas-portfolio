# Texture assets

`aged-walnut.jpg` is a 1024px, project-local albedo used on the desk and lighter lectern trim. It was generated with OpenAI's built-in image-generation tool on August 19, 2026, then converted to quality-82 JPEG (317kB). It has no third-party source or attribution requirement.

Final prompt:

> Create a square, seamless, tileable close-up texture of aged dark English walnut wood, photographed straight-on with no perspective. Use highly realistic material photography, flat diffuse neutral lighting, horizontal correctly scaled fine grain, subtle pores, restrained hairline scratches, and slight uneven oxidation. Avoid objects, borders, text, watermarks, vignette, dramatic lighting, glossy varnish, orange saturation, fantasy patterns, and dominant knots.

`aged-rag-paper.jpg` is a 1024px, project-local albedo used on the open page faces. It was generated with the same built-in tool and date, then converted to quality-84 JPEG (316kB). It has no third-party source or attribution requirement.

Final prompt:

> Create a square, seamless, tileable close-up texture of high-quality aged rag paper from an Edwardian scholarly volume, photographed straight-on. Use realistic but restrained material photography, flat diffuse neutral lighting, light warm ivory color, very fine fibers, extremely subtle mottling, sparse tiny foxing, and faint natural sheet variation. Avoid writing, ruled lines, borders, folds, heavy stains, parchment styling, yellow saturation, watermarks, perspective, and obvious repetition.

The bitmaps supply color only. `scene.js` continues to generate separate bump and roughness maps so the materials remain useful under live lighting. If either asset fails to load, its generated color map remains as a complete fallback.
