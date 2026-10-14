# 📺 Jandos-TV

**Jandos-TV** es una aplicación nativa web para **Samsung Smart TV (Tizen OS)** diseñada específicamente con **cero fricción y altísimo contraste** para adultos mayores en el Perú.

---

## ✨ Características Principales

- **Cero Fricción para Adultos Mayores**:
  - Al abrir la app, reproduce inmediatamente a pantalla completa el último canal visto.
  - Sin menús confusos ni ajustes complejos.
  - Cursor oculto y navegación 100% adaptada al control remoto de Samsung.
- **Top 12 Canales Nacionales del Perú Priorizados**:
  1. Latina Televisión
  2. América Televisión
  3. Panamericana Televisión
  4. TV Perú
  5. ATV
  6. ATV+
  7. TV Perú Noticias
  8. Willax TV
  9. Exitosa TV
  10. Nativa TV / RPP / Ovación
  11. Congreso TV / Justicia TV
  12. Sol TV / Señales Regionales
- **Actualización Remota en Caliente (`canales-remotos.json`)**:
  - Consulta periódicamente en GitHub el archivo `canales-remotos.json` para actualizar URLs y canales sin necesidad de reinstalar el archivo `.wgt`.
- **Respaldo con YouTube Live Oficial**:
  - Si los streams `.m3u8` de un canal nacional caen, conmuta automáticamente a la transmisión oficial 24/7 en YouTube Live.
- **OSD de Altísimo Contraste con Reloj Peruano**:
  - Número de canal gigante en amarillo dorado (`#FFD700`) y hora local de Perú en formato 12 horas (`09:15 PM`).
- **Navegación Intuitiva**:
  - **Flecha Arriba / Canal +**: Siguiente canal.
  - **Flecha Abajo / Canal -**: Canal anterior.
  - **Flecha Izquierda**: Botón *Recall* (cambia inmediatamente al canal anterior visto).
  - **Flecha Derecha**: Conmutador manual de señal alternativa (*Señal 1, 2, 3...*).
  - **Teclas Numéricas (0-9)**: Marcado directo de canal con buffer de 1.8 segundos.
  - **Botón OK / Enter**: Abre la guía rápida lateral de canales.
  - **Botón Return / Atrás**: Protegido contra cierres accidentales.
- **Anti-Screensaver Nativo**:
  - Utiliza el privilegio `tizen.power.request("SCREEN", "SCREEN_NORMAL")` para evitar que la TV suspenda o atenúe la pantalla.

---

## 🛠️ Estructura del Proyecto

```text
├── config.xml             # Manifiesto oficial Samsung Tizen TV
├── index.html             # Estructura visual de pantalla completa
├── styles.css             # Estilos de alto contraste (Pitch black y Gold)
├── app.js                 # Lógica nativa Tizen, HLS.js, M3U y YouTube
├── canales-remotos.json   # Configuración de canales actualizable en GitHub
├── icon.png               # Icono nativo de alta resolución (512x512)
├── hls.min.js             # Biblioteca HLS local (cero dependencias de CDN)
└── JandosTV.wgt           # Paquete instalable listo para Samsung Smart TV
```

---

## 🚀 Despliegue en Samsung Smart TV (Tizen CLI)

```bash
# 1. Empaquetar y firmar con tu perfil de seguridad:
tizen package -t wgt -s <tu-perfil-samsung>

# 2. Conectar a la TV (Modo Desarrollador activado en la TV):
sdb connect <IP_DE_LA_TV>

# 3. Instalar la aplicación:
tizen install -n JandosTV.wgt -t <ID_DEL_DISPOSITIVO>
```
