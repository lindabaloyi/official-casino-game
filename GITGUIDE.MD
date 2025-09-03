# Make sure you're on main
git checkout main

# Create and switch to development branch
git checkout -b dev
git push origin dev

# Example: start a feature branch
git checkout -b feature/scoring-system
# ...work on code...
git add .
git commit -m "Add scoring system"
git push origin feature/scoring-system

# When ready, merge into dev
git checkout dev
git merge feature/scoring-system
git push origin dev

# When stable, merge dev into main (production)
git checkout main
git merge dev
git push origin main
