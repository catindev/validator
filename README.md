# validator-engine (core)

CLI:
- `node index.js /demo body.ok.json`
- `node index.js /demo/1 --body=body.bad.json`

Rules root is `./rules` relative to this project.

File layout (as requested):
- `rules/manifest.json`
- `rules/dictionaries/{version}/*.json`
- `rules/library/{version}/...`
- `rules/pipelines/{version}/{pipeline_name}/{version}/index.json`
- local sub-pipeline or rule inside same pipeline folder: `{name}.json`
