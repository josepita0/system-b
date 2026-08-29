# System Barra

## Vercel deployment

The private monorepo is built from source with:

- Install Command: `npm install --ignore-scripts`
- Build Command: `npm run build:demo && npm --prefix landing run build`
- Output Directory: `landing/dist`

The demo is generated at `/demo/` during the build and is never committed.
