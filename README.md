# ShootersProof

**Shoot better. Know why.**

A free, data-driven target analysis tool for rifle and rimfire shooters.
No sponsors. No agendas. Just data.

---

## Project Status

Beta v0.1 — actively in development.

## Tech Stack

- **Backend:** Python / Flask
- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Hosting:** Railway
- **Database:** PostgreSQL (coming in v0.2)

## Local Development

1. Clone the repository
2. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  (Mac/Linux)
   venv\Scripts\activate     (Windows)
   ```
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Run the app:
   ```
   python app.py
   ```
5. Open http://localhost:5000

## Deployment

This app is configured for Railway deployment.
- `Procfile` tells Railway to use gunicorn
- `requirements.txt` lists all dependencies
- Environment variable `PORT` is handled automatically by Railway

## Features (v0.1)

- Target image upload
- Manual shot marking (click to add, right-click to remove)
- AI-powered auto-detection of bullet holes
- Two-point scale calibration
- Group statistics: ES, Mean Radius, CEP, SD (H/V), Figure of Merit, MOA
- Statistical confidence indicator
- Equipment data entry (rifle, ammo, accessories, conditions)

## Roadmap

- v0.2: User accounts, saved sessions, PostgreSQL database
- v0.3: Leaderboards by category
- v0.4: Session layering (combine multiple groups)
- v0.5: Aggregate equipment analysis and research tools

## Contact

feedback@shootersproof.com
