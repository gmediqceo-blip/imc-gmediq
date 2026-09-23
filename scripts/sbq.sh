#!/bin/zsh
# =====================================================================
#  sbq.sh — ejecuta un archivo .sql contra el proyecto de Supabase
#
#  Uso:  ./scripts/sbq.sh supabase/01_diagnostico.sql
#
#  Usa el token que dejó `supabase login` en tu llavero. El token nunca
#  se imprime en pantalla: se pasa directo a curl dentro del comando.
#  No necesita Docker ni la contraseña de la base de datos.
# =====================================================================
set -e

REF="serxzmpibljfqtuyazel"
SQL_FILE="$1"

if [ -z "$SQL_FILE" ] || [ ! -f "$SQL_FILE" ]; then
  echo "Uso: $0 <archivo.sql>" >&2
  exit 1
fi

# El token puede estar en el llavero (macOS) o en un archivo, según versión.
TOKEN=""
for SERVICIO in "Supabase CLI" "supabase" "SupabaseCLI"; do
  TOKEN=$(security find-generic-password -s "$SERVICIO" -w 2>/dev/null || true)
  [ -n "$TOKEN" ] && break
done
if [ -z "$TOKEN" ] && [ -f "$HOME/.supabase/access-token" ]; then
  TOKEN=$(cat "$HOME/.supabase/access-token")
fi
if [ -z "$TOKEN" ] && [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
  TOKEN="$SUPABASE_ACCESS_TOKEN"
fi
if [ -z "$TOKEN" ]; then
  echo "No encontré el token del CLI. Revisa que 'supabase login' haya terminado bien." >&2
  exit 1
fi

BODY=$(python3 -c 'import json,sys; print(json.dumps({"query": open(sys.argv[1]).read()}))' "$SQL_FILE")

echo "Token encontrado: ${#TOKEN} caracteres"
echo "Enviando $(wc -c < "$SQL_FILE" | tr -d ' ') bytes de SQL a $REF"

curl -sS -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY" \
  -w '\n--- HTTP %{http_code} ---\n'
