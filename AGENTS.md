# LimaCharlie IaC Generator

## Project shape

- This is a dependency-free static site. `index.html` contains the configuration controls, `js/script.js` owns all generator behavior, and `css/styles.css` owns presentation.
- Preconfigured YAML lives in `templates/` and is fetched by relative path at runtime.
- The production site is published at `https://iac.limacharlie.io/`.

## Local development

- Serve the repository over HTTP so template and README fetches work: `python3 -m http.server 4173 --bind 127.0.0.1`.
- Open `http://127.0.0.1:4173/`.
- There is no build step or package manager configuration.

## Change guidance

- Preserve existing form-control IDs, names, `user-inputs` attributes, template paths, tab hashes, and JavaScript hooks. Generator state and shareable URLs depend on them.
- Keep feature or data changes separate from visual work when practical.
- Load project CSS after vendor styles so local rules consistently override Bootstrap 3 and Prism defaults.
- Keep the `?v=` cache keys for `js/script.js` and `css/styles.css` in `index.html` synchronized with the application version in `js/script.js`.
- Maintain keyboard focus visibility, reduced-motion behavior, and responsive layouts at desktop, tablet, and narrow mobile widths.

## Validation

- Run `node --check js/script.js` and `git diff --check`.
- In a browser, confirm tabs update the `tab` query parameter, selecting an extension updates YAML and URL state, a preconfigured template fetches and merges, artifact sections expand, and reset returns the output to `version: 3`.
- Check the browser console for errors and visually inspect the About, option-list, artifact, and generated-YAML states at desktop and 390px widths.
