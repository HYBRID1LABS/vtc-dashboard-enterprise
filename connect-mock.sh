#!/bin/bash
# 🚖 VTC Dashboard - Conectar Mock al Backend
# Uso: ./connect-mock.sh

echo "🔧 Conectando mock al backend..."

BACKEND_URL="http://localhost:3000"
MOCK_FILE="/Users/ft/.openclaw/workspace/vtc/dashboard-pro-final.html"
BACKUP_FILE="/Users/ft/.openclaw/workspace/vtc/dashboard-pro-final.html.bak"

# 1. Crear backup
cp "$MOCK_FILE" "$BACKUP_FILE"
echo "✅ Backup creado: $BACKUP_FILE"

# 2. Actualizar API_BASE_URL en el mock
sed -i '' "s|const API_BASE_URL = '.*'|const API_BASE_URL = '$BACKEND_URL';|" "$MOCK_FILE"
echo "✅ API URL actualizada: $BACKEND_URL"

# 3. Añadir WebSocket antes de </body>
WS_CODE='
<!-- WebSocket para tiempo real -->
<script>
  const ws = new WebSocket("ws://localhost:3000/ws");
  
  ws.onopen = () => {
    console.log("✅ WebSocket conectado");
  };
  
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    if (update.type === "update") {
      console.log("📡 Update recibido:", update.data);
      
      // Actualizar conductores
      if (update.data.drivers) {
        update.data.drivers.forEach(driver => {
          const marker = driverMarkers.get(driver.id);
          if (marker) {
            marker.setPosition({ lat: driver.location.lat, lng: driver.location.lng });
          }
        });
      }
      
      // Actualizar viajes activos
      if (update.data.activeTrips) {
        updateActiveTrips(update.data.activeTrips);
      }
    }
  };
  
  ws.onerror = (error) => {
    console.error("❌ WebSocket error:", error);
  };
  
  ws.onclose = () => {
    console.log("🔌 WebSocket desconectado");
  };
</script>
'

# Insertar WebSocket antes de </body>
sed -i '' "/<\/body>/i\\
$WS_CODE
" "$MOCK_FILE"

echo "✅ WebSocket añadido"
echo ""
echo "🎉 Mock conectado al backend!"
echo ""
echo "📊 PARA VER:"
echo "   open $MOCK_FILE"
echo ""
echo "🔧 PARA REVERTIR:"
echo "   cp $BACKUP_FILE $MOCK_FILE"
