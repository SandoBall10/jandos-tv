/**
 * Jandos-TV - Aplicación Nativa Samsung Smart TV (Tizen OS)
 * Diseñado con cero fricción, altísimo contraste y priorización de canales nacionales de Perú.
 */

(function () {
    'use strict';

    // --------------------------------------------------------------------------
    // 1. Constantes y Configuración Remota
    // --------------------------------------------------------------------------
    // URL Remota Personalizable: Coloca aquí el link RAW de tu repositorio GitHub.
    // Ejemplo: 'https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/main/canales-remotos.json'
    const CUSTOM_REMOTE_JSON_URL = 'https://raw.githubusercontent.com/SandoBall10/jandos-tv/main/canales-remotos.json';
    const LOCAL_FALLBACK_JSON_URL = './canales-remotos.json';
    const REMOTE_CONFIG_INTERVAL_MS = 30 * 60 * 1000; // Consulta cada 30 minutos

    // Fuentes M3U secundarias en paralelo
    const M3U_SOURCES = [
        'https://iptv-org.github.io/iptv/countries/pe.m3u',
        'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/pe.m3u',
        'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlists/playlist_peru.m3u8'
    ];

    const STORAGE_KEY_LAST_CHANNEL = 'jandos_tv_last_channel_index';
    const OSD_DURATION_MS = 4000;
    const NUMBER_BUFFER_TIMEOUT_MS = 1800;
    const RECONNECT_INTERVAL_MS = 4000;
    const STREAM_TIMEOUT_MS = 6000; // 6 segundos antes de probar la siguiente señal

    // --------------------------------------------------------------------------
    // 2. Canales Principales del Perú (Top 12 con Orden Estricto y Multi-Señal)
    // --------------------------------------------------------------------------
    const TOP_NATIONAL_CHANNELS = [
        {
            name: 'Latina Televisión',
            keywords: ['latina', 'frecuencia latina', 'canal 2'],
            urls: [
                'https://dai.google.com/linear/hls/event/oYQGDqEGTmGdHE_fz9oLlg/master.m3u8',
                'http://190.93.224.42/LATINA/index.m3u8',
                'http://45.171.108.253:8888/LATINA/index.m3u8',
                'https://redirector.rudo.video/hls-video/plus226/latina4/latina4.smil/playlist.m3u8'
            ],
            youtubeChannelId: 'UC6Xw2bFj8vQf0sD8tK8y0qw',
            youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC6Xw2bFj8vQf0sD8tK8y0qw&autoplay=1&mute=0'
        },
        {
            name: 'América Televisión',
            keywords: ['america television', 'américa televisión', 'america tv', 'américa tv', 'canal 4'],
            urls: [
                'http://45.171.108.253:8888/AMERICA/index.m3u8',
                'http://190.93.224.42/AMERICA/index.m3u8'
            ],
            youtubeChannelId: 'UC4Z4s3zB8T4xVzT2k7_0nCw',
            youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC4Z4s3zB8T4xVzT2k7_0nCw&autoplay=1&mute=0'
        },
        {
            name: 'Panamericana Televisión',
            keywords: ['panamericana', 'canal 5'],
            urls: [
                'http://45.171.108.253:8888/PANAMERICANA/index.m3u8',
                'http://190.93.224.42/PANAMERICANA/index.m3u8'
            ],
            youtubeChannelId: 'UC8L0o0s3t308_e9c0z4A_ww',
            youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC8L0o0s3t308_e9c0z4A_ww&autoplay=1&mute=0'
        },
        {
            name: 'TV Perú',
            keywords: ['tv peru', 'tv perú', 'canal 7', 'tnp'],
            urls: [
                'http://190.93.224.42/TV-PERU/index.m3u8',
                'http://45.171.108.253:8888/TVPERU/index.m3u8',
                'http://bantel-cdn1.iptvperu.tv:1935/btnscrtn/nacionaltv_peru.stream/playlist.m3u8',
                'https://k20.usastreams.com:8081/tvperuanisima/index.m3u8'
            ],
            youtubeChannelId: 'UCyvK7t9N8eP1ZfQ7dF2u3gA',
            youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCyvK7t9N8eP1ZfQ7dF2u3gA&autoplay=1&mute=0'
        },
        {
            name: 'ATV',
            keywords: ['atv', 'canal 9', 'andina de television'],
            urls: [
                'http://190.93.224.42/ATV/index.m3u8',
                'http://45.171.108.253:8888/ATV/index.m3u8'
            ],
            youtubeChannelId: 'UC8L0o0s3t308_atv_noticias',
            youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC8L0o0s3t308_atv_noticias&autoplay=1&mute=0'
        },
        {
            name: 'ATV+',
            keywords: ['atv+', 'atv plus', 'atv mas', 'atv más'],
            urls: [
                'http://45.171.108.253:8888/ATV/index.m3u8',
                'http://190.93.224.42/ATV-MAS/index.m3u8',
                'http://190.93.224.42/ATV-SUR/index.m3u8'
            ],
            youtubeChannelId: 'UC8L0o0s3t308_atv_mas',
            youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC8L0o0s3t308_atv_mas&autoplay=1&mute=0'
        },
        {
            name: 'TV Perú Noticias',
            keywords: ['tv peru noticias', 'tv perú noticias', '7.3', 'peru noticias'],
            urls: [
                'http://190.93.224.42/TV-PERU-NOTICIAS/index.m3u8',
                'http://45.171.108.253:8888/TVPERUNOTICIAS/index.m3u8'
            ],
            youtubeChannelId: 'UCyvK7t9N8eP1ZfQ7dF2u3gA',
            youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCyvK7t9N8eP1ZfQ7dF2u3gA&autoplay=1&mute=0'
        },
        {
            name: 'Willax TV',
            keywords: ['willax'],
            urls: [
                'http://190.93.224.42/WILLAX/index.m3u8',
                'http://45.171.108.253:8888/WILLAX/index.m3u8'
            ],
            youtubeChannelId: 'UCwillax_oficial_envivo',
            youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCwillax_oficial_envivo&autoplay=1&mute=0'
        },
        {
            name: 'Exitosa TV',
            keywords: ['exitosa'],
            urls: [
                'http://190.93.224.42/EXITOSA/index.m3u8',
                'http://45.171.108.253:8888/EXITOSA/index.m3u8'
            ],
            youtubeChannelId: 'UCa5T-U9o3j0c8vK8y0exitosa',
            youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCa5T-U9o3j0c8vK8y0exitosa&autoplay=1&mute=0'
        },
        {
            name: 'Nativa TV / RPP / Ovación',
            keywords: ['nativa', 'rpp', 'ovacion', 'ovación'],
            urls: [
                'http://187.102.210.46/NATIVATV/index.m3u8',
                'https://live-evg7.tv360.bitel.com.pe/bitel/nativachanchamayoSRT/playlist.m3u8',
                'http://190.93.224.42/RPP/index.m3u8',
                'http://cdn2.ujjina.com:1935/iptvovacion1/liveovacion1tv/playlist.m3u8'
            ],
            youtubeChannelId: 'UCnativa_tv_peru_oficial',
            youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCnativa_tv_peru_oficial&autoplay=1&mute=0'
        },
        {
            name: 'Congreso TV / Justicia TV',
            keywords: ['congreso', 'justicia tv', 'justiciatv'],
            urls: [
                'http://190.93.224.42/JUSTICIA-TV/index.m3u8',
                'http://45.171.108.253:8888/CONGRESO/index.m3u8',
                'http://190.93.224.42/CONGRESO/index.m3u8'
            ],
            youtubeChannelId: 'UCcongreso_peru_oficial',
            youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCcongreso_peru_oficial&autoplay=1&mute=0'
        },
        {
            name: 'Sol TV / Señales Regionales',
            keywords: ['sol tv', 'antares', 'antena sur', '36 tv huacho', 'agro tv'],
            urls: [
                'https://live-evg10.tv360.bitel.com.pe/bitel/36tvSRT/playlist.m3u8',
                'https://cloudpro.servidoresdestream.com:8081/8010/index.m3u8',
                'https://5949aa132c8fb.streamlock.net:1963/iptvantares/liveantarestv/playlist.m3u8',
                'https://live-evg8.tv360.bitel.com.pe/bitel/agroSRT/playlist.m3u8',
                'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
            ],
            youtubeChannelId: 'UCsol_tv_peru_oficial',
            youtubeEmbedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCsol_tv_peru_oficial&autoplay=1&mute=0'
        }
    ];

    // --------------------------------------------------------------------------
    // 3. Estado de la Aplicación
    // --------------------------------------------------------------------------
    let channels = TOP_NATIONAL_CHANNELS.map(function (ch) {
        return {
            name: ch.name,
            urls: [...ch.urls],
            url: ch.urls[0],
            youtubeChannelId: ch.youtubeChannelId || null,
            youtubeEmbedUrl: ch.youtubeEmbedUrl || null
        };
    });

    let currentChannelIndex = 0;
    let previousChannelIndex = 0; // Para el botón Recall (Canal Anterior)
    let currentStreamUrlIndex = 0; // Índice de la URL HLS que se está probando dentro del canal
    let isYouTubeActive = false; // Bandera de transmisión de YouTube activa
    let guideFocusedIndex = 0;
    let isGuideOpen = false;

    // Temporizadores
    let osdTimer = null;
    let numberBufferTimer = null;
    let numberBuffer = '';
    let reconnectTimer = null;
    let streamLoadTimeoutTimer = null;

    // Reproductor HLS
    let hlsInstance = null;
    let isReconnecting = false;

    // Elementos del DOM
    const videoEl = document.getElementById('player');
    const youtubePlayerEl = document.getElementById('youtube-player');
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
        // 1. Registro de teclas físicas del control remoto Samsung
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

        // 2. Prevención de protector de pantalla (Screen lock)
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
        if (!channels[currentChannelIndex]) return;

        const currentChannel = channels[currentChannelIndex];
        osdNumberEl.textContent = formatChannelNumber(currentChannelIndex);

        // Actualizar reloj en hora local de Perú
        if (osdClockEl) {
            osdClockEl.textContent = getPeruTime12H();
        }

        // Mostrar nombre y detalles de señal
        if (isYouTubeActive) {
            osdNameEl.textContent = currentChannel.name + ' (YouTube Live Oficial)';
        } else if (currentChannel.urls && currentChannel.urls.length > 1 && currentStreamUrlIndex > 0) {
            osdNameEl.textContent = currentChannel.name + ' (Señal ' + (currentStreamUrlIndex + 1) + ' de ' + currentChannel.urls.length + ')';
        } else {
            osdNameEl.textContent = currentChannel.name;
        }

        osdEl.classList.add('visible');

        if (osdTimer) {
            clearTimeout(osdTimer);
        }

        osdTimer = setTimeout(function () {
            osdEl.classList.remove('visible');
        }, OSD_DURATION_MS);
    }

    function showStatus(message, subtext) {
        statusTextEl.textContent = message || 'Sintonizando canal...';
        statusSubtextEl.textContent = subtext || 'Por favor espere un momento';
        statusOverlayEl.classList.add('visible');
    }

    function hideStatus() {
        statusOverlayEl.classList.remove('visible');
    }

    // --------------------------------------------------------------------------
    // 6. Reproducción, Multi-Señal, Auto-Failover y YouTube Live
    // --------------------------------------------------------------------------
    function clearStreamTimers() {
        if (streamLoadTimeoutTimer) {
            clearTimeout(streamLoadTimeoutTimer);
            streamLoadTimeoutTimer = null;
        }
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    }

    function resetVideoAndYouTubeState() {
        isYouTubeActive = false;
        if (youtubePlayerEl) {
            youtubePlayerEl.classList.remove('active');
            youtubePlayerEl.src = '';
        }
        if (videoEl) {
            videoEl.style.display = 'block';
        }
    }

    function playChannel(index) {
        if (!channels || channels.length === 0) return;

        clearStreamTimers();
        isReconnecting = false;

        // Normalizar índice circular
        let targetIndex = index;
        if (targetIndex < 0) {
            targetIndex = channels.length - 1;
        } else if (targetIndex >= channels.length) {
            targetIndex = 0;
        }

        // Guardar el canal actual como previo (Recall) si cambiamos de canal
        if (targetIndex !== currentChannelIndex) {
            previousChannelIndex = currentChannelIndex;
        }

        currentChannelIndex = targetIndex;
        currentStreamUrlIndex = 0; // Reiniciar a la primera señal preferida
        resetVideoAndYouTubeState();

        const channel = channels[currentChannelIndex];
        console.log('Jandos-TV: Sintonizando canal ' + (currentChannelIndex + 1) + ': ' + channel.name);

        // Guardar en almacenamiento local
        try {
            localStorage.setItem(STORAGE_KEY_LAST_CHANNEL, String(currentChannelIndex));
        } catch (e) {
            console.warn('Jandos-TV: No se pudo guardar en localStorage', e);
        }

        showOSD();
        showStatus('Sintonizando ' + channel.name, 'Conectando con la señal...');
        updateGuideActiveChannel();

        loadActiveStream();
    }

    function loadActiveStream() {
        resetVideoAndYouTubeState();
        const channel = channels[currentChannelIndex];
        if (!channel || !channel.urls || channel.urls.length === 0) {
            handleStreamFailure('Sin URLs HLS disponibles');
            return;
        }

        if (currentStreamUrlIndex >= channel.urls.length) {
            currentStreamUrlIndex = 0;
        }

        const streamUrl = channel.urls[currentStreamUrlIndex];
        console.log('Jandos-TV: Intentando stream HLS [' + (currentStreamUrlIndex + 1) + '/' + channel.urls.length + ']: ' + streamUrl);

        // Temporizador de 6 segundos para auto-conmutación
        if (streamLoadTimeoutTimer) clearTimeout(streamLoadTimeoutTimer);
        streamLoadTimeoutTimer = setTimeout(function () {
            console.warn('Jandos-TV: Tiempo de espera agotado (6s) para la señal ' + (currentStreamUrlIndex + 1));
            handleStreamFailure('Tiempo de espera agotado');
        }, STREAM_TIMEOUT_MS);

        loadStream(streamUrl);
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
                lowLatencyMode: true,
                manifestLoadingTimeOut: 6000,
                manifestLoadingMaxRetry: 1,
                levelLoadingTimeOut: 6000,
                fragLoadingTimeOut: 7000
            });

            hlsInstance.loadSource(streamUrl);
            hlsInstance.attachMedia(videoEl);

            hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, function () {
                videoEl.play().catch(function (e) {
                    console.log('Jandos-TV: Esperando interacción para audio', e);
                });
            });

            hlsInstance.on(window.Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    console.warn('Jandos-TV: Error fatal en HLS', data.type, data.details);
                    handleStreamFailure(data.details || 'Fallo de señal');
                }
            });
        } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
            videoEl.src = streamUrl;
            videoEl.play().catch(function (e) {
                console.log('Jandos-TV: Play nativo', e);
            });
        } else {
            console.error('Jandos-TV: Formato no soportado');
            handleStreamFailure('Formato no soportado');
        }
    }

    function tryYouTubeFallback() {
        const channel = channels[currentChannelIndex];
        if (!channel) return false;

        let ytEmbed = channel.youtubeEmbedUrl;
        if (!ytEmbed && channel.youtubeChannelId) {
            ytEmbed = 'https://www.youtube.com/embed/live_stream?channel=' + channel.youtubeChannelId + '&autoplay=1&mute=0';
        }

        if (ytEmbed) {
            console.log('Jandos-TV: Activando respaldo YouTube Live para ' + channel.name + ': ' + ytEmbed);
            clearStreamTimers();

            if (hlsInstance) {
                try { hlsInstance.destroy(); } catch (e) {}
                hlsInstance = null;
            }
            try { videoEl.pause(); } catch (e) {}
            videoEl.style.display = 'none';

            isYouTubeActive = true;
            youtubePlayerEl.src = ytEmbed;
            youtubePlayerEl.classList.add('active');

            showStatus('Señal Oficial YouTube Live', 'Conectando con la transmisión oficial...');
            showOSD();
            setTimeout(hideStatus, 3000);
            return true;
        }

        return false;
    }

    function handleStreamFailure(reason) {
        if (streamLoadTimeoutTimer) {
            clearTimeout(streamLoadTimeoutTimer);
            streamLoadTimeoutTimer = null;
        }

        const channel = channels[currentChannelIndex];
        if (!channel) return;

        // 1. Probar siguiente señal HLS disponible
        if (channel.urls && channel.urls.length > 1 && currentStreamUrlIndex < channel.urls.length - 1) {
            currentStreamUrlIndex++;
            console.log('Jandos-TV: Probando automáticamente señal ' + (currentStreamUrlIndex + 1) + ' para ' + channel.name);
            showStatus('Buscando señal alterna...', 'Probando señal ' + (currentStreamUrlIndex + 1) + ' de ' + channel.urls.length);
            showOSD();
            loadActiveStream();
            return;
        }

        // 2. Si todas las señales HLS fallaron, probar YouTube Live oficial si está disponible
        if (!isYouTubeActive && tryYouTubeFallback()) {
            return;
        }

        // 3. Si todo falló, programar reconexión cada 4 segundos
        if (isReconnecting) return;
        isReconnecting = true;

        showStatus('Señal débil, reconectando...', 'Comprobando la transmisión en vivo...');

        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(function () {
            isReconnecting = false;
            currentStreamUrlIndex = 0;
            if (channels[currentChannelIndex]) {
                loadActiveStream();
            }
        }, RECONNECT_INTERVAL_MS);
    }

    function switchNextSignalManual() {
        const channel = channels[currentChannelIndex];
        if (!channel || !channel.urls || channel.urls.length <= 1) {
            showStatus(channel ? channel.name : 'Canal', 'Este canal solo dispone de 1 señal directa');
            showOSD();
            setTimeout(hideStatus, 2000);
            return;
        }

        resetVideoAndYouTubeState();
        currentStreamUrlIndex = (currentStreamUrlIndex + 1) % channel.urls.length;
        console.log('Jandos-TV: Cambio manual de señal a [' + (currentStreamUrlIndex + 1) + '/' + channel.urls.length + ']');

        showStatus('Cambiando a Señal ' + (currentStreamUrlIndex + 1) + ' de ' + channel.urls.length, 'Sintonizando transmisión alternativa...');
        showOSD();
        loadActiveStream();
    }

    // Eventos del elemento <video>
    videoEl.addEventListener('playing', function () {
        hideStatus();
        isReconnecting = false;
        if (streamLoadTimeoutTimer) {
            clearTimeout(streamLoadTimeoutTimer);
            streamLoadTimeoutTimer = null;
        }
    });

    videoEl.addEventListener('waiting', function () {
        if (!isYouTubeActive) {
            showStatus('Sintonizando canal...', 'Cargando señal...');
        }
    });

    videoEl.addEventListener('error', function () {
        if (!isYouTubeActive) {
            handleStreamFailure('Error del elemento video');
        }
    });

    // --------------------------------------------------------------------------
    // 7. Guía Lateral Rápida (Botón OK / Enter)
    // --------------------------------------------------------------------------
    function renderGuide() {
        guideListEl.innerHTML = '';

        channels.forEach(function (ch, idx) {
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

            item.appendChild(numSpan);
            item.appendChild(nameSpan);
            guideListEl.appendChild(item);
        });
    }

    function updateGuideFocus() {
        const items = guideListEl.querySelectorAll('.guide-item');
        items.forEach(function (item, idx) {
            if (idx === guideFocusedIndex) {
                item.classList.add('focused');
                item.scrollIntoView({ block: 'center', behavior: 'smooth' });
            } else {
                item.classList.remove('focused');
            }
        });
    }

    function updateGuideActiveChannel() {
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
    // 9. Carga de JSON Remoto y Parser M3U
    // --------------------------------------------------------------------------
    function applyRemoteChannelsConfig(remoteChannels) {
        if (!Array.isArray(remoteChannels) || remoteChannels.length === 0) return;

        console.log('Jandos-TV: Aplicando ' + remoteChannels.length + ' canales desde configuración JSON');

        remoteChannels.forEach(function (rCh, rIdx) {
            // Emparejar por ID o nombre
            let target = null;
            if (typeof rCh.id === 'number' && rCh.id >= 1 && rCh.id <= channels.length) {
                target = channels[rCh.id - 1];
            } else {
                for (let i = 0; i < channels.length; i++) {
                    if (channels[i].name.toLowerCase().includes(rCh.name.toLowerCase().slice(0, 5))) {
                        target = channels[i];
                        break;
                    }
                }
            }

            if (target) {
                if (rCh.urls && Array.isArray(rCh.urls)) {
                    rCh.urls.forEach(function (u) {
                        if (!target.urls.includes(u)) {
                            target.urls.unshift(u); // Priorizar las nuevas URLs remotas
                        }
                    });
                }
                if (rCh.youtubeEmbedUrl) target.youtubeEmbedUrl = rCh.youtubeEmbedUrl;
                if (rCh.youtubeChannelId) target.youtubeChannelId = rCh.youtubeChannelId;
            }
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

        // 1. Probar URL remota personalizada
        tryFetch(CUSTOM_REMOTE_JSON_URL)
            .then(function (data) {
                if (data && data.channels) {
                    console.log('Jandos-TV: Configuración remota GitHub actualizada exitosamente');
                    applyRemoteChannelsConfig(data.channels);
                }
            })
            .catch(function () {
                // 2. Si falla la remota, probar la plantilla local
                return tryFetch(LOCAL_FALLBACK_JSON_URL)
                    .then(function (localData) {
                        if (localData && localData.channels) {
                            console.log('Jandos-TV: Configuración local canales-remotos.json aplicada');
                            applyRemoteChannelsConfig(localData.channels);
                        }
                    })
                    .catch(function (e) {
                        console.warn('Jandos-TV: Sin configuración JSON adicional', e);
                    });
            });
    }

    function parseM3U(m3uText) {
        const parsed = [];
        const lines = m3uText.split(/\r?\n/);
        let currentName = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            if (line.startsWith('#EXTINF:')) {
                const commaIdx = line.lastIndexOf(',');
                if (commaIdx !== -1) {
                    currentName = line.substring(commaIdx + 1).trim();
                } else {
                    currentName = 'Canal Perú';
                }
            } else if (line.startsWith('http://') || line.startsWith('https://')) {
                if (currentName) {
                    parsed.push({
                        name: currentName,
                        url: line
                    });
                    currentName = null;
                }
            }
        }
        return parsed;
    }

    function sortAndMergeChannels(incomingM3UChannels) {
        const topChannels = TOP_NATIONAL_CHANNELS.map(function (tc) {
            return {
                name: tc.name,
                keywords: tc.keywords,
                urls: [...tc.urls],
                url: tc.urls[0],
                youtubeChannelId: tc.youtubeChannelId || null,
                youtubeEmbedUrl: tc.youtubeEmbedUrl || null
            };
        });

        const registeredUrls = new Set();
        topChannels.forEach(function (tc) {
            tc.urls.forEach(function (u) {
                registeredUrls.add(u);
            });
        });

        const secondaryChannels = [];
        const seenSecondaryUrls = new Set();

        incomingM3UChannels.forEach(function (rawCh) {
            const rawNameLower = rawCh.name.toLowerCase();
            const rawUrl = rawCh.url.trim();

            if (!rawUrl || !rawUrl.startsWith('http')) return;

            let matchedTop = false;

            for (let i = 0; i < topChannels.length; i++) {
                const topCh = topChannels[i];
                const matchesKeyword = topCh.keywords.some(function (kw) {
                    return rawNameLower.includes(kw);
                });

                if (matchesKeyword) {
                    if (!topCh.urls.includes(rawUrl)) {
                        topCh.urls.push(rawUrl);
                        registeredUrls.add(rawUrl);
                    }
                    matchedTop = true;
                    break;
                }
            }

            if (!matchedTop && !registeredUrls.has(rawUrl) && !seenSecondaryUrls.has(rawUrl)) {
                seenSecondaryUrls.add(rawUrl);
                secondaryChannels.push({
                    name: rawCh.name,
                    urls: [rawUrl],
                    url: rawUrl,
                    youtubeChannelId: null,
                    youtubeEmbedUrl: null
                });
            }
        });

        topChannels.forEach(function (tc) {
            tc.url = tc.urls[0];
            delete tc.keywords;
        });

        return topChannels.concat(secondaryChannels);
    }

    function loadAllM3USources() {
        const fetchPromises = M3U_SOURCES.map(function (url) {
            return fetch(url, { cache: 'no-store' })
                .then(function (res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.text();
                })
                .then(function (text) {
                    return parseM3U(text);
                })
                .catch(function (err) {
                    console.warn('Jandos-TV: Falló la descarga de ' + url, err);
                    return [];
                });
        });

        Promise.all(fetchPromises)
            .then(function (results) {
                const combinedM3U = [];
                results.forEach(function (chList) {
                    if (chList && chList.length > 0) {
                        combinedM3U.push(...chList);
                    }
                });

                if (combinedM3U.length > 0) {
                    channels = sortAndMergeChannels(combinedM3U);

                    // Re-aplicar configuración JSON remota sobre la lista ampliada
                    fetchRemoteJsonConfig();

                    if (isGuideOpen) {
                        renderGuide();
                    }
                }
            })
            .catch(function (e) {
                console.warn('Jandos-TV: Error en carga de M3U', e);
            });
    }

    // --------------------------------------------------------------------------
    // 10. Controlador de Eventos de Teclado y Control Remoto Samsung
    // --------------------------------------------------------------------------
    function onKeyDown(e) {
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

        // Cargar configuración de canales remotos y M3U en segundo plano
        fetchRemoteJsonConfig();
        loadAllM3USources();

        // Consultar configuración remota periódicamente cada 30 minutos
        setInterval(fetchRemoteJsonConfig, REMOTE_CONFIG_INTERVAL_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
