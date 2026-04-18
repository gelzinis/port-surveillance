# APIS Engineering — Low Current Systems Website

Professional one-page website for a low current (ELV) systems integration company.

## Quick Start

```bash
docker compose up --build
```

Then open **http://localhost:8080** in your browser.

## Project Structure

```
├── index.html          # Main page with all 8 sections
├── css/style.css       # Responsive styles
├── js/main.js          # Interactions, form validation, animations
├── Dockerfile          # Nginx-based container image
├── docker-compose.yml  # Service definition (port 8080)
```

## Sections

1. Hero — headline + CTAs
2. About — company overview + stats
3. Services — 7 service cards
4. Industries — 6 target sectors
5. Why Choose Us — 6 advantages
6. Project Workflow — 6-step process
7. Contact — form + contact details + map placeholder
8. Footer

## Customization

- **Company info**: Edit `index.html` contact section and footer.
- **Colors**: Change CSS custom properties or search/replace in `css/style.css`.
- **Map**: Replace the `.map-placeholder` div with a Google Maps embed iframe.
- **Form backend**: Update the submit handler in `js/main.js` to POST to your endpoint.
