#!/bin/bash
cd ~/Downloads/imc-app
git add .
git commit -m "${1:-update}"
git push
echo "✅ Listo - Vercel desplegando..."
