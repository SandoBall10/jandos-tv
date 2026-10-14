/**
 * Jandos-TV - Aplicación Nativa Samsung Smart TV (Tizen OS)
 * Diseñado con cero fricción, altísimo contraste y parrilla curada por bloques VIP:
 * 1. Nacionales Perú (01-12)
 * 2. Deportes (13-20)
 * 3. Cine, Cultura y Regionales (21+)
 */

(function () {
    'use strict';

    // --------------------------------------------------------------------------
    // 1. Constantes y Configuración Remota
    // --------------------------------------------------------------------------
    const CUSTOM_REMOTE_JSON_URL = 'https://raw.githubusercontent.com/SandoBall10/jandos-tv/main/canales-remotos.json';
    const LOCAL_FALLBACK_JSON_URL = './canales-remotos.json';
    const REMOTE_CONFIG_INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

    const STORAGE_KEY_LAST_CHANNEL = 'jandos_tv_last_channel_index';
    const OSD_DURATION_MS = 4000;
    const NUMBER_BUFFER_TIMEOUT_MS = 1800;
    const STREAM_TIMEOUT_MS = 8000; // 8 segundos para dar tiempo a los buffers peruanos
    const CHANNEL_WATCHDOG_MS = 15000; // 15 segundos máximo antes de saltar si no hay reproducción
    const CORS_TEST_ORIGIN = 'http://localhost:3000';

    // --------------------------------------------------------------------------
    // 2. Parrilla Base Curada (Cargada desde canales-remotos.json)
    // --------------------------------------------------------------------------
    let channels = [
        { id: 1, name: 'Latina Televisión', category: 'NACIONALES', urls: ['http://190.93.224.42/LATINA/index.m3u8'] },
        { id: 2, name: 'América Televisión', category: 'NACIONALES', urls: ['https://live-bd1.tv360.bitel.com.pe/manifest/america/master_clean_source.m3u8'] },
        { id: 3, name: 'Panamericana TV', category: 'NACIONALES', urls: ['http://45.171.108.253:8888/PANAMERICANA/index.m3u8', 'http://190.93.224.42/PANAMERICANA/index.m3u8'] },
        { id: 4, name: 'TV Perú', category: 'NACIONALES', urls: ['http://190.93.224.42/TV-PERU/index.m3u8'] },
        { id: 5, name: 'ATV', category: 'NACIONALES', urls: ['http://190.93.224.42/ATV/index.m3u8'] },
        { id: 6, name: 'ATV+', category: 'NACIONALES', urls: ['http://45.171.108.253:8888/ATV/index.m3u8', 'http://190.93.224.42/ATV-SUR/index.m3u8'] },
        { id: 7, name: 'TV Perú Noticias', category: 'NACIONALES', urls: ['http://190.93.224.42/TV-PERU-NOTICIAS/index.m3u8'] },
        { id: 8, name: 'Willax TV', category: 'NACIONALES', urls: ['http://190.93.224.42/WILLAX/index.m3u8'] },
        { id: 9, name: 'Exitosa TV', category: 'NACIONALES', urls: ['http://190.93.224.42/EXITOSA/index.m3u8'] },
        { id: 10, name: 'Nativa TV', category: 'NACIONALES', urls: ['http://187.102.210.46/NATIVATV/index.m3u8'] },
        { id: 11, name: 'Congreso TV', category: 'NACIONALES', urls: ['http://190.93.224.42/JUSTICIA-TV/index.m3u8'] },
        { id: 12, name: 'Sol TV', category: 'NACIONALES', urls: ['https://cloudpro.servidoresdestream.com:8081/8010/index.m3u8', 'https://cdn.streamhispanatv.net:3409/live/soltvlive.m3u8'] },
        // Deportes
        { id: 13, name: 'ESPN', category: 'DEPORTES', urls: ['https://barinaslive1.boldmss.com/ESPN/ESPN.isml/ESPN.m3u8'] },
        { id: 14, name: 'ESPN 2', category: 'DEPORTES', urls: ['https://barinaslive1.boldmss.com/ESPN_2/ESPN_2.isml/ESPN_2.m3u8'] },
        { id: 15, name: 'DSports (DirecTV)', category: 'DEPORTES', urls: ['http://45.170.130.224:8000/play/a03d/index.m3u8'] },
        { id: 16, name: 'Claro Sports', category: 'DEPORTES', urls: ['http://168.196.127.137:6001/play/a08r/index.m3u8'] },
        { id: 17, name: 'TyC Sports / TUDN', category: 'DEPORTES', urls: ['http://45.170.130.224:8000/play/a020/index.m3u8', 'https://amg26268-amg26268c14-freelivesports-emea-10267.playouts.now.amagi.tv/ts-us-e2-n2/playlist/amg26268-sportsstudio-tycsports-freelivesportsemea/playlist.m3u8'] },
        { id: 18, name: 'Ovación TV / Fútbol Perú', category: 'DEPORTES', urls: ['http://190.93.224.42/RPP/index.m3u8'] },
        { id: 19, name: 'FIFA+ / Red Bull TV', category: 'DEPORTES', urls: ['https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8'] },
        { id: 20, name: 'Real Madrid TV / Barça TV', category: 'DEPORTES', urls: ['https://rmtv.akamaized.net/hls/live/2043153/rmtv-es-web/master.m3u8'] }
    ];

    // --------------------------------------------------------------------------
    // 3. Estado de la Aplicación
    // --------------------------------------------------------------------------
    let currentChannelIndex = 0;
    let previousChannelIndex = 0; // Para el botón Recall (Canal Anterior)
    let currentStreamUrlIndex = 0; // Índice de la URL HLS que se está probando dentro del canal
    let isSkipping = false; // Bandera de salto automático de canal
    let guideFocusedIndex = 0;
    let isGuideOpen = false;

    // Temporizadores
    let osdTimer = null;
    let numberBufferTimer = null;
    let numberBuffer = '';
    let streamLoadTimeoutTimer = null;
    let channelWatchdogTimer = null;
    let blackScreenTimer = null;

    // Reproductor HLS
    let hlsInstance = null;

    // Elementos del DOM (Soporta tv-player y player)
    const videoEl = document.getElementById('tv-player') || document.getElementById('player');
    const muteNoticeEl = document.getElementById('mute-notice');
    const osdEl = document.getElementById('osd');
    const osdNumberEl = document.getElementById('osd-number');
    const osdNameEl = document.getElementById('osd-name');
    const osdClockEl = document.getElementById('osd-clock');
    const numberDialerEl = document.getElementById('number-dialer');
    const dialerDigitsEl = document.getElementById('dialer-digits');
    const channelGuideEl = document.getElementById('channel-guide');
    const guideListEl = document.getElementById('guide-list');
    const statusOverlayEl = document.getElementById('status-overlay');
    const statusTextEl = document.getElementById('status-text');
    const statusSubtextEl = document.getElementById('status-subtext');

    // --------------------------------------------------------------------------
    // 4. Inicialización de Tizen, Teclas y Anti-Screensaver
    // --------------------------------------------------------------------------
    function initTizenFeatures() {
        if (window.tizen && window.tizen.tvinputdevice) {
            const keysToRegister = [
                'ChannelUp',
                'ChannelDown',
                '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'
            ];

            keysToRegister.forEach(function (keyName) {
                try {
                    window.tizen.tvinputdevice.registerKey(keyName);
                } catch (err) {
                    console.warn('Jandos-TV: No se pudo registrar la tecla ' + keyName, err);
                }
            });
        }

        try {
            if (window.tizen && window.tizen.power) {
                window.tizen.power.request('SCREEN', 'SCREEN_NORMAL');
                console.log('Jandos-TV: Pantalla bloqueada contra protector (SCREEN_NORMAL)');
            }
        } catch (e) {
            console.warn('Jandos-TV: No se pudo solicitar tizen.power', e);
        }
    }

    // --------------------------------------------------------------------------
    // 5. Reloj Gigante de Perú y Notificaciones OSD
    // --------------------------------------------------------------------------
    function getPeruTime12H() {
        try {
            const now = new Date();
            return now.toLocaleTimeString('en-US', {
                timeZone: 'America/Lima',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            const now = new Date();
            let hours = now.getHours();
            const minutes = now.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const strMinutes = minutes < 10 ? '0' + minutes : minutes;
            const strHours = hours < 10 ? '0' + hours : hours;
            return strHours + ':' + strMinutes + ' ' + ampm;
        }
    }

    function formatChannelNumber(index) {
        const num = index + 1;
        return num < 10 ? '0' + num : '' + num;
    }

    function showOSD() {
        try {
            if (!channels || !channels[currentChannelIndex]) return;

            const currentChannel = channels[currentChannelIndex];
            if (osdNumberEl) {
                osdNumberEl.textContent = formatChannelNumber(currentChannelIndex);
            }

            if (osdClockEl) {
                osdClockEl.textContent = getPeruTime12H();
            }

            if (osdNameEl) {
                if (currentChannel.urls && currentChannel.urls.length > 1 && currentStreamUrlIndex > 0) {
                    osdNameEl.textContent = currentChannel.name + ' (Señal ' + (currentStreamUrlIndex + 1) + ' de ' + currentChannel.urls.length + ')';
                } else {
                    osdNameEl.textContent = currentChannel.name;
                }
            }

            if (osdEl) {
                osdEl.classList.add('visible');
            }

            if (osdTimer) {
                clearTimeout(osdTimer);
            }

            osdTimer = setTimeout(function () {
                if (osdEl) {
                    osdEl.classList.remove('visible');
                }
            }, OSD_DURATION_MS);
        } catch (err) {
            console.warn('Jandos-TV: Error seguro en showOSD:', err);
        }
    }

    function showStatus(message, subtext) {
        try {
            if (statusTextEl) statusTextEl.textContent = message || 'Sintonizando canal...';
            if (statusSubtextEl) statusSubtextEl.textContent = subtext || 'Por favor espere un momento';
            if (statusOverlayEl) statusOverlayEl.classList.add('visible');
        } catch (e) {
            console.warn('Jandos-TV: Error seguro en showStatus:', e);
        }
    }

    function hideStatus() {
        try {
            if (statusOverlayEl) statusOverlayEl.classList.remove('visible');
        } catch (e) {
            console.warn('Jandos-TV: Error seguro en hideStatus:', e);
        }
    }

    // --------------------------------------------------------------------------
    // 6. Watchdog, Salto Automático y Reproducción Multi-Señal
    // --------------------------------------------------------------------------
    function clearStreamTimers() {
        if (streamLoadTimeoutTimer) {
            clearTimeout(streamLoadTimeoutTimer);
            streamLoadTimeoutTimer = null;
        }
        if (channelWatchdogTimer) {
            clearTimeout(channelWatchdogTimer);
            channelWatchdogTimer = null;
        }
        if (blackScreenTimer) {
            clearTimeout(blackScreenTimer);
            blackScreenTimer = null;
        }
    }

    function resetPlayerState() {
        if (hlsInstance) {
            try { hlsInstance.destroy(); } catch (e) {}
            hlsInstance = null;
        }
        if (videoEl) {
            videoEl.pause();
            videoEl.removeAttribute('src');
            videoEl.load();
        }
    }

    function showMuteNotice() {
        if (muteNoticeEl) muteNoticeEl.classList.add('visible');
    }

    function hideMuteNotice() {
        if (muteNoticeEl) muteNoticeEl.classList.remove('visible');
    }

    function forceUnmuteAudio() {
        if (videoEl) {
            videoEl.muted = false;
            videoEl.volume = 1.0;
            hideMuteNotice();
            console.log('Jandos-TV: Audio forzado activo (muted=false, volume=1.0)');
        }
    }

    function unmuteAudioIfNeeded() {
        forceUnmuteAudio();
    }

    function startChannelWatchdog() {
        if (channelWatchdogTimer) clearTimeout(channelWatchdogTimer);
        // Watchdog de 15 segundos: si no hay frames de video reproducidos tras 15s, mostrar mensaje sin cambiar de canal
        channelWatchdogTimer = setTimeout(function () {
            console.warn('Jandos-TV Watchdog: 15 segundos sin reproducción en el canal actual.');
            clearStreamTimers();
            resetPlayerState();
            showStatus('Señal no disponible temporalmente en este canal', 'Presione Arriba/Abajo para cambiar');
            showOSD();
        }, CHANNEL_WATCHDOG_MS);
    }

    function skipToNextChannel(message) {
        clearStreamTimers();
        resetPlayerState();
        showStatus('Señal no disponible temporalmente en este canal', 'Presione Arriba/Abajo para cambiar');
        showOSD();
    }

    function playChannel(index) {
        if (!channels || channels.length === 0) return;

        clearStreamTimers();

        // Normalizar índice circular
        let targetIndex = index;
        if (targetIndex < 0) {
            targetIndex = channels.length - 1;
        } else if (targetIndex >= channels.length) {
            targetIndex = 0;
        }

        if (targetIndex !== currentChannelIndex) {
            previousChannelIndex = currentChannelIndex;
        }

        currentChannelIndex = targetIndex;
        currentStreamUrlIndex = 0;
        resetPlayerState();

        // Garantizar audio activado en cada cambio de canal
        if (videoEl) {
            videoEl.muted = false;
            videoEl.volume = 1.0;
        }
        hideMuteNotice();

        const channel = channels[currentChannelIndex];
        console.log('Jandos-TV: Sintonizando canal ' + (currentChannelIndex + 1) + ': ' + channel.name);

        try {
            localStorage.setItem(STORAGE_KEY_LAST_CHANNEL, String(currentChannelIndex));
        } catch (e) {
            console.warn('Jandos-TV: No se pudo guardar en localStorage', e);
        }

        // Actualizaciones visuales protegidas para que jamás bloqueen el reproductor de video
        try { showOSD(); } catch (e) { console.warn('Jandos-TV: Error en showOSD', e); }
        try { showStatus('Sintonizando ' + channel.name, 'Conectando con la señal...'); } catch (e) { console.warn('Jandos-TV: Error en showStatus', e); }
        try { updateGuideActiveChannel(); } catch (e) { console.warn('Jandos-TV: Error en updateGuideActiveChannel', e); }

        // Iniciar Watchdog de 15 segundos
        startChannelWatchdog();

        // Cargar stream HLS de forma garantizada
        loadActiveStream();
    }

    function loadActiveStream() {
        resetPlayerState();
        const channel = channels[currentChannelIndex];
        if (!channel || !channel.urls || channel.urls.length === 0) {
            tryNextStreamUrl('Sin URLs HLS disponibles');
            return;
        }

        if (currentStreamUrlIndex >= channel.urls.length) {
            currentStreamUrlIndex = 0;
        }

        const streamUrl = channel.urls[currentStreamUrlIndex];
        console.log('Jandos-TV: Probando stream [' + (currentStreamUrlIndex + 1) + '/' + channel.urls.length + ']: ' + streamUrl);

        // Timeout de 8 segundos por señal individual
        if (streamLoadTimeoutTimer) clearTimeout(streamLoadTimeoutTimer);
        streamLoadTimeoutTimer = setTimeout(function () {
            console.warn('Jandos-TV: Timeout de 8s para la señal ' + (currentStreamUrlIndex + 1));
            tryNextStreamUrl('Tiempo de espera agotado');
        }, STREAM_TIMEOUT_MS);

        loadStream(streamUrl);
    }

    function attemptPlayVideo() {
        if (!videoEl) return;
        videoEl.muted = false;
        videoEl.volume = 1.0;

        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
            playPromise.then(function () {
                hideMuteNotice();
            }).catch(function (error) {
                console.warn('Jandos-TV: Autoplay con audio bloqueado por el navegador. Activando mute temporal:', error);
                videoEl.muted = true;
                videoEl.play().then(function () {
                    showMuteNotice();
                }).catch(function (err) {
                    console.error('Jandos-TV: Fallo play con mute:', err);
                });
            });
        }
    }

    function loadStream(streamUrl) {
        if (hlsInstance) {
            try {
                hlsInstance.destroy();
            } catch (e) {
                console.warn(e);
            }
            hlsInstance = null;
        }

        if (window.Hls && window.Hls.isSupported()) {
            hlsInstance = new window.Hls({
                enableWorker: true,
                lowLatencyMode: false,
                backBufferLength: 30,
                manifestLoadingTimeOut: 10000,
                levelLoadingTimeOut: 10000
            });

            hlsInstance.loadSource(streamUrl);
            hlsInstance.attachMedia(videoEl);

            hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, function (event, data) {
                console.log('Jandos-TV: Manifiesto HLS analizado con éxito.');

                // 1. Filtrar o seleccionar preferentemente niveles compatibles con AVC1 (H.264) y MP4A (AAC)
                if (data && data.levels && data.levels.length > 0) {
                    let compatibleLevelIndex = -1;
                    for (let i = 0; i < data.levels.length; i++) {
                        const lvl = data.levels[i];
                        const vCodec = (lvl.videoCodec || '').toLowerCase();
                        const aCodec = (lvl.audioCodec || '').toLowerCase();
                        const rawCodecs = (lvl.attrs && lvl.attrs.CODECS ? lvl.attrs.CODECS : '').toLowerCase();

                        const isHevc = vCodec.includes('hvc') || vCodec.includes('hev') || rawCodecs.includes('hvc') || rawCodecs.includes('hev');
                        const isAc3 = aCodec.includes('ac-3') || aCodec.includes('ec-3') || rawCodecs.includes('ac-3') || rawCodecs.includes('ec-3');

                        if (!isHevc && !isAc3) {
                            if (vCodec.includes('avc') || rawCodecs.includes('avc') || (!vCodec && !rawCodecs)) {
                                compatibleLevelIndex = i;
                                break;
                            }
                        }
                    }

                    if (compatibleLevelIndex !== -1 && hlsInstance.currentLevel !== compatibleLevelIndex) {
                        console.log('Jandos-TV: Nivel HLS compatible seleccionado (H.264+AAC): nivel ' + compatibleLevelIndex);
                        hlsInstance.currentLevel = compatibleLevelIndex;
                    }
                }

                // 2. Si hls.audioTracks tiene pistas disponibles y ninguna está activa, forzar pista 0 o español
                if (hlsInstance.audioTracks && hlsInstance.audioTracks.length > 0) {
                    let targetTrack = 0;
                    for (let t = 0; t < hlsInstance.audioTracks.length; t++) {
                        const track = hlsInstance.audioTracks[t];
                        const lang = (track.lang || track.name || '').toLowerCase();
                        if (lang.includes('es') || lang.includes('spa')) {
                            targetTrack = t;
                            break;
                        }
                    }

                    if (hlsInstance.audioTrack === -1 || hlsInstance.audioTrack === undefined) {
                        console.log('Jandos-TV: Forzando activación de pista de audio HLS:', targetTrack);
                        hlsInstance.audioTrack = targetTrack;
                    }
                }

                attemptPlayVideo();
            });

            hlsInstance.on(window.Hls.Events.ERROR, function (event, data) {
                const details = data && data.details ? data.details : '';
                console.warn('Jandos-TV: Evento de error HLS:', data.type, details, 'Fatal:', data.fatal);

                // Si ocurre incompatibilidad de códecs, saltar de inmediato al siguiente stream sin esperar timeout
                if (
                    details === 'bufferAddCodecError' ||
                    details === 'manifestIncompatibleCodecsError' ||
                    details === (window.Hls.ErrorDetails && window.Hls.ErrorDetails.BUFFER_ADD_CODEC_ERROR) ||
                    details === (window.Hls.ErrorDetails && window.Hls.ErrorDetails.MANIFEST_INCOMPATIBLE_CODECS_ERROR)
                ) {
                    console.warn('Jandos-TV: Códec no soportado detectado por Hls.js (' + details + '). Descartando señal de inmediato.');
                    tryNextStreamUrl('Códec incompatible (' + details + ')');
                    return;
                }

                if (data.fatal) {
                    console.warn('Jandos-TV: Error fatal en HLS:', details);
                    tryNextStreamUrl(details || 'Fallo de señal');
                }
            });
        } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            videoEl.src = streamUrl;
            attemptPlayVideo();
        } else {
            console.error('Jandos-TV: Formato no soportado');
            tryNextStreamUrl('Formato no soportado');
        }
    }

    function tryNextStreamUrl(reason) {
        if (streamLoadTimeoutTimer) {
            clearTimeout(streamLoadTimeoutTimer);
            streamLoadTimeoutTimer = null;
        }

        const channel = channels[currentChannelIndex];
        if (!channel) return;

        // 1. Probar siguiente señal HLS disponible para este canal
        if (channel.urls && channel.urls.length > 1 && currentStreamUrlIndex < channel.urls.length - 1) {
            currentStreamUrlIndex++;
            console.log('Jandos-TV: Probando automáticamente señal ' + (currentStreamUrlIndex + 1) + ' para ' + channel.name + ' (motivo: ' + reason + ')');
            showStatus('Buscando señal alterna...', 'Probando señal ' + (currentStreamUrlIndex + 1) + ' de ' + channel.urls.length);
            showOSD();
            loadActiveStream();
            return;
        }

        // 2. Si todas las señales HLS fallaron, NO saltar de canal solo: quedarse en el canal con mensaje limpio
        console.warn('Jandos-TV: Canal ' + channel.name + ' sin señales funcionales (' + reason + '). Manteniendo canal.');
        clearStreamTimers();
        resetPlayerState();
        showStatus('Señal no disponible temporalmente en este canal', 'Presione Arriba/Abajo para cambiar');
        showOSD();
    }

    function handleStreamFailure(reason) {
        tryNextStreamUrl(reason);
    }

    function switchNextSignalManual() {
        const channel = channels[currentChannelIndex];
        if (!channel || !channel.urls || channel.urls.length <= 1) {
            showStatus(channel ? channel.name : 'Canal', 'Este canal solo dispone de 1 señal directa');
            showOSD();
            setTimeout(hideStatus, 2000);
            return;
        }

        resetPlayerState();
        currentStreamUrlIndex = (currentStreamUrlIndex + 1) % channel.urls.length;
        console.log('Jandos-TV: Cambio manual de señal a [' + (currentStreamUrlIndex + 1) + '/' + channel.urls.length + ']');

        showStatus('Cambiando a Señal ' + (currentStreamUrlIndex + 1) + ' de ' + channel.urls.length, 'Sintonizando transmisión alternativa...');
        showOSD();
        loadActiveStream();
    }

    // Eventos del elemento <video>
    videoEl.addEventListener('playing', function () {
        hideStatus();
        // Cancelar inmediatamente watchdog y timeouts una vez que hay reproducción activa
        clearStreamTimers();
    });

    // En timeupdate: apenas se verifique reproducción activa (readyState >= 2 o currentTime > 0), cancelar timers
    videoEl.addEventListener('timeupdate', function () {
        if ((videoEl.readyState >= 2 || videoEl.currentTime > 0) && !videoEl.paused) {
            clearStreamTimers();
            hideStatus();
        }
    });

    videoEl.addEventListener('waiting', function () {
        showStatus('Sintonizando canal...', 'Cargando señal...');
    });

    videoEl.addEventListener('error', function () {
        tryNextStreamUrl('Error del elemento video');
    });

    // --------------------------------------------------------------------------
    // 7. Guía Lateral Rápida por Bloques y Categorías (Botón OK / Enter)
    // --------------------------------------------------------------------------
    function renderGuide() {
        guideListEl.innerHTML = '';
        let lastCategory = null;

        channels.forEach(function (ch, idx) {
            const category = ch.category || (idx < 12 ? 'NACIONALES' : (idx < 23 ? 'DEPORTES' : 'VARIEDADES'));

            // Agregar separador de categoría si cambia
            if (category !== lastCategory) {
                lastCategory = category;
                const catHeader = document.createElement('div');
                let catClass = 'cat-CINE';
                if (category === 'NACIONALES') catClass = 'cat-NACIONALES';
                else if (category === 'DEPORTES') catClass = 'cat-DEPORTES';
                else if (category === 'DIBUJOS Y ANIMACIÓN' || category === 'DIBUJOS' || category === 'ANIMACION' || category === 'ANIMACIÓN') catClass = 'cat-ANIMACION';
                else if (category === 'REGIONALES') catClass = 'cat-REGIONALES';

                catHeader.className = 'guide-category-header ' + catClass;
                catHeader.textContent = (category === 'DIBUJOS Y ANIMACIÓN' || category === 'DIBUJOS' || category === 'ANIMACION' || category === 'ANIMACIÓN') ? '🟡 ' + category : 'BLOQUE: ' + category;
                guideListEl.appendChild(catHeader);
            }

            const item = document.createElement('div');
            item.className = 'guide-item';
            item.dataset.index = idx;

            if (idx === currentChannelIndex) {
                item.classList.add('active-playing');
            }
            if (idx === guideFocusedIndex) {
                item.classList.add('focused');
            }

            const numSpan = document.createElement('span');
            numSpan.className = 'guide-item-num';
            numSpan.textContent = formatChannelNumber(idx);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'guide-item-name';
            nameSpan.textContent = ch.name;

            const badgeSpan = document.createElement('span');
            let catBadgeClass = 'cat-CINE';
            if (category === 'NACIONALES') catBadgeClass = 'cat-NACIONALES';
            else if (category === 'DEPORTES') catBadgeClass = 'cat-DEPORTES';
            else if (category === 'DIBUJOS Y ANIMACIÓN' || category === 'DIBUJOS' || category === 'ANIMACION' || category === 'ANIMACIÓN') catBadgeClass = 'cat-ANIMACION';
            else if (category === 'REGIONALES') catBadgeClass = 'cat-REGIONALES';

            badgeSpan.className = 'guide-item-cat ' + catBadgeClass;
            badgeSpan.textContent = (category === 'DIBUJOS Y ANIMACIÓN') ? 'ANIMACIÓN' : category;

            item.appendChild(numSpan);
            item.appendChild(nameSpan);
            item.appendChild(badgeSpan);
            guideListEl.appendChild(item);
        });
    }

    function updateGuideFocus() {
        if (!guideListEl || !guideListEl.querySelectorAll) return;
        const items = guideListEl.querySelectorAll('.guide-item');
        items.forEach(function (item, idx) {
            if (idx === guideFocusedIndex) {
                item.classList.add('focused');
                if (item.scrollIntoView) {
                    item.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            } else {
                item.classList.remove('focused');
            }
        });
    }

    function updateGuideActiveChannel() {
        if (!guideListEl || !guideListEl.querySelectorAll) return;
        const items = guideListEl.querySelectorAll('.guide-item');
        items.forEach(function (item, idx) {
            if (idx === currentChannelIndex) {
                item.classList.add('active-playing');
            } else {
                item.classList.remove('active-playing');
            }
        });
    }

    function toggleGuide() {
        if (isGuideOpen) {
            closeGuide();
        } else {
            openGuide();
        }
    }

    function openGuide() {
        isGuideOpen = true;
        guideFocusedIndex = currentChannelIndex;
        renderGuide();
        channelGuideEl.classList.add('visible');
        updateGuideFocus();
    }

    function closeGuide() {
        isGuideOpen = false;
        channelGuideEl.classList.remove('visible');
    }

    // --------------------------------------------------------------------------
    // 8. Buffer de Entrada Numérica (Teclas 0 a 9)
    // --------------------------------------------------------------------------
    function handleDigitInput(digitChar) {
        if (numberBufferTimer) {
            clearTimeout(numberBufferTimer);
        }

        numberBuffer += digitChar;
        dialerDigitsEl.textContent = numberBuffer;
        numberDialerEl.classList.add('visible');

        numberBufferTimer = setTimeout(function () {
            commitNumberBuffer();
        }, NUMBER_BUFFER_TIMEOUT_MS);
    }

    function commitNumberBuffer() {
        if (!numberBuffer) return;

        const targetChannelNumber = parseInt(numberBuffer, 10);
        numberBuffer = '';
        numberDialerEl.classList.remove('visible');

        if (!isNaN(targetChannelNumber) && targetChannelNumber > 0) {
            const targetIndex = targetChannelNumber - 1;
            if (targetIndex < channels.length) {
                if (isGuideOpen) {
                    closeGuide();
                }
                playChannel(targetIndex);
            } else {
                playChannel(channels.length - 1);
            }
        }
    }

    // --------------------------------------------------------------------------
    // 9. Carga de JSON Remoto y Actualización en Caliente
    // --------------------------------------------------------------------------
    function applyRemoteChannelsConfig(remoteChannels) {
        if (!Array.isArray(remoteChannels) || remoteChannels.length === 0) return;

        console.log('Jandos-TV: Aplicando ' + remoteChannels.length + ' canales curados desde JSON');
        channels = remoteChannels.map(function (rCh, idx) {
            return {
                id: rCh.id || (idx + 1),
                name: rCh.name,
                category: rCh.category || (idx < 12 ? 'NACIONALES' : (idx < 20 ? 'DEPORTES' : 'VARIEDADES')),
                urls: Array.isArray(rCh.urls) ? rCh.urls : (rCh.url ? [rCh.url] : [])
            };
        });

        if (isGuideOpen) {
            renderGuide();
        }
    }

    function fetchRemoteJsonConfig() {
        function tryFetch(url) {
            return fetch(url, { cache: 'no-store' })
                .then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                });
        }

        // 1. Probar URL remota de GitHub primero
        tryFetch(CUSTOM_REMOTE_JSON_URL)
            .then(function (data) {
                if (data && data.channels && data.channels.length > 0) {
                    console.log('Jandos-TV: Configuración remota GitHub actualizada exitosamente (' + data.channels.length + ' canales)');
                    applyRemoteChannelsConfig(data.channels);
                }
            })
            .catch(function () {
                // 2. Si no hay conexión con GitHub, cargar plantilla local empaquetada
                return tryFetch(LOCAL_FALLBACK_JSON_URL)
                    .then(function (localData) {
                        if (localData && localData.channels && localData.channels.length > 0) {
                            console.log('Jandos-TV: Configuración local canales-remotos.json aplicada (' + localData.channels.length + ' canales)');
                            applyRemoteChannelsConfig(localData.channels);
                        }
                    })
                    .catch(function (e) {
                        console.warn('Jandos-TV: Usando parrilla base predeterminada', e);
                    });
            });
    }

    // --------------------------------------------------------------------------
    // 10. Controlador de Eventos de Teclado y Control Remoto Samsung
    // --------------------------------------------------------------------------
    function onKeyDown(e) {
        // Al interactuar con cualquier tecla, activar audio si estaba silenciado por el navegador
        unmuteAudioIfNeeded();

        const keyCode = e.keyCode;

        // Tecla Return / Atrás de Samsung Tizen: 10009 (Escape: 27, Backspace: 8)
        if (keyCode === 10009 || keyCode === 27 || keyCode === 8) {
            e.preventDefault();
            if (isGuideOpen) {
                closeGuide();
            } else {
                showOSD();
            }
            return;
        }

        // Teclas Numéricas (0 a 9)
        if ((keyCode >= 48 && keyCode <= 57) || (keyCode >= 96 && keyCode <= 105)) {
            let digit = '';
            if (keyCode >= 48 && keyCode <= 57) {
                digit = String(keyCode - 48);
            } else {
                digit = String(keyCode - 96);
            }
            handleDigitInput(digit);
            return;
        }

        // Flecha Arriba (38) y Samsung ChannelUp (427)
        if (keyCode === 38 || keyCode === 427) {
            e.preventDefault();
            if (isGuideOpen) {
                guideFocusedIndex = (guideFocusedIndex - 1 + channels.length) % channels.length;
                updateGuideFocus();
            } else {
                playChannel(currentChannelIndex + 1);
            }
            return;
        }

        // Flecha Abajo (40) y Samsung ChannelDown (428)
        if (keyCode === 40 || keyCode === 428) {
            e.preventDefault();
            if (isGuideOpen) {
                guideFocusedIndex = (guideFocusedIndex + 1) % channels.length;
                updateGuideFocus();
            } else {
                playChannel(currentChannelIndex - 1);
            }
            return;
        }

        // Flecha Izquierda (37): BOTÓN RECALL (Canal Anterior Visto)
        if (keyCode === 37) {
            e.preventDefault();
            if (isGuideOpen) {
                closeGuide();
            } else {
                console.log('Jandos-TV: Recall al canal anterior visto: ' + (previousChannelIndex + 1));
                playChannel(previousChannelIndex);
            }
            return;
        }

        // Flecha Derecha (39): CAMBIO MANUAL DE SEÑAL / STREAM
        if (keyCode === 39) {
            e.preventDefault();
            if (!isGuideOpen) {
                switchNextSignalManual();
            }
            return;
        }

        // Botón OK / Enter (13)
        if (keyCode === 13) {
            e.preventDefault();
            if (isGuideOpen) {
                playChannel(guideFocusedIndex);
                closeGuide();
            } else {
                openGuide();
            }
            return;
        }
    }

    // --------------------------------------------------------------------------
    // 11. Arranque de la Aplicación
    // --------------------------------------------------------------------------
    function init() {
        initTizenFeatures();
        document.addEventListener('keydown', onKeyDown, false);
        document.addEventListener('click', unmuteAudioIfNeeded, false);
        document.addEventListener('touchstart', unmuteAudioIfNeeded, false);

        // Recuperar último canal visto desde localStorage
        let savedIndex = 0;
        try {
            const raw = localStorage.getItem(STORAGE_KEY_LAST_CHANNEL);
            if (raw !== null) {
                const parsed = parseInt(raw, 10);
                if (!isNaN(parsed) && parsed >= 0) {
                    savedIndex = parsed;
                }
            }
        } catch (e) {
            console.warn(e);
        }

        if (savedIndex >= channels.length) {
            savedIndex = 0;
        }

        // Reproducir de inmediato el canal guardado
        playChannel(savedIndex);

        // Cargar configuración de canales curada
        fetchRemoteJsonConfig();

        // Consultar configuración remota periódicamente cada 30 minutos
        setInterval(fetchRemoteJsonConfig, REMOTE_CONFIG_INTERVAL_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
